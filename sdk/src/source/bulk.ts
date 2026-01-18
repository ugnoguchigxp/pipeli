import { z } from 'zod';
import type { BentoComponent, BentoConfigObject } from '../types.js';

export const BulkApiSourceConfigSchema = z.object({
    /** リッスンするアドレス (デフォルト: 0.0.0.0:8080) */
    address: z.string().optional().default('0.0.0.0:8080'),
    /** Bulk API エンドポイントのパス */
    path: z.string().startsWith('/'),
    /** 配列のフィールド名（デフォルト: items） */
    arrayField: z.string().optional().default('items'),
    /** 1バッチあたりの最大アイテム数（0で無制限）(デフォルト: 1000) */
    maxBatchSize: z.number().optional().default(1000),
    /** タイムアウト (デフォルト: 60s) - バルク処理は長めに */
    timeout: z.string().optional().default('60s'),
});

export type BulkApiSourceConfig = z.infer<typeof BulkApiSourceConfigSchema>;
export type BulkApiSourceConfigInput = z.input<typeof BulkApiSourceConfigSchema>;

/**
 * Bulk API Source
 *
 * バッチリクエスト（配列で複数レコードを送信）を受信し、
 * 個別のメッセージに展開（unarchive）するHTTPソース。
 *
 * 入力形式:
 * ```json
 * {
 *   "items": [
 *     { "id": "1", "name": "Alice" },
 *     { "id": "2", "name": "Bob" }
 *   ]
 * }
 * ```
 *
 * 出力: 各アイテムが個別のメッセージとして処理される
 *
 * @example
 * ```typescript
 * Source.bulk({
 *     path: '/api/patients/bulk',
 *     arrayField: 'patients',
 *     maxBatchSize: 500,
 * })
 * ```
 */
export class BulkApiSource implements BentoComponent {
    private config: BulkApiSourceConfig;

    constructor(config: BulkApiSourceConfigInput) {
        this.config = BulkApiSourceConfigSchema.parse(config);
    }

    toBento(): BentoConfigObject {
        const processors: BentoConfigObject[] = [
            // リクエストボディをパース
            { mapping: 'root = content().parse_json()' },
        ];

        // バッチサイズ制限チェック
        if (this.config.maxBatchSize > 0) {
            processors.push({
                bloblang: `if this.${this.config.arrayField}.length() > ${this.config.maxBatchSize} { throw("Batch size exceeds limit: " + this.${this.config.arrayField}.length().string() + " > ${this.config.maxBatchSize}") }`,
            });
        }

        // 配列を個別メッセージに展開（unarchive）
        processors.push({
            // 配列フィールドを取り出す
            mapping: `root = this.${this.config.arrayField}`,
        });

        // 配列を個別メッセージに展開
        processors.push({
            unarchive: {
                format: 'json_array',
            },
        });

        return {
            http_server: {
                address: this.config.address,
                path: this.config.path,
                allowed_verbs: ['POST'],
                timeout: this.config.timeout,
            },
            processors,
        };
    }
}
