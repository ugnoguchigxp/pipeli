/**
 * HL7 v2.5 ベースプロファイル
 *
 * HL7 v2.5 標準のメッセージ構造を定義します。
 * これをベースに各国・ベンダー固有のプロファイルを extends で拡張します。
 */
import type { HL7ProfileInput } from '../hl7-profile.js';

// ========================================
// ADT^A01 (患者入院)
// ========================================

export const hl7v25AdtA01Base: HL7ProfileInput = {
    id: 'hl7-v25-adt-a01',
    vendor: 'hl7_standard',
    profileVersion: '1.0.0',
    version: '2.5',
    messageType: 'ADT^A01',
    description: 'HL7 v2.5 ADT^A01 (患者入院) ベースプロファイル',

    segments: {
        MSH: {
            name: 'MSH',
            fields: [
                { path: 'MSH.3.1', normalizedName: 'sendingApplication', type: 'string' },
                { path: 'MSH.4.1', normalizedName: 'sendingFacility', type: 'string' },
                { path: 'MSH.5.1', normalizedName: 'receivingApplication', type: 'string' },
                { path: 'MSH.6.1', normalizedName: 'receivingFacility', type: 'string' },
                { path: 'MSH.7.1', normalizedName: 'messageTimestamp', type: 'datetime' },
                { path: 'MSH.9.1', normalizedName: 'messageType', type: 'string' },
                { path: 'MSH.10.1', normalizedName: 'messageControlId', type: 'string' },
            ],
        },
        PID: {
            name: 'PID',
            fields: [
                { path: 'PID.3.1', normalizedName: 'patientId', type: 'string', required: true },
                { path: 'PID.5.1', normalizedName: 'familyName', type: 'string' },
                { path: 'PID.5.2', normalizedName: 'givenName', type: 'string' },
                { path: 'PID.7.1', normalizedName: 'birthDate', type: 'date' },
                { path: 'PID.8.1', normalizedName: 'sex', type: 'string' },
                { path: 'PID.11.1', normalizedName: 'addressStreet', type: 'string' },
                { path: 'PID.11.3', normalizedName: 'addressCity', type: 'string' },
                { path: 'PID.11.5', normalizedName: 'addressPostalCode', type: 'string' },
                { path: 'PID.13.1', normalizedName: 'phoneHome', type: 'string' },
            ],
        },
        PV1: {
            name: 'PV1',
            fields: [
                { path: 'PV1.2.1', normalizedName: 'patientClass', type: 'string' },
                { path: 'PV1.3.1', normalizedName: 'assignedLocation', type: 'string' },
                { path: 'PV1.7.1', normalizedName: 'attendingDoctorId', type: 'string' },
                { path: 'PV1.7.2', normalizedName: 'attendingDoctorFamilyName', type: 'string' },
                { path: 'PV1.7.3', normalizedName: 'attendingDoctorGivenName', type: 'string' },
                { path: 'PV1.19.1', normalizedName: 'visitNumber', type: 'string' },
                { path: 'PV1.44.1', normalizedName: 'admitDate', type: 'datetime' },
            ],
        },
    },
};

// ========================================
// ADT^A08 (患者情報更新)
// ========================================

export const hl7v25AdtA08Base: HL7ProfileInput = {
    id: 'hl7-v25-adt-a08',
    vendor: 'hl7_standard',
    profileVersion: '1.0.0',
    version: '2.5',
    messageType: 'ADT^A08',
    description: 'HL7 v2.5 ADT^A08 (患者情報更新) ベースプロファイル',
    extends: 'hl7_standard:hl7-v25-adt-a01:1.0.0',
    segments: {},
};

// ========================================
// ORM^O01 (オーダ)
// ========================================

export const hl7v25OrmO01Base: HL7ProfileInput = {
    id: 'hl7-v25-orm-o01',
    vendor: 'hl7_standard',
    profileVersion: '1.0.0',
    version: '2.5',
    messageType: 'ORM^O01',
    description: 'HL7 v2.5 ORM^O01 (オーダ) ベースプロファイル',
    extends: 'hl7_standard:hl7-v25-adt-a01:1.0.0',

    segments: {
        ORC: {
            name: 'ORC',
            fields: [
                { path: 'ORC.1.1', normalizedName: 'orderControl', type: 'string' },
                { path: 'ORC.2.1', normalizedName: 'placerOrderNumber', type: 'string' },
                { path: 'ORC.3.1', normalizedName: 'fillerOrderNumber', type: 'string' },
                { path: 'ORC.5.1', normalizedName: 'orderStatus', type: 'string' },
                { path: 'ORC.9.1', normalizedName: 'transactionDateTime', type: 'datetime' },
                { path: 'ORC.12.1', normalizedName: 'orderingProviderId', type: 'string' },
            ],
        },
        OBR: {
            name: 'OBR',
            fields: [
                { path: 'OBR.1.1', normalizedName: 'setId', type: 'number' },
                { path: 'OBR.2.1', normalizedName: 'placerOrderNumber', type: 'string' },
                { path: 'OBR.3.1', normalizedName: 'fillerOrderNumber', type: 'string' },
                { path: 'OBR.4.1', normalizedName: 'universalServiceId', type: 'string' },
                { path: 'OBR.4.2', normalizedName: 'universalServiceText', type: 'string' },
                { path: 'OBR.7.1', normalizedName: 'observationDateTime', type: 'datetime' },
                { path: 'OBR.22.1', normalizedName: 'resultsStatusChange', type: 'datetime' },
                { path: 'OBR.25.1', normalizedName: 'resultStatus', type: 'string' },
            ],
        },
    },
};

// ========================================
// OUL^R22 (検査結果)
// ========================================

export const hl7v25OulR22Base: HL7ProfileInput = {
    id: 'hl7-v25-oul-r22',
    vendor: 'hl7_standard',
    profileVersion: '1.0.0',
    version: '2.5',
    messageType: 'OUL^R22',
    description: 'HL7 v2.5 OUL^R22 (検査結果) ベースプロファイル',
    extends: 'hl7_standard:hl7-v25-orm-o01:1.0.0',

    segments: {
        OBX: {
            name: 'OBX',
            repeatable: true,
            fields: [
                { path: 'OBX.1.1', normalizedName: 'setId', type: 'number' },
                { path: 'OBX.2.1', normalizedName: 'valueType', type: 'string' },
                { path: 'OBX.3.1', normalizedName: 'observationId', type: 'string' },
                { path: 'OBX.3.2', normalizedName: 'observationText', type: 'string' },
                { path: 'OBX.4.1', normalizedName: 'observationSubId', type: 'string' },
                { path: 'OBX.5.1', normalizedName: 'observationValue', type: 'string' },
                { path: 'OBX.6.1', normalizedName: 'units', type: 'string' },
                { path: 'OBX.7.1', normalizedName: 'referenceRange', type: 'string' },
                { path: 'OBX.8.1', normalizedName: 'abnormalFlags', type: 'string' },
                { path: 'OBX.11.1', normalizedName: 'observationResultStatus', type: 'string' },
                { path: 'OBX.14.1', normalizedName: 'observationDateTime', type: 'datetime' },
            ],
        },
    },
};

// ========================================
// エクスポート
// ========================================

export const HL7v25BaseProfiles = {
    'adt-a01': hl7v25AdtA01Base,
    'adt-a08': hl7v25AdtA08Base,
    'orm-o01': hl7v25OrmO01Base,
    'oul-r22': hl7v25OulR22Base,
} as const;
