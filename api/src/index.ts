import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { anonymize, hashValue, hmacValue } from './anonymizer';
import { config } from './config';
import { JobProcessingError } from './lib/errors';
import { logger } from './lib/logger';
import { type Job, SqliteQueue } from './lib/queue';
import { Scheduler } from './lib/scheduler';
import { WorkerManager } from './lib/worker';
import { createQueueRouter } from './routes/queue';
import type { AnonymizeRequest } from './schemas';
import { AnonymizeRequestSchema } from './schemas';

const app = new Hono();

// ========================================
// 初期化
// ========================================

const queue = new SqliteQueue({
    dbPath: config.queueDbPath,
    maxRetries: config.queueMaxRetries,
    logger,
});

const worker = new WorkerManager(queue, {
    concurrency: config.queueConcurrency,
    logger,
});

const scheduler = new Scheduler(queue, {
    cleanupIntervalMs: config.cleanupIntervalMs,
    cleanupOlderThanHours: config.cleanupOlderThanHours,
    logger,
});

// 共通ワーカーハンドラ
export async function workerHandler(job: Job) {
    try {
        if (job.name === 'anonymize') {
            anonymize(job.payload as AnonymizeRequest);
            logger.info('Job processed', { jobId: job.id, jobName: job.name });
        } else if (job.name === 'anonymize_batch') {
            const { data, config: anonymizeConfig } = job.payload as {
                data: Record<string, unknown>[];
                config: AnonymizeRequest['config'];
            };
            logger.info('Processing batch job', { jobId: job.id, recordCount: data.length });

            try {
                // Bulk 試行
                for (const item of data) {
                    anonymize({ data: item, config: anonymizeConfig });
                }
                logger.info('Batch job processed successfully', { jobId: job.id, recordCount: data.length });
            } catch (_err) {
                logger.warn('Batch job failed, falling back to individual processing', { jobId: job.id });

                let successCount = 0;
                let failureCount = 0;

                for (const item of data) {
                    try {
                        anonymize({ data: item, config: anonymizeConfig });
                        successCount++;
                    } catch (rowErr) {
                        failureCount++;
                        const errMsg = rowErr instanceof Error ? rowErr.message : String(rowErr);
                        // 失敗したレコードだけを単体のDLQジョブとして新規登録し、即座に失敗マーク
                        const failedJob = queue.enqueue('failed_record', {
                            originalJobId: job.id,
                            error: errMsg,
                            dataKeys: Object.keys(item),
                            dataSize: JSON.stringify(item).length,
                        });
                        queue.fail(failedJob.id, errMsg, true);
                    }
                }

                logger.info('Fallback completed', {
                    jobId: job.id,
                    successCount,
                    failureCount,
                });
                // 個別救済で分配しきったので、元のジョブは「完了（一部失敗あり）」とする
                return;
            }
        } else {
            throw new JobProcessingError(`Unknown job type: ${job.name}`, { jobId: job.id, jobName: job.name });
        }
    } catch (err) {
        logger.error('Job processing failed', {
            jobId: job.id,
            jobName: job.name,
            error: err instanceof Error ? err.message : String(err),
        });
        throw err;
    }
}

// バックグラウンドタスク開始
if (process.env.NODE_ENV !== 'test') {
    worker.start(workerHandler);
    scheduler.start();
}

// CORS設定
app.use('*', cors());

// ヘルスチェック
app.get('/health', (c) => c.json({ status: 'ok' }));

// ========================================
// 匿名化エンドポイント (同期)
// ========================================

app.post('/anonymize', zValidator('json', AnonymizeRequestSchema), (c) => {
    const request = c.req.valid('json');
    const result = anonymize(request);
    return c.json(result);
});

const BatchRequestSchema = z.object({
    data: z.array(z.record(z.unknown())),
    config: AnonymizeRequestSchema.shape.config,
});

app.post('/anonymize/batch', zValidator('json', BatchRequestSchema), (c) => {
    const { data, config } = c.req.valid('json');
    const results = data.map((item) => anonymize({ data: item, config }));
    return c.json(results);
});

// ========================================
// キュー関連エンドポイント (非同期)
// ========================================

const BATCH_SIZE = config.batchSize;

/**
 * POST /enqueue/anonymize/batch
 * 大量データを分割してキューに追加
 */
app.post('/enqueue/anonymize/batch', zValidator('json', BatchRequestSchema), (c) => {
    const { data, config } = c.req.valid('json');
    const jobIds: number[] = [];

    // チャンク分割
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const chunk = data.slice(i, i + BATCH_SIZE);
        const job = queue.enqueue('anonymize_batch', { data: chunk, config });
        jobIds.push(job.id);
    }

    return c.json({
        status: 'enqueued',
        totalRecords: data.length,
        jobCount: jobIds.length,
        jobIds,
    });
});

/**
 * POST /enqueue/anonymize
 * 匿名化タスクをキューに追加
 */
app.post('/enqueue/anonymize', zValidator('json', AnonymizeRequestSchema), (c) => {
    const request = c.req.valid('json');
    const job = queue.enqueue('anonymize', request);
    return c.json({ status: 'enqueued', jobId: job.id });
});

// キュー操作・管理用のルートをネスト
app.route('/queue', createQueueRouter(queue));

// ========================================
// 個別操作エンドポイント
// ========================================

app.post('/hash', zValidator('json', z.object({ value: z.unknown(), salt: z.string().optional() })), (c) => {
    const { value, salt } = c.req.valid('json');
    return c.json({ result: hashValue(value, salt) });
});

app.post('/hmac', zValidator('json', z.object({ value: z.unknown(), secretKey: z.string() })), (c) => {
    const { value, secretKey } = c.req.valid('json');
    return c.json({ result: hmacValue(value, secretKey) });
});

// ========================================
// エラーハンドリング
// ========================================

app.onError((err, c) => {
    logger.error('Request error', {
        error: err.message,
        type: err.name,
        stack: err.stack,
    });
    return c.json({ error: err.message, type: err.name }, 500);
});

// ========================================
// サーバー起動
// ========================================

const port = config.port;
logger.info('Starting server', { port, nodeEnv: config.nodeEnv });

export default {
    port,
    fetch: app.fetch,
};

export { app, queue, worker, scheduler };
