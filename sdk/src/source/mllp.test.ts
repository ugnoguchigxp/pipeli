import { describe, expect, it } from 'vitest';
import { MllpSource } from './mllp.js';

describe('MllpSource', () => {
    it('should generate valid bento socket config for MLLP', () => {
        const source = new MllpSource({
            address: '0.0.0.0:2575',
        });

        const bento = source.toBento() as any;
        expect(bento.socket.network).toBe('tcp');
        expect(bento.socket.address).toBe('0.0.0.0:2575');
        expect(bento.socket.scanner.custom_delim.delimiter).toBe('\x1c\r');
    });
});
