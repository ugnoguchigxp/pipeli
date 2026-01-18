import { beforeEach, describe, expect, it } from 'vitest';
import type { FixedWidthProfile, HL7Profile } from './index.js';
import { ProfileRegistry, profileRegistry } from './registry.js';

describe('ProfileRegistry', () => {
    let registry: ProfileRegistry;

    beforeEach(() => {
        registry = new ProfileRegistry();
    });

    const createHL7Profile = (vendor: string, id: string, version: string): HL7Profile => ({
        id,
        vendor,
        profileVersion: version,
        version: '2.5.1',
        messageType: 'ADT^A01',
        segments: {},
    });

    const createFixedWidthProfile = (vendor: string, id: string, version: string): FixedWidthProfile => ({
        id,
        vendor,
        version,
        encoding: 'utf-8',
        lineEnding: 'LF',
        defaultTrim: 'both',
        defaultPadding: ' ',
        recordTypes: {},
    });

    describe('register', () => {
        it('should register a profile', () => {
            const profile = createHL7Profile('vendor_a', 'adt', '1.0.0');
            registry.register(profile);
            expect(registry.size).toBe(1);
        });

        it('should throw error when registering duplicate profile', () => {
            const profile = createHL7Profile('vendor_a', 'adt', '1.0.0');
            registry.register(profile);
            expect(() => registry.register(profile)).toThrow('Profile already registered');
        });

        it('should allow overwriting with overwrite option', () => {
            const profile1 = createHL7Profile('vendor_a', 'adt', '1.0.0');
            const profile2 = createHL7Profile('vendor_a', 'adt', '1.0.0');
            registry.register(profile1);
            registry.register(profile2, { overwrite: true });
            expect(registry.size).toBe(1);
        });
    });

    describe('get', () => {
        it('should get a profile by exact version', () => {
            const profile = createHL7Profile('vendor_a', 'adt', '1.0.0');
            registry.register(profile);
            const retrieved = registry.get<HL7Profile>('vendor_a', 'adt', '1.0.0');
            expect(retrieved).toBeDefined();
            expect(retrieved?.id).toBe('adt');
        });

        it('should get latest version when version is not specified', () => {
            registry.register(createHL7Profile('vendor_a', 'adt', '1.0.0'));
            registry.register(createHL7Profile('vendor_a', 'adt', '1.1.0'));
            registry.register(createHL7Profile('vendor_a', 'adt', '2.0.0'));

            const latest = registry.get<HL7Profile>('vendor_a', 'adt');
            expect(latest?.profileVersion).toBe('2.0.0');
        });

        it('should return undefined for non-existent profile', () => {
            const profile = registry.get('vendor_x', 'nonexistent');
            expect(profile).toBeUndefined();
        });

        it('should handle semantic versioning correctly', () => {
            registry.register(createHL7Profile('vendor_a', 'adt', '1.0.0'));
            registry.register(createHL7Profile('vendor_a', 'adt', '1.10.0'));
            registry.register(createHL7Profile('vendor_a', 'adt', '1.2.0'));

            const latest = registry.get<HL7Profile>('vendor_a', 'adt');
            expect(latest?.profileVersion).toBe('1.10.0');
        });

        it('should resolve extends using vendor:id format', () => {
            registry.register(createHL7Profile('vendor_a', 'base', '1.0.0'));
            registry.register({
                ...createHL7Profile('vendor_b', 'child', '1.0.0'),
                extends: 'vendor_a:base',
            });

            const resolved = registry.get<HL7Profile>('vendor_b', 'child');
            expect(resolved).toBeDefined();
            expect(resolved?.extends).toBeUndefined();
        });

        it('should resolve extends using id only', () => {
            registry.register(createHL7Profile('vendor_c', 'shared', '1.0.0'));
            registry.register({
                ...createHL7Profile('vendor_c', 'child', '1.0.0'),
                extends: 'shared',
            });

            const resolved = registry.get<HL7Profile>('vendor_c', 'child');
            expect(resolved).toBeDefined();
            expect(resolved?.extends).toBeUndefined();
        });
    });

    describe('getRaw/getByKey', () => {
        it('should fetch raw profile by version', () => {
            const profile = createHL7Profile('vendor_a', 'adt', '1.0.0');
            registry.register(profile);

            const raw = registry.getRaw<HL7Profile>('vendor_a', 'adt', '1.0.0');
            expect(raw?.profileVersion).toBe('1.0.0');
        });

        it('should return undefined for missing key', () => {
            const result = registry.getByKey('missing:key:0.0.0');
            expect(result).toBeUndefined();
        });
    });

    describe('getByVendor', () => {
        it('should get all profiles for a vendor', () => {
            registry.register(createHL7Profile('vendor_a', 'adt', '1.0.0'));
            registry.register(createHL7Profile('vendor_a', 'orm', '1.0.0'));
            registry.register(createHL7Profile('vendor_b', 'adt', '1.0.0'));

            const vendorAProfiles = registry.getByVendor('vendor_a');
            expect(vendorAProfiles).toHaveLength(2);
        });

        it('should return empty array for vendor with no profiles', () => {
            const profiles = registry.getByVendor('nonexistent');
            expect(profiles).toHaveLength(0);
        });
    });

    describe('list', () => {
        it('should list all profiles', () => {
            registry.register(createHL7Profile('vendor_a', 'adt', '1.0.0'));
            registry.register(createHL7Profile('vendor_b', 'adt', '1.0.0'));
            registry.register(createFixedWidthProfile('vendor_c', 'patient', '1.0'));

            const all = registry.list();
            expect(all).toHaveLength(3);
        });

        it('should return empty array when no profiles registered', () => {
            const all = registry.list();
            expect(all).toHaveLength(0);
        });
    });

    describe('delete', () => {
        it('should delete a specific version', () => {
            registry.register(createHL7Profile('vendor_a', 'adt', '1.0.0'));
            registry.register(createHL7Profile('vendor_a', 'adt', '2.0.0'));

            const deleted = registry.delete('vendor_a', 'adt', '1.0.0');
            expect(deleted).toBe(1);
            expect(registry.size).toBe(1);
        });

        it('should delete all versions when version not specified', () => {
            registry.register(createHL7Profile('vendor_a', 'adt', '1.0.0'));
            registry.register(createHL7Profile('vendor_a', 'adt', '2.0.0'));

            const deleted = registry.delete('vendor_a', 'adt');
            expect(deleted).toBe(2);
            expect(registry.size).toBe(0);
        });

        it('should return 0 when deleting non-existent profile', () => {
            const deleted = registry.delete('vendor_x', 'nonexistent');
            expect(deleted).toBe(0);
        });
    });

    describe('clear', () => {
        it('should clear all profiles', () => {
            registry.register(createHL7Profile('vendor_a', 'adt', '1.0.0'));
            registry.register(createHL7Profile('vendor_b', 'adt', '1.0.0'));

            registry.clear();
            expect(registry.size).toBe(0);
        });
    });

    describe('global profileRegistry', () => {
        it('should be a singleton instance', () => {
            expect(profileRegistry).toBeInstanceOf(ProfileRegistry);
        });
    });

    describe('inheritance (extends)', () => {
        it('should merge HL7 profiles with extends', () => {
            // ベースプロファイル
            registry.register({
                id: 'base-adt',
                vendor: 'hl7_standard',
                profileVersion: '1.0.0',
                version: '2.5.1',
                messageType: 'ADT^A01',
                segments: {
                    PID: {
                        name: 'PID',
                        fields: [
                            { path: 'PID.3.1', normalizedName: 'patientId', type: 'string' },
                            { path: 'PID.5.1', normalizedName: 'familyName', type: 'string' },
                        ],
                    },
                },
            } as unknown as HL7Profile);

            // 派生プロファイル
            registry.register({
                id: 'vendor-adt',
                vendor: 'vendor_a',
                profileVersion: '1.0.0',
                version: '2.5.1',
                messageType: 'ADT^A01',
                extends: 'hl7_standard:base-adt:1.0.0',
                segments: {
                    PID: {
                        name: 'PID',
                        fields: [
                            // patientIdを上書き
                            { path: 'PID.3.1.1', normalizedName: 'patientId', type: 'string' },
                            // 新しいフィールドを追加
                            { path: 'PID.5.7', normalizedName: 'familyNameKana', type: 'string' },
                        ],
                    },
                },
                extensions: {
                    ZPD: {
                        name: 'ZPD',
                        fields: [{ path: 'ZPD.1.1', normalizedName: 'vendorId', type: 'string' }],
                    },
                },
            } as unknown as HL7Profile);

            const merged = registry.get<HL7Profile>('vendor_a', 'vendor-adt');
            expect(merged).toBeDefined();

            // セグメントがマージされている
            expect(merged!.segments.PID.fields).toHaveLength(3);

            // patientIdは上書きされている
            const patientIdField = merged!.segments.PID.fields.find((f) => f.normalizedName === 'patientId');
            expect(patientIdField?.path).toBe('PID.3.1.1');

            // 拡張が追加されている
            expect(merged!.extensions?.ZPD).toBeDefined();

            // extendsは削除されている
            expect(merged!.extends).toBeUndefined();
        });

        it('should merge FixedWidth profiles with extends', () => {
            registry.register({
                id: 'base-fixed',
                vendor: 'standard',
                version: '1.0',
                encoding: 'utf-8',
                recordTypes: {
                    data: {
                        identifier: 'D',
                        identifierPosition: { start: 0, length: 1 },
                        fields: [{ name: 'id', start: 1, length: 10, type: 'string' }],
                    },
                },
            } as unknown as FixedWidthProfile);

            registry.register({
                id: 'vendor-fixed',
                vendor: 'vendor_b',
                version: '1.0',
                encoding: 'shift_jis',
                extends: 'standard:base-fixed:1.0',
                recordTypes: {
                    data: {
                        identifier: 'D',
                        identifierPosition: { start: 0, length: 1 },
                        fields: [{ name: 'name', start: 11, length: 20, type: 'string' }],
                    },
                },
            } as unknown as FixedWidthProfile);

            const merged = registry.get<FixedWidthProfile>('vendor_b', 'vendor-fixed');
            expect(merged).toBeDefined();
            expect(merged!.encoding).toBe('shift_jis');
            expect(merged!.recordTypes.data.fields).toHaveLength(2);
        });

        it('should throw error on circular inheritance', () => {
            registry.register({
                id: 'circular-a',
                vendor: 'test',
                profileVersion: '1.0.0',
                version: '2.5.1',
                messageType: 'ADT^A01',
                extends: 'test:circular-b:1.0.0',
                segments: {},
            } as unknown as HL7Profile);

            registry.register({
                id: 'circular-b',
                vendor: 'test',
                profileVersion: '1.0.0',
                version: '2.5.1',
                messageType: 'ADT^A01',
                extends: 'test:circular-a:1.0.0',
                segments: {},
            } as unknown as HL7Profile);

            expect(() => registry.get('test', 'circular-a')).toThrow('Circular inheritance detected');
        });

        it('should throw error when base profile not found', () => {
            registry.register({
                id: 'orphan',
                vendor: 'test',
                profileVersion: '1.0.0',
                version: '2.5.1',
                messageType: 'ADT^A01',
                extends: 'nonexistent:profile:1.0.0',
                segments: {},
            } as unknown as HL7Profile);

            expect(() => registry.get('test', 'orphan')).toThrow('Base profile not found');
        });

        it('should throw error when merging different profile types', () => {
            registry.register({
                id: 'fixed-base',
                vendor: 'vendor_x',
                version: '1.0',
                encoding: 'utf-8',
                recordTypes: {},
            } as unknown as FixedWidthProfile);

            registry.register({
                ...createHL7Profile('vendor_x', 'hl7-child', '1.0.0'),
                extends: 'vendor_x:fixed-base:1.0',
            });

            expect(() => registry.get('vendor_x', 'hl7-child')).toThrow('Cannot merge profiles');
        });
    });
});
