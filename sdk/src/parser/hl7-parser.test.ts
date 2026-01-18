import { describe, expect, it } from 'vitest';
import type { HL7Profile } from '../profile/hl7-profile.js';
import { HL7Parser } from './hl7-parser.js';

describe('HL7Parser', () => {
    it('should generate Bento processors for a simple profile', () => {
        const profile: HL7Profile = {
            id: 'test-adt',
            vendor: 'test_vendor',
            profileVersion: '1.0.0',
            version: '2.5.1',
            messageType: 'ADT^A01',
            segments: {
                PID: {
                    name: 'PID',
                    fields: [
                        { path: 'PID.3.1', normalizedName: 'patientId', type: 'string', required: true },
                        { path: 'PID.5.1', normalizedName: 'familyName', type: 'string', required: false },
                    ],
                    repeatable: false,
                    minOccurs: 1,
                    maxOccurs: 1,
                },
            },
        };

        const parser = new HL7Parser(profile);
        const processors = parser.toBento();

        expect(processors).toBeInstanceOf(Array);
        expect(processors.length).toBeGreaterThan(0);

        // MLLP制御文字除去のプロセッサが含まれているか
        const mllpProcessor = processors.find((p) => p.mapping && String(p.mapping).includes('replace'));
        expect(mllpProcessor).toBeDefined();

        // メタデータプロセッサが含まれているか
        const metadataProcessor = processors.find((p) => p.mapping && String(p.mapping).includes('_profile'));
        expect(metadataProcessor).toBeDefined();

        // フィールドマッピングが含まれているか
        const mappingProcessor = processors.find((p) => p.mapping && String(p.mapping).includes('patientId'));
        expect(mappingProcessor).toBeDefined();
    });

    it('should handle vendor extensions (Z-segments)', () => {
        const profile: HL7Profile = {
            id: 'test-with-extensions',
            vendor: 'vendor_x',
            profileVersion: '1.0.0',
            version: '2.3',
            messageType: 'ADT^A01',
            segments: {
                PID: {
                    name: 'PID',
                    fields: [{ path: 'PID.3.1', normalizedName: 'patientId', type: 'string', required: false }],
                    repeatable: false,
                    minOccurs: 0,
                    maxOccurs: null,
                },
            },
            extensions: {
                ZPD: {
                    name: 'ZPD',
                    fields: [{ path: 'ZPD.1.1', normalizedName: 'customField', type: 'string', required: false }],
                    repeatable: false,
                    minOccurs: 0,
                    maxOccurs: null,
                },
            },
        };

        const parser = new HL7Parser(profile);
        const processors = parser.toBento();

        // 拡張フィールドのマッピングが含まれているか
        const extensionProcessor = processors.find((p) => p.mapping && String(p.mapping).includes('_extensions'));
        expect(extensionProcessor).toBeDefined();
        expect(String(extensionProcessor!.mapping)).toContain('vendor_x');
        expect(String(extensionProcessor!.mapping)).toContain('customField');
    });

    it('should handle custom MLLP configuration', () => {
        const profile: HL7Profile = {
            id: 'custom-mllp',
            vendor: 'test',
            profileVersion: '1.0.0',
            version: '2.4',
            messageType: 'ADT^A01',
            segments: {},
            mllp: {
                startBlock: '\x0b',
                endBlock: '\x1c',
                trailer: '\r\n',
            },
        };

        const parser = new HL7Parser(profile);
        const processors = parser.toBento();

        const mllpProcessor = processors.find((p) => p.mapping && String(p.mapping).includes('replace'));
        expect(mllpProcessor).toBeDefined();
        // カスタムtrailerが含まれているか確認
        expect(String(mllpProcessor!.mapping)).toContain('\\r');
    });

    it('should escape newline control characters in MLLP', () => {
        const profile: HL7Profile = {
            id: 'newline-mllp',
            vendor: 'test',
            profileVersion: '1.0.0',
            version: '2.4',
            messageType: 'ADT^A01',
            segments: {},
            mllp: {
                startBlock: '\n',
                endBlock: '\x1c',
                trailer: '\r',
            },
        };

        const parser = new HL7Parser(profile);
        const processors = parser.toBento();

        const mllpProcessor = processors.find((p) => p.mapping && String(p.mapping).includes('replace'));
        expect(mllpProcessor).toBeDefined();
        expect(String(mllpProcessor!.mapping)).toContain('\\n');
    });

    it('should handle type conversions', () => {
        const profile: HL7Profile = {
            id: 'type-conversion',
            vendor: 'test',
            profileVersion: '1.0.0',
            version: '2.5.1',
            messageType: 'ORM^O01',
            segments: {
                OBR: {
                    name: 'OBR',
                    fields: [
                        { path: 'OBR.1.1', normalizedName: 'setId', type: 'number', required: false },
                        { path: 'OBR.7.1', normalizedName: 'observationDate', type: 'datetime', required: false },
                    ],
                    repeatable: false,
                    minOccurs: 0,
                    maxOccurs: null,
                },
            },
        };

        const parser = new HL7Parser(profile);
        const processors = parser.toBento();

        const mappingProcessor = processors.find((p) => p.mapping && String(p.mapping).includes('setId'));
        expect(mappingProcessor).toBeDefined();
        expect(String(mappingProcessor!.mapping)).toContain('.number()');
        expect(String(mappingProcessor!.mapping)).toContain('.parse_timestamp');
    });

    it('should apply default values and custom transforms', () => {
        const profile: HL7Profile = {
            id: 'defaults-transform',
            vendor: 'test',
            profileVersion: '1.0.0',
            version: '2.5.1',
            messageType: 'ADT^A01',
            segments: {
                PID: {
                    name: 'PID',
                    fields: [
                        {
                            path: 'PID.5.1.2',
                            normalizedName: 'familyName',
                            type: 'string',
                            required: false,
                            defaultValue: 'UNKNOWN',
                            transform: '$value.uppercase()',
                        },
                        { path: 'PID.8.1', normalizedName: 'activeFlag', type: 'boolean', required: false },
                    ],
                    repeatable: false,
                    minOccurs: 0,
                    maxOccurs: null,
                },
            },
        };

        const parser = new HL7Parser(profile);
        const processors = parser.toBento();
        const mappingProcessor = processors.find((p) => p.mapping && String(p.mapping).includes('familyName'));

        expect(mappingProcessor).toBeDefined();
        const mapping = String(mappingProcessor!.mapping);
        expect(mapping).toContain('PID.5.1.2');
        expect(mapping).toContain('.or("UNKNOWN")');
        expect(mapping).toContain('.uppercase()');
        expect(mapping).toContain('== "Y"');
    });
});
