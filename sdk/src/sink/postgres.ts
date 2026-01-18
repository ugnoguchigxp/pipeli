import { getTableColumns } from 'drizzle-orm';
import { getTableConfig, type PgTable } from 'drizzle-orm/pg-core';
import type { BentoComponent, BentoConfigObject } from '../types.js';

/**
 * リトライ設定
 * Bento の retry output でラップする際の設定
 */
export interface RetryConfig {
    /** 最大リトライ回数 (デフォルト: 3) */
    maxRetries?: number;
    /** 初回リトライまでの待機時間 (デフォルト: "500ms") */
    initialInterval?: string;
    /** リトライ間隔の最大値 (デフォルト: "10s") */
    maxInterval?: string;
}

export interface PostgresSinkConfig<T extends PgTable> {
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
 * SQL識別子（テーブル名・カラム名）のバリデーション
 * SQLインジェクション対策として、安全な識別子のみを許可
 */
function sanitizeIdentifier(name: string): string {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
        throw new Error(`Invalid SQL identifier: ${name}. Only alphanumeric characters and underscores are allowed.`);
    }
    return name;
}

export class PostgresSink<T extends PgTable> implements BentoComponent {
    constructor(private config: PostgresSinkConfig<T>) {
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
     * 基本の出力設定を構築(リトライなし)
     */
    private buildBaseOutput(): BentoConfigObject {
        const { name: tableName } = getTableConfig(this.config.schema);
        const columns = getTableColumns(this.config.schema);

        // テーブル名のバリデーション
        const safeTableName = sanitizeIdentifier(tableName);

        // mapping で指定されたキーに対応する、DB側の物理カラム名を取得
        const physicalColumns = Object.keys(this.config.mapping).map((key) => {
            const col = columns[key as keyof typeof columns];
            // biome-ignore lint/suspicious/noExplicitAny: Drizzleの内部型にアクセスするため
            const colName = col ? (col as any).name : key;
            return sanitizeIdentifier(colName);
        });

        if (this.config.mode === 'upsert' && this.config.idempotencyKey.length > 0) {
            // UPSERT (ON CONFLICT) モード
            const conflictKeys = this.config.idempotencyKey.map((key) => {
                const col = columns[key as keyof typeof columns];
                // biome-ignore lint/suspicious/noExplicitAny: Drizzleの内部型にアクセスするため
                const colName = col ? (col as any).name : key;
                return sanitizeIdentifier(colName);
            });

            const updateLines = physicalColumns
                .filter((col) => !conflictKeys.includes(col))
                .map((col) => `${col} = EXCLUDED.${col} `);

            const query = `INSERT INTO ${safeTableName} (${physicalColumns.join(', ')})
VALUES (${physicalColumns.map(() => '?').join(', ')})
ON CONFLICT (${conflictKeys.join(', ')})
DO UPDATE SET ${updateLines.join(', ')};`;

            return {
                sql_raw: {
                    driver: 'postgres',
                    dsn: '${DATABASE_URL}',
                    query: query,
                    args_mapping: this.generateArgsMapping(),
                },
            };
        }

        // 通常の INSERT モード
        return {
            sql_insert: {
                driver: 'postgres',
                dsn: '${DATABASE_URL}',
                table: safeTableName,
                columns: physicalColumns,
                args_mapping: this.generateArgsMapping(),
            },
        };
    }

    /**
     * リトライ設定でラップする
     * - retry が false の場合はラップしない
     * - それ以外はデフォルト設定またはカスタム設定でラップ
     */
    private wrapWithRetry(output: BentoConfigObject): BentoConfigObject {
        // 明示的に false が指定された場合はリトライなし
        if (this.config.retry === false) {
            return output;
        }

        // デフォルト値を設定
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
            return `this.${key} `;
        });
        return `root = [\n  ${values.join(',\n  ')}\n]`;
    }
}

export const Sink = {
    postgres: <T extends PgTable>(config: PostgresSinkConfig<T>) => new PostgresSink(config),
};
