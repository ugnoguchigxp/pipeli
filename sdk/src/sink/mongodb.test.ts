import { describe, expect, it } from 'vitest';
import { MongoDBSink } from './mongodb.js';

describe('MongoDBSink', () => {
    it('基本設定でBento YAMLを生成する', () => {
        const sink = new MongoDBSink({
            database: 'test_db',
            collection: 'patients',
        });

        const bento = sink.toBento();

        expect(bento).toEqual({
            mongodb: {
                url: '${MONGODB_URI}',
                database: 'test_db',
                collection: 'patients',
                operation: 'insert-one',
                document_map: 'root = this',
            },
        });
    });

    it('upsert操作を設定できる', () => {
        const sink = new MongoDBSink({
            database: 'test_db',
            collection: 'patients',
            operation: 'upsert-one',
            filterMapping: 'root.patient_id = this.patient_id',
        });

        const bento = sink.toBento();
        const mongoConfig = bento.mongodb as Record<string, unknown>;

        expect(mongoConfig.operation).toBe('upsert-one');
        expect(mongoConfig.filter_map).toBe('root.patient_id = this.patient_id');
    });

    it('writeConcernを設定できる', () => {
        const sink = new MongoDBSink({
            database: 'test_db',
            collection: 'patients',
            writeConcern: {
                w: 'majority',
                journal: true,
                wTimeout: '5s',
            },
        });

        const bento = sink.toBento();
        const mongoConfig = bento.mongodb as Record<string, unknown>;

        expect(mongoConfig.write_concern).toEqual({
            w: 'majority',
            j: true,
            w_timeout: '5s',
        });
    });

    it('writeConcernの一部設定に対応する', () => {
        const sink = new MongoDBSink({
            database: 'test_db',
            collection: 'patients',
            writeConcern: {
                w: 1,
            },
        });

        const bento = sink.toBento();
        const mongoConfig = bento.mongodb as Record<string, unknown>;

        expect(mongoConfig.write_concern).toEqual({
            w: 1,
        });
    });
});
