import { z } from 'zod';
import type { BentoComponent, BentoConfigObject } from '../types.js';

export const MllpSourceConfigSchema = z.object({
    address: z.string().default('0.0.0.0:2575'),
    max_buffer: z.number().default(1000000),
});

export type MllpSourceConfig = z.infer<typeof MllpSourceConfigSchema>;
export type MllpSourceConfigInput = z.input<typeof MllpSourceConfigSchema>;

export class MllpSource implements BentoComponent {
    private config: MllpSourceConfig;

    constructor(config: MllpSourceConfigInput) {
        this.config = MllpSourceConfigSchema.parse(config);
    }

    toBento(): BentoConfigObject {
        return {
            socket: {
                network: 'tcp',
                address: this.config.address,
                scanner: {
                    custom_delim: {
                        // MLLP Framing: Start Block (\v or \x0b), End Block (\x1c), Trailer (\r or \x0d)
                        // Bento の scanner はデリミタでメッセージを区切るため、
                        // 実際にはデリミタ自体を除去するか、プロセッサで調整する必要があります。
                        // ここでは標準的な HL7 終端文字 (\x1c\r) を指定します。
                        delimiter: '\x1c\r',
                    },
                },
            },
        };
    }
}
