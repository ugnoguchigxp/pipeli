import { describe, expect, it } from 'vitest';
import {
    DICOMProfileSchema,
    DICOMTagMappingSchema,
    formatDICOMTag,
    getJSTypeFromVR,
    parseDICOMTag,
} from './dicom-profile.js';

describe('dicom-profile', () => {
    it('parses and formats DICOM tags', () => {
        const parsed = parseDICOMTag('(0010,0020)');
        expect(parsed).toEqual({ group: 0x0010, element: 0x0020 });
        expect(formatDICOMTag(0x10, 0x20)).toBe('(0010,0020)');
        expect(parseDICOMTag('invalid')).toBeNull();
    });

    it('maps VR to JS types', () => {
        expect(getJSTypeFromVR('IS')).toBe('number');
        expect(getJSTypeFromVR('DA')).toBe('date');
        expect(getJSTypeFromVR('OB')).toBe('binary');
        expect(getJSTypeFromVR('PN')).toBe('string');
    });

    it('applies DICOM profile defaults', () => {
        const parsed = DICOMProfileSchema.parse({
            id: 'dicom-profile',
            vendor: 'vendor',
        });

        expect(parsed.profileVersion).toBe('1.0.0');
        expect(parsed.transferSyntax).toBe('explicit-little-endian');
        expect(parsed.tags).toEqual({});
    });

    it('validates DICOM tag mapping format', () => {
        const parsed = DICOMTagMappingSchema.parse({
            tag: '(0010,0010)',
            vr: 'PN',
            normalizedName: 'patientName',
        });

        expect(parsed.required).toBe(false);
        expect(() =>
            DICOMTagMappingSchema.parse({
                tag: 'invalid',
                vr: 'PN',
                normalizedName: 'bad',
            }),
        ).toThrow();
    });
});
