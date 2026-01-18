import { describe, expect, it } from 'vitest';
import { BulkApiSource } from './bulk.js';
import { GraphqlSource } from './graphql.js';
import { HttpSource } from './http.js';
import { Source } from './index.js';
import { JsonRpcSource } from './jsonrpc.js';
import { MllpSource } from './mllp.js';
import { MySqlSource } from './mysql.js';
import { PostgresSource } from './postgres.js';
import { SftpSource } from './sftp.js';
import { SocketClientSource, SocketServerSource } from './socket.js';
import { SqliteSource } from './sqlite.js';
import { SqliteQueueSource } from './sqlite-queue.js';

describe('Source factory', () => {
    it('creates each source type', () => {
        expect(Source.http({ path: '/api', methods: ['POST'] })).toBeInstanceOf(HttpSource);
        expect(Source.sftp({ host: 'example.com', user: 'user', path: '/in' })).toBeInstanceOf(SftpSource);
        expect(Source.mllp({})).toBeInstanceOf(MllpSource);
        expect(Source.graphql()).toBeInstanceOf(GraphqlSource);
        expect(Source.jsonRpc()).toBeInstanceOf(JsonRpcSource);
        expect(Source.bulk({ path: '/bulk' })).toBeInstanceOf(BulkApiSource);
        expect(Source.socket({ address: '0.0.0.0:4000' })).toBeInstanceOf(SocketServerSource);
        expect(Source.socketClient({ address: '127.0.0.1:4000' })).toBeInstanceOf(SocketClientSource);
        expect(Source.sqliteQueue({ serverUrl: 'http://localhost:9090' })).toBeInstanceOf(SqliteQueueSource);
        expect(Source.postgres({ query: 'select 1' })).toBeInstanceOf(PostgresSource);
        expect(Source.mysql({ query: 'select 1' })).toBeInstanceOf(MySqlSource);
        expect(Source.sqlite({ query: 'select 1' })).toBeInstanceOf(SqliteSource);
    });
});
