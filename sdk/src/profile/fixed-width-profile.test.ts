import { describe, expect, it } from 'vitest';
import {
    type FixedWidthField,
    FixedWidthFieldSchema,
    type FixedWidthProfile,
    FixedWidthProfileSchema,
    generateFieldMappings,
    generateRecordTypeMappings,
    getTrimExpression,
    getTypeConversionExpression,
    RecordTypeDefinitionSchema,
} from './fixed-width-profile.js';

describe('FixedWidthFieldSchema', () => {
    it('should validate a valid field', () => {
        const input = {
            name: 'patientId',
            start: 0,
            length: 10,
        };

        const result = FixedWidthFieldSchema.parse(input);
        expect(result.name).toBe('patientId');
        expect(result.start).toBe(0);
        expect(result.length).toBe(10);
        expect(result.type).toBe('string');
        expect(result.trim).toBe('both');
    });

    it('should apply defaults', () => {
        const input = {
            name: 'test',
            start: 10,
            length: 20,
        };

        const result = FixedWidthFieldSchema.parse(input);
        expect(result.type).toBe('string');
        expect(result.trim).toBe('both');
        expect(result.padding).toBe(' ');
        expect(result.required).toBe(false);
    });

    it('should accept number type with decimal places', () => {
        const input = {
            name: 'amount',
            start: 0,
            length: 10,
            type: 'number',
            decimalPlaces: 2,
        };

        const result = FixedWidthFieldSchema.parse(input);
        expect(result.type).toBe('number');
        expect(result.decimalPlaces).toBe(2);
    });

    it('should accept date type with format', () => {
        const input = {
            name: 'birthDate',
            start: 0,
            length: 8,
            type: 'date',
            dateFormat: 'YYYYMMDD',
        };

        const result = FixedWidthFieldSchema.parse(input);
        expect(result.type).toBe('date');
        expect(result.dateFormat).toBe('YYYYMMDD');
    });
});

describe('RecordTypeDefinitionSchema', () => {
    it('should validate a valid record type definition', () => {
        const input = {
            identifier: 'D',
            identifierPosition: { start: 0, length: 1 },
            fields: [
                { name: 'recordType', start: 0, length: 1 },
                { name: 'patientId', start: 1, length: 10 },
            ],
        };

        const result = RecordTypeDefinitionSchema.parse(input);
        expect(result.identifier).toBe('D');
        expect(result.fields).toHaveLength(2);
        expect(result.skip).toBe(false);
    });

    it('should accept skip option', () => {
        const input = {
            identifier: 'T',
            identifierPosition: { start: 0, length: 1 },
            fields: [],
            skip: true,
        };

        const result = RecordTypeDefinitionSchema.parse(input);
        expect(result.skip).toBe(true);
    });
});

describe('FixedWidthProfileSchema', () => {
    it('should validate a valid profile', () => {
        const input = {
            id: 'vendor-a-patient',
            vendor: 'vendor_a',
            encoding: 'shift_jis',
            recordTypes: {
                header: {
                    identifier: 'H',
                    identifierPosition: { start: 0, length: 1 },
                    fields: [{ name: 'fileDate', start: 1, length: 8, type: 'date', dateFormat: 'YYYYMMDD' }],
                },
                data: {
                    identifier: 'D',
                    identifierPosition: { start: 0, length: 1 },
                    fields: [
                        { name: 'patientId', start: 1, length: 10 },
                        { name: 'name', start: 11, length: 20 },
                    ],
                },
            },
        };

        const result = FixedWidthProfileSchema.parse(input);
        expect(result.id).toBe('vendor-a-patient');
        expect(result.encoding).toBe('shift_jis');
        expect(Object.keys(result.recordTypes)).toHaveLength(2);
    });

    it('should apply defaults', () => {
        const input = {
            id: 'test',
            vendor: 'test',
            recordTypes: {},
        };

        const result = FixedWidthProfileSchema.parse(input);
        expect(result.encoding).toBe('utf-8');
        expect(result.lineEnding).toBe('LF');
        expect(result.defaultTrim).toBe('both');
        expect(result.defaultPadding).toBe(' ');
        expect(result.version).toBe('1.0');
    });

    it('should accept recordLength for fixed-length records', () => {
        const input = {
            id: 'fixed-length',
            vendor: 'test',
            recordLength: 200,
            recordTypes: {},
        };

        const result = FixedWidthProfileSchema.parse(input);
        expect(result.recordLength).toBe(200);
    });
});

describe('getTrimExpression', () => {
    it('should return trim() for both', () => {
        expect(getTrimExpression('both')).toBe('.trim()');
    });

    it('should return trim_prefix for left', () => {
        expect(getTrimExpression('left')).toBe('.trim_prefix(" ")');
    });

    it('should return trim_suffix for right', () => {
        expect(getTrimExpression('right')).toBe('.trim_suffix(" ")');
    });

    it('should return empty string for none', () => {
        expect(getTrimExpression('none')).toBe('');
    });

    it('should handle custom padding character', () => {
        expect(getTrimExpression('left', '0')).toBe('.trim_prefix("0")');
    });
});

describe('getTypeConversionExpression', () => {
    it('should return .number() for number type', () => {
        const field: FixedWidthField = {
            name: 'test',
            start: 0,
            length: 10,
            type: 'number',
            trim: 'both',
            padding: ' ',
            required: false,
        };
        expect(getTypeConversionExpression(field)).toBe('.number()');
    });

    it('should handle decimal places', () => {
        const field: FixedWidthField = {
            name: 'amount',
            start: 0,
            length: 10,
            type: 'number',
            trim: 'both',
            padding: ' ',
            required: false,
            decimalPlaces: 2,
        };
        expect(getTypeConversionExpression(field)).toBe('.number() / 100');
    });

    it('should handle date type', () => {
        const field: FixedWidthField = {
            name: 'date',
            start: 0,
            length: 8,
            type: 'date',
            trim: 'both',
            padding: ' ',
            required: false,
        };
        expect(getTypeConversionExpression(field)).toContain('.parse_timestamp');
    });

    it('should handle custom date format', () => {
        const field: FixedWidthField = {
            name: 'date',
            start: 0,
            length: 8,
            type: 'date',
            trim: 'both',
            padding: ' ',
            required: false,
            dateFormat: 'YYYY/MM/DD',
        };
        expect(getTypeConversionExpression(field)).toContain('YYYY/MM/DD');
    });

    it('should handle datetime and boolean types', () => {
        const datetimeField: FixedWidthField = {
            name: 'timestamp',
            start: 0,
            length: 14,
            type: 'datetime',
            trim: 'both',
            padding: ' ',
            required: false,
        };
        const booleanField: FixedWidthField = {
            name: 'active',
            start: 0,
            length: 1,
            type: 'boolean',
            trim: 'both',
            padding: ' ',
            required: false,
        };
        expect(getTypeConversionExpression(datetimeField)).toContain('20060102150405');
        expect(getTypeConversionExpression(booleanField)).toContain('== "1"');
    });

    it('should handle packed decimal type', () => {
        const field: FixedWidthField = {
            name: 'amount',
            start: 0,
            length: 6,
            type: 'packed_decimal',
            trim: 'both',
            padding: ' ',
            required: false,
        };
        expect(getTypeConversionExpression(field)).toBe('.decode("packed_decimal")');
    });
});

describe('generateFieldMappings', () => {
    it('should generate mappings for a record type', () => {
        const profile: FixedWidthProfile = {
            id: 'test',
            vendor: 'test',
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

        const mappings = generateFieldMappings(profile, 'data');
        expect(mappings).toHaveLength(2);
        expect(mappings[0]).toContain('root.patientId');
        expect(mappings[0]).toContain('slice(1, 11)');
        expect(mappings[1]).toContain('root.name');
        expect(mappings[1]).toContain('slice(11, 31)');
    });

    it('should include default values in mappings', () => {
        const profile: FixedWidthProfile = {
            id: 'defaults',
            vendor: 'test',
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
                            name: 'status',
                            start: 1,
                            length: 1,
                            type: 'string',
                            trim: 'none',
                            padding: ' ',
                            required: false,
                            defaultValue: 'N',
                        },
                    ],
                    skip: false,
                },
            },
        };

        const mappings = generateFieldMappings(profile, 'data');
        expect(mappings[0]).toContain('.or("N")');
    });

    it('should return empty array for non-existent record type', () => {
        const profile: FixedWidthProfile = {
            id: 'test',
            vendor: 'test',
            version: '1.0',
            encoding: 'utf-8',
            lineEnding: 'LF',
            defaultTrim: 'both',
            defaultPadding: ' ',
            recordTypes: {},
        };

        const mappings = generateFieldMappings(profile, 'nonexistent');
        expect(mappings).toHaveLength(0);
    });
});

describe('generateRecordTypeMappings', () => {
    it('should generate conditional mappings for multiple record types', () => {
        const profile: FixedWidthProfile = {
            id: 'test',
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
                            type: 'string',
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
            },
        };

        const mapping = generateRecordTypeMappings(profile);
        expect(mapping).toContain('if');
        expect(mapping).toContain('else');
        expect(mapping).toContain('"header"');
        expect(mapping).toContain('"data"');
    });

    it('should skip record types with skip=true', () => {
        const profile: FixedWidthProfile = {
            id: 'test',
            vendor: 'test',
            version: '1.0',
            encoding: 'utf-8',
            lineEnding: 'LF',
            defaultTrim: 'both',
            defaultPadding: ' ',
            recordTypes: {
                data: {
                    identifier: 'D',
                    identifierPosition: { start: 0, length: 1 },
                    fields: [],
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

        const mapping = generateRecordTypeMappings(profile);
        expect(mapping).toContain('"data"');
        expect(mapping).not.toContain('"trailer"');
    });
});
