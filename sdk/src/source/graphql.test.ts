import { describe, expect, it } from 'vitest';
import { GraphqlSource } from './graphql.js';

describe('GraphqlSource', () => {
    it('should generate default configuration', () => {
        const source = new GraphqlSource();
        const bento = source.toBento() as any;

        expect(bento.http_server).toBeDefined();
        expect(bento.http_server.address).toBe('0.0.0.0:8080');
        expect(bento.http_server.path).toBe('/graphql');
        expect(bento.http_server.allowed_verbs).toEqual(['POST']);
        expect(bento.http_server.timeout).toBe('30s');

        // デフォルトプロセッサの確認
        expect(bento.processors).toHaveLength(2);
        // JSONパース
        expect(bento.processors[0].mapping).toContain('parse_json()');
        // 変数展開
        expect(bento.processors[1].mapping).toContain('root = this.variables');
    });

    it('should configure custom address and path', () => {
        const source = new GraphqlSource({
            address: '0.0.0.0:3000',
            path: '/api/gql',
            timeout: '60s',
        });
        const bento = source.toBento() as any;

        expect(bento.http_server.address).toBe('0.0.0.0:3000');
        expect(bento.http_server.path).toBe('/api/gql');
        expect(bento.http_server.timeout).toBe('60s');
    });

    it('should add allowed operations filter', () => {
        const source = new GraphqlSource({
            allowedOperations: ['QueryUser', 'MutationUpdate'],
        });
        const bento = source.toBento() as any;

        expect(bento.processors).toHaveLength(3); // parse + filter + expand

        // フィルタリングロジックの確認
        const filterProcessor = bento.processors[1];
        expect(filterProcessor.bloblang).toContain('["QueryUser", "MutationUpdate"].contains(this.operationName)');
        expect(filterProcessor.bloblang).toContain('throw("Operation not allowed: " + this.operationName)');
    });

    it('should validate configuration', () => {
        expect(() => {
            new GraphqlSource({
                path: 'invalid-path', // /で始まっていない
            } as any);
        }).toThrow();
    });
});
