import { describe, expect, it } from 'vitest';
import { SqliteSource } from './sqlite.js';

describe('SqliteSource', () => {
    it('基本設定でBento YAMLを生成する', () => {
        const source = new SqliteSource({
            query: 'SELECT * FROM patients',
        });

        const bento = source.toBento();

        expect(bento).toEqual({
            sql_raw: {
                driver: 'sqlite',
                dsn: '${SQLITE_DB_PATH}',
                query: 'SELECT * FROM patients',
            },
        });
    });

    it('カスタムパスを設定できる', () => {
        const source = new SqliteSource({
            dsn: '/data/app.db',
            query: 'SELECT 1',
        });

        const bento = source.toBento();
        const sqlRaw = bento.sql_raw as Record<string, unknown>;

        expect(sqlRaw.dsn).toBe('/data/app.db');
    });

    it('ポーリングモードでgenerateを使用する', () => {
        const source = new SqliteSource({
            query: 'SELECT * FROM patients',
            pollInterval: '10s',
        });

        const bento = source.toBento();

        expect(bento).toHaveProperty('generate');
        const generate = bento.generate as Record<string, unknown>;
        expect(generate.interval).toBe('10s');
    });

    it('initStatementを設定できる', () => {
        const source = new SqliteSource({
            query: 'SELECT * FROM patients',
            initStatement: 'PRAGMA journal_mode=WAL',
        });

        const bento = source.toBento();
        const sqlRaw = bento.sql_raw as Record<string, unknown>;

        expect(sqlRaw.init_statement).toBe('PRAGMA journal_mode=WAL');
    });

    it('argsMappingを設定できる', () => {
        const source = new SqliteSource({
            query: 'SELECT * FROM patients WHERE id = ?',
            argsMapping: 'root = [this.patient_id]',
        });

        const bento = source.toBento();
        const sqlRaw = bento.sql_raw as Record<string, unknown>;

        expect(sqlRaw.args_mapping).toBe('root = [this.patient_id]');
    });
});
