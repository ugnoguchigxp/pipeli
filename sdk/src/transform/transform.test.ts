import { describe, expect, it } from 'vitest';
import { Transform } from './index.js';

describe('Transform', () => {
    it('should generate map processor', () => {
        const transform = Transform.map({ id: 'this.patient_id' });
        const bento = transform.toBento() as any;
        expect(bento[0].mapping).toBe('root.id = this.patient_id');
    });

    it('should generate decode processor', () => {
        const transform = Transform.decode('shift_jis');
        const bento = transform.toBento() as any;
        expect(bento[0].mapping).toBe('root = content().decode("shift-jis")');
    });

    it('should generate validate processor', () => {
        const transform = Transform.validate(['id', 'name']);
        const bento = transform.toBento() as any;
        expect(bento).toHaveLength(2);
        expect(bento[0].bloblang).toContain('exists("id")');
    });

    it('should generate parseJson processor', () => {
        const transform = Transform.parseJson();
        const bento = transform.toBento() as any;
        expect(bento[0].mapping).toBe('root = content().parse_json()');
    });

    it('should generate parseXml processor with default options', () => {
        const transform = Transform.parseXml();
        const bento = transform.toBento() as any;
        expect(bento[0].xml).toBeDefined();
        expect(bento[0].xml.operator).toBe('to_json');
        expect(bento[0].xml.cast).toBe(true);
    });

    it('should generate parseXml processor with custom options', () => {
        const transform = Transform.parseXml({ cast: false });
        const bento = transform.toBento() as any;
        expect(bento[0].xml.cast).toBe(false);
    });

    it('should generate parseCsv processor with default options', () => {
        const transform = Transform.parseCsv();
        const bento = transform.toBento() as any;
        expect(bento[0].csv).toBeDefined();
        expect(bento[0].csv.parse_header_row).toBe(true);
        expect(bento[0].csv.delimiter).toBe(',');
    });

    it('should generate parseCsv processor with custom options', () => {
        const transform = Transform.parseCsv({ parseHeaderRow: false, delimiter: '\t' });
        const bento = transform.toBento() as any;
        expect(bento[0].csv.parse_header_row).toBe(false);
        expect(bento[0].csv.delimiter).toBe('\t');
    });

    // 電文パターンのテスト

    it('should generate variableLength processor with default options', () => {
        const transform = Transform.variableLength();
        const bento = transform.toBento() as any;
        expect(bento[0].mapping).toContain('content().slice(0, 4).number()');
        expect(bento[0].mapping).toContain('root._length');
        expect(bento[0].mapping).toContain('root._body');
    });

    it('should generate variableLength processor with binary encoding', () => {
        const transform = Transform.variableLength({ lengthBytes: 2, lengthEncoding: 'binary' });
        const bento = transform.toBento() as any;
        expect(bento[0].mapping).toContain('content().slice(0, 2).bytes().decode("big_endian")');
    });

    it('should generate variableLength processor with header included', () => {
        const transform = Transform.variableLength({ includesHeader: true });
        const bento = transform.toBento() as any;
        expect(bento[0].mapping).toContain(' - 4');
    });

    it('should generate delimited processor (alias for CSV)', () => {
        const transform = Transform.delimited({ delimiter: '|', hasHeader: false });
        const bento = transform.toBento() as any;
        expect(bento[0].csv.delimiter).toBe('|');
        expect(bento[0].csv.parse_header_row).toBe(false);
    });

    it('should generate delimited processor with quote character', () => {
        const transform = Transform.delimited({ delimiter: ',', hasHeader: true, quote: '"' });
        const bento = transform.toBento() as any;
        expect(bento[0].csv.enclosure).toBe('"');
    });

    it('should generate headerBody processor with JSON body', () => {
        const transform = Transform.headerBody({
            headerLength: 20,
            headerFields: { msgType: [0, 4], length: [4, 8] },
            bodyFormat: 'json',
        });
        const bento = transform.toBento() as any;
        expect(bento[0].mapping).toContain('root.header.msgType = content().slice(0, 4).trim()');
        expect(bento[0].mapping).toContain('root.header.length = content().slice(4, 8).trim()');
        expect(bento[0].mapping).toContain('root.body = content().slice(20).parse_json()');
    });

    it('should generate headerBody processor with fixed body fields', () => {
        const transform = Transform.headerBody({
            headerLength: 10,
            headerFields: { type: [0, 4] },
            bodyFormat: 'fixed',
            bodyFields: { id: [0, 5], name: [5, 15] },
        });
        const bento = transform.toBento() as any;
        expect(bento[0].mapping).toContain('root.body.id = content().slice(10, 15).trim()');
        expect(bento[0].mapping).toContain('root.body.name = content().slice(15, 25).trim()');
    });

    it('should generate headerBody processor with XML body', () => {
        const transform = Transform.headerBody({
            headerLength: 8,
            headerFields: { msgType: [0, 4] },
            bodyFormat: 'xml',
        });
        const bento = transform.toBento() as any;
        expect(bento[0].mapping).toContain('root._body_raw = content().slice(8)');
    });

    it('should generate headerBody processor with raw body', () => {
        const transform = Transform.headerBody({
            headerLength: 6,
            headerFields: { msgType: [0, 2] },
            bodyFormat: 'raw',
        });
        const bento = transform.toBento() as any;
        expect(bento[0].mapping).toContain('root.body = content().slice(6)');
    });

    it('should generate sequenceNumber processor', () => {
        const transform = Transform.sequenceNumber('this.header.seq');
        const bento = transform.toBento() as any;
        expect(bento[0].mapping).toContain('root._sequence = this.header.seq');
        expect(bento[0].mapping).toContain('root._sequence_key');
    });

    it('should generate timestampSync processor with default format', () => {
        const transform = Transform.timestampSync('this.timestamp');
        const bento = transform.toBento() as any;
        expect(bento[0].mapping).toContain('this.timestamp.parse_timestamp()');
        expect(bento[0].mapping).toContain('root._received_at = now()');
        expect(bento[0].mapping).toContain('root._latency_ms');
    });

    it('should generate timestampSync processor with custom format', () => {
        const transform = Transform.timestampSync('this.header.time', 'YYYYMMDDHHmmss');
        const bento = transform.toBento() as any;
        expect(bento[0].mapping).toContain('this.header.time.parse_timestamp("YYYYMMDDHHmmss")');
    });

    // バイナリプロトコルのテスト

    it('should generate protobuf decoder', () => {
        const transform = Transform.protobuf({
            message: 'patient.PatientRecord',
            importPaths: ['/proto'],
        });
        const bento = transform.toBento() as any;
        expect(bento[0].protobuf).toBeDefined();
        expect(bento[0].protobuf.operator).toBe('to_json');
        expect(bento[0].protobuf.message).toBe('patient.PatientRecord');
        expect(bento[0].protobuf.import_paths).toEqual(['/proto']);
    });

    it('should generate protobuf encoder', () => {
        const transform = Transform.protobufEncode({
            message: 'patient.PatientRecord',
            importPaths: ['/proto'],
        });
        const bento = transform.toBento() as any;
        expect(bento[0].protobuf.operator).toBe('from_json');
    });

    it('should generate schema registry decoder', () => {
        const transform = Transform.schemaRegistryDecode({
            url: 'http://schema-registry:8081',
            subject: 'patient-value',
        });
        const bento = transform.toBento() as any;
        expect(bento[0].schema_registry_decode).toBeDefined();
        expect(bento[0].schema_registry_decode.url).toBe('http://schema-registry:8081');
        expect(bento[0].schema_registry_decode.subject).toBe('patient-value');
    });

    it('should generate schema registry decoder with TLS', () => {
        const transform = Transform.schemaRegistryDecode({
            url: 'http://schema-registry:8081',
            tlsEnabled: true,
        });
        const bento = transform.toBento() as any;
        expect(bento[0].schema_registry_decode.tls.enabled).toBe(true);
        expect(bento[0].schema_registry_decode.subject).toBeUndefined();
    });

    it('should generate msgpack decoder', () => {
        const transform = Transform.msgpack();
        const bento = transform.toBento() as any;
        expect(bento[0].mapping).toBe('root = content().decode("msgpack")');
    });

    it('should generate msgpack encoder', () => {
        const transform = Transform.msgpackEncode();
        const bento = transform.toBento() as any;
        expect(bento[0].mapping).toBe('root = this.encode("msgpack")');
    });

    it('should generate avro decoder', () => {
        const transform = Transform.avro('/schemas/patient.avsc');
        const bento = transform.toBento() as any;
        expect(bento[0].avro).toBeDefined();
        expect(bento[0].avro.operator).toBe('to_json');
        expect(bento[0].avro.schema_path).toBe('/schemas/patient.avsc');
    });

    it('should generate base64 decoder', () => {
        const transform = Transform.base64Decode();
        const bento = transform.toBento() as any;
        expect(bento[0].mapping).toBe('root = content().decode("base64")');
    });

    it('should generate base64 encoder', () => {
        const transform = Transform.base64Encode();
        const bento = transform.toBento() as any;
        expect(bento[0].mapping).toBe('root = content().encode("base64")');
    });

    it('should generate gzip decompressor', () => {
        const transform = Transform.gunzip();
        const bento = transform.toBento() as any;
        expect(bento[0].decompress).toBeDefined();
        expect(bento[0].decompress.algorithm).toBe('gzip');
    });

    it('should generate gzip compressor', () => {
        const transform = Transform.gzip();
        const bento = transform.toBento() as any;
        expect(bento[0].compress).toBeDefined();
        expect(bento[0].compress.algorithm).toBe('gzip');
    });

    // 重複排除・分割

    it('should generate dedupe processor', () => {
        const transform = Transform.dedupe({ key: 'this.patient_id' });
        const bento = transform.toBento() as any;
        expect(bento[0].dedupe).toBeDefined();
        expect(bento[0].dedupe.key).toBe('this.patient_id');
        expect(bento[0].dedupe.cache).toBe('dedupe_cache');
    });

    it('should generate dedupe processor with custom cache', () => {
        const transform = Transform.dedupe({ key: 'this.id', cache: 'my_cache', dropOnCacheErr: false });
        const bento = transform.toBento() as any;
        expect(bento[0].dedupe.cache).toBe('my_cache');
        expect(bento[0].dedupe.drop_on_err).toBe(false);
    });

    it('should generate dedupeMemory processor', () => {
        const transform = Transform.dedupeMemory({ key: 'this.message_id', size: 5000 });
        const bento = transform.toBento() as any;
        expect(bento[0].dedupe.cache).toBe('memory');
        expect(bento[0].dedupe.key).toBe('this.message_id');
    });

    it('should generate split processor', () => {
        const transform = Transform.split();
        const bento = transform.toBento() as any;
        expect(bento[0].unarchive).toBeDefined();
        expect(bento[0].unarchive.format).toBe('json_array');
    });

    it('should generate split processor with path', () => {
        const transform = Transform.split('this.patients');
        const bento = transform.toBento() as any;
        expect(bento.length).toBeGreaterThan(1);
        expect(bento[1].mapping).toBe('root = this.patients');
    });

    it('should generate splitArray processor', () => {
        const transform = Transform.splitArray('items');
        const bento = transform.toBento() as any;
        expect(bento[0].mapping).toBe('root = this.items');
        expect(bento[1].unarchive.format).toBe('json_array');
    });

    // カスタム処理

    it('should generate bloblang processor', () => {
        const transform = Transform.bloblang('root = this.merge({"processed": true})');
        const bento = transform.toBento() as any;
        expect(bento[0].mapping).toBe('root = this.merge({"processed": true})');
    });

    it('should generate raw processor', () => {
        const transform = Transform.raw({ http: { url: 'http://api/enrich', verb: 'POST' } });
        const bento = transform.toBento() as any;
        expect(bento[0].http).toBeDefined();
        expect(bento[0].http.url).toBe('http://api/enrich');
    });

    it('should generate rawMultiple processors', () => {
        const transform = Transform.rawMultiple([{ noop: {} }, { log: { message: 'test' } }]);
        const bento = transform.toBento() as any;
        expect(bento).toHaveLength(2);
        expect(bento[0].noop).toBeDefined();
        expect(bento[1].log).toBeDefined();
    });

    // ログ・デバッグ

    it('should generate log processor', () => {
        const transform = Transform.log('Processing message');
        const bento = transform.toBento() as any;
        expect(bento[0].log).toBeDefined();
        expect(bento[0].log.level).toBe('INFO');
        expect(bento[0].log.message).toBe('Processing message');
    });

    it('should generate log processor with custom level', () => {
        const transform = Transform.log('Error occurred', 'ERROR');
        const bento = transform.toBento() as any;
        expect(bento[0].log.level).toBe('ERROR');
    });

    // プライバシー・匿名化

    it('should generate anonymizeApi processor', () => {
        const transform = Transform.anonymizeApi({
            url: 'http://api/anonymize',
            config: {
                hash: ['patient_id'],
            },
        });
        const bento = transform.toBento() as any;
        expect(bento[0].branch).toBeDefined();
        expect(bento[0].branch.request_map).toContain('root.data = this');
        expect(bento[0].branch.processors[0].http.url).toBe('http://api/anonymize');
        expect(bento[0].branch.processors[0].http.headers['Content-Type']).toBe('application/json');
    });

    it('should generate anonymizeApi processor with default url', () => {
        const transform = Transform.anonymizeApi({
            config: {
                hash: ['patient_id'],
            },
        });
        const bento = transform.toBento() as any;
        expect(bento[0].branch.processors[0].http.url).toBe('http://localhost:3001/anonymize');
    });

    // プロファイルベースAPI

    it('should generate hl7WithProfile processor', () => {
        const transform = Transform.hl7WithProfile({
            id: 'test-adt',
            vendor: 'test_vendor',
            version: '2.5.1',
            messageType: 'ADT^A01',
            segments: {
                PID: {
                    name: 'PID',
                    fields: [{ path: 'PID.3.1', normalizedName: 'patientId', type: 'string' }],
                },
            },
        });
        const bento = transform.toBento() as any;
        expect(bento).toBeInstanceOf(Array);
        expect(bento.length).toBeGreaterThan(0);
        // MLLP制御文字除去のプロセッサが含まれているか
        const mllpProcessor = bento.find((p: any) => p.mapping && String(p.mapping).includes('replace'));
        expect(mllpProcessor).toBeDefined();
    });

    it('should generate fixedWidthWithProfile processor', () => {
        const transform = Transform.fixedWidthWithProfile({
            id: 'test-fixed',
            vendor: 'test_vendor',
            encoding: 'utf-8',
            recordTypes: {
                data: {
                    identifier: 'D',
                    identifierPosition: { start: 0, length: 1 },
                    fields: [{ name: 'patientId', start: 1, length: 10, type: 'string' }],
                },
            },
        });
        const bento = transform.toBento() as any;
        expect(bento).toBeInstanceOf(Array);
        expect(bento.length).toBeGreaterThan(0);
        // メタデータプロセッサが含まれているか
        const metadataProcessor = bento.find((p: any) => p.mapping && String(p.mapping).includes('_profile'));
        expect(metadataProcessor).toBeDefined();
    });

    it('should generate csvWithProfile processor', () => {
        const transform = Transform.csvWithProfile({
            id: 'csv-profile',
            vendor: 'vendor',
            recordTypes: {},
            fields: [{ name: 'id', columnIndex: 0 }],
        });
        const bento = transform.toBento() as any;
        expect(bento.length).toBeGreaterThan(0);
        expect(String(bento[0].mapping)).toContain('_raw');
    });

    it('should generate dicomWithProfile processor', () => {
        const transform = Transform.dicomWithProfile({
            id: 'dicom-profile',
            vendor: 'vendor',
            tags: {
                patientId: { tag: '(0010,0020)', vr: 'LO', normalizedName: 'patientId' },
            },
        });
        const bento = transform.toBento() as any;
        expect(bento.length).toBeGreaterThan(0);
        expect(String(bento[0].mapping)).toContain('_profile');
    });
});
