import { describe, expect, it } from 'vitest';
import { HttpSource } from './http.js';
import { Source } from './index.js';
import { MllpSource } from './mllp.js';
import { SftpSource } from './sftp.js';

describe('Source factory', () => {
    it('should create HttpSource', () => {
        const s = Source.http({ path: '/t', methods: ['GET'] });
        expect(s).toBeInstanceOf(HttpSource);
    });

    it('should create SftpSource', () => {
        const s = Source.sftp({ host: 'h', user: 'u', path: 'p' });
        expect(s).toBeInstanceOf(SftpSource);
    });

    it('should create MllpSource', () => {
        const s = Source.mllp({ address: 'a' });
        expect(s).toBeInstanceOf(MllpSource);
    });
});
