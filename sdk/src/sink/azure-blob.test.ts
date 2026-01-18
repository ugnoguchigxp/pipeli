import { describe, expect, it } from 'vitest';
import { AzureBlobSink } from './azure-blob.js';

describe('AzureBlobSink', () => {
    it('基本設定でBento YAMLを生成する', () => {
        const sink = new AzureBlobSink({
            storageAccount: 'myaccount',
            container: 'mycontainer',
            path: 'data/${! timestamp_unix() }.json',
        });

        const bento = sink.toBento();

        expect(bento).toEqual({
            azure_blob_storage: {
                storage_account: 'myaccount',
                container: 'mycontainer',
                path: 'data/${! timestamp_unix() }.json',
                storage_connection_string: '${AZURE_STORAGE_CONNECTION_STRING}',
                blob_type: 'BLOCK',
            },
        });
    });

    it('アクセスキーを設定できる', () => {
        const sink = new AzureBlobSink({
            storageAccount: 'myaccount',
            container: 'mycontainer',
            path: 'file.json',
            storageAccessKey: '${AZURE_STORAGE_KEY}',
        });

        const bento = sink.toBento();
        const blobConfig = bento.azure_blob_storage as Record<string, unknown>;

        expect(blobConfig.storage_access_key).toBe('${AZURE_STORAGE_KEY}');
    });

    it('コンテンツタイプとメタデータを設定できる', () => {
        const sink = new AzureBlobSink({
            storageAccount: 'myaccount',
            container: 'mycontainer',
            path: 'file.json',
            contentType: 'application/json',
            metadata: {
                'x-ms-meta-custom': 'value',
            },
        });

        const bento = sink.toBento();
        const blobConfig = bento.azure_blob_storage as Record<string, unknown>;

        expect(blobConfig.content_type).toBe('application/json');
        expect(blobConfig.metadata).toEqual({ 'x-ms-meta-custom': 'value' });
    });

    it('Append Blobを設定できる', () => {
        const sink = new AzureBlobSink({
            storageAccount: 'myaccount',
            container: 'logs',
            path: 'app.log',
            blobType: 'APPEND',
        });

        const bento = sink.toBento();
        const blobConfig = bento.azure_blob_storage as Record<string, unknown>;

        expect(blobConfig.blob_type).toBe('APPEND');
    });

    it('追加オプションを設定できる', () => {
        const sink = new AzureBlobSink({
            storageAccount: 'myaccount',
            container: 'logs',
            path: 'app.log',
            storageConnectionString: 'UseDevelopmentStorage=true',
            contentEncoding: 'gzip',
            publicAccessLevel: 'BLOB',
            batching: {
                count: 10,
                byteSize: 1024,
                period: '5s',
            },
        });

        const bento = sink.toBento();
        const blobConfig = bento.azure_blob_storage as Record<string, unknown>;

        expect(blobConfig.storage_connection_string).toBe('UseDevelopmentStorage=true');
        expect(blobConfig.content_encoding).toBe('gzip');
        expect(blobConfig.public_access_level).toBe('BLOB');
        expect(blobConfig.batching).toEqual({
            count: 10,
            byte_size: 1024,
            period: '5s',
        });
    });
});
