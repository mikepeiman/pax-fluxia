import * as PIXI from 'pixi.js';

class PixiStar {
    constructor(id, x, y, radius, type, animationEngine) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.radius = Math.max(50, Math.min(100, radius)); // Clamp to 50-100px as specified
        this.baseRadius = this.radius;
        this.type = type; // 1-6 corresponding to the 6 colors
        this.animationEngine = animationEngine;

        // Game state
        this.ships = [];
        this.numShips = 0;
        this.active = false;
        this.highlighted = false;
        this.attackMoveTarget = null;
        this.attackMoveTargetId = null;

        // Ship distribution properties
        this.maxLayers = 5;
        this.shipsPerLayer = 8; // Base number of ships per layer
        this.layerSpacing = 25; // Distance between layers
        this.shipRotationSpeed = 0.02; // Base rotation speed

        // Animation properties
        this.animationPhase = Math.random() * Math.PI * 2;
        this.pulseIntensity = 1;
        this.energyLevel = 0.5;

        // PIXI graphics objects
        this.container = new PIXI.Container();
        this.container.x = x;
        this.container.y = y;

        // Star visual components
        this.starGraphics = new PIXI.Graphics();
        this.glowFilter = null;
        this.energyRings = [];

        // Initialize visuals
        this.createStarVisuals();
        this.container.addChild(this.starGraphics);

        // Add to star layer
        if (animationEngine && animationEngine.starLayer) {
            animationEngine.starLayer.addChild(this.container);
        }

        // Setup interaction
        this.setupInteraction();
    }

    createStarVisuals() {
        const colorData = this.animationEngine.starColors[this.type - 1] || this.animationEngine.starColors[0];

        // Clear previous graphics
        this.starGraphics.clear();

        // Draw star core using basic PIXI syntax
        this.starGraphics.beginFill(colorData.primary);
        this.starGraphics.drawCircle(0, 0, this.radius);
        this.starGraphics.endFill();

        // Inner bright core
        this.starGraphics.beginFill(0xffffff, 0.8);
        this.starGraphics.drawCircle(0, 0, this.radius * 0.4);
        this.starGraphics.endFill();

        // Add subtle border
        this.starGraphics.lineStyle(2, colorData.secondary, 0.6);
        this.starGraphics.drawCircle(0, 0, this.radius);

        // Energy rings for active stars
        if (this.active) {
            this.createEnergyRing();
        }

        // Add glow filter for performance-friendly glow effect (only if available)
        if (this.animationEngine.enableGlow && !this.glowFilter && PIXI.filters && PIXI.filters.GlowFilter) {
            try {
                this.glowFilter = new PIXI.filters.GlowFilter({
                    distance: 15,
                    outerStrength: 2,
                    innerStrength: 1,
                    color: colorData.primary,
                    quality: 0.3 // Lower quality for performance
                });
                this.container.filters = [this.glowFilter];
            } catch (e) {
                console.warn('GlowFilter not available, skipping glow effect');
            }
        }
    }

    createEnergyRing() {
        const colorData = this.animationEngine.starColors[this.type - 1] || this.animationEngine.starColors[0];

        const ring = new PIXI.Graphics();
        ring.lineStyle(3, colorData.secondary, 0.6);
        ring.drawCircle(0, 0, this.radius * 2);

        // Animated dashed effect
        ring.alpha = 0.8;
        this.container.addChild(ring);

        // Animate the ring
        const ringData = {
            graphics: ring,
            radius: this.radius * 2,
            rotation: 0,
            life: 180 // frames
        };

        this.energyRings.push(ringData);
    }

    setupInteraction() {
        this.container.interactive = true;
        this.container.cursor = 'pointer';

        this.container.on('pointerdown', (event) => {
            this.onStarClick(event);
        });

        this.container.on('pointerover', () => {
            this.highlighted = true;
            this.updateVisuals();
        });

        this.container.on('pointerout', () => {
            this.highlighted = false;
            this.updateVisuals();
        });
    }

    onStarClick(event) {
        // Handle star selection and attack move orders
        console.log(`Star ${this.id} clicked`);

        // Create click effect
        if (this.animationEngine) {
            const colorData = this.animationEngine.starColors[this.type - 1] || this.animationEngine.starColors[0];
            this.animationEngine.createParticleExplosion(this.x, this.y, colorData.primary, 0.5);
        }

        // Toggle active state
        this.setActive(!this.active);
    }

    setActive(active) {
        this.active = active;
        this.updateVisuals();

        if (active && this.animationEngine) {
            this.createEnergyRing();
        }
    }

    updateVisuals() {
        // Update star appearance based on state
        const colorData = this.animationEngine.starColors[this.type - 1] || this.animationEngine.starColors[0];

        // Pulse effect for active stars
        if (this.active) {
            const pulse = 1 + Math.sin(this.animationPhase) * 0.1;
            this.container.scale.set(pulse);
        } else {
            this.container.scale.set(1);
        }

        // Highlight effect
        if (this.highlighted) {
            this.starGraphics.tint = 0xffffff;
        } else {
            this.starGraphics.tint = 0xffffff; // Keep original colors
        }
    }

    // Ship distribution around star circumference
    distributeShips() {
        const totalShips = this.ships.length;
        let shipsPlaced = 0;

        // Clear existing ship positions
        this.ships.forEach(ship => {
            if (ship.clearFromStar) {
                ship.clearFromStar();
            }
        });

        // Distribute ships in layers (maximum 5 layers)
        for (let layer = 0; layer < this.maxLayers && shipsPlaced < totalShips; layer++) {
            const orbitRadius = this.radius + (layer + 1) * this.layerSpacing;
            const shipsInThisLayer = Math.min(
                this.shipsPerLayer + layer * 2, // More ships in outer layers
                totalShips - shipsPlaced
            );

            const angleStep = (Math.PI * 2) / shipsInThisLayer;
            const angleOffset = Math.random() * Math.PI * 2; // Random rotation per layer

            for (let i = 0; i < shipsInThisLayer && shipsPlaced < totalShips; i++) {
                const ship = this.ships[shipsPlaced];
                const angle = angleOffset + i * angleStep;

                if (ship.setOrbitPosition) {
                    ship.setOrbitPosition(this, orbitRadius, angle, layer);
                }
                shipsPlaced++;
            }
        }
    }

    addShip(ship) {
        this.ships.push(ship);
        this.numShips = this.ships.length;
        this.distributeShips(); // Redistribute all ships

        // Create warp-in effect
        if (this.animationEngine) {
            this.animationEngine.createParticleExplosion(
                this.x + Math.random() * 50 - 25,
                this.y + Math.random() * 50 - 25,
                0x00ffff,
                0.3
            );
        }
    }

    removeShip(ship) {
        const index = this.ships.indexOf(ship);
        if (index > -1) {
            this.ships.splice(index, 1);
            this.numShips = this.ships.length;
            this.distributeShips(); // Redistribute remaining ships

            // Create destruction effect
            if (this.animationEngine && ship.pixiSprite) {
                this.animationEngine.createParticleExplosion(
                    ship.pixiSprite.x,
                    ship.pixiSprite.y,
                    ship.color,
                    0.5
                );
            }
        }
    }

    // Ship transfer with exact specifications
    transferShipsTo(targetStar, percentage = 0.3, minimumShips = 3) {
        if (!targetStar || this.ships.length === 0) return;

        // Calculate ships to transfer (percentage + minimum)
        const shipsToTransfer = Math.max(
            minimumShips,
            Math.floor(this.ships.length * percentage)
        );

        const transferShips = this.ships.splice(0, shipsToTransfer);

        // Start ship movement animation
        transferShips.forEach((ship, index) => {
            if (ship.startTransfer) {
                ship.startTransfer(this, targetStar, index * 0.1); // Stagger the departures
            }
        });

        // Redistribute remaining ships
        this.distributeShips();
        this.numShips = this.ships.length;

        // Set attack move target
        this.attackMoveTarget = targetStar;
        this.attackMoveTargetId = targetStar.id;
    }

    update(tick, animationEngine) {
        // Update animation phase
        this.animationPhase += 0.03;

        // Update energy rings
        this.energyRings = this.energyRings.filter(ringData => {
            ringData.life--;
            ringData.rotation += 0.02;

            // Animate ring properties
            const alpha = ringData.life / 180;
            ringData.graphics.alpha = alpha * 0.6;
            ringData.graphics.rotation = ringData.rotation;

            if (ringData.life <= 0) {
                this.container.removeChild(ringData.graphics);
                ringData.graphics.destroy();
                return false;
            }
            return true;
        });

        // Ship production based on star type (as in original)
        this.updateShipProduction(tick);

        // Update visual effects
        this.updateVisuals();

        // Rotate ships around star
        this.rotateShips(animationEngine);
    }

    updateShipProduction(tick) {
        // Ship production rates based on type (exactly as specified)
        let shouldProduce = false;

        switch (this.type) {
            case 1: shouldProduce = true; break; // Every tick
            case 2: shouldProduce = tick % 2 === 0; break; // Every 2 ticks
            case 3: shouldProduce = tick % 3 === 0; break; // Every 3 ticks
            case 4: shouldProduce = tick % 4 === 0; break; // Every 4 ticks
            case 5: shouldProduce = tick % 5 === 0; break; // Every 5 ticks
            case 6: shouldProduce = tick % 6 === 0; break; // Every 6 ticks
        }

        if (shouldProduce && this.ships.length < 200) { // Cap at 200 ships per star
            this.produceShip();
        }
    }

    produceShip() {
        // Create new ship - this will be handled by the game manager
        // to avoid circular dependencies
        if (this.animationEngine && this.animationEngine.gameManager) {
            const ship = this.animationEngine.gameManager.createShip(this);
            this.addShip(ship);
        }
    }

    rotateShips(animationEngine) {
        // Only rotate ships if not in stillness period
        if (!animationEngine || animationEngine.isInStillness()) return;

        const surge = animationEngine.getSurgeProgress();
        const rotationSpeed = this.shipRotationSpeed * (0.5 + surge * 1.5);

        this.ships.forEach(ship => {
            if (!ship.isTransferring && ship.updateOrbitRotation) {
                ship.updateOrbitRotation(rotationSpeed);
            }
        });
    }

    // Cleanup
    destroy() {
        if (this.animationEngine && this.animationEngine.starLayer) {
            this.animationEngine.starLayer.removeChild(this.container);
        }

        this.ships.forEach(ship => {
            if (ship.destroy) {
                ship.destroy();
            }
        });
        this.ships = [];

        this.energyRings.forEach(ringData => {
            if (ringData.graphics) {
                ringData.graphics.destroy();
            }
        });
        this.energyRings = [];

        if (this.container) {
            this.container.destroy({ children: true });
        }
    }

    // Getters for compatibility
    getTypeColor() {
        return this.animationEngine.starColors[this.type - 1] || this.animationEngine.starColors[0];
    }
}

export { PixiStar };
