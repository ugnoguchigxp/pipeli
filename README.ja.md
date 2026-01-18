# Pipeli

> 🌐 [English README](./README.md)

Bento (WarpStream) をランタイムとしたデータ取り込みパイプラインを、TypeScript SDK で「Pipeline as a Code」として定義・管理する基盤です。

## 🚀 特徴

- **Code-First**: パイプラインを TypeScript で定義し、Bento 互換の YAML を自動生成
- **Type-Safe**: Drizzle ORM スキーマと連携し、DB カラム名の不一致をビルド時に検知
- **医療ドメイン対応**: MLLP, HL7 v2, 固定長データ, Shift-JIS などに標準対応
- **テスト済み**: Vitest によるユニットテスト（カバレッジ 90% 以上）

## 📂 ディレクトリ構造

```text
.
├── sdk/                # Pipeline SDK (TypeScript)
│   └── src/            # SDK ソースコード & テスト (*.test.ts)
├── pipelines/          # パイプライン定義
│   ├── src/            # 各ベンダー/施設ごとの定義
│   └── dist/           # 生成された Bento YAML
├── db/                 # Drizzle ORM スキーマ & マイグレーション
│   └── schema.ts       # テーブル定義（ここを参照）
├── docs/               # ドキュメント
│   └── how-to-write-pipeline.md  # パイプライン開発ガイド
└── docker-compose.yml  # 開発環境構成
```

## 🛠 セットアップ

### 1. 依存関係のインストール
```bash
bun install
```

### 2. 環境変数の設定
```bash
cp .env.example .env
# .env を編集して DB 接続情報を設定
```

### 3. SDK のビルドとパイプライン生成
```bash
cd sdk && bun run build
cd ../pipelines && bun run build
```

### 4. ミドルウェアの起動 (DBなど)
```bash
docker compose up -d
```

## 🏃‍♂️ パイプラインの実行

本番環境では、アプリケーション（TypeScript / Rails）から SDK の提供する Wrapper 経由でパイプラインを実行します。
これにより、環境設定や細かいオプションをコードで管理できます。

### 前提条件
実行環境には `bento` (Redpanda Connect) のバイナリがインストールされ、PATH が通っている必要があります。

### CLI Wrapper の使用
`pipelines` パッケージには `bun run run` コマンドが用意されています。

```bash
cd pipelines
bun run run vendor-a-patient-sync
```

### TypeScript (Node.js) からの利用
SDK の `PipelineRunner` クラスを使用します。

```typescript
import { PipelineRunner } from 'pipeli-sdk';

const runner = new PipelineRunner({ distDir: './pipelines/dist' });
await runner.run('vendor-a-patient-sync');
```

### Ruby on Rails からの利用
Rails アプリケーションからは、Wrapper スクリプトを `system` コマンド等で呼び出します。

```ruby
def run_pipeline(pipeline_id)
  # pipelines ディレクトリのスクリプトを実行
  # 必要に応じて環境変数をセットしてください
  cmd = "cd pipelines && bun run run #{pipeline_id}"
  
  unless system(cmd)
    raise "Pipeline execution failed: #{pipeline_id}"
  end
end
```

## 🧪 テスト

```bash
cd sdk && bun run test           # テスト実行
cd sdk && bun run test:coverage  # カバレッジ付き
```

## 📖 パイプラインの書き方

詳細は **[how-to-write-pipeline.md](./docs/how-to-write-pipeline.md)** を参照してください。

### プロファイルベースアーキテクチャ

v1.1.0 から、HL7や固定長データのベンダー固有の差異を**プロファイル**として定義できるようになりました。

**従来のTemplateベース:**
- ベンダーごとにパイプラインを個別作成
- フィールド位置の違いがパイプライン内に埋もれる

**新しいProfileベース:**
- ベンダー固有の設定をプロファイルとして分離
- パイプラインは正規化されたフィールド名で統一的に処理
- 新ベンダー追加時はプロファイルだけ追加すればOK

### 簡単な例（Profileベース）

```typescript
import { Pipeline, Source, Transform, Sink, profileRegistry } from 'pipeli-sdk';
import { patients } from './db/schema';

// プロファイルを取得（事前に登録済み）
const profile = profileRegistry.get('vendor_x', 'adt-profile');

const pipeline = new Pipeline({
  id: 'hospital-a-adt',
  vendor: 'vendor_x',
  facility: 'hosp_001',
  domain: 'patient',

  input: Source.mllp({ address: '0.0.0.0:2575' }),

  processors: [
    // プロファイルベースのパース
    Transform.hl7WithProfile(profile),
    Transform.validate(['patientId']),
  ],

  output: Sink.postgres({
    schema: patients,
    mode: 'upsert',
    idempotencyKey: ['sourceId'],
    mapping: {
      vendor: { literal: 'vendor_x' },
      facility: { literal: 'hosp_001' },
      sourceId: 'this.patientId',      // 正規化済み
      familyName: 'this.familyName',   // 正規化済み
    }
  })
});

pipeline.synth('./dist');
```
