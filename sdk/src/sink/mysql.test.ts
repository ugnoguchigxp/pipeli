import { int, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core';
import { describe, expect, it } from 'vitest';
import { MySqlSink } from './mysql.js';

// テスト用スキーマ
const patients = mysqlTable('patients', {
    patient_id: varchar('patient_id', { length: 255 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    age: int('age'),
    notes: text('notes'),
});

describe('MySqlSink', () => {
    it('INSERT モードでBento YAMLを生成する', () => {
        const sink = new MySqlSink({
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

        expect(sqlInsert.driver).toBe('mysql');
        expect(sqlInsert.table).toBe('patients');
        expect(sqlInsert.columns).toEqual(['patient_id', 'name', 'age']);
    });

    it('UPSERT モードでON DUPLICATE KEY UPDATEを生成する', () => {
        const sink = new MySqlSink({
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

        expect(sqlRaw.driver).toBe('mysql');
        expect(sqlRaw.query).toContain('ON DUPLICATE KEY UPDATE');
        expect(sqlRaw.query).toContain('patient_id = VALUES(patient_id)');
    });

    it('リトライを無効化できる', () => {
        const sink = new MySqlSink({
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
            new MySqlSink({
                schema: patients,
                mode: 'upsert',
                // @ts-expect-error 意図的に無効なキーを指定
                idempotencyKey: ['nonexistent'],
                mapping: { patient_id: 'patient_id' },
            });
        }).toThrow('Invalid idempotencyKey');
    });
});
