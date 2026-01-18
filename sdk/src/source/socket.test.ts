import { describe, expect, it } from 'vitest';
import { SocketClientSource, SocketServerSource } from './socket.js';

describe('SocketServerSource', () => {
    it('should generate basic TCP server configuration', () => {
        const source = new SocketServerSource({
            network: 'tcp',
            address: '0.0.0.0:4000',
        });
        const bento = source.toBento() as any;

        expect(bento.socket_server).toBeDefined();
        expect(bento.socket_server.network).toBe('tcp');
        expect(bento.socket_server.address).toBe('0.0.0.0:4000');
        expect(bento.socket_server.tls).toBeUndefined();
    });

    it('should generate scanner configuration', () => {
        const source = new SocketServerSource({
            network: 'tcp',
            address: '0.0.0.0:4000',
            scanner: {
                delimiter: '\n',
                maxBufferSize: 1024,
            },
        });
        const bento = source.toBento() as any;

        expect(bento.socket_server.scanner).toBeDefined();
        expect(bento.socket_server.scanner.lines.custom_delimiter).toBe('\n');
        expect(bento.socket_server.scanner.max_buffer_size).toBe(1024);
    });

    it('should generate TLS configuration', () => {
        const source = new SocketServerSource({
            network: 'tls',
            address: '0.0.0.0:443',
            tls: {
                certFile: '/path/to/cert',
                keyFile: '/path/to/key',
            },
        });
        const bento = source.toBento() as any;

        expect(bento.socket_server.network).toBe('tls');
        expect(bento.socket_server.tls).toBeDefined();
        expect(bento.socket_server.tls.enabled).toBe(true);
        expect(bento.socket_server.tls.cert_file).toBe('/path/to/cert');
        expect(bento.socket_server.tls.key_file).toBe('/path/to/key');
    });

    it('should throw error if address is missing', () => {
        expect(() => {
            new SocketServerSource({} as any);
        }).toThrow();
    });
});

describe('SocketClientSource', () => {
    it('should generate basic TCP client configuration', () => {
        const source = new SocketClientSource({
            network: 'tcp',
            address: '192.168.1.1:8000',
        });
        const bento = source.toBento() as any;

        expect(bento.socket).toBeDefined();
        expect(bento.socket.network).toBe('tcp');
        expect(bento.socket.address).toBe('192.168.1.1:8000');
    });

    it('should generate scanner configuration for client', () => {
        const source = new SocketClientSource({
            network: 'unix',
            address: '/tmp/socket.sock',
            scanner: {
                delimiter: '\r\n',
            },
        });
        const bento = source.toBento() as any;

        expect(bento.socket.network).toBe('unix');
        expect(bento.socket.scanner.lines.custom_delimiter).toBe('\r\n');
    });

    it('should include maxBufferSize for client scanner', () => {
        const source = new SocketClientSource({
            network: 'tcp',
            address: '127.0.0.1:9000',
            scanner: {
                maxBufferSize: 2048,
            },
        });
        const bento = source.toBento() as any;

        expect(bento.socket.scanner.max_buffer_size).toBe(2048);
    });

    it('should throw error for invalid network type', () => {
        expect(() => {
            new SocketClientSource({
                network: 'udp' as any, // client does not support udp in schema
                address: '1.1.1.1',
            });
        }).toThrow();
    });
});
