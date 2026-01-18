import { describe, expect, it } from 'vitest';
import type { CSVProfile } from '../profile/csv-profile.js';
import { CSVParser } from './csv-parser.js';

describe('CSVParser', () => {
    it('builds processors with utf-8 encoding and tab delimiter', () => {
        const profile: CSVProfile = {
            id: 'csv-test',
            vendor: 'vendor',
            version: '1.0',
            encoding: 'utf-8',
            delimiter: '\t',
            lineEnding: 'LF',
            quoteChar: '"',
            hasHeader: false,
            headerRows: 0,
            recordTypes: {},
            fields: [
                { name: 'name', columnIndex: 0, type: 'string', required: false, defaultValue: 'anon' },
                { name: 'count', columnIndex: 1, type: 'number', required: false, defaultValue: 10 },
                { name: 'amount', columnIndex: 2, type: 'number', required: false, decimalPlaces: 2 },
                { name: 'flag', columnIndex: 3, type: 'boolean', required: false },
                { name: 'date', columnIndex: 4, type: 'date', required: false },
                { name: 'timestamp', columnIndex: 5, type: 'datetime', required: false, dateFormat: '20060102' },
            ],
        };

        const parser = new CSVParser(profile);
        const processors = parser.toBento();

        const mappings = processors.map((processor) => String((processor as { mapping?: string }).mapping || ''));

        expect(mappings[0]).toContain('content().string()');
        expect(mappings[1]).toContain('split("\\t")');
        expect(mappings.join('\n')).toContain('root.name = (this._columns.index(0)).or("anon")');
        expect(mappings.join('\n')).toContain('root.count = (this._columns.index(1).number()).or(10)');
        expect(mappings.join('\n')).toContain('root.amount = this._columns.index(2).number() / 100');
        expect(mappings.join('\n')).toContain('(this._columns.index(3) == "1" ||');
        expect(mappings.join('\n')).toContain('parse_timestamp("20060102")');
    });

    it('adds record type mappings and encoding conversion for non-utf-8', () => {
        const profile: CSVProfile = {
            id: 'csv-test2',
            vendor: 'vendor',
            version: '1.0',
            encoding: 'shift_jis',
            delimiter: ',',
            lineEnding: 'LF',
            quoteChar: '',
            hasHeader: false,
            headerRows: 0,
            recordTypes: {
                header: {
                    identifier: 'H',
                    identifierColumnIndex: 0,
                    fields: [{ name: 'headerCode', columnIndex: 1, type: 'string', required: false }],
                    skip: false,
                },
                skipped: {
                    identifier: 'S',
                    identifierColumnIndex: 0,
                    fields: [{ name: 'skipCode', columnIndex: 1, type: 'string', required: false }],
                    skip: true,
                },
            },
            fields: [],
        };

        const parser = new CSVParser(profile);
        const processors = parser.toBento();

        const mappings = processors.map((processor) => String((processor as { mapping?: string }).mapping || ''));
        const combined = mappings.join('\n');

        expect(combined).toContain('decode("shift-jis")');
        expect(combined).toContain('root._recordType = "header"');
        expect(combined).toContain('root.headerCode = this._columns.index(1)');
        expect(combined).not.toContain('skipCode');
    });
});
