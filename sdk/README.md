# pipeli-sdk

**Pipeli SDK** は、TypeScript でデータパイプラインを定義するためのツールキットです。
医療データの取り込み（HL7 v2, DICOM, JAHIS等）に特化しており、型安全なデータ変換と柔軟な入出力（MLLP, Socket, SFTP, DB等）を提供します。

## 特徴

- **医療ドメイン対応**: HL7, DICOM, JAHIS, レセ電などの国内向け医療規格を標準サポート。
- **Type-Safe**: TypeScript によるスキーマ定義と連携し、データフローをコードとして定義。
- **マルチランタイム**: Node.js および Bun で動作。内部的には Bento (WarpStream) との高い互換性を持ちます。

## インストール

```bash
npm install pipeli-sdk
# or
bun add pipeli-sdk
```

## クイックスタート

### 1. パイプラインの定義

```typescript
import { Pipeline, Source, Sink, Transform } from 'pipeli-sdk';

const pipeline = new Pipeline({
  id: 'my-healthcare-pipeline',
  vendor: 'general-vendor',
  facility: 'hospital-01',
  domain: 'patient',
  input: Source.socket({ address: '0.0.0.0:5000' }),
  processors: [
    Transform.parseJson(),
    Transform.map({
      patient_id: 'this.id',
      raw: 'this'
    })
  ],
  output: Sink.stdout()
});
```

### 2. 実行

```typescript
import { PipelineRunner } from 'pipeli-sdk';

const runner = new PipelineRunner({ distDir: './dist' });
await runner.run('my-healthcare-pipeline'); // dist/my-healthcare-pipeline.yaml を実行
```

## 医療規格の利用

HL7 や DICOM のパースのみを単独で行いたい場合も、SDK の Parser 層を直接利用できます。

```typescript
import { HL7Parser } from 'pipeli-sdk';

const parser = new HL7Parser(); // 必要に応じてプロファイルを渡す
const result = parser.parse('MSH|^~\\&|...');
```

## ライセンス

MIT
