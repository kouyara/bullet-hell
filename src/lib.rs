use wasm_bindgen::prelude::*;
use std::f32::consts::PI;

/// Struct of Arrays (SoA) パターンで弾データを管理
/// キャッシュ効率を最大化し、SIMD最適化の余地を残す
#[wasm_bindgen]
pub struct BulletSystem {
    // 各配列は同じ長さで、インデックスが対応
    x: Vec<f32>,      // X座標
    y: Vec<f32>,      // Y座標
    vx: Vec<f32>,     // X方向速度
    vy: Vec<f32>,     // Y方向速度
    radius: Vec<f32>, // 弾の半径
    color: Vec<u32>,  // RGBA カラー (packed u32)
    alive: Vec<bool>, // アクティブフラグ
    capacity: usize,  // 最大弾数
    count: usize,     // 現在のアクティブ弾数
}

#[wasm_bindgen]
impl BulletSystem {
    /// 新しい BulletSystem を指定容量で作成
    #[wasm_bindgen(constructor)]
    pub fn new(capacity: usize) -> BulletSystem {
        BulletSystem {
            x: vec![0.0; capacity],
            y: vec![0.0; capacity],
            vx: vec![0.0; capacity],
            vy: vec![0.0; capacity],
            radius: vec![0.0; capacity],
            color: vec![0; capacity],
            alive: vec![false; capacity],
            capacity,
            count: 0,
        }
    }

    /// 新しい弾を追加
    pub fn spawn_bullet(&mut self, x: f32, y: f32, vx: f32, vy: f32, radius: f32, color: u32) {
        if self.count < self.capacity {
            // 空いているスロットを探す
            for i in 0..self.capacity {
                if !self.alive[i] {
                    self.x[i] = x;
                    self.y[i] = y;
                    self.vx[i] = vx;
                    self.vy[i] = vy;
                    self.radius[i] = radius;
                    self.color[i] = color;
                    self.alive[i] = true;
                    self.count += 1;
                    break;
                }
            }
        }
    }

    /// 円形パターンで弾を発射
    pub fn spawn_circle_pattern(&mut self, x: f32, y: f32, count: usize, speed: f32, radius: f32, color: u32) {
        let angle_step = 2.0 * PI / count as f32;
        for i in 0..count {
            let angle = angle_step * i as f32;
            let vx = angle.cos() * speed;
            let vy = angle.sin() * speed;
            self.spawn_bullet(x, y, vx, vy, radius, color);
        }
    }

    /// 全弾を更新（位置移動、画面外判定）
    pub fn update(&mut self, delta_time: f32, screen_width: f32, screen_height: f32) {
        let margin = 50.0; // 画面外マージン
        
        for i in 0..self.capacity {
            if !self.alive[i] {
                continue;
            }

            // 位置更新
            self.x[i] += self.vx[i] * delta_time;
            self.y[i] += self.vy[i] * delta_time;

            // 画面外判定
            if self.x[i] < -margin || self.x[i] > screen_width + margin
                || self.y[i] < -margin || self.y[i] > screen_height + margin
            {
                self.alive[i] = false;
                self.count -= 1;
            }
        }
    }

    /// アクティブな弾の数を取得
    pub fn get_count(&self) -> usize {
        self.count
    }

    /// 容量を取得
    pub fn get_capacity(&self) -> usize {
        self.capacity
    }

    /// 共有メモリ用: X座標配列へのポインタ
    pub fn get_x_ptr(&self) -> *const f32 {
        self.x.as_ptr()
    }

    /// 共有メモリ用: Y座標配列へのポインタ
    pub fn get_y_ptr(&self) -> *const f32 {
        self.y.as_ptr()
    }

    /// 共有メモリ用: 半径配列へのポインタ
    pub fn get_radius_ptr(&self) -> *const f32 {
        self.radius.as_ptr()
    }

    /// 共有メモリ用: カラー配列へのポインタ
    pub fn get_color_ptr(&self) -> *const u32 {
        self.color.as_ptr()
    }

    /// 共有メモリ用: アライブフラグ配列へのポインタ
    pub fn get_alive_ptr(&self) -> *const bool {
        self.alive.as_ptr()
    }

    /// すべての弾をクリア
    pub fn clear(&mut self) {
        for i in 0..self.capacity {
            self.alive[i] = false;
        }
        self.count = 0;
    }

    /// 指定座標との円形衝突判定（プレイヤーなど）
    pub fn check_collision(&self, target_x: f32, target_y: f32, target_radius: f32) -> bool {
        for i in 0..self.capacity {
            if !self.alive[i] {
                continue;
            }

            let dx = self.x[i] - target_x;
            let dy = self.y[i] - target_y;
            let dist_sq = dx * dx + dy * dy;
            let sum_radius = self.radius[i] + target_radius;

            if dist_sq < sum_radius * sum_radius {
                return true;
            }
        }
        false
    }
}

/// ゲームエンジンのメインコントローラー
#[wasm_bindgen]
pub struct GameEngine {
    bullet_system: BulletSystem,
    frame_count: u64,
    screen_width: f32,
    screen_height: f32,
}

#[wasm_bindgen]
impl GameEngine {
    /// 新しいゲームエンジンを作成
    #[wasm_bindgen(constructor)]
    pub fn new(max_bullets: usize, screen_width: f32, screen_height: f32) -> GameEngine {
        GameEngine {
            bullet_system: BulletSystem::new(max_bullets),
            frame_count: 0,
            screen_width,
            screen_height,
        }
    }

    /// フレーム更新
    pub fn update(&mut self, delta_time: f32) {
        self.bullet_system.update(delta_time, self.screen_width, self.screen_height);
        self.frame_count += 1;
    }

    /// 弾を発射
    pub fn spawn_bullet(&mut self, x: f32, y: f32, vx: f32, vy: f32, radius: f32, color: u32) {
        self.bullet_system.spawn_bullet(x, y, vx, vy, radius, color);
    }

    /// 円形パターンで弾を発射
    pub fn spawn_circle_pattern(&mut self, x: f32, y: f32, count: usize, speed: f32, radius: f32, color: u32) {
        self.bullet_system.spawn_circle_pattern(x, y, count, speed, radius, color);
    }

    /// 衝突判定
    pub fn check_collision(&self, x: f32, y: f32, radius: f32) -> bool {
        self.bullet_system.check_collision(x, y, radius)
    }

    /// 弾をクリア
    pub fn clear_bullets(&mut self) {
        self.bullet_system.clear();
    }

    /// 現在の弾数を取得
    pub fn get_bullet_count(&self) -> usize {
        self.bullet_system.get_count()
    }

    /// フレーム数を取得
    pub fn get_frame_count(&self) -> u64 {
        self.frame_count
    }

    // 共有メモリアクセス用のゲッター
    pub fn get_x_ptr(&self) -> *const f32 {
        self.bullet_system.get_x_ptr()
    }

    pub fn get_y_ptr(&self) -> *const f32 {
        self.bullet_system.get_y_ptr()
    }

    pub fn get_radius_ptr(&self) -> *const f32 {
        self.bullet_system.get_radius_ptr()
    }

    pub fn get_color_ptr(&self) -> *const u32 {
        self.bullet_system.get_color_ptr()
    }

    pub fn get_alive_ptr(&self) -> *const bool {
        self.bullet_system.get_alive_ptr()
    }

    pub fn get_capacity(&self) -> usize {
        self.bullet_system.get_capacity()
    }
}
