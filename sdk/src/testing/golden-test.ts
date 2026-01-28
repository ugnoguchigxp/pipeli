import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect, it } from 'vitest';
import { PipelineRunner } from '../runner.js';
import { Pipeline, type PipelineConfigInput } from '../pipeline.js';

export interface GoldenTestOptions {
    /** 
     * テストデータディレクトリ
     * Structure:
     *   /test-data/
     *     /raw/input.txt
     *     /golden/expected.json
     */
    testDataDir: string;
    /** 生成されたYAMLを出力するディレクトリ */
    distDir?: string;
    /** Bentoの実行ファイルパス */
    bentoPath?: string;
    /** テスト後に一時ファイルをクリーンアップするか */
    cleanup?: boolean;
    /** 比較モード: 'strict' (完全一致) | 'json' (JSON比較のみ) | 'text' (テキスト比較のみ) */
    compareMode?: 'strict' | 'json' | 'text';
}

/**
 * ゴールデンテスト（回帰テスト）を実行するユーティリティ
 */
export class GoldenTester {
    private runner: PipelineRunner;
    private options: GoldenTestOptions;

    constructor(options: GoldenTestOptions) {
        this.options = {
            distDir: './dist/test',
            cleanup: false,
            compareMode: 'strict',
            ...options
        };
        this.runner = new PipelineRunner({
            distDir: this.options.distDir,
            bentoPath: this.options.bentoPath,
        });
    }

    /**
     * 指定されたコンフィグでパイプラインを生成し、
     * rawデータを与えて実行結果が goldenデータと一致するか検証する
     */
    async runTest(config: PipelineConfigInput, inputFilename: string, goldenFilename: string) {
        const testDataDir = path.resolve(this.options.testDataDir);
        const rawPath = path.join(testDataDir, 'raw', inputFilename);
        const goldenPath = path.join(testDataDir, 'golden', goldenFilename);

        if (!fs.existsSync(rawPath)) {
            throw new Error(`Raw input file not found: ${rawPath}`);
        }

        // 1. パイプラインYAMLの生成
        // テスト用の出力をファイルに落とすように一時的に書き換える
        const testPipelineId = `${config.id}_test`;
        const testOutputDir = path.join(this.options.distDir || './dist/test', 'results');
        if (!fs.existsSync(testOutputDir)) {
            fs.mkdirSync(testOutputDir, { recursive: true });
        }
        const actualResultPath = path.join(testOutputDir, `${testPipelineId}_actual.json`);

        const testConfig: PipelineConfigInput = {
            ...config,
            id: testPipelineId,
            // input はファイル入力に固定
            input: {
                toBento: () => ({
                    file: {
                        paths: [rawPath],
                        codec: 'all-bytes',
                    }
                })
            },
            // output はファイル出力に固定
            output: {
                toBento: () => ({
                    file: {
                        path: actualResultPath,
                        codec: 'all-bytes',
                    }
                })
            }
        };

        const pipeline = new Pipeline(testConfig);
        pipeline.synth(this.options.distDir);

        // 2. パイプライン実行
        await this.runner.run(testPipelineId);

        // 3. 結果比較
        if (!fs.existsSync(actualResultPath)) {
            throw new Error(`Pipeline execution did not produce output at: ${actualResultPath}`);
        }

        const actualContent = fs.readFileSync(actualResultPath, 'utf8');

        // ゴールデンファイルが存在しない場合は、今の結果を正解として保存（初期化用）
        if (!fs.existsSync(goldenPath)) {
            if (!fs.existsSync(path.dirname(goldenPath))) {
                fs.mkdirSync(path.dirname(goldenPath), { recursive: true });
            }
            fs.writeFileSync(goldenPath, actualContent, 'utf8');
            console.log(`[GoldenTest] Initial golden file created at: ${goldenPath}`);
            return;
        }

        const expectedContent = fs.readFileSync(goldenPath, 'utf8');

        // 比較モードに応じた比較
        this.compareResults(actualContent, expectedContent, this.options.compareMode || 'strict');

        // クリーンアップ
        if (this.options.cleanup) {
            try {
                fs.unlinkSync(actualResultPath);
                const yamlPath = path.join(this.options.distDir || './dist/test', `${testPipelineId}.yaml`);
                if (fs.existsSync(yamlPath)) {
                    fs.unlinkSync(yamlPath);
                }
            } catch (e) {
                // クリーンアップエラーは無視
            }
        }
    }

    private compareResults(actual: string, expected: string, mode: 'strict' | 'json' | 'text') {
        if (mode === 'text') {
            if (actual.trim() !== expected.trim()) {
                throw new Error(
                    `Golden test failed (text mode):\n\n` +
                    `Expected:\n${this.truncate(expected)}\n\n` +
                    `Actual:\n${this.truncate(actual)}\n`
                );
            }
            return;
        }

        // JSON比較を試みる
        try {
            const actualJson = JSON.parse(actual);
            const expectedJson = JSON.parse(expected);

            const actualStr = JSON.stringify(actualJson, null, 2);
            const expectedStr = JSON.stringify(expectedJson, null, 2);

            if (actualStr !== expectedStr) {
                throw new Error(
                    `Golden test failed (JSON mode):\n\n` +
                    `Expected:\n${this.truncate(expectedStr)}\n\n` +
                    `Actual:\n${this.truncate(actualStr)}\n`
                );
            }
        } catch (e) {
            if (mode === 'strict') {
                // strict モードでJSONパースに失敗した場合はテキスト比較にフォールバック
                if (actual.trim() !== expected.trim()) {
                    throw new Error(
                        `Golden test failed (strict mode, text fallback):\n\n` +
                        `Expected:\n${this.truncate(expected)}\n\n` +
                        `Actual:\n${this.truncate(actual)}\n`
                    );
                }
            } else {
                // json モードでパースに失敗した場合はエラー
                throw new Error(`Failed to parse JSON for comparison: ${e}`);
            }
        }
    }

    /**
     * 長い文字列を切り詰める（差分表示用）
     */
    private truncate(str: string, maxLines: number = 50): string {
        const lines = str.split('\n');
        if (lines.length <= maxLines) {
            return str;
        }
        return lines.slice(0, maxLines).join('\n') + `\n... (${lines.length - maxLines} more lines)`;
    }
}

/**
 * Vitest用の一括実行ヘルパー
 */
export function defineGoldenTests(options: GoldenTestOptions, cases: { config: PipelineConfigInput, input: string, golden: string }[]) {
    const tester = new GoldenTester(options);

    cases.forEach((c) => {
        it(`Golden Test: ${c.config.id} (${c.input})`, async () => {
            await tester.runTest(c.config, c.input, c.golden);
        });
    });
}
