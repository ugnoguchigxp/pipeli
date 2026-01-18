import * as fs from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Pipeline } from './pipeline.js';

vi.mock('fs');

describe('Pipeline', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should generate valid bento YAML', () => {
        const mockInput = { toBento: () => ({ http_server: { path: '/test' } }) };
        const mockProcessor = { toBento: () => [{ mapping: 'root = this' }] };
        const mockOutput = { toBento: () => ({ stdout: {} }) };

        const pipeline = new Pipeline({
            id: 'test-pipeline',
            vendor: 'test-vendor',
            facility: 'test-facility',
            domain: 'test-domain',
            input: mockInput,
            processors: [mockProcessor],
            output: mockOutput,
        });

        const yaml = pipeline.toYaml();
        // ID は YAML 内容自体には含まれないため、構造のみ確認
        expect(yaml).toContain('http_server');
        expect(yaml).toContain('stdout');
    });

    it('should write YAML to file in synth', () => {
        const mockInput = { toBento: () => ({ http_server: {} }) };
        const mockOutput = { toBento: () => ({ stdout: {} }) };

        const pipeline = new Pipeline({
            id: 'test-synth',
            vendor: 'v',
            facility: 'f',
            domain: 'd',
            input: mockInput,
            output: mockOutput,
        });

        (fs.existsSync as any).mockReturnValue(false);

        pipeline.synth('./dist-test');

        expect(fs.mkdirSync).toHaveBeenCalled();
        expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should not call mkdirSync if directory exists', () => {
        const mockInput = { toBento: () => ({ http_server: {} }) };
        const mockOutput = { toBento: () => ({ stdout: {} }) };
        const pipeline = new Pipeline({
            id: 'test-synth-exists',
            vendor: 'v',
            facility: 'f',
            domain: 'd',
            input: mockInput,
            output: mockOutput,
        });

        (fs.existsSync as any).mockReturnValue(true);
        pipeline.synth('./dist-exists');
        expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    describe('queue integration', () => {
        const mockInput = { toBento: () => ({ http_server: { path: '/test' } }) };
        const mockProcessor = { toBento: () => [{ mapping: 'root = this' }] };
        const mockOutput = { toBento: () => ({ stdout: {} }) };

        it('デフォルトでキュー連携が有効になる', () => {
            const pipeline = new Pipeline({
                id: 'test-queue-default',
                vendor: 'v',
                facility: 'f',
                domain: 'd',
                input: mockInput,
                processors: [mockProcessor],
                output: mockOutput,
            });

            const yaml = pipeline.toYaml();
            expect(yaml).toContain('/complete');
            expect(yaml).toContain('http://localhost:9090');
        });

        it('queue: false でキュー連携を無効化できる', () => {
            const pipeline = new Pipeline({
                id: 'test-queue-disabled',
                vendor: 'v',
                facility: 'f',
                domain: 'd',
                input: mockInput,
                processors: [mockProcessor],
                output: mockOutput,
                queue: false,
            });

            const yaml = pipeline.toYaml();
            expect(yaml).not.toContain('/complete');
            expect(yaml).not.toContain('localhost:9090');
        });

        it('カスタムキューサーバーURLを設定できる', () => {
            const pipeline = new Pipeline({
                id: 'test-queue-custom',
                vendor: 'v',
                facility: 'f',
                domain: 'd',
                input: mockInput,
                processors: [mockProcessor],
                output: mockOutput,
                queue: {
                    serverUrl: 'http://queue.example.com:8080',
                    basePath: '/jobs',
                },
            });

            const yaml = pipeline.toYaml();
            expect(yaml).toContain('queue.example.com:8080');
            expect(yaml).toContain('/jobs');
        });

        it('queue: true でデフォルト設定が使われる', () => {
            const pipeline = new Pipeline({
                id: 'test-queue-true',
                vendor: 'v',
                facility: 'f',
                domain: 'd',
                input: mockInput,
                output: mockOutput,
                queue: true,
            });

            const yaml = pipeline.toYaml();
            expect(yaml).toContain('/complete');
        });
    });
});
