import { describe, expect, it } from 'vitest';
import { PostgresSource } from './postgres.js';

describe('PostgresSource', () => {
    it('基本設定でBento YAMLを生成する', () => {
        const source = new PostgresSource({
            query: 'SELECT * FROM patients WHERE updated_at > now() - interval 1 hour',
        });

        const bento = source.toBento();

        expect(bento).toEqual({
            sql_raw: {
                driver: 'postgres',
                dsn: '${DATABASE_URL}',
                query: 'SELECT * FROM patients WHERE updated_at > now() - interval 1 hour',
            },
        });
    });

    it('カスタムDSNを設定できる', () => {
        const source = new PostgresSource({
            dsn: 'postgres://user:pass@localhost:5432/db',
            query: 'SELECT 1',
        });

        const bento = source.toBento();
        const sqlRaw = bento.sql_raw as Record<string, unknown>;

        expect(sqlRaw.dsn).toBe('postgres://user:pass@localhost:5432/db');
    });

    it('argsMapping を設定できる', () => {
        const source = new PostgresSource({
            query: 'SELECT * FROM patients WHERE id = ?',
            argsMapping: 'root = [this.patient_id]',
        });

        const bento = source.toBento();
        const sqlRaw = bento.sql_raw as Record<string, unknown>;

        expect(sqlRaw.args_mapping).toBe('root = [this.patient_id]');
    });

    it('initStatement を設定できる', () => {
        const source = new PostgresSource({
            query: 'SELECT 1',
            initStatement: 'SET statement_timeout = 5000',
        });

        const bento = source.toBento();
        const sqlRaw = bento.sql_raw as Record<string, unknown>;

        expect(sqlRaw.init_statement).toBe('SET statement_timeout = 5000');
    });

    it('ポーリングモードでgenerateを使用する', () => {
        const source = new PostgresSource({
            query: 'SELECT * FROM patients',
            pollInterval: '30s',
        });

        const bento = source.toBento();

        expect(bento).toHaveProperty('generate');
        expect(bento).toHaveProperty('processors');
        const generate = bento.generate as Record<string, unknown>;
        expect(generate.interval).toBe('30s');
    });
});
