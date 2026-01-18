# Bun ベースの軽量イメージ
FROM oven/bun:1 AS base
WORKDIR /app

# 依存関係のインストール
FROM base AS install
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# 本番環境イメージ
FROM base AS release
COPY --from=install /app/node_modules ./node_modules
COPY . .

# ヘルスチェック用のユーティリティをインストール
USER root
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
USER bun

# ポート公開
EXPOSE 3001

# ヘルスチェック
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# アプリケーション起動
CMD ["bun", "run", "start"]
