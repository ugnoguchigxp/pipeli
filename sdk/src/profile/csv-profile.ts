/**
 * CSVプロファイル
 *
 * CSV形式（カンマ区切り）のデータを定義するプロファイルです。
 * レセ電コードなど、CSV形式で記録される医療データに対応します。
 */
import { z } from 'zod';

// ========================================
// CSVフィールド定義
// ========================================

/**
 * CSVフィールド定義
 */
export const CSVFieldSchema = z.object({
    /** フィールド名 */
    name: z.string().min(1),
    /** カラムインデックス (0始まり) */
    columnIndex: z.number().int().nonnegative(),
    /** 型 */
    type: z.enum(['string', 'number', 'date', 'datetime', 'boolean']).default('string'),
    /** 必須か */
    required: z.boolean().default(false),
    /** 日付フォーマット (date/datetime型の場合) */
    dateFormat: z.string().optional(),
    /** 小数点以下桁数 (number型の場合、暗黙の小数点) */
    decimalPlaces: z.number().int().nonnegative().optional(),
    /** デフォルト値 */
    defaultValue: z.unknown().optional(),
    /** 説明 */
    description: z.string().optional(),
});

export type CSVField = z.infer<typeof CSVFieldSchema>;
export type CSVFieldInput = z.input<typeof CSVFieldSchema>;

// ========================================
// CSVレコード種別定義
// ========================================

/**
 * CSVレコード種別定義
 *
 * レセ電のように、先頭カラムでレコード種別を識別する形式に対応
 */
export const CSVRecordTypeSchema = z.object({
    /** レコード識別子 (例: "IR", "RE") */
    identifier: z.string().min(1),
    /** 識別子が格納されているカラムインデックス */
    identifierColumnIndex: z.number().int().nonnegative().default(0),
    /** フィールド定義 */
    fields: z.array(CSVFieldSchema),
    /** スキップするか */
    skip: z.boolean().default(false),
    /** 説明 */
    description: z.string().optional(),
});

export type CSVRecordType = z.infer<typeof CSVRecordTypeSchema>;
export type CSVRecordTypeInput = z.input<typeof CSVRecordTypeSchema>;

// ========================================
// CSVプロファイル
// ========================================

/**
 * CSVプロファイル定義
 */
export const CSVProfileSchema = z.object({
    /** プロファイルID */
    id: z.string().min(1),
    /** ベンダー名 */
    vendor: z.string().min(1),
    /** プロファイルバージョン */
    version: z.string().default('1.0'),
    /** 継承元プロファイルID */
    extends: z.string().optional(),
    /** 文字エンコーディング */
    encoding: z.enum(['utf-8', 'shift_jis', 'euc-jp', 'iso-2022-jp', 'cp932', 'windows-31j']).default('utf-8'),
    /** 区切り文字 (デフォルト: カンマ) */
    delimiter: z.string().default(','),
    /** 行区切り文字 */
    lineEnding: z.enum(['LF', 'CRLF', 'CR']).default('CRLF'),
    /** 引用符文字 (空文字列は引用符なし) */
    quoteChar: z.string().default(''),
    /** ヘッダー行があるか */
    hasHeader: z.boolean().default(false),
    /** ヘッダー行数 */
    headerRows: z.number().int().nonnegative().default(0),
    /** レコード種別定義 (先頭カラムで識別する形式) */
    recordTypes: z.record(CSVRecordTypeSchema).default({}),
    /** 単一レコード種別の場合のフィールド定義 */
    fields: z.array(CSVFieldSchema).optional(),
    /** 説明 */
    description: z.string().optional(),
    /** メタデータ */
    metadata: z.record(z.unknown()).optional(),
});

export type CSVProfile = z.infer<typeof CSVProfileSchema>;
export type CSVProfileInput = z.input<typeof CSVProfileSchema>;

// ========================================
// ヘルパー関数
// ========================================

/**
 * CSVレコード種別ごとのフィールドマッピングを生成
 */
export function generateCSVRecordTypeMappings(profile: CSVProfile): string {
    const conditions: string[] = [];

    for (const [typeName, recordType] of Object.entries(profile.recordTypes)) {
        if (recordType.skip) {
            continue;
        }

        const identifierCol = recordType.identifierColumnIndex;
        const condition = `this._columns.${identifierCol} == "${recordType.identifier}"`;

        const fieldMappings = recordType.fields.map((field) => {
            let expr = `this._columns.${field.columnIndex}`;
            expr = applyCSVTypeConversion(expr, field);
            return `root.${field.name} = ${expr}`;
        });

        conditions.push(`if ${condition} {
    root._recordType = "${typeName}"
    ${fieldMappings.join('\n    ')}
}`);
    }

    return conditions.join(' else ');
}

/**
 * 型変換を適用
 */
function applyCSVTypeConversion(expr: string, field: CSVField): string {
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
