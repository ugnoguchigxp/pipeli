/**
 * プロファイル定義層
 *
 * ベンダー固有のデータ構造をプロファイルとして定義します。
 * HL7、固定長、CSV、DICOM形式など、各フォーマットに対応したプロファイルを提供します。
 */

// CSVプロファイル
export {
    type CSVField,
    type CSVFieldInput,
    CSVFieldSchema,
    type CSVProfile,
    type CSVProfileInput,
    CSVProfileSchema,
    type CSVRecordType,
    type CSVRecordTypeInput,
    CSVRecordTypeSchema,
    generateCSVRecordTypeMappings,
} from './csv-profile.js';
// DICOMプロファイル
export {
    CommonDICOMTags,
    type DICOMModality,
    DICOMModalitySchema,
    type DICOMProfile,
    type DICOMProfileInput,
    DICOMProfileSchema,
    type DICOMTagMapping,
    type DICOMTagMappingInput,
    DICOMTagMappingSchema,
    type DICOMValueRepresentation,
    DICOMValueRepresentationSchema,
    formatDICOMTag,
    getJSTypeFromVR,
    parseDICOMTag,
} from './dicom-profile.js';
// 固定長プロファイル
export {
    type FixedWidthField,
    type FixedWidthFieldInput,
    FixedWidthFieldSchema,
    type FixedWidthProfile,
    type FixedWidthProfileInput,
    FixedWidthProfileSchema,
    generateFieldMappings,
    generateRecordTypeMappings,
    getTrimExpression,
    getTypeConversionExpression,
    RecordIdentifierSchema,
    type RecordTypeDefinition,
    type RecordTypeDefinitionInput,
    RecordTypeDefinitionSchema,
} from './fixed-width-profile.js';
// HL7 プロファイル
export {
    generateSegmentMappings,
    type HL7FieldMapping,
    type HL7FieldMappingInput,
    HL7FieldMappingSchema,
    type HL7Profile,
    type HL7ProfileInput,
    HL7ProfileSchema,
    type HL7SegmentDefinition,
    type HL7SegmentDefinitionInput,
    HL7SegmentDefinitionSchema,
    type MLLPConfig,
    MLLPConfigSchema,
    parseHL7Path,
} from './hl7-profile.js';

// プロファイルレジストリ
export { type AnyProfile, ProfileRegistry, profileRegistry } from './registry.js';
export * from './standards/dicom.js';
// 標準プロファイル
export * from './standards/hl7-v25-base.js';
export * from './standards/jahis-lab.js';
export * from './standards/receden.js';
