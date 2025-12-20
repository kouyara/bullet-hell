use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Player {
    pub id: Uuid,
    pub username: String,
    pub device_type: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Score {
    pub id: Uuid,
    pub player_id: Uuid,
    pub survival_time: f64,
    pub difficulty: String,
    pub bullet_density: String,
    pub bullet_pattern: String,
    pub max_hp: i32,
    pub device_type: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct LeaderboardEntry {
    pub player_id: Uuid,
    pub username: String,
    pub device_type: String,
    pub survival_time: f64,
    pub difficulty: String,
    pub bullet_density: String,
    pub bullet_pattern: String,
    pub max_hp: i32,
    pub created_at: DateTime<Utc>,
    pub rank: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreatePlayerRequest {
    pub username: String,
    pub device_type: String,
}

#[derive(Debug, Deserialize)]
pub struct SubmitScoreRequest {
    pub username: String,
    pub survival_time: f64,
    pub difficulty: String,
    pub bullet_density: String,
    pub bullet_pattern: String,
    pub max_hp: i32,
    pub device_type: String,
}

#[derive(Debug, Serialize)]
pub struct SubmitScoreResponse {
    pub score_id: Uuid,
    pub player_id: Uuid,
    pub rank: Option<i64>,
    pub is_personal_best: bool,
}

#[derive(Debug, Deserialize)]
pub struct LeaderboardQuery {
    pub difficulty: Option<String>,
    pub device_type: Option<String>,
    pub limit: Option<i64>,
}
