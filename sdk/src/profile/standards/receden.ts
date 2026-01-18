/**
 * レセ電コード（診療報酬請求）プロファイル
 *
 * 社会保険診療報酬支払基金が定めるレセプト電算処理システムの
 * CSV形式データフォーマットを定義します。
 *
 * データ形式:
 * - 区切り: カンマ (,)
 * - 改行: CRLF
 * - エンコーディング: Shift-JIS
 * - 引用符: なし
 *
 * @see https://www.ssk.or.jp/seikyushiharai/rezept/index.html
 */
import type { CSVProfileInput } from '../csv-profile.js';

// ========================================
// レセ電コード ベースプロファイル (CSV形式)
// ========================================

/**
 * レセ電コード（医科）ベースプロファイル
 *
 * 主要なレコード種別:
 * - IR: 医療機関情報レコード
 * - RE: レセプト共通レコード
 * - HO: 保険者レコード
 * - KO: 公費レコード
 * - SY: 傷病名レコード
 * - SI: 診療行為レコード
 * - IY: 医薬品レコード
 * - TO: 特定器材レコード
 * - CO: コメントレコード
 * - GO: 合計レコード
 */
export const recedenMedicalProfile: CSVProfileInput = {
    id: 'receden-medical',
    vendor: 'shiharai_kikin',
    version: '1.0',
    encoding: 'shift_jis',
    delimiter: ',',
    lineEnding: 'CRLF',
    quoteChar: '',
    hasHeader: false,
    description: 'レセ電コード（医科）CSV形式プロファイル',

    recordTypes: {
        // IR: 医療機関情報レコード
        IR: {
            identifier: 'IR',
            identifierColumnIndex: 0,
            description: '医療機関情報レコード',
            fields: [
                { name: 'recordType', columnIndex: 0, type: 'string' },
                { name: 'pointTable', columnIndex: 1, type: 'string', description: '審査支払機関' },
                { name: 'prefecture', columnIndex: 2, type: 'string', description: '都道府県' },
                { name: 'pointTableCode', columnIndex: 3, type: 'string', description: '点数表' },
                { name: 'medicalInstitutionCode', columnIndex: 4, type: 'string', description: '医療機関コード' },
                { name: 'reserve1', columnIndex: 5, type: 'string', description: '予備' },
                { name: 'medicalInstitutionName', columnIndex: 6, type: 'string', description: '医療機関名称' },
                { name: 'billingYearMonth', columnIndex: 7, type: 'string', description: '請求年月' },
                { name: 'multiVolumeId', columnIndex: 8, type: 'string', description: 'マルチボリューム識別情報' },
                { name: 'phoneNumber', columnIndex: 9, type: 'string', description: '電話番号' },
            ],
        },

        // RE: レセプト共通レコード
        RE: {
            identifier: 'RE',
            identifierColumnIndex: 0,
            description: 'レセプト共通レコード',
            fields: [
                { name: 'recordType', columnIndex: 0, type: 'string' },
                { name: 'receiptNo', columnIndex: 1, type: 'number', description: 'レセプト番号' },
                { name: 'receiptType', columnIndex: 2, type: 'string', description: 'レセプト種別' },
                { name: 'billingYearMonth', columnIndex: 3, type: 'string', description: '診療年月' },
                { name: 'patientName', columnIndex: 4, type: 'string', description: '氏名' },
                { name: 'sex', columnIndex: 5, type: 'string', description: '男女区分' },
                { name: 'birthDate', columnIndex: 6, type: 'string', description: '生年月日' },
                { name: 'benefitRate', columnIndex: 7, type: 'string', description: '給付割合' },
                { name: 'admitDate', columnIndex: 8, type: 'string', description: '入院年月日' },
                {
                    name: 'ward',
                    columnIndex: 9,
                    type: 'string',
                    description: '病棟区分(入院) / 一部負担金・食事療養費・生活療養費標準負担額区分(入院外)',
                },
                { name: 'diseaseCode', columnIndex: 10, type: 'string', description: '主傷病' },
                { name: 'kana', columnIndex: 11, type: 'string', description: 'カタカナ(氏名)' },
                { name: 'patientId', columnIndex: 12, type: 'string', description: '患者の状態' },
            ],
        },

        // HO: 保険者レコード
        HO: {
            identifier: 'HO',
            identifierColumnIndex: 0,
            description: '保険者レコード',
            fields: [
                { name: 'recordType', columnIndex: 0, type: 'string' },
                { name: 'insurerNumber', columnIndex: 1, type: 'string', description: '保険者番号' },
                { name: 'insuredSymbol', columnIndex: 2, type: 'string', description: '被保険者証(手帳)の記号' },
                { name: 'insuredNumber', columnIndex: 3, type: 'string', description: '被保険者証(手帳)の番号' },
                { name: 'insuredBranch', columnIndex: 4, type: 'string', description: '被保険者証(手帳)の枝番' },
                { name: 'beneficiaryNo', columnIndex: 5, type: 'string', description: '受給者番号' },
            ],
        },

        // KO: 公費レコード
        KO: {
            identifier: 'KO',
            identifierColumnIndex: 0,
            description: '公費レコード',
            fields: [
                { name: 'recordType', columnIndex: 0, type: 'string' },
                { name: 'publicExpenseSeq', columnIndex: 1, type: 'string', description: '公費負担者番号(1-4)' },
                { name: 'publicBearerNumber', columnIndex: 2, type: 'string', description: '負担者番号' },
                { name: 'publicRecipientNumber', columnIndex: 3, type: 'string', description: '受給者番号' },
                { name: 'benefitCategory', columnIndex: 4, type: 'string', description: '任意給付区分' },
            ],
        },

        // SY: 傷病名レコード
        SY: {
            identifier: 'SY',
            identifierColumnIndex: 0,
            description: '傷病名レコード',
            fields: [
                { name: 'recordType', columnIndex: 0, type: 'string' },
                { name: 'diseaseCode', columnIndex: 1, type: 'string', description: '傷病名コード' },
                { name: 'startDate', columnIndex: 2, type: 'string', description: '診療開始日' },
                { name: 'outcome', columnIndex: 3, type: 'string', description: '転帰区分' },
                { name: 'modifierCode', columnIndex: 4, type: 'string', description: '修飾語コード' },
                { name: 'diseaseName', columnIndex: 5, type: 'string', description: '傷病名称' },
                { name: 'mainDisease', columnIndex: 6, type: 'string', description: '主傷病' },
                { name: 'supplement', columnIndex: 7, type: 'string', description: '補足コメント' },
            ],
        },

        // SI: 診療行為レコード
        SI: {
            identifier: 'SI',
            identifierColumnIndex: 0,
            description: '診療行為レコード',
            fields: [
                { name: 'recordType', columnIndex: 0, type: 'string' },
                { name: 'diagnosisCategory', columnIndex: 1, type: 'string', description: '診療識別' },
                { name: 'burden', columnIndex: 2, type: 'string', description: '負担区分' },
                { name: 'actionCode', columnIndex: 3, type: 'string', description: '診療行為コード' },
                { name: 'quantity', columnIndex: 4, type: 'number', description: '数量' },
                { name: 'point', columnIndex: 5, type: 'number', description: '点数' },
                { name: 'times', columnIndex: 6, type: 'number', description: '回数' },
                { name: 'comment', columnIndex: 7, type: 'string', description: 'コメントコード' },
                { name: 'serviceDays', columnIndex: 8, type: 'string', description: '算定日情報' },
            ],
        },

        // IY: 医薬品レコード
        IY: {
            identifier: 'IY',
            identifierColumnIndex: 0,
            description: '医薬品レコード',
            fields: [
                { name: 'recordType', columnIndex: 0, type: 'string' },
                { name: 'diagnosisCategory', columnIndex: 1, type: 'string', description: '診療識別' },
                { name: 'burden', columnIndex: 2, type: 'string', description: '負担区分' },
                { name: 'drugCode', columnIndex: 3, type: 'string', description: '医薬品コード' },
                { name: 'quantity', columnIndex: 4, type: 'number', description: '使用量' },
                { name: 'point', columnIndex: 5, type: 'number', description: '点数' },
                { name: 'times', columnIndex: 6, type: 'number', description: '回数' },
                { name: 'comment', columnIndex: 7, type: 'string', description: 'コメントコード' },
                { name: 'serviceDays', columnIndex: 8, type: 'string', description: '算定日情報' },
            ],
        },

        // TO: 特定器材レコード
        TO: {
            identifier: 'TO',
            identifierColumnIndex: 0,
            description: '特定器材レコード',
            fields: [
                { name: 'recordType', columnIndex: 0, type: 'string' },
                { name: 'diagnosisCategory', columnIndex: 1, type: 'string', description: '診療識別' },
                { name: 'burden', columnIndex: 2, type: 'string', description: '負担区分' },
                { name: 'materialCode', columnIndex: 3, type: 'string', description: '特定器材コード' },
                { name: 'quantity', columnIndex: 4, type: 'number', description: '使用量' },
                { name: 'point', columnIndex: 5, type: 'number', description: '点数' },
                { name: 'times', columnIndex: 6, type: 'number', description: '回数' },
                { name: 'unitPrice', columnIndex: 7, type: 'number', description: '単価' },
                { name: 'materialName', columnIndex: 8, type: 'string', description: '特定器材名称' },
                { name: 'comment', columnIndex: 9, type: 'string', description: 'コメント' },
                { name: 'serviceDays', columnIndex: 10, type: 'string', description: '算定日情報' },
            ],
        },

        // GO: 合計レコード
        GO: {
            identifier: 'GO',
            identifierColumnIndex: 0,
            description: '合計レコード',
            fields: [
                { name: 'recordType', columnIndex: 0, type: 'string' },
                { name: 'totalPoint', columnIndex: 1, type: 'number', description: '合計点数' },
                { name: 'totalAmount', columnIndex: 2, type: 'number', description: '合計金額' },
            ],
        },
    },

    metadata: {
        standard: 'レセプト電算処理システム',
        organization: '社会保険診療報酬支払基金',
        format: 'CSV',
        category: '医科',
    },
};

// ========================================
// レセ電コード（調剤）
// ========================================

export const recedenPharmacyProfile: CSVProfileInput = {
    id: 'receden-pharmacy',
    vendor: 'shiharai_kikin',
    version: '1.0',
    encoding: 'shift_jis',
    delimiter: ',',
    lineEnding: 'CRLF',
    quoteChar: '',
    hasHeader: false,
    extends: 'shiharai_kikin:receden-medical:1.0',
    description: 'レセ電コード（調剤）CSV形式プロファイル',

    recordTypes: {
        // CZ: 調剤行為レコード
        CZ: {
            identifier: 'CZ',
            identifierColumnIndex: 0,
            description: '調剤行為レコード',
            fields: [
                { name: 'recordType', columnIndex: 0, type: 'string' },
                { name: 'prescriptionNo', columnIndex: 1, type: 'number', description: '処方番号' },
                { name: 'dispensingCategory', columnIndex: 2, type: 'string', description: '調剤識別' },
                { name: 'burden', columnIndex: 3, type: 'string', description: '負担区分' },
                { name: 'dispensingCode', columnIndex: 4, type: 'string', description: '調剤コード' },
                { name: 'quantity', columnIndex: 5, type: 'number', description: '数量' },
                { name: 'point', columnIndex: 6, type: 'number', description: '点数' },
                { name: 'times', columnIndex: 7, type: 'number', description: '回数' },
                { name: 'comment', columnIndex: 8, type: 'string', description: 'コメント' },
            ],
        },
    },

    metadata: {
        standard: 'レセプト電算処理システム',
        organization: '社会保険診療報酬支払基金',
        format: 'CSV',
        category: '調剤',
    },
};

// ========================================
// エクスポート
// ========================================

export const RecedenProfiles = {
    medical: recedenMedicalProfile,
    pharmacy: recedenPharmacyProfile,
} as const;
