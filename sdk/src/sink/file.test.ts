import { describe, expect, it } from 'vitest';
import { FileSink, StdoutSink } from './file.js';

describe('FileSink', () => {
    it('基本設定でBento YAMLを生成する', () => {
        const sink = new FileSink({
            path: '/tmp/output.json',
        });

        const bento = sink.toBento();

        expect(bento).toEqual({
            file: {
                path: '/tmp/output.json',
                codec: 'lines',
            },
        });
    });

    it('コーデックを設定できる', () => {
        const sink = new FileSink({
            path: '/tmp/output.csv',
            codec: 'delimited',
            delimiter: ',',
        });

        const bento = sink.toBento();
        const fileConfig = bento.file as Record<string, unknown>;

        expect(fileConfig.codec).toBe('delimited');
        expect(fileConfig.delim).toBe(',');
    });
});

describe('StdoutSink', () => {
    it('デフォルト設定でBento YAMLを生成する', () => {
        const sink = new StdoutSink();

        const bento = sink.toBento();

        expect(bento).toEqual({
            stdout: {
                codec: 'lines',
            },
        });
    });

    it('コーデックを設定できる', () => {
        const sink = new StdoutSink({
            codec: 'all-bytes',
        });

        const bento = sink.toBento();
        const stdoutConfig = bento.stdout as Record<string, unknown>;

        expect(stdoutConfig.codec).toBe('all-bytes');
    });

    it('区切り文字を設定できる', () => {
        const sink = new StdoutSink({
            codec: 'delimited',
            delimiter: '|',
        });

        const bento = sink.toBento();
        const stdoutConfig = bento.stdout as Record<string, unknown>;

        expect(stdoutConfig.delim).toBe('|');
    });
});
