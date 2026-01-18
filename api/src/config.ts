import { z } from 'zod';
import { ConfigurationError } from './lib/errors';

/**
 * 設定スキーマ定義
 */
const ConfigSchema = z.object({
    // Server
    port: z.coerce.number().int().min(1).max(65535).default(3001),
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),

    // Queue
    queueDbPath: z.string().default('./queue.db'),
    queueMaxRetries: z.coerce.number().int().min(0).default(4),
    queueConcurrency: z.coerce.number().int().min(1).default(1),

    // Batch
    batchSize: z.coerce.number().int().min(1).default(500),

    // Scheduler
    cleanupIntervalMs: z.coerce.number().int().min(1000).default(3600000), // 1時間
    cleanupOlderThanHours: z.coerce.number().int().min(1).default(24),

    // Logging
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * 環境変数から設定を読み込み、バリデーションを実行
 */
function loadConfig(): Config {
    const rawConfig = {
        port: process.env.PORT,
        nodeEnv: process.env.NODE_ENV,
        queueDbPath: process.env.QUEUE_DB_PATH,
        queueMaxRetries: process.env.QUEUE_MAX_RETRIES,
        queueConcurrency: process.env.QUEUE_CONCURRENCY,
        batchSize: process.env.BATCH_SIZE,
        cleanupIntervalMs: process.env.CLEANUP_INTERVAL_MS,
        cleanupOlderThanHours: process.env.CLEANUP_OLDER_THAN_HOURS,
        logLevel: process.env.LOG_LEVEL,
    };

    try {
        return ConfigSchema.parse(rawConfig);
    } catch (err) {
        if (err instanceof z.ZodError) {
            const errors = err.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
            throw new ConfigurationError(`Configuration validation failed: ${errors}`);
        }
        throw err;
    }
}

/**
 * アプリケーション設定（シングルトン）
 */
export const config = loadConfig();
