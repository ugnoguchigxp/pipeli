# How to Write Pipeline (Pipeline Development Guide)

このドキュメントは、TypeScript SDK を使用して新しいデータ取り込みパイプラインを作成するための完全なガイドです。
**AI アシスタントが新しいパイプラインファイルを生成する際、この定義とルールを厳守してください。**

---

## 1. デザイン原則

- **Code-First**: YAML を直接編集せず、TypeScript でパイプラインを定義します。
- **Type-Safety**: 宛先テーブルのスキーマ（Drizzle ORM）を参照し、物理カラム名の不一致を防ぎます。
- **Modularity**: 入力 (Source)、変換 (Transform)、出力 (Sink) を組み合わせて構築します。

---

## 2. パイプラインファイルの基本構造

すべてのパイプラインファイルは `pipelines/src/` 配下に配置し、以下の構造を持つ必要があります。

```typescript
import { Pipeline, Source, Transform, Sink } from '@pipeli/sdk';
import { patients } from '../../db/schema'; // Drizzle スキーマを必ずインポート

const pipeline = new Pipeline({
  id: 'unique-pipeline-id', // システム内で一意なID（YAMLのファイル名に使用）
  vendor: 'vendor_name',    // 識別用（必須）
  facility: 'facility_id',  // 識別用（必須）
  domain: 'patient',        // 取り込み対象ドメイン（必須）

  input: Source.xxx({ ... }),

  processors: [
    Transform.xxx(...),
  ],

  output: Sink.postgres({ ... }),
});

// dist/ 配下に YAML を出力
pipeline.synth('./dist');
```

---

## 3. スキーマの確認

対象テーブルのスキーマは `db/schema.ts` に定義されています。
パイプラインを作成する前に、このファイルを確認して利用可能なテーブルとカラムを把握してください。

```typescript
import { someTable } from '../../db/schema';
```

---

## 4. コンポーネント・リファレンス

### 4.1 Sources (入力)

#### `Source.http`
HTTP Webhook でデータを受信します。

| パラメータ | 型 | 必須 | デフォルト | 説明 |
| :--- | :--- | :--- | :--- | :--- |
| `path` | string | **○** | - | エンドポイントパス（`/` で始まる） |
| `methods` | string[] | **○** | - | 許可する HTTP メソッド (`GET`, `POST`, `PUT`, `DELETE`) |
| `address` | string | | `0.0.0.0:8080` | 待ち受けアドレス |
| `timeout` | string | | `30s` | タイムアウト |

```typescript
Source.http({
  path: '/webhook/hl7',
  methods: ['POST'],
})
```

#### `Source.sftp`
SFTP サーバー上のファイルを監視・取得します。

| パラメータ | 型 | 必須 | デフォルト | 説明 |
| :--- | :--- | :--- | :--- | :--- |
| `host` | string | **○** | - | SFTP ホスト名 |
| `user` | string | **○** | - | ユーザー名 |
| `path` | string | **○** | - | 取得対象パス（ワイルドカード可: `/data/*.csv`） |
| `port` | number | | `22` | ポート番号 |
| `password` | string | | - | パスワード認証時 |
| `privateKeyFile` | string | | - | 秘密鍵ファイルパス（キー認証時） |
| `watcher` | object | | `{ enabled: true, ... }` | ファイル監視設定 |

```typescript
Source.sftp({
  host: 'sftp.hospital.example',
  user: 'data_user',
  password: '${SFTP_PASSWORD}', // 環境変数から取得推奨
  path: '/exports/patients/*.csv',
})
```

#### `Source.mllp`
HL7 v2 メッセージを MLLP プロトコルで受信します。

| パラメータ | 型 | 必須 | デフォルト | 説明 |
| :--- | :--- | :--- | :--- | :--- |
| `address` | string | | `0.0.0.0:2575` | 待ち受けアドレス |

```typescript
Source.mllp({
  address: '0.0.0.0:2575',
})
```

---

### 4.2 Transforms (変換・加工)

#### `Transform.map(mapping)`
フィールドを再マッピングします。値には Bloblang 式を使用します。

```typescript
Transform.map({
  patientId: 'this.PID_3_1',           // 単純なフィールド参照
  fullName: 'this.lastName + " " + this.firstName', // 文字列結合
  upperName: 'this.name.uppercase()',   // Bloblang 関数
})
```

#### `Transform.decode(encoding)`
文字コードを UTF-8 に変換します。

```typescript
Transform.decode('shift_jis')  // Shift-JIS から UTF-8 へ
```

#### `Transform.fixedWidthWithProfile(profile)`

固定長プロファイルに基づいてデータをパースします。レコード種別の判定、文字エンコーディング変換、トリム規則などを適切に処理します。

```typescript
import { profileRegistry } from '@pipeli/sdk';

const profile = profileRegistry.get('vendor_c', 'patient-fixed');

Transform.fixedWidthWithProfile(profile)
```

プロファイル定義例:
```typescript
const vendorCFixedProfile: FixedWidthProfile = {
  id: 'patient-fixed',
  vendor: 'vendor_c',
  encoding: 'shift_jis',
  recordTypes: {
    data: {
      identifier: 'D',
      identifierPosition: { start: 0, length: 1 },
      fields: [
        { name: 'patientId', start: 1, length: 10, type: 'string', trim: 'both' },
        { name: 'name', start: 11, length: 20, type: 'string', trim: 'right' },
        { name: 'birthDate', start: 31, length: 8, type: 'date', dateFormat: 'YYYYMMDD' },
      ],
    },
  },
};
```

#### `Transform.hl7WithProfile(profile)`

HL7プロファイルに基づいてメッセージをパースします。標準セグメントとベンダー拡張（Z-segment）を適切に処理し、正規化されたフィールド名で出力します。

```typescript
import { profileRegistry } from '@pipeli/sdk';

const profile = profileRegistry.get('vendor_a', 'adt-profile');

Transform.hl7WithProfile(profile)
```

プロファイル定義例:
```typescript
const vendorAAdtProfile: HL7Profile = {
  id: 'adt-profile',
  vendor: 'vendor_a',
  version: '2.5.1',
  messageType: 'ADT^A01',
  segments: {
    PID: {
      name: 'PID',
      fields: [
        { path: 'PID.3.1', normalizedName: 'patientId', type: 'string', required: true },
        { path: 'PID.5.1', normalizedName: 'familyName', type: 'string' },
        { path: 'PID.5.2', normalizedName: 'givenName', type: 'string' },
      ],
    },
  },
  extensions: {
    ZPD: {
      name: 'ZPD',
      fields: [
        { path: 'ZPD.1.1', normalizedName: 'vendorSpecificId', type: 'string' },
      ],
    },
  },
};
```

#### `Transform.validate(fields)`
必須フィールドの存在を検証します。存在しない場合はエラーをスローします。

```typescript
Transform.validate(['patientId', 'vendor'])
```

---

### 4.3 Sinks (出力)

#### `Sink.postgres`
PostgreSQL へデータを書き込みます。

| パラメータ | 型 | 必須 | 説明 |
| :--- | :--- | :--- | :--- |
| `schema` | Drizzle Table | **○** | 対象テーブルのスキーマオブジェクト |
| `mode` | `'insert'` \| `'upsert'` | **○** | 書き込みモード |
| `idempotencyKey` | string[] | UPSERT時 **○** | 重複判定カラム（**TSのカラム名**を使用） |
| `mapping` | object | **○** | データマッピング（下記参照） |

##### mapping の書き方

**重要**: `mapping` のキーには **TypeScript 上のカラム名（camelCase）** を使用します。
SDK が内部で物理カラム名（snake_case）に変換します。

```typescript
mapping: {
  // キー: TSのカラム名, 値: Bloblang式 または リテラル

  // Bloblang 式（プロセッサで変換した値を参照）
  sourceId: 'this.patientId',
  familyName: 'this.lastName',
  givenName: 'this.firstName',

  // リテラル値（固定値を挿入）
  vendor: { literal: 'hospital_a' },
  facility: { literal: 'main_campus' },
}
```

##### Insert モード
```typescript
Sink.postgres({
  schema: patients,
  mode: 'insert',
  idempotencyKey: [],
  mapping: {
    sourceId: 'this.id',
    familyName: 'this.name',
    vendor: { literal: 'vendor_x' },
    facility: { literal: 'facility_y' },
  }
})
```

##### Upsert モード（推奨）
```typescript
Sink.postgres({
  schema: patients,
  mode: 'upsert',
  idempotencyKey: ['vendor', 'facility', 'sourceId'], // TSのカラム名
  mapping: {
    vendor: { literal: 'vendor_x' },
    facility: { literal: 'facility_y' },
    sourceId: 'this.patientId',
    familyName: 'this.lastName',
    givenName: 'this.firstName',
  }
})
```

---

## 5. AI への指示（重要）

AI アシスタントがコードを生成する際は、以下のステップに従ってください。

1. **スキーマの確認**: `db/schema.ts` を読み込み、対象テーブルのカラム定義を確認する。
2. **TSカラム名を使用**: `mapping` と `idempotencyKey` には **TypeScript 上の定義名（camelCase）** を使用すること。SDK が内部で物理名に変換する。
3. **プロファイルベースを優先**: HL7や固定長データの場合、`Transform.hl7WithProfile()` や `Transform.fixedWidthWithProfile()` の使用を推奨する。
4. **UPSERT の推奨**: 医療データの取り込みでは、冪等性を担保するために `mode: 'upsert'` と適切な `idempotencyKey`（通常は `['vendor', 'facility', 'sourceId']`）を設定すること。
5. **Bloblang の活用**: 複雑な変換が必要な場合は `Transform.map` 内で Bento (Bloblang) の関数を使用すること。
6. **環境変数**: パスワードなどの機密情報は `${ENV_VAR}` 形式で環境変数から取得すること。

---

## 6. 完全な実装例

### HL7 MLLP to Postgres (UPSERT)
```typescript
import { Pipeline, Source, Transform, Sink, profileRegistry } from '@pipeli/sdk';
import { patients } from '../../db/schema';

// プロファイルを取得（事前に登録済み）
const profile = profileRegistry.get('vendor_x', 'adt-profile');

const pipeline = new Pipeline({
  id: 'hospital-a-adt',
  vendor: 'vendor_x',
  facility: 'hosp_001',
  domain: 'patient',

  input: Source.mllp({ address: '0.0.0.0:2575' }),

  processors: [
    Transform.hl7WithProfile(profile),
    Transform.validate(['patientId']),
  ],

  output: Sink.postgres({
    schema: patients,
    mode: 'upsert',
    idempotencyKey: ['vendor', 'facility', 'sourceId'],
    mapping: {
      vendor: { literal: 'vendor_x' },
      facility: { literal: 'hosp_001' },
      sourceId: 'this.patientId',
      familyName: 'this.familyName',
      givenName: 'this.givenName',
    }
  })
});

pipeline.synth('./dist');
```

### SFTP CSV to Postgres (INSERT)
```typescript
import { Pipeline, Source, Transform, Sink } from '@pipeli/sdk';
import { patients } from '../../db/schema';

const pipeline = new Pipeline({
  id: 'clinic-b-csv-import',
  vendor: 'clinic_b',
  facility: 'branch_01',
  domain: 'patient',

  input: Source.sftp({
    host: 'sftp.clinic-b.example',
    user: 'export_user',
    password: '${SFTP_PASSWORD}',
    path: '/exports/*.csv',
  }),

  processors: [
    Transform.decode('shift_jis'),
    Transform.map({
      patientId: 'this.患者ID',
      lastName: 'this.姓',
      firstName: 'this.名',
      birthDate: 'this.生年月日',
    }),
  ],

  output: Sink.postgres({
    schema: patients,
    mode: 'upsert',
    idempotencyKey: ['vendor', 'facility', 'sourceId'],
    mapping: {
      vendor: { literal: 'clinic_b' },
      facility: { literal: 'branch_01' },
      sourceId: 'this.patientId',
      familyName: 'this.lastName',
      givenName: 'this.firstName',
      birthDate: 'this.birthDate',
    }
  })
});

pipeline.synth('./dist');
```

---

## 7. プロファイルベースアーキテクチャ (v1.1.0+)

### 7.1 概要

HL7や固定長データのベンダー固有の差異を**プロファイル**として定義し、パイプラインをシンプルで統一的に保つアーキテクチャです。

**従来のTemplateベース:**
- ベンダーごとにパイプラインを個別作成
- フィールド位置の違いがパイプライン内に埋もれる
- 新ベンダー追加時にコピペが発生

**新しいProfileベース:**
- ベンダー固有の設定をプロファイルとして分離
- パイプラインは正規化されたフィールド名で統一的に処理
- 新ベンダー追加時はプロファイルだけ追加

---

### 7.2 プロファイルの定義

#### HL7プロファイル

```typescript
// profiles/vendor-a-adt.ts
import type { HL7Profile } from '@pipeli/sdk';

export const vendorAAdtProfile: HL7Profile = {
  id: 'adt-profile',
  vendor: 'vendor_a',
  version: '2.5.1',
  messageType: 'ADT^A01',
  
  segments: {
    PID: {
      name: 'PID',
      fields: [
        { path: 'PID.3.1', normalizedName: 'patientId', type: 'string', required: true },
        { path: 'PID.5.1', normalizedName: 'familyName', type: 'string' },
        { path: 'PID.5.2', normalizedName: 'givenName', type: 'string' },
        { path: 'PID.7.1', normalizedName: 'birthDate', type: 'date' },
      ],
    },
    PV1: {
      name: 'PV1',
      fields: [
        { path: 'PV1.2.1', normalizedName: 'patientClass', type: 'string' },
        { path: 'PV1.3.1', normalizedName: 'assignedLocation', type: 'string' },
      ],
    },
  },
  
  // ベンダー拡張（Z-segment）
  extensions: {
    ZPD: {
      name: 'ZPD',
      fields: [
        { path: 'ZPD.1.1', normalizedName: 'vendorSpecificId', type: 'string' },
        { path: 'ZPD.2.1', normalizedName: 'customField', type: 'string' },
      ],
    },
  },
  
  // MLLP設定のカスタマイズ（オプション）
  mllp: {
    startBlock: '\x0b',
    endBlock: '\x1c',
    trailer: '\r',
  },
};
```

#### 固定長プロファイル

```typescript
// profiles/vendor-c-fixed.ts
import type { FixedWidthProfile } from '@pipeli/sdk';

export const vendorCFixedProfile: FixedWidthProfile = {
  id: 'patient-fixed',
  vendor: 'vendor_c',
  encoding: 'shift_jis',
  lineEnding: 'CRLF',
  
  recordTypes: {
    header: {
      identifier: 'H',
      identifierPosition: { start: 0, length: 1 },
      fields: [
        { name: 'fileDate', start: 1, length: 8, type: 'date', dateFormat: 'YYYYMMDD' },
        { name: 'totalRecords', start: 9, length: 6, type: 'number' },
      ],
    },
    data: {
      identifier: 'D',
      identifierPosition: { start: 0, length: 1 },
      fields: [
        { name: 'patientId', start: 1, length: 10, type: 'string', trim: 'both' },
        { name: 'name', start: 11, length: 20, type: 'string', trim: 'right' },
        { name: 'birthDate', start: 31, length: 8, type: 'date', dateFormat: 'YYYYMMDD' },
        { name: 'gender', start: 39, length: 1, type: 'string' },
      ],
    },
    trailer: {
      identifier: 'T',
      identifierPosition: { start: 0, length: 1 },
      fields: [],
      skip: true, // トレーラーレコードはスキップ
    },
  },
};
```

---

### 7.3 プロファイルの登録

アプリケーション起動時に一度だけ登録します。

```typescript
// profiles/index.ts
import { profileRegistry } from '@pipeli/sdk';
import { vendorAAdtProfile } from './vendor-a-adt.js';
import { vendorBAdtProfile } from './vendor-b-adt.js';
import { vendorCFixedProfile } from './vendor-c-fixed.js';

// プロファイルを登録
profileRegistry.register(vendorAAdtProfile);
profileRegistry.register(vendorBAdtProfile);
profileRegistry.register(vendorCFixedProfile);
```

---

### 7.4 パイプラインでの使用

プロファイルを使用すると、パイプラインがシンプルになります。

#### HL7パイプライン（Profileベース）

```typescript
import { Pipeline, Source, Transform, Sink, profileRegistry } from '@pipeli/sdk';
import { patients } from '../../db/schema';

// プロファイルを取得
const profile = profileRegistry.get('vendor_a', 'adt-profile');

const pipeline = new Pipeline({
  id: 'vendor-a-patient-sync',
  vendor: 'vendor_a',
  facility: 'hospital_001',
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
    idempotencyKey: ['vendor', 'facility', 'sourceId'],
    mapping: {
      vendor: { literal: 'vendor_a' },
      facility: { literal: 'hospital_001' },
      sourceId: 'this.patientId',        // 正規化済み
      familyName: 'this.familyName',     // 正規化済み
      givenName: 'this.givenName',       // 正規化済み
      birthDate: 'this.birthDate',       // 正規化済み
    }
  })
});

pipeline.synth('./dist');
```

#### 固定長パイプライン（Profileベース）

```typescript
import { Pipeline, Source, Transform, Sink, profileRegistry } from '@pipeli/sdk';
import { patients } from '../../db/schema';

const profile = profileRegistry.get('vendor_c', 'patient-fixed');

const pipeline = new Pipeline({
  id: 'vendor-c-patient-sync',
  vendor: 'vendor_c',
  facility: 'clinic_002',
  domain: 'patient',

  input: Source.sftp({
    host: 'sftp.vendor-c.example',
    user: 'export_user',
    password: '${SFTP_PASSWORD}',
    path: '/exports/*.dat',
  }),

  processors: [
    Transform.fixedWidthWithProfile(profile),
    Transform.validate(['patientId']),
  ],

  output: Sink.postgres({
    schema: patients,
    mode: 'upsert',
    idempotencyKey: ['vendor', 'facility', 'sourceId'],
    mapping: {
      vendor: { literal: 'vendor_c' },
      facility: { literal: 'clinic_002' },
      sourceId: 'this.patientId',
      familyName: 'this.name',
      birthDate: 'this.birthDate',
    }
  })
});

pipeline.synth('./dist');
```

---

### 7.5 プロファイルベースの利点

| 項目 | Templateベース | Profileベース |
|------|---------------|--------------|
| **ベンダー差異の管理** | パイプライン内に埋もれる | プロファイルとして明示的に定義 |
| **パイプラインの数** | ベンダーごとに増える | 共通化できる |
| **フィールド名** | ベンダー固有のパス | 正規化された名前 |
| **拡張の扱い** | 手動で追加 | プロファイルで定義 |
| **新ベンダー追加** | パイプライン全体をコピペ | プロファイルだけ追加 |
| **テスト** | パイプラインごと | プロファイルごと |

---

### 7.6 プロファイルのバージョン管理

プロファイルレジストリはセマンティックバージョニングをサポートしています。

```typescript
// 複数バージョンを登録
profileRegistry.register({ ...vendorAAdtProfile, profileVersion: '1.0.0' });
profileRegistry.register({ ...vendorAAdtProfile, profileVersion: '1.1.0' });
profileRegistry.register({ ...vendorAAdtProfile, profileVersion: '2.0.0' });

// バージョン指定なし → 最新（2.0.0）を取得
const latest = profileRegistry.get('vendor_a', 'adt-profile');

// バージョン指定あり → 特定バージョンを取得
const v1 = profileRegistry.get('vendor_a', 'adt-profile', '1.0.0');
```

---

### 7.7 移行ガイド

既存のTemplateベースパイプラインをProfileベースに移行する手順:

1. **プロファイルを定義**
   ```typescript
   // profiles/vendor-x-adt.ts を作成
   export const vendorXAdtProfile: HL7Profile = { ... };
   ```

2. **プロファイルを登録**
   ```typescript
   // profiles/index.ts に追加
   profileRegistry.register(vendorXAdtProfile);
   ```

3. **パイプラインを更新**
   ```typescript
   // Before
   processors: [
     Transform.hl7(),
     Transform.map({ patientId: 'this.PID.3.1', ... }),
   ]
   
   // After
   const profile = profileRegistry.get('vendor_x', 'adt-profile');
   processors: [
     Transform.hl7WithProfile(profile),
   ]
   ```

4. **マッピングを更新**
   ```typescript
   // Before
   mapping: {
     sourceId: 'this.patientId', // Transform.mapで定義した名前
   }
   
   // After
   mapping: {
     sourceId: 'this.patientId', // プロファイルのnormalizedName
   }
   ```

---

## 8. まとめ

- **プロファイルベース**: `Transform.hl7WithProfile()` / `Transform.fixedWidthWithProfile()` を使用
- **継承機能**: ベースプロファイルを `extends` で拡張可能
- **プロファイル管理**: `profiles/` ディレクトリにベンダーごとに整理
- **テスト**: プロファイル単体でテスト可能なため、品質向上
