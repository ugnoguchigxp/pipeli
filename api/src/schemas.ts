import { z } from 'zod';

// ========================================
// 匿名化設定スキーマ
// ========================================

/**
 * マスキング設定
 */
export const MaskConfigSchema = z.object({
    field: z.string(),
    keep: z.enum(['first1', 'first2', 'last4', 'domain', 'none']).default('none'),
    maskChar: z.string().default('*'),
});

/**
 * 日付一般化設定
 */
export const GeneralizeDateConfigSchema = z.object({
    field: z.string(),
    precision: z.enum(['month', 'year']).default('month'),
});

/**
 * 匿名化リクエストスキーマ
 */
export const AnonymizeRequestSchema = z
    .object({
        /** 匿名化するデータ */
        data: z.record(z.unknown()),

        /** 匿名化設定 */
        config: z
            .object({
                /** SHA-256でハッシュ化するフィールド */
                hash: z.array(z.string()).optional(),
                /** ハッシュ化時のソルト */
                hashSalt: z.string().optional(),

                /** HMAC-SHA256でハッシュ化するフィールド */
                hmac: z
                    .object({
                        fields: z.array(z.string()),
                        secretKey: z.string(),
                    })
                    .optional(),

                /** マスキングするフィールド */
                mask: z.array(MaskConfigSchema).optional(),

                /** 年齢を範囲に一般化するフィールド */
                generalizeAge: z
                    .object({
                        field: z.string(),
                        ranges: z.array(z.number()).optional(),
                    })
                    .optional(),

                /** 日付を一般化するフィールド */
                generalizeDate: GeneralizeDateConfigSchema.optional(),

                /** 郵便番号を一般化するフィールド */
                generalizePostalCode: z
                    .object({
                        field: z.string(),
                        keepDigits: z.number().int().min(1).default(3),
                    })
                    .optional(),

                /** 完全に削除するフィールド */
                redact: z.array(z.string()).optional(),

                /** 保持するフィールドのみ（許可リスト） */
                allowlist: z.array(z.string()).optional(),
            })
            .strict(),
    })
    .strict();

export type AnonymizeRequest = z.infer<typeof AnonymizeRequestSchema>;
export type MaskConfig = z.infer<typeof MaskConfigSchema>;
