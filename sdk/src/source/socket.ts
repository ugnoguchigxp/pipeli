import { z } from 'zod';
import type { BentoComponent, BentoConfigObject } from '../types.js';

export const SocketServerSourceConfigSchema = z.object({
    /** ネットワークタイプ: tcp, udp, unix, tls */
    network: z.enum(['tcp', 'udp', 'unix', 'tls']).default('tcp'),
    /** リッスンするアドレス（例: 0.0.0.0:4000） */
    address: z.string(),
    /** メッセージの区切り方法 */
    scanner: z
        .object({
            /** 区切り文字（デフォルト: 改行） */
            delimiter: z.string().optional(),
            /** 最大バッファサイズ（バイト） */
            maxBufferSize: z.number().optional(),
        })
        .optional(),
    /** TLS設定（network: 'tls' の場合） */
    tls: z
        .object({
            certFile: z.string().optional(),
            keyFile: z.string().optional(),
        })
        .optional(),
});

export type SocketServerSourceConfig = z.infer<typeof SocketServerSourceConfigSchema>;
export type SocketServerSourceConfigInput = z.input<typeof SocketServerSourceConfigSchema>;

/**
 * Socket Server Source
 *
 * TCP/UDP/Unixソケットでサーバーとしてリッスンし、
 * クライアントからのメッセージを受信する。
 * レガシーシステムとの連携やカスタムプロトコルに使用。
 *
 * @example TCP サーバー
 * ```typescript
 * Source.socket({
 *     network: 'tcp',
 *     address: '0.0.0.0:4000',
 *     scanner: { delimiter: '\n' },
 * })
 * ```
 *
 * @example UDP サーバー
 * ```typescript
 * Source.socket({
 *     network: 'udp',
 *     address: '0.0.0.0:4001',
 * })
 * ```
 */
export class SocketServerSource implements BentoComponent {
    private config: SocketServerSourceConfig;

    constructor(config: SocketServerSourceConfigInput) {
        this.config = SocketServerSourceConfigSchema.parse(config);
    }

    toBento(): BentoConfigObject {
        // biome-ignore lint/suspicious/noExplicitAny: dynamic config construction
        const result: any = {
            socket_server: {
                network: this.config.network,
                address: this.config.address,
            },
        };

        // スキャナー設定（メッセージ区切り）
        if (this.config.scanner) {
            result.socket_server.scanner = {};
            if (this.config.scanner.delimiter) {
                result.socket_server.scanner.lines = {
                    custom_delimiter: this.config.scanner.delimiter,
                };
            }
            if (this.config.scanner.maxBufferSize) {
                result.socket_server.scanner.max_buffer_size = this.config.scanner.maxBufferSize;
            }
        }

        // TLS設定
        if (this.config.network === 'tls' && this.config.tls) {
            result.socket_server.tls = {
                enabled: true,
                cert_file: this.config.tls.certFile,
                key_file: this.config.tls.keyFile,
            };
        }

        return result;
    }
}

/**
 * Socket Client Source
 *
 * TCP/Unixソケットにクライアントとして接続し、
 * サーバーからのメッセージを受信する。
 */
export const SocketClientSourceConfigSchema = z.object({
    /** ネットワークタイプ: tcp, unix */
    network: z.enum(['tcp', 'unix']).default('tcp'),
    /** 接続先アドレス（例: 192.168.1.100:4000） */
    address: z.string(),
    /** メッセージの区切り方法 */
    scanner: z
        .object({
            delimiter: z.string().optional(),
            maxBufferSize: z.number().optional(),
        })
        .optional(),
});

export type SocketClientSourceConfig = z.infer<typeof SocketClientSourceConfigSchema>;
export type SocketClientSourceConfigInput = z.input<typeof SocketClientSourceConfigSchema>;

export class SocketClientSource implements BentoComponent {
    private config: SocketClientSourceConfig;

    constructor(config: SocketClientSourceConfigInput) {
        this.config = SocketClientSourceConfigSchema.parse(config);
    }

    toBento(): BentoConfigObject {
        // biome-ignore lint/suspicious/noExplicitAny: dynamic config construction
        const result: any = {
            socket: {
                network: this.config.network,
                address: this.config.address,
            },
        };

        if (this.config.scanner) {
            result.socket.scanner = {};
            if (this.config.scanner.delimiter) {
                result.socket.scanner.lines = {
                    custom_delimiter: this.config.scanner.delimiter,
                };
            }
            if (this.config.scanner.maxBufferSize) {
                result.socket.scanner.max_buffer_size = this.config.scanner.maxBufferSize;
            }
        }

        return result;
    }
}
