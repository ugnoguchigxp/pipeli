import { describe, expect, it } from 'vitest';
import { SftpSource } from './sftp.js';

describe('SftpSource', () => {
    it('should generate valid bento config', () => {
        const source = new SftpSource({
            host: 'sftp.example.com',
            user: 'user1',
            password: 'password1',
            path: '/data/*.csv',
        });

        const bento = source.toBento() as any;
        expect(bento.sftp.address).toBe('sftp.example.com:22');
        expect(bento.sftp.credentials.user).toBe('user1');
        expect(bento.sftp.paths).toContain('/data/*.csv');
        expect(bento.sftp.watcher.enabled).toBe(true);
    });

    it('should override port and watcher settings', () => {
        const source = new SftpSource({
            host: 'sftp.example.com',
            port: 2222,
            user: 'user1',
            path: '/data',
            watcher: {
                enabled: false,
                minimumAge: '10s',
                pollInterval: '5s',
            },
        });

        const bento = source.toBento() as any;
        expect(bento.sftp.address).toBe('sftp.example.com:2222');
        expect(bento.sftp.watcher.enabled).toBe(false);
    });

    it('should handle missing watcher', () => {
        const source = new SftpSource({
            host: 'h',
            user: 'u',
            path: 'p',
        });
        (source as any).config.watcher = undefined;
        const bento = source.toBento() as any;
        expect(bento.sftp.watcher).toBeUndefined();
    });
});
