import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const srcDir = path.join(process.cwd(), 'src');

/**
 * すべての .ts 定義ファイルを再帰的に検索して実行する
 */
function findAndRun(dir: string) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            findAndRun(fullPath);
        } else if (file.endsWith('.ts')) {
            console.log(`[Build] Synthesizing: ${fullPath}`);
            try {
                // bun を使用して各定義ファイルを直接実行 (高速・ESM対応)
                execSync(`bun ${fullPath}`, { stdio: 'inherit' });
            } catch (e) {
                console.error(`[Build] Failed to synthesize ${file}:`, e);
            }
        }
    }
}

console.log('[Build] Starting pipeline synthesis...');
findAndRun(srcDir);
console.log('[Build] Finished.');
