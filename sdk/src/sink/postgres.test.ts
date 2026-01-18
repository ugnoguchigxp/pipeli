import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { PostgresSink } from './postgres.js';

// テスト用スキーマ
const testTable = pgTable('test_table', {
    id: text('id').primaryKey(),
    data: text('data_content'),
    updatedAt: timestamp('updated_at'),
});

describe('PostgresSink', () => {
    it('should generate sql_insert wrapped with retry for insert mode', () => {
        const sink = new PostgresSink({
            schema: testTable,
            mode: 'insert',
            idempotencyKey: [],
            mapping: {
                id: 'this.id',
                data: { literal: 'literal-val' },
            },
        });

        const bento = sink.toBento() as any;

        // デフォルトでリトライでラップされている
        expect(bento.retry).toBeDefined();
        expect(bento.retry.max_retries).toBe(3);
        expect(bento.retry.initial_interval).toBe('500ms');
        expect(bento.retry.max_interval).toBe('10s');

        // 内部の出力設定
        const output = bento.retry.output;
        expect(output.sql_insert).toBeDefined();
        expect(output.sql_insert.table).toBe('test_table');
        expect(output.sql_insert.columns).toEqual(['id', 'data_content']);
        expect(output.sql_insert.args_mapping).toContain('this.id');
        expect(output.sql_insert.args_mapping).toContain('"literal-val"');
    });

    it('should generate sql_raw wrapped with retry for upsert mode', () => {
        const sink = new PostgresSink({
            schema: testTable,
            mode: 'upsert',
            idempotencyKey: ['id'],
            mapping: {
                id: 'this.id',
                data: 'this.val',
            },
        });

        const bento = sink.toBento() as any;

        // デフォルトでリトライでラップされている
        expect(bento.retry).toBeDefined();
        expect(bento.retry.max_retries).toBe(3);

        // 内部の出力設定
        const output = bento.retry.output;
        expect(output.sql_raw).toBeDefined();
        expect(output.sql_raw.query).toContain('INSERT INTO test_table');
        expect(output.sql_raw.query).toContain('ON CONFLICT (id)');
        expect(output.sql_raw.query).toContain('DO UPDATE SET data_content = EXCLUDED.data_content');
    });

    it('should throw error for invalid idempotencyKey', () => {
        expect(() => {
            new PostgresSink({
                schema: testTable,
                mode: 'upsert',
                idempotencyKey: ['invalid_col' as any],
                mapping: { id: 'this.id' },
            });
        }).toThrow('Invalid idempotencyKey');
    });

    it('should handle missing columns in schema for mapping and idempotencyKey', () => {
        const sink = new PostgresSink({
            schema: testTable,
            mode: 'upsert',
            idempotencyKey: ['id'],
            mapping: {
                id: 'this.id',
                ['extra_col' as any]: 'this.extra',
            },
        });
        const bento = sink.toBento() as any;
        expect(bento.retry.output.sql_raw.query).toContain('extra_col');
    });

    it('should not wrap with retry when retry: false', () => {
        const sink = new PostgresSink({
            schema: testTable,
            mode: 'insert',
            idempotencyKey: [],
            mapping: {
                id: 'this.id',
            },
            retry: false,
        });

        const bento = sink.toBento() as any;

        // リトライなし、直接sql_insertが出力される
        expect(bento.retry).toBeUndefined();
        expect(bento.sql_insert).toBeDefined();
        expect(bento.sql_insert.table).toBe('test_table');
    });

    it('should allow custom retry configuration', () => {
        const sink = new PostgresSink({
            schema: testTable,
            mode: 'insert',
            idempotencyKey: [],
            mapping: {
                id: 'this.id',
            },
            retry: {
                maxRetries: 5,
                initialInterval: '1s',
                maxInterval: '30s',
            },
        });

        const bento = sink.toBento() as any;

        expect(bento.retry).toBeDefined();
        expect(bento.retry.max_retries).toBe(5);
        expect(bento.retry.initial_interval).toBe('1s');
        expect(bento.retry.max_interval).toBe('30s');
    });
});
