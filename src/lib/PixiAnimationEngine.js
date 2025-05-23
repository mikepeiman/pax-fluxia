import * as PIXI from 'pixi.js';

class TickBasedAnimationEngine {
    constructor(container, width, height) {
        // Core PIXI setup for maximum performance
        this.app = new PIXI.Application({
            width: width,
            height: height,
            backgroundColor: 0x0a0a0f,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            antialias: false, // Disable for performance - we'll use our own smoothing
            powerPreference: 'high-performance',
            hello: false // Disable PIXI banner
        });

        // Performance optimizations
        PIXI.settings.SPRITE_MAX_TEXTURES = Math.min(PIXI.settings.SPRITE_MAX_TEXTURES, 16);
        PIXI.settings.PRECISION_FRAGMENT = PIXI.PRECISION.MEDIUM;
        PIXI.settings.ROUND_PIXELS = true;

        // Tick-based timing system
        this.tickDuration = 2000; // 2 seconds per tick (adjustable)
        this.currentTick = 0;
        this.tickProgress = 0;
        this.lastTime = performance.now();
        this.isRunning = false;
        this.tickSpeed = 1.0; // Multiplier for tick rate

        // Rendering layers for performance
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

        // Initialize graphics and textures
        this.initializeGraphics();

        // Append to container
        if (container) {
            container.appendChild(this.app.view);
        }

        // Bind methods
        this.tick = this.tick.bind(this);
        this.update = this.update.bind(this);
    }

    initializeGraphics() {
        // Create optimized graphics for reuse
        this.graphics = new PIXI.Graphics();

        // Pre-create ship textures for different types
        this.shipTextures = this.createShipTextures();

        // Pre-create particle textures
        this.particleTextures = this.createParticleTextures();

        // Create starfield background
        this.createStarfield();
    }

    createShipTextures() {
        const textures = {};
        const shipTypes = ['fighter', 'cruiser', 'destroyer', 'battleship'];
        const sizes = [8, 12, 16, 20];

        shipTypes.forEach((type, index) => {
            const graphics = new PIXI.Graphics();
            const size = sizes[index];

            // Create ship shape based on type
            graphics.beginFill(0xffffff);
            switch (type) {
                case 'fighter':
                    graphics.drawPolygon([0, -size, -size * 0.7, size * 0.5, size * 0.7, size * 0.5]);
                    break;
                case 'cruiser':
                    graphics.drawPolygon([0, -size, -size * 0.5, 0, 0, size, size * 0.5, 0]);
                    break;
                case 'destroyer':
                    graphics.drawRect(-size * 0.75, -size * 0.5, size * 1.5, size);
                    break;
                case 'battleship':
                    graphics.drawRoundedRect(-size, -size * 0.6, size * 2, size * 1.2, 4);
                    break;
            }
            graphics.endFill();

            textures[type] = this.app.renderer.generateTexture(graphics);
            graphics.destroy();
        });

        return textures;
    }

    createParticleTextures() {
        const textures = {};
        const sizes = [2, 4, 6, 8];

        sizes.forEach(size => {
            const graphics = new PIXI.Graphics();
            graphics.beginFill(0xffffff);
            graphics.drawCircle(0, 0, size);
            graphics.endFill();

            textures[`particle_${size}`] = this.app.renderer.generateTexture(graphics);
            graphics.destroy();
        });

        return textures;
    }

    createStarfield() {
        const starfieldContainer = new PIXI.Container();
        const starCount = this.performanceMode === 'high' ? 200 : 100;

        for (let i = 0; i < starCount; i++) {
            const star = new PIXI.Graphics();
            star.beginFill(0xffffff, Math.random() * 0.3);
            star.drawCircle(0, 0, Math.random() * 1.5);
            star.endFill();

            star.x = Math.random() * this.app.screen.width;
            star.y = Math.random() * this.app.screen.height;

            starfieldContainer.addChild(star);
        }

        this.backgroundLayer.addChild(starfieldContainer);
    }

    // Tick-based timing with surge animation
    start() {
        this.isRunning = true;
        this.lastTime = performance.now();
        this.app.ticker.add(this.update);
    }

    stop() {
        this.isRunning = false;
        this.app.ticker.remove(this.update);
    }

    update(deltaTime) {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        const realDelta = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Update tick progress
        this.tickProgress += (realDelta * this.tickSpeed) / this.tickDuration;

        if (this.tickProgress >= 1) {
            this.currentTick++;
            this.tickProgress = 0;
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
        if (this.activeParticles.length >= this.particleLimit) return;

        const particleCount = Math.floor(20 * intensity);

        for (let i = 0; i < particleCount; i++) {
            const particle = this.getParticleFromPool();

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
        if (!this.enableTrails || this.activeParticles.length >= this.particleLimit) return;

        const particle = this.getParticleFromPool();

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

    getParticleFromPool() {
        if (this.particlePool.length > 0) {
            return this.particlePool.pop();
        }

        // Create new particle
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
                break;
            case 'medium':
                this.particleLimit = 1000;
                this.enableGlow = true;
                this.enableTrails = true;
                this.maxTrailLength = 5;
                break;
            case 'high':
                this.particleLimit = 2000;
                this.enableGlow = true;
                this.enableTrails = true;
                this.maxTrailLength = 8;
                break;
        }
    }

    setTickSpeed(speed) {
        this.tickSpeed = Math.max(0.1, Math.min(5.0, speed));
    }

    setTickDuration(duration) {
        this.tickDuration = Math.max(500, Math.min(10000, duration));
    }

    // Cleanup
    destroy() {
        this.stop();
        this.app.destroy(true, true);
    }

    // Getters for external access
    get width() { return this.app.screen.width; }
    get height() { return this.app.screen.height; }
    get renderer() { return this.app.renderer; }
    get stage() { return this.app.stage; }
}

export { TickBasedAnimationEngine };
