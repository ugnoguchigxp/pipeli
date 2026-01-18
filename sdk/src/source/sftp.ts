import { z } from 'zod';
import type { BentoComponent, BentoConfigObject } from '../types.js';

export const SftpSourceConfigSchema = z.object({
    host: z.string(),
    port: z.number().default(22),
    user: z.string(),
    password: z.string().optional(),
    privateKeyFile: z.string().optional(),
    path: z.string(),
    watcher: z
        .object({
            enabled: z.boolean().default(true),
            minimumAge: z.string().default('1s'),
            pollInterval: z.string().default('1s'),
        })
        .default({}),
});

export type SftpSourceConfig = z.infer<typeof SftpSourceConfigSchema>;
export type SftpSourceConfigInput = z.input<typeof SftpSourceConfigSchema>;

export class SftpSource implements BentoComponent {
    private config: SftpSourceConfig;

    constructor(config: SftpSourceConfigInput) {
        this.config = SftpSourceConfigSchema.parse(config);
    }

    toBento(): BentoConfigObject {
        return {
            sftp: {
                address: `${this.config.host}:${this.config.port}`,
                credentials: {
                    user: this.config.user,
                    password: this.config.password,
                    private_key_file: this.config.privateKeyFile,
                },
                paths: [this.config.path],
                watcher: this.config.watcher
                    ? {
                          enabled: this.config.watcher.enabled,
                          minimum_age: this.config.watcher.minimumAge,
                          poll_interval: this.config.watcher.pollInterval,
                      }
                    : undefined,
            },
        };
    }
}
