CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL,
    device_type VARCHAR(10) NOT NULL CHECK (device_type IN ('mobile', 'pc')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(username, device_type)
);

CREATE TABLE IF NOT EXISTS scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    survival_time FLOAT NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    bullet_density VARCHAR(20) NOT NULL,
    bullet_pattern VARCHAR(20) NOT NULL,
    max_hp INTEGER NOT NULL,
    device_type VARCHAR(10) NOT NULL CHECK (device_type IN ('mobile', 'pc')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE VIEW leaderboard AS
SELECT 
    p.id as player_id,
    p.username,
    p.device_type,
    s.survival_time,
    s.difficulty,
    s.bullet_density,
    s.bullet_pattern,
    s.max_hp,
    s.created_at,
    ROW_NUMBER() OVER (PARTITION BY s.difficulty, s.device_type ORDER BY s.survival_time DESC) as rank
FROM scores s
JOIN players p ON s.player_id = p.id;

CREATE OR REPLACE VIEW player_best_scores AS
SELECT DISTINCT ON (player_id, difficulty)
    player_id,
    survival_time,
    difficulty,
    bullet_density,
    bullet_pattern,
    max_hp,
    created_at
FROM scores
ORDER BY player_id, difficulty, survival_time DESC;

CREATE INDEX IF NOT EXISTS idx_scores_survival_time ON scores(survival_time DESC);
CREATE INDEX IF NOT EXISTS idx_scores_created_at ON scores(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scores_device_type ON scores(device_type);
CREATE INDEX IF NOT EXISTS idx_players_username_device ON players(username, device_type);
