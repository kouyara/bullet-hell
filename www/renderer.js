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
    constructor(canvas, deviceType) {
        this.canvas = canvas;
        this.deviceType = deviceType;
        this.keys = new Set();
        this.mouseX = 0;
        this.mouseY = 0;
        this.mousePressed = false;
        
        this.touchX = canvas.width / 2;
        this.touchY = canvas.height / 2;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.isTouching = false;
        this.lastTouchX = 0;
        this.lastTouchY = 0;

        window.addEventListener('keydown', (e) => this.keys.add(e.key));
        window.addEventListener('keyup', (e) => this.keys.delete(e.key));
        
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });
        canvas.addEventListener('mousedown', () => this.mousePressed = true);
        canvas.addEventListener('mouseup', () => this.mousePressed = false);
        
        if (deviceType === 'mobile') {
            canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
            canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
            canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        }
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        if (e.touches.length > 0) {
            const rect = this.canvas.getBoundingClientRect();
            this.touchStartX = e.touches[0].clientX - rect.left;
            this.touchStartY = e.touches[0].clientY - rect.top;
            this.lastTouchX = this.touchStartX;
            this.lastTouchY = this.touchStartY;
            this.isTouching = true;
            this.touchX = this.touchStartX;
            this.touchY = this.touchStartY;
        }
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        if (e.touches.length > 0 && this.isTouching) {
            const rect = this.canvas.getBoundingClientRect();
            const currentX = e.touches[0].clientX - rect.left;
            const currentY = e.touches[0].clientY - rect.top;
            
            this.touchX = Math.max(0, Math.min(currentX, this.canvas.width));
            this.touchY = Math.max(0, Math.min(currentY, this.canvas.height));
            
            this.lastTouchX = this.touchX;
            this.lastTouchY = this.touchY;
        }
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        this.isTouching = false;
    }

    isKeyPressed(key) {
        return this.keys.has(key);
    }

    getMousePos() {
        if (this.deviceType === 'mobile') {
            return { x: this.touchX, y: this.touchY };
        }
        return { x: this.mouseX, y: this.mouseY };
    }

    getTargetPos() {
        if (this.deviceType === 'mobile') {
            return { x: this.touchX, y: this.touchY };
        }
        return { x: this.mouseX, y: this.mouseY };
    }

    isMobileAndTouching() {
        return this.deviceType === 'mobile' && this.isTouching;
    }
    
    hasTargetPos() {
        return this.deviceType === 'mobile';
    }

    isMousePressed() {
        return this.mousePressed;
    }
}

export { Renderer, InputManager };
