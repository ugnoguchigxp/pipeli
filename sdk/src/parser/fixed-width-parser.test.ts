import { describe, expect, it } from 'vitest';
import type { FixedWidthProfile } from '../profile/fixed-width-profile.js';
import { FixedWidthParser } from './fixed-width-parser.js';

describe('FixedWidthParser', () => {
    it('should generate Bento processors for a simple profile', () => {
        const profile: FixedWidthProfile = {
            id: 'test-fixed',
            vendor: 'test_vendor',
            version: '1.0',
            encoding: 'utf-8',
            lineEnding: 'LF',
            defaultTrim: 'both',
            defaultPadding: ' ',
            recordTypes: {
                data: {
                    identifier: 'D',
                    identifierPosition: { start: 0, length: 1 },
                    fields: [
                        {
                            name: 'patientId',
                            start: 1,
                            length: 10,
                            type: 'string',
                            trim: 'both',
                            padding: ' ',
                            required: false,
                        },
                        {
                            name: 'name',
                            start: 11,
                            length: 20,
                            type: 'string',
                            trim: 'right',
                            padding: ' ',
                            required: false,
                        },
                    ],
                    skip: false,
                },
            },
        };

        const parser = new FixedWidthParser(profile);
        const processors = parser.toBento();

        expect(processors).toBeInstanceOf(Array);
        expect(processors.length).toBeGreaterThan(0);

        // メタデータプロセッサが含まれているか
        const metadataProcessor = processors.find((p) => p.mapping && String(p.mapping).includes('_profile'));
        expect(metadataProcessor).toBeDefined();

        // レコード種別マッピングが含まれているか
        const mappingProcessor = processors.find((p) => p.mapping && String(p.mapping).includes('patientId'));
        expect(mappingProcessor).toBeDefined();
    });

    it('should handle encoding conversion', () => {
        const profile: FixedWidthProfile = {
            id: 'shift-jis-test',
            vendor: 'test',
            version: '1.0',
            encoding: 'shift_jis',
            lineEnding: 'CRLF',
            defaultTrim: 'both',
            defaultPadding: ' ',
            recordTypes: {},
        };

        const parser = new FixedWidthParser(profile);
        const processors = parser.toBento();

        // エンコーディング変換プロセッサが含まれているか
        const encodingProcessor = processors.find((p) => p.mapping && String(p.mapping).includes('decode'));
        expect(encodingProcessor).toBeDefined();
        expect(String(encodingProcessor!.mapping)).toContain('shift-jis');
    });

    it('should handle multiple record types', () => {
        const profile: FixedWidthProfile = {
            id: 'multi-record',
            vendor: 'test',
            version: '1.0',
            encoding: 'utf-8',
            lineEnding: 'LF',
            defaultTrim: 'both',
            defaultPadding: ' ',
            recordTypes: {
                header: {
                    identifier: 'H',
                    identifierPosition: { start: 0, length: 1 },
                    fields: [
                        {
                            name: 'fileDate',
                            start: 1,
                            length: 8,
                            type: 'date',
                            trim: 'both',
                            padding: ' ',
                            required: false,
                        },
                    ],
                    skip: false,
                },
                data: {
                    identifier: 'D',
                    identifierPosition: { start: 0, length: 1 },
                    fields: [
                        {
                            name: 'patientId',
                            start: 1,
                            length: 10,
                            type: 'string',
                            trim: 'both',
                            padding: ' ',
                            required: false,
                        },
                    ],
                    skip: false,
                },
                trailer: {
                    identifier: 'T',
                    identifierPosition: { start: 0, length: 1 },
                    fields: [],
                    skip: true,
                },
            },
        };

        const parser = new FixedWidthParser(profile);
        const processors = parser.toBento();

        const mappingProcessor = processors.find((p) => p.mapping && String(p.mapping).includes('if'));
        expect(mappingProcessor).toBeDefined();
        expect(String(mappingProcessor!.mapping)).toContain('header');
        expect(String(mappingProcessor!.mapping)).toContain('data');
        expect(String(mappingProcessor!.mapping)).not.toContain('trailer'); // skip=true
    });

    it('should handle single record type with fields', () => {
        const profile: FixedWidthProfile = {
            id: 'single-record',
            vendor: 'test',
            version: '1.0',
            encoding: 'utf-8',
            lineEnding: 'LF',
            defaultTrim: 'both',
            defaultPadding: ' ',
            recordTypes: {},
            fields: [
                {
                    name: 'patientId',
                    start: 0,
                    length: 10,
                    type: 'string',
                    trim: 'both',
                    padding: ' ',
                    required: false,
                },
                { name: 'name', start: 10, length: 20, type: 'string', trim: 'both', padding: ' ', required: false },
            ],
        };

        const parser = new FixedWidthParser(profile);
        const processors = parser.toBento();

        const mappingProcessor = processors.find((p) => p.mapping && String(p.mapping).includes('patientId'));
        expect(mappingProcessor).toBeDefined();
        expect(String(mappingProcessor!.mapping)).toContain('slice(0, 10)');
        expect(String(mappingProcessor!.mapping)).toContain('slice(10, 30)');
    });

    it('should handle type conversions', () => {
        const profile: FixedWidthProfile = {
            id: 'type-conversion',
            vendor: 'test',
            version: '1.0',
            encoding: 'utf-8',
            lineEnding: 'LF',
            defaultTrim: 'both',
            defaultPadding: ' ',
            recordTypes: {},
            fields: [
                {
                    name: 'amount',
                    start: 0,
                    length: 10,
                    type: 'number',
                    decimalPlaces: 2,
                    trim: 'both',
                    padding: ' ',
                    required: false,
                },
                {
                    name: 'birthDate',
                    start: 10,
                    length: 8,
                    type: 'date',
                    dateFormat: 'YYYYMMDD',
                    trim: 'both',
                    padding: ' ',
                    required: false,
                },
                {
                    name: 'isActive',
                    start: 18,
                    length: 1,
                    type: 'boolean',
                    trim: 'both',
                    padding: ' ',
                    required: false,
                },
            ],
        };

        const parser = new FixedWidthParser(profile);
        const processors = parser.toBento();

        const mappingProcessor = processors.find((p) => p.mapping && String(p.mapping).includes('amount'));
        expect(mappingProcessor).toBeDefined();
        expect(String(mappingProcessor!.mapping)).toContain('.number() / 100');
        expect(String(mappingProcessor!.mapping)).toContain('.parse_timestamp("YYYYMMDD")');
        expect(String(mappingProcessor!.mapping)).toContain('== "1"');
    });

    it('should apply trims, defaults, and packed decimal conversion', () => {
        const profile: FixedWidthProfile = {
            id: 'packed-decimal',
            vendor: 'test',
            version: '1.0',
            encoding: 'utf-8',
            lineEnding: 'LF',
            defaultTrim: 'none',
            defaultPadding: '0',
            recordTypes: {},
            fields: [
                {
                    name: 'amount',
                    start: 0,
                    length: 6,
                    type: 'packed_decimal',
                    trim: 'left',
                    padding: '0',
                    required: false,
                    defaultValue: 0,
                },
                {
                    name: 'timestamp',
                    start: 6,
                    length: 14,
                    type: 'datetime',
                    trim: 'both',
                    padding: ' ',
                    required: false,
                },
            ],
        };

        const parser = new FixedWidthParser(profile);
        const processors = parser.toBento();

        const mappingProcessor = processors.find((p) => p.mapping && String(p.mapping).includes('amount'));
        expect(mappingProcessor).toBeDefined();
        const mapping = String(mappingProcessor!.mapping);
        expect(mapping).toContain('.trim_prefix("0")');
        expect(mapping).toContain('.decode("packed_decimal")');
        expect(mapping).toContain('.or(0)');
        expect(mapping).toContain('.parse_timestamp("20060102150405")');
    });
});
