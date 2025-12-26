# Bullet Hell

Rust + WebAssemblyを使ったゲームエンジンで動作する爆弾回避ゲーム

### セットアップ

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
  react_web:/opt/bullet-hell/
```

サーバーへ接続し、以下を実行
```bash
cd /opt/bullet-hell/
# 既存のコンテナを停止
docker compose -f docker-compose.prod.yml down

# イメージをビルドしてコンテナを起動
docker compose -f docker-compose.prod.yml up -d --build

# コンテナのステータス確認
docker compose -f docker-compose.prod.yml ps

# コンテナのログ確認
docker compose -f docker-compose.prod.yml logs -f
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
Backend (port 3001)
PostgreSQL (port 5432)
Redis (port 6379)
```

#### 本番環境のdockerコマンド

```bash
# ログ確認
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend

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

### 開発環境のdockerコマンド

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