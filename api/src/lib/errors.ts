/**
 * アプリケーション基底エラークラス
 */
export class AppError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly statusCode: number = 500,
        public readonly meta?: Record<string, unknown>,
    ) {
        super(message);
        this.name = 'AppError';
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * バリデーションエラー
 */
export class ValidationError extends AppError {
    constructor(message: string, meta?: Record<string, unknown>) {
        super(message, 'VALIDATION_ERROR', 400, meta);
        this.name = 'ValidationError';
    }
}

/**
 * ジョブ処理エラー
 */
export class JobProcessingError extends AppError {
    constructor(message: string, meta?: Record<string, unknown>) {
        super(message, 'JOB_PROCESSING_ERROR', 500, meta);
        this.name = 'JobProcessingError';
    }
}

/**
 * 設定エラー
 */
export class ConfigurationError extends AppError {
    constructor(message: string, meta?: Record<string, unknown>) {
        super(message, 'CONFIGURATION_ERROR', 500, meta);
        this.name = 'ConfigurationError';
    }
}
