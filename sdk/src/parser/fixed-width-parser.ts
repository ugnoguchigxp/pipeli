import type { FixedWidthField, FixedWidthProfile } from '../profile/fixed-width-profile.js';
import type { BentoComponent } from '../types.js';

/**
 * 固定長パーサー
 *
 * 固定長プロファイルに基づいて固定長データを構造化データに変換します。
 * レコード種別の判定、文字エンコーディング変換、トリム処理などをサポートします。
 *
 * @example
 * const parser = new FixedWidthParser(vendorBProfile);
 * const bentoConfig = parser.toBento();
 */
export class FixedWidthParser implements BentoComponent {
    constructor(private profile: FixedWidthProfile) {}

    /**
     * Bento設定を生成
     *
     * プロファイルに基づいてBloblangマッピングを生成し、
     * 固定長データを正規化されたJSONに変換します。
     */
    toBento() {
        const processors: Record<string, unknown>[] = [];

        // エンコーディング変換 - 変換後は文字列として _decoded に格納
        if (this.profile.encoding !== 'utf-8') {
            const encodingMap: Record<string, string> = {
                shift_jis: 'shift-jis',
                'euc-jp': 'euc-jp',
                'iso-2022-jp': 'iso-2022-jp',
                cp932: 'windows-31j',
                'windows-31j': 'windows-31j',
            };

            const bentoEncoding = encodingMap[this.profile.encoding] || this.profile.encoding;

            // デコード結果を _raw に格納
            processors.push({
                mapping: `root._raw = content().decode("${bentoEncoding}")`,
            });
        } else {
            // UTF-8の場合もコンテンツを _raw に格納
            processors.push({
                mapping: 'root._raw = content().string()',
            });
        }

        // メタデータの設定
        processors.push({
            mapping: `root._profile = {
    "id": "${this.profile.id}",
    "vendor": "${this.profile.vendor}",
    "version": "${this.profile.version}",
    "encoding": "${this.profile.encoding}"
}`,
        });

        // レコード種別ごとの条件分岐マッピング
        if (Object.keys(this.profile.recordTypes).length > 0) {
            const recordTypeMappings = this.generateRecordTypeMappings();

            processors.push({
                mapping: recordTypeMappings,
            });
        }

        // 単一レコード種別の場合（recordTypesの代替）
        if (this.profile.fields && this.profile.fields.length > 0) {
            const fieldMappings = this.generateFieldMappings(this.profile.fields);

            processors.push({
                mapping: fieldMappings.join('\n'),
            });
        }

        return processors;
    }

    /**
     * レコード種別ごとの条件分岐マッピングを生成
     * _raw フィールドを参照
     */
    private generateRecordTypeMappings(): string {
        const conditions: string[] = [];

        for (const [typeName, recordType] of Object.entries(this.profile.recordTypes)) {
            if (recordType.skip) {
                continue;
            }

            const { identifierPosition, identifier } = recordType;
            const condition = `this._raw.slice(${identifierPosition.start}, ${identifierPosition.start + identifierPosition.length}).trim() == "${identifier}"`;

            const fieldMappings = this.generateFieldMappings(recordType.fields);

            conditions.push(`if ${condition} {
    root._recordType = "${typeName}"
    ${fieldMappings.join('\n    ')}
}`);
        }

        return conditions.join(' else ');
    }

    /**
     * フィールドマッピングを生成
     * _raw フィールドを参照
     */
    private generateFieldMappings(fields: FixedWidthField[]): string[] {
        return fields.map((field) => {
            const trimExpr = this.getTrimExpression(field.trim ?? this.profile.defaultTrim, field.padding);
            const typeExpr = this.getTypeConversionExpression(field);

            // _raw から切り出し
            let expr = `this._raw.slice(${field.start}, ${field.start + field.length})${trimExpr}${typeExpr}`;

            // デフォルト値
            if (field.defaultValue !== undefined) {
                const defaultStr =
                    typeof field.defaultValue === 'string' ? `"${field.defaultValue}"` : String(field.defaultValue);
                expr = `(${expr}).or(${defaultStr})`;
            }

            return `root.${field.name} = ${expr}`;
        });
    }

    private getTrimExpression(trim: 'left' | 'right' | 'both' | 'none', padding?: string): string {
        const padChar = padding && padding !== ' ' ? `"${padding}"` : '" "';

        switch (trim) {
            case 'left':
                return `.trim_prefix(${padChar})`;
            case 'right':
                return `.trim_suffix(${padChar})`;
            case 'both':
                return '.trim()';
            case 'none':
                return '';
        }
    }

    private getTypeConversionExpression(field: { type?: string; decimalPlaces?: number; dateFormat?: string }): string {
        switch (field.type) {
            case 'number':
                if (field.decimalPlaces !== undefined && field.decimalPlaces > 0) {
                    return `.number() / ${10 ** field.decimalPlaces}`;
                }
                return '.number()';

            case 'date':
                if (field.dateFormat) {
                    return `.parse_timestamp("${field.dateFormat}")`;
                }
                return '.parse_timestamp("20060102")';

            case 'datetime':
                if (field.dateFormat) {
                    return `.parse_timestamp("${field.dateFormat}")`;
                }
                return '.parse_timestamp("20060102150405")';

            case 'boolean':
                // 値を変数として保存し、比較
                return '.string() == "1" || this._raw == "Y" || this._raw == "y"';

            case 'packed_decimal':
                return '.decode("packed_decimal")';

            default:
                return '';
        }
    }
}
