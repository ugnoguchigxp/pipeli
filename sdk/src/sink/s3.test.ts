import { describe, expect, it } from 'vitest';
import { S3Sink } from './s3.js';

describe('S3Sink', () => {
    it('基本設定でBento YAMLを生成する', () => {
        const sink = new S3Sink({
            bucket: 'my-bucket',
            path: 'data/${! timestamp_unix() }.json',
        });

        const bento = sink.toBento();

        expect(bento).toEqual({
            aws_s3: {
                bucket: 'my-bucket',
                path: 'data/${! timestamp_unix() }.json',
                region: 'us-east-1',
            },
        });
    });

    it('カスタムエンドポイント（MinIO等）を設定できる', () => {
        const sink = new S3Sink({
            bucket: 'local-bucket',
            path: 'data/file.json',
            endpoint: 'http://localhost:9000',
            credentials: {
                id: 'minioadmin',
                secret: 'minioadmin',
            },
        });

        const bento = sink.toBento();
        const s3Config = bento.aws_s3 as Record<string, unknown>;

        expect(s3Config.endpoint).toBe('http://localhost:9000');
        expect(s3Config.credentials).toEqual({
            id: 'minioadmin',
            secret: 'minioadmin',
        });
    });

    it('メタデータとタグを設定できる', () => {
        const sink = new S3Sink({
            bucket: 'my-bucket',
            path: 'data/file.json',
            metadata: {
                'x-custom-header': 'value',
            },
            tags: {
                environment: 'production',
            },
        });

        const bento = sink.toBento();
        const s3Config = bento.aws_s3 as Record<string, unknown>;

        expect(s3Config.metadata).toEqual({ 'x-custom-header': 'value' });
        expect(s3Config.tags).toEqual({ environment: 'production' });
    });

    it('バッチ処理を設定できる', () => {
        const sink = new S3Sink({
            bucket: 'my-bucket',
            path: 'data/batch.json',
            batching: {
                count: 100,
                period: '10s',
            },
        });

        const bento = sink.toBento();
        const s3Config = bento.aws_s3 as Record<string, unknown>;

        expect(s3Config.batching).toEqual({
            count: 100,
            period: '10s',
        });
    });

    it('ストレージクラスやコンテンツタイプを設定できる', () => {
        const sink = new S3Sink({
            bucket: 'my-bucket',
            path: 'data/file.json',
            contentType: 'application/json',
            storageClass: 'STANDARD_IA',
            credentials: {
                role: 'arn:aws:iam::123456789012:role/demo',
            },
            batching: {
                byteSize: 2048,
            },
        });

        const bento = sink.toBento();
        const s3Config = bento.aws_s3 as Record<string, unknown>;

        expect(s3Config.content_type).toBe('application/json');
        expect(s3Config.storage_class).toBe('STANDARD_IA');
        expect(s3Config.credentials).toEqual({
            role: 'arn:aws:iam::123456789012:role/demo',
        });
        expect(s3Config.batching).toEqual({
            byte_size: 2048,
        });
    });
});
