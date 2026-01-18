/**
 * CSVパーサー
 *
 * CSVプロファイルに基づいてCSVデータを構造化データに変換します。
 * レセ電コードなど、レコード種別識別が必要なCSV形式に対応します。
 */
import type { CSVField, CSVProfile } from '../profile/csv-profile.js';
import type { BentoComponent } from '../types.js';

/**
 * CSVパーサー
 *
 * @example
 * const parser = new CSVParser(recedenProfile);
 * const bentoConfig = parser.toBento();
 */
export class CSVParser implements BentoComponent {
    constructor(private profile: CSVProfile) {}

    /**
     * Bento設定を生成
     */
    toBento() {
        const processors: Record<string, unknown>[] = [];

        // エンコーディング変換
        if (this.profile.encoding !== 'utf-8') {
            const encodingMap: Record<string, string> = {
                shift_jis: 'shift-jis',
                'euc-jp': 'euc-jp',
                'iso-2022-jp': 'iso-2022-jp',
                cp932: 'windows-31j',
                'windows-31j': 'windows-31j',
            };

            const bentoEncoding = encodingMap[this.profile.encoding] || this.profile.encoding;

            processors.push({
                mapping: `root._raw = content().decode("${bentoEncoding}")`,
            });
        } else {
            processors.push({
                mapping: 'root._raw = content().string()',
            });
        }

        // CSVパース (カラムに分割)
        const delimiter = this.escapeDelimiter(this.profile.delimiter);
        processors.push({
            mapping: `root._columns = this._raw.split("${delimiter}")`,
        });

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

        // 単一レコード種別の場合
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
     */
    private generateRecordTypeMappings(): string {
        const conditions: string[] = [];

        for (const [typeName, recordType] of Object.entries(this.profile.recordTypes)) {
            if (recordType.skip) {
                continue;
            }

            const identifierCol = recordType.identifierColumnIndex;
            const condition = `this._columns.index(${identifierCol}) == "${recordType.identifier}"`;

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
     */
    private generateFieldMappings(fields: CSVField[]): string[] {
        return fields.map((field) => {
            let expr = `this._columns.index(${field.columnIndex})`;
            expr = this.applyTypeConversion(expr, field);

            if (field.defaultValue !== undefined) {
                const defaultStr =
                    typeof field.defaultValue === 'string' ? `"${field.defaultValue}"` : String(field.defaultValue);
                expr = `(${expr}).or(${defaultStr})`;
            }

            return `root.${field.name} = ${expr}`;
        });
    }

    /**
     * 型変換を適用
     */
    private applyTypeConversion(expr: string, field: CSVField): string {
        switch (field.type) {
            case 'number':
                if (field.decimalPlaces !== undefined && field.decimalPlaces > 0) {
                    return `${expr}.number() / ${10 ** field.decimalPlaces}`;
                }
                return `${expr}.number()`;
            case 'date':
                if (field.dateFormat) {
                    return `${expr}.parse_timestamp("${field.dateFormat}")`;
                }
                return `${expr}.parse_timestamp("20060102")`;
            case 'datetime':
                if (field.dateFormat) {
                    return `${expr}.parse_timestamp("${field.dateFormat}")`;
                }
                return `${expr}.parse_timestamp("20060102150405")`;
            case 'boolean':
                return `(${expr} == "1" || ${expr} == "Y" || ${expr} == "true")`;
            default:
                return expr;
        }
    }

    /**
     * 区切り文字をエスケープ
     */
    private escapeDelimiter(delimiter: string): string {
        if (delimiter === ',') return ',';
        if (delimiter === '\t') return '\\t';
        return delimiter;
    }
}
