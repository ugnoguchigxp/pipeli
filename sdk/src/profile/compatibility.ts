import type { HL7Profile, HL7FieldMapping } from './hl7-profile.js';

export type ChangeType = 'BREAKING' | 'NON_BREAKING';

export interface CompatibilityIssue {
    type: ChangeType;
    message: string;
    path: string;
}

/**
 * プロファイルの互換性を検証する
 */
export class ProfileCompatibilityChecker {
    /**
     * oldProfile から newProfile への変更が互換性があるかチェックする
     */
    checkHL7(oldProfile: HL7Profile, newProfile: HL7Profile): CompatibilityIssue[] {
        const issues: CompatibilityIssue[] = [];

        // 1. セグメントの削除チェック
        for (const segName in oldProfile.segments) {
            if (!newProfile.segments[segName]) {
                issues.push({
                    type: 'BREAKING',
                    message: `Segment '${segName}' was removed.`,
                    path: `segments.${segName}`,
                });
            } else {
                // 2. フィールドの変更チェック
                this.checkHL7Fields(
                    oldProfile.segments[segName].fields,
                    newProfile.segments[segName].fields,
                    `segments.${segName}`,
                    issues
                );
            }
        }

        // 3. 新規必須セグメントの追加チェック
        for (const segName in newProfile.segments) {
            if (!oldProfile.segments[segName]) {
                if (newProfile.segments[segName].minOccurs > 0) {
                    issues.push({
                        type: 'BREAKING',
                        message: `New required segment '${segName}' was added.`,
                        path: `segments.${segName}`,
                    });
                } else {
                    issues.push({
                        type: 'NON_BREAKING',
                        message: `New optional segment '${segName}' was added.`,
                        path: `segments.${segName}`,
                    });
                }
            }
        }

        // 4. 拡張セグメントのチェック
        if (oldProfile.extensions) {
            for (const segName in oldProfile.extensions) {
                if (!newProfile.extensions?.[segName]) {
                    issues.push({
                        type: 'BREAKING',
                        message: `Extension segment '${segName}' was removed.`,
                        path: `extensions.${segName}`,
                    });
                } else {
                    this.checkHL7Fields(
                        oldProfile.extensions[segName].fields,
                        newProfile.extensions[segName].fields,
                        `extensions.${segName}`,
                        issues
                    );
                }
            }
        }

        return issues;
    }

    private checkHL7Fields(oldFields: HL7FieldMapping[], newFields: HL7FieldMapping[], basePath: string, issues: CompatibilityIssue[]) {
        const oldMap = new Map(oldFields.map(f => [f.normalizedName, f]));
        const newMap = new Map(newFields.map(f => [f.normalizedName, f]));

        // フィールドの削除
        for (const [name, oldField] of oldMap) {
            if (!newMap.has(name)) {
                issues.push({
                    type: 'BREAKING',
                    message: `Field '${name}' was removed.`,
                    path: `${basePath}.fields.${name}`,
                });
            } else {
                const newField = newMap.get(name)!;
                // 型の変更
                if (oldField.type !== newField.type) {
                    issues.push({
                        type: 'BREAKING',
                        message: `Field '${name}' type changed from ${oldField.type} to ${newField.type}.`,
                        path: `${basePath}.fields.${name}.type`,
                    });
                }
                // 必須化
                if (!oldField.required && newField.required) {
                    issues.push({
                        type: 'BREAKING',
                        message: `Field '${name}' is now required.`,
                        path: `${basePath}.fields.${name}.required`,
                    });
                }
            }
        }

        // 新規フィールドの追加
        for (const [name, newField] of newMap) {
            if (!oldMap.has(name)) {
                if (newField.required) {
                    issues.push({
                        type: 'BREAKING',
                        message: `New required field '${name}' was added.`,
                        path: `${basePath}.fields.${name}`,
                    });
                } else {
                    issues.push({
                        type: 'NON_BREAKING',
                        message: `New optional field '${name}' was added.`,
                        path: `${basePath}.fields.${name}`,
                    });
                }
            }
        }
    }

    /**
     * 互換性チェック結果をフォーマットした文字列を返す
     */
    formatIssues(issues: CompatibilityIssue[]): string {
        if (issues.length === 0) {
            return '✅ No compatibility issues found.';
        }

        const breaking = issues.filter(i => i.type === 'BREAKING');
        const nonBreaking = issues.filter(i => i.type === 'NON_BREAKING');

        let result = '';

        if (breaking.length > 0) {
            result += `❌ ${breaking.length} BREAKING change(s):\n`;
            breaking.forEach(issue => {
                result += `  - [${issue.path}] ${issue.message}\n`;
            });
        }

        if (nonBreaking.length > 0) {
            result += `\nℹ️ ${nonBreaking.length} NON-BREAKING change(s):\n`;
            nonBreaking.forEach(issue => {
                result += `  - [${issue.path}] ${issue.message}\n`;
            });
        }

        return result;
    }

    /**
     * 互換性チェック結果に基づいてバージョン番号を提案
     * セマンティックバージョニング (semver) に従う
     */
    suggestVersion(currentVersion: string, issues: CompatibilityIssue[]): string {
        const parts = currentVersion.split('.').map(Number);
        let [major, minor, patch] = parts.length === 3 ? parts : [1, 0, 0];

        const hasBreaking = issues.some(i => i.type === 'BREAKING');
        const hasNonBreaking = issues.some(i => i.type === 'NON_BREAKING');

        if (hasBreaking) {
            // 破壊的変更 → メジャーバージョンアップ
            return `${major + 1}.0.0`;
        } else if (hasNonBreaking) {
            // 非破壊的変更 → マイナーバージョンアップ
            return `${major}.${minor + 1}.0`;
        } else {
            // 変更なし → パッチバージョンアップ
            return `${major}.${minor}.${patch + 1}`;
        }
    }
}
