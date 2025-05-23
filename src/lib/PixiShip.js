import * as PIXI from 'pixi.js';

class PixiShip {
    constructor(type, animationEngine) {
        this.type = type; // 1-4 for different ship types
        this.animationEngine = animationEngine;

        // Ship properties
        this.color = this.getShipColor(type);
        this.size = this.getShipSize(type);
        this.speed = this.getShipSpeed(type);

        // Position and movement
        this.orbitRadius = 0;
        this.orbitAngle = 0;
        this.orbitSpeed = 0;
        this.layer = 0;
        this.starRef = null;

        // Transfer state
        this.isTransferring = false;
        this.transferProgress = 0;
        this.transferStartPos = { x: 0, y: 0 };
        this.transferEndPos = { x: 0, y: 0 };
        this.transferDelay = 0;
        this.sourceStar = null;
        this.targetStar = null;

        // Visual components
        this.pixiSprite = null;
        this.trailSprites = [];
        this.maxTrailLength = 5;

        // Animation properties
        this.animationPhase = Math.random() * Math.PI * 2;
        this.pulseIntensity = 1;
        this.engineGlow = 0;

        // Create PIXI sprite
        this.createSprite();

        // Performance optimization - only create trail for high performance mode
        if (animationEngine && animationEngine.enableTrails) {
            this.initializeTrail();
        }
    }

    getShipColor(type) {
        const colors = {
            1: 0xff6b6b, // Fighter - Red
            2: 0x4ecdc4, // Cruiser - Cyan  
            3: 0xf9ca24, // Destroyer - Yellow
            4: 0x6c5ce7  // Battleship - Purple
        };
        return colors[type] || colors[1];
    }

    getShipSize(type) {
        const sizes = { 1: 0.8, 2: 1.0, 3: 1.2, 4: 1.5 };
        return sizes[type] || sizes[1];
    }

    getShipSpeed(type) {
        const speeds = { 1: 1.2, 2: 1.0, 3: 0.8, 4: 0.6 };
        return speeds[type] || speeds[1];
    }

    createSprite() {
        const shipTypes = ['fighter', 'cruiser', 'destroyer', 'battleship'];
        const textureKey = shipTypes[this.type - 1] || 'fighter';

        if (this.animationEngine && this.animationEngine.shipTextures[textureKey]) {
            this.pixiSprite = new PIXI.Sprite(this.animationEngine.shipTextures[textureKey]);
            this.pixiSprite.anchor.set(0.5);
            this.pixiSprite.tint = this.color;
            this.pixiSprite.scale.set(this.size);

            // Add to ship layer
            this.animationEngine.shipLayer.addChild(this.pixiSprite);
        }
    }

    initializeTrail() {
        // Create trail sprites for smooth movement effects
        for (let i = 0; i < this.maxTrailLength; i++) {
            const trailSprite = new PIXI.Sprite(this.animationEngine.particleTextures.particle_2);
            trailSprite.anchor.set(0.5);
            trailSprite.tint = this.color;
            trailSprite.alpha = 0;
            trailSprite.scale.set(0.3);

            this.animationEngine.effectsLayer.addChild(trailSprite);
            this.trailSprites.push(trailSprite);
        }
    }

    // Set orbit position around a star (called during ship distribution)
    setOrbitPosition(star, radius, angle, layer) {
        this.starRef = star;
        this.orbitRadius = radius;
        this.orbitAngle = angle;
        this.layer = layer;
        this.isTransferring = false;

        this.updatePosition();

        if (this.pixiSprite) {
            this.pixiSprite.visible = true;
        }
    }

    // Clear ship from star orbit
    clearFromStar() {
        this.starRef = null;
        if (this.pixiSprite) {
            this.pixiSprite.visible = false;
        }
    }

    // Update orbital rotation (called during star's rotateShips)
    updateOrbitRotation(rotationSpeed) {
        if (this.isTransferring || !this.starRef) return;

        this.orbitAngle += rotationSpeed * this.speed;
        this.updatePosition();

        // Update animation properties
        this.animationPhase += 0.1;
        this.engineGlow = 0.5 + Math.sin(this.animationPhase) * 0.3;

        // Update sprite rotation to face movement direction
        if (this.pixiSprite) {
            this.pixiSprite.rotation = this.orbitAngle + Math.PI / 2;

            // Subtle pulsing effect during movement
            const pulse = 1 + Math.sin(this.animationPhase * 2) * 0.1;
            this.pixiSprite.scale.set(this.size * pulse);
        }

        // Update trail during orbit
        this.updateTrailDuringOrbit();
    }

    updatePosition() {
        if (!this.starRef || !this.pixiSprite) return;

        const x = this.starRef.x + Math.cos(this.orbitAngle) * this.orbitRadius;
        const y = this.starRef.y + Math.sin(this.orbitAngle) * this.orbitRadius;

        this.pixiSprite.x = x;
        this.pixiSprite.y = y;
    }

    // Start transfer from source to target star
    startTransfer(sourceStar, targetStar, delay = 0) {
        this.isTransferring = true;
        this.transferProgress = 0;
        this.transferDelay = delay;
        this.sourceStar = sourceStar;
        this.targetStar = targetStar;

        // Set start position (current orbit position)
        this.transferStartPos = {
            x: this.pixiSprite.x,
            y: this.pixiSprite.y
        };

        // Set end position (orbit around target star)
        const targetAngle = Math.random() * Math.PI * 2;
        const targetRadius = targetStar.radius + 25; // First layer
        this.transferEndPos = {
            x: targetStar.x + Math.cos(targetAngle) * targetRadius,
            y: targetStar.y + Math.sin(targetAngle) * targetRadius
        };

        // Create warp-out effect
        if (this.animationEngine) {
            this.animationEngine.createParticleExplosion(
                this.transferStartPos.x,
                this.transferStartPos.y,
                this.color,
                0.3
            );
        }
    }

    // Update transfer animation (called by animation engine)
    updateTransfer(animationEngine) {
        if (!this.isTransferring) return false;

        // Handle transfer delay
        if (this.transferDelay > 0) {
            this.transferDelay -= 0.016; // Assuming 60fps
            return true;
        }

        // Get surge progress for smooth acceleration/deceleration
        const tickProgress = animationEngine.tickProgress;
        const surge = animationEngine.getSurgeProgress();

        // Update transfer progress based on surge
        this.transferProgress = surge;

        // Calculate position along path
        const dx = this.transferEndPos.x - this.transferStartPos.x;
        const dy = this.transferEndPos.y - this.transferStartPos.y;

        const currentX = this.transferStartPos.x + dx * this.transferProgress;
        const currentY = this.transferStartPos.y + dy * this.transferProgress;

        // Update sprite position
        if (this.pixiSprite) {
            this.pixiSprite.x = currentX;
            this.pixiSprite.y = currentY;

            // Rotate to face movement direction
            const angle = Math.atan2(dy, dx);
            this.pixiSprite.rotation = angle + Math.PI / 2;

            // Enhanced visual effects during transfer
            const transferIntensity = 1 + surge * 0.5;
            this.pixiSprite.scale.set(this.size * transferIntensity);
            this.pixiSprite.alpha = 0.8 + surge * 0.2;
        }

        // Update trail during transfer
        this.updateTrailDuringTransfer(currentX, currentY);

        // Create particle trail
        if (animationEngine && Math.random() < 0.3) {
            animationEngine.createShipTrail(currentX, currentY, this.color);
        }

        // Check if transfer is complete
        if (this.transferProgress >= 1) {
            this.completeTransfer();
            return false;
        }

        return true;
    }

    completeTransfer() {
        this.isTransferring = false;
        this.transferProgress = 0;

        // Create warp-in effect
        if (this.animationEngine) {
            this.animationEngine.createParticleExplosion(
                this.transferEndPos.x,
                this.transferEndPos.y,
                this.color,
                0.5
            );
        }

        // Add ship to target star
        if (this.targetStar) {
            this.targetStar.addShip(this);
        }

        // Reset visual properties
        if (this.pixiSprite) {
            this.pixiSprite.alpha = 1;
            this.pixiSprite.scale.set(this.size);
        }

        // Clear transfer references
        this.sourceStar = null;
        this.targetStar = null;
    }

    updateTrailDuringOrbit() {
        if (!this.animationEngine.enableTrails || this.trailSprites.length === 0) return;

        // Shift trail positions
        for (let i = this.trailSprites.length - 1; i > 0; i--) {
            const currentTrail = this.trailSprites[i];
            const previousTrail = this.trailSprites[i - 1];

            currentTrail.x = previousTrail.x;
            currentTrail.y = previousTrail.y;
            currentTrail.alpha = previousTrail.alpha * 0.8;
        }

        // Set first trail position to current ship position
        if (this.trailSprites[0] && this.pixiSprite) {
            this.trailSprites[0].x = this.pixiSprite.x;
            this.trailSprites[0].y = this.pixiSprite.y;
            this.trailSprites[0].alpha = 0.6;
        }
    }

    updateTrailDuringTransfer(x, y) {
        if (!this.animationEngine.enableTrails || this.trailSprites.length === 0) return;

        // More prominent trail during transfer
        for (let i = this.trailSprites.length - 1; i > 0; i--) {
            const currentTrail = this.trailSprites[i];
            const previousTrail = this.trailSprites[i - 1];

            currentTrail.x = previousTrail.x;
            currentTrail.y = previousTrail.y;
            currentTrail.alpha = previousTrail.alpha * 0.9; // Longer trail during transfer
        }

        if (this.trailSprites[0]) {
            this.trailSprites[0].x = x;
            this.trailSprites[0].y = y;
            this.trailSprites[0].alpha = 0.8; // Brighter trail during transfer
        }
    }

    // Cleanup
    destroy() {
        if (this.animationEngine && this.pixiSprite) {
            this.animationEngine.shipLayer.removeChild(this.pixiSprite);
            this.pixiSprite.destroy();
            this.pixiSprite = null;
        }

        // Clean up trail sprites
        this.trailSprites.forEach(sprite => {
            if (this.animationEngine) {
                this.animationEngine.effectsLayer.removeChild(sprite);
            }
            sprite.destroy();
        });
        this.trailSprites = [];

        this.starRef = null;
        this.sourceStar = null;
        this.targetStar = null;
    }

    // Get current world position
    get worldPosition() {
        if (this.pixiSprite) {
            return { x: this.pixiSprite.x, y: this.pixiSprite.y };
        }
        return { x: 0, y: 0 };
    }

    // Check if ship is visible
    get isVisible() {
        return this.pixiSprite && this.pixiSprite.visible;
    }

    // Update method called by animation engine
    update(deltaTime) {
        // Update animation properties
        this.animationPhase += 0.05 * deltaTime;

        // Handle transfer animation
        if (this.isTransferring) {
            return this.updateTransfer(this.animationEngine);
        }

        return true; // Ship is still active
    }
}

export { PixiShip };
