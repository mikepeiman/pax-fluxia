import * as PIXI from 'pixi.js';

class PixiShip {
    constructor(type, animationEngine) {
        this.type = type;
        this.animationEngine = animationEngine;

        // Ship properties - all ships are tiny white dots
        this.radius = 2; // Tiny dot size
        this.baseRadius = 2;
        this.color = 0xffffff; // All ships are white
        this.orbit = 0; // Distance from star center
        this.baseOrbit = 0;
        this.angle = 0; // Orbital angle
        this.baseAngle = 0;
        this.layer = 0; // Which orbital layer (0-4)

        // Position tracking
        this.pos = { x: 0, y: 0 };
        this.hostStar = null;

        // Animation properties
        this.animationPhase = Math.random() * Math.PI * 2;

        // Ship concentration scaling (how many ships this dot represents)
        this.concentration = 1;
        this.maxConcentration = 100;

        // Transfer state
        this.isTransferring = false;
        this.transferProgress = 0;
        this.transferStartPos = { x: 0, y: 0 };
        this.transferEndPos = { x: 0, y: 0 };
        this.transferStartTime = 0;
        this.transferDuration = 1000; // 1 second for transfer (matches tick duration)
        this.transferDelay = 0; // Stagger ship departures

        // Create PIXI sprite
        this.createPixiSprite();

        // Add to ship layer
        if (animationEngine && animationEngine.shipLayer) {
            animationEngine.shipLayer.addChild(this.pixiSprite);
        }
    }

    createPixiSprite() {
        // Create simple white dot
        this.graphics = new PIXI.Graphics();
        this.updateShipGraphics();

        // Create container for ship
        this.pixiSprite = new PIXI.Container();
        this.pixiSprite.addChild(this.graphics);

        // Set initial properties
        this.pixiSprite.alpha = 1;
        this.pixiSprite.visible = true;
    }

    updateShipGraphics() {
        if (!this.graphics) return;

        this.graphics.clear();

        // Calculate size based on concentration (slightly larger for higher concentration)
        const concentrationScale = Math.min(1 + Math.log(this.concentration) * 0.1, 2);
        const currentRadius = this.baseRadius * concentrationScale;

        // Draw simple white dot (correct PIXI API order)
        this.graphics
            .circle(0, 0, currentRadius)
            .fill(0xffffff);

        // Add subtle concentration indicator for high concentration
        if (this.concentration > 10) {
            this.graphics
                .circle(0, 0, currentRadius + 1)
                .stroke({ color: 0xffffff, width: 1, alpha: 0.5 });
        }
    }

    // Ship concentration scaling (the key algorithm from your request)
    setConcentration(concentration) {
        this.concentration = Math.max(1, Math.min(concentration, this.maxConcentration));
        this.updateShipGraphics();

        // Trigger reshuffling animation when concentration changes
        this.triggerConcentrationAnimation();
    }

    triggerConcentrationAnimation() {
        // Create a brief "reshuffling" effect when ship concentration changes
        if (this.animationEngine && this.hostStar) {
            // Particle burst to show reorganization
            this.animationEngine.createParticleExplosion(
                this.hostStar.x + Math.random() * 20 - 10,
                this.hostStar.y + Math.random() * 20 - 10,
                0xffffff,
                0.1
            );

            // Brief scale animation
            this.pixiSprite.scale.set(1.3);

            // Animate back to normal scale
            if (this.animationEngine.app) {
                const ticker = this.animationEngine.app.ticker;
                let scaleDown = 0;
                const scaleDownHandler = () => {
                    scaleDown += 0.1;
                    const scale = 1.3 - scaleDown * 0.3;
                    this.pixiSprite.scale.set(Math.max(scale, 1));

                    if (scale <= 1) {
                        this.pixiSprite.scale.set(1);
                        ticker.remove(scaleDownHandler);
                    }
                };
                ticker.add(scaleDownHandler);
            }
        }
    }

    // Set orbital position around a star (concentration distribution algorithm)
    setOrbitPosition(hostStar, orbitRadius, angle, layer) {
        this.hostStar = hostStar;
        this.orbit = orbitRadius;
        this.baseOrbit = orbitRadius;
        this.angle = angle;
        this.baseAngle = angle;
        this.layer = layer;

        // Update position
        this.updateOrbitPosition();

        // Make sprite visible if it was hidden
        this.pixiSprite.visible = true;
    }

    updateOrbitPosition() {
        if (!this.hostStar) return;

        // Calculate orbital position with subtle wobble
        const orbitVariation = Math.sin(this.animationPhase * 0.5) * 0.05;
        const effectiveOrbit = this.orbit * (1 + orbitVariation);

        this.pos = {
            x: this.hostStar.x + Math.cos(this.angle) * effectiveOrbit,
            y: this.hostStar.y + Math.sin(this.angle) * effectiveOrbit
        };

        // Update sprite position
        this.pixiSprite.x = this.pos.x;
        this.pixiSprite.y = this.pos.y;
    }

    updateOrbitRotation(rotationSpeed) {
        if (this.isTransferring || !this.hostStar) return;

        // Apply layer-specific rotation speed variations
        const layerSpeedMultiplier = 1 + this.layer * 0.1; // Outer layers rotate slightly faster
        this.angle += rotationSpeed * layerSpeedMultiplier;

        this.updateOrbitPosition();
    }

    // Ship transfer animations (the travel animations between stars)
    startTransfer(sourceStar, targetStar, delay = 0) {
        this.isTransferring = true;
        this.transferDelay = delay;
        this.transferStartTime = performance.now() + delay * 1000;

        // Set transfer positions
        this.transferStartPos = { x: sourceStar.x, y: sourceStar.y };
        this.transferEndPos = { x: targetStar.x, y: targetStar.y };

        // Clear orbital position
        this.hostStar = null;

        // Create warp-out effect
        this.createWarpOut();

        console.log(`Ship starting transfer from ${sourceStar.id} to ${targetStar.id} with ${delay}s delay`);
    }

    updateTransfer() {
        if (!this.isTransferring) return true;

        const currentTime = performance.now();

        // Check if delay period has passed
        if (currentTime < this.transferStartTime) {
            return true; // Still waiting for delay
        }

        // Calculate transfer progress
        const elapsed = currentTime - this.transferStartTime;
        this.transferProgress = Math.min(elapsed / this.transferDuration, 1);

        // Surge and stillness animation pattern (9/10ths movement, 1/10th stillness)
        const surgeProgress = this.animationEngine ? this.animationEngine.getSurgeProgress() :
            this.calculateSurgeProgress(this.transferProgress);

        // Apply surge-based movement
        this.updateTransferPosition(surgeProgress);

        // Check if transfer is complete
        if (this.transferProgress >= 1) {
            this.completeTransfer();
            return false; // Transfer complete, remove from transferring ships
        }

        return true; // Continue transfer
    }

    calculateSurgeProgress(progress) {
        // Implement the surge and stillness pattern
        const surgePortion = 0.9; // 9/10ths for movement
        const stillnessPortion = 0.1; // 1/10th for stillness

        if (progress <= surgePortion) {
            // During surge phase - ease in, linear, ease out
            const surgePhase = progress / surgePortion;

            if (surgePhase < 0.25) {
                // Ease in (first 25%)
                return Math.sin(surgePhase * 2 * Math.PI) * 0.5;
            } else if (surgePhase < 0.75) {
                // Linear (middle 50%)
                return 0.5 + (surgePhase - 0.25) * 2 * 0.5;
            } else {
                // Ease out (last 25%)
                return 0.5 + Math.sin((surgePhase - 0.5) * 2 * Math.PI) * 0.5;
            }
        } else {
            // During stillness phase - no movement
            return 1;
        }
    }

    updateTransferPosition(surgeProgress) {
        // Calculate position with surge animation
        const dx = this.transferEndPos.x - this.transferStartPos.x;
        const dy = this.transferEndPos.y - this.transferStartPos.y;

        this.pos = {
            x: this.transferStartPos.x + dx * surgeProgress,
            y: this.transferStartPos.y + dy * surgeProgress
        };

        // Update sprite position
        this.pixiSprite.x = this.pos.x;
        this.pixiSprite.y = this.pos.y;

        // Create trail effect during high-speed movement
        if (this.animationEngine && surgeProgress > 0.1 && surgeProgress < 0.9) {
            this.animationEngine.createShipTrail(this.pos.x, this.pos.y, 0xffffff);
        }
    }

    completeTransfer() {
        this.isTransferring = false;
        this.transferProgress = 1;

        // Create warp-in effect
        this.createWarpIn();

        console.log('Ship transfer completed');
    }

    // Visual effects
    createWarpOut() {
        if (this.animationEngine) {
            this.animationEngine.createWarpEffect(this.pos.x, this.pos.y);
            this.animationEngine.createParticleExplosion(this.pos.x, this.pos.y, 0xffffff, 0.3);
        }
    }

    createWarpIn() {
        if (this.animationEngine) {
            this.animationEngine.createWarpEffect(this.pos.x, this.pos.y);
            this.animationEngine.createParticleExplosion(this.pos.x, this.pos.y, 0xffffff, 0.2);
        }
    }

    // Update method called every frame
    update() {
        // Update animation properties
        this.animationPhase += 0.05;

        if (this.isTransferring) {
            // Update transfer animation
            return this.updateTransfer();
        } else if (this.hostStar) {
            // Update orbital animation
            const surgeProgress = this.animationEngine ? this.animationEngine.getSurgeProgress() : 0.5;

            // Apply subtle surge to orbit distance
            this.orbit = this.baseOrbit * (1 + surgeProgress * 0.1);

            // Update orbital position
            this.updateOrbitPosition();
        }

        return true; // Continue existing
    }

    clearFromStar() {
        // Remove ship from star's orbit
        this.hostStar = null;
        this.pixiSprite.visible = false;
    }

    // Cleanup
    destroy() {
        if (this.animationEngine && this.animationEngine.shipLayer) {
            this.animationEngine.shipLayer.removeChild(this.pixiSprite);
        }

        if (this.pixiSprite) {
            this.pixiSprite.destroy({ children: true });
        }
    }
}

export { PixiShip };
