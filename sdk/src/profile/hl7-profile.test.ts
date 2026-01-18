import { describe, expect, it } from 'vitest';
import {
    generateSegmentMappings,
    HL7FieldMappingSchema,
    type HL7Profile,
    HL7ProfileSchema,
    HL7SegmentDefinitionSchema,
    parseHL7Path,
} from './hl7-profile.js';

describe('HL7FieldMappingSchema', () => {
    it('should validate a valid field mapping', () => {
        const input = {
            path: 'PID.3.1',
            normalizedName: 'patientId',
            type: 'string',
            required: true,
        };

        const result = HL7FieldMappingSchema.parse(input);
        expect(result.path).toBe('PID.3.1');
        expect(result.normalizedName).toBe('patientId');
        expect(result.type).toBe('string');
        expect(result.required).toBe(true);
    });

    it('should apply defaults', () => {
        const input = {
            path: 'PID.5.1',
            normalizedName: 'familyName',
        };

        const result = HL7FieldMappingSchema.parse(input);
        expect(result.type).toBe('string');
        expect(result.required).toBe(false);
    });

    it('should reject invalid HL7 path', () => {
        const input = {
            path: 'invalid',
            normalizedName: 'test',
        };

        expect(() => HL7FieldMappingSchema.parse(input)).toThrow();
    });

    it('should accept path with subcomponent', () => {
        const input = {
            path: 'PID.3.1.2',
            normalizedName: 'patientIdSubComponent',
        };

        const result = HL7FieldMappingSchema.parse(input);
        expect(result.path).toBe('PID.3.1.2');
    });
});

describe('HL7SegmentDefinitionSchema', () => {
    it('should validate a valid segment definition', () => {
        const input = {
            name: 'PID',
            fields: [
                { path: 'PID.3.1', normalizedName: 'patientId' },
                { path: 'PID.5.1', normalizedName: 'familyName' },
            ],
        };

        const result = HL7SegmentDefinitionSchema.parse(input);
        expect(result.name).toBe('PID');
        expect(result.fields).toHaveLength(2);
        expect(result.repeatable).toBe(false);
    });

    it('should reject invalid segment name', () => {
        const input = {
            name: 'INVALID',
            fields: [],
        };

        expect(() => HL7SegmentDefinitionSchema.parse(input)).toThrow();
    });

    it('should accept Z-segment', () => {
        const input = {
            name: 'ZPD',
            fields: [{ path: 'ZPD.1.1', normalizedName: 'customField' }],
            repeatable: true,
        };

        const result = HL7SegmentDefinitionSchema.parse(input);
        expect(result.name).toBe('ZPD');
        expect(result.repeatable).toBe(true);
    });
});

describe('HL7ProfileSchema', () => {
    it('should validate a valid profile', () => {
        const input = {
            id: 'vendor-a-adt',
            vendor: 'vendor_a',
            version: '2.5.1',
            messageType: 'ADT^A01',
            segments: {
                PID: {
                    name: 'PID',
                    fields: [
                        { path: 'PID.3.1', normalizedName: 'patientId', required: true },
                        { path: 'PID.5.1', normalizedName: 'familyName' },
                    ],
                },
            },
        };

        const result = HL7ProfileSchema.parse(input);
        expect(result.id).toBe('vendor-a-adt');
        expect(result.version).toBe('2.5.1');
        expect(result.segments.PID.fields).toHaveLength(2);
    });

    it('should accept extensions (Z-segments)', () => {
        const input = {
            id: 'vendor-b-adt',
            vendor: 'vendor_b',
            version: '2.3',
            messageType: 'ADT^A01',
            segments: {
                PID: {
                    name: 'PID',
                    fields: [{ path: 'PID.3.1', normalizedName: 'patientId' }],
                },
            },
            extensions: {
                ZPD: {
                    name: 'ZPD',
                    fields: [{ path: 'ZPD.1.1', normalizedName: 'vendorSpecificId' }],
                },
            },
        };

        const result = HL7ProfileSchema.parse(input);
        expect(result.extensions).toBeDefined();
        expect(result.extensions!.ZPD.fields).toHaveLength(1);
    });

    it('should accept custom MLLP config', () => {
        const input = {
            id: 'vendor-c-adt',
            vendor: 'vendor_c',
            version: '2.4',
            messageType: 'ADT^A01',
            segments: {},
            mllp: {
                startBlock: '\x0b',
                endBlock: '\x1c',
                trailer: '\r\n',
            },
        };

        const result = HL7ProfileSchema.parse(input);
        expect(result.mllp?.trailer).toBe('\r\n');
    });

    it('should reject invalid message type', () => {
        const input = {
            id: 'invalid',
            vendor: 'test',
            version: '2.5.1',
            messageType: 'INVALID',
            segments: {},
        };

        expect(() => HL7ProfileSchema.parse(input)).toThrow();
    });
});

describe('parseHL7Path', () => {
    it('should parse a valid path', () => {
        const result = parseHL7Path('PID.3.1');
        expect(result.segment).toBe('PID');
        expect(result.field).toBe(3);
        expect(result.component).toBe(1);
        expect(result.subcomponent).toBeUndefined();
    });

    it('should parse path with subcomponent', () => {
        const result = parseHL7Path('PID.3.1.2');
        expect(result.segment).toBe('PID');
        expect(result.field).toBe(3);
        expect(result.component).toBe(1);
        expect(result.subcomponent).toBe(2);
    });

    it('should throw on invalid path', () => {
        expect(() => parseHL7Path('invalid')).toThrow();
    });
});

describe('generateSegmentMappings', () => {
    it('should generate Bloblang mappings for a segment', () => {
        const profile: HL7Profile = {
            id: 'test',
            vendor: 'test',
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

        const mappings = generateSegmentMappings(profile, 'PID');
        expect(mappings).toHaveLength(2);
        expect(mappings[0]).toContain('root.patientId');
        expect(mappings[1]).toContain('root.familyName');
    });

    it('should handle number type conversion', () => {
        const profile: HL7Profile = {
            id: 'test',
            vendor: 'test',
            profileVersion: '1.0.0',
            version: '2.5.1',
            messageType: 'ADT^A01',
            segments: {
                OBR: {
                    name: 'OBR',
                    fields: [{ path: 'OBR.1.1', normalizedName: 'setId', type: 'number', required: false }],
                    repeatable: false,
                    minOccurs: 0,
                    maxOccurs: null,
                },
            },
        };

        const mappings = generateSegmentMappings(profile, 'OBR');
        expect(mappings[0]).toContain('.number()');
    });

    it('should handle date/datetime and defaults with transforms', () => {
        const profile: HL7Profile = {
            id: 'test',
            vendor: 'test',
            profileVersion: '1.0.0',
            version: '2.5.1',
            messageType: 'ADT^A01',
            segments: {
                PID: {
                    name: 'PID',
                    fields: [
                        {
                            path: 'PID.7.1',
                            normalizedName: 'birthDate',
                            type: 'date',
                            required: false,
                            defaultValue: '19000101',
                        },
                        { path: 'PID.7.2', normalizedName: 'birthDateTime', type: 'datetime', required: false },
                        {
                            path: 'PID.5.1',
                            normalizedName: 'familyName',
                            type: 'string',
                            required: false,
                            transform: '$value.uppercase()',
                        },
                    ],
                    repeatable: false,
                    minOccurs: 0,
                    maxOccurs: null,
                },
            },
        };

        const mappings = generateSegmentMappings(profile, 'PID');
        expect(mappings.join('\n')).toContain('.parse_timestamp("20060102")');
        expect(mappings.join('\n')).toContain('.parse_timestamp("20060102150405")');
        expect(mappings.join('\n')).toContain('.or("19000101")');
        expect(mappings.join('\n')).toContain('.uppercase()');
    });

    it('should return empty array for non-existent segment', () => {
        const profile: HL7Profile = {
            id: 'test',
            vendor: 'test',
            profileVersion: '1.0.0',
            version: '2.5.1',
            messageType: 'ADT^A01',
            segments: {},
        };

        const mappings = generateSegmentMappings(profile, 'PID');
        expect(mappings).toHaveLength(0);
    });
});
