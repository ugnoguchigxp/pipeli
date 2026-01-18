import { Pipeline, Sink, Source, Transform } from 'pipeli-sdk';
import { patients } from '../../../db/schema.js';

const pipeline = new Pipeline({
    id: 'vendor-a-patient-sync',
    vendor: 'vendor_a',
    facility: 'hospital_001',
    domain: 'patient',

    input: Source.http({
        path: '/api/patients',
        methods: ['POST'],
    }),

    processors: [
        Transform.map({
            sourceId: 'this.patient_id',
            familyName: 'this.name.family',
            givenName: 'this.name.given[0]',
        }),
    ],

    output: Sink.postgres({
        schema: patients,
        mode: 'upsert',
        idempotencyKey: ['vendor', 'facility', 'sourceId'],
        mapping: {
            vendor: { literal: 'vendor_a' },
            facility: { literal: 'hospital_001' },
            sourceId: 'root.sourceId',
            familyName: 'root.familyName',
            givenName: 'root.givenName',
        },
    }),
});

// YAML 生成実行
pipeline.synth('./dist');
