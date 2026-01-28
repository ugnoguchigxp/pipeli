import { describe, it, expect } from 'vitest';
import { ProfileCompatibilityChecker } from './profile/compatibility.js';
import type { HL7Profile } from './profile/hl7-profile.js';

describe('ProfileCompatibilityChecker', () => {
    const checker = new ProfileCompatibilityChecker();

    const baseProfile: HL7Profile = {
        id: 'test-profile',
        vendor: 'test-vendor',
        profileVersion: '1.0.0',
        version: '2.5',
        messageType: 'ADT^A01',
        segments: {
            PID: {
                minOccurs: 1,
                maxOccurs: 1,
                fields: [
                    { path: 'PID.3.1', normalizedName: 'patientId', type: 'string', required: true },
                    { path: 'PID.5.1', normalizedName: 'lastName', type: 'string', required: true },
                    { path: 'PID.7.1', normalizedName: 'birthDate', type: 'date', required: false },
                ],
            },
            PV1: {
                minOccurs: 0,
                maxOccurs: 1,
                fields: [
                    { path: 'PV1.2.1', normalizedName: 'patientClass', type: 'string', required: false },
                ],
            },
        },
    };

    describe('Breaking Changes', () => {
        it('should detect removed segment', () => {
            const newProfile: HL7Profile = {
                ...baseProfile,
                segments: {
                    PID: baseProfile.segments.PID,
                    // PV1 removed
                },
            };

            const issues = checker.checkHL7(baseProfile, newProfile);
            const breaking = issues.filter(i => i.type === 'BREAKING');

            expect(breaking).toHaveLength(1);
            expect(breaking[0].message).toContain("Segment 'PV1' was removed");
        });

        it('should detect removed field', () => {
            const newProfile: HL7Profile = {
                ...baseProfile,
                segments: {
                    PID: {
                        ...baseProfile.segments.PID,
                        fields: [
                            { path: 'PID.3.1', normalizedName: 'patientId', type: 'string', required: true },
                            // lastName removed
                            { path: 'PID.7.1', normalizedName: 'birthDate', type: 'date', required: false },
                        ],
                    },
                    PV1: baseProfile.segments.PV1,
                },
            };

            const issues = checker.checkHL7(baseProfile, newProfile);
            const breaking = issues.filter(i => i.type === 'BREAKING');

            expect(breaking.length).toBeGreaterThan(0);
            expect(breaking.some(i => i.message.includes('lastName'))).toBe(true);
        });

        it('should detect field type change', () => {
            const newProfile: HL7Profile = {
                ...baseProfile,
                segments: {
                    PID: {
                        ...baseProfile.segments.PID,
                        fields: [
                            { path: 'PID.3.1', normalizedName: 'patientId', type: 'number', required: true }, // Changed from string
                            { path: 'PID.5.1', normalizedName: 'lastName', type: 'string', required: true },
                            { path: 'PID.7.1', normalizedName: 'birthDate', type: 'date', required: false },
                        ],
                    },
                    PV1: baseProfile.segments.PV1,
                },
            };

            const issues = checker.checkHL7(baseProfile, newProfile);
            const breaking = issues.filter(i => i.type === 'BREAKING');

            expect(breaking.some(i => i.message.includes('type changed'))).toBe(true);
        });

        it('should detect optional field becoming required', () => {
            const newProfile: HL7Profile = {
                ...baseProfile,
                segments: {
                    PID: {
                        ...baseProfile.segments.PID,
                        fields: [
                            { path: 'PID.3.1', normalizedName: 'patientId', type: 'string', required: true },
                            { path: 'PID.5.1', normalizedName: 'lastName', type: 'string', required: true },
                            { path: 'PID.7.1', normalizedName: 'birthDate', type: 'date', required: true }, // Now required
                        ],
                    },
                    PV1: baseProfile.segments.PV1,
                },
            };

            const issues = checker.checkHL7(baseProfile, newProfile);
            const breaking = issues.filter(i => i.type === 'BREAKING');

            expect(breaking.some(i => i.message.includes('birthDate') && i.message.includes('required'))).toBe(true);
        });

        it('should detect new required segment', () => {
            const newProfile: HL7Profile = {
                ...baseProfile,
                segments: {
                    ...baseProfile.segments,
                    OBX: {
                        minOccurs: 1, // Required
                        maxOccurs: 999,
                        fields: [
                            { path: 'OBX.3.1', normalizedName: 'observationId', type: 'string', required: true },
                        ],
                    },
                },
            };

            const issues = checker.checkHL7(baseProfile, newProfile);
            const breaking = issues.filter(i => i.type === 'BREAKING');

            expect(breaking.some(i => i.message.includes("New required segment 'OBX'"))).toBe(true);
        });
    });

    describe('Non-Breaking Changes', () => {
        it('should detect new optional segment', () => {
            const newProfile: HL7Profile = {
                ...baseProfile,
                segments: {
                    ...baseProfile.segments,
                    OBX: {
                        minOccurs: 0, // Optional
                        maxOccurs: 999,
                        fields: [
                            { path: 'OBX.3.1', normalizedName: 'observationId', type: 'string', required: true },
                        ],
                    },
                },
            };

            const issues = checker.checkHL7(baseProfile, newProfile);
            const nonBreaking = issues.filter(i => i.type === 'NON_BREAKING');

            expect(nonBreaking.some(i => i.message.includes("New optional segment 'OBX'"))).toBe(true);
        });

        it('should detect new optional field', () => {
            const newProfile: HL7Profile = {
                ...baseProfile,
                segments: {
                    PID: {
                        ...baseProfile.segments.PID,
                        fields: [
                            ...baseProfile.segments.PID.fields,
                            { path: 'PID.8.1', normalizedName: 'gender', type: 'string', required: false },
                        ],
                    },
                    PV1: baseProfile.segments.PV1,
                },
            };

            const issues = checker.checkHL7(baseProfile, newProfile);
            const nonBreaking = issues.filter(i => i.type === 'NON_BREAKING');

            expect(nonBreaking.some(i => i.message.includes("New optional field 'gender'"))).toBe(true);
        });
    });

    describe('No Changes', () => {
        it('should return empty array for identical profiles', () => {
            const issues = checker.checkHL7(baseProfile, baseProfile);
            expect(issues).toHaveLength(0);
        });
    });

    describe('formatIssues', () => {
        it('should format empty issues', () => {
            const formatted = checker.formatIssues([]);
            expect(formatted).toContain('No compatibility issues found');
        });

        it('should format breaking changes', () => {
            const issues = [
                { type: 'BREAKING' as const, message: 'Field removed', path: 'segments.PID.fields.test' },
            ];
            const formatted = checker.formatIssues(issues);

            expect(formatted).toContain('BREAKING');
            expect(formatted).toContain('Field removed');
        });

        it('should format non-breaking changes', () => {
            const issues = [
                { type: 'NON_BREAKING' as const, message: 'Field added', path: 'segments.PID.fields.test' },
            ];
            const formatted = checker.formatIssues(issues);

            expect(formatted).toContain('NON-BREAKING');
            expect(formatted).toContain('Field added');
        });
    });

    describe('suggestVersion', () => {
        it('should suggest major version bump for breaking changes', () => {
            const issues = [
                { type: 'BREAKING' as const, message: 'Field removed', path: 'test' },
            ];
            const suggested = checker.suggestVersion('1.2.3', issues);
            expect(suggested).toBe('2.0.0');
        });

        it('should suggest minor version bump for non-breaking changes', () => {
            const issues = [
                { type: 'NON_BREAKING' as const, message: 'Field added', path: 'test' },
            ];
            const suggested = checker.suggestVersion('1.2.3', issues);
            expect(suggested).toBe('1.3.0');
        });

        it('should suggest patch version bump for no changes', () => {
            const issues: any[] = [];
            const suggested = checker.suggestVersion('1.2.3', issues);
            expect(suggested).toBe('1.2.4');
        });

        it('should handle version with missing patch', () => {
            const issues: any[] = [];
            const suggested = checker.suggestVersion('1.0', issues);
            expect(suggested).toBe('1.0.1');
        });
    });
});
