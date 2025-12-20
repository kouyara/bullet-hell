# Bullet Hell Engine - Rust + WebAssembly

高速な 2D bullet hell / RTS ゲームエンジン。Rust + WebAssembly で大量オブジェクト（2万〜10万弾）をリアルタイム処理。

## 🎯 特徴

- **Struct of Arrays (SoA)**: キャッシュ効率を最大化
- **WebAssembly.Memory 共有**: Rust と JS 間でゼロコピーデータ転送
- **Rust でロジック**: 物理演算、衝突判定、状態管理
- **JS で描画**: Canvas 2D による高速レンダリング
- **最大 100,000 弾**: 同時処理可能

## 🚀 セットアップ

### 必要なツール

```bash
# Rust インストール
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# wasm-pack インストール
brew install wasm-pack
```

## 🎮 起動方法

### ローカル開発環境

#### 1. バックエンド起動（ターミナル1）

```bash
cd /Users/kouya/coding/rust_project
docker compose up -d
docker compose ps
```

ヘルスチェック:
```bash
curl http://localhost:3000/health
```

#### 2. フロントエンド起動（ターミナル2）

初回またはコード変更時:
```bash
cd /Users/kouya/coding/rust_project
wasm-pack build --target web
rm -rf www/pkg
cp -r pkg www/
cd www && python3 -m http.server 8000
```

### デプロイメント

#### 開発環境での Docker Compose

```bash
cd /Users/kouya/coding/rust_project

# フロントエンドをビルド（初回またはコード変更時）
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

#### 本番環境での Docker Compose（Nginx + バックエンド）

```bash
cd /Users/kouya/coding/rust_project

# フロントエンドをビルド（初回またはコード変更時）
wasm-pack build --target web
rm -rf www/pkg && cp -r pkg www/

# サービス起動（本番環境）
docker compose -f docker-compose.prod.yml --env-file .env up -d

# ステータス確認
docker compose -f docker-compose.prod.yml ps

# ログ確認
docker compose -f docker-compose.prod.yml logs -f

# サービス停止
docker compose -f docker-compose.prod.yml down

# 完全リセット（データベース含む）
docker compose -f docker-compose.prod.yml down -v
```

#### 本番環境での Nginx 設定

`.env` ファイルでホストアドレスを指定：

```bash
# Nginx フロントエンド（本番環境）
FRONTEND_HOST=0.0.0.0          # すべてのネットワークインターフェースでリッスン
FRONTEND_PORT=8000              # 外部公開ポート

# バックエンド API（内部通信）
BACKEND_HOST=0.0.0.0
BACKEND_PORT=3000
```

**ホストアドレスのオプション：**

| 設定値 | 説明 |
|------|------|
| `0.0.0.0` | すべてのIPアドレスから接続可能（推奨）|
| `127.0.0.1` | localhost のみ（開発環境向け）|
| `192.168.1.100` | 特定IPアドレスのみ |

Nginx は以下の機能を提供します：

- **リバースプロキシ**: `/api/*` をバックエンド（`backend:3000`）にプロキシ
- **静的ファイル配信**: `www/` ディレクトリをホスト
- **キャッシング**: CSS・JS・画像は 1 年間キャッシュ
- **WebAssembly**: `.wasm` ファイルに適切な MIME タイプを設定
- **圧縮**: gzip で自動的にレスポンスを圧縮
- **SPA ルーティング**: 不正な URL は `index.html` にリダイレクト

#### 環境設定

`.env` ファイルで各環境の設定をカスタマイズ：

```bash
# Nginx フロントエンド（本番環境）
FRONTEND_HOST=0.0.0.0
FRONTEND_PORT=8000

# バックエンド API
BACKEND_HOST=0.0.0.0
BACKEND_PORT=3000

# PostgreSQL
POSTGRES_USER=bullet_user
POSTGRES_PASSWORD=bullet_pass
POSTGRES_DB=bullet_hell
POSTGRES_PORT=5432

# Redis
REDIS_PORT=6379

# ログレベル
RUST_LOG=info
```

### ポート設定

| サービス | ポート | URL |
|---------|--------|-----|
| フロントエンド | 8000 | http://localhost:8000 |
| バックエンド API | 3000 | http://localhost:3000/api |
| PostgreSQL | 5432 | (内部のみ) |
| Redis | 6379 | (内部のみ) |

### 既存 Node.js サーバーとの統合（Ubuntu Nginx）

既に Node.js アプリが稼働している Ubuntu サーバーに Bullet Hell を同じドメイン内の `/bullet-hell/` パスで追加配信します。

#### 前提条件
- Docker と Docker Compose がインストール済み
- 既存の Nginx サイト設定が `/etc/nginx/sites-available/my-portfolio` にある
- SSL 証明書が Let's Encrypt で設定済み（自動更新される）

#### デプロイ手順

**1. プロジェクトをサーバーにクローン**
```bash
cd /opt  # または任意のディレクトリ
git clone <repository-url> bullet-hell
cd bullet-hell
```

**2. フロントエンドをビルド**
```bash
wasm-pack build --target web
rm -rf www/pkg && cp -r pkg www/
```

**3. Nginx 設定を更新**
```bash
# 既存設定をバックアップ
sudo cp /etc/nginx/sites-available/my-portfolio /etc/nginx/sites-available/my-portfolio.bak

# 新しい設定をコピー（既存の Node.js + Bullet Hell）
sudo cp nginx-site-config.conf /etc/nginx/sites-available/my-portfolio

# 設定をテスト
sudo nginx -t

# Nginx を再読み込み
sudo systemctl reload nginx
```

**4. Docker Compose で起動**
```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d

# 起動確認
docker compose -f docker-compose.prod.yml ps
```

#### アクセス URL

| アプリ | URL |
|--------|-----|
| Bullet Hell ゲーム | https://kouya.st.ie.u-ryukyu.ac.jp/bullet-hell/ |
| Bullet Hell API | https://kouya.st.ie.u-ryukyu.ac.jp/bullet-hell/api/ |
| 既存 Node.js アプリ | https://kouya.st.ie.u-ryukyu.ac.jp/ |

#### ポート設定

| サービス | ポート | 説明 |
|---------|--------|------|
| Node.js アプリ | 3000 | 既存（変更なし） |
| Bullet Hell Frontend | 8000 | Docker Nginx（内部） |
| Bullet Hell Backend | 3001 | Docker Rust（内部） |
| PostgreSQL | 5432 | Docker（内部のみ） |
| Redis | 6379 | Docker（内部のみ） |

#### トラブルシューティング

**ポートが既に使用されている場合**
```bash
sudo lsof -i :8000
sudo lsof -i :3001
```

**Nginx エラー時**
```bash
# 設定テスト
sudo nginx -t

# エラーログ確認
sudo tail -f /var/log/nginx/error.log

# Nginx 再起動
sudo systemctl restart nginx
```

**Docker コンテナエラー**
```bash
# ログ確認
docker compose -f docker-compose.prod.yml logs backend

# コンテナ再起動
docker compose -f docker-compose.prod.yml restart
```

#### ロールバック（復元）

既存設定に戻す場合：
```bash
sudo cp /etc/nginx/sites-available/my-portfolio.bak /etc/nginx/sites-available/my-portfolio
sudo systemctl reload nginx
```

### 既存 Node.js サーバーとの統合（ローカル開発）

8000番ポートのプロセスを一括でkillするコマンド:
```bash
lsof -ti :8000 | xargs kill
```

既にビルド済みの場合:
```bash
cd /Users/kouya/coding/rust_project/www
python3 -m http.server 8000
```

### アクセス URL

- **フロントエンド**: http://localhost:8000
- **バックエンドAPI**: http://localhost:3000
- **ヘルスチェック**: http://localhost:3000/health
- **リーダーボード**: http://localhost:3000/api/leaderboard?difficulty=normal&limit=10

## 📁 プロジェクト構造

```
rust_project/
├── Cargo.toml              # Rust 依存関係 (フロントエンド)
├── src/
│   └── lib.rs              # WebAssembly ゲームエンジン (SoA実装)
├── www/
│   ├── index.html          # ゲーム UI
│   └── renderer.js         # Canvas レンダラー
├── backend/
│   ├── Cargo.toml          # Rust 依存関係 (バックエンド)
│   ├── Dockerfile          # Docker イメージ定義
│   ├── src/
│   │   ├── main.rs         # Axum サーバー
│   │   ├── handlers.rs     # API エンドポイント
│   │   ├── db.rs           # PostgreSQL 接続
│   │   ├── redis.rs        # Redis リーダーボード
│   │   └── models.rs       # データモデル
│   └── migrations/
│       └── 001_init.sql    # DB スキーマ
└── docker-compose.yml      # サービス定義
```

## 🎮 使い方

### ゲームモード

1. **Practice Mode**: オフラインで練習
2. **Ranked Match**: オンラインでスコアを競う

### 操作方法

- **マウス移動**: プレイヤー操作（カーソル位置に正確に追従）
- **弾を避ける**: 生き残った時間がスコア

### ゲームシステム

- **HP**: 3（被弾すると1減少、0でゲームオーバー）
- **無敵時間**: 被弾後1秒間無敵
- **弾幕パターン**: ランダム、円形、螺旋、混合
- **難易度**: 弾の密度と速度が徐々に上昇

### ランクマッチ

- ユーザー名を入力してプレイ
- デバイス（モバイル/PC）を選択
- 生存時間がスコアとして記録
- **デバイス別ランキング**: モバイルとPCのランキングは別々に管理
- リーダーボードで順位を確認
- 難易度別ランキング

## 🔧 技術詳細

### Struct of Arrays (SoA) パターン

```rust
pub struct BulletSystem {
    x: Vec<f32>,      // X座標配列
    y: Vec<f32>,      // Y座標配列
    vx: Vec<f32>,     // X速度配列
    vy: Vec<f32>,     // Y速度配列
    radius: Vec<f32>, // 半径配列
    color: Vec<u32>,  // カラー配列
    alive: Vec<bool>, // アクティブフラグ
}
```

**利点:**
- キャッシュラインに沿ったデータアクセス
- SIMD 最適化の可能性
- メモリレイアウトの予測可能性

### 共有メモリアクセス

```javascript
// Rust 側からポインタを取得
const xPtr = engine.get_x_ptr();

// JavaScript で型付き配列として読み取り
const x = new Float32Array(wasmMemory.buffer, xPtr, capacity);
```

### パフォーマンス最適化

- **リリースビルド**: LTO 有効、最適化レベル 3
- **ゼロコピー**: JS と Rust 間でデータコピー不要
- **画面外カリング**: 自動的に非表示弾を削除

## 📊 パフォーマンス目標

| 弾数 | 目標 FPS | 状態 |
|------|----------|------|
| 1,000 | 60 FPS | ✅ |
| 10,000 | 60 FPS | ✅ |
| 50,000 | 30+ FPS | 🎯 |
| 100,000 | 15+ FPS | 🎯 |

## 🏗️ 技術スタック

### フロントエンド
- **Rust + WebAssembly**: ゲームロジック
- **JavaScript + Canvas 2D**: レンダリング
- **Struct of Arrays (SoA)**: メモリ最適化

### バックエンド
- **Rust + Axum**: REST API
- **PostgreSQL**: プレイヤー & スコア保存
- **Redis**: リアルタイムランキング (ZSET)
- **Docker Compose**: サービスオーケストレーション

## 🛠️ 拡張案

- [ ] SIMD 最適化 (`std::simd`)
- [ ] スペーシャルハッシュで衝突判定高速化
- [ ] WebGL レンダラー
- [ ] マルチスレッド (`Web Workers`)
- [ ] パーティクルシステム
- [ ] リアルタイムマルチプレイヤー (WebSocket)
- [ ] リプレイ機能
- [ ] アチーブメントシステム

## 🔧 管理コマンド

### Docker 操作

```bash
# サービス起動
docker compose up -d

# ログ確認
docker compose logs -f backend

# サービス停止
docker compose down

# データリセット（DBとRedis削除）
docker compose down -v

# バックエンド再ビルド
docker compose build backend
```

### フロントエンド再ビルド

```bash
wasm-pack build --target web
rm -rf www/pkg && cp -r pkg www/
```

## 🧪 API エンドポイント

```bash
# ヘルスチェック
curl http://localhost:3000/health

# スコア投稿（PC用）
curl -X POST http://localhost:3000/api/scores \
  -H "Content-Type: application/json" \
  -d '{
    "username": "Player1",
    "survival_time": 120.5,
    "difficulty": "normal",
    "bullet_density": "high",
    "bullet_pattern": "spiral",
    "max_hp": 3,
    "device_type": "pc"
  }'

# スコア投稿（モバイル用）
curl -X POST http://localhost:3000/api/scores \
  -H "Content-Type: application/json" \
  -d '{
    "username": "Player1",
    "survival_time": 120.5,
    "difficulty": "normal",
    "bullet_density": "high",
    "bullet_pattern": "spiral",
    "max_hp": 3,
    "device_type": "mobile"
  }'

# PC用リーダーボード取得
curl "http://localhost:3000/api/leaderboard?difficulty=normal&device_type=pc&limit=10"

# モバイル用リーダーボード取得
curl "http://localhost:3000/api/leaderboard?difficulty=normal&device_type=mobile&limit=10"

# プレイヤー統計
curl "http://localhost:3000/api/players/Player1/stats"
```

## 📝 ライセンス

MIT

## 🤝 貢献

Issue や Pull Request 歓迎！
