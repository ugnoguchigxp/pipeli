import { describe, expect, it } from 'vitest';
import { HttpSource } from './http.js';

describe('HttpSource', () => {
    it('should generate valid bento config with default values', () => {
        const source = new HttpSource({
            path: '/api/test',
            methods: ['POST'],
        });

        const bento = source.toBento() as any;
        expect(bento.http_server.address).toBe('0.0.0.0:8080');
        expect(bento.http_server.path).toBe('/api/test');
        expect(bento.http_server.allowed_verbs).toContain('POST');
        expect(bento.http_server.timeout).toBe('30s');
    });

    it('should override default values', () => {
        const source = new HttpSource({
            address: '127.0.0.1:9090',
            path: '/api/v1',
            methods: ['GET', 'POST'],
            timeout: '60s',
        });

        const bento = source.toBento() as any;
        expect(bento.http_server.address).toBe('127.0.0.1:9090');
        expect(bento.http_server.timeout).toBe('60s');
    });
});
