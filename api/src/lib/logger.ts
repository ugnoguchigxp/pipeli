/**
 * ロガーインターフェース
 */
export interface Logger {
    info: (message: string, meta?: unknown) => void;
    error: (message: string, meta?: unknown) => void;
    warn: (message: string, meta?: unknown) => void;
    debug: (message: string, meta?: unknown) => void;
}

/**
 * コンソールベースのロガー実装
 */
export class ConsoleLogger implements Logger {
    private readonly serviceTag = 'ingestion-adapter';
    private readonly componentTag = process.env.LOG_COMPONENT?.trim() || 'bun-hono';

    constructor(private level: 'debug' | 'info' | 'warn' | 'error' = 'info') {}

    private shouldLog(level: string): boolean {
        const levels = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.level);
    }

    private enrichMeta(meta?: unknown): Record<string, unknown> {
        const baseMeta: Record<string, unknown> = {
            service: this.serviceTag,
            component: this.componentTag,
        };

        if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
            return { ...baseMeta, ...(meta as Record<string, unknown>) };
        }

        if (meta !== undefined) {
            return { ...baseMeta, meta };
        }

        return baseMeta;
    }

    private format(level: string, message: string, meta?: unknown): string {
        const timestamp = new Date().toISOString();
        const metaStr = ` ${JSON.stringify(this.enrichMeta(meta))}`;
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
    }

    info(message: string, meta?: unknown): void {
        if (this.shouldLog('info')) {
            console.log(this.format('info', message, meta));
        }
    }

    error(message: string, meta?: unknown): void {
        if (this.shouldLog('error')) {
            console.error(this.format('error', message, meta));
        }
    }

    warn(message: string, meta?: unknown): void {
        if (this.shouldLog('warn')) {
            console.warn(this.format('warn', message, meta));
        }
    }

    debug(message: string, meta?: unknown): void {
        if (this.shouldLog('debug')) {
            console.debug(this.format('debug', message, meta));
        }
    }
}

/**
 * シングルトンロガーインスタンス
 */
export const logger = new ConsoleLogger((process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info');
