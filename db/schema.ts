import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/**
 * 標準化された患者テーブル定義
 */
export const patients = pgTable(
    'patients',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        vendor: text('vendor').notNull(),
        facility: text('facility').notNull(),
        sourceId: text('source_id').notNull(),
        familyName: text('family_name').notNull(),
        givenName: text('given_name'),
        birthDate: text('birth_date'), // YYYY-MM-DD
        gender: text('gender'),
        createdAt: timestamp('created_at').defaultNow(),
        updatedAt: timestamp('updated_at').defaultNow(),
    },
    (table) => ({
        // UPSERT の idempotencyKey として使用される複合UNIQUE制約
        vendorFacilitySourceIdx: uniqueIndex('patients_vendor_facility_source_id_idx').on(
            table.vendor,
            table.facility,
            table.sourceId,
        ),
    }),
);

/**
 * 監査ログテーブル定義
 */
export const auditLogs = pgTable('audit_logs', {
    id: uuid('id').primaryKey().defaultRandom(),
    pipelineId: text('pipeline_id').notNull(),
    sourceId: text('source_id'),
    rawContent: text('raw_content'),
    normalizedContent: text('normalized_content'),
    hash: text('hash'),
    createdAt: timestamp('created_at').defaultNow(),
});
