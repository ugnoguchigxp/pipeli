import { z } from 'zod';
import type { BentoComponent, BentoConfigObject } from '../types.js';

/**
 * ファイル Sink設定スキーマ
 */
const FileSinkConfigSchema = z.object({
    /** 出力ファイルパス (Bloblang interpolation可能) */
    path: z.string(),
    /** コーデック (出力フォーマット) */
    codec: z.enum(['all-bytes', 'append', 'lines', 'delimited']).default('lines'),
    /** 区切り文字 (delimitedコーデック用) */
    delimiter: z.string().optional(),
});

export type FileSinkConfig = z.input<typeof FileSinkConfigSchema>;

/**
 * ファイル Sink
 * Bentoの file output を使用
 */
export class FileSink implements BentoComponent {
    private config: z.infer<typeof FileSinkConfigSchema>;

    constructor(config: FileSinkConfig) {
        this.config = FileSinkConfigSchema.parse(config);
    }

    toBento(): BentoConfigObject {
        const fileConfig: Record<string, unknown> = {
            path: this.config.path,
            codec: this.config.codec,
        };

        if (this.config.delimiter) {
            fileConfig.delim = this.config.delimiter;
        }

        return {
            file: fileConfig,
        };
    }
}

/**
 * Stdout Sink設定スキーマ
 */
const StdoutSinkConfigSchema = z.object({
    /** コーデック (出力フォーマット) */
    codec: z.enum(['all-bytes', 'lines', 'delimited']).default('lines'),
    /** 区切り文字 (delimitedコーデック用) */
    delimiter: z.string().optional(),
});

export type StdoutSinkConfig = z.input<typeof StdoutSinkConfigSchema>;

/**
 * Stdout Sink (デバッグ用)
 * Bentoの stdout output を使用
 */
export class StdoutSink implements BentoComponent {
    private config: z.infer<typeof StdoutSinkConfigSchema>;

    constructor(config: StdoutSinkConfig = {}) {
        this.config = StdoutSinkConfigSchema.parse(config);
    }

    toBento(): BentoConfigObject {
        const stdoutConfig: Record<string, unknown> = {
            codec: this.config.codec,
        };

        if (this.config.delimiter) {
            stdoutConfig.delim = this.config.delimiter;
        }

        return {
            stdout: stdoutConfig,
        };
    }
}
