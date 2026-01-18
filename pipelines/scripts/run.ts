import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PipelineRunner } from 'pipeli-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CLI引数からパイプラインIDを取得
const args = process.argv.slice(2);
const pipelineId = args[0];

if (!pipelineId) {
    console.error('\x1b[31mError: Pipeline ID is required.\x1b[0m');
    console.error('Usage:   bun run scripts/run.ts <pipeline-id>');
    console.error('Example: bun run scripts/run.ts vendor-a-patient-sync');
    process.exit(1);
}

// パイプライン実行
// distディレクトリはスクリプトの親ディレクトリの兄弟にある dist を想定
const distDir = path.resolve(__dirname, '../dist');

const runner = new PipelineRunner({
    distDir: distDir,
    // 必要に応じて bentoPath 指定 (デフォルトは PATH 上の 'bento')
});

runner
    .run(pipelineId)
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Execution Failed:');
        console.error(err);
        process.exit(1);
    });
