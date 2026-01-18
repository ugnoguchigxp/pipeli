/**
 * Bento設定を生成できるコンポーネント（Source, Sink, Transform）
 */
export interface BentoComponent {
    toBento(): Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Bento設定オブジェクトの汎用型
 */
export type BentoConfigObject = Record<string, unknown>;
