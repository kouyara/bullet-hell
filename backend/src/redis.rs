use anyhow::Result;
use redis::{aio::ConnectionManager, AsyncCommands};

pub struct RedisClient {
    conn: ConnectionManager,
}

impl RedisClient {
    pub async fn new(redis_url: &str) -> Result<Self> {
        let client = redis::Client::open(redis_url)?;
        let conn = ConnectionManager::new(client).await?;
        
        tracing::info!("✅ Redis connection established");
        Ok(Self { conn })
    }

    /// ランキングにスコアを追加（ZSET使用）
    pub async fn add_score(
        &mut self,
        difficulty: &str,
        username: &str,
        score: f64,
    ) -> Result<()> {
        let key = format!("leaderboard:{}", difficulty);
        let _: () = self.conn.zadd(&key, username, score).await?;
        Ok(())
    }

    /// ランキング上位を取得
    pub async fn get_top_scores(
        &mut self,
        difficulty: &str,
        limit: i64,
    ) -> Result<Vec<(String, f64)>> {
        let key = format!("leaderboard:{}", difficulty);
        let results: Vec<(String, f64)> = self.conn
            .zrevrange_withscores(&key, 0, (limit - 1) as isize)
            .await?;
        Ok(results)
    }

    /// ユーザーの順位を取得
    pub async fn get_user_rank(
        &mut self,
        difficulty: &str,
        username: &str,
    ) -> Result<Option<i64>> {
        let key = format!("leaderboard:{}", difficulty);
        let rank: Option<i64> = self.conn.zrevrank(&key, username).await?;
        Ok(rank.map(|r| r + 1)) // 0-indexed to 1-indexed
    }

    /// 全難易度のランキング統計を取得
    pub async fn get_leaderboard_stats(&mut self, difficulty: &str) -> Result<i64> {
        let key = format!("leaderboard:{}", difficulty);
        let count: i64 = self.conn.zcard(&key).await?;
        Ok(count)
    }
}
