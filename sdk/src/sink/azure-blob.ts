import { z } from 'zod';
import type { BentoComponent, BentoConfigObject } from '../types.js';

/**
 * Azure Blob Storage Sink設定スキーマ
 */
const AzureBlobSinkConfigSchema = z.object({
    /** ストレージアカウント名 */
    storageAccount: z.string(),
    /** コンテナ名 */
    container: z.string(),
    /** Blobのパス (Bloblang interpolation可能) */
    path: z.string(),
    /** 接続文字列 (環境変数参照可能) */
    storageConnectionString: z.string().default('${AZURE_STORAGE_CONNECTION_STRING}'),
    /** ストレージアクセスキー (接続文字列の代わりに使用) */
    storageAccessKey: z.string().optional(),
    /** コンテンツタイプ */
    contentType: z.string().optional(),
    /** コンテンツエンコーディング */
    contentEncoding: z.string().optional(),
    /** メタデータ */
    metadata: z.record(z.string()).optional(),
    /** Blobタイプ */
    blobType: z.enum(['BLOCK', 'APPEND']).default('BLOCK'),
    /** パブリックアクセスレベル */
    publicAccessLevel: z.enum(['PRIVATE', 'BLOB', 'CONTAINER']).optional(),
    /** バッチ処理設定 */
    batching: z
        .object({
            count: z.number().optional(),
            byteSize: z.number().optional(),
            period: z.string().optional(),
        })
        .optional(),
});

export type AzureBlobSinkConfig = z.input<typeof AzureBlobSinkConfigSchema>;

/**
 * Azure Blob Storage Sink
 * Bentoの azure_blob_storage output を使用
 */
export class AzureBlobSink implements BentoComponent {
    private config: z.infer<typeof AzureBlobSinkConfigSchema>;

    constructor(config: AzureBlobSinkConfig) {
        this.config = AzureBlobSinkConfigSchema.parse(config);
    }

    toBento(): BentoConfigObject {
        const blobConfig: Record<string, unknown> = {
            storage_account: this.config.storageAccount,
            container: this.config.container,
            path: this.config.path,
            storage_connection_string: this.config.storageConnectionString,
            blob_type: this.config.blobType,
        };

        if (this.config.storageAccessKey) {
            blobConfig.storage_access_key = this.config.storageAccessKey;
        }

        if (this.config.contentType) {
            blobConfig.content_type = this.config.contentType;
        }

        if (this.config.contentEncoding) {
            blobConfig.content_encoding = this.config.contentEncoding;
        }

        if (this.config.metadata) {
            blobConfig.metadata = this.config.metadata;
        }

        if (this.config.publicAccessLevel) {
            blobConfig.public_access_level = this.config.publicAccessLevel;
        }

        if (this.config.batching) {
            const batching: Record<string, unknown> = {};
            if (this.config.batching.count) {
                batching.count = this.config.batching.count;
            }
            if (this.config.batching.byteSize) {
                batching.byte_size = this.config.batching.byteSize;
            }
            if (this.config.batching.period) {
                batching.period = this.config.batching.period;
            }
            blobConfig.batching = batching;
        }

        return {
            azure_blob_storage: blobConfig,
        };
    }
}
