import { pgTable, text } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { Sink } from './postgres.js';

const testTable = pgTable('test_table', {
    id: text('id').primaryKey(),
});

describe('Sink factory', () => {
    it('should create PostgresSink', () => {
        const s = Sink.postgres({
            schema: testTable,
            mode: 'insert',
            idempotencyKey: [],
            mapping: { id: 'this.id' },
        });
        expect(s.constructor.name).toBe('PostgresSink');
    });
});
