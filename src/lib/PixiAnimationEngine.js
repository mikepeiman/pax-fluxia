import * as PIXI from 'pixi.js';

class TickBasedAnimationEngine {
    constructor(container, width, height) {
        this.width = width;
        this.height = height;
        this.container = container;

        // Initialize the app asynchronously
        this.initializeApp();

        // Unified tick system (1 tick = 1 second by default)
        this.tickDuration = 1000; // 1 second per tick
        this.tickSpeed = 1.0; // Speed multiplier (1x = normal, 2x = double speed, etc.)
        this.currentTick = 0;
        this.lastTickTime = 0;
        this.tickProgress = 0; // 0 to 1 progress through current tick

        // Animation state
        this.isRunning = false;
        this.isPaused = false;
        this.lastFrameTime = 0;

        // FPS control
        this.targetFPS = 60; // Default to 60 FPS
        this.frameInterval = 1000 / this.targetFPS;
        this.lastFrameUpdate = 0;

        // Object pools for performance
        this.particlePool = [];
        this.shipPool = [];
        this.activeParticles = [];
        this.activeShips = [];

        // Performance settings
        this.performanceMode = 'high'; // high, medium, low
        this.particleLimit = 2000;
        this.enableAntialiasing = false;
        this.enableGlow = true;
        this.enableTrails = true;
        this.maxTrailLength = 8;

        // Star colors (exactly 6 as specified)
        this.starColors = [
            { primary: 0xff6b6b, secondary: 0xff8e53, name: 'Red Giant' },
            { primary: 0x4ecdc4, secondary: 0x45b7d1, name: 'Blue Star' },
            { primary: 0xf9ca24, secondary: 0xf0932b, name: 'Yellow Star' },
            { primary: 0x6c5ce7, secondary: 0xa29bfe, name: 'Purple Star' },
            { primary: 0x00d2d3, secondary: 0x54a0ff, name: 'Cyan Star' },
            { primary: 0xff7675, secondary: 0xfd79a8, name: 'Pink Star' }
        ];

        // Bind methods
        this.update = this.update.bind(this);
    }

    async initializeApp() {
        try {
            // Use the modern PIXI v8 initialization
            this.app = new PIXI.Application();

            await this.app.init({
                width: this.width,
                height: this.height,
                backgroundColor: 0x0a0a0f,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true,
                antialias: this.enableAntialiasing,
                powerPreference: 'high-performance',
                hello: false // Disable PIXI banner
            });

            // Set ticker FPS
            this.app.ticker.maxFPS = this.targetFPS;

            // Create rendering layers for performance
            this.backgroundLayer = new PIXI.Container();
            this.starLayer = new PIXI.Container();
            this.shipLayer = new PIXI.Container();
            this.effectsLayer = new PIXI.Container();
            this.uiLayer = new PIXI.Container();

            this.app.stage.addChild(this.backgroundLayer);
            this.app.stage.addChild(this.starLayer);
            this.app.stage.addChild(this.shipLayer);
            this.app.stage.addChild(this.effectsLayer);
            this.app.stage.addChild(this.uiLayer);

            // Initialize graphics and textures
            this.initializeGraphics();

            // Append to container
            if (this.container) {
                this.container.appendChild(this.app.canvas);
            }

        } catch (error) {
            console.error('Failed to initialize PIXI application:', error);
        }
    }

    initializeGraphics() {
        if (!this.app) return;

        // Create optimized graphics for reuse
        this.graphics = new PIXI.Graphics();

        // Pre-create simple ship texture (tiny white dot)
        this.shipTexture = this.createShipTexture();

        // Pre-create particle textures
        this.particleTextures = this.createParticleTextures();

        // Create starfield background
        this.createStarfield();
    }

    createShipTexture() {
        if (!this.app) return null;

        // Create a simple white dot for all ships
        const graphics = new PIXI.Graphics();
        graphics.fill(0xffffff);
        graphics.circle(0, 0, 2); // 2 pixel radius dot

        try {
            return this.app.renderer.generateTexture(graphics);
        } catch (e) {
            console.warn('Failed to generate ship texture:', e);
            return null;
        } finally {
            graphics.destroy();
        }
    }

    createParticleTextures() {
        if (!this.app) return {};

        const textures = {};
        const sizes = [2, 4, 6, 8];

        sizes.forEach(size => {
            const graphics = new PIXI.Graphics();
            graphics.fill(0xffffff);
            graphics.circle(0, 0, size);

            try {
                textures[`particle_${size}`] = this.app.renderer.generateTexture(graphics);
            } catch (e) {
                console.warn(`Failed to generate particle texture:`, e);
            }
            graphics.destroy();
        });

        return textures;
    }

    createStarfield() {
        if (!this.backgroundLayer) return;

        const starfieldContainer = new PIXI.Container();
        const starCount = this.performanceMode === 'high' ? 20 : 10;

        for (let i = 0; i < starCount; i++) {
            const star = new PIXI.Graphics();
            star.fill({ color: 0xffffff, alpha: Math.random() * 0.3 });
            star.circle(0, 0, Math.random() * 1.5);

            star.x = Math.random() * this.width;
            star.y = Math.random() * this.height;

            starfieldContainer.addChild(star);
        }

        this.backgroundLayer.addChild(starfieldContainer);
    }

    // Tick-based timing with proper pause support
    start() {
        if (!this.app) return;

        this.isRunning = true;
        this.isPaused = false;
        this.lastFrameTime = performance.now();
        this.lastTickTime = this.lastFrameTime;
        this.app.ticker.add(this.update);

        console.log('Animation engine started');
    }

    stop() {
        if (!this.app) return;

        this.isRunning = false;
        this.isPaused = false;
        this.app.ticker.remove(this.update);

        console.log('Animation engine stopped');
    }

    pause() {
        this.isPaused = true;
        console.log('Animation engine paused');
    }

    resume() {
        if (this.isRunning) {
            this.isPaused = false;
            this.lastFrameTime = performance.now();
            this.lastTickTime = this.lastFrameTime;
            console.log('Animation engine resumed');
        }
    }

    togglePause() {
        if (this.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }

    update(deltaTime) {
        if (!this.isRunning || this.isPaused) {
            console.log(`game paused or not running`)
            return;
        }
        const currentTime = performance.now();

        // FPS limiting
        if (currentTime - this.lastFrameUpdate < this.frameInterval) {
            return;
        }
        this.lastFrameUpdate = currentTime;

        const realDelta = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;

        // Update tick progress based on unified timing
        const effectiveTickDuration = this.tickDuration / this.tickSpeed;
        const timeSinceLastTick = currentTime - this.lastTickTime;
        this.tickProgress = Math.min(timeSinceLastTick / effectiveTickDuration, 1);

        // Check if tick is complete
        if (this.tickProgress >= 1) {
            this.currentTick++;
            this.tickProgress = 0;
            this.lastTickTime = currentTime;
            this.onTick();
        }

        // Update all active objects
        this.updateParticles(deltaTime);
        this.updateShips(deltaTime);
    }

    onTick() {
        // Called exactly once per tick - handle game logic here
        console.log(`Tick ${this.currentTick}`);
    }

    // Surge animation function - ships move with acceleration/deceleration pattern
    getSurgeProgress() {
        if (this.tickProgress < 0.1) return 0; // Stillness at start
        if (this.tickProgress > 0.9) return 1; // Stillness at end

        // Smooth acceleration then deceleration in the middle 80%
        const normalizedT = (this.tickProgress - 0.1) / 0.8;
        return 0.5 * (1 + Math.sin(Math.PI * normalizedT - Math.PI / 2));
    }

    // Check if we're in the stillness period (1/10th of tick)
    isInStillness() {
        return this.tickProgress < 0.1 || this.tickProgress > 0.9;
    }

    updateParticles(deltaTime) {
        if (!this.effectsLayer) return;

        this.activeParticles = this.activeParticles.filter(particle => {
            particle.life -= deltaTime;

            if (particle.life <= 0) {
                this.effectsLayer.removeChild(particle.sprite);
                this.particlePool.push(particle);
                return false;
            }

            // Update particle physics
            particle.x += particle.vx * deltaTime;
            particle.y += particle.vy * deltaTime;
            particle.vy += particle.gravity * deltaTime;
            particle.vx *= particle.friction;
            particle.vy *= particle.friction;

            // Update sprite
            particle.sprite.x = particle.x;
            particle.sprite.y = particle.y;
            particle.sprite.alpha = particle.life / particle.maxLife;
            particle.sprite.scale.set(particle.scale * (particle.life / particle.maxLife));

            return true;
        });
    }

    updateShips(deltaTime) {
        // Ships will be updated by the game logic
        // This is just for any ship-specific effects
    }

    // Particle system for effects
    createParticleExplosion(x, y, color = 0xffffff, intensity = 1) {
        if (!this.effectsLayer || this.activeParticles.length >= this.particleLimit) return;

        const particleCount = Math.floor(20 * intensity);

        for (let i = 0; i < particleCount; i++) {
            const particle = this.getParticleFromPool();
            if (!particle) continue;

            const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
            const speed = (2 + Math.random() * 3) * intensity;

            particle.x = x;
            particle.y = y;
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed;
            particle.gravity = 0.05;
            particle.friction = 0.98;
            particle.life = 60;
            particle.maxLife = 60;
            particle.scale = 0.5 + Math.random() * 0.5;

            particle.sprite.tint = color;
            particle.sprite.x = x;
            particle.sprite.y = y;
            particle.sprite.alpha = 1;

            this.effectsLayer.addChild(particle.sprite);
            this.activeParticles.push(particle);
        }
    }

    createShipTrail(x, y, color = 0x00ffff) {
        if (!this.enableTrails || !this.effectsLayer || this.activeParticles.length >= this.particleLimit) return;

        const particle = this.getParticleFromPool();
        if (!particle) return;

        particle.x = x;
        particle.y = y;
        particle.vx = (Math.random() - 0.5) * 0.5;
        particle.vy = (Math.random() - 0.5) * 0.5;
        particle.gravity = 0;
        particle.friction = 0.95;
        particle.life = 30;
        particle.maxLife = 30;
        particle.scale = 0.3;

        particle.sprite.tint = color;
        particle.sprite.x = x;
        particle.sprite.y = y;
        particle.sprite.alpha = 0.8;

        this.effectsLayer.addChild(particle.sprite);
        this.activeParticles.push(particle);
    }

    createWarpEffect(x, y) {
        // Create a warp effect for ship transfers
        this.createParticleExplosion(x, y, 0x00ffff, 0.5);
    }

    getParticleFromPool() {
        if (this.particlePool.length > 0) {
            return this.particlePool.pop();
        }

        // Create new particle
        if (!this.particleTextures || !this.particleTextures.particle_4) {
            return null;
        }

        const sprite = new PIXI.Sprite(this.particleTextures.particle_4);
        sprite.anchor.set(0.5);

        return {
            sprite: sprite,
            x: 0, y: 0, vx: 0, vy: 0,
            gravity: 0, friction: 1,
            life: 0, maxLife: 0, scale: 1
        };
    }

    // Performance control methods
    setPerformanceMode(mode) {
        this.performanceMode = mode;

        switch (mode) {
            case 'low':
                this.particleLimit = 500;
                this.enableGlow = false;
                this.enableTrails = false;
                this.maxTrailLength = 3;
                this.setTargetFPS(30);
                break;
            case 'medium':
                this.particleLimit = 1000;
                this.enableGlow = true;
                this.enableTrails = true;
                this.maxTrailLength = 5;
                this.setTargetFPS(60);
                break;
            case 'high':
                this.particleLimit = 2000;
                this.enableGlow = true;
                this.enableTrails = true;
                this.maxTrailLength = 8;
                this.setTargetFPS(60);
                break;
        }
    }

    // Unified tick speed control (replaces separate tick duration and speed)
    setTickSpeed(speed) {
        this.tickSpeed = Math.max(0.1, Math.min(5.0, speed));
        console.log(`Tick speed set to: ${this.tickSpeed}x (${this.tickDuration / this.tickSpeed}ms per tick)`);
    }

    // FPS control
    setTargetFPS(fps) {
        const validFPS = [30, 60, 120];
        this.targetFPS = validFPS.includes(fps) ? fps : 60;
        this.frameInterval = 1000 / this.targetFPS;

        if (this.app && this.app.ticker) {
            this.app.ticker.maxFPS = this.targetFPS;
        }

        console.log(`Target FPS set to: ${this.targetFPS}`);
    }

    // Legacy method support (for backward compatibility)
    setTickDuration(duration) {
        // Convert duration to speed multiplier
        const baseTickDuration = 1000; // 1 second
        this.tickSpeed = baseTickDuration / Math.max(100, Math.min(10000, duration));
        console.log(`Tick duration set to: ${duration}ms (speed: ${this.tickSpeed}x)`);
    }

    // Cleanup
    destroy() {
        this.stop();
        if (this.app) {
            this.app.destroy(true, true);
        }
    }

    // Getters for external access
    get renderer() { return this.app?.renderer; }
    get stage() { return this.app?.stage; }
}

export { TickBasedAnimationEngine };
