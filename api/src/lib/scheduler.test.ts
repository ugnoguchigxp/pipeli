import { describe, expect, it } from 'bun:test';
import type { SqliteQueue } from './queue';
import { Scheduler } from './scheduler';

describe('Scheduler', () => {
    it('runs cleanup on interval', async () => {
        let cleanupCount = 0;
        const queue = {
            cleanupCompleted: () => {
                cleanupCount += 1;
                return 1;
            },
        } as unknown as SqliteQueue;

        const scheduler = new Scheduler(queue, {
            cleanupIntervalMs: 10,
            cleanupOlderThanHours: 1,
            logger: { info: () => {}, error: () => {}, warn: () => {}, debug: () => {} },
        });

        scheduler.start();
        await new Promise((resolve) => setTimeout(resolve, 30));
        scheduler.stop();

        expect(cleanupCount).toBeGreaterThan(0);
    });
});
