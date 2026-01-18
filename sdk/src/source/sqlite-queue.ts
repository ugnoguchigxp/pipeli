import { z } from 'zod';
import type { BentoComponent, BentoConfigObject } from '../types.js';

/**
 * SQLiteQueue Source の設定スキーマ
 */
export const SqliteQueueSourceConfigSchema = z.object({
    /** QueueServerのURL (例: "http://localhost:9090") */
    serverUrl: z.string().url(),
    /** ベースパス (デフォルト: /queue) */
    basePath: z.string().optional().default('/queue'),
    /** ポーリング間隔 (デフォルト: 1s) */
    pollInterval: z.string().optional().default('1s'),
    /** タイムアウト (デフォルト: 30s) */
    timeout: z.string().optional().default('30s'),
});

export type SqliteQueueSourceConfig = z.infer<typeof SqliteQueueSourceConfigSchema>;
export type SqliteQueueSourceConfigInput = z.input<typeof SqliteQueueSourceConfigSchema>;

/**
 * Bento YAML生成用のSQLite Queue Sourceクラス
 * http_client inputでキューサーバーからジョブを取得する設定を生成
 */
export class SqliteQueueSource implements BentoComponent {
    private config: SqliteQueueSourceConfig;

    constructor(config: SqliteQueueSourceConfigInput) {
        this.config = SqliteQueueSourceConfigSchema.parse(config);
    }

    toBento(): BentoConfigObject {
        return {
            http_client: {
                url: `${this.config.serverUrl}${this.config.basePath}/dequeue`,
                verb: 'GET',
                timeout: this.config.timeout,
                rate_limit: this.config.pollInterval,
                // 204 No Content の場合は空メッセージとして扱う
                successful_on_codes: [200, 204],
            },
        };
    }
}
