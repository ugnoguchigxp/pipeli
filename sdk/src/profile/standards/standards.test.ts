import { describe, expect, it } from 'vitest';
import { CSVProfileSchema } from '../csv-profile.js';
import { DICOMProfileSchema } from '../dicom-profile.js';
import { HL7ProfileSchema } from '../hl7-profile.js';
import { dicomBaseProfile, dicomCrProfile, dicomCtProfile, dicomMrProfile } from './dicom.js';
import {
    HL7v25BaseProfiles,
    hl7v25AdtA01Base,
    hl7v25AdtA08Base,
    hl7v25OrmO01Base,
    hl7v25OulR22Base,
} from './hl7-v25-base.js';
import { createLabCompanyProfile, jahisLabProfile, parseJLAC10 } from './jahis-lab.js';
import { recedenMedicalProfile } from './receden.js';

describe('standards profiles', () => {
    it('validates HL7 v2.5 base profiles', () => {
        const parsed = HL7ProfileSchema.parse(hl7v25AdtA01Base);
        expect(parsed.messageType).toBe('ADT^A01');
        expect(parsed.segments.PID.fields[0].required).toBe(true);

        const adtA08 = HL7ProfileSchema.parse(hl7v25AdtA08Base);
        expect(adtA08.extends).toBe('hl7_standard:hl7-v25-adt-a01:1.0.0');
        expect(adtA08.segments).toEqual({});

        const orm = HL7ProfileSchema.parse(hl7v25OrmO01Base);
        expect(orm.messageType).toBe('ORM^O01');
        expect(orm.segments.ORC.fields.length).toBeGreaterThan(0);

        const oul = HL7ProfileSchema.parse(hl7v25OulR22Base);
        expect(oul.messageType).toBe('OUL^R22');
        expect(oul.segments.OBX.repeatable).toBe(true);

        const entries = Object.values(HL7v25BaseProfiles).map((profile) => HL7ProfileSchema.parse(profile));
        expect(entries).toHaveLength(4);
    });

    it('validates JAHIS lab profile and helpers', () => {
        const parsed = HL7ProfileSchema.parse(jahisLabProfile);
        expect(parsed.vendor).toBe('jahis');
        expect(parsed.extensions?.ZL1).toBeDefined();
        expect(parsed.segments.OBX.repeatable).toBe(true);

        const company = createLabCompanyProfile('labcorp', 'Lab Corp');
        const companyParsed = HL7ProfileSchema.parse(company);
        expect(companyParsed.extends).toBe('jahis:jahis-lab:1.0.0');
        expect(companyParsed.metadata?.labCompany).toBe('Lab Corp');

        expect(parseJLAC10('12345678901234567')).toEqual({
            analyteCode: '12345',
            identifierCode: '6789',
            materialCode: '012',
            methodCode: '345',
            resultIdentifierCode: '67',
        });
        expect(parseJLAC10('short')).toBeNull();
    });

    it('validates receden CSV profile', () => {
        const parsed = CSVProfileSchema.parse(recedenMedicalProfile);
        expect(parsed.encoding).toBe('shift_jis');
        expect(parsed.delimiter).toBe(',');
        expect(parsed.lineEnding).toBe('CRLF');
        expect(parsed.recordTypes.IR.fields[0].required).toBe(false);
        expect(parsed.recordTypes.IR.skip).toBe(false);
        expect(parsed.recordTypes.RE.fields[1].type).toBe('number');
    });

    it('validates DICOM standard profiles', () => {
        const base = DICOMProfileSchema.parse(dicomBaseProfile);
        expect(base.vendor).toBe('dicom_standard');
        expect(base.tags.patientId.required).toBe(true);
        expect(base.tags.modality.required).toBe(true);

        const ct = DICOMProfileSchema.parse(dicomCtProfile);
        expect(ct.modality).toBe('CT');
        expect(ct.extends).toBe('dicom_standard:dicom-base:1.0.0');

        const mr = DICOMProfileSchema.parse(dicomMrProfile);
        expect(mr.modality).toBe('MR');
        expect(mr.tags.flipAngle.type).toBe('number');

        const cr = DICOMProfileSchema.parse(dicomCrProfile);
        expect(cr.modality).toBe('CR');
        expect(cr.tags.kvp.type).toBe('number');
    });
});
