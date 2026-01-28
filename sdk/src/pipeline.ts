import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import { z } from 'zod';
import type { Logger } from './runner.js';
import type { BentoComponent, BentoConfigObject } from './types.js';

// toBento() メソッドを持つオブジェクトをチェックするカスタムスキーマ
const BentoComponentSchema = z.custom<BentoComponent>((val: any) => val && typeof val === 'object' && 'toBento' in val);

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

/**
 * DLQ設定スキーマ
 */
const DLQConfigSchema = z.object({
    type: z.enum(['file', 'sqlite', 'http']).default('file'),
    path: z.string().optional(), // file or sqlite
    url: z.string().url().optional(), // http
}).optional().refine(
    (data: { type: 'file' | 'sqlite' | 'http'; path?: string; url?: string } | undefined) => {
        if (!data) return true;
        if (data.type === 'sqlite' && !data.path) return true; // デフォルトパスを使用
        if (data.type === 'file' && !data.path) return true; // デフォルトパスを使用
        if (data.type === 'http' && !data.url) return false; // HTTPの場合はURLが必須
        return true;
    },
    { message: 'HTTP DLQ requires a url' }
);

/**
 * メトリクス設定
 */
const MetricsConfigSchema = z.object({
    enabled: z.boolean().default(true),
    prometheus: z.boolean().default(true),
}).optional();

/**
 * Jaegerトレース設定
 */
const JaegerConfigSchema = z.object({
    agentAddress: z.string().default('localhost:6831'),
    samplerType: z.enum(['const', 'probabilistic', 'rateLimiting']).default('const'),
    samplerParam: z.number().default(1),
    flushInterval: z.string().default('1s'),
}).optional();

/**
 * OTLP (OpenTelemetry Collector) 設定
 */
const OTLPConfigSchema = z.object({
    endpoint: z.string().default('localhost:4317'),
    insecure: z.boolean().default(true),
    headers: z.record(z.string()).optional(),
}).optional();

/**
 * トレース設定スキーマ
 */
const TracingConfigSchema = z.object({
    enabled: z.boolean().default(false),
    type: z.enum(['none', 'jaeger', 'otlp']).default('none'),
    jaeger: JaegerConfigSchema,
    otlp: OTLPConfigSchema,
}).optional();

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
     */
    queue: z.union([z.boolean(), QueueConfigSchema]).optional().default(true),
    /**
     * デッドレターキュー (DLQ) 設定
     */
    dlq: DLQConfigSchema,
    /**
     * メトリクス設定
     */
    metrics: MetricsConfigSchema,
    /**
     * トレース設定 (Jaeger / OTLP)
     */
    tracing: TracingConfigSchema,
});

export type PipelineConfig = z.infer<typeof PipelineConfigSchema>;
export type PipelineConfigInput = z.input<typeof PipelineConfigSchema>;

export class Pipeline {
    private config: PipelineConfig;
    private logger: Logger;

    constructor(config: PipelineConfigInput, logger?: Logger) {
        this.config = PipelineConfigSchema.parse(config);
        this.logger = logger || { info: () => { }, error: () => { } }; // デフォルトは無視
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
     * メトリクス設定を生成
     */
    private buildMetricsConfig(): Record<string, unknown> {
        if (!this.config.metrics?.enabled) {
            return {};
        }

        return {
            metrics: {
                prometheus: {},
                mapping: `
                    root = this
                    root.pipeline_id = "${this.config.id}"
                    root.vendor = "${this.config.vendor}"
                    root.facility = "${this.config.facility}"
                `,
            },
        };
    }

    /**
     * トレース設定を生成 (Jaeger / OTLP)
     */
    private buildTracerConfig(): Record<string, unknown> {
        const tracing = this.config.tracing;
        if (!tracing?.enabled) {
            return {};
        }

        const baseAttributes = {
            pipeline_id: this.config.id,
            vendor: this.config.vendor,
            facility: this.config.facility,
            domain: this.config.domain,
        };

        if (tracing.type === 'jaeger') {
            return {
                tracer: {
                    jaeger: {
                        agent_address: tracing.jaeger?.agentAddress || 'localhost:6831',
                        service_name: `pipeli-${this.config.id}`,
                        sampler_type: tracing.jaeger?.samplerType || 'const',
                        sampler_param: tracing.jaeger?.samplerParam ?? 1,
                        flush_interval: tracing.jaeger?.flushInterval || '1s',
                        tags: baseAttributes,
                    },
                },
            };
        }

        if (tracing.type === 'otlp') {
            return {
                tracer: {
                    open_telemetry_collector: {
                        grpc: [{
                            address: tracing.otlp?.endpoint || 'localhost:4317',
                            insecure: tracing.otlp?.insecure ?? true,
                        }],
                        tags: baseAttributes,
                    },
                },
            };
        }

        return { tracer: { none: {} } };
    }

    /**
     * オブザーバビリティ設定をマージして返す
     */
    private buildObservabilityConfig(): Record<string, unknown> {
        return {
            ...this.buildMetricsConfig(),
            ...this.buildTracerConfig(),
        };
    }

    /**
     * DLQ処理を含むプロセッサを構築
     */
    private buildProcessors(): Record<string, unknown>[] {
        const userProcessors = this.config.processors.flatMap((p: BentoComponent) => p.toBento()) as Record<string, unknown>[];

        if (!this.config.dlq) {
            return userProcessors;
        }

        // DLQが有効な場合、全体の処理を catch で囲む
        const dlqAction = this.buildDlqAction();

        return [
            {
                try: userProcessors,
            },
            {
                catch: [dlqAction],
            }
        ];
    }

    private buildDlqAction(): Record<string, unknown> {
        const dlq = this.config.dlq;

        if (dlq?.type === 'sqlite') {
            return {
                sql_insert: {
                    driver: "sqlite",
                    dsn: dlq.path || "./dlq.db",
                    table: "dlq",
                    columns: ["id", "pipeline_id", "vendor", "facility", "content", "error", "error_msg", "created_at"],
                    args_mapping: `root = [
                        uuid_v4(),
                        "${this.config.id}",
                        "${this.config.vendor}",
                        "${this.config.facility}",
                        content().string(),
                        error(),
                        error().string(),
                        now()
                    ]`,
                    init_statement: `
                        CREATE TABLE IF NOT EXISTS dlq (
                            id TEXT PRIMARY KEY,
                            pipeline_id TEXT NOT NULL,
                            vendor TEXT NOT NULL,
                            facility TEXT NOT NULL,
                            content TEXT NOT NULL,
                            error TEXT,
                            error_msg TEXT,
                            created_at TEXT NOT NULL
                        );
                        CREATE INDEX IF NOT EXISTS idx_dlq_pipeline ON dlq(pipeline_id);
                        CREATE INDEX IF NOT EXISTS idx_dlq_created ON dlq(created_at);
                    `,
                }
            };
        }

        if (dlq?.type === 'http') {
            return {
                http: {
                    url: dlq.url!,
                    verb: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: `{
                        "pipeline_id": "${this.config.id}",
                        "vendor": "${this.config.vendor}",
                        "facility": "${this.config.facility}",
                        "content": \${! content().string() },
                        "error": \${! error().string() },
                        "timestamp": \${! now() }
                    }`,
                }
            };
        }

        // デフォルトはファイル
        const basePath = dlq?.path || `./dlq/${this.config.id}`;
        return {
            file: {
                path: `${basePath}/\${!timestamp_unix()}_\${!count("dlq")}.json`,
                codec: "lines",
            },
            processors: [
                {
                    mapping: `
                        root.id = uuid_v4()
                        root.pipeline_id = "${this.config.id}"
                        root.vendor = "${this.config.vendor}"
                        root.facility = "${this.config.facility}"
                        root.content = content().string()
                        root.error = error().string()
                        root.timestamp = now()
                    `,
                }
            ],
        };
    }

    /**
     * Bento YAML に変換する
     */
    toYaml(): string {
        const allProcessors = this.buildProcessors();

        if (this.config.queue !== false) {
            allProcessors.push(...this.buildQueuePostProcessor());
        }

        const bentoConfig: BentoConfigObject = {
            ...this.buildObservabilityConfig(),
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

/**
 * 標準パイプライン設定スキーマ
 * "validate → normalize → map → sink" の流れを強制する
 */
export const StandardPipelineConfigSchema = PipelineConfigSchema.extend({
    validate: z.array(BentoComponentSchema).default([]),
    normalize: z.array(BentoComponentSchema).default([]),
    map: z.array(BentoComponentSchema).default([]),
}).omit({ processors: true });

export type StandardPipelineConfigInput = z.input<typeof StandardPipelineConfigSchema>;

/**
 * 標準パイプライン
 * 
 * データ処理の事故率を下げるため、以下の順序で処理を強制します:
 * 
 * 1. **validate**: 入力データの構文・スキーマ検証
 *    - HL7メッセージの構文チェック
 *    - 必須フィールドの存在確認
 *    - データ型の検証
 * 
 * 2. **normalize**: 共通中間フォーマットへの変換
 *    - HL7 → JSON変換
 *    - 固定長 → JSON変換
 *    - タイムスタンプの正規化
 * 
 * 3. **map**: プロファイルベースのマッピング適用
 *    - ベンダー固有フィールドの抽出
 *    - 標準フォーマットへの変換
 *    - エンリッチメント（メタデータ追加）
 * 
 * @example
 * ```typescript
 * const pipeline = new StandardPipeline({
 *     id: 'vendor-a-adt',
 *     vendor: 'vendor-a',
 *     facility: 'hospital-001',
 *     domain: 'patient',
 *     input: mllpInput,
 *     validate: [hl7Validator],
 *     normalize: [hl7Normalizer],
 *     map: [profileMapper],
 *     output: httpOutput,
 * });
 * ```
 */

export class StandardPipeline extends Pipeline {
    constructor(config: StandardPipelineConfigInput, logger?: Logger) {
        const { validate, normalize, map, ...rest } = StandardPipelineConfigSchema.parse(config);

        // 警告: 空のステージ
        if (validate.length === 0) {
            console.warn('[StandardPipeline] Warning: validate stage is empty - consider adding validation');
        }
        if (normalize.length === 0) {
            console.warn('[StandardPipeline] Warning: normalize stage is empty - consider adding normalization');
        }
        if (map.length === 0) {
            console.warn('[StandardPipeline] Warning: map stage is empty - consider adding mapping');
        }

        // processors に順番通りに詰め込む
        const processors = [
            ...validate,
            ...normalize,
            ...map,
        ];

        super({ ...rest, processors }, logger);
    }
}
