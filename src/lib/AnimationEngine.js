import * as TWEEN from '@tweenjs/tween.js';
import { get } from 'svelte/store';
import { store_ctx } from '$stores/stores';

class ParticleSystem {
    constructor(x, y, config = {}) {
        this.x = x;
        this.y = y;
        this.particles = [];
        this.config = {
            count: config.count || 50,
            life: config.life || 60,
            spread: config.spread || 100,
            speed: config.speed || 2,
            size: config.size || 3,
            colors: config.colors || ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7'],
            gravity: config.gravity || 0.05,
            friction: config.friction || 0.98,
            glow: config.glow || true,
            type: config.type || 'explosion' // explosion, trail, pulse, warp
        };
        this.createParticles();
    }

    createParticles() {
        for (let i = 0; i < this.config.count; i++) {
            const angle = (Math.PI * 2 * i) / this.config.count + (Math.random() - 0.5) * 0.5;
            const speed = this.config.speed * (0.5 + Math.random() * 0.5);
            const size = this.config.size * (0.5 + Math.random() * 0.5);

            this.particles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: this.config.life,
                maxLife: this.config.life,
                size: size,
                color: this.config.colors[Math.floor(Math.random() * this.config.colors.length)],
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.2
            });
        }
    }

    update() {
        this.particles = this.particles.filter(particle => {
            particle.life--;
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += this.config.gravity;
            particle.vx *= this.config.friction;
            particle.vy *= this.config.friction;
            particle.rotation += particle.rotationSpeed;

            return particle.life > 0;
        });

        return this.particles.length > 0;
    }

    draw(ctx) {
        ctx.save();

        this.particles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            const size = particle.size * (0.5 + alpha * 0.5);

            ctx.save();
            ctx.translate(particle.x, particle.y);
            ctx.rotate(particle.rotation);

            if (this.config.glow) {
                // Outer glow
                ctx.shadowBlur = 20;
                ctx.shadowColor = particle.color;
                ctx.globalAlpha = alpha * 0.3;
                ctx.fillStyle = particle.color;
                ctx.beginPath();
                ctx.arc(0, 0, size * 2, 0, Math.PI * 2);
                ctx.fill();

                // Inner bright core
                ctx.shadowBlur = 5;
                ctx.globalAlpha = alpha * 0.8;
                ctx.beginPath();
                ctx.arc(0, 0, size, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.globalAlpha = alpha;
                ctx.fillStyle = particle.color;
                ctx.beginPath();
                ctx.arc(0, 0, size, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        });

        ctx.restore();
    }
}

class AnimationEngine {
    constructor() {
        this.tickDuration = 1000; // 1 second per tick
        this.currentTick = 0;
        this.tickProgress = 0;
        this.lastTime = performance.now();
        this.particleSystems = [];
        this.animations = [];
        this.isRunning = false;

        // Easing functions for smooth animations
        this.easingFunctions = {
            easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
            easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
            easeOutElastic: (t) => {
                const c4 = (2 * Math.PI) / 3;
                return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
            },
            surge: (t) => {
                // Custom surge function: accelerate then decelerate with stillness at end
                if (t < 0.1) return 0; // Start still
                if (t > 0.9) return 1; // End still
                const normalizedT = (t - 0.1) / 0.8;
                return 0.5 * (1 + Math.sin(Math.PI * normalizedT - Math.PI / 2));
            }
        };
    }

    start() {
        this.isRunning = true;
        this.lastTime = performance.now();
        this.animate();
    }

    stop() {
        this.isRunning = false;
    }

    createExplosion(x, y, intensity = 1) {
        const config = {
            count: Math.floor(30 * intensity),
            life: Math.floor(60 * intensity),
            spread: 150 * intensity,
            speed: 3 * intensity,
            size: 4 * intensity,
            colors: ['#ff6b6b', '#ff8e53', '#ff6348', '#ffa726', '#ffecb3'],
            type: 'explosion'
        };
        this.particleSystems.push(new ParticleSystem(x, y, config));
    }

    createWarpEffect(x, y) {
        const config = {
            count: 80,
            life: 40,
            spread: 50,
            speed: 1,
            size: 2,
            colors: ['#4ecdc4', '#45b7d1', '#a8e6cf', '#00d2d3'],
            gravity: 0,
            friction: 0.95,
            type: 'warp'
        };
        this.particleSystems.push(new ParticleSystem(x, y, config));
    }

    createShipTrail(x, y) {
        const config = {
            count: 5,
            life: 30,
            spread: 20,
            speed: 0.5,
            size: 2,
            colors: ['#6c5ce7', '#a29bfe', '#fd79a8', '#fdcb6e'],
            gravity: 0,
            friction: 0.9,
            type: 'trail'
        };
        this.particleSystems.push(new ParticleSystem(x, y, config));
    }

    createStarPulse(x, y, color) {
        const config = {
            count: 20,
            life: 90,
            spread: 80,
            speed: 1.5,
            size: 3,
            colors: [color, '#ffffff', '#ffffcc'],
            gravity: -0.02,
            friction: 0.98,
            type: 'pulse'
        };
        this.particleSystems.push(new ParticleSystem(x, y, config));
    }

    animateProperty(object, property, targetValue, duration, easing = 'surge') {
        const startValue = object[property];
        const startTime = performance.now();

        const animation = {
            object,
            property,
            startValue,
            targetValue,
            duration,
            startTime,
            easing,
            completed: false
        };

        this.animations.push(animation);
        return animation;
    }

    update(currentTime) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Update tick progress
        this.tickProgress += deltaTime / this.tickDuration;
        if (this.tickProgress >= 1) {
            this.currentTick++;
            this.tickProgress = 0;
        }

        // Update particle systems
        this.particleSystems = this.particleSystems.filter(system => system.update());

        // Update animations
        this.animations = this.animations.filter(animation => {
            if (animation.completed) return false;

            const elapsed = currentTime - animation.startTime;
            const progress = Math.min(elapsed / animation.duration, 1);
            const easedProgress = this.easingFunctions[animation.easing](progress);

            const currentValue = animation.startValue +
                (animation.targetValue - animation.startValue) * easedProgress;

            animation.object[animation.property] = currentValue;

            if (progress >= 1) {
                animation.completed = true;
                return false;
            }

            return true;
        });

        // Update TWEEN.js animations
        TWEEN.update(currentTime);
    }

    draw(ctx) {
        // Draw all particle systems
        this.particleSystems.forEach(system => system.draw(ctx));
    }

    animate() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        this.update(currentTime);

        requestAnimationFrame(() => this.animate());
    }

    // Get current tick progress with surge easing
    getSurgeProgress() {
        return this.easingFunctions.surge(this.tickProgress);
    }

    // Check if we're in the stillness period
    isInStillness() {
        return this.tickProgress < 0.1 || this.tickProgress > 0.9;
    }
}

export { AnimationEngine, ParticleSystem };
