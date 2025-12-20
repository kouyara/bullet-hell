mod db;
mod handlers;
mod models;
mod redis;

use anyhow::Result;
use axum::{
    routing::{get, post},
    Router,
};
use handlers::AppState;
use std::sync::Arc;
use tokio::sync::Mutex;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    dotenvy::dotenv().ok();
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://bullet_user:bullet_pass@localhost:5432/bullet_hell".to_string());
    let redis_url = std::env::var("REDIS_URL")
        .unwrap_or_else(|_| "redis://localhost:6379".to_string());
    let host = std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = std::env::var("PORT").unwrap_or_else(|_| "3000".to_string());

    tracing::info!("🚀 Starting Bullet Hell Backend Server");

    let db_pool = db::create_pool(&database_url).await?;
    
    let redis_client = redis::RedisClient::new(&redis_url).await?;

    // アプリケーション状態
    let state = Arc::new(AppState {
        db: db_pool,
        redis: Arc::new(Mutex::new(redis_client)),
    });

    // CORS設定
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // ルーター構築
    let app = Router::new()
        .route("/health", get(handlers::health_check))
        .route("/api/players", post(handlers::create_or_get_player))
        .route("/api/scores", post(handlers::submit_score))
        .route("/api/leaderboard", get(handlers::get_leaderboard))
        .route("/api/players/:username/scores", get(handlers::get_player_scores))
        .route("/api/players/:username/stats", get(handlers::get_player_stats))
        .layer(cors)
        .with_state(state);

    // サーバー起動
    let addr = format!("{}:{}", host, port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    
    tracing::info!("✅ Server listening on http://{}", addr);
    tracing::info!("📊 API Endpoints:");
    tracing::info!("   GET  /health");
    tracing::info!("   POST /api/players");
    tracing::info!("   POST /api/scores");
    tracing::info!("   GET  /api/leaderboard");
    tracing::info!("   GET  /api/players/:username/scores");
    tracing::info!("   GET  /api/players/:username/stats");

    axum::serve(listener, app).await?;

    Ok(())
}
