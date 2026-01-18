import { describe, expect, it } from 'vitest';
import { CSVFieldSchema, CSVProfileSchema, CSVRecordTypeSchema, generateCSVRecordTypeMappings } from './csv-profile.js';

describe('csv-profile', () => {
    it('applies CSV field defaults', () => {
        const parsed = CSVFieldSchema.parse({ name: 'name', columnIndex: 0 });
        expect(parsed.type).toBe('string');
        expect(parsed.required).toBe(false);
    });

    it('applies CSV record type defaults', () => {
        const parsed = CSVRecordTypeSchema.parse({
            identifier: 'H',
            fields: [{ name: 'code', columnIndex: 0 }],
        });
        expect(parsed.identifierColumnIndex).toBe(0);
        expect(parsed.skip).toBe(false);
    });

    it('applies CSV profile defaults', () => {
        const parsed = CSVProfileSchema.parse({
            id: 'profile',
            vendor: 'vendor',
        });

        expect(parsed.version).toBe('1.0');
        expect(parsed.encoding).toBe('utf-8');
        expect(parsed.delimiter).toBe(',');
        expect(parsed.lineEnding).toBe('CRLF');
        expect(parsed.quoteChar).toBe('');
        expect(parsed.hasHeader).toBe(false);
        expect(parsed.headerRows).toBe(0);
    });

    it('generates record type mappings with conversions and skips', () => {
        const mappings = generateCSVRecordTypeMappings({
            id: 'profile',
            vendor: 'vendor',
            version: '1.0',
            encoding: 'utf-8',
            delimiter: ',',
            lineEnding: 'LF',
            quoteChar: '',
            hasHeader: false,
            headerRows: 0,
            recordTypes: {
                header: {
                    identifier: 'H',
                    identifierColumnIndex: 0,
                    fields: [
                        { name: 'amount', columnIndex: 1, type: 'number', required: false, decimalPlaces: 2 },
                        { name: 'flag', columnIndex: 2, type: 'boolean', required: false },
                        { name: 'date', columnIndex: 3, type: 'date', required: false, dateFormat: '20060102' },
                        { name: 'timestamp', columnIndex: 4, type: 'datetime', required: false },
                    ],
                    skip: false,
                },
                skipped: {
                    identifier: 'S',
                    identifierColumnIndex: 0,
                    fields: [{ name: 'skip', columnIndex: 1, type: 'string', required: false }],
                    skip: true,
                },
            },
            fields: [],
        });

        expect(mappings).toContain('root._recordType = "header"');
        expect(mappings).toContain('.number() / 100');
        expect(mappings).toContain('== "Y"');
        expect(mappings).toContain('parse_timestamp("20060102")');
        expect(mappings).toContain('parse_timestamp("20060102150405")');
        expect(mappings).not.toContain('skip');
    });

    it('generates mappings for default conversions', () => {
        const mappings = generateCSVRecordTypeMappings({
            id: 'profile',
            vendor: 'vendor',
            version: '1.0',
            encoding: 'utf-8',
            delimiter: ',',
            lineEnding: 'LF',
            quoteChar: '',
            hasHeader: false,
            headerRows: 0,
            recordTypes: {
                data: {
                    identifier: 'D',
                    identifierColumnIndex: 0,
                    fields: [
                        { name: 'count', columnIndex: 1, type: 'number', required: false },
                        { name: 'birthDate', columnIndex: 2, type: 'date', required: false },
                        { name: 'eventTime', columnIndex: 3, type: 'datetime', required: false },
                        { name: 'note', columnIndex: 4, type: 'string', required: false },
                    ],
                    skip: false,
                },
            },
            fields: [],
        });

        expect(mappings).toContain('.number()');
        expect(mappings).toContain('parse_timestamp("20060102")');
        expect(mappings).toContain('parse_timestamp("20060102150405")');
        expect(mappings).toContain('root.note = this._columns.4');
    });
});
