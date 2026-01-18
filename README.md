# Pipeli

> 🇯🇵 [日本語版 README はこちら](./README.ja.md)

A **Pipeline as a Code** platform that defines and manages data ingestion pipelines using TypeScript SDK with Bento (WarpStream) as the runtime.

## 🚀 Features

- **Code-First**: Define pipelines in TypeScript, auto-generate Bento-compatible YAML
- **Type-Safe**: Integrates with Drizzle ORM schemas to detect DB column mismatches at build time
- **Healthcare Domain Support**: Built-in support for MLLP, HL7 v2, fixed-width formats, Shift-JIS, DICOM, JAHIS, and more
- **Profile-Based Architecture**: Vendor-specific differences are abstracted as reusable profiles
- **Tested**: Unit tests with Vitest (90%+ coverage)

## 📂 Directory Structure

```text
.
├── sdk/                # Pipeline SDK (TypeScript)
│   └── src/            # SDK source code & tests (*.test.ts)
├── pipelines/          # Pipeline definitions
│   ├── src/            # Per-vendor/facility definitions
│   └── dist/           # Generated Bento YAML
├── db/                 # Drizzle ORM schema & migrations
│   └── schema.ts       # Table definitions
├── docs/               # Documentation
│   └── how-to-write-pipeline.md
└── docker-compose.yml  # Development environment
```

## 🛠 Setup

### 1. Install dependencies
```bash
bun install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your DB connection
```

### 3. Build SDK and generate pipelines
```bash
cd sdk && bun run build
cd ../pipelines && bun run build
```

### 4. Start middleware (DB, etc.)
```bash
docker compose up -d
```

## 🏃‍♂️ Running Pipelines

### CLI Wrapper
```bash
cd pipelines
bun run run vendor-a-patient-sync
```

### From TypeScript
```typescript
import { PipelineRunner } from '@pipeli/sdk';

const runner = new PipelineRunner();
await runner.run('vendor-a-patient-sync');
```

## 🧪 Testing

```bash
cd sdk && bun run test           # Run tests
cd sdk && bun run test:coverage  # With coverage
```

## 📖 Documentation

- [How to Write Pipelines](./docs/how-to-write-pipeline.md)

## 🏥 Profile-Based Architecture

Since v1.1.0, vendor-specific differences in HL7 and fixed-width data can be defined as **profiles**.

### Example (Profile-based HL7 Pipeline)
```typescript
import { Pipeline, Source, Transform, Sink, profileRegistry } from '@pipeli/sdk';
import { patients } from '../../db/schema';

const profile = profileRegistry.get('vendor_a', 'adt-profile');

const pipeline = new Pipeline({
  id: 'vendor-a-patient-sync',
  vendor: 'vendor_a',
  facility: 'hospital_001',
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
      vendor: { literal: 'vendor_a' },
      facility: { literal: 'hospital_001' },
      sourceId: 'this.patientId',
      familyName: 'this.familyName',
    }
  })
});

pipeline.synth('./dist');
```

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
