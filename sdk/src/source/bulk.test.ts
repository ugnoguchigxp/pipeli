import { describe, expect, it } from 'vitest';
import { BulkApiSource } from './bulk.js';

describe('BulkApiSource', () => {
    it('should generate default configuration', () => {
        const source = new BulkApiSource({
            path: '/bulk',
        });
        const bento = source.toBento() as any;

        expect(bento.http_server).toBeDefined();
        expect(bento.http_server.path).toBe('/bulk');
        expect(bento.http_server.address).toBe('0.0.0.0:8080'); // デフォルト値
        expect(bento.http_server.timeout).toBe('60s'); // デフォルト値

        // プロセッサ確認
        expect(bento.processors).toHaveLength(4);
        // 1. Parse JSON
        expect(bento.processors[0].mapping).toContain('parse_json()');
        // 2. Batch Size Check
        expect(bento.processors[1].bloblang).toContain('this.items.length() > 1000');
        // 3. Extract Array
        expect(bento.processors[2].mapping).toContain('root = this.items');
        // 4. Unarchive
        expect(bento.processors[3].unarchive.format).toBe('json_array');
    });

    it('should configure custom settings', () => {
        const source = new BulkApiSource({
            path: '/api/batch',
            arrayField: 'records',
            maxBatchSize: 500,
            address: '0.0.0.0:3000',
            timeout: '120s',
        });
        const bento = source.toBento() as any;

        expect(bento.http_server.path).toBe('/api/batch');
        expect(bento.http_server.address).toBe('0.0.0.0:3000');
        expect(bento.http_server.timeout).toBe('120s');

        // バッチサイズチェック
        expect(bento.processors[1].bloblang).toContain('this.records.length() > 500');
        // 配列抽出
        expect(bento.processors[2].mapping).toContain('root = this.records');
    });

    it('should disable batch size check when maxBatchSize is 0', () => {
        const source = new BulkApiSource({
            path: '/bulk',
            maxBatchSize: 0,
        });
        const bento = source.toBento() as any;

        // 期待されるプロセッサ数: Parse(1) + Extract(1) + Unarchive(1) = 3
        expect(bento.processors).toHaveLength(3);
        // バッチサイズチェックが含まれていないこと
        expect(bento.processors.every((p: any) => !p.bloblang?.includes('length() >'))).toBe(true);
    });

    it('should throw error if path is missing or invalid', () => {
        expect(() => {
            new BulkApiSource({} as any);
        }).toThrow();

        expect(() => {
            new BulkApiSource({ path: 'invalid' } as any);
        }).toThrow();
    });
});
