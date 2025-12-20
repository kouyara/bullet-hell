class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.width = canvas.width;
        this.height = canvas.height;
    }

    clear() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    drawBullets(wasmMemory, xPtr, yPtr, radiusPtr, colorPtr, alivePtr, capacity) {
        const x = new Float32Array(wasmMemory.buffer, xPtr, capacity);
        const y = new Float32Array(wasmMemory.buffer, yPtr, capacity);
        const radius = new Float32Array(wasmMemory.buffer, radiusPtr, capacity);
        const color = new Uint32Array(wasmMemory.buffer, colorPtr, capacity);
        const alive = new Uint8Array(wasmMemory.buffer, alivePtr, capacity);

        for (let i = 0; i < capacity; i++) {
            if (!alive[i]) continue;

            const r = (color[i] >> 24) & 0xFF;
            const g = (color[i] >> 16) & 0xFF;
            const b = (color[i] >> 8) & 0xFF;
            const a = (color[i] & 0xFF) / 255;

            this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
            this.ctx.beginPath();
            this.ctx.arc(x[i], y[i], radius[i], 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawPlayer(x, y, radius) {
        this.ctx.fillStyle = '#00FF00';
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = '#00FF0088';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    drawStats(fps, bulletCount, capacity) {
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '16px monospace';
        this.ctx.fillText(`FPS: ${fps}`, 10, 20);
        this.ctx.fillText(`Bullets: ${bulletCount} / ${capacity}`, 10, 40);
        this.ctx.fillText(`Load: ${(bulletCount / capacity * 100).toFixed(1)}%`, 10, 60);
    }
}

class InputManager {
    constructor(canvas) {
        this.keys = new Set();
        this.mouseX = 0;
        this.mouseY = 0;
        this.mousePressed = false;

        window.addEventListener('keydown', (e) => this.keys.add(e.key));
        window.addEventListener('keyup', (e) => this.keys.delete(e.key));
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });
        canvas.addEventListener('mousedown', () => this.mousePressed = true);
        canvas.addEventListener('mouseup', () => this.mousePressed = false);
    }

    isKeyPressed(key) {
        return this.keys.has(key);
    }

    getMousePos() {
        return { x: this.mouseX, y: this.mouseY };
    }

    isMousePressed() {
        return this.mousePressed;
    }
}

export { Renderer, InputManager };
