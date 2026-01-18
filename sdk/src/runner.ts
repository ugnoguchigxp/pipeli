import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface Logger {
    info: (message: string) => void;
    error: (message: string) => void;
}

export interface RunnerOptions {
    /** 生成されたYAMLファイルのあるディレクトリ (デフォルト: ./dist) */
    distDir?: string;
    /** Bentoの実行ファイルパス (デフォルト: bento) */
    bentoPath?: string;
    /** 環境変数 (デフォルト: process.env) */
    env?: NodeJS.ProcessEnv;
    /** ロガー (デフォルト: console) */
    logger?: Logger;
}

/**
 * Bento パイプラインを実行するためのラッパー
 */
export class PipelineRunner {
    private distDir: string;
    private bentoPath: string;
    private env: NodeJS.ProcessEnv;
    private logger: Logger;

    constructor(options: RunnerOptions = {}) {
        this.distDir = options.distDir ? path.resolve(options.distDir) : path.resolve(process.cwd(), 'dist');
        this.bentoPath = options.bentoPath || 'bento';
        this.env = options.env || process.env;
        this.logger = options.logger || console;
    }

    /**
     * パイプラインを実行する
     * @param pipelineId パイプラインID (YAMLファイル名、拡張子なしでも可)
     * @returns 終了コード
     */
    async run(pipelineId: string): Promise<number> {
        const yamlFile = pipelineId.endsWith('.yaml') ? pipelineId : `${pipelineId}.yaml`;
        const configPath = path.join(this.distDir, yamlFile);

        if (!fs.existsSync(configPath)) {
            throw new Error(`Pipeline config not found: ${configPath}`);
        }

        this.logger.info(`[Runner] Starting pipeline: ${pipelineId}`);
        this.logger.info(`[Runner] Config: ${configPath}`);

        return new Promise((resolve, reject) => {
            // bento -c config.yaml
            const args = ['-c', configPath];

            const child = spawn(this.bentoPath, args, {
                stdio: 'inherit',
                env: this.env,
            });

            child.on('close', (code) => {
                if (code === 0) {
                    this.logger.info(`[Runner] Pipeline finished successfully.`);
                    resolve(0);
                } else {
                    const msg = `[Runner] Pipeline failed with code ${code}`;
                    this.logger.error(msg);
                    reject(new Error(msg));
                }
            });

            child.on('error', (err) => {
                this.logger.error(`[Runner] Failed to start bento: ${err.message}`);
                reject(err);
            });
        });
    }
}
