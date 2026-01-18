import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PipelineRunner } from './runner.js';

vi.mock('node:child_process', () => ({
    spawn: vi.fn(),
}));

vi.mock('node:fs', () => ({
    existsSync: vi.fn(),
}));

describe('PipelineRunner', () => {
    const logger = {
        info: vi.fn(),
        error: vi.fn(),
    };

    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('throws when config file is missing', async () => {
        (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);

        const runner = new PipelineRunner({
            distDir: '/tmp/dist',
            bentoPath: 'bento',
            env: { TEST: '1' },
            logger,
        });

        await expect(runner.run('pipeline')).rejects.toThrow('Pipeline config not found');
    });

    it('spawns bento and resolves on success', async () => {
        (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
        const emitter = new EventEmitter();
        (spawn as unknown as ReturnType<typeof vi.fn>).mockReturnValue(emitter);

        const runner = new PipelineRunner({
            distDir: '/tmp/dist',
            bentoPath: '/usr/bin/bento',
            env: { TEST: '1' },
            logger,
        });

        const runPromise = runner.run('pipeline.yaml');

        expect(spawn).toHaveBeenCalledWith(
            '/usr/bin/bento',
            ['-c', path.join(path.resolve('/tmp/dist'), 'pipeline.yaml')],
            { stdio: 'inherit', env: { TEST: '1' } },
        );

        emitter.emit('close', 0);
        await expect(runPromise).resolves.toBe(0);
    });

    it('rejects when bento exits with error', async () => {
        (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
        const emitter = new EventEmitter();
        (spawn as unknown as ReturnType<typeof vi.fn>).mockReturnValue(emitter);

        const runner = new PipelineRunner({
            distDir: '/tmp/dist',
            bentoPath: 'bento',
            env: {},
            logger,
        });

        const runPromise = runner.run('pipeline');
        emitter.emit('close', 2);

        await expect(runPromise).rejects.toThrow('Pipeline failed with code 2');
        expect(logger.error).toHaveBeenCalled();
    });

    it('rejects when bento fails to start', async () => {
        (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
        const emitter = new EventEmitter();
        (spawn as unknown as ReturnType<typeof vi.fn>).mockReturnValue(emitter);

        const runner = new PipelineRunner({
            distDir: '/tmp/dist',
            bentoPath: 'bento',
            env: {},
            logger,
        });

        const runPromise = runner.run('pipeline');
        emitter.emit('error', new Error('spawn failed'));

        await expect(runPromise).rejects.toThrow('spawn failed');
        expect(logger.error).toHaveBeenCalled();
    });
});
