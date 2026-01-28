import { describe, it, expect, vi } from 'vitest';
import { StandardPipeline, StandardPipelineConfigSchema } from './pipeline.js';
import type { BentoComponent } from './types.js';

// Mock component
class MockComponent implements BentoComponent {
    constructor(private name: string) { }
    toBento() {
        return { mock: this.name };
    }
}

describe('StandardPipeline', () => {
    const mockInput = new MockComponent('input');
    const mockOutput = new MockComponent('output');

    describe('Stage Enforcement', () => {
        it('should enforce validate → normalize → map order', () => {
            const validateComp = new MockComponent('validate');
            const normalizeComp = new MockComponent('normalize');
            const mapComp = new MockComponent('map');

            const pipeline = new StandardPipeline({
                id: 'test-pipeline',
                vendor: 'test-vendor',
                facility: 'test-facility',
                domain: 'test',
                input: mockInput,
                output: mockOutput,
                validate: [validateComp],
                normalize: [normalizeComp],
                map: [mapComp],
            });

            const yaml = pipeline.toYaml();

            // Verify processors are in correct order
            expect(yaml).toContain('mock: validate');
            expect(yaml).toContain('mock: normalize');
            expect(yaml).toContain('mock: map');

            // Verify order by checking positions
            const validatePos = yaml.indexOf('mock: validate');
            const normalizePos = yaml.indexOf('mock: normalize');
            const mapPos = yaml.indexOf('mock: map');

            expect(validatePos).toBeLessThan(normalizePos);
            expect(normalizePos).toBeLessThan(mapPos);
        });

        it('should allow multiple components per stage', () => {
            const pipeline = new StandardPipeline({
                id: 'test-pipeline',
                vendor: 'test-vendor',
                facility: 'test-facility',
                domain: 'test',
                input: mockInput,
                output: mockOutput,
                validate: [new MockComponent('val1'), new MockComponent('val2')],
                normalize: [new MockComponent('norm1')],
                map: [new MockComponent('map1'), new MockComponent('map2'), new MockComponent('map3')],
            });

            const yaml = pipeline.toYaml();

            expect(yaml).toContain('mock: val1');
            expect(yaml).toContain('mock: val2');
            expect(yaml).toContain('mock: norm1');
            expect(yaml).toContain('mock: map1');
            expect(yaml).toContain('mock: map2');
            expect(yaml).toContain('mock: map3');
        });
    });

    describe('Validation Warnings', () => {
        it('should warn when validate stage is empty', () => {
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

            new StandardPipeline({
                id: 'test-pipeline',
                vendor: 'test-vendor',
                facility: 'test-facility',
                domain: 'test',
                input: mockInput,
                output: mockOutput,
                validate: [],
                normalize: [new MockComponent('norm')],
                map: [new MockComponent('map')],
            });

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                '[StandardPipeline] Warning: validate stage is empty - consider adding validation'
            );

            consoleWarnSpy.mockRestore();
        });

        it('should warn when normalize stage is empty', () => {
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

            new StandardPipeline({
                id: 'test-pipeline',
                vendor: 'test-vendor',
                facility: 'test-facility',
                domain: 'test',
                input: mockInput,
                output: mockOutput,
                validate: [new MockComponent('val')],
                normalize: [],
                map: [new MockComponent('map')],
            });

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                '[StandardPipeline] Warning: normalize stage is empty - consider adding normalization'
            );

            consoleWarnSpy.mockRestore();
        });

        it('should warn when map stage is empty', () => {
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

            new StandardPipeline({
                id: 'test-pipeline',
                vendor: 'test-vendor',
                facility: 'test-facility',
                domain: 'test',
                input: mockInput,
                output: mockOutput,
                validate: [new MockComponent('val')],
                normalize: [new MockComponent('norm')],
                map: [],
            });

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                '[StandardPipeline] Warning: map stage is empty - consider adding mapping'
            );

            consoleWarnSpy.mockRestore();
        });

        it('should warn for all empty stages', () => {
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

            new StandardPipeline({
                id: 'test-pipeline',
                vendor: 'test-vendor',
                facility: 'test-facility',
                domain: 'test',
                input: mockInput,
                output: mockOutput,
                validate: [],
                normalize: [],
                map: [],
            });

            expect(consoleWarnSpy).toHaveBeenCalledTimes(3);

            consoleWarnSpy.mockRestore();
        });
    });

    describe('Schema Validation', () => {
        it('should accept valid configuration', () => {
            const config = {
                id: 'test-pipeline',
                vendor: 'test-vendor',
                facility: 'test-facility',
                domain: 'test',
                input: mockInput,
                output: mockOutput,
                validate: [new MockComponent('val')],
                normalize: [new MockComponent('norm')],
                map: [new MockComponent('map')],
            };

            expect(() => StandardPipelineConfigSchema.parse(config)).not.toThrow();
        });

        it('should reject configuration with processors field', () => {
            const config = {
                id: 'test-pipeline',
                vendor: 'test-vendor',
                facility: 'test-facility',
                domain: 'test',
                input: mockInput,
                output: mockOutput,
                processors: [new MockComponent('proc')], // Should not be allowed
            };

            expect(() => StandardPipelineConfigSchema.parse(config)).toThrow();
        });

        it('should use default empty arrays for stages', () => {
            const config = {
                id: 'test-pipeline',
                vendor: 'test-vendor',
                facility: 'test-facility',
                domain: 'test',
                input: mockInput,
                output: mockOutput,
            };

            const parsed = StandardPipelineConfigSchema.parse(config);

            expect(parsed.validate).toEqual([]);
            expect(parsed.normalize).toEqual([]);
            expect(parsed.map).toEqual([]);
        });
    });
});
