/**
 * DICOM標準プロファイル
 *
 * 主要なモダリティ向けのDICOMプロファイルを定義します。
 */
import type { DICOMProfileInput } from '../dicom-profile.js';
import { CommonDICOMTags } from '../dicom-profile.js';

// ========================================
// DICOM ベースプロファイル
// ========================================

/**
 * DICOM共通ベースプロファイル
 *
 * すべてのモダリティで共通して使用されるタグを定義
 */
export const dicomBaseProfile: DICOMProfileInput = {
    id: 'dicom-base',
    vendor: 'dicom_standard',
    profileVersion: '1.0.0',
    description: 'DICOM共通ベースプロファイル',

    tags: {
        // Patient Tags
        patientName: CommonDICOMTags.PatientName,
        patientId: { ...CommonDICOMTags.PatientID, required: true },
        patientBirthDate: CommonDICOMTags.PatientBirthDate,
        patientSex: CommonDICOMTags.PatientSex,

        // Study Tags
        studyInstanceUid: { ...CommonDICOMTags.StudyInstanceUID, required: true },
        studyDate: CommonDICOMTags.StudyDate,
        studyTime: CommonDICOMTags.StudyTime,
        studyDescription: CommonDICOMTags.StudyDescription,
        accessionNumber: CommonDICOMTags.AccessionNumber,

        // Series Tags
        seriesInstanceUid: { ...CommonDICOMTags.SeriesInstanceUID, required: true },
        seriesNumber: CommonDICOMTags.SeriesNumber,
        seriesDescription: CommonDICOMTags.SeriesDescription,
        modality: { ...CommonDICOMTags.Modality, required: true },

        // Instance Tags
        sopInstanceUid: { ...CommonDICOMTags.SOPInstanceUID, required: true },
        sopClassUid: CommonDICOMTags.SOPClassUID,
        instanceNumber: CommonDICOMTags.InstanceNumber,

        // Equipment Tags
        manufacturer: CommonDICOMTags.Manufacturer,
        institutionName: CommonDICOMTags.InstitutionName,
    },
};

// ========================================
// CT (Computed Tomography)
// ========================================

export const dicomCtProfile: DICOMProfileInput = {
    id: 'dicom-ct',
    vendor: 'dicom_standard',
    profileVersion: '1.0.0',
    modality: 'CT',
    extends: 'dicom_standard:dicom-base:1.0.0',
    description: 'DICOM CT (Computed Tomography) プロファイル',

    tags: {
        // CT固有タグ
        kvp: {
            tag: '(0018,0060)',
            vr: 'DS',
            normalizedName: 'kvp',
            type: 'number',
            description: '管電圧 (kVp)',
        },
        xRayTubeCurrent: {
            tag: '(0018,1151)',
            vr: 'IS',
            normalizedName: 'xRayTubeCurrent',
            type: 'number',
            description: '管電流 (mA)',
        },
        sliceThickness: {
            tag: '(0018,0050)',
            vr: 'DS',
            normalizedName: 'sliceThickness',
            type: 'number',
            description: 'スライス厚 (mm)',
        },
        sliceLocation: {
            tag: '(0020,1041)',
            vr: 'DS',
            normalizedName: 'sliceLocation',
            type: 'number',
            description: 'スライス位置 (mm)',
        },
        windowCenter: {
            tag: '(0028,1050)',
            vr: 'DS',
            normalizedName: 'windowCenter',
            type: 'number',
            description: 'ウィンドウセンター',
        },
        windowWidth: {
            tag: '(0028,1051)',
            vr: 'DS',
            normalizedName: 'windowWidth',
            type: 'number',
            description: 'ウィンドウ幅',
        },
        rescaleIntercept: {
            tag: '(0028,1052)',
            vr: 'DS',
            normalizedName: 'rescaleIntercept',
            type: 'number',
            description: 'HU変換インターセプト',
        },
        rescaleSlope: {
            tag: '(0028,1053)',
            vr: 'DS',
            normalizedName: 'rescaleSlope',
            type: 'number',
            description: 'HU変換スロープ',
        },
    },
};

// ========================================
// MR (Magnetic Resonance)
// ========================================

export const dicomMrProfile: DICOMProfileInput = {
    id: 'dicom-mr',
    vendor: 'dicom_standard',
    profileVersion: '1.0.0',
    modality: 'MR',
    extends: 'dicom_standard:dicom-base:1.0.0',
    description: 'DICOM MR (Magnetic Resonance) プロファイル',

    tags: {
        // MR固有タグ
        magneticFieldStrength: {
            tag: '(0018,0087)',
            vr: 'DS',
            normalizedName: 'magneticFieldStrength',
            type: 'number',
            description: '磁場強度 (T)',
        },
        repetitionTime: {
            tag: '(0018,0080)',
            vr: 'DS',
            normalizedName: 'repetitionTime',
            type: 'number',
            description: 'TR (ms)',
        },
        echoTime: {
            tag: '(0018,0081)',
            vr: 'DS',
            normalizedName: 'echoTime',
            type: 'number',
            description: 'TE (ms)',
        },
        flipAngle: {
            tag: '(0018,1314)',
            vr: 'DS',
            normalizedName: 'flipAngle',
            type: 'number',
            description: 'フリップ角 (度)',
        },
        sequenceName: {
            tag: '(0018,0024)',
            vr: 'SH',
            normalizedName: 'sequenceName',
            description: 'シーケンス名',
        },
    },
};

// ========================================
// CR/DX (Radiography)
// ========================================

export const dicomCrProfile: DICOMProfileInput = {
    id: 'dicom-cr',
    vendor: 'dicom_standard',
    profileVersion: '1.0.0',
    modality: 'CR',
    extends: 'dicom_standard:dicom-base:1.0.0',
    description: 'DICOM CR (Computed Radiography) プロファイル',

    tags: {
        // CR固有タグ
        kvp: {
            tag: '(0018,0060)',
            vr: 'DS',
            normalizedName: 'kvp',
            type: 'number',
            description: '管電圧 (kVp)',
        },
        exposureTime: {
            tag: '(0018,1150)',
            vr: 'IS',
            normalizedName: 'exposureTime',
            type: 'number',
            description: '曝射時間 (ms)',
        },
        exposureInuAs: {
            tag: '(0018,1153)',
            vr: 'IS',
            normalizedName: 'exposureInuAs',
            type: 'number',
            description: '曝射量 (µAs)',
        },
        bodyPartExamined: {
            tag: '(0018,0015)',
            vr: 'CS',
            normalizedName: 'bodyPartExamined',
            description: '検査部位',
        },
        viewPosition: {
            tag: '(0018,5101)',
            vr: 'CS',
            normalizedName: 'viewPosition',
            description: '撮影方向',
        },
    },
};

// ========================================
// US (Ultrasound)
// ========================================

export const dicomUsProfile: DICOMProfileInput = {
    id: 'dicom-us',
    vendor: 'dicom_standard',
    profileVersion: '1.0.0',
    modality: 'US',
    extends: 'dicom_standard:dicom-base:1.0.0',
    description: 'DICOM US (Ultrasound) プロファイル',

    tags: {
        // US固有タグ
        transducerType: {
            tag: '(0018,6031)',
            vr: 'CS',
            normalizedName: 'transducerType',
            description: 'トランスデューサ種別',
        },
        imagingFrequency: {
            tag: '(0018,602C)',
            vr: 'FD',
            normalizedName: 'imagingFrequency',
            type: 'number',
            description: '撮像周波数 (Hz)',
        },
        mechanicalIndex: {
            tag: '(0018,5022)',
            vr: 'DS',
            normalizedName: 'mechanicalIndex',
            type: 'number',
            description: 'メカニカルインデックス',
        },
        thermalIndex: {
            tag: '(0018,5024)',
            vr: 'DS',
            normalizedName: 'thermalIndex',
            type: 'number',
            description: 'サーマルインデックス',
        },
    },
};

// ========================================
// エクスポート
// ========================================

export const DICOMStandardProfiles = {
    base: dicomBaseProfile,
    ct: dicomCtProfile,
    mr: dicomMrProfile,
    cr: dicomCrProfile,
    us: dicomUsProfile,
} as const;
