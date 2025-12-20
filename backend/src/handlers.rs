use crate::models::*;
use crate::redis::RedisClient;
use anyhow::Result;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use sqlx::PgPool;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct AppState {
    pub db: PgPool,
    pub redis: Arc<Mutex<RedisClient>>,
}

pub async fn health_check() -> &'static str {
    "OK"
}

pub async fn create_or_get_player(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreatePlayerRequest>,
) -> Result<Json<Player>, (StatusCode, String)> {
    if let Ok(existing) = sqlx::query_as::<_, Player>(
        "SELECT id, username, device_type, created_at, updated_at FROM players WHERE username = $1 AND device_type = $2"
    )
    .bind(&req.username)
    .bind(&req.device_type)
    .fetch_one(&state.db)
    .await
    {
        return Ok(Json(existing));
    }

    let player = sqlx::query_as::<_, Player>(
        "INSERT INTO players (username, device_type) VALUES ($1, $2) RETURNING id, username, device_type, created_at, updated_at"
    )
    .bind(&req.username)
    .bind(&req.device_type)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(player))
}

pub async fn submit_score(
    State(state): State<Arc<AppState>>,
    Json(req): Json<SubmitScoreRequest>,
) -> Result<Json<SubmitScoreResponse>, (StatusCode, String)> {
    let player = match sqlx::query_as::<_, Player>(
        "SELECT id, username, device_type, created_at, updated_at FROM players WHERE username = $1 AND device_type = $2"
    )
    .bind(&req.username)
    .bind(&req.device_type)
    .fetch_one(&state.db)
    .await
    {
        Ok(p) => p,
        Err(_) => {
            sqlx::query_as::<_, Player>(
                "INSERT INTO players (username, device_type) VALUES ($1, $2) RETURNING id, username, device_type, created_at, updated_at"
            )
            .bind(&req.username)
            .bind(&req.device_type)
            .fetch_one(&state.db)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        }
    };

    let score = sqlx::query_as::<_, Score>(
        "INSERT INTO scores (player_id, survival_time, difficulty, bullet_density, bullet_pattern, max_hp, device_type) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id, player_id, survival_time, difficulty, bullet_density, bullet_pattern, max_hp, device_type, created_at"
    )
    .bind(&player.id)
    .bind(req.survival_time)
    .bind(&req.difficulty)
    .bind(&req.bullet_density)
    .bind(&req.bullet_pattern)
    .bind(req.max_hp)
    .bind(&req.device_type)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut redis = state.redis.lock().await;
    let redis_key = format!("{}:{}", req.difficulty, req.device_type);
    redis
        .add_score(&redis_key, &req.username, req.survival_time)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let rank = redis
        .get_user_rank(&redis_key, &req.username)
        .await
        .ok()
        .flatten();

    let prev_best: Option<f64> = sqlx::query_scalar(
        "SELECT MAX(survival_time) FROM scores 
         WHERE player_id = $1 AND difficulty = $2 AND device_type = $3 AND id != $4"
    )
    .bind(&player.id)
    .bind(&req.difficulty)
    .bind(&req.device_type)
    .bind(&score.id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .flatten();

    let is_personal_best = prev_best.map_or(true, |best| req.survival_time > best);

    Ok(Json(SubmitScoreResponse {
        score_id: score.id,
        player_id: player.id,
        rank,
        is_personal_best,
    }))
}

pub async fn get_leaderboard(
    State(state): State<Arc<AppState>>,
    Query(query): Query<LeaderboardQuery>,
) -> Result<Json<Vec<LeaderboardEntry>>, (StatusCode, String)> {
    let difficulty = query.difficulty.unwrap_or_else(|| "normal".to_string());
    let device_type = query.device_type.unwrap_or_else(|| "pc".to_string());
    let limit = query.limit.unwrap_or(100);

    let entries = sqlx::query_as::<_, LeaderboardEntry>(
        "SELECT * FROM leaderboard WHERE difficulty = $1 AND device_type = $2 ORDER BY rank LIMIT $3"
    )
    .bind(&difficulty)
    .bind(&device_type)
    .bind(limit)
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(entries))
}

pub async fn get_player_scores(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(username): axum::extract::Path<String>,
) -> Result<Json<Vec<Score>>, (StatusCode, String)> {
    let scores = sqlx::query_as::<_, Score>(
        "SELECT s.* FROM scores s 
         JOIN players p ON s.player_id = p.id 
         WHERE p.username = $1 
         ORDER BY s.created_at DESC 
         LIMIT 50"
    )
    .bind(&username)
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(scores))
}

pub async fn get_player_stats(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(username): axum::extract::Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let player = sqlx::query_as::<_, Player>(
        "SELECT * FROM players WHERE username = $1"
    )
    .bind(&username)
    .fetch_one(&state.db)
    .await
    .map_err(|_| (StatusCode::NOT_FOUND, "Player not found".to_string()))?;

    let total_games: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM scores WHERE player_id = $1"
    )
    .bind(&player.id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let best_time: Option<f64> = sqlx::query_scalar(
        "SELECT MAX(survival_time) FROM scores WHERE player_id = $1"
    )
    .bind(&player.id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let avg_time: Option<f64> = sqlx::query_scalar(
        "SELECT AVG(survival_time) FROM scores WHERE player_id = $1"
    )
    .bind(&player.id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(serde_json::json!({
        "player": player,
        "total_games": total_games,
        "best_time": best_time,
        "average_time": avg_time,
    })))
}
