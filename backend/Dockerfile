FROM rust:1.83-slim as builder

WORKDIR /app

# 依存関係のインストール
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Cargo.toml と Cargo.lock をコピー
COPY backend/Cargo.toml ./

# ダミー Cargo.lock を作成（存在しない場合）
RUN touch Cargo.lock

# ダミーソースでビルド（依存関係キャッシュ）
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src target/release/bullet_hell_backend* target/release/deps/bullet_hell_backend*

# 実際のソースをコピー
COPY backend/src ./src

# 本番ビルド
RUN cargo build --release

# 実行用イメージ
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/bullet_hell_backend /app/bullet_hell_backend

EXPOSE 3000

CMD ["/app/bullet_hell_backend"]
