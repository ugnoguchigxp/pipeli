import { getTableColumns } from 'drizzle-orm';
import { getTableConfig, type MySqlTable } from 'drizzle-orm/mysql-core';
import type { BentoComponent, BentoConfigObject } from '../types.js';
import type { RetryConfig } from './postgres.js';

export interface MySqlSinkConfig<T extends MySqlTable> {
    schema: T;
    mode: 'upsert' | 'insert';
    idempotencyKey: (keyof T['_']['columns'])[];
    mapping: {
        [K in keyof T['_']['columns']]?: string | { literal: string | number | boolean };
    };
    /**
     * リトライ設定
     * - 未指定: デフォルト設定でリトライ有効 (3回, 500ms〜10s)
     * - オブジェクト指定: カスタム設定でリトライ有効
     * - false: リトライ無効
     */
    retry?: RetryConfig | false;
}

/**
 * MySQL Sink
 * Drizzle MySqlTableスキーマからBento sql_raw/sql_insert設定を生成
 */
export class MySqlSink<T extends MySqlTable> implements BentoComponent {
    constructor(private config: MySqlSinkConfig<T>) {
        const columns = getTableColumns(this.config.schema);
        for (const key of this.config.idempotencyKey) {
            if (!(key in columns)) {
                throw new Error(`Invalid idempotencyKey: ${String(key)} does not exist in the table.`);
            }
        }
    }

    toBento(): BentoConfigObject {
        const baseOutput = this.buildBaseOutput();
        return this.wrapWithRetry(baseOutput);
    }

    /**
     * 基本の出力設定を構築（リトライなし）
     */
    private buildBaseOutput(): BentoConfigObject {
        const { name: tableName } = getTableConfig(this.config.schema);
        const columns = getTableColumns(this.config.schema);

        // mapping で指定されたキーに対応する、DB側の物理カラム名を取得
        const physicalColumns = Object.keys(this.config.mapping).map((key) => {
            const col = columns[key as keyof typeof columns];
            // biome-ignore lint/suspicious/noExplicitAny: Drizzleの内部型にアクセスするため
            return col ? (col as any).name : key;
        });

        if (this.config.mode === 'upsert' && this.config.idempotencyKey.length > 0) {
            // UPSERT (ON DUPLICATE KEY UPDATE) モード
            const updateLines = physicalColumns.map((col) => `${col} = VALUES(${col})`);

            const query = `INSERT INTO ${tableName} (${physicalColumns.join(', ')})
VALUES (${physicalColumns.map(() => '?').join(', ')})
ON DUPLICATE KEY UPDATE ${updateLines.join(', ')};`;

            return {
                sql_raw: {
                    driver: 'mysql',
                    dsn: '${MYSQL_DSN}',
                    query: query,
                    args_mapping: this.generateArgsMapping(),
                },
            };
        }

        // 通常の INSERT モード
        return {
            sql_insert: {
                driver: 'mysql',
                dsn: '${MYSQL_DSN}',
                table: tableName,
                columns: physicalColumns,
                args_mapping: this.generateArgsMapping(),
            },
        };
    }

    /**
     * リトライ設定でラップする
     */
    private wrapWithRetry(output: BentoConfigObject): BentoConfigObject {
        if (this.config.retry === false) {
            return output;
        }

        const retryConfig = this.config.retry ?? {};
        const maxRetries = retryConfig.maxRetries ?? 3;
        const initialInterval = retryConfig.initialInterval ?? '500ms';
        const maxInterval = retryConfig.maxInterval ?? '10s';

        return {
            retry: {
                max_retries: maxRetries,
                initial_interval: initialInterval,
                max_interval: maxInterval,
                output: output,
            },
        };
    }

    private generateArgsMapping(): string {
        const values = Object.entries(this.config.mapping).map(([key, value]) => {
            if (typeof value === 'object' && 'literal' in value) {
                return JSON.stringify(value.literal);
            }
            return `this.${key}`;
        });
        return `root = [\n  ${values.join(',\n  ')}\n]`;
    }
}
