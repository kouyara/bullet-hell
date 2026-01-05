FROM rust:1.83-slim as builder

WORKDIR /app

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/Cargo.toml ./

RUN touch Cargo.lock

RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src target/release/bullet_hell_backend* target/release/deps/bullet_hell_backend*

COPY backend/src ./src
COPY backend/migrations ./migrations

RUN cargo build --release

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/bullet_hell_backend /app/bullet_hell_backend

EXPOSE 4000

CMD ["/app/bullet_hell_backend"]
