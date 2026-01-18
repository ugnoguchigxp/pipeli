import { z } from 'zod';

// ========================================
// HL7 フィールドマッピング
// ========================================

/**
 * HL7フィールドマッピング定義
 *
 * @example
 * {
 *   path: 'PID.3.1',
 *   normalizedName: 'patientId',
 *   type: 'string',
 *   required: true,
 * }
 */
export const HL7FieldMappingSchema = z.object({
    /** HL7パス (例: "PID.3.1", "OBX.5.1.2" - セグメントは3文字) */
    path: z.string().regex(/^[A-Z0-9]{3}(\.\d+)+$/, 'Invalid HL7 path format (e.g., PID.3.1)'),
    /** 正規化後のフィールド名 */
    normalizedName: z.string().min(1),
    /** 型変換 */
    type: z.enum(['string', 'number', 'date', 'datetime', 'boolean']).default('string'),
    /** 必須かどうか */
    required: z.boolean().default(false),
    /** デフォルト値 */
    defaultValue: z.unknown().optional(),
    /** 変換関数 (Bloblang式) */
    transform: z.string().optional(),
});

export type HL7FieldMapping = z.infer<typeof HL7FieldMappingSchema>;
export type HL7FieldMappingInput = z.input<typeof HL7FieldMappingSchema>;

// ========================================
// HL7 セグメント定義
// ========================================

/**
 * HL7セグメント定義
 *
 * @example
 * {
 *   name: 'PID',
 *   fields: [...],
 *   repeatable: false,
 * }
 */
export const HL7SegmentDefinitionSchema = z.object({
    /** セグメント名 (例: "PID", "OBR", "ZPD" - 必ず3文字) */
    name: z.string().regex(/^[A-Z0-9]{3}$/, 'Segment name must be exactly 3 uppercase letters'),
    /** フィールド定義 */
    fields: z.array(HL7FieldMappingSchema),
    /** 繰り返し可能か */
    repeatable: z.boolean().default(false),
    /** 最小出現回数 */
    minOccurs: z.number().int().nonnegative().default(0),
    /** 最大出現回数 (nullは無制限) */
    maxOccurs: z.number().int().positive().nullable().default(null),
});

export type HL7SegmentDefinition = z.infer<typeof HL7SegmentDefinitionSchema>;
export type HL7SegmentDefinitionInput = z.input<typeof HL7SegmentDefinitionSchema>;

// ========================================
// MLLP 設定
// ========================================

/**
 * MLLP (Minimal Lower Layer Protocol) 設定
 * ベンダーによって制御文字が異なる場合に対応
 */
export const MLLPConfigSchema = z.object({
    /** Start Block 文字 (デフォルト: \x0b) */
    startBlock: z.string().default('\x0b'),
    /** End Block 文字 (デフォルト: \x1c) */
    endBlock: z.string().default('\x1c'),
    /** Trailer 文字 (デフォルト: \r) */
    trailer: z.string().default('\r'),
});

export type MLLPConfig = z.infer<typeof MLLPConfigSchema>;

// ========================================
// HL7 プロファイル
// ========================================

/**
 * HL7プロファイル
 *
 * ベンダー固有のHL7メッセージ構造を定義します。
 * 標準セグメントとベンダー拡張（Z-segment等）を分離して管理します。
 *
 * @example
 * const profile: HL7Profile = {
 *   id: 'vendor-a-adt',
 *   vendor: 'vendor_a',
 *   facility: 'hospital_001',
 *   version: '2.5.1',
 *   messageType: 'ADT^A01',
 *   segments: {
 *     PID: { name: 'PID', fields: [...] },
 *     PV1: { name: 'PV1', fields: [...] },
 *   },
 *   extensions: {
 *     ZPD: { name: 'ZPD', fields: [...] },
 *   },
 * };
 */
export const HL7ProfileSchema = z.object({
    /** プロファイルID (一意な識別子) */
    id: z.string().min(1),
    /** ベンダー名 */
    vendor: z.string().min(1),
    /** 施設ID (オプション) */
    facility: z.string().optional(),
    /** プロファイルバージョン (セマンティックバージョニング推奨) */
    profileVersion: z.string().default('1.0.0'),
    /** 継承元プロファイルID (vendor:id:version 形式、または id のみ) */
    extends: z.string().optional(),
    /** HL7バージョン */
    version: z.enum([
        '2.1',
        '2.2',
        '2.3',
        '2.3.1',
        '2.4',
        '2.5',
        '2.5.1',
        '2.6',
        '2.7',
        '2.7.1',
        '2.8',
        '2.8.1',
        '2.8.2',
    ]),
    /** メッセージタイプ (例: ADT^A01, ADT^A01^ADT_A01, ORM^O01) - 2要素または3要素 */
    messageType: z
        .string()
        .regex(
            /^[A-Z]{3}\^[A-Z]\d{2}(\^[A-Z]{3}_[A-Z]\d{2})?$/,
            'Invalid message type format (e.g., ADT^A01 or ADT^A01^ADT_A01)',
        ),
    /** 標準セグメント定義 */
    segments: z.record(HL7SegmentDefinitionSchema).default({}),
    /** ベンダー拡張セグメント (Z-segment等) */
    extensions: z.record(HL7SegmentDefinitionSchema).optional(),
    /** MLLP設定のカスタマイズ */
    mllp: MLLPConfigSchema.optional(),
    /** 説明 */
    description: z.string().optional(),
    /** メタデータ */
    metadata: z.record(z.unknown()).optional(),
});

export type HL7Profile = z.infer<typeof HL7ProfileSchema>;
export type HL7ProfileInput = z.input<typeof HL7ProfileSchema>;

// ========================================
// ヘルパー関数
// ========================================

/**
 * HL7パスをパースして構成要素を返す
 *
 * @param path - HL7パス (例: "PID.3.1")
 * @returns { segment, field, component, subcomponent }
 */
export function parseHL7Path(path: string): {
    segment: string;
    field: number;
    component: number;
    subcomponent?: number;
} {
    const parts = path.split('.');
    if (parts.length < 3) {
        throw new Error(`Invalid HL7 path: ${path}`);
    }

    return {
        segment: parts[0],
        field: Number.parseInt(parts[1], 10),
        component: Number.parseInt(parts[2], 10),
        subcomponent: parts[3] ? Number.parseInt(parts[3], 10) : undefined,
    };
}

/**
 * プロファイルから指定セグメントのフィールドマッピングを生成
 *
 * @param profile - HL7プロファイル
 * @param segmentName - セグメント名
 * @returns Bloblang式の配列
 */
export function generateSegmentMappings(profile: HL7Profile, segmentName: string): string[] {
    const segment = profile.segments[segmentName];
    if (!segment) {
        return [];
    }

    return segment.fields.map((field) => {
        const { segment: seg, field: fieldNum, component } = parseHL7Path(field.path);
        let expr = `this.${seg}.${fieldNum}.${component}`;

        // 型変換
        if (field.type === 'number') {
            expr = `${expr}.number()`;
        } else if (field.type === 'date') {
            expr = `${expr}.parse_timestamp("20060102")`;
        } else if (field.type === 'datetime') {
            expr = `${expr}.parse_timestamp("20060102150405")`;
        }

        // デフォルト値
        if (field.defaultValue !== undefined) {
            const defaultStr =
                typeof field.defaultValue === 'string' ? `"${field.defaultValue}"` : String(field.defaultValue);
            expr = `${expr}.or(${defaultStr})`;
        }

        // カスタム変換
        if (field.transform) {
            expr = field.transform.replace('$value', expr);
        }

        return `root.${field.normalizedName} = ${expr}`;
    });
}
