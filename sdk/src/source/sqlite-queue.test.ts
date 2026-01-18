import { describe, expect, it } from 'vitest';
import { SqliteQueueSource } from './sqlite-queue.js';

describe('SqliteQueueSource', () => {
    describe('toBento', () => {
        it('正しいBento設定を生成する', () => {
            const source = new SqliteQueueSource({
                serverUrl: 'http://localhost:9090',
            });

            const bento = source.toBento();

            expect(bento).toEqual({
                http_client: {
                    url: 'http://localhost:9090/queue/dequeue',
                    verb: 'GET',
                    timeout: '30s',
                    rate_limit: '1s',
                    successful_on_codes: [200, 204],
                },
            });
        });

        it('カスタム設定を反映する', () => {
            const source = new SqliteQueueSource({
                serverUrl: 'http://queue-server:8080',
                basePath: '/jobs',
                pollInterval: '5s',
                timeout: '60s',
            });

            const bento = source.toBento();

            expect(bento).toEqual({
                http_client: {
                    url: 'http://queue-server:8080/jobs/dequeue',
                    verb: 'GET',
                    timeout: '60s',
                    rate_limit: '5s',
                    successful_on_codes: [200, 204],
                },
            });
        });

        it('無効なURLでエラーになる', () => {
            expect(() => {
                new SqliteQueueSource({
                    serverUrl: 'invalid-url',
                });
            }).toThrow();
        });
    });
});
