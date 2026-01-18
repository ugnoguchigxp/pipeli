# Pipeli プロジェクト引き継ぎドキュメント

このドキュメントは、フォルダ名変更後の新しいセッションに引き継ぐための情報をまとめています。

---

## 📋 プロジェクト概要

| 項目 | 内容 |
|------|------|
| **プロダクト名** | Pipeli |
| **ドメイン** | pipeli.org |
| **npm scope** | `@pipeli` |
| **ライセンス** | MIT |
| **言語** | TypeScript |
| **ランタイム** | Bento (WarpStream) |

---

## 🎯 プロダクトの目的

**Pipeline as a Code** プラットフォーム。TypeScript SDKでデータ取り込みパイプラインを定義し、Bento互換のYAMLを自動生成する。

### 主な特徴
- **医療ドメイン特化**: MLLP, HL7 v2, DICOM, JAHIS対応
- **プロファイルベースアーキテクチャ**: ベンダー固有の差異をプロファイルとして分離
- **Type-Safe**: Drizzle ORMスキーマと連携

---

## 📂 ディレクトリ構造

```
pipeli/
├── sdk/            # @pipeli/sdk - Pipeline SDK
├── pipelines/      # @pipeli/pipelines - パイプライン定義
├── api/            # @pipeli/api - 匿名化API
├── db/             # Drizzle ORM スキーマ
├── docs/           # ドキュメント
└── bento/          # Bento設定
```

---

## ✅ 完了済みタスク（2026-01-18）

### OSS公開準備
- [x] 機密情報のクリーンアップ（`nephroflow` 参照削除）
- [x] MIT LICENSE 追加
- [x] CONTRIBUTING.md 追加
- [x] README.en.md（英語版）追加
- [x] プロジェクト名変更: ingestion-adapter → pipeli
- [x] 全テスト通過確認（242件）

### 変更されたファイル
- `package.json` → `pipeli-workspace`
- `sdk/package.json` → `@pipeli/sdk`
- `pipelines/package.json` → `@pipeli/pipelines`
- `api/package.json` → `@pipeli/api`
- 全ドキュメントのimport文更新

---

## 📝 残りのタスク

1. **フォルダ名変更**
   ```bash
   mv ingestion-adapter pipeli
   ```

2. **依存関係の再インストール**
   ```bash
   cd pipeli
   rm -rf node_modules */node_modules
   bun install
   ```

3. **GitHubリポジトリ作成**
   - Organization: pipeli
   - Repository: pipeli
   - Visibility: Public

4. **npm公開準備**（任意）
   - npm organization `@pipeli` の取得
   - `npm publish` の設定

---

## 🔧 開発コマンド

```bash
# ビルド
bun run build

# テスト
cd sdk && bun run test

# Lint/Format
bun run check

# パイプライン実行
cd pipelines && bun run run vendor-a-patient-sync
```

---

## 📚 重要ドキュメント

| ファイル | 説明 |
|----------|------|
| `docs/how-to-write-pipeline.md` | パイプライン開発ガイド |
| `docs/primary-plan.md` | アーキテクチャ設計書 |
| `CONTRIBUTING.md` | コントリビューションガイド |

---

## 🏥 対応している医療規格

| 規格 | 対応状況 |
|------|----------|
| HL7 v2.5 (ADT, ORM, OUL) | ✅ |
| DICOM | ✅ |
| JAHIS臨床検査 | ✅ |
| レセ電（固定長→CSV変換済み） | ✅ |

---

## 🔗 関連リンク

- ドメイン: https://pipeli.org
- Bento: https://warpstreamlabs.github.io/bento/
