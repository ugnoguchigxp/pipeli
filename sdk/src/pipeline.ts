import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import { z } from 'zod';
import type { Logger } from './runner.js';
import type { BentoComponent, BentoConfigObject } from './types.js';

// toBento() メソッドを持つオブジェクトをチェックするカスタムスキーマ
const BentoComponentSchema = z.custom<BentoComponent>((val) => val && typeof val === 'object' && 'toBento' in val);

/**
 * キュー設定スキーマ
 */
const QueueConfigSchema = z
    .object({
        /** キューサーバーのURL (デフォルト: http://localhost:9090) */
        serverUrl: z.string().url().optional().default('http://localhost:9090'),
        /** ベースパス (デフォルト: /queue) */
        basePath: z.string().optional().default('/queue'),
    })
    .optional();

export const PipelineConfigSchema = z.object({
    id: z.string().min(1),
    vendor: z.string().min(1),
    facility: z.string().min(1),
    domain: z.string().min(1),
    input: BentoComponentSchema,
    processors: z.array(BentoComponentSchema).default([]),
    output: BentoComponentSchema,
    /**
     * キュー設定
     * - true または {} : デフォルト設定でキュー連携を有効化
     * - false : キュー連携を無効化
     * - { serverUrl, basePath } : カスタム設定でキュー連携を有効化
     */
    queue: z.union([z.boolean(), QueueConfigSchema]).optional().default(true),
});

export type PipelineConfig = z.infer<typeof PipelineConfigSchema>;
export type PipelineConfigInput = z.input<typeof PipelineConfigSchema>;

export class Pipeline {
    private config: PipelineConfig;
    private logger: Logger;

    constructor(config: PipelineConfigInput, logger?: Logger) {
        this.config = PipelineConfigSchema.parse(config);
        this.logger = logger || { info: () => {}, error: () => {} }; // デフォルトは無視
    }

    /**
     * キュー連携用の後処理を生成
     */
    private buildQueuePostProcessor(): Record<string, unknown>[] {
        const queueConfig = this.config.queue;

        if (queueConfig === false) {
            return [];
        }

        const serverUrl = typeof queueConfig === 'object' ? queueConfig?.serverUrl : 'http://localhost:9090';
        const basePath = typeof queueConfig === 'object' ? queueConfig?.basePath : '/queue';

        return [
            {
                // 成功通知
                http: {
                    url: `${serverUrl}${basePath}/\${! json("id") }/complete`,
                    verb: 'POST',
                },
            },
        ];
    }

    /**
     * Bento YAML に変換する
     */
    toYaml(): string {
        const userProcessors = this.config.processors.flatMap((p) => p.toBento()) as Record<string, unknown>[];

        let allProcessors: Record<string, unknown>[];

        if (this.config.queue === false) {
            // キュー無効: ユーザー定義のprocessorsのみ
            allProcessors = userProcessors;
        } else {
            // キュー有効: 成功時の完了通知を追加
            allProcessors = [...userProcessors, ...this.buildQueuePostProcessor()];
        }

        const bentoConfig: BentoConfigObject = {
            input: this.config.input.toBento(),
            pipeline: {
                processors: allProcessors,
            },
            output: this.config.output.toBento(),
        };

        return yaml.dump(bentoConfig, {
            lineWidth: -1,
            noRefs: true,
        });
    }

    /**
     * YAML ファイルを出力する
     */
    synth(outputDir: string = './dist'): void {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const filename = `${this.config.id}.yaml`;
        const outputPath = path.join(outputDir, filename);
        const yamlContent = this.toYaml();

        fs.writeFileSync(outputPath, yamlContent, 'utf8');
        this.logger.info(`[SDK] Pipeline synthesized: ${outputPath}`);
    }
}
