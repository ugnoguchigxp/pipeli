/**
 * DICOMプロファイル
 *
 * DICOM (Digital Imaging and Communications in Medicine) 形式の
 * 医用画像データからメタデータを抽出するためのプロファイル定義です。
 *
 * @see https://www.dicomstandard.org/
 */
import { z } from 'zod';

// ========================================
// DICOM Value Representation (VR)
// ========================================

/**
 * DICOM Value Representation
 * データ型を示す2文字のコード
 */
export const DICOMValueRepresentationSchema = z.enum([
    'AE', // Application Entity
    'AS', // Age String
    'AT', // Attribute Tag
    'CS', // Code String
    'DA', // Date
    'DS', // Decimal String
    'DT', // Date Time
    'FL', // Floating Point Single
    'FD', // Floating Point Double
    'IS', // Integer String
    'LO', // Long String
    'LT', // Long Text
    'OB', // Other Byte
    'OD', // Other Double
    'OF', // Other Float
    'OL', // Other Long
    'OW', // Other Word
    'PN', // Person Name
    'SH', // Short String
    'SL', // Signed Long
    'SQ', // Sequence
    'SS', // Signed Short
    'ST', // Short Text
    'TM', // Time
    'UC', // Unlimited Characters
    'UI', // Unique Identifier
    'UL', // Unsigned Long
    'UN', // Unknown
    'UR', // URI/URL
    'US', // Unsigned Short
    'UT', // Unlimited Text
]);

export type DICOMValueRepresentation = z.infer<typeof DICOMValueRepresentationSchema>;

// ========================================
// DICOM モダリティ
// ========================================

/**
 * DICOM モダリティ (撮影装置の種類)
 */
export const DICOMModalitySchema = z.enum([
    'CR', // Computed Radiography
    'CT', // Computed Tomography
    'MR', // Magnetic Resonance
    'US', // Ultrasound
    'NM', // Nuclear Medicine
    'PT', // PET
    'XA', // X-Ray Angiography
    'RF', // Radio Fluoroscopy
    'DX', // Digital Radiography
    'MG', // Mammography
    'IO', // Intra-Oral Radiography
    'PX', // Panoramic X-Ray
    'ES', // Endoscopy
    'OT', // Other
    'SC', // Secondary Capture
    'SR', // Structured Report
    'DOC', // Document
]);

export type DICOMModality = z.infer<typeof DICOMModalitySchema>;

// ========================================
// DICOM タグ定義
// ========================================

/**
 * DICOMタグマッピング定義
 */
export const DICOMTagMappingSchema = z.object({
    /** DICOMタグ (例: "(0010,0020)") */
    tag: z.string().regex(/^\([0-9A-Fa-f]{4},[0-9A-Fa-f]{4}\)$/, 'Invalid DICOM tag format'),
    /** Value Representation */
    vr: DICOMValueRepresentationSchema,
    /** 正規化後のフィールド名 */
    normalizedName: z.string().min(1),
    /** 出力型 */
    type: z.enum(['string', 'number', 'date', 'datetime', 'sequence', 'binary']).default('string'),
    /** 必須か */
    required: z.boolean().default(false),
    /** 説明 */
    description: z.string().optional(),
});

export type DICOMTagMapping = z.infer<typeof DICOMTagMappingSchema>;
export type DICOMTagMappingInput = z.input<typeof DICOMTagMappingSchema>;

// ========================================
// DICOM プロファイル
// ========================================

/**
 * DICOMプロファイル定義
 */
export const DICOMProfileSchema = z.object({
    /** プロファイルID */
    id: z.string().min(1),
    /** ベンダー名 */
    vendor: z.string().min(1),
    /** プロファイルバージョン */
    profileVersion: z.string().default('1.0.0'),
    /** 継承元プロファイルID */
    extends: z.string().optional(),
    /** 対象モダリティ */
    modality: DICOMModalitySchema.optional(),
    /** SOP Class UID (対象データ種別) */
    sopClassUid: z.string().optional(),
    /** 抽出対象タグ */
    tags: z.record(DICOMTagMappingSchema).default({}),
    /** 転送構文 */
    transferSyntax: z
        .enum([
            'implicit-little-endian',
            'explicit-little-endian',
            'explicit-big-endian',
            'deflated-explicit-little-endian',
        ])
        .default('explicit-little-endian'),
    /** PixelData処理オプション */
    pixelData: z
        .object({
            /** PixelDataを抽出するか */
            extract: z.boolean().default(false),
            /** 出力フォーマット */
            outputFormat: z.enum(['png', 'jpeg', 'raw']).optional(),
            /** 画像サイズ制限 */
            maxSize: z.number().int().positive().optional(),
        })
        .optional(),
    /** 説明 */
    description: z.string().optional(),
    /** メタデータ */
    metadata: z.record(z.unknown()).optional(),
});

export type DICOMProfile = z.infer<typeof DICOMProfileSchema>;
export type DICOMProfileInput = z.input<typeof DICOMProfileSchema>;

// ========================================
// ヘルパー関数
// ========================================

/**
 * DICOMタグをパース
 *
 * @param tag - DICOMタグ文字列 "(GGGG,EEEE)"
 * @returns { group, element }
 */
export function parseDICOMTag(tag: string): { group: number; element: number } | null {
    const match = tag.match(/^\(([0-9A-Fa-f]{4}),([0-9A-Fa-f]{4})\)$/);
    if (!match) return null;

    return {
        group: Number.parseInt(match[1], 16),
        element: Number.parseInt(match[2], 16),
    };
}

/**
 * DICOMタグを文字列に変換
 */
export function formatDICOMTag(group: number, element: number): string {
    const g = group.toString(16).toUpperCase().padStart(4, '0');
    const e = element.toString(16).toUpperCase().padStart(4, '0');
    return `(${g},${e})`;
}

/**
 * VRに基づいてJavaScript型を決定
 */
export function getJSTypeFromVR(vr: DICOMValueRepresentation): 'string' | 'number' | 'date' | 'binary' {
    switch (vr) {
        case 'IS':
        case 'DS':
        case 'FL':
        case 'FD':
        case 'SL':
        case 'SS':
        case 'UL':
        case 'US':
            return 'number';
        case 'DA':
        case 'DT':
        case 'TM':
            return 'date';
        case 'OB':
        case 'OD':
        case 'OF':
        case 'OL':
        case 'OW':
        case 'UN':
            return 'binary';
        default:
            return 'string';
    }
}

// ========================================
// 標準DICOMタグ定義
// ========================================

/**
 * よく使用されるDICOMタグの定義
 */
export const CommonDICOMTags = {
    // Patient Module
    PatientName: { tag: '(0010,0010)', vr: 'PN' as const, normalizedName: 'patientName' },
    PatientID: { tag: '(0010,0020)', vr: 'LO' as const, normalizedName: 'patientId' },
    PatientBirthDate: {
        tag: '(0010,0030)',
        vr: 'DA' as const,
        normalizedName: 'patientBirthDate',
        type: 'date' as const,
    },
    PatientSex: { tag: '(0010,0040)', vr: 'CS' as const, normalizedName: 'patientSex' },
    PatientAge: { tag: '(0010,1010)', vr: 'AS' as const, normalizedName: 'patientAge' },

    // Study Module
    StudyInstanceUID: { tag: '(0020,000D)', vr: 'UI' as const, normalizedName: 'studyInstanceUid' },
    StudyDate: { tag: '(0008,0020)', vr: 'DA' as const, normalizedName: 'studyDate', type: 'date' as const },
    StudyTime: { tag: '(0008,0030)', vr: 'TM' as const, normalizedName: 'studyTime' },
    StudyDescription: { tag: '(0008,1030)', vr: 'LO' as const, normalizedName: 'studyDescription' },
    AccessionNumber: { tag: '(0008,0050)', vr: 'SH' as const, normalizedName: 'accessionNumber' },

    // Series Module
    SeriesInstanceUID: { tag: '(0020,000E)', vr: 'UI' as const, normalizedName: 'seriesInstanceUid' },
    SeriesNumber: { tag: '(0020,0011)', vr: 'IS' as const, normalizedName: 'seriesNumber', type: 'number' as const },
    SeriesDescription: { tag: '(0008,103E)', vr: 'LO' as const, normalizedName: 'seriesDescription' },
    Modality: { tag: '(0008,0060)', vr: 'CS' as const, normalizedName: 'modality' },

    // Instance Module
    SOPInstanceUID: { tag: '(0008,0018)', vr: 'UI' as const, normalizedName: 'sopInstanceUid' },
    SOPClassUID: { tag: '(0008,0016)', vr: 'UI' as const, normalizedName: 'sopClassUid' },
    InstanceNumber: {
        tag: '(0020,0013)',
        vr: 'IS' as const,
        normalizedName: 'instanceNumber',
        type: 'number' as const,
    },

    // Equipment Module
    Manufacturer: { tag: '(0008,0070)', vr: 'LO' as const, normalizedName: 'manufacturer' },
    InstitutionName: { tag: '(0008,0080)', vr: 'LO' as const, normalizedName: 'institutionName' },
    StationName: { tag: '(0008,1010)', vr: 'SH' as const, normalizedName: 'stationName' },

    // Image Pixel Module
    Rows: { tag: '(0028,0010)', vr: 'US' as const, normalizedName: 'rows', type: 'number' as const },
    Columns: { tag: '(0028,0011)', vr: 'US' as const, normalizedName: 'columns', type: 'number' as const },
    BitsAllocated: { tag: '(0028,0100)', vr: 'US' as const, normalizedName: 'bitsAllocated', type: 'number' as const },
    PixelData: { tag: '(7FE0,0010)', vr: 'OW' as const, normalizedName: 'pixelData', type: 'binary' as const },
} as const;
