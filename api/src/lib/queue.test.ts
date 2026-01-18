import { afterEach, describe, expect, it } from 'bun:test';
import { SqliteQueue } from './queue';

describe('SqliteQueue', () => {
    let queue: SqliteQueue<{ value: number }>;

    afterEach(() => {
        queue.close();
    });

    it('enqueue/dequeue should mark job as processing', () => {
        queue = new SqliteQueue({ dbPath: ':memory:' });
        const job = queue.enqueue('test', { value: 1 });

        const dequeued = queue.dequeue();

        expect(dequeued?.id).toBe(job.id);
        expect(dequeued?.status).toBe('processing');
        const stats = queue.getStats();
        expect(stats.processing).toBe(1);
    });

    it('fail should increment retry count and requeue', () => {
        queue = new SqliteQueue({ dbPath: ':memory:', maxRetries: 2 });
        const job = queue.enqueue('test', { value: 1 });

        queue.fail(job.id, 'err');
        const dequeued = queue.dequeue();

        expect(dequeued?.retryCount).toBe(1);
        expect(dequeued?.status).toBe('processing');
    });

    it('permanent fail should move job to failed', () => {
        queue = new SqliteQueue({ dbPath: ':memory:', maxRetries: 2 });
        const job = queue.enqueue('test', { value: 1 });

        queue.fail(job.id, 'err', true);
        const failed = queue.getFailedJobs();

        expect(failed).toHaveLength(1);
        expect(failed[0].id).toBe(job.id);
        expect(failed[0].status).toBe('failed');
    });

    it('retryJob should only allow failed jobs', () => {
        queue = new SqliteQueue({ dbPath: ':memory:', maxRetries: 2 });
        const job = queue.enqueue('test', { value: 1 });

        expect(queue.retryJob(job.id)).toBe(false);
        queue.fail(job.id, 'err', true);
        expect(queue.retryJob(job.id)).toBe(true);

        const dequeued = queue.dequeue();
        expect(dequeued?.retryCount).toBe(0);
    });

    it('retryFailed should return failed jobs to pending', () => {
        queue = new SqliteQueue({ dbPath: ':memory:', maxRetries: 1 });
        const job1 = queue.enqueue('test', { value: 1 });
        const job2 = queue.enqueue('test', { value: 2 });

        queue.fail(job1.id, 'err', true);
        queue.fail(job2.id, 'err', true);

        const retried = queue.retryFailed();
        expect(retried).toBe(2);
        const stats = queue.getStats();
        expect(stats.pending).toBe(2);
    });
});
