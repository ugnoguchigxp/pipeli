import { describe, expect, it } from 'vitest';
import { JsonRpcSource } from './jsonrpc.js';

describe('JsonRpcSource', () => {
    it('should generate default configuration', () => {
        const source = new JsonRpcSource();
        const bento = source.toBento() as any;

        expect(bento.http_server).toBeDefined();
        expect(bento.http_server.address).toBe('0.0.0.0:8080');
        expect(bento.http_server.path).toBe('/rpc');
        expect(bento.http_server.allowed_verbs).toEqual(['POST']);

        // デフォルトプロセッサの確認
        expect(bento.processors).toHaveLength(3);
        // JSONパース
        expect(bento.processors[0].mapping).toContain('parse_json()');
        // バージョンチェック
        expect(bento.processors[1].bloblang).toContain('this.jsonrpc != "2.0"');
        // パラメータ展開
        expect(bento.processors[2].mapping).toContain('root = this.params');
        expect(bento.processors[2].mapping).toContain('root._rpc_id = this.id');
    });

    it('should configure custom settings', () => {
        const source = new JsonRpcSource({
            address: '127.0.0.1:4000',
            path: '/jsonrpc',
        });
        const bento = source.toBento() as any;

        expect(bento.http_server.address).toBe('127.0.0.1:4000');
        expect(bento.http_server.path).toBe('/jsonrpc');
    });

    it('should add allowed methods filter', () => {
        const source = new JsonRpcSource({
            allowedMethods: ['getUser', 'createUser'],
        });
        const bento = source.toBento() as any;

        expect(bento.processors).toHaveLength(4); // parse + version + filter + expand

        const filterProcessor = bento.processors[2];
        expect(filterProcessor.bloblang).toContain('["getUser", "createUser"].contains(this.method)');
        expect(filterProcessor.bloblang).toContain('throw("Method not allowed: " + this.method)');
    });

    it('should throw error for invalid path', () => {
        expect(() => {
            new JsonRpcSource({ path: 'no-slash' } as any);
        }).toThrow();
    });
});
