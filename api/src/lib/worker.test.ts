import { describe, expect, it } from 'bun:test';
import type { Job, SqliteQueue } from './queue';
import { WorkerManager } from './worker';

describe('WorkerManager', () => {
    it('completes job when handler succeeds', async () => {
        const job: Job = {
            id: 1,
            name: 'test',
            payload: {},
            status: 'pending',
            retryCount: 0,
            maxRetries: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        let dequeueCount = 0;
        const completed: number[] = [];

        const queue = {
            dequeue: () => {
                dequeueCount += 1;
                return dequeueCount === 1 ? job : null;
            },
            complete: (id: number) => completed.push(id),
            fail: () => {},
        } as unknown as SqliteQueue;

        const worker = new WorkerManager(queue, {
            concurrency: 1,
            intervalMs: 5,
            logger: { info: () => {}, error: () => {}, warn: () => {}, debug: () => {} },
        });

        await worker.start(async () => {});

        const waitForComplete = async () => {
            while (completed.length === 0) {
                await new Promise((resolve) => setTimeout(resolve, 5));
            }
        };

        await waitForComplete();
        worker.stop();

        expect(completed).toEqual([1]);
    });

    it('fails job when handler throws', async () => {
        const job: Job = {
            id: 2,
            name: 'test',
            payload: {},
            status: 'pending',
            retryCount: 0,
            maxRetries: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        let dequeueCount = 0;
        const failed: Array<{ id: number; error: string }> = [];

        const queue = {
            dequeue: () => {
                dequeueCount += 1;
                return dequeueCount === 1 ? job : null;
            },
            complete: () => {},
            fail: (id: number, error: string) => {
                failed.push({ id, error });
            },
        } as unknown as SqliteQueue;

        const worker = new WorkerManager(queue, {
            concurrency: 1,
            intervalMs: 5,
            logger: { info: () => {}, error: () => {}, warn: () => {}, debug: () => {} },
        });

        await worker.start(async () => {
            throw new Error('boom');
        });

        const waitForFail = async () => {
            while (failed.length === 0) {
                await new Promise((resolve) => setTimeout(resolve, 5));
            }
        };

        await waitForFail();
        worker.stop();

        expect(failed[0]).toEqual({ id: 2, error: 'boom' });
    });
});
