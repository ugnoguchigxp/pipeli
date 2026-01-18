import { describe, expect, it } from 'vitest';
import { MySqlSource } from './mysql.js';

describe('MySqlSource', () => {
    it('基本設定でBento YAMLを生成する', () => {
        const source = new MySqlSource({
            query: 'SELECT * FROM patients WHERE updated_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)',
        });

        const bento = source.toBento();

        expect(bento).toEqual({
            sql_raw: {
                driver: 'mysql',
                dsn: '${MYSQL_DSN}',
                query: 'SELECT * FROM patients WHERE updated_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)',
            },
        });
    });

    it('カスタムDSNを設定できる', () => {
        const source = new MySqlSource({
            dsn: 'user:pass@tcp(localhost:3306)/db',
            query: 'SELECT 1',
        });

        const bento = source.toBento();
        const sqlRaw = bento.sql_raw as Record<string, unknown>;

        expect(sqlRaw.dsn).toBe('user:pass@tcp(localhost:3306)/db');
    });

    it('ポーリングモードでgenerateを使用する', () => {
        const source = new MySqlSource({
            query: 'SELECT * FROM patients',
            pollInterval: '1m',
        });

        const bento = source.toBento();

        expect(bento).toHaveProperty('generate');
        const generate = bento.generate as Record<string, unknown>;
        expect(generate.interval).toBe('1m');
    });

    it('argsMappingとinitStatementを設定できる', () => {
        const source = new MySqlSource({
            query: 'SELECT * FROM patients WHERE id = ?',
            argsMapping: 'root = [this.id]',
            initStatement: 'SET SESSION sql_mode = ""',
        });

        const bento = source.toBento();
        const sqlRaw = bento.sql_raw as Record<string, unknown>;

        expect(sqlRaw.args_mapping).toBe('root = [this.id]');
        expect(sqlRaw.init_statement).toBe('SET SESSION sql_mode = ""');
    });
});
