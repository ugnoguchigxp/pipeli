import type { HL7FieldMapping, HL7Profile } from '../profile/hl7-profile.js';
import { parseHL7Path } from '../profile/hl7-profile.js';
import type { BentoComponent } from '../types.js';

/**
 * HL7パーサー
 *
 * HL7プロファイルに基づいてHL7メッセージを構造化データに変換します。
 * 標準セグメントとベンダー拡張（Z-segment）の両方をサポートします。
 *
 * @example
 * const parser = new HL7Parser(vendorAProfile);
 * const bentoConfig = parser.toBento();
 */
export class HL7Parser implements BentoComponent {
    constructor(private profile: HL7Profile) {}

    /**
     * Bento設定を生成
     *
     * プロファイルに基づいてBloblangマッピングを生成し、
     * HL7メッセージを正規化されたJSONに変換します。
     */
    toBento() {
        const processors: Record<string, unknown>[] = [];

        // MLLP制御文字の除去
        const mllp = this.profile.mllp ?? {
            startBlock: '\x0b',
            endBlock: '\x1c',
            trailer: '\r',
        };

        // 制御文字をエスケープ
        const escapeControlChar = (char: string): string => {
            const charCode = char.charCodeAt(0);
            if (charCode === 0x0b) return '\\x0b';
            if (charCode === 0x1c) return '\\x1c';
            if (charCode === 0x0d) return '\\r';
            if (charCode === 0x0a) return '\\n';
            return char;
        };

        processors.push({
            mapping: `root = content().string()
    .replace("${escapeControlChar(mllp.startBlock)}", "")
    .replace("${escapeControlChar(mllp.endBlock)}", "")
    .replace("${escapeControlChar(mllp.trailer)}", "")`,
        });

        // メタデータの設定
        processors.push({
            mapping: `root._profile = {
    "id": "${this.profile.id}",
    "vendor": "${this.profile.vendor}",
    "version": "${this.profile.version}",
    "messageType": "${this.profile.messageType}"
}`,
        });

        // 標準セグメントのマッピング
        const allMappings: string[] = [];

        for (const segmentName of Object.keys(this.profile.segments)) {
            const segment = this.profile.segments[segmentName];
            for (const field of segment.fields) {
                const mapping = this.generateFieldMapping(field);
                allMappings.push(mapping);
            }
        }

        if (allMappings.length > 0) {
            processors.push({
                mapping: allMappings.join('\n'),
            });
        }

        // ベンダー拡張（Z-segment等）の処理
        if (this.profile.extensions && Object.keys(this.profile.extensions).length > 0) {
            const extensionMappings: string[] = [];

            // ベンダー用のオブジェクト初期化（1回だけ）
            extensionMappings.push(`root._extensions = {}`);
            extensionMappings.push(`root._extensions.${this.profile.vendor} = {}`);

            for (const [extName, extDef] of Object.entries(this.profile.extensions)) {
                // 拡張セグメントごとのオブジェクト初期化
                extensionMappings.push(`root._extensions.${this.profile.vendor}.${extName} = {}`);

                for (const field of extDef.fields) {
                    const mapping = this.generateExtensionFieldMapping(extName, field);
                    extensionMappings.push(mapping);
                }
            }

            processors.push({
                mapping: extensionMappings.join('\n'),
            });
        }

        return processors;
    }

    /**
     * フィールドマッピングを生成
     */
    private generateFieldMapping(field: HL7FieldMapping): string {
        const { segment, field: fieldNum, component, subcomponent } = parseHL7Path(field.path);

        // サブコンポーネントまで対応
        let expr = subcomponent
            ? `this.${segment}.${fieldNum}.${component}.${subcomponent}`
            : `this.${segment}.${fieldNum}.${component}`;

        // 型変換
        expr = this.applyTypeConversion(expr, field.type);

        // デフォルト値
        if (field.defaultValue !== undefined) {
            const defaultStr =
                typeof field.defaultValue === 'string' ? `"${field.defaultValue}"` : String(field.defaultValue);
            expr = `(${expr}).or(${defaultStr})`;
        }

        // カスタム変換
        if (field.transform) {
            expr = field.transform.replace('$value', expr);
        }

        return `root.${field.normalizedName} = ${expr}`;
    }

    /**
     * 拡張フィールドマッピングを生成
     */
    private generateExtensionFieldMapping(extName: string, field: HL7FieldMapping): string {
        const { segment, field: fieldNum, component, subcomponent } = parseHL7Path(field.path);

        let expr = subcomponent
            ? `this.${segment}.${fieldNum}.${component}.${subcomponent}`
            : `this.${segment}.${fieldNum}.${component}`;

        expr = this.applyTypeConversion(expr, field.type);

        return `root._extensions.${this.profile.vendor}.${extName}.${field.normalizedName} = ${expr}`;
    }

    /**
     * 型変換を適用
     */
    private applyTypeConversion(expr: string, type: string): string {
        switch (type) {
            case 'number':
                return `${expr}.number()`;
            case 'date':
                return `${expr}.parse_timestamp("20060102")`;
            case 'datetime':
                return `${expr}.parse_timestamp("20060102150405")`;
            case 'boolean':
                // HL7の一般的なboolean表現
                return `(${expr} == "Y" || ${expr} == "1" || ${expr} == "true")`;
            default:
                return expr;
        }
    }
}
