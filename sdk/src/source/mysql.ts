import { z } from 'zod';
import type { BentoComponent, BentoConfigObject } from '../types.js';

/**
 * MySQL Source設定スキーマ
 */
const MySqlSourceConfigSchema = z.object({
    /** DSN接続文字列 (環境変数参照可能) */
    dsn: z.string().default('${MYSQL_DSN}'),
    /** 実行するSQLクエリ */
    query: z.string(),
    /** クエリ引数のマッピング (Bloblang) */
    argsMapping: z.string().optional(),
    /** ポーリング間隔 (例: "10s", "1m") */
    pollInterval: z.string().optional(),
    /** 初回実行を即時に行うかどうか */
    initStatement: z.string().optional(),
});

export type MySqlSourceConfig = z.infer<typeof MySqlSourceConfigSchema>;
export type MySqlSourceConfigInput = z.input<typeof MySqlSourceConfigSchema>;

/**
 * MySQL Source
 * Bentoの sql_raw input を使用
 */
export class MySqlSource implements BentoComponent {
    private config: MySqlSourceConfig;

    constructor(config: MySqlSourceConfigInput) {
        this.config = MySqlSourceConfigSchema.parse(config);
    }

    toBento(): BentoConfigObject {
        const sqlConfig: Record<string, unknown> = {
            driver: 'mysql',
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
