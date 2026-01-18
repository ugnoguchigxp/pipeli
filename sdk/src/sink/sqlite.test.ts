import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { describe, expect, it } from 'vitest';
import { SqliteSink } from './sqlite.js';

// テスト用スキーマ
const patients = sqliteTable('patients', {
    patient_id: text('patient_id').primaryKey(),
    name: text('name').notNull(),
    age: integer('age'),
    notes: text('notes'),
});

describe('SqliteSink', () => {
    it('INSERT モードでBento YAMLを生成する', () => {
        const sink = new SqliteSink({
            schema: patients,
            mode: 'insert',
            idempotencyKey: ['patient_id'],
            mapping: {
                patient_id: 'patient_id',
                name: 'name',
                age: 'age',
            },
        });

        const bento = sink.toBento();
        const retryConfig = bento.retry as Record<string, unknown>;
        const output = retryConfig.output as Record<string, unknown>;
        const sqlInsert = output.sql_insert as Record<string, unknown>;

        expect(sqlInsert.driver).toBe('sqlite');
        expect(sqlInsert.table).toBe('patients');
        expect(sqlInsert.columns).toEqual(['patient_id', 'name', 'age']);
    });

    it('UPSERT モードでON CONFLICT DO UPDATEを生成する', () => {
        const sink = new SqliteSink({
            schema: patients,
            mode: 'upsert',
            idempotencyKey: ['patient_id'],
            mapping: {
                patient_id: 'patient_id',
                name: 'name',
                age: 'age',
            },
        });

        const bento = sink.toBento();
        const retryConfig = bento.retry as Record<string, unknown>;
        const output = retryConfig.output as Record<string, unknown>;
        const sqlRaw = output.sql_raw as Record<string, unknown>;

        expect(sqlRaw.driver).toBe('sqlite');
        expect(sqlRaw.query).toContain('ON CONFLICT');
        expect(sqlRaw.query).toContain('DO UPDATE SET');
        expect(sqlRaw.query).toContain('EXCLUDED');
    });

    it('dbPathを設定できる', () => {
        const sink = new SqliteSink({
            schema: patients,
            mode: 'insert',
            idempotencyKey: ['patient_id'],
            mapping: { patient_id: 'patient_id' },
            dbPath: '/data/app.db',
        });

        const bento = sink.toBento();
        const retryConfig = bento.retry as Record<string, unknown>;
        const output = retryConfig.output as Record<string, unknown>;
        const sqlInsert = output.sql_insert as Record<string, unknown>;

        expect(sqlInsert.dsn).toBe('/data/app.db');
    });

    it('リトライを無効化できる', () => {
        const sink = new SqliteSink({
            schema: patients,
            mode: 'insert',
            idempotencyKey: ['patient_id'],
            mapping: { patient_id: 'patient_id' },
            retry: false,
        });

        const bento = sink.toBento();

        expect(bento).toHaveProperty('sql_insert');
        expect(bento).not.toHaveProperty('retry');
    });

    it('無効なidempotencyKeyでエラーになる', () => {
        expect(() => {
            new SqliteSink({
                schema: patients,
                mode: 'upsert',
                // @ts-expect-error 意図的に無効なキーを指定
                idempotencyKey: ['nonexistent'],
                mapping: { patient_id: 'patient_id' },
            });
        }).toThrow('Invalid idempotencyKey');
    });
});
