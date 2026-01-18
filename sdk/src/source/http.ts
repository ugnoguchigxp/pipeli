import { z } from 'zod';
import type { BentoComponent, BentoConfigObject } from '../types.js';

export const HttpSourceConfigSchema = z.object({
    address: z.string().optional().default('0.0.0.0:8080'),
    path: z.string().startsWith('/'),
    methods: z.array(z.enum(['GET', 'POST', 'PUT', 'DELETE'])).min(1),
    timeout: z.string().optional().default('30s'),
});

export type HttpSourceConfig = z.infer<typeof HttpSourceConfigSchema>;
export type HttpSourceConfigInput = z.input<typeof HttpSourceConfigSchema>;

export class HttpSource implements BentoComponent {
    private config: HttpSourceConfig;

    constructor(config: HttpSourceConfigInput) {
        this.config = HttpSourceConfigSchema.parse(config);
    }

    toBento(): BentoConfigObject {
        return {
            http_server: {
                address: this.config.address,
                path: this.config.path,
                allowed_verbs: this.config.methods,
                timeout: this.config.timeout,
            },
        };
    }
}
