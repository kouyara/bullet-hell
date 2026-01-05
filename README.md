# Bullet Hell

Rust + WebAssemblyを使ったゲームエンジンで動作する爆弾回避ゲーム

## プロジェクト概要

大量の弾の物理判定・衝突判定などの計算量が多い処理をRust、WebAssemblyで実装し、安定した60FPSを実現したブラウザゲーム。フロントエンド、バックエンド、インフラ構築をすべて個人でフルスタック開発した。

## 技術スタック

- **Rust** - 所有権と型システムで実行時エラーを削減し、メモリ安全性を保証した。WebAssemblyでコンパイルし、ブラウザ上でネイティブに近い実行速度を実現した。tokioを使用した非同期ランタイムで、少ないCPUスレッド数で複数の同時接続を効率的に処理できる。
- **WebAssembly** - 大量の弾の移動・衝突判定といった計算量が多い処理をWasmで実行。フレーム時間のばらつきを抑えて安定した60 FPSを実現した。
- **Axum** - Rustの軽量非同期Webフレームワーク。PostgreSQL接続を共有状態で複数のリクエストがあっても、データベースに再接続することなく効率よく処理できる。
- **Tokio** - Rust用の非同期ランタイム。すべてのDB操作を非同期で実装し、I/O待ち中に複数ユーザーのリクエストが並行に進むため、効率的にリソースを利用することができる。
- **PostgreSQL** - プレイヤー情報とスコア履歴を永続化。
- **Redis** - Redisでスコアランキングボードをメモリ上で高速管理・実行することを実現した。

## セットアップ

Rustとwasm-packをインストール
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

brew install wasm-pack
```

## 実行方法

### ローカル環境での実行方法

バックエンドを起動
```bash
docker compose up -d
```

バックエンド動作確認:
```bash
curl http://localhost:3000/health
```

フロントエンドを起動
```bash
wasm-pack build --target web
rm -rf www/pkg
cp -r pkg www/
cd www && python3 -m http.server 8000
```

### 本番環境へのデプロイ方法

ローカルPCからサーバーへファイルを転送
```bash
wasm-pack build --target web --release
rm -rf www/pkg
cp -r pkg www/
rsync -avz --delete -e ssh \
  --exclude='target' \
  --exclude='/pkg' \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.DS_Store' \
  --exclude='*.log' \
  /Users/kouya/coding/rust_project/ \
  react_web_syskan:/opt/bullet-hell/
```

サーバーでコンテナを起動
```bash
ssh react_web_syskan "cd /opt/bullet-hell/ && docker compose -f docker-compose.prod.yml down && docker compose -f docker-compose.prod.yml up -d --build"
```

動作確認方法
```bash
curl http://localhost:8000/health

curl http://localhost:8000/api/leaderboard?difficulty=normal&device_type=pc&limit=10
```

本番環境の構成
```
ブラウザ (port 8000)
Nginx (port 80)
Backend (port 4000)
PostgreSQL (port 5432)
Redis (port 6379)
```

## 本番環境のdockerコマンド

```bash
# コンテナのステータス確認
docker compose -f docker-compose.prod.yml ps

# コンテナのログ確認
docker compose -f docker-compose.prod.yml logs -f

# サービス再起動
docker compose -f docker-compose.prod.yml restart backend

# サービス停止
docker compose -f docker-compose.prod.yml down

# 完全リセット（データベース含む、注意！）
docker compose -f docker-compose.prod.yml down -v

# データベースのバックアップ
docker exec bullet_hell_postgres pg_dump -U bullet_user bullet_hell > backup.sql

# データベースの復元
docker exec -i bullet_hell_postgres psql -U bullet_user bullet_hell < backup.sql
```

## 開発環境のdockerコマンド

```bash
# フロントエンドをビルド
wasm-pack build --target web
rm -rf www/pkg && cp -r pkg www/

# サービス起動
docker compose up -d

# ステータス確認
docker compose ps

# ログ確認
docker compose logs -f

# サービス停止
docker compose down

# 完全リセット（データベース含む）
docker compose down -v
```