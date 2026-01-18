import { BulkApiSource, type BulkApiSourceConfigInput } from './bulk.js';
import { GraphqlSource, type GraphqlSourceConfigInput } from './graphql.js';
import { HttpSource, type HttpSourceConfigInput } from './http.js';
import { JsonRpcSource, type JsonRpcSourceConfigInput } from './jsonrpc.js';
import { MllpSource, type MllpSourceConfigInput } from './mllp.js';
import { MySqlSource, type MySqlSourceConfigInput } from './mysql.js';
import { PostgresSource, type PostgresSourceConfigInput } from './postgres.js';
import { SftpSource, type SftpSourceConfigInput } from './sftp.js';
import {
    SocketClientSource,
    type SocketClientSourceConfigInput,
    SocketServerSource,
    type SocketServerSourceConfigInput,
} from './socket.js';
import { SqliteSource, type SqliteSourceConfigInput } from './sqlite.js';
import { SqliteQueueSource, type SqliteQueueSourceConfigInput } from './sqlite-queue.js';

export const Source = {
    /** HTTP Server ソース */
    http: (config: HttpSourceConfigInput) => new HttpSource(config),
    /** SFTP ファイル取得ソース */
    sftp: (config: SftpSourceConfigInput) => new SftpSource(config),
    /** MLLP (HL7) ソース */
    mllp: (config: MllpSourceConfigInput) => new MllpSource(config),
    /** GraphQL エンドポイント */
    graphql: (config: GraphqlSourceConfigInput = {}) => new GraphqlSource(config),
    /** JSON-RPC 2.0 エンドポイント */
    jsonRpc: (config: JsonRpcSourceConfigInput = {}) => new JsonRpcSource(config),
    /** Bulk API（バッチリクエスト → 個別メッセージ展開） */
    bulk: (config: BulkApiSourceConfigInput) => new BulkApiSource(config),
    /** TCP/UDP/Unix ソケットサーバー */
    socket: (config: SocketServerSourceConfigInput) => new SocketServerSource(config),
    /** TCP/Unix ソケットクライアント（サーバーに接続して受信） */
    socketClient: (config: SocketClientSourceConfigInput) => new SocketClientSource(config),
    /** SQLite Queue ソース（Bento連携用） */
    sqliteQueue: (config: SqliteQueueSourceConfigInput) => new SqliteQueueSource(config),
    /** PostgreSQL データベースソース */
    postgres: (config: PostgresSourceConfigInput) => new PostgresSource(config),
    /** MySQL データベースソース */
    mysql: (config: MySqlSourceConfigInput) => new MySqlSource(config),
    /** SQLite データベースソース */
    sqlite: (config: SqliteSourceConfigInput) => new SqliteSource(config),
};

export type { BulkApiSourceConfig, BulkApiSourceConfigInput } from './bulk.js';
export type { GraphqlSourceConfig, GraphqlSourceConfigInput } from './graphql.js';
// Re-export types
export type { HttpSourceConfig, HttpSourceConfigInput } from './http.js';
export type { JsonRpcSourceConfig, JsonRpcSourceConfigInput } from './jsonrpc.js';
export type { MllpSourceConfig, MllpSourceConfigInput } from './mllp.js';
export type { MySqlSourceConfig, MySqlSourceConfigInput } from './mysql.js';
export type { PostgresSourceConfig, PostgresSourceConfigInput } from './postgres.js';
export type { SftpSourceConfig, SftpSourceConfigInput } from './sftp.js';
export type {
    SocketClientSourceConfig,
    SocketClientSourceConfigInput,
    SocketServerSourceConfig,
    SocketServerSourceConfigInput,
} from './socket.js';
export type { SqliteSourceConfig, SqliteSourceConfigInput } from './sqlite.js';
export type { SqliteQueueSourceConfig, SqliteQueueSourceConfigInput } from './sqlite-queue.js';
