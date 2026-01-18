/**
 * JAHIS臨床検査データ交換規約プロファイル
 *
 * 日本医療情報学会(JAHIS)が定める臨床検査データの標準規約です。
 * HL7 v2.5 OUL^R22 をベースに、JLAC10コード等の日本固有拡張を追加します。
 *
 * @see https://www.jahis.jp/standard/
 */
import type { HL7Profile, HL7ProfileInput } from '../hl7-profile.js';

// ========================================
// JAHIS 臨床検査データ交換規約
// ========================================

/**
 * JAHIS臨床検査プロファイル
 *
 * HL7 v2.5 OUL^R22 を継承し、以下の日本固有拡張を追加:
 * - JLAC10コード (OBX.3.1)
 * - 日本語検査名
 * - 基準値の拡張
 */
export const jahisLabProfile: HL7ProfileInput = {
    id: 'jahis-lab',
    vendor: 'jahis',
    profileVersion: '1.0.0',
    version: '2.5',
    messageType: 'OUL^R22',
    extends: 'hl7_standard:hl7-v25-oul-r22:1.0.0',
    description: 'JAHIS臨床検査データ交換規約プロファイル',

    segments: {
        // PID: 日本向け拡張
        PID: {
            name: 'PID',
            fields: [
                // 日本固有: 漢字名・カナ名
                { path: 'PID.5.1.1', normalizedName: 'familyNameKanji', type: 'string' },
                { path: 'PID.5.2.1', normalizedName: 'givenNameKanji', type: 'string' },
                { path: 'PID.5.7', normalizedName: 'familyNameKana', type: 'string' },
                { path: 'PID.5.8', normalizedName: 'givenNameKana', type: 'string' },
            ],
        },
        // OBX: JLAC10対応
        OBX: {
            name: 'OBX',
            repeatable: true,
            fields: [
                // JLAC10コード (Japanese Laboratory Code)
                { path: 'OBX.3.1', normalizedName: 'jlac10Code', type: 'string' },
                { path: 'OBX.3.2', normalizedName: 'testNameJa', type: 'string' },
                { path: 'OBX.3.3', normalizedName: 'codingSystem', type: 'string' },
                // 結果値
                { path: 'OBX.5.1', normalizedName: 'resultValue', type: 'string' },
                // 単位
                { path: 'OBX.6.1', normalizedName: 'unit', type: 'string' },
                // 基準値範囲
                { path: 'OBX.7.1', normalizedName: 'referenceRange', type: 'string' },
                // 異常フラグ (H: 高値, L: 低値, N: 正常)
                { path: 'OBX.8.1', normalizedName: 'abnormalFlag', type: 'string' },
                // 結果状態 (F: 最終, P: 暫定)
                { path: 'OBX.11.1', normalizedName: 'resultStatus', type: 'string' },
                // 検査日時
                { path: 'OBX.14.1', normalizedName: 'observationDateTime', type: 'datetime' },
                // 検査責任者
                { path: 'OBX.16.1', normalizedName: 'responsibleObserverId', type: 'string' },
            ],
        },
    },

    // JAHIS固有の拡張セグメント
    extensions: {
        // ZL1: 検査室固有情報
        ZL1: {
            name: 'ZL1',
            fields: [
                { path: 'ZL1.1.1', normalizedName: 'laboratoryId', type: 'string' },
                { path: 'ZL1.2.1', normalizedName: 'laboratoryName', type: 'string' },
                { path: 'ZL1.3.1', normalizedName: 'specimenType', type: 'string' },
                { path: 'ZL1.4.1', normalizedName: 'collectionDateTime', type: 'datetime' },
            ],
        },
    },

    metadata: {
        standard: 'JAHIS臨床検査データ交換規約',
        version: '5.1',
        organization: '一般社団法人 保健医療福祉情報システム工業会',
    },
};

// ========================================
// JLAC10コードのヘルパー
// ========================================

/**
 * JLAC10コードの構造
 *
 * JLAC10は17桁のコードで構成:
 * - 分析物コード (5桁)
 * - 識別コード (4桁)
 * - 材料コード (3桁)
 * - 測定法コード (3桁)
 * - 結果識別コード (2桁)
 */
export interface JLAC10Code {
    /** 分析物コード */
    analyteCode: string;
    /** 識別コード */
    identifierCode: string;
    /** 材料コード */
    materialCode: string;
    /** 測定法コード */
    methodCode: string;
    /** 結果識別コード */
    resultIdentifierCode: string;
}

/**
 * JLAC10コードをパース
 */
export function parseJLAC10(code: string): JLAC10Code | null {
    if (code.length !== 17) {
        return null;
    }

    return {
        analyteCode: code.slice(0, 5),
        identifierCode: code.slice(5, 9),
        materialCode: code.slice(9, 12),
        methodCode: code.slice(12, 15),
        resultIdentifierCode: code.slice(15, 17),
    };
}

// ========================================
// 検査会社向け派生プロファイルのテンプレート
// ========================================

/**
 * 検査会社向けプロファイルを作成するヘルパー
 */
export function createLabCompanyProfile(
    companyId: string,
    companyName: string,
    extensions?: HL7Profile['extensions'],
): HL7Profile {
    return {
        id: `${companyId}-lab`,
        vendor: companyId,
        profileVersion: '1.0.0',
        version: '2.5',
        messageType: 'OUL^R22',
        extends: 'jahis:jahis-lab:1.0.0',
        description: `${companyName} 検査結果プロファイル`,
        segments: {},
        extensions,
        metadata: {
            labCompany: companyName,
            basedOn: 'JAHIS臨床検査データ交換規約',
        },
    };
}
