import { z } from 'zod';
import type { BentoComponent, BentoConfigObject } from '../types.js';

export const JsonRpcSourceConfigSchema = z.object({
    /** リッスンするアドレス (デフォルト: 0.0.0.0:8080) */
    address: z.string().optional().default('0.0.0.0:8080'),
    /** JSON-RPC エンドポイントのパス (デフォルト: /rpc) */
    path: z.string().startsWith('/').optional().default('/rpc'),
    /** 許可するメソッド名（指定しない場合は全て許可） */
    allowedMethods: z.array(z.string()).optional(),
    /** タイムアウト (デフォルト: 30s) */
    timeout: z.string().optional().default('30s'),
});

export type JsonRpcSourceConfig = z.infer<typeof JsonRpcSourceConfigSchema>;
export type JsonRpcSourceConfigInput = z.input<typeof JsonRpcSourceConfigSchema>;

/**
 * JSON-RPC Source
 *
 * JSON-RPC 2.0 リクエストを受信するためのHTTPソース。
 * リクエストボディの `method` と `params` を処理しやすい形で展開。
 *
 * JSON-RPC リクエスト形式:
 * ```json
 * {
 *   "jsonrpc": "2.0",
 *   "method": "createPatient",
 *   "params": { "id": "123", "name": "John" },
 *   "id": 1
 * }
 * ```
 *
 * @example
 * ```typescript
 * Source.jsonRpc({
 *     path: '/rpc',
 *     allowedMethods: ['createPatient', 'updatePatient'],
 * })
 * ```
 */
export class JsonRpcSource implements BentoComponent {
    private config: JsonRpcSourceConfig;

    constructor(config: JsonRpcSourceConfigInput = {}) {
        this.config = JsonRpcSourceConfigSchema.parse(config);
    }

    toBento(): BentoConfigObject {
        const processors: BentoConfigObject[] = [
            // JSON-RPC リクエストボディをパース
            { mapping: 'root = content().parse_json()' },
            // JSON-RPC 2.0 バージョンチェック
            {
                bloblang: 'if this.jsonrpc != "2.0" { throw("Invalid JSON-RPC version. Expected 2.0") }',
            },
        ];

        // メソッド名でフィルタリング
        if (this.config.allowedMethods && this.config.allowedMethods.length > 0) {
            const allowedMethods = this.config.allowedMethods.map((m) => `"${m}"`).join(', ');
            processors.push({
                bloblang: `if ![${allowedMethods}].contains(this.method) { throw("Method not allowed: " + this.method) }`,
            });
        }

        // paramsを展開してルートに配置（処理しやすくするため）
        // 元のリクエストIDとメソッド名も保持
        processors.push({
            mapping: `root = this.params
root._rpc_id = this.id
root._rpc_method = this.method`,
        });

        return {
            http_server: {
                address: this.config.address,
                path: this.config.path,
                allowed_verbs: ['POST'],
                timeout: this.config.timeout,
            },
            processors,
        };
    }
}
