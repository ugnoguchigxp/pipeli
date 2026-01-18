import { z } from 'zod';

// ========================================
// 固定長フィールド定義
// ========================================

/**
 * 固定長フィールド定義
 *
 * COBOLライクな固定長データのフィールドを定義します。
 * バイト位置、トリム規則、パディング、型変換を指定できます。
 *
 * @example
 * {
 *   name: 'patientId',
 *   start: 0,
 *   length: 10,
 *   type: 'string',
 *   trim: 'both',
 *   padding: ' ',
 * }
 */
export const FixedWidthFieldSchema = z.object({
    /** フィールド名 (正規化後の名前) */
    name: z.string().min(1),
    /** 開始位置 (バイト, 0-indexed) */
    start: z.number().int().nonnegative(),
    /** 長さ (バイト) */
    length: z.number().int().positive(),
    /** 型 */
    type: z
        .enum([
            'string',
            'number',
            'date',
            'datetime',
            'packed_decimal', // COMP-3
            'binary', // COMP
            'boolean',
        ])
        .default('string'),
    /** トリム規則 */
    trim: z.enum(['left', 'right', 'both', 'none']).default('both'),
    /** パディング文字 */
    padding: z.string().max(1).default(' '),
    /** 符号位置 (数値の場合) */
    signPosition: z.enum(['none', 'leading', 'trailing', 'embedded']).optional(),
    /** 日付フォーマット (日付の場合) */
    dateFormat: z.string().optional(),
    /** 小数点以下桁数 (数値の場合) */
    decimalPlaces: z.number().int().nonnegative().optional(),
    /** 必須かどうか */
    required: z.boolean().default(false),
    /** デフォルト値 */
    defaultValue: z.unknown().optional(),
    /** 説明 */
    description: z.string().optional(),
});

export type FixedWidthField = z.infer<typeof FixedWidthFieldSchema>;
export type FixedWidthFieldInput = z.input<typeof FixedWidthFieldSchema>;

// ========================================
// レコード種別識別設定
// ========================================

/**
 * レコード種別識別位置
 */
export const RecordIdentifierSchema = z.object({
    /** 識別フィールドの開始位置 (バイト) */
    start: z.number().int().nonnegative(),
    /** 識別フィールドの長さ (バイト) */
    length: z.number().int().positive(),
});

// ========================================
// レコード種別定義
// ========================================

/**
 * レコード種別定義
 *
 * 固定長データ内のレコード種別を定義します。
 * 識別子の位置と値、およびそのレコード種別のフィールド定義を含みます。
 *
 * @example
 * {
 *   identifier: 'H',
 *   identifierPosition: { start: 0, length: 1 },
 *   fields: [
 *     { name: 'recordType', start: 0, length: 1 },
 *     { name: 'fileDate', start: 1, length: 8, type: 'date', dateFormat: 'YYYYMMDD' },
 *   ],
 * }
 */
export const RecordTypeDefinitionSchema = z.object({
    /** レコード種別識別子の値 */
    identifier: z.string().min(1),
    /** 識別フィールドの位置 */
    identifierPosition: RecordIdentifierSchema,
    /** このレコード種別のフィールド定義 */
    fields: z.array(FixedWidthFieldSchema),
    /** 説明 */
    description: z.string().optional(),
    /** このレコード種別をスキップするか */
    skip: z.boolean().default(false),
});

export type RecordTypeDefinition = z.infer<typeof RecordTypeDefinitionSchema>;
export type RecordTypeDefinitionInput = z.input<typeof RecordTypeDefinitionSchema>;

// ========================================
// 固定長プロファイル
// ========================================

/**
 * 固定長プロファイル
 *
 * COBOL系やレガシーシステムからの固定長データを定義します。
 * 文字エンコーディング、レコード種別、フィールド定義を含みます。
 *
 * @example
 * const profile: FixedWidthProfile = {
 *   id: 'vendor-b-patient',
 *   vendor: 'vendor_b',
 *   version: '1.0',
 *   encoding: 'shift_jis',
 *   recordLength: 200,
 *   lineEnding: 'CRLF',
 *   recordTypes: {
 *     header: {
 *       identifier: 'H',
 *       identifierPosition: { start: 0, length: 1 },
 *       fields: [...],
 *     },
 *     data: {
 *       identifier: 'D',
 *       identifierPosition: { start: 0, length: 1 },
 *       fields: [...],
 *     },
 *     trailer: {
 *       identifier: 'T',
 *       identifierPosition: { start: 0, length: 1 },
 *       fields: [...],
 *       skip: true,
 *     },
 *   },
 * };
 */
export const FixedWidthProfileSchema = z.object({
    /** プロファイルID (一意な識別子) */
    id: z.string().min(1),
    /** ベンダー名 */
    vendor: z.string().min(1),
    /** 施設ID (オプション) */
    facility: z.string().optional(),
    /** プロファイルバージョン */
    version: z.string().default('1.0'),
    /** 継承元プロファイルID (vendor:id:version 形式、または id のみ) */
    extends: z.string().optional(),
    /** 文字エンコーディング */
    encoding: z.enum(['utf-8', 'shift_jis', 'euc-jp', 'iso-2022-jp', 'cp932', 'windows-31j']).default('utf-8'),
    /** レコード長 (固定の場合、バイト) */
    recordLength: z.number().int().positive().optional(),
    /** 改行コード */
    lineEnding: z.enum(['LF', 'CRLF', 'CR', 'none']).default('LF'),
    /** レコード種別定義 */
    recordTypes: z.record(RecordTypeDefinitionSchema).default({}),
    /** デフォルトのトリム規則 */
    defaultTrim: z.enum(['left', 'right', 'both', 'none']).default('both'),
    /** デフォルトのパディング文字 */
    defaultPadding: z.string().max(1).default(' '),
    /** 単一レコード種別の場合のフィールド定義 (recordTypesの代替) */
    fields: z.array(FixedWidthFieldSchema).optional(),
    /** 説明 */
    description: z.string().optional(),
    /** メタデータ */
    metadata: z.record(z.unknown()).optional(),
});

export type FixedWidthProfile = z.infer<typeof FixedWidthProfileSchema>;
export type FixedWidthProfileInput = z.input<typeof FixedWidthProfileSchema>;

// ========================================
// ヘルパー関数
// ========================================

/**
 * フィールドのトリム式を生成
 *
 * @param trim - トリム規則
 * @param padding - パディング文字
 * @returns Bloblang式
 */
export function getTrimExpression(trim: 'left' | 'right' | 'both' | 'none', padding = ' '): string {
    const padChar = padding === ' ' ? '' : `"${padding}"`;

    switch (trim) {
        case 'left':
            return padChar ? `.trim_prefix(${padChar})` : '.trim_prefix(" ")';
        case 'right':
            return padChar ? `.trim_suffix(${padChar})` : '.trim_suffix(" ")';
        case 'both':
            return '.trim()';
        case 'none':
            return '';
    }
}

/**
 * フィールドの型変換式を生成
 *
 * @param field - フィールド定義
 * @returns Bloblang式
 */
export function getTypeConversionExpression(field: FixedWidthField): string {
    switch (field.type) {
        case 'number':
            if (field.decimalPlaces !== undefined && field.decimalPlaces > 0) {
                // 暗黙の小数点を処理
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
            return ' == "1" || this == "Y" || this == "y"';

        case 'packed_decimal':
            // Packed Decimal (COMP-3) は特殊処理が必要
            return '.decode("packed_decimal")';

        default:
            return '';
    }
}

/**
 * レコード種別のフィールドマッピングを生成
 *
 * @param profile - 固定長プロファイル
 * @param recordTypeName - レコード種別名
 * @returns Bloblang式の配列
 */
export function generateFieldMappings(profile: FixedWidthProfile, recordTypeName: string): string[] {
    const recordType = profile.recordTypes[recordTypeName];
    if (!recordType) {
        return [];
    }

    return recordType.fields.map((field) => {
        const trimExpr = getTrimExpression(field.trim ?? profile.defaultTrim, field.padding ?? profile.defaultPadding);
        const typeExpr = getTypeConversionExpression(field);

        let expr = `content().slice(${field.start}, ${field.start + field.length})${trimExpr}${typeExpr}`;

        // デフォルト値
        if (field.defaultValue !== undefined) {
            const defaultStr =
                typeof field.defaultValue === 'string' ? `"${field.defaultValue}"` : String(field.defaultValue);
            expr = `(${expr}).or(${defaultStr})`;
        }

        return `root.${field.name} = ${expr}`;
    });
}

/**
 * レコード種別の条件分岐マッピングを生成
 *
 * @param profile - 固定長プロファイル
 * @returns Bloblang式
 */
export function generateRecordTypeMappings(profile: FixedWidthProfile): string {
    const conditions: string[] = [];

    for (const [typeName, recordType] of Object.entries(profile.recordTypes)) {
        if (recordType.skip) {
            continue;
        }

        const { identifierPosition, identifier } = recordType;
        const condition = `content().slice(${identifierPosition.start}, ${identifierPosition.start + identifierPosition.length}).trim() == "${identifier}"`;

        const fieldMappings = generateFieldMappings(profile, typeName);

        conditions.push(`if ${condition} {
    root._recordType = "${typeName}"
    ${fieldMappings.join('\n    ')}
}`);
    }

    return conditions.join(' else ');
}
