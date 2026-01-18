import { z } from 'zod';
import type { BentoComponent, BentoConfigObject } from '../types.js';

/**
 * PostgreSQL Source設定スキーマ
 */
const PostgresSourceConfigSchema = z.object({
    /** DSN接続文字列 (環境変数参照可能) */
    dsn: z.string().default('${DATABASE_URL}'),
    /** 実行するSQLクエリ */
    query: z.string(),
    /** クエリ引数のマッピング (Bloblang) */
    argsMapping: z.string().optional(),
    /** ポーリング間隔 (例: "10s", "1m") */
    pollInterval: z.string().optional(),
    /** 初回実行を即時に行うかどうか */
    initStatement: z.string().optional(),
});

export type PostgresSourceConfig = z.infer<typeof PostgresSourceConfigSchema>;
export type PostgresSourceConfigInput = z.input<typeof PostgresSourceConfigSchema>;

/**
 * PostgreSQL Source
 * Bentoの sql_select または sql_raw input を使用
 */
export class PostgresSource implements BentoComponent {
    private config: PostgresSourceConfig;

    constructor(config: PostgresSourceConfigInput) {
        this.config = PostgresSourceConfigSchema.parse(config);
    }

    toBento(): BentoConfigObject {
        const sqlConfig: Record<string, unknown> = {
            driver: 'postgres',
            dsn: this.config.dsn,
            query: this.config.query,
        };

        if (this.config.argsMapping) {
            sqlConfig.args_mapping = this.config.argsMapping;
        }

        if (this.config.initStatement) {
            sqlConfig.init_statement = this.config.initStatement;
        }

        const input: Record<string, unknown> = {
            sql_raw: sqlConfig,
        };

        // ポーリング間隔が指定された場合はgenerateでラップ
        if (this.config.pollInterval) {
            return {
                generate: {
                    interval: this.config.pollInterval,
                    mapping: 'root = {}',
                },
                processors: [
                    {
                        branch: {
                            request_map: 'root = ""',
                            processors: [input],
                            result_map: 'root = this',
                        },
                    },
                ],
            };
        }

        return input;
    }
}
