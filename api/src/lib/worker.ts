import type { Logger } from './logger';
import type { Job, SqliteQueue } from './queue';

export interface WorkerOptions {
    concurrency?: number;
    intervalMs?: number;
    healthCheck?: () => Promise<boolean>;
    logger?: Logger;
}

/**
 * バックグラウンドワーカー管理クラス
 */
export class WorkerManager<T> {
    private queue: SqliteQueue<T>;
    private options: Required<WorkerOptions>;
    private running = false;
    private semaphore = 0; // セマフォパターンで同時実行数を管理
    private isHealthy = true;

    constructor(queue: SqliteQueue<T>, options: WorkerOptions = {}) {
        this.queue = queue;
        this.options = {
            concurrency: options.concurrency ?? (Number(process.env.QUEUE_CONCURRENCY) || 1),
            intervalMs: options.intervalMs ?? 1000,
            healthCheck: options.healthCheck ?? (async () => true),
            logger: options.logger ?? {
                info: (msg: string) => console.log(msg),
                error: (msg: string) => console.error(msg),
                warn: (msg: string) => console.warn(msg),
                debug: (msg: string) => console.debug(msg),
            },
        };
    }

    /**
     * ワーカーを開始
     */
    async start(handler: (job: Job<T>) => Promise<void>) {
        if (this.running) return;
        this.running = true;
        this.options.logger.info(`[Worker] Started with concurrency: ${this.options.concurrency}`);

        // ヘルスチェックループ
        this.startHealthCheckLoop();

        // ワーカーループ
        for (let i = 0; i < this.options.concurrency; i++) {
            this.runWorker(handler);
        }
    }

    /**
     * ワーカーを停止（Graceful Shutdown）
     * 処理中のジョブが完了するまで待機
     */
    async stop(): Promise<void> {
        this.running = false;
        this.options.logger.info('[Worker] Stopping...');

        // 処理中のジョブが完了するまで待機
        const maxWaitTime = 30000; // 最大30秒
        const startTime = Date.now();

        while (this.semaphore > 0) {
            if (Date.now() - startTime > maxWaitTime) {
                this.options.logger.error(
                    `[Worker] Timeout waiting for jobs to complete. ${this.semaphore} jobs still running.`,
                );
                break;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        this.options.logger.info('[Worker] Stopped gracefully');
    }

    private async startHealthCheckLoop() {
        while (this.running) {
            try {
                this.isHealthy = await this.options.healthCheck();
                if (!this.isHealthy) {
                    this.options.logger.error('[Worker] Health check failed. Guardrail activated.');
                }
            } catch (err) {
                this.isHealthy = false;
                this.options.logger.error('[Worker] Health check error', { error: String(err) });
            }
            await new Promise((resolve) => setTimeout(resolve, 30000)); // 30秒ごとにチェック
        }
    }

    private async runWorker(handler: (job: Job<T>) => Promise<void>) {
        while (this.running) {
            if (!this.isHealthy) {
                // 不健康な場合は待機
                await new Promise((resolve) => setTimeout(resolve, 5000));
                continue;
            }

            // セマフォで同時実行数を制御
            if (this.semaphore >= this.options.concurrency) {
                await new Promise((resolve) => setTimeout(resolve, 100));
                continue;
            }

            const job = this.queue.dequeue();
            if (!job) {
                // ジョブがない場合は待機
                await new Promise((resolve) => setTimeout(resolve, this.options.intervalMs));
                continue;
            }

            // セマフォを取得
            this.semaphore++;

            // ジョブ処理（非同期で実行）
            this.processJob(job, handler).finally(() => {
                // セマフォを解放
                this.semaphore--;
            });
        }
    }

    private async processJob(job: Job<T>, handler: (job: Job<T>) => Promise<void>): Promise<void> {
        try {
            await handler(job);
            this.queue.complete(job.id);
        } catch (err) {
            this.options.logger.error(`[Worker] Job ${job.id} failed`, { error: String(err) });
            const msg = err instanceof Error ? err.message : String(err);
            this.queue.fail(job.id, msg);
        }
    }
}
