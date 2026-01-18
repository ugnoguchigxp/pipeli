import type { FixedWidthProfile, RecordTypeDefinition } from './fixed-width-profile.js';
import type { HL7Profile, HL7SegmentDefinition } from './hl7-profile.js';

/**
 * プロファイルの型
 */
export type AnyProfile = HL7Profile | FixedWidthProfile;

/**
 * プロファイルレジストリ
 *
 * ベンダー/バージョン別にプロファイルを管理します。
 * プロファイルの登録、取得、一覧表示、継承解決をサポートします。
 *
 * @example
 * // プロファイルを登録
 * profileRegistry.register(baseProfile);
 * profileRegistry.register(derivedProfile); // extends: 'base-profile'
 *
 * // プロファイルを取得（継承が自動解決される）
 * const profile = profileRegistry.get<HL7Profile>('vendor_a', 'derived-profile');
 */
export class ProfileRegistry {
    private profiles = new Map<string, AnyProfile>();

    /**
     * プロファイルを登録
     *
     * @param profile - 登録するプロファイル
     * @throws {Error} 同じキーのプロファイルが既に登録されている場合
     */
    register(profile: AnyProfile, options?: { overwrite?: boolean }): void {
        const key = this.generateKey(profile);

        if (!options?.overwrite && this.profiles.has(key)) {
            throw new Error(`Profile already registered: ${key}. Use { overwrite: true } to replace existing profile.`);
        }

        this.profiles.set(key, profile);
    }

    /**
     * プロファイルを取得（継承解決付き）
     *
     * @param vendor - ベンダー名
     * @param id - プロファイルID
     * @param version - プロファイルバージョン (省略時は最新)
     * @returns マージ済みプロファイル、見つからない場合はundefined
     */
    get<T extends AnyProfile = AnyProfile>(vendor: string, id: string, version?: string): T | undefined {
        const profile = this.getRaw(vendor, id, version);
        if (!profile) return undefined;

        // 継承解決
        return this.resolveInheritance(profile) as T;
    }

    /**
     * プロファイルを生データで取得（継承解決なし）
     */
    getRaw<T extends AnyProfile = AnyProfile>(vendor: string, id: string, version?: string): T | undefined {
        if (version) {
            const key = `${vendor}:${id}:${version}`;
            return this.profiles.get(key) as T | undefined;
        }

        // バージョン未指定: 最新を返す
        const prefix = `${vendor}:${id}:`;
        const matching = Array.from(this.profiles.entries())
            .filter(([key]) => key.startsWith(prefix))
            .sort(([a], [b]) => this.compareVersions(this.extractVersion(b), this.extractVersion(a)));

        return matching[0]?.[1] as T | undefined;
    }

    /**
     * キーでプロファイルを直接取得
     *
     * @param key - vendor:id:version 形式のキー
     */
    getByKey<T extends AnyProfile = AnyProfile>(key: string): T | undefined {
        const profile = this.profiles.get(key);
        if (!profile) return undefined;
        return this.resolveInheritance(profile) as T;
    }

    /**
     * ベンダーのすべてのプロファイルを取得
     */
    getByVendor(vendor: string): AnyProfile[] {
        return Array.from(this.profiles.entries())
            .filter(([key]) => key.startsWith(`${vendor}:`))
            .map(([, profile]) => this.resolveInheritance(profile));
    }

    /**
     * すべてのプロファイルを一覧
     */
    list(): AnyProfile[] {
        return Array.from(this.profiles.values());
    }

    /**
     * プロファイルを削除
     */
    delete(vendor: string, id: string, version?: string): number {
        if (version) {
            const key = `${vendor}:${id}:${version}`;
            return this.profiles.delete(key) ? 1 : 0;
        }

        const prefix = `${vendor}:${id}:`;
        const keysToDelete = Array.from(this.profiles.keys()).filter((key) => key.startsWith(prefix));

        for (const key of keysToDelete) {
            this.profiles.delete(key);
        }

        return keysToDelete.length;
    }

    /**
     * すべてのプロファイルをクリア
     */
    clear(): void {
        this.profiles.clear();
    }

    /**
     * 登録されているプロファイル数
     */
    get size(): number {
        return this.profiles.size;
    }

    // ========================================
    // 継承解決
    // ========================================

    /**
     * プロファイルの継承を解決してマージ
     */
    private resolveInheritance(profile: AnyProfile, visited = new Set<string>()): AnyProfile {
        const key = this.generateKey(profile);

        // 循環参照チェック
        if (visited.has(key)) {
            throw new Error(`Circular inheritance detected: ${Array.from(visited).join(' -> ')} -> ${key}`);
        }
        visited.add(key);

        // extendsがない場合はそのまま返す
        if (!('extends' in profile) || !profile.extends) {
            return profile;
        }

        // 親プロファイルを取得
        const parentProfile = this.findProfileByExtends(profile.extends);
        if (!parentProfile) {
            throw new Error(`Base profile not found: ${profile.extends}`);
        }

        // 親プロファイルも継承解決
        const resolvedParent = this.resolveInheritance(parentProfile, visited);

        // マージ
        return this.mergeProfiles(resolvedParent, profile);
    }

    /**
     * extends文字列からプロファイルを検索
     *
     * 形式:
     * - "vendor:id:version" - 完全指定
     * - "vendor:id" - 最新バージョン
     * - "id" - 同じベンダーの最新バージョン（派生プロファイルと同じベンダー）
     */
    private findProfileByExtends(extendsStr: string): AnyProfile | undefined {
        const parts = extendsStr.split(':');

        if (parts.length === 3) {
            // vendor:id:version
            return this.profiles.get(extendsStr);
        }

        if (parts.length === 2) {
            // vendor:id
            return this.getRaw(parts[0], parts[1]);
        }

        // id のみ - すべてのプロファイルから検索
        for (const [_key, profile] of this.profiles.entries()) {
            if (profile.id === extendsStr) {
                return profile;
            }
        }

        return undefined;
    }

    /**
     * 2つのプロファイルをマージ（派生が優先）
     */
    private mergeProfiles(base: AnyProfile, derived: AnyProfile): AnyProfile {
        if (this.isHL7Profile(base) && this.isHL7Profile(derived)) {
            return this.mergeHL7Profiles(base, derived);
        }

        if (this.isFixedWidthProfile(base) && this.isFixedWidthProfile(derived)) {
            return this.mergeFixedWidthProfiles(base, derived);
        }

        throw new Error('Cannot merge profiles of different types');
    }

    /**
     * HL7プロファイルをマージ
     */
    private mergeHL7Profiles(base: HL7Profile, derived: HL7Profile): HL7Profile {
        return {
            ...base,
            ...derived,
            // セグメントをディープマージ
            segments: this.mergeSegments(base.segments, derived.segments),
            // 拡張をディープマージ
            extensions: this.mergeSegments(base.extensions || {}, derived.extensions || {}),
            // MLLPは派生が優先、なければベース
            mllp: derived.mllp || base.mllp,
            // extendsは解決済みなので削除
            extends: undefined,
        };
    }

    /**
     * 固定長プロファイルをマージ
     */
    private mergeFixedWidthProfiles(base: FixedWidthProfile, derived: FixedWidthProfile): FixedWidthProfile {
        return {
            ...base,
            ...derived,
            // レコード種別をディープマージ
            recordTypes: this.mergeRecordTypes(base.recordTypes, derived.recordTypes),
            // フィールドは派生が優先
            fields: derived.fields || base.fields,
            // extendsは解決済みなので削除
            extends: undefined,
        };
    }

    /**
     * セグメント定義をマージ
     */
    private mergeSegments(
        base: Record<string, HL7SegmentDefinition>,
        derived: Record<string, HL7SegmentDefinition>,
    ): Record<string, HL7SegmentDefinition> {
        const result = { ...base };

        for (const [segName, derivedSeg] of Object.entries(derived)) {
            if (result[segName]) {
                // 同じセグメントがある場合、フィールドをマージ
                const baseFields = result[segName].fields;
                const derivedFields = derivedSeg.fields;

                // normalizedNameが同じフィールドは上書き、新しいものは追加
                const fieldMap = new Map(baseFields.map((f) => [f.normalizedName, f]));
                for (const field of derivedFields) {
                    fieldMap.set(field.normalizedName, field);
                }

                result[segName] = {
                    ...result[segName],
                    ...derivedSeg,
                    fields: Array.from(fieldMap.values()),
                };
            } else {
                // 新しいセグメント
                result[segName] = derivedSeg;
            }
        }

        return result;
    }

    /**
     * レコード種別定義をマージ
     */
    private mergeRecordTypes(
        base: Record<string, RecordTypeDefinition>,
        derived: Record<string, RecordTypeDefinition>,
    ): Record<string, RecordTypeDefinition> {
        const result = { ...base };

        for (const [typeName, derivedType] of Object.entries(derived)) {
            if (result[typeName]) {
                // 同じレコード種別がある場合、フィールドをマージ
                const baseFields = result[typeName].fields;
                const derivedFields = derivedType.fields;

                const fieldMap = new Map(baseFields.map((f) => [f.name, f]));
                for (const field of derivedFields) {
                    fieldMap.set(field.name, field);
                }

                result[typeName] = {
                    ...result[typeName],
                    ...derivedType,
                    fields: Array.from(fieldMap.values()),
                };
            } else {
                // 新しいレコード種別
                result[typeName] = derivedType;
            }
        }

        return result;
    }

    // ========================================
    // ユーティリティ
    // ========================================

    private isHL7Profile(profile: AnyProfile): profile is HL7Profile {
        return 'messageType' in profile;
    }

    private isFixedWidthProfile(profile: AnyProfile): profile is FixedWidthProfile {
        return 'recordTypes' in profile || 'encoding' in profile;
    }

    private generateKey(profile: AnyProfile): string {
        const version = 'profileVersion' in profile ? profile.profileVersion : profile.version;
        return `${profile.vendor}:${profile.id}:${version}`;
    }

    private extractVersion(key: string): string {
        return key.split(':')[2] || '0.0.0';
    }

    private compareVersions(a: string, b: string): number {
        const aParts = a.split('.').map((n) => Number.parseInt(n, 10) || 0);
        const bParts = b.split('.').map((n) => Number.parseInt(n, 10) || 0);

        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const aPart = aParts[i] || 0;
            const bPart = bParts[i] || 0;

            if (aPart !== bPart) {
                return aPart - bPart;
            }
        }

        return 0;
    }
}

/**
 * グローバルプロファイルレジストリ
 */
export const profileRegistry = new ProfileRegistry();
