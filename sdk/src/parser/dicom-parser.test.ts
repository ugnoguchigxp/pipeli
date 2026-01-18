import { describe, expect, it } from 'vitest';
import type { DICOMProfile } from '../profile/dicom-profile.js';
import { DICOMParser } from './dicom-parser.js';

describe('DICOMParser', () => {
    it('builds processors with tag mappings and type conversions', () => {
        const profile: DICOMProfile = {
            id: 'dicom-profile',
            vendor: 'vendor',
            profileVersion: '1.0.0',
            modality: 'CT',
            tags: {
                patientId: {
                    tag: '(0010,0020)',
                    vr: 'LO',
                    normalizedName: 'patientId',
                    type: 'string',
                    required: false,
                },
                studyDate: {
                    tag: '(0008,0020)',
                    vr: 'DA',
                    normalizedName: 'studyDate',
                    type: 'date',
                    required: false,
                },
                instanceNumber: {
                    tag: '(0020,0013)',
                    vr: 'IS',
                    normalizedName: 'instanceNumber',
                    type: 'number',
                    required: false,
                },
                invalid: {
                    tag: 'invalid-tag',
                    vr: 'LO',
                    normalizedName: 'ignored',
                    type: 'string',
                    required: false,
                },
            },
            transferSyntax: 'explicit-little-endian',
        };

        const parser = new DICOMParser(profile);
        const processors = parser.toBento();

        const mappings = processors.map((processor) => String((processor as { mapping?: string }).mapping || ''));
        const combined = mappings.join('\n');

        expect(combined).toContain('"modality": "CT"');
        expect(combined).toContain('root.patientId = this.dicom_0010_0020');
        expect(combined).toContain('.parse_timestamp("20060102")');
        expect(combined).toContain('root.instanceNumber = this.dicom_0020_0013.number()');
        expect(combined).not.toContain('ignored');
    });

    it('returns target tags with default required flag', () => {
        const profile: DICOMProfile = {
            id: 'dicom-profile',
            vendor: 'vendor',
            profileVersion: '1.0.0',
            tags: {
                patientId: {
                    tag: '(0010,0020)',
                    vr: 'LO',
                    normalizedName: 'patientId',
                    type: 'string',
                    required: false,
                },
                studyDate: {
                    tag: '(0008,0020)',
                    vr: 'DA',
                    normalizedName: 'studyDate',
                    required: true,
                    type: 'date',
                },
            },
            transferSyntax: 'explicit-little-endian',
        };

        const parser = new DICOMParser(profile);
        const targets = parser.getTargetTags();

        expect(targets).toEqual([
            { tag: '(0010,0020)', normalizedName: 'patientId', required: false },
            { tag: '(0008,0020)', normalizedName: 'studyDate', required: true },
        ]);
    });

    it('builds external parser config with pixel data options', () => {
        const profile: DICOMProfile = {
            id: 'dicom-profile',
            vendor: 'vendor',
            profileVersion: '1.0.0',
            tags: {
                patientId: {
                    tag: '(0010,0020)',
                    vr: 'LO',
                    normalizedName: 'patientId',
                    type: 'string',
                    required: false,
                },
            },
            pixelData: {
                extract: true,
                outputFormat: 'png',
                maxSize: 1024,
            },
            transferSyntax: 'explicit-little-endian',
        };

        const parser = new DICOMParser(profile);
        const config = parser.toExternalParserConfig();

        expect(config.tags).toEqual([{ tag: '(0010,0020)', name: 'patientId', vr: 'LO' }]);
        expect(config.extractPixelData).toBe(true);
        expect(config.pixelDataFormat).toBe('png');
    });
});
