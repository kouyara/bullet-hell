# Bullet Hell Survival - ランクマッチ完全ガイド

## 🚀 クイックスタート

### 必要な環境
- Docker & Docker Compose
- ブラウザ

### 起動方法

```bash
# 1. すべてのサービスを起動（PostgreSQL + Redis + Backend）
docker-compose up -d

# 2. フロントエンド用サーバー起動
cd www
python3 -m http.server 8000

# 3. ブラウザで開く
# http://localhost:8000
```

### サービス確認

```bash
# サービス状態確認
docker-compose ps

# バックエンドログ確認
docker-compose logs -f backend

# データベース接続テスト
docker-compose exec postgres psql -U bullet_user -d bullet_hell
```

## 📊 API エンドポイント

### ベースURL
```
http://localhost:3000/api
```

### エンドポイント一覧

#### 1. ヘルスチェック
```
GET /health
```

#### 2. プレイヤー作成/取得
```http
POST /api/players
Content-Type: application/json

{
  "username": "player_name"
}
```

#### 3. スコア送信
```http
POST /api/scores
Content-Type: application/json

{
  "username": "player_name",
  "survival_time": 45.67,
  "difficulty": "normal",
  "bullet_density": "medium",
  "bullet_pattern": "random",
  "max_hp": 3
}
```

**レスポンス:**
```json
{
  "score_id": "uuid",
  "player_id": "uuid",
  "rank": 5,
  "is_personal_best": true
}
```

#### 4. リーダーボード取得
```http
GET /api/leaderboard?difficulty=normal&limit=50
```

**レスポンス:**
```json
[
  {
    "player_id": "uuid",
    "username": "player1",
    "survival_time": 123.45,
    "difficulty": "normal",
    "bullet_density": "high",
    "bullet_pattern": "mixed",
    "max_hp": 3,
    "created_at": "2025-11-27T...",
    "rank": 1
  }
]
```

#### 5. プレイヤーのスコア履歴
```http
GET /api/players/:username/scores
```

#### 6. プレイヤー統計
```http
GET /api/players/:username/stats
```

**レスポンス:**
```json
{
  "player": {
    "id": "uuid",
    "username": "player1",
    "created_at": "...",
    "updated_at": "..."
  },
  "total_games": 42,
  "best_time": 123.45,
  "average_time": 45.67
}
```

## 🎮 ゲームモード

### Practice Mode
- ランキングに記録されない練習モード
- 自由に設定を変更して試せる

### Ranked Match
- プレイヤー名を入力してランキングに挑戦
- スコアはPostgreSQLに保存
- Redis ZSETで高速ランキング
- 個人ベスト・世界ランク表示

## 🏗️ アーキテクチャ

```
┌─────────────┐
│   Browser   │
│ (WebAssembly)│
└──────┬──────┘
       │ HTTP REST API
       │
┌──────▼──────┐     ┌──────────┐     ┌──────────┐
│    Axum     │────▶│PostgreSQL│     │  Redis   │
│  (Rust)     │     │ (Scores) │     │(Ranking) │
└─────────────┘     └──────────┘     └──────────┘
```

### 技術スタック

**フロントエンド:**
- Rust + WebAssembly (ゲームロジック)
- JavaScript (Canvas 描画・API通信)

**バックエンド:**
- Rust + Axum (Web Framework)
- Tokio (Async Runtime)
- SQLx (PostgreSQL Driver)
- Redis (Ranking Cache)

**インフラ:**
- Docker Compose
- PostgreSQL 16
- Redis 7

## 🗄️ データベーススキーマ

### players テーブル
```sql
CREATE TABLE players (
    id UUID PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### scores テーブル
```sql
CREATE TABLE scores (
    id UUID PRIMARY KEY,
    player_id UUID REFERENCES players(id),
    survival_time FLOAT NOT NULL,
    difficulty VARCHAR(20),
    bullet_density VARCHAR(20),
    bullet_pattern VARCHAR(20),
    max_hp INTEGER,
    created_at TIMESTAMP
);
```

### Redis データ構造
```
leaderboard:easy     → ZSET (score → username)
leaderboard:normal   → ZSET
leaderboard:hard     → ZSET
leaderboard:lunatic  → ZSET
```

## 🔧 開発・デバッグ

### ローカル開発

```bash
# バックエンド単体起動
cd backend
cargo run

# データベースマイグレーション
docker-compose up -d postgres
export DATABASE_URL=postgres://bullet_user:bullet_pass@localhost:5432/bullet_hell
sqlx migrate run
```

### テスト用curlコマンド

```bash
# スコア送信
curl -X POST http://localhost:3000/api/scores \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_player",
    "survival_time": 99.99,
    "difficulty": "normal",
    "bullet_density": "high",
    "bullet_pattern": "mixed",
    "max_hp": 3
  }'

# リーダーボード取得
curl http://localhost:3000/api/leaderboard?difficulty=normal&limit=10
```

### Redisデバッグ

```bash
# Redis CLI接続
docker-compose exec redis redis-cli

# ランキング確認
ZREVRANGE leaderboard:normal 0 9 WITHSCORES

# 全キー確認
KEYS *
```

## 📈 パフォーマンス

- **PostgreSQL**: プレイヤー・スコアの永続化
- **Redis ZSET**: O(log N) でランキング取得
  - 10万件でも高速
  - メモリキャッシュで低レイテンシ
- **Axum**: 非同期処理で高スループット

## 🔐 セキュリティ考慮事項

現在の実装（プロトタイプ）:
- CORS: 全許可 (開発用)
- 認証なし

本番環境では追加すべき:
- JWT認証
- レート制限
- 入力バリデーション強化
- HTTPS必須
- CORS制限

## 📝 TODO / 拡張案

- [ ] ユーザー認証（JWT）
- [ ] リプレイ機能
- [ ] 週間・月間ランキング
- [ ] フレンドシステム
- [ ] アチーブメント
- [ ] プロフィール画像
- [ ] チャット機能
- [ ] トーナメントモード

## 🐛 トラブルシューティング

### バックエンドが起動しない
```bash
# ログ確認
docker-compose logs backend

# PostgreSQL接続確認
docker-compose exec postgres pg_isready -U bullet_user
```

### リーダーボードが表示されない
- ブラウザのコンソールでエラー確認
- CORS設定確認
- バックエンドURL確認 (localhost:3000)

### データベースリセット
```bash
docker-compose down -v
docker-compose up -d
```
