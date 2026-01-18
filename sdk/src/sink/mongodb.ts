import { z } from 'zod';
import type { BentoComponent, BentoConfigObject } from '../types.js';

/**
 * MongoDB Sink設定スキーマ
 */
const MongoDBSinkConfigSchema = z.object({
    /** MongoDB接続URI (環境変数参照可能: ${MONGODB_URI}) */
    uri: z.string().default('${MONGODB_URI}'),
    /** データベース名 */
    database: z.string(),
    /** コレクション名 */
    collection: z.string(),
    /** 書き込みモード */
    operation: z.enum(['insert-one', 'update-one', 'upsert-one', 'delete-one']).default('insert-one'),
    /** Upsert時のフィルターマッピング (Bloblang) */
    filterMapping: z.string().optional(),
    /** ドキュメントマッピング (Bloblang) */
    documentMapping: z.string().default('root = this'),
    /** ライト確認レベル */
    writeConcern: z
        .object({
            w: z.union([z.number(), z.string()]).optional(),
            journal: z.boolean().optional(),
            wTimeout: z.string().optional(),
        })
        .optional(),
});

export type MongoDBSinkConfig = z.input<typeof MongoDBSinkConfigSchema>;

/**
 * MongoDB Sink
 * Bentoの mongodb output を使用
 */
export class MongoDBSink implements BentoComponent {
    private config: z.infer<typeof MongoDBSinkConfigSchema>;

    constructor(config: MongoDBSinkConfig) {
        this.config = MongoDBSinkConfigSchema.parse(config);
    }

    toBento(): BentoConfigObject {
        const output: Record<string, unknown> = {
            mongodb: {
                url: this.config.uri,
                database: this.config.database,
                collection: this.config.collection,
                operation: this.config.operation,
                document_map: this.config.documentMapping,
            },
        };

        const mongoConfig = output.mongodb as Record<string, unknown>;

        if (this.config.filterMapping) {
            mongoConfig.filter_map = this.config.filterMapping;
        }

        if (this.config.writeConcern) {
            const wc: Record<string, unknown> = {};
            if (this.config.writeConcern.w !== undefined) {
                wc.w = this.config.writeConcern.w;
            }
            if (this.config.writeConcern.journal !== undefined) {
                wc.j = this.config.writeConcern.journal;
            }
            if (this.config.writeConcern.wTimeout !== undefined) {
                wc.w_timeout = this.config.writeConcern.wTimeout;
            }
            mongoConfig.write_concern = wc;
        }

        return output;
    }
}
