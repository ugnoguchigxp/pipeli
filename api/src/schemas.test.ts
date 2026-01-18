import { describe, expect, it } from 'bun:test';
import { AnonymizeRequestSchema, GeneralizeDateConfigSchema, MaskConfigSchema } from './schemas';

describe('schemas', () => {
    it('applies defaults for mask config', () => {
        const parsed = MaskConfigSchema.parse({ field: 'name' });
        expect(parsed.keep).toBe('none');
        expect(parsed.maskChar).toBe('*');
    });

    it('applies defaults for generalize date config', () => {
        const parsed = GeneralizeDateConfigSchema.parse({ field: 'dob' });
        expect(parsed.precision).toBe('month');
    });

    it('applies defaults for generalizePostalCode keepDigits', () => {
        const parsed = AnonymizeRequestSchema.parse({
            data: { zip: '100-0001' },
            config: {
                generalizePostalCode: { field: 'zip' },
            },
        });

        expect(parsed.config.generalizePostalCode?.keepDigits).toBe(3);
    });

    it('rejects unknown keys in config', () => {
        expect(() =>
            AnonymizeRequestSchema.parse({
                data: { id: '1' },
                config: {
                    unknown: true,
                },
            }),
        ).toThrow();
    });

    it('rejects unknown top-level keys', () => {
        expect(() =>
            AnonymizeRequestSchema.parse({
                data: { id: '1' },
                config: {},
                extra: true,
            }),
        ).toThrow();
    });
});
