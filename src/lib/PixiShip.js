import * as PIXI from 'pixi.js';

class PixiShip {
    constructor(type, animationEngine) {
        this.type = type; // 1-4 for different ship types (fighter, cruiser, destroyer, battleship)
        this.animationEngine = animationEngine;

        // Ship state
        this.currentStar = null;
        this.targetStar = null;
        this.isTransferring = false;
        this.orbitRadius = 0;
        this.orbitAngle = 0;
        this.orbitLayer = 0;
        this.color = 0xffffff;

        // Movement properties for surge animation
        this.startPos = { x: 0, y: 0 };
        this.endPos = { x: 0, y: 0 };
        this.transferStartTick = 0;
        this.transferDelay = 0; // Stagger departures

        // Animation properties
        this.rotationSpeed = 0.02;
        this.trailHistory = [];
        this.maxTrailLength = 8;

        // PIXI sprite
        this.pixiSprite = null;
        this.createSprite();

        // Add to ship layer
        if (animationEngine && animationEngine.shipLayer) {
            animationEngine.shipLayer.addChild(this.pixiSprite);
        }
    }

    createSprite() {
        // Get ship texture based on type
        const textureKey = this.getTextureKey();

        if (this.animationEngine.shipTextures && this.animationEngine.shipTextures[textureKey]) {
            this.pixiSprite = new PIXI.Sprite(this.animationEngine.shipTextures[textureKey]);
            // Set anchor only for sprites
            if (this.pixiSprite.anchor) {
                this.pixiSprite.anchor.set(0.5);
            }
        } else {
            // Fallback: create a simple graphics shape
            const graphics = new PIXI.Graphics();
            const size = this.getShipSize();

            // Create ship shape based on type (centered around 0,0)
            graphics.fill(0xffffff);
            switch (this.type) {
                case 1: // Fighter
                    graphics.poly([0, -size, -size * 0.7, size * 0.5, size * 0.7, size * 0.5]);
                    break;
                case 2: // Cruiser
                    graphics.poly([0, -size, -size * 0.5, 0, 0, size, size * 0.5, 0]);
                    break;
                case 3: // Destroyer
                    graphics.rect(-size * 0.75, -size * 0.5, size * 1.5, size);
                    break;
                case 4: // Battleship
                    graphics.roundRect(-size, -size * 0.6, size * 2, size * 1.2, 4);
                    break;
            }

            this.pixiSprite = graphics;
        }

        // Set common properties
        this.pixiSprite.scale.set(0.8);
        this.color = this.getShipColor();
        this.pixiSprite.tint = this.color;

        // Initially hide until positioned
        this.pixiSprite.visible = false;
    }

    getTextureKey() {
        const types = ['fighter', 'cruiser', 'destroyer', 'battleship'];
        return types[this.type - 1] || 'fighter';
    }

    getShipSize() {
        const sizes = [8, 12, 16, 20];
        return sizes[this.type - 1] || 8;
    }

    getShipColor() {
        // Ships take on a variation of their current star's color
        if (this.currentStar) {
            const starColor = this.currentStar.getTypeColor();
            return starColor.primary;
        }
        return 0x00aaff; // Default blue
    }

    // Set ship to orbit around a star
    setOrbitPosition(star, radius, angle, layer) {
        this.currentStar = star;
        this.orbitRadius = radius;
        this.orbitAngle = angle;
        this.orbitLayer = layer;
        this.isTransferring = false;

        // Update color to match star
        this.color = this.getShipColor();
        this.pixiSprite.tint = this.color;

        // Calculate position
        this.updateOrbitPosition();

        // Show sprite
        this.pixiSprite.visible = true;
    }

    updateOrbitPosition() {
        if (!this.currentStar || this.isTransferring) return;

        const x = this.currentStar.x + Math.cos(this.orbitAngle) * this.orbitRadius;
        const y = this.currentStar.y + Math.sin(this.orbitAngle) * this.orbitRadius;

        this.pixiSprite.x = x;
        this.pixiSprite.y = y;

        // Point ship in direction of movement (tangent to orbit)
        this.pixiSprite.rotation = this.orbitAngle + Math.PI / 2;
    }

    updateOrbitRotation(rotationSpeed) {
        if (this.isTransferring) return;

        this.orbitAngle += rotationSpeed;
        this.updateOrbitPosition();

        // Add trail effect
        if (this.animationEngine.enableTrails && this.trailHistory.length < this.maxTrailLength) {
            this.addTrailPoint();
        }
    }

    addTrailPoint() {
        this.trailHistory.push({
            x: this.pixiSprite.x,
            y: this.pixiSprite.y,
            time: performance.now()
        });

        // Remove old trail points
        const maxAge = 1000; // 1 second
        const now = performance.now();
        this.trailHistory = this.trailHistory.filter(point => now - point.time < maxAge);

        // Create trail particles
        if (this.trailHistory.length > 2) {
            const lastPoint = this.trailHistory[this.trailHistory.length - 1];
            this.animationEngine.createShipTrail(lastPoint.x, lastPoint.y, this.color);
        }
    }

    // Start transfer between stars with surge animation
    startTransfer(sourceStar, targetStar, delay = 0) {
        if (!sourceStar || !targetStar) return;

        this.currentStar = sourceStar;
        this.targetStar = targetStar;
        this.isTransferring = true;
        this.transferDelay = delay;
        this.transferStartTick = this.animationEngine.currentTick;

        // Set start and end positions
        this.startPos = {
            x: this.pixiSprite.x,
            y: this.pixiSprite.y
        };

        this.endPos = {
            x: targetStar.x,
            y: targetStar.y
        };

        // Point ship toward destination
        const dx = this.endPos.x - this.startPos.x;
        const dy = this.endPos.y - this.startPos.y;
        this.pixiSprite.rotation = Math.atan2(dy, dx);

        // Create departure effect
        this.animationEngine.createParticleExplosion(
            this.startPos.x,
            this.startPos.y,
            this.color,
            0.3
        );

        console.log(`Ship starting transfer from star ${sourceStar.id} to star ${targetStar.id}`);
    }

    update() {
        if (!this.isTransferring) {
            return true; // Ship is still alive and orbiting
        }

        // Handle transfer animation with surge pattern
        const currentTick = this.animationEngine.currentTick;
        const ticksSinceStart = currentTick - this.transferStartTick;

        // Apply delay before starting movement
        if (ticksSinceStart < this.transferDelay) {
            return true;
        }

        // Use surge animation progress (acceleration -> deceleration -> stillness)
        const surgeProgress = this.animationEngine.getSurgeProgress();

        // Interpolate position along path
        const t = surgeProgress;
        const newX = this.startPos.x + (this.endPos.x - this.startPos.x) * t;
        const newY = this.startPos.y + (this.endPos.y - this.startPos.y) * t;

        this.pixiSprite.x = newX;
        this.pixiSprite.y = newY;

        // Add movement trail
        if (this.animationEngine.enableTrails && surgeProgress > 0.1 && surgeProgress < 0.9) {
            this.animationEngine.createShipTrail(newX, newY, this.color);
        }

        // Check if transfer is complete (reached destination)
        if (surgeProgress >= 1.0 && !this.animationEngine.isInStillness()) {
            this.completeTransfer();
            return false; // Ship transfer complete, remove from transferring list
        }

        return true; // Ship is still transferring
    }

    completeTransfer() {
        if (!this.targetStar) return;

        console.log(`Ship completed transfer to star ${this.targetStar.id}`);

        // Add ship to target star
        this.targetStar.addShip(this);

        // Create arrival effect
        this.animationEngine.createParticleExplosion(
            this.endPos.x,
            this.endPos.y,
            this.color,
            0.5
        );

        // Reset transfer state
        this.isTransferring = false;
        this.targetStar = null;
    }

    clearFromStar() {
        // Remove ship from current star's orbit
        this.currentStar = null;
        this.pixiSprite.visible = false;
    }

    // Cleanup
    destroy() {
        if (this.animationEngine && this.animationEngine.shipLayer && this.pixiSprite) {
            this.animationEngine.shipLayer.removeChild(this.pixiSprite);
        }

        if (this.pixiSprite) {
            this.pixiSprite.destroy();
            this.pixiSprite = null;
        }

        this.trailHistory = [];
    }

    // Getters for compatibility
    get x() { return this.pixiSprite ? this.pixiSprite.x : 0; }
    get y() { return this.pixiSprite ? this.pixiSprite.y : 0; }
}

export { PixiShip };
