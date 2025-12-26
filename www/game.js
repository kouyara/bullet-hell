import init, { GameEngine } from './pkg/bullet_hell_engine.js';
import { Renderer, InputManager } from './renderer.js';

async function run() {
    const wasm = await init();
    const wasmMemory = wasm.memory;

    const canvas = document.getElementById('gameCanvas');
    const loading = document.getElementById('loading');
    
    canvas.classList.remove('hidden');
    loading.classList.add('hidden');

    const MAX_BULLETS = 100000;
    const engine = new GameEngine(MAX_BULLETS, canvas.width, canvas.height);
    const renderer = new Renderer(canvas);
    const input = new InputManager(canvas);

    let playerX = canvas.width / 2;
    let playerY = canvas.height / 2;
    const playerRadius = 3;

    let gameRunning = false;
    let gameStartTime = 0;
    let survivalTime = 0;
    let currentHp = 3;
    let maxHp = 3;
    let isInvincible = false;
    let invincibleTimer = 0;
    const invincibleDuration = 1.0;

    function detectDeviceType() {
        const userAgent = navigator.userAgent.toLowerCase();
        const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(userAgent);
        return isMobile ? 'mobile' : 'pc';
    }

    let isRankedMode = false;
    let currentUsername = null;
    let currentDeviceType = detectDeviceType();
    
    const API_BASE = (() => {
        const hostname = window.location.hostname;
        const port = window.location.port;
        
        // ローカル開発環境（port 8000）の場合、バックエンドサーバー（port 3000）を指定
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') {
            if (port === '8000') {
                return 'http://localhost:3000/api';
            }
        }
        
        if (hostname.includes('u-ryukyu.ac.jp')) {
            return '/bullet-hell/api';
        }
        
        return '/api';
    })();

    // デバイスタイプ表示を更新
    function updateDeviceTypeDisplay() {
        const deviceType = currentDeviceType;
        const deviceIcon = deviceType === 'pc' ? '🖥️' : '📱';
        const deviceName = deviceType === 'pc' ? 'PC' : 'Mobile';
        const displayElement = document.getElementById('deviceTypeDisplay');
        const inputElement = document.getElementById('deviceType');
        if (displayElement) {
            displayElement.textContent = `${deviceIcon} ${deviceName}`;
        }
        if (inputElement) {
            inputElement.value = deviceType;
        }
    }

    let bulletSpeedMultiplier = 1.0;
    let bulletSpawnRate = 50;
    let bulletPattern = 'random';
    let bulletSpawnTimer = 0;

    let lastTime = performance.now();
    let frameCount = 0;
    let fps = 60;
    let fpsUpdateTime = lastTime;

    document.getElementById('loading').classList.add('hidden');
    document.getElementById('modeSelector').classList.remove('hidden');
    document.getElementById('modeSelector').classList.add('flex');
    updateDeviceTypeDisplay();

    document.getElementById('practiceMode').addEventListener('click', () => {
        isRankedMode = false;
        document.getElementById('practiceMode').classList.remove('bg-[#222]', 'text-gray-500', 'border-[#444]');
        document.getElementById('practiceMode').classList.add('bg-[#0f0]', 'text-black', 'border-[#0f0]');
        document.getElementById('rankedMode').classList.remove('bg-[#0f0]', 'text-black', 'border-[#0f0]');
        document.getElementById('rankedMode').classList.add('bg-[#222]', 'text-gray-500', 'border-[#444]');
        document.getElementById('gameSettings').classList.remove('hidden');
        document.getElementById('usernameInput').classList.add('hidden');
        document.getElementById('leaderboard').classList.add('hidden');
        document.getElementById('rankedModeIndicator').classList.add('hidden');
    });

    document.getElementById('rankedMode').addEventListener('click', () => {
        isRankedMode = true;
        document.getElementById('practiceMode').classList.remove('bg-[#0f0]', 'text-black', 'border-[#0f0]');
        document.getElementById('practiceMode').classList.add('bg-[#222]', 'text-gray-500', 'border-[#444]');
        document.getElementById('rankedMode').classList.remove('bg-[#222]', 'text-gray-500', 'border-[#444]');
        document.getElementById('rankedMode').classList.add('bg-[#0f0]', 'text-black', 'border-[#0f0]');
        document.getElementById('gameSettings').classList.add('hidden');
        document.getElementById('usernameInput').classList.remove('hidden');
        document.getElementById('leaderboard').classList.remove('hidden');
        loadLeaderboard();
    });

    document.getElementById('confirmUsername').addEventListener('click', () => {
        const username = document.getElementById('usernameField').value.trim();
        if (username.length < 3) {
            alert('プレイヤー名は3文字以上入力してください');
            return;
        }
        currentUsername = username;
        // currentDeviceTypeは既に自動検出済み
        const deviceIcon = currentDeviceType === 'pc' ? '🖥️' : '📱';
        document.getElementById('currentPlayerName').textContent = `${username} ${deviceIcon}`;
        document.getElementById('usernameInput').classList.add('hidden');
        document.getElementById('gameSettings').classList.remove('hidden');
        document.getElementById('rankedModeIndicator').classList.remove('hidden');
    });

    document.getElementById('backFromUsername').addEventListener('click', () => {
        document.getElementById('usernameInput').classList.add('hidden');
        document.getElementById('leaderboard').classList.add('hidden');
        isRankedMode = false;
        document.getElementById('practiceMode').classList.remove('bg-[#222]', 'text-gray-500', 'border-[#444]');
        document.getElementById('practiceMode').classList.add('bg-[#0f0]', 'text-black', 'border-[#0f0]');
        document.getElementById('rankedMode').classList.remove('bg-[#0f0]', 'text-black', 'border-[#0f0]');
        document.getElementById('rankedMode').classList.add('bg-[#222]', 'text-gray-500', 'border-[#444]');
    });

    async function loadLeaderboard() {
        try {
            const difficulty = document.getElementById('difficulty').value;
            const deviceType = currentDeviceType || 'pc';
            const response = await fetch(`${API_BASE}/leaderboard?difficulty=${difficulty}&device_type=${deviceType}&limit=50`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            const tbody = document.getElementById('leaderboardBody');
            tbody.innerHTML = '';
            
            document.getElementById('leaderboardDifficulty').textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
            
            data.forEach(entry => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-[#222]';
                let rankClass = 'p-2.5 text-left border-b border-[#333]';
                if (entry.rank === 1) rankClass += ' text-yellow-400 font-bold';
                else if (entry.rank === 2) rankClass += ' text-gray-300 font-bold';
                else if (entry.rank === 3) rankClass += ' text-orange-400 font-bold';
                row.innerHTML = `
                    <td class="${rankClass}">${entry.rank}</td>
                    <td class="p-2.5 text-left border-b border-[#333]">${entry.username}</td>
                    <td class="p-2.5 text-left border-b border-[#333]">${entry.survival_time.toFixed(2)}s</td>
                    <td class="p-2.5 text-left border-b border-[#333]">${entry.bullet_density} / ${entry.bullet_pattern}</td>
                `;
                if (currentUsername && entry.username === currentUsername) {
                    row.classList.add('bg-green-900/30');
                }
                tbody.appendChild(row);
            });
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
            const tbody = document.getElementById('leaderboardBody');
            tbody.innerHTML = '<tr><td colspan="4" class="p-5 text-center text-red-400">⚠️ バックエンドサーバーに接続できません。<br>Ranked Matchを使用するには、バックエンドサーバーを起動してください。<br>詳細はREADMEを参照してください。</td></tr>';
        }
    }

    document.getElementById('refreshLeaderboard').addEventListener('click', loadLeaderboard);
    document.getElementById('difficulty').addEventListener('change', () => {
        if (isRankedMode) loadLeaderboard();
    });

    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('retryBtn').addEventListener('click', startGame);
    document.getElementById('backToSettingsBtn').addEventListener('click', () => {
        document.getElementById('canvasContainer').classList.add('hidden');
        document.getElementById('gameSettings').classList.remove('hidden');
        document.getElementById('gameOver').classList.add('hidden');
        gameRunning = false;
        engine.clear_bullets();
    });

    function startGame() {
        const difficulty = document.getElementById('difficulty').value;
        maxHp = parseInt(document.getElementById('maxHp').value);
        const density = document.getElementById('bulletDensity').value;
        bulletPattern = document.getElementById('bulletPattern').value;

        const difficultySettings = {
            easy: 0.7,
            normal: 1.0,
            hard: 1.5,
            lunatic: 2.0
        };
        bulletSpeedMultiplier = difficultySettings[difficulty];

        const densitySettings = {
            low: 20,
            medium: 50,
            high: 100,
            extreme: 200
        };
        bulletSpawnRate = densitySettings[density];

        currentHp = maxHp;
        survivalTime = 0;
        gameStartTime = performance.now();
        isInvincible = true;
        invincibleTimer = 1.0;
        playerX = canvas.width / 2;
        playerY = canvas.height / 2;
        engine.clear_bullets();

        document.getElementById('gameSettings').classList.add('hidden');
        document.getElementById('canvasContainer').classList.remove('hidden');
        document.getElementById('gameOver').classList.add('hidden');
        
        gameRunning = true;
        updateHpDisplay();
    }

    function updateHpDisplay() {
        const hpDisplay = document.getElementById('hpDisplay');
        hpDisplay.textContent = `HP: ${currentHp} / ${maxHp}`;
        if (currentHp <= 1) {
            hpDisplay.classList.add('hp-low', 'text-red-600');
        } else {
            hpDisplay.classList.remove('hp-low', 'text-red-600');
        }
    }

    async function gameOver() {
        gameRunning = false;
        document.getElementById('finalTime').textContent = survivalTime.toFixed(2) + 's';
        
        if (isRankedMode && currentUsername) {
            try {
                const response = await fetch(`${API_BASE}/scores`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: currentUsername,
                        survival_time: survivalTime,
                        difficulty: document.getElementById('difficulty').value,
                        bullet_density: document.getElementById('bulletDensity').value,
                        bullet_pattern: bulletPattern,
                        max_hp: maxHp,
                        device_type: currentDeviceType
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const result = await response.json();
                
                const rankInfo = document.getElementById('rankInfo');
                const rankDisplay = document.getElementById('rankDisplay');
                const personalBest = document.getElementById('personalBest');
                
                rankInfo.classList.remove('hidden');
                
                if (result.rank) {
                    rankDisplay.textContent = `🏆 Rank: #${result.rank}`;
                } else {
                    rankDisplay.textContent = '🏆 Score Recorded!';
                }
                
                if (result.is_personal_best) {
                    personalBest.textContent = '⭐ New Personal Best!';
                    personalBest.classList.add('new-record');
                } else {
                    personalBest.textContent = '';
                }
                
                loadLeaderboard();
            } catch (error) {
                console.error('Failed to submit score:', error);
                const rankInfo = document.getElementById('rankInfo');
                const rankDisplay = document.getElementById('rankDisplay');
                const personalBest = document.getElementById('personalBest');
                
                rankInfo.classList.remove('hidden');
                rankDisplay.textContent = '⚠️ スコアを送信できませんでした';
                personalBest.textContent = 'バックエンドサーバーに接続できません';
                personalBest.classList.remove('new-record');
            }
        } else {
            document.getElementById('rankInfo').classList.add('hidden');
        }
        
        document.getElementById('gameOver').classList.remove('hidden');
    }

    function spawnBullets(deltaTime) {
        if (!gameRunning) return;

        bulletSpawnTimer += deltaTime;
        const spawnInterval = 1.0 / bulletSpawnRate;

        while (bulletSpawnTimer >= spawnInterval) {
            bulletSpawnTimer -= spawnInterval;

            if (bulletPattern === 'random' || bulletPattern === 'mixed') {
                const edge = Math.floor(Math.random() * 4);
                let x, y;
                if (edge === 0) { x = Math.random() * canvas.width; y = 0; }
                else if (edge === 1) { x = canvas.width; y = Math.random() * canvas.height; }
                else if (edge === 2) { x = Math.random() * canvas.width; y = canvas.height; }
                else { x = 0; y = Math.random() * canvas.height; }

                const dx = playerX - x;
                const dy = playerY - y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const baseSpeed = (80 + Math.random() * 60) * bulletSpeedMultiplier;
                const vx = (dx / dist) * baseSpeed;
                const vy = (dy / dist) * baseSpeed;
                const radius = 3 + Math.random() * 2;
                const color = 0xFF3333FF;
                engine.spawn_bullet(x, y, vx, vy, radius, color);
            }

            if (bulletPattern === 'circle' || (bulletPattern === 'mixed' && Math.random() < 0.3)) {
                if (Math.random() < 0.1) {
                    const x = Math.random() * canvas.width;
                    const y = Math.random() * canvas.height;
                    const speed = 120 * bulletSpeedMultiplier;
                    engine.spawn_circle_pattern(x, y, 16, speed, 3, 0xFFAA00FF);
                }
            }

            if (bulletPattern === 'spiral' || (bulletPattern === 'mixed' && Math.random() < 0.2)) {
                if (Math.random() < 0.05) {
                    const x = canvas.width / 2;
                    const y = canvas.height / 2;
                    const speed = 100 * bulletSpeedMultiplier;
                    const offset = performance.now() / 1000;
                    for (let i = 0; i < 24; i++) {
                        const angle = (i / 24) * Math.PI * 2 + offset;
                        const vx = Math.cos(angle) * speed;
                        const vy = Math.sin(angle) * speed;
                        engine.spawn_bullet(x, y, vx, vy, 3, 0x00FFFFFF);
                    }
                }
            }
        }
    }

    function gameLoop(currentTime) {
        const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1); // 秒単位、最大0.1s
        lastTime = currentTime;

        frameCount++;
        if (currentTime - fpsUpdateTime >= 1000) {
            fps = frameCount;
            frameCount = 0;
            fpsUpdateTime = currentTime;
        }

        if (gameRunning) {
            survivalTime = (currentTime - gameStartTime) / 1000;
            document.getElementById('survivalTime').textContent = survivalTime.toFixed(2) + 's';

            if (isInvincible) {
                invincibleTimer -= deltaTime;
                if (invincibleTimer <= 0) {
                    isInvincible = false;
                }
            }

            const mousePos = input.getMousePos();
            playerX = mousePos.x;
            playerY = mousePos.y;

            spawnBullets(deltaTime);

            if (input.isKeyPressed(' ')) {
                engine.spawn_circle_pattern(playerX, playerY, 32, 200 * bulletSpeedMultiplier, 4, 0x00FFFFFF);
            }

            if (input.isKeyPressed('c') || input.isKeyPressed('C')) {
                engine.clear_bullets();
            }
        }

        engine.update(deltaTime);

        if (gameRunning && !isInvincible) {
            const hit = engine.check_collision(playerX, playerY, playerRadius);
            if (hit) {
                currentHp--;
                updateHpDisplay();
                if (currentHp <= 0) {
                    gameOver();
                } else {
                    isInvincible = true;
                    invincibleTimer = invincibleDuration;
                }
            }
        }

        renderer.clear();
        
        renderer.drawBullets(
            wasmMemory,
            engine.get_x_ptr(),
            engine.get_y_ptr(),
            engine.get_radius_ptr(),
            engine.get_color_ptr(),
            engine.get_alive_ptr(),
            engine.get_capacity()
        );

        if (gameRunning) {
            if (!isInvincible || Math.floor(currentTime / 100) % 2 === 0) {
                renderer.drawPlayer(playerX, playerY, playerRadius);
            }
            
            const ctx = renderer.ctx;
            ctx.strokeStyle = isInvincible ? '#0088FF88' : '#00FF0088';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(playerX, playerY, playerRadius, 0, Math.PI * 2);
            ctx.stroke();
        }

        document.getElementById('bulletCount').textContent = engine.get_bullet_count();

        requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);
}

run().catch(console.error);
