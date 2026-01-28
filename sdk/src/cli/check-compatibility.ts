import * as fs from 'node:fs';
import { ProfileCompatibilityChecker } from '../profile/compatibility.js';
import type { HL7Profile } from '../profile/hl7-profile.js';

/**
 * Profile Compatibility Checker CLI
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        printUsage();
        process.exit(1);
    }

    const oldProfilePath = args[0];
    const newProfilePath = args[1];
    const format = args.find((a: string) => a.startsWith('--format='))?.split('=')[1] || 'text';
    const exitOnBreaking = args.includes('--exit-on-breaking');
    const suggestVersion = args.includes('--suggest-version');

    // プロファイル読み込み
    if (!fs.existsSync(oldProfilePath)) {
        console.error(`Error: Old profile not found: ${oldProfilePath}`);
        process.exit(1);
    }

    if (!fs.existsSync(newProfilePath)) {
        console.error(`Error: New profile not found: ${newProfilePath}`);
        process.exit(1);
    }

    let oldProfile: HL7Profile;
    let newProfile: HL7Profile;

    try {
        oldProfile = JSON.parse(fs.readFileSync(oldProfilePath, 'utf8'));
        newProfile = JSON.parse(fs.readFileSync(newProfilePath, 'utf8'));
    } catch (e) {
        console.error(`Error: Failed to parse profile JSON:`, e instanceof Error ? e.message : e);
        process.exit(1);
    }

    // 互換性チェック
    const checker = new ProfileCompatibilityChecker();
    const issues = checker.checkHL7(oldProfile, newProfile);

    // 出力
    if (format === 'json') {
        const output: any = { issues };

        if (suggestVersion) {
            const currentVersion = oldProfile.profileVersion || '1.0.0';
            output.suggestedVersion = checker.suggestVersion(currentVersion, issues);
            output.currentVersion = currentVersion;
        }

        console.log(JSON.stringify(output, null, 2));
    } else {
        console.log(checker.formatIssues(issues));

        if (suggestVersion) {
            const currentVersion = oldProfile.profileVersion || '1.0.0';
            const suggested = checker.suggestVersion(currentVersion, issues);
            console.log(`\nVersion Suggestion:`);
            console.log(`  Current: ${currentVersion}`);
            console.log(`  Suggested: ${suggested}`);
        }
    }

    // 終了コード
    const hasBreaking = issues.some(i => i.type === 'BREAKING');
    if (exitOnBreaking && hasBreaking) {
        process.exit(1);
    }
}

function printUsage() {
    console.log(`
Profile Compatibility Checker

Usage:
  node dist/cli/check-compatibility.js <old-profile.json> <new-profile.json> [options]

Options:
  --format=text|json     Output format (default: text)
  --exit-on-breaking     Exit with code 1 if breaking changes detected
  --suggest-version      Suggest next version number based on changes

Examples:
  # Check compatibility and exit on breaking changes (for CI/CD)
  node dist/cli/check-compatibility.js profiles/v1.json profiles/v2.json --exit-on-breaking

  # Get version suggestion
  node dist/cli/check-compatibility.js profiles/v1.json profiles/v2.json --suggest-version

  # JSON output for automation
  node dist/cli/check-compatibility.js profiles/v1.json profiles/v2.json --format=json
`);
}

// CLI entry point
main().catch(console.error);
