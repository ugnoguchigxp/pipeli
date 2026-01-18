import type { Logger } from './logger';
import type { SqliteQueue } from './queue';

export interface SchedulerOptions {
    cleanupIntervalMs?: number;
    cleanupOlderThanHours?: number;
    logger?: Logger;
}

/**
 * 定期タスク管理クラス
 */
export class Scheduler {
    private queue: SqliteQueue;
    private options: Required<SchedulerOptions>;
    private running = false;
    private timers: ReturnType<typeof setInterval>[] = [];

    constructor(queue: SqliteQueue, options: SchedulerOptions = {}) {
        this.queue = queue;
        this.options = {
            cleanupIntervalMs: options.cleanupIntervalMs ?? 60 * 60 * 1000, // 1時間ごと
            cleanupOlderThanHours: options.cleanupOlderThanHours ?? 24, // 24時間以上前
            logger: options.logger ?? {
                info: (msg: string) => console.log(msg),
                error: (msg: string) => console.error(msg),
                warn: (msg: string) => console.warn(msg),
                debug: (msg: string) => console.debug(msg),
            },
        };
    }

    /**
     * スケジューラーを開始
     */
    start() {
        if (this.running) return;
        this.running = true;
        this.options.logger.info('[Scheduler] Started');

        // クリーンアップタスクの登録
        const cleanupTimer = setInterval(() => {
            try {
                const count = this.queue.cleanupCompleted(this.options.cleanupOlderThanHours);
                if (count > 0) {
                    this.options.logger.info(`[Scheduler] Cleaned up ${count} completed jobs.`);
                }
            } catch (err) {
                this.options.logger.error('[Scheduler] Cleanup error', { error: String(err) });
            }
        }, this.options.cleanupIntervalMs);

        this.timers.push(cleanupTimer);
    }

    /**
     * スケジューラーを停止
     */
    stop() {
        this.running = false;
        for (const timer of this.timers) {
            clearInterval(timer);
        }
        this.timers = [];
        this.options.logger.info('[Scheduler] Stopped');
    }
}
