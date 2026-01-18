import { afterEach, describe, expect, it } from 'bun:test';
import { ConfigurationError } from './lib/errors';

const ENV_KEYS = [
    'PORT',
    'NODE_ENV',
    'QUEUE_DB_PATH',
    'QUEUE_MAX_RETRIES',
    'QUEUE_CONCURRENCY',
    'BATCH_SIZE',
    'CLEANUP_INTERVAL_MS',
    'CLEANUP_OLDER_THAN_HOURS',
    'LOG_LEVEL',
];

const ORIGINAL_ENV = { ...process.env };
let importCounter = 0;

function resetEnv() {
    for (const key of ENV_KEYS) {
        delete process.env[key];
    }
}

function restoreEnv() {
    process.env = { ...ORIGINAL_ENV };
}

function importConfig(tag: string) {
    importCounter += 1;
    return import(`./config.ts?${tag}-${importCounter}`);
}

afterEach(() => {
    resetEnv();
    restoreEnv();
});

describe('config', () => {
    it('uses defaults when env vars are missing', async () => {
        resetEnv();

        const { config } = await importConfig('defaults');

        expect(config.port).toBe(3001);
        expect(config.nodeEnv).toBe('development');
        expect(config.queueDbPath).toBe('./queue.db');
        expect(config.queueMaxRetries).toBe(4);
        expect(config.queueConcurrency).toBe(1);
        expect(config.batchSize).toBe(500);
        expect(config.cleanupIntervalMs).toBe(3600000);
        expect(config.cleanupOlderThanHours).toBe(24);
        expect(config.logLevel).toBe('info');
    });

    it('coerces env vars into typed config values', async () => {
        process.env.PORT = '4010';
        process.env.NODE_ENV = 'production';
        process.env.QUEUE_DB_PATH = './custom.db';
        process.env.QUEUE_MAX_RETRIES = '2';
        process.env.QUEUE_CONCURRENCY = '3';
        process.env.BATCH_SIZE = '250';
        process.env.CLEANUP_INTERVAL_MS = '5000';
        process.env.CLEANUP_OLDER_THAN_HOURS = '12';
        process.env.LOG_LEVEL = 'debug';

        const { config } = await importConfig('coerce');

        expect(config.port).toBe(4010);
        expect(config.nodeEnv).toBe('production');
        expect(config.queueDbPath).toBe('./custom.db');
        expect(config.queueMaxRetries).toBe(2);
        expect(config.queueConcurrency).toBe(3);
        expect(config.batchSize).toBe(250);
        expect(config.cleanupIntervalMs).toBe(5000);
        expect(config.cleanupOlderThanHours).toBe(12);
        expect(config.logLevel).toBe('debug');
    });

    it('throws ConfigurationError for invalid values', async () => {
        process.env.PORT = '0';

        await expect(importConfig('invalid')).rejects.toThrow(ConfigurationError);
    });
});
