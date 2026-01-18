import { z } from 'zod';
import type { BentoComponent, BentoConfigObject } from '../types.js';

/**
 * AWS S3 Sink設定スキーマ
 */
const S3SinkConfigSchema = z.object({
    /** S3バケット名 */
    bucket: z.string(),
    /** オブジェクトキーのパス (Bloblang interpolation可能) */
    path: z.string(),
    /** コンテンツタイプ */
    contentType: z.string().optional(),
    /** ストレージクラス */
    storageClass: z
        .enum([
            'STANDARD',
            'REDUCED_REDUNDANCY',
            'GLACIER',
            'STANDARD_IA',
            'ONEZONE_IA',
            'INTELLIGENT_TIERING',
            'DEEP_ARCHIVE',
        ])
        .optional(),
    /** S3互換エンドポイント (MinIOなど) */
    endpoint: z.string().optional(),
    /** リージョン */
    region: z.string().default('us-east-1'),
    /** 認証情報 */
    credentials: z
        .object({
            id: z.string().optional(),
            secret: z.string().optional(),
            role: z.string().optional(),
        })
        .optional(),
    /** メタデータ */
    metadata: z.record(z.string()).optional(),
    /** タグ */
    tags: z.record(z.string()).optional(),
    /** バッチ処理設定 */
    batching: z
        .object({
            count: z.number().optional(),
            byteSize: z.number().optional(),
            period: z.string().optional(),
        })
        .optional(),
});

export type S3SinkConfig = z.input<typeof S3SinkConfigSchema>;

/**
 * AWS S3 Sink
 * Bentoの aws_s3 output を使用
 */
export class S3Sink implements BentoComponent {
    private config: z.infer<typeof S3SinkConfigSchema>;

    constructor(config: S3SinkConfig) {
        this.config = S3SinkConfigSchema.parse(config);
    }

    toBento(): BentoConfigObject {
        const s3Config: Record<string, unknown> = {
            bucket: this.config.bucket,
            path: this.config.path,
            region: this.config.region,
        };

        if (this.config.contentType) {
            s3Config.content_type = this.config.contentType;
        }

        if (this.config.storageClass) {
            s3Config.storage_class = this.config.storageClass;
        }

        if (this.config.endpoint) {
            s3Config.endpoint = this.config.endpoint;
        }

        if (this.config.credentials) {
            const creds: Record<string, unknown> = {};
            if (this.config.credentials.id) {
                creds.id = this.config.credentials.id;
            }
            if (this.config.credentials.secret) {
                creds.secret = this.config.credentials.secret;
            }
            if (this.config.credentials.role) {
                creds.role = this.config.credentials.role;
            }
            s3Config.credentials = creds;
        }

        if (this.config.metadata) {
            s3Config.metadata = this.config.metadata;
        }

        if (this.config.tags) {
            s3Config.tags = this.config.tags;
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
            s3Config.batching = batching;
        }

        return {
            aws_s3: s3Config,
        };
    }
}
