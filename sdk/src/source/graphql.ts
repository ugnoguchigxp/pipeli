import { z } from 'zod';
import type { BentoComponent, BentoConfigObject } from '../types.js';

export const GraphqlSourceConfigSchema = z.object({
    /** リッスンするアドレス (デフォルト: 0.0.0.0:8080) */
    address: z.string().optional().default('0.0.0.0:8080'),
    /** GraphQL エンドポイントのパス (デフォルト: /graphql) */
    path: z.string().startsWith('/').optional().default('/graphql'),
    /** 許可するオペレーション名（指定しない場合は全て許可） */
    allowedOperations: z.array(z.string()).optional(),
    /** タイムアウト (デフォルト: 30s) */
    timeout: z.string().optional().default('30s'),
});

export type GraphqlSourceConfig = z.infer<typeof GraphqlSourceConfigSchema>;
export type GraphqlSourceConfigInput = z.input<typeof GraphqlSourceConfigSchema>;

/**
 * GraphQL Source
 *
 * GraphQL mutations/queries を受信するためのHTTPソース。
 * 内部的には http_server を使用し、POSTメソッドのみを許可。
 * GraphQLのリクエストボディ（query, variables, operationName）を処理しやすい形で受け取れる。
 *
 * @example
 * ```typescript
 * Source.graphql({
 *     path: '/graphql',
 *     allowedOperations: ['CreatePatient', 'UpdatePatient'],
 * })
 * ```
 */
export class GraphqlSource implements BentoComponent {
    private config: GraphqlSourceConfig;

    constructor(config: GraphqlSourceConfigInput = {}) {
        this.config = GraphqlSourceConfigSchema.parse(config);
    }

    toBento(): BentoConfigObject {
        const processors: BentoConfigObject[] = [
            // GraphQL リクエストボディをパース
            { mapping: 'root = content().parse_json()' },
        ];

        // オペレーション名でフィルタリング
        if (this.config.allowedOperations && this.config.allowedOperations.length > 0) {
            const allowedOps = this.config.allowedOperations.map((op) => `"${op}"`).join(', ');
            processors.push({
                bloblang: `if ![${allowedOps}].contains(this.operationName) { throw("Operation not allowed: " + this.operationName) }`,
            });
        }

        // variablesを展開してルートに配置（処理しやすくするため）
        processors.push({
            mapping: `root = this.variables
root.operationName = this.operationName
root.query = this.query`,
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
