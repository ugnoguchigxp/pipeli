import { describe, expect, it } from 'vitest';
import { HttpSink } from './http.js';

describe('HttpSink', () => {
    it('基本設定でBento YAMLを生成する', () => {
        const sink = new HttpSink({
            url: 'https://api.example.com/webhook',
        });

        const bento = sink.toBento();

        expect(bento).toEqual({
            http_client: {
                url: 'https://api.example.com/webhook',
                verb: 'POST',
                timeout: '30s',
            },
        });
    });

    it('ヘッダーとボディマッピングを設定できる', () => {
        const sink = new HttpSink({
            url: 'https://api.example.com/data',
            verb: 'PUT',
            headers: {
                'X-API-Key': '${API_KEY}',
                'Content-Type': 'application/json',
            },
            bodyMapping: 'root = this.payload',
        });

        const bento = sink.toBento();
        const httpConfig = bento.http_client as Record<string, unknown>;

        expect(httpConfig.verb).toBe('PUT');
        expect(httpConfig.headers).toEqual({
            'X-API-Key': '${API_KEY}',
            'Content-Type': 'application/json',
        });
        expect(httpConfig.body).toBe('root = this.payload');
    });

    it('Basic認証を設定できる', () => {
        const sink = new HttpSink({
            url: 'https://api.example.com/data',
            basicAuth: {
                username: 'user',
                password: '${PASSWORD}',
            },
        });

        const bento = sink.toBento();
        const httpConfig = bento.http_client as Record<string, unknown>;

        expect(httpConfig.basic_auth).toEqual({
            username: 'user',
            password: '${PASSWORD}',
        });
    });

    it('OAuth2を設定できる', () => {
        const sink = new HttpSink({
            url: 'https://api.example.com/data',
            oauth2: {
                clientKey: 'client_id',
                clientSecret: '${CLIENT_SECRET}',
                tokenUrl: 'https://auth.example.com/token',
                scopes: ['read', 'write'],
            },
        });

        const bento = sink.toBento();
        const httpConfig = bento.http_client as Record<string, unknown>;

        expect(httpConfig.oauth2).toEqual({
            enabled: true,
            client_key: 'client_id',
            client_secret: '${CLIENT_SECRET}',
            token_url: 'https://auth.example.com/token',
            scopes: ['read', 'write'],
        });
    });

    it('リトライ設定でラップできる', () => {
        const sink = new HttpSink({
            url: 'https://api.example.com/webhook',
            retry: {
                maxRetries: 5,
                initialInterval: '1s',
                maxInterval: '30s',
            },
        });

        const bento = sink.toBento();

        expect(bento).toHaveProperty('retry');
        const retryConfig = bento.retry as Record<string, unknown>;
        expect(retryConfig.max_retries).toBe(5);
        expect(retryConfig.output).toHaveProperty('http_client');
    });

    it('rateLimitとsuccessfulOnCodesを設定できる', () => {
        const sink = new HttpSink({
            url: 'https://api.example.com/data',
            rateLimit: '1s',
            successfulOnCodes: [200, 202],
        });

        const bento = sink.toBento();
        const httpConfig = bento.http_client as Record<string, unknown>;

        expect(httpConfig.rate_limit).toBe('1s');
        expect(httpConfig.successful_on_codes).toEqual([200, 202]);
    });

    it('OAuth2を無効化できる', () => {
        const sink = new HttpSink({
            url: 'https://api.example.com/data',
            oauth2: {
                enabled: false,
                clientKey: 'client_id',
                clientSecret: '${CLIENT_SECRET}',
                tokenUrl: 'https://auth.example.com/token',
            },
        });

        const bento = sink.toBento();
        const httpConfig = bento.http_client as Record<string, unknown>;

        expect(httpConfig.oauth2).toEqual({
            enabled: false,
            client_key: 'client_id',
            client_secret: '${CLIENT_SECRET}',
            token_url: 'https://auth.example.com/token',
        });
    });
});
