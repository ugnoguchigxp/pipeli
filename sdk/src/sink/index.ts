import type { MySqlTable } from 'drizzle-orm/mysql-core';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { AzureBlobSink, type AzureBlobSinkConfig } from './azure-blob.js';
import { FileSink, type FileSinkConfig, StdoutSink, type StdoutSinkConfig } from './file.js';
import { HttpSink, type HttpSinkConfig } from './http.js';
import { MongoDBSink, type MongoDBSinkConfig } from './mongodb.js';
import { MySqlSink, type MySqlSinkConfig } from './mysql.js';
import { PostgresSink, type PostgresSinkConfig } from './postgres.js';
import { S3Sink, type S3SinkConfig } from './s3.js';
import { SqliteSink, type SqliteSinkConfig } from './sqlite.js';

/**
 * Sinkファクトリ
 * 各種出力先を簡単に作成できるファクトリメソッドを提供
 */
export const Sink = {
    /**
     * PostgreSQL出力
     * Drizzleスキーマを使用してUPSERT/INSERTを生成
     */
    postgres: <T extends PgTable>(config: PostgresSinkConfig<T>) => new PostgresSink(config),

    /**
     * MySQL出力
     * Drizzleスキーマを使用してUPSERT/INSERTを生成
     */
    mysql: <T extends MySqlTable>(config: MySqlSinkConfig<T>) => new MySqlSink(config),

    /**
     * SQLite出力
     * Drizzleスキーマを使用してUPSERT/INSERTを生成
     */
    sqlite: <T extends SQLiteTable>(config: SqliteSinkConfig<T>) => new SqliteSink(config),

    /**
     * MongoDB出力
     * insert/update/upsert/delete操作に対応
     */
    mongodb: (config: MongoDBSinkConfig) => new MongoDBSink(config),

    /**
     * HTTP/REST API出力
     * 外部サービスへのWebhook、API呼び出しに使用
     */
    http: (config: HttpSinkConfig) => new HttpSink(config),

    /**
     * AWS S3出力
     * S3バケットへのオブジェクト保存 (MinIO等S3互換サービスにも対応)
     */
    s3: (config: S3SinkConfig) => new S3Sink(config),

    /**
     * Azure Blob Storage出力
     * Azure Blob Storageへのファイル保存
     */
    azureBlob: (config: AzureBlobSinkConfig) => new AzureBlobSink(config),

    /**
     * ファイル出力
     * ローカルファイルへの書き込み
     */
    file: (config: FileSinkConfig) => new FileSink(config),

    /**
     * 標準出力 (デバッグ用)
     * パイプラインのデバッグ時に便利
     */
    stdout: (config?: StdoutSinkConfig) => new StdoutSink(config),
};

export type { AzureBlobSinkConfig } from './azure-blob.js';
export { AzureBlobSink } from './azure-blob.js';
export type { FileSinkConfig, StdoutSinkConfig } from './file.js';
export { FileSink, StdoutSink } from './file.js';
export type { HttpSinkConfig } from './http.js';
export { HttpSink } from './http.js';
export type { MongoDBSinkConfig } from './mongodb.js';
export { MongoDBSink } from './mongodb.js';
export type { MySqlSinkConfig } from './mysql.js';
export { MySqlSink } from './mysql.js';
// 型エクスポート
export type { PostgresSinkConfig, RetryConfig } from './postgres.js';
// クラスエクスポート
export { PostgresSink } from './postgres.js';
export type { S3SinkConfig } from './s3.js';
export { S3Sink } from './s3.js';
export type { SqliteSinkConfig } from './sqlite.js';
export { SqliteSink } from './sqlite.js';
