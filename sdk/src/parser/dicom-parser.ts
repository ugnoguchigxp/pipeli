/**
 * DICOMパーサー
 *
 * DICOMプロファイルに基づいてDICOMデータからメタデータを抽出します。
 *
 * 注意: 実際のDICOMバイナリ解析には外部ライブラリ（dcmjs等）が必要です。
 * このパーサーはBento設定の生成とメタデータ抽出の構造を定義します。
 */
import type { DICOMProfile, DICOMTagMapping } from '../profile/dicom-profile.js';
import { getJSTypeFromVR, parseDICOMTag } from '../profile/dicom-profile.js';
import type { BentoComponent } from '../types.js';

/**
 * DICOMパーサー
 *
 * DICOMプロファイルに基づいてメタデータを抽出します。
 *
 * @example
 * const parser = new DICOMParser(ctProfile);
 * const bentoConfig = parser.toBento();
 */
export class DICOMParser implements BentoComponent {
    constructor(private profile: DICOMProfile) {}

    /**
     * Bento設定を生成
     *
     * DICOMはバイナリ形式のため、Bentoの標準プロセッサでは直接処理できません。
     * 外部のDICOM解析ツール/サービスと連携するための設定を生成します。
     */
    toBento() {
        const processors: Record<string, unknown>[] = [];

        // メタデータの設定
        processors.push({
            mapping: `root._profile = {
    "id": "${this.profile.id}",
    "vendor": "${this.profile.vendor}",
    "version": "${this.profile.profileVersion}",
    "modality": "${this.profile.modality || 'unknown'}"
}`,
        });

        // DICOMタグ抽出のためのマッピング設定
        // 注: 実際の抽出は外部プロセスで行い、結果をJSONとしてパイプラインに渡す想定
        const tagMappings = this.generateTagMappings();

        if (tagMappings.length > 0) {
            processors.push({
                mapping: tagMappings.join('\n'),
            });
        }

        return processors;
    }

    /**
     * タグマッピングを生成
     */
    private generateTagMappings(): string[] {
        const mappings: string[] = [];

        for (const [_key, tagDef] of Object.entries(this.profile.tags)) {
            const mapping = this.generateSingleTagMapping(tagDef);
            if (mapping) {
                mappings.push(mapping);
            }
        }

        return mappings;
    }

    /**
     * 単一タグのマッピングを生成
     */
    private generateSingleTagMapping(tagDef: DICOMTagMapping): string | null {
        const parsedTag = parseDICOMTag(tagDef.tag);
        if (!parsedTag) return null;

        // DICOMパーサーからの出力を想定
        // 外部ツールがタグ値をJSON形式で出力し、それをパイプラインで処理
        const tagKey = `dicom_${parsedTag.group.toString(16).padStart(4, '0')}_${parsedTag.element.toString(16).padStart(4, '0')}`;

        // 型変換
        const typeExpr = this.getTypeConversionExpression(tagDef);

        return `root.${tagDef.normalizedName} = this.${tagKey}${typeExpr}`;
    }

    /**
     * 型変換式を生成
     */
    private getTypeConversionExpression(tagDef: DICOMTagMapping): string {
        const type = tagDef.type || getJSTypeFromVR(tagDef.vr);

        switch (type) {
            case 'number':
                return '.number()';
            case 'date':
                // DICOM日付フォーマット: YYYYMMDD
                return '.parse_timestamp("20060102")';
            case 'datetime':
                // DICOM日時フォーマット: YYYYMMDDHHMMSS.FFFFFF
                return '.parse_timestamp("20060102150405")';
            default:
                return '';
        }
    }

    /**
     * プロファイルから抽出対象タグのリストを取得
     */
    getTargetTags(): Array<{ tag: string; normalizedName: string; required: boolean }> {
        return Object.values(this.profile.tags).map((tagDef) => ({
            tag: tagDef.tag,
            normalizedName: tagDef.normalizedName,
            required: tagDef.required ?? false,
        }));
    }

    /**
     * 外部DICOMパーサー用の設定を生成
     *
     * dcmjs, pydicom等の外部ツールと連携するための設定
     */
    toExternalParserConfig(): {
        tags: Array<{ tag: string; name: string; vr: string }>;
        extractPixelData: boolean;
        pixelDataFormat?: string;
    } {
        const tags = Object.values(this.profile.tags).map((tagDef) => ({
            tag: tagDef.tag,
            name: tagDef.normalizedName,
            vr: tagDef.vr,
        }));

        return {
            tags,
            extractPixelData: this.profile.pixelData?.extract ?? false,
            pixelDataFormat: this.profile.pixelData?.outputFormat,
        };
    }
}
