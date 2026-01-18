import { CSVParser } from '../parser/csv-parser.js';
import { DICOMParser } from '../parser/dicom-parser.js';
import { FixedWidthParser } from '../parser/fixed-width-parser.js';
import { HL7Parser } from '../parser/hl7-parser.js';
import type { CSVProfileInput } from '../profile/csv-profile.js';
import { CSVProfileSchema } from '../profile/csv-profile.js';
import type { DICOMProfileInput } from '../profile/dicom-profile.js';
import { DICOMProfileSchema } from '../profile/dicom-profile.js';
import type { FixedWidthProfileInput } from '../profile/fixed-width-profile.js';
import { FixedWidthProfileSchema } from '../profile/fixed-width-profile.js';
import type { HL7ProfileInput } from '../profile/hl7-profile.js';
import { HL7ProfileSchema } from '../profile/hl7-profile.js';

/**
 * 電文フィールド定義の型
 */
export interface TelegramField {
    /** フィールド開始位置（バイト） */
    start: number;
    /** フィールド長（バイト） */
    length: number;
    /** フィールド名 */
    name: string;
    /** 型（デフォルト: string） */
    type?: 'string' | 'number' | 'date';
}

/**
 * ヘッダ＋ボディ電文のフィールド定義
 */
export interface HeaderBodyConfig {
    /** ヘッダ長（バイト） */
    headerLength: number;
    /** ヘッダ内のフィールド定義 */
    headerFields: Record<string, [number, number]>;
    /** ボディのフォーマット */
    bodyFormat: 'json' | 'xml' | 'fixed' | 'raw';
    /** ボディが固定長の場合のフィールド定義 */
    bodyFields?: Record<string, [number, number]>;
}

export const Transform = {
    /**
     * フィールドマッピング
     * @example Transform.map({ patientId: 'this.id', name: 'this.patient_name' })
     */
    map: (mapping: Record<string, string>) => ({
        toBento: () => [
            {
                mapping: Object.entries(mapping)
                    .map(([key, value]) => `root.${key} = ${value}`)
                    .join('\n'),
            },
        ],
    }),

    /**
     * 文字エンコード変換
     * @example Transform.decode('Shift_JIS')
     */
    decode: (encoding: string) => ({
        toBento: () => [
            {
                mapping: `root = content().decode("${encoding.toLowerCase().replace('_', '-')}")`,
            },
        ],
    }),

    /**
     * 固定長プロファイルベースのパース
     *
     * COBOL系やレガシーシステムからの固定長データをプロファイルとして定義し、
     * レコード種別の判定、文字エンコーディング変換、トリム処理などを適切に処理します。
     *
     * @param profile - 固定長プロファイル定義
     * @example
     * Transform.fixedWidthWithProfile({
     *   id: 'vendor-b-patient',
     *   vendor: 'vendor_b',
     *   encoding: 'shift_jis',
     *   recordTypes: {
     *     data: {
     *       identifier: 'D',
     *       identifierPosition: { start: 0, length: 1 },
     *       fields: [
     *         { name: 'patientId', start: 1, length: 10, type: 'string', trim: 'both' },
     *         { name: 'name', start: 11, length: 20, type: 'string', trim: 'right' },
     *       ],
     *     },
     *   },
     * })
     */
    fixedWidthWithProfile: (profile: FixedWidthProfileInput) => ({
        toBento: () => {
            const validated = FixedWidthProfileSchema.parse(profile);
            return new FixedWidthParser(validated).toBento();
        },
    }),

    /**
     * DICOMプロファイルベースのメタデータ抽出
     *
     * DICOMプロファイルに基づいてDICOMデータからメタデータを抽出します。
     * CT、MR、CR、USなど各モダリティに対応したプロファイルを使用できます。
     *
     * 注意: 実際のDICOMバイナリ解析には外部ツール（dcmjs等）との連携が必要です。
     *
     * @param profile - DICOMプロファイル定義
     * @example
     * Transform.dicomWithProfile({
     *   id: 'ct-scan',
     *   vendor: 'hospital_a',
     *   modality: 'CT',
     *   tags: {
     *     patientId: { tag: '(0010,0020)', vr: 'LO', normalizedName: 'patientId' },
     *     studyDate: { tag: '(0008,0020)', vr: 'DA', normalizedName: 'studyDate', type: 'date' },
     *   },
     * })
     */
    dicomWithProfile: (profile: DICOMProfileInput) => ({
        toBento: () => {
            const validated = DICOMProfileSchema.parse(profile);
            return new DICOMParser(validated).toBento();
        },
    }),

    /**
     * CSVプロファイルベースのデータ変換
     *
     * CSVプロファイルに基づいてCSVデータを構造化データに変換します。
     * レセ電コードなど、レコード種別識別が必要なCSV形式に対応します。
     *
     * @param profile - CSVプロファイル定義
     * @example
     * Transform.csvWithProfile({
     *   id: 'receden-medical',
     *   vendor: 'shiharai_kikin',
     *   encoding: 'shift_jis',
     *   delimiter: ',',
     *   recordTypes: {
     *     IR: { identifier: 'IR', fields: [...] },
     *     RE: { identifier: 'RE', fields: [...] },
     *   },
     * })
     */
    csvWithProfile: (profile: CSVProfileInput) => ({
        toBento: () => {
            const validated = CSVProfileSchema.parse(profile);
            return new CSVParser(validated).toBento();
        },
    }),

    /**
     * 可変長電文解析（長さヘッダ付き、TCP電文系）
     * 先頭に長さ情報があり、それに続くボディを解析
     * @param lengthBytes - 長さフィールドのバイト数（デフォルト: 4）
     * @param lengthEncoding - 長さのエンコード（'binary' | 'ascii'）（デフォルト: 'ascii'）
     * @param includesHeader - 長さにヘッダ自身を含むか（デフォルト: false）
     * @example Transform.variableLength({ lengthBytes: 4, lengthEncoding: 'ascii' })
     */
    variableLength: (options?: {
        lengthBytes?: number;
        lengthEncoding?: 'binary' | 'ascii';
        includesHeader?: boolean;
    }) => ({
        toBento: () => {
            const lengthBytes = options?.lengthBytes ?? 4;
            const encoding = options?.lengthEncoding ?? 'ascii';
            const includesHeader = options?.includesHeader ?? false;

            // 長さフィールドを解析してボディを抽出
            const lengthExpr =
                encoding === 'ascii'
                    ? `content().slice(0, ${lengthBytes}).number()`
                    : `content().slice(0, ${lengthBytes}).bytes().decode("big_endian")`;

            return [
                {
                    mapping: `let length = ${lengthExpr}
let body_start = ${lengthBytes}
root._length = $length
root._body = content().slice($body_start, $body_start + $length${includesHeader ? ` - ${lengthBytes}` : ''})`,
                },
            ];
        },
    }),

    /**
     * 区切り文字電文解析（CSV系）
     * parseCsvのエイリアス、より明確な命名
     */
    delimited: (options?: { delimiter?: string; hasHeader?: boolean; quote?: string }) => ({
        toBento: () => [
            {
                csv: {
                    parse_header_row: options?.hasHeader ?? true,
                    delimiter: options?.delimiter ?? ',',
                    ...(options?.quote && { enclosure: options.quote }),
                },
            },
        ],
    }),

    /**
     * ヘッダ＋ボディ電文解析（ISO系、制御情報分離型）
     * 電文の先頭に固定長ヘッダがあり、後続にボディがある形式
     * @example Transform.headerBody({
     *   headerLength: 20,
     *   headerFields: { msgType: [0, 4], length: [4, 8], timestamp: [8, 20] },
     *   bodyFormat: 'json'
     * })
     */
    headerBody: (config: HeaderBodyConfig) => ({
        toBento: () => {
            const headerParsing = Object.entries(config.headerFields)
                .map(([key, [start, end]]) => `root.header.${key} = content().slice(${start}, ${end}).trim()`)
                .join('\n');

            let bodyParsing: string;
            switch (config.bodyFormat) {
                case 'json':
                    bodyParsing = `root.body = content().slice(${config.headerLength}).parse_json()`;
                    break;
                case 'xml':
                    bodyParsing = `root._body_raw = content().slice(${config.headerLength})`;
                    break;
                case 'fixed':
                    if (config.bodyFields) {
                        bodyParsing = Object.entries(config.bodyFields)
                            .map(
                                ([key, [start, end]]) =>
                                    `root.body.${key} = content().slice(${config.headerLength + start}, ${config.headerLength + end}).trim()`,
                            )
                            .join('\n');
                    } else {
                        bodyParsing = `root.body = content().slice(${config.headerLength})`;
                    }
                    break;
                default:
                    bodyParsing = `root.body = content().slice(${config.headerLength})`;
            }

            return [
                {
                    mapping: `${headerParsing}\n${bodyParsing}`,
                },
            ];
        },
    }),

    /**
     * シーケンス番号検証（重複・欠落防止、高信頼通信）
     * メタデータにシーケンス番号を保存し、重複チェック用のフィールドを追加
     * @param field - シーケンス番号のフィールドパス
     * @example Transform.sequenceNumber('this.header.seq')
     */
    sequenceNumber: (field: string) => ({
        toBento: () => [
            {
                mapping: `root._sequence = ${field}
root._sequence_key = meta("source") + "_" + ${field}.string()`,
            },
        ],
    }),

    /**
     * 時刻同期電文処理（決済系、時刻基準処理）
     * 電文内のタイムスタンプを解析し、処理時刻との差分を計算
     * @param timestampField - タイムスタンプフィールドパス
     * @param format - タイムスタンプフォーマット（デフォルト: RFC3339）
     * @example Transform.timestampSync('this.header.timestamp', 'YYYYMMDDHHmmss')
     */
    timestampSync: (timestampField: string, format?: string) => ({
        toBento: () => {
            const parseExpr = format
                ? `${timestampField}.parse_timestamp("${format}")`
                : `${timestampField}.parse_timestamp()`;

            return [
                {
                    mapping: `root._msg_timestamp = ${parseExpr}
root._received_at = now()
root._latency_ms = (now().unix_milli() - ${parseExpr}.unix_milli())`,
                },
            ];
        },
    }),

    /**
     * HL7プロファイルベースのパース
     *
     * ベンダー固有のHL7メッセージ構造をプロファイルとして定義し、
     * 標準セグメントとベンダー拡張（Z-segment）を適切に処理します。
     *
     * @param profile - HL7プロファイル定義
     * @example
     * Transform.hl7WithProfile({
     *   id: 'vendor-a-adt',
     *   vendor: 'vendor_a',
     *   version: '2.5.1',
     *   messageType: 'ADT^A01',
     *   segments: {
     *     PID: {
     *       name: 'PID',
     *       fields: [
     *         { path: 'PID.3.1', normalizedName: 'patientId', type: 'string', required: true },
     *         { path: 'PID.5.1', normalizedName: 'familyName', type: 'string' },
     *       ],
     *     },
     *   },
     * })
     */
    hl7WithProfile: (profile: HL7ProfileInput) => ({
        toBento: () => {
            const validated = HL7ProfileSchema.parse(profile);
            return new HL7Parser(validated).toBento();
        },
    }),

    /**
     * 必須フィールドバリデーション
     * @example Transform.validate(['id', 'name'])
     */
    validate: (fields: string[]) => ({
        toBento: () =>
            fields.map((field) => ({
                bloblang: `if !root.exists("${field}") { throw("Missing required field: ${field}") }`,
            })),
    }),

    /**
     * JSON文字列をオブジェクトにパース
     * HTTP POSTのボディやファイル内容がJSON文字列の場合に使用
     * @example Transform.parseJson()
     */
    parseJson: () => ({
        toBento: () => [
            {
                mapping: 'root = content().parse_json()',
            },
        ],
    }),

    /**
     * XMLをJSONオブジェクトに変換
     * @param options.cast - 属性値を適切な型にキャスト（デフォルト: true）
     * @example Transform.parseXml()
     */
    parseXml: (options?: { cast?: boolean }) => ({
        toBento: () => [
            {
                xml: {
                    operator: 'to_json',
                    cast: options?.cast ?? true,
                },
            },
        ],
    }),

    /**
     * CSVをJSONオブジェクトの配列に変換
     * @param options.parseHeaderRow - 最初の行をヘッダとして使用（デフォルト: true）
     * @param options.delimiter - 区切り文字（デフォルト: ","）
     * @example Transform.parseCsv()
     */
    parseCsv: (options?: { parseHeaderRow?: boolean; delimiter?: string }) => ({
        toBento: () => [
            {
                csv: {
                    parse_header_row: options?.parseHeaderRow ?? true,
                    delimiter: options?.delimiter ?? ',',
                },
            },
        ],
    }),

    // ========================================
    // バイナリプロトコル
    // ========================================

    /**
     * Protocol Buffers (Protobuf) デコード
     * gRPC や高効率バイナリ通信で使用されるフォーマット
     *
     * @param config.message - メッセージ型名（例: "mypackage.MyMessage"）
     * @param config.importPaths - .proto ファイルのディレクトリパス
     * @param config.useProtoNames - JSONフィールド名にproto定義の名前を使用（デフォルト: false）
     * @example Transform.protobuf({ message: 'patient.PatientRecord', importPaths: ['/proto'] })
     */
    protobuf: (config: { message: string; importPaths: string[]; useProtoNames?: boolean }) => ({
        toBento: () => [
            {
                protobuf: {
                    operator: 'to_json',
                    message: config.message,
                    import_paths: config.importPaths,
                    use_proto_names: config.useProtoNames ?? false,
                },
            },
        ],
    }),

    /**
     * Protocol Buffers エンコード（JSONからProtobufへ）
     * 出力時にProtobuf形式に変換する場合に使用
     *
     * @param config.message - メッセージ型名
     * @param config.importPaths - .proto ファイルのディレクトリパス
     * @example Transform.protobufEncode({ message: 'patient.PatientRecord', importPaths: ['/proto'] })
     */
    protobufEncode: (config: { message: string; importPaths: string[] }) => ({
        toBento: () => [
            {
                protobuf: {
                    operator: 'from_json',
                    message: config.message,
                    import_paths: config.importPaths,
                },
            },
        ],
    }),

    /**
     * Schema Registry からスキーマを取得してデコード
     * Confluent Schema Registry と連携したProtobuf/Avro処理
     *
     * @param config.url - Schema Registry のURL
     * @param config.subject - スキーマのサブジェクト名（オプション）
     * @example Transform.schemaRegistryDecode({ url: 'http://schema-registry:8081' })
     */
    schemaRegistryDecode: (config: { url: string; subject?: string; tlsEnabled?: boolean }) => ({
        toBento: () => [
            {
                schema_registry_decode: {
                    url: config.url,
                    ...(config.subject && { subject: config.subject }),
                    ...(config.tlsEnabled && { tls: { enabled: true } }),
                },
            },
        ],
    }),

    /**
     * MessagePack デコード
     * JSON互換のバイナリフォーマット、Redisやリアルタイム通信で使用
     *
     * @example Transform.msgpack()
     */
    msgpack: () => ({
        toBento: () => [
            {
                mapping: 'root = content().decode("msgpack")',
            },
        ],
    }),

    /**
     * MessagePack エンコード
     * @example Transform.msgpackEncode()
     */
    msgpackEncode: () => ({
        toBento: () => [
            {
                mapping: 'root = this.encode("msgpack")',
            },
        ],
    }),

    /**
     * Avro デコード
     * Kafka等でよく使用されるスキーマベースのバイナリフォーマット
     *
     * @param schemaPath - Avroスキーマファイルのパス
     * @example Transform.avro('/schemas/patient.avsc')
     */
    avro: (schemaPath: string) => ({
        toBento: () => [
            {
                avro: {
                    operator: 'to_json',
                    schema_path: schemaPath,
                },
            },
        ],
    }),

    /**
     * Base64 デコード
     * バイナリデータがBase64エンコードされている場合
     * @example Transform.base64Decode()
     */
    base64Decode: () => ({
        toBento: () => [
            {
                mapping: 'root = content().decode("base64")',
            },
        ],
    }),

    /**
     * Base64 エンコード
     * @example Transform.base64Encode()
     */
    base64Encode: () => ({
        toBento: () => [
            {
                mapping: 'root = content().encode("base64")',
            },
        ],
    }),

    /**
     * Gzip 解凍
     * 圧縮されたデータを展開
     * @example Transform.gunzip()
     */
    gunzip: () => ({
        toBento: () => [
            {
                decompress: {
                    algorithm: 'gzip',
                },
            },
        ],
    }),

    /**
     * Gzip 圧縮
     * @example Transform.gzip()
     */
    gzip: () => ({
        toBento: () => [
            {
                compress: {
                    algorithm: 'gzip',
                },
            },
        ],
    }),

    // ========================================
    // 重複排除・分割
    // ========================================

    /**
     * 重複排除（dedupe）
     * キャッシュを使用して重複メッセージを排除
     *
     * @param config.key - 重複判定に使用するキー（Bloblang式）
     * @param config.cache - キャッシュ名（デフォルト: "dedupe_cache"）
     * @param config.dropOnCacheErr - キャッシュエラー時にドロップするか（デフォルト: true）
     * @example Transform.dedupe({ key: 'this.patient_id + "_" + this.order_id' })
     */
    dedupe: (config: { key: string; cache?: string; dropOnCacheErr?: boolean }) => ({
        toBento: () => [
            {
                dedupe: {
                    cache: config.cache ?? 'dedupe_cache',
                    key: config.key,
                    drop_on_err: config.dropOnCacheErr ?? true,
                },
            },
        ],
    }),

    /**
     * メモリキャッシュによる簡易重複排除
     * 外部キャッシュなしで一定件数まで重複チェック
     *
     * @param config.key - 重複判定に使用するキー（Bloblang式）
     * @param config.size - キャッシュサイズ（デフォルト: 1000）
     * @example Transform.dedupeMemory({ key: 'this.message_id', size: 5000 })
     */
    dedupeMemory: (config: { key: string; size?: number }) => ({
        toBento: () => [
            {
                dedupe: {
                    cache: 'memory',
                    key: config.key,
                    drop_on_err: true,
                },
            },
        ],
        // キャッシュ定義も必要（Pipelineレベルで設定）
        _cacheConfig: {
            memory: {
                default_ttl: '24h',
                cap: config.size ?? 1000,
            },
        },
    }),

    /**
     * 配列を個別メッセージに展開（split）
     * バッチデータを1件ずつ処理するために使用
     *
     * @param path - 展開する配列フィールドのパス（Bloblang式、オプション）
     * @example Transform.split('this.patients')  // { patients: [{...}, {...}] } → 個別メッセージ
     * @example Transform.split()  // 配列全体を展開
     */
    split: (path?: string) => ({
        toBento: () => [
            {
                unarchive: {
                    format: 'json_array',
                },
            },
            ...(path
                ? [
                      {
                          mapping: `root = ${path}`,
                      },
                      {
                          unarchive: {
                              format: 'json_array',
                          },
                      },
                  ]
                : []),
        ],
    }),

    /**
     * JSONパスで配列を展開（より直感的なsplit）
     *
     * @param path - 展開する配列のJSONパス
     * @example Transform.splitArray('patients')
     */
    splitArray: (path: string) => ({
        toBento: () => [
            {
                mapping: `root = this.${path}`,
            },
            {
                unarchive: {
                    format: 'json_array',
                },
            },
        ],
    }),

    // ========================================
    // カスタム処理
    // ========================================

    /**
     * Bloblang式を直接記述
     * SDKにない変換処理を直接書く場合に使用
     *
     * @param expression - Bloblang式
     * @example Transform.bloblang('root = this.merge({"processed": true})')
     * @example Transform.bloblang('root.total = this.items.sum(i -> i.price)')
     */
    bloblang: (expression: string) => ({
        toBento: () => [
            {
                mapping: expression,
            },
        ],
    }),

    /**
     * Bento processorを直接記述（生のYAML構造）
     * SDKにラップされていないprocessorを使用する場合
     *
     * @param processor - Bento processor設定オブジェクト
     * @example Transform.raw({ http: { url: 'http://api/enrich', verb: 'POST' } })
     * @example Transform.raw({ jq: { query: '.items | map(.price)' } })
     */
    raw: (processor: Record<string, unknown>) => ({
        toBento: () => [processor],
    }),

    /**
     * 複数のBento processorを直接記述
     * @param processors - Bento processor設定オブジェクトの配列
     */
    rawMultiple: (processors: Record<string, unknown>[]) => ({
        toBento: () => processors,
    }),

    // ========================================
    // ログ・デバッグ
    // ========================================

    /**
     * ログ出力
     * デバッグや監査ログに使用
     *
     * @param message - ログメッセージ（Bloblang interpolation可能）
     * @param level - ログレベル（デフォルト: "INFO"）
     * @example Transform.log('Processing patient: ${! this.patient_id }')
     * @example Transform.log('Error occurred', 'ERROR')
     */
    log: (message: string, level?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR') => ({
        toBento: () => [
            {
                log: {
                    level: level ?? 'INFO',
                    message: message,
                },
            },
        ],
    }),

    // ========================================
    // プライバシー・匿名化（GDPR/HIPAA準拠）
    // ========================================

    /**
     * 外部Anonymizer APIを使用して匿名化（TypeScript環境での処理）
     * Bloblang DSLでは難しい複雑なロジックや、既存のTSライブラリを利用する場合に使用
     *
     * @param config - 匿名化設定とAPIのURL
     * @example Transform.anonymizeApi({
     *   url: 'http://localhost:3001/anonymize',
     *   config: {
     *     hash: ['patient_id'],
     *     mask: [{ field: 'phone', keep: 'last4' }],
     *     generalizeAge: { field: 'age' }
     *   }
     * })
     */
    anonymizeApi: (config: {
        url?: string;
        config: {
            hash?: string[];
            hashSalt?: string;
            hmac?: { fields: string[]; secretKey: string };
            mask?: Array<{
                field: string;
                keep?: 'first1' | 'first2' | 'last4' | 'domain' | 'none';
                maskChar?: string;
            }>;
            generalizeAge?: { field: string; ranges?: number[] };
            generalizeDate?: { field: string; precision: 'month' | 'year' };
            generalizePostalCode?: { field: string; keepDigits?: number };
            redact?: string[];
            allowlist?: string[];
        };
    }) => ({
        toBento: () => [
            {
                branch: {
                    request_map: `root.data = this\nroot.config = ${JSON.stringify(config.config)}`,
                    processors: [
                        {
                            http: {
                                url: config.url ?? 'http://localhost:3001/anonymize',
                                verb: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                            },
                        },
                    ],
                    result_map: 'root = this',
                },
            },
        ],
    }),
};
