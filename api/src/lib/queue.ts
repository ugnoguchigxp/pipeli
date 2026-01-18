import { Database } from 'bun:sqlite';
import type { Logger } from './logger';

/**
 * ジョブのステータス
 */
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * ジョブの型定義
 */
export interface Job<T = unknown> {
    id: number;
    name: string;
    payload: T;
    status: JobStatus;
    retryCount: number;
    maxRetries: number;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * キューのオプション
 */
export interface QueueOptions {
    /** SQLiteデータベースのパス (デフォルト: ./queue.db) */
    dbPath?: string;
    /** 最大リトライ回数 (デフォルト: 4) */
    maxRetries?: number;
    /** テーブル名 (デフォルト: jobs) */
    tableName?: string;
    /** ロガー */
    logger?: Logger;
}

/**
 * キューの統計情報
 */
export interface QueueStats {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
}

/**
 * DBから取得した行の型
 */
interface JobRow {
    id: number;
    name: string;
    payload: string;
    status: string;
    retry_count: number;
    max_retries: number;
    error: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * SQL識別子（テーブル名）のバリデーション
 * SQLインジェクション対策として、安全な識別子のみを許可
 */
function sanitizeTableName(name: string): string {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
        throw new Error(`Invalid table name: ${name}. Only alphanumeric characters and underscores are allowed.`);
    }
    return name;
}

/**
 * SQLiteベースの軽量キューシステム (Bun.sqlite版)
 *
 * @example
 * ```typescript
 * const queue = new SqliteQueue({
 *     dbPath: './queue.db',
 *     maxRetries: 4,
 *     logger: console
 * });
 *
 * // ジョブを追加
 * const job = queue.enqueue('process-data', { userId: 123 });
 *
 * // ジョブを取得して処理
 * const nextJob = queue.dequeue();
 * if (nextJob) {
 *     try {
 *         await processJob(nextJob);
 *         queue.complete(nextJob.id);
 *     } catch (err) {
 *         queue.fail(nextJob.id, err.message);
 *     }
 * }
 * ```
 */
export class SqliteQueue<T = unknown> {
    private db: Database;
    private tableName: string;
    private maxRetries: number;
    private logger?: {
        error: (message: string, data?: unknown) => void;
        info: (message: string, data?: unknown) => void;
    };

    constructor(options: QueueOptions = {}) {
        const dbPath = options.dbPath || './queue.db';
        this.tableName = sanitizeTableName(options.tableName || 'jobs');
        this.maxRetries = options.maxRetries ?? 4;
        this.logger = options.logger;

        this.db = new Database(dbPath);
        this.db.exec('PRAGMA journal_mode = WAL');
        this.db.exec('PRAGMA synchronous = NORMAL'); // パフォーマンス向上
        this.db.exec('PRAGMA cache_size = -64000'); // 64MB キャッシュ
        this.initSchema();
    }

    /**
     * テーブルとインデックスを初期化
     */
    private initSchema(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS ${this.tableName} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                payload TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                retry_count INTEGER NOT NULL DEFAULT 0,
                max_retries INTEGER NOT NULL DEFAULT 4,
                error TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_${this.tableName}_status ON ${this.tableName}(status);
            CREATE INDEX IF NOT EXISTS idx_${this.tableName}_created_at ON ${this.tableName}(created_at);
            CREATE INDEX IF NOT EXISTS idx_${this.tableName}_status_created ON ${this.tableName}(status, created_at);
        `);
    }

    /**
     * DBの行をJobオブジェクトに変換
     */
    private rowToJob(row: JobRow): Job<T> {
        try {
            return {
                id: row.id,
                name: row.name,
                payload: JSON.parse(row.payload) as T,
                status: row.status as JobStatus,
                retryCount: row.retry_count,
                maxRetries: row.max_retries,
                error: row.error ?? undefined,
                createdAt: new Date(row.created_at),
                updatedAt: new Date(row.updated_at),
            };
        } catch (err) {
            this.logger?.error('Failed to parse job payload', { jobId: row.id, error: err });
            throw new Error(`Invalid job payload for job ${row.id}`);
        }
    }

    /**
     * ジョブをキューに追加
     *
     * @param name - ジョブ名（処理タイプの識別に使用）
     * @param payload - ジョブのペイロード（任意のJSON serializable データ）
     * @returns 作成されたジョブ
     *
     * @throws {Error} ペイロードがJSON serializable でない場合
     */
    enqueue(name: string, payload: T): Job<T> {
        if (!name || typeof name !== 'string') {
            throw new Error('Job name must be a non-empty string');
        }

        const now = new Date().toISOString();
        let payloadStr: string;

        try {
            payloadStr = JSON.stringify(payload);
        } catch (_err) {
            throw new Error('Job payload must be JSON serializable');
        }

        const stmt = this.db.prepare(`
            INSERT INTO ${this.tableName} (name, payload, status, retry_count, max_retries, created_at, updated_at)
            VALUES (?, ?, 'pending', 0, ?, ?, ?)
            RETURNING id
        `);

        const row = stmt.get(name, payloadStr, this.maxRetries, now, now) as { id: number };
        const id = row.id;

        this.logger?.info('Job enqueued', { jobId: id, name });

        return {
            id,
            name,
            payload,
            status: 'pending',
            retryCount: 0,
            maxRetries: this.maxRetries,
            createdAt: new Date(now),
            updatedAt: new Date(now),
        };
    }

    /**
     * 次のジョブをキューから取得（ステータスをprocessingに更新）
     *
     * @returns 次のジョブ、またはキューが空の場合は null
     */
    dequeue(): Job<T> | null {
        const now = new Date().toISOString();

        const stmt = this.db.prepare(`
            UPDATE ${this.tableName}
            SET status = 'processing', updated_at = ?
            WHERE id = (
                SELECT id FROM ${this.tableName}
                WHERE status = 'pending'
                ORDER BY created_at ASC
                LIMIT 1
            )
            RETURNING *
        `);

        const row = stmt.get(now) as JobRow | null;
        if (!row) return null;

        this.logger?.info('Job dequeued', { jobId: row.id, name: row.name });
        return this.rowToJob(row);
    }

    /**
     * ジョブを完了としてマーク
     *
     * @param jobId - 完了するジョブのID
     */
    complete(jobId: number): void {
        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
            UPDATE ${this.tableName}
            SET status = 'completed', updated_at = ?
            WHERE id = ?
        `);
        const result = stmt.run(now, jobId);

        if (result.changes > 0) {
            this.logger?.info('Job completed', { jobId });
        } else {
            this.logger?.error('Failed to complete job: not found', { jobId });
        }
    }

    /**
     * ジョブを失敗としてマーク
     *
     * @param jobId - 失敗したジョブのID
     * @param error - エラーメッセージ
     * @param permanent - true の場合、リトライせずに即座に failed 状態にする
     */
    fail(jobId: number, error: string, permanent = false): void {
        const now = new Date().toISOString();
        const selectStmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`);
        const row = selectStmt.get(jobId) as JobRow | null;

        if (!row) {
            this.logger?.error('Failed to fail job: not found', { jobId });
            return;
        }

        const newRetryCount = permanent ? row.max_retries + 1 : row.retry_count + 1;

        if (newRetryCount > row.max_retries) {
            // 最大リトライ回数超過: failed 状態にする
            this.logger?.error('Job exceeded max retries', { jobId, error, retryCount: newRetryCount });

            const updateStmt = this.db.prepare(`
                UPDATE ${this.tableName}
                SET status = 'failed', retry_count = ?, error = ?, updated_at = ?
                WHERE id = ?
            `);
            updateStmt.run(newRetryCount, error, now, jobId);
        } else {
            // リトライ可能: pending に戻す
            this.logger?.info('Job failed, will retry', { jobId, error, retryCount: newRetryCount });

            const updateStmt = this.db.prepare(`
                UPDATE ${this.tableName}
                SET status = 'pending', retry_count = ?, error = ?, updated_at = ?
                WHERE id = ?
            `);
            updateStmt.run(newRetryCount, error, now, jobId);
        }
    }

    /**
     * 失敗したジョブをリトライ用にpendingに戻す
     *
     * @returns リトライしたジョブ数
     */
    retryFailed(): number {
        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
            UPDATE ${this.tableName}
            SET status = 'pending', updated_at = ?
            WHERE status = 'failed'
        `);
        const result = stmt.run(now);

        if (result.changes > 0) {
            this.logger?.info('Retried failed jobs', { count: result.changes });
        }

        return result.changes;
    }

    /**
     * 特定のジョブをリトライ（pendingに戻す）
     *
     * @param jobId - リトライするジョブのID
     * @returns リトライに成功した場合 true
     */
    retryJob(jobId: number): boolean {
        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
            UPDATE ${this.tableName}
            SET status = 'pending', retry_count = 0, error = NULL, updated_at = ?
            WHERE id = ? AND status = 'failed'
        `);
        const result = stmt.run(now, jobId);

        if (result.changes > 0) {
            this.logger?.info('Job retried', { jobId });
        }

        return result.changes > 0;
    }

    /**
     * キューの統計情報を取得
     *
     * @returns ステータスごとのジョブ数
     */
    getStats(): QueueStats {
        const stmt = this.db.prepare(`
            SELECT status, count(*) as count 
            FROM ${this.tableName} 
            GROUP BY status
        `);
        const rows = stmt.all() as Array<{ status: string; count: number }>;

        const stats: QueueStats = {
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0,
            total: 0,
        };

        for (const row of rows) {
            if (row.status in stats) {
                stats[row.status as keyof QueueStats] = row.count;
            }
            stats.total += row.count;
        }

        return stats;
    }

    /**
     * 失敗したジョブ（DLQ）の一覧を取得
     *
     * @param limit - 取得する最大件数（デフォルト: 100）
     * @returns 失敗したジョブの配列
     */
    getFailedJobs(limit = 100): Job<T>[] {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.tableName}
            WHERE status = 'failed'
            ORDER BY updated_at DESC
            LIMIT ?
        `);
        const rows = stmt.all(limit) as JobRow[];
        return rows.map((row) => this.rowToJob(row));
    }

    /**
     * キュー内のpending/processingジョブ数を取得
     *
     * @returns アクティブなジョブ数
     */
    size(): number {
        const stmt = this.db.prepare(`
            SELECT COUNT(*) as count FROM ${this.tableName}
            WHERE status IN ('pending', 'processing')
        `);
        const row = stmt.get() as { count: number };
        return row?.count ?? 0;
    }

    /**
     * 古い完了ジョブを削除
     *
     * @param olderThanHours - 削除対象の時間（デフォルト: 24時間）
     * @returns 削除したジョブ数
     */
    cleanupCompleted(olderThanHours = 24): number {
        const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();
        const stmt = this.db.prepare(`
            DELETE FROM ${this.tableName}
            WHERE status = 'completed' AND updated_at < ?
        `);
        const result = stmt.run(cutoff);

        if (result.changes > 0) {
            this.logger?.info('Cleaned up completed jobs', { count: result.changes, olderThanHours });
        }

        return result.changes;
    }

    /**
     * データベースをクリア（テスト用）
     *
     * @warning 本番環境では使用しないでください
     */
    clear(): void {
        this.db.exec(`DELETE FROM ${this.tableName}`);
        this.logger?.info('Queue cleared');
    }

    /**
     * データベース接続を閉じる
     */
    close(): void {
        this.db.close();
        this.logger?.info('Queue closed');
    }
}
