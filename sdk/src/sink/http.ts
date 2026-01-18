import { z } from 'zod';
import type { BentoComponent, BentoConfigObject } from '../types.js';

/**
 * HTTP Sink設定スキーマ
 */
const HttpSinkConfigSchema = z.object({
    /** リクエスト先URL */
    url: z.string().url(),
    /** HTTPメソッド */
    verb: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
    /** リクエストヘッダー */
    headers: z.record(z.string()).optional(),
    /** リクエストボディのマッピング (Bloblang) */
    bodyMapping: z.string().optional(),
    /** タイムアウト */
    timeout: z.string().default('30s'),
    /** レート制限 (例: "1s" = 1秒に1回) */
    rateLimit: z.string().optional(),
    /** 成功とみなすHTTPステータスコード */
    successfulOnCodes: z.array(z.number()).optional(),
    /** Basic認証 */
    basicAuth: z
        .object({
            username: z.string(),
            password: z.string(),
        })
        .optional(),
    /** OAuth2設定 */
    oauth2: z
        .object({
            enabled: z.boolean().default(true),
            clientKey: z.string(),
            clientSecret: z.string(),
            tokenUrl: z.string(),
            scopes: z.array(z.string()).optional(),
        })
        .optional(),
    /** リトライ設定 */
    retry: z
        .object({
            maxRetries: z.number().default(3),
            initialInterval: z.string().default('500ms'),
            maxInterval: z.string().default('10s'),
        })
        .optional(),
});

export type HttpSinkConfig = z.input<typeof HttpSinkConfigSchema>;

/**
 * HTTP Sink (REST API)
 * Bentoの http_client output を使用
 */
export class HttpSink implements BentoComponent {
    private config: z.infer<typeof HttpSinkConfigSchema>;

    constructor(config: HttpSinkConfig) {
        this.config = HttpSinkConfigSchema.parse(config);
    }

    toBento(): BentoConfigObject {
        const httpConfig: Record<string, unknown> = {
            url: this.config.url,
            verb: this.config.verb,
            timeout: this.config.timeout,
        };

        if (this.config.headers) {
            httpConfig.headers = this.config.headers;
        }

        if (this.config.bodyMapping) {
            httpConfig.body = this.config.bodyMapping;
        }

        if (this.config.rateLimit) {
            httpConfig.rate_limit = this.config.rateLimit;
        }

        if (this.config.successfulOnCodes) {
            httpConfig.successful_on_codes = this.config.successfulOnCodes;
        }

        if (this.config.basicAuth) {
            httpConfig.basic_auth = {
                username: this.config.basicAuth.username,
                password: this.config.basicAuth.password,
            };
        }

        if (this.config.oauth2) {
            httpConfig.oauth2 = {
                enabled: this.config.oauth2.enabled,
                client_key: this.config.oauth2.clientKey,
                client_secret: this.config.oauth2.clientSecret,
                token_url: this.config.oauth2.tokenUrl,
            };
            if (this.config.oauth2.scopes) {
                (httpConfig.oauth2 as Record<string, unknown>).scopes = this.config.oauth2.scopes;
            }
        }

        const output: BentoConfigObject = {
            http_client: httpConfig,
        };

        // リトライ設定がある場合はラップ
        if (this.config.retry) {
            return {
                retry: {
                    max_retries: this.config.retry.maxRetries,
                    initial_interval: this.config.retry.initialInterval,
                    max_interval: this.config.retry.maxInterval,
                    output: output,
                },
            };
        }

        return output;
    }
}
