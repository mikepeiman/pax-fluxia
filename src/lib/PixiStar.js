import * as PIXI from 'pixi.js';

class PixiStar {
    constructor(id, x, y, radius, type, animationEngine) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.radius = Math.max(20, Math.min(35, radius)); // Smaller: 20-35px
        this.baseRadius = this.radius;
        this.type = type; // 1-6 corresponding to the 6 colors
        this.animationEngine = animationEngine;

        // Game state (from original Star.js)
        this.ships = [];
        this.numShips = 0;
        this.active = false;
        this.highlighted = false;
        this.attackMoveTarget = null;
        this.attackMoveTargetId = null;
        this.starsThatTargetThisStar = [];
        this.attackVectorGraphics = [];

        // Ship transfer properties (from original)
        this.shipsPerTickPercentage = 0.05;
        this.shipsPerTick = 2;
        this.shipsToTransfer = [];

        // Ship distribution properties (concentration algorithm)
        this.maxLayers = 5;
        this.shipsPerLayer = 8; // Base number of ships per layer
        this.layerSpacing = 15; // Smaller spacing for smaller stars
        this.shipRotationSpeed = 0.02; // Base rotation speed

        // Ship concentration scaling
        this.shipConcentration = 1; // How many actual ships each dot represents
        this.maxDotsPerLayer = 12; // Maximum visible dots per layer

        // Animation properties (from original enhanced visuals)
        this.animationPhase = Math.random() * Math.PI * 2;
        this.pulseIntensity = 1;
        this.coronaRotation = 0;
        this.energyLevel = 0.5;
        this.lastParticleEmission = 0;
        this.glowRadius = radius * 3;
        this.starFlares = [];
        this.energyRings = [];

        // PIXI graphics objects
        this.container = new PIXI.Container();
        this.container.x = x;
        this.container.y = y;

        // Star visual components
        this.starGraphics = new PIXI.Graphics();
        this.glowFilter = null;

        // Text labels for star ID and ship count
        this.idText = new PIXI.Text({
            text: `${this.id}`,
            style: {
                fontFamily: 'Arial',
                fontSize: 12,
                fill: 0xffffff,
                fontWeight: 'bold'
            }
        });
        this.idText.anchor.set(0.5, 0.5);
        this.idText.y = -this.radius - 20; // Above the star

        this.shipCountText = new PIXI.Text({
            text: `${this.numShips}`,
            style: {
                fontFamily: 'Arial',
                fontSize: 10,
                fill: 0xffffff,
                fontWeight: 'normal'
            }
        });
        this.shipCountText.anchor.set(0.5, 0.5);
        this.shipCountText.y = this.radius + 15; // Below the star

        // Initialize enhanced visuals (from original)
        this.initializeStarFlares();
        this.createStarVisuals();
        this.container.addChild(this.starGraphics);
        this.container.addChild(this.idText);
        this.container.addChild(this.shipCountText);

        // Add to star layer
        if (animationEngine && animationEngine.starLayer) {
            animationEngine.starLayer.addChild(this.container);
        }

        // Setup interaction
        this.setupInteraction();
    }

    initializeStarFlares() {
        // Create random flares around the star (from original)
        const flareCount = 4 + Math.floor(Math.random() * 4);
        for (let i = 0; i < flareCount; i++) {
            this.starFlares.push({
                angle: (Math.PI * 2 * i) / flareCount + Math.random() * 0.5,
                length: this.radius * (1.5 + Math.random() * 1.5),
                width: this.radius * (0.1 + Math.random() * 0.2),
                speed: 0.02 + Math.random() * 0.03,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    createEnergyRing() {
        // Create energy ring for enhanced visual effects
        this.energyRings.push({
            radius: this.radius,
            maxRadius: this.radius * 4,
            alpha: 1,
            rotation: Math.random() * Math.PI * 2,
            speed: 0.1 + Math.random() * 0.05
        });
    }

    createStarVisuals() {
        const colorData = this.animationEngine.starColors[this.type - 1] || this.animationEngine.starColors[0];

        // Clear previous graphics
        this.starGraphics.clear();

        // Enhanced star rendering with multiple layers (from original)

        // Outer glow layer
        this.starGraphics
            .circle(0, 0, this.radius * 1.5)
            .fill({ color: colorData.primary, alpha: 0.2 });

        // Main star body with gradient effect
        this.starGraphics
            .circle(0, 0, this.radius)
            .fill({ color: colorData.primary, alpha: 0.9 });

        // Secondary layer
        this.starGraphics
            .circle(0, 0, this.radius * 0.7)
            .fill({ color: colorData.secondary, alpha: 0.8 });

        // Bright center core
        this.starGraphics
            .circle(0, 0, this.radius * 0.4)
            .fill({ color: 0xffffff, alpha: 0.9 });

        // Energy core
        this.starGraphics
            .circle(0, 0, this.radius * 0.2)
            .fill({ color: 0xffffff, alpha: 1.0 });

        // Subtle border for definition
        this.starGraphics
            .circle(0, 0, this.radius)
            .stroke({ color: colorData.secondary, width: 1, alpha: 0.6 });

        // Active star gets enhanced border
        if (this.active) {
            this.starGraphics
                .circle(0, 0, this.radius * 1.3)
                .stroke({ color: colorData.primary, width: 3, alpha: 0.8 });
        }

        // Add glow filter for enhanced visuals
        if (this.animationEngine.enableGlow && !this.glowFilter && PIXI.filters && PIXI.filters.GlowFilter) {
            try {
                this.glowFilter = new PIXI.filters.GlowFilter({
                    distance: 8,
                    outerStrength: 1.5,
                    innerStrength: 0.5,
                    color: colorData.primary,
                    quality: 0.3
                });
                this.container.filters = [this.glowFilter];
            } catch (e) {
                console.warn('GlowFilter not available, skipping glow effect');
            }
        }
    }

    setupInteraction() {
        this.container.interactive = true;
        this.container.cursor = 'pointer';

        this.container.on('pointerdown', (event) => {
            this.onStarClick(event);
        });

        this.container.on('rightclick', (event) => {
            this.onStarRightClick(event);
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

        // Create click effect particles
        if (this.animationEngine) {
            const colorData = this.animationEngine.starColors[this.type - 1] || this.animationEngine.starColors[0];
            this.animationEngine.createParticleExplosion(this.x, this.y, colorData.primary, 0.3);
        }

        // Let the game manager handle the click logic
        // (This will be handled by the game manager's pointer events)
    }

    onStarRightClick(event) {
        console.log(`Star ${this.id} right-clicked`);
        // Right-click handling will be managed by the game manager
    }

    setActive(active) {
        this.active = active;
        this.updateVisuals();

        if (active && this.animationEngine) {
            this.createEnergyRing();

            // Create energy pulse effect
            this.animationEngine.createParticleExplosion(this.x, this.y,
                this.getTypeColor().primary, 0.2);
        }
    }

    updateVisuals() {
        // Enhanced visual updates based on state
        const colorData = this.animationEngine.starColors[this.type - 1] || this.animationEngine.starColors[0];

        // Keep scale constant - no bouncing effect
        this.container.scale.set(1);

        // Update tint based on state
        if (this.highlighted && !this.active) {
            this.starGraphics.tint = 0xffffff; // Slightly brighter
        } else {
            this.starGraphics.tint = 0xffffff; // Normal color
        }

        // Update visuals for active state
        if (this.active) {
            this.createStarVisuals(); // Recreate with active styling
        }
    }

    // Update ship count text display
    updateShipCountText() {
        if (this.shipCountText) {
            this.shipCountText.text = `${this.numShips}`;
        }
    }

    // Ship distribution around star circumference with concentration scaling
    distributeShips() {
        const totalShips = this.ships.length;
        this.updateShipConcentration(totalShips);

        const dotsToShow = Math.ceil(totalShips / this.shipConcentration);
        let dotsPlaced = 0;

        // Clear existing ship positions
        this.ships.forEach(ship => {
            if (ship.clearFromStar) {
                ship.clearFromStar();
            }
        });

        // Hide ships that won't be displayed as dots
        this.ships.forEach((ship, index) => {
            if (index >= dotsToShow) {
                ship.pixiSprite.visible = false;
            }
        });

        // Distribute visible ship dots in layers (maximum 5 layers)
        for (let layer = 0; layer < this.maxLayers && dotsPlaced < dotsToShow; layer++) {
            const orbitRadius = this.radius + (layer + 1) * this.layerSpacing;
            const dotsInThisLayer = Math.min(
                this.maxDotsPerLayer + layer * 2, // More dots in outer layers
                dotsToShow - dotsPlaced
            );

            const angleStep = (Math.PI * 2) / dotsInThisLayer;
            const angleOffset = Math.random() * Math.PI * 2; // Random rotation per layer

            for (let i = 0; i < dotsInThisLayer && dotsPlaced < dotsToShow; i++) {
                const ship = this.ships[dotsPlaced];
                const angle = angleOffset + i * angleStep;

                if (ship && ship.setOrbitPosition) {
                    ship.setOrbitPosition(this, orbitRadius, angle, layer);
                    ship.setConcentration(this.shipConcentration); // Tell ship how many it represents
                }
                dotsPlaced++;
            }
        }

        // Trigger reshuffling animation
        this.triggerShipReshuffleAnimation();
    }

    updateShipConcentration(totalShips) {
        // Calculate how many ships each dot should represent (the key algorithm!)
        const maxVisibleDots = this.maxLayers * this.maxDotsPerLayer;

        if (totalShips <= maxVisibleDots) {
            this.shipConcentration = 1;
        } else if (totalShips <= maxVisibleDots * 2) {
            this.shipConcentration = 2;
        } else if (totalShips <= maxVisibleDots * 5) {
            this.shipConcentration = 5;
        } else if (totalShips <= maxVisibleDots * 10) {
            this.shipConcentration = 10;
        } else if (totalShips <= maxVisibleDots * 25) {
            this.shipConcentration = 25;
        } else if (totalShips <= maxVisibleDots * 50) {
            this.shipConcentration = 50;
        } else {
            this.shipConcentration = Math.ceil(totalShips / maxVisibleDots);
        }
    }

    triggerShipReshuffleAnimation() {
        // Create reshuffling animation when ship numbers change
        if (this.animationEngine) {
            // Particle burst to show reorganization
            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    this.animationEngine.createParticleExplosion(
                        this.x + Math.random() * 40 - 20,
                        this.y + Math.random() * 40 - 20,
                        this.getTypeColor().secondary,
                        0.1
                    );
                }, i * 100);
            }

            // Brief energy ring
            this.createEnergyRing();
        }
    }

    addShip(ship) {
        this.ships.push(ship);
        this.numShips = this.ships.length;
        this.updateShipCountText(); // Update text display
        this.distributeShips(); // Redistribute all ships

        // Create warp-in effect for new ship
        if (this.animationEngine) {
            this.animationEngine.createParticleExplosion(
                this.x + Math.random() * 30 - 15,
                this.y + Math.random() * 30 - 15,
                0x00ffff,
                0.2
            );
        }
    }

    removeShip(ship) {
        const index = this.ships.indexOf(ship);
        if (index > -1) {
            this.ships.splice(index, 1);
            this.numShips = this.ships.length;
            this.updateShipCountText(); // Update text display
            this.distributeShips(); // Redistribute remaining ships

            // Create destruction effect
            if (this.animationEngine && ship.pixiSprite) {
                this.animationEngine.createParticleExplosion(
                    ship.pixiSprite.x,
                    ship.pixiSprite.y,
                    ship.color,
                    0.3
                );
            }
        }
    }

    // Ship transfer with exact specifications (30% + 3 minimum)
    transferShipsTo(targetStar, percentage = 0.3, minimumShips = 3) {
        if (!targetStar || this.ships.length === 0) return;

        // Calculate ships to transfer (percentage + minimum)
        const shipsToTransfer = Math.max(
            minimumShips,
            Math.floor(this.ships.length * percentage)
        );

        const actualTransferCount = Math.min(shipsToTransfer, this.ships.length);
        const transferShips = this.ships.splice(0, actualTransferCount);

        console.log(`Transferring ${actualTransferCount} ships from star ${this.id} to star ${targetStar.id}`);

        // Start ship movement animation with staggered departures
        transferShips.forEach((ship, index) => {
            if (ship.startTransfer) {
                ship.startTransfer(this, targetStar, index * 0.1); // 100ms stagger
            }
        });

        // Add ships to game manager's transferring ships list
        if (this.animationEngine && this.animationEngine.gameManager) {
            this.animationEngine.gameManager.transferringShips.push(...transferShips);
        }

        // Redistribute remaining ships
        this.distributeShips();
        this.numShips = this.ships.length;
        this.updateShipCountText(); // Update text display

        // Set attack move target
        this.attackMoveTarget = targetStar;
        this.attackMoveTargetId = targetStar.id;

        // Create transfer initiation effect
        if (this.animationEngine) {
            this.animationEngine.createParticleExplosion(this.x, this.y,
                this.getTypeColor().primary, 0.4);
        }
    }

    // Handle arriving ships
    receiveShip(ship) {
        // Add arriving ship to this star
        this.addShip(ship);

        // Create arrival effect
        if (this.animationEngine) {
            this.animationEngine.createParticleExplosion(this.x, this.y,
                ship.color, 0.3);
        }

        console.log(`Ship arrived at star ${this.id}. Total ships: ${this.ships.length}`);
    }

    update(tick, animationEngine) {
        // Update animation phase
        this.animationPhase += 0.03;
        this.coronaRotation += 0.01;

        // Update surge animation
        const surgeMultiplier = animationEngine ?
            (1 + animationEngine.getSurgeProgress() * 0.3) :
            (1 + Math.sin(this.animationPhase) * 0.1);

        this.radius = this.baseRadius * surgeMultiplier;

        // Update energy rings
        this.energyRings = this.energyRings.filter(ring => {
            ring.life = ring.life || 180;
            ring.life--;
            ring.rotation += 0.02;

            // Update ring visuals if we have a graphics representation
            const alpha = ring.life / 180;

            if (ring.life <= 0) {
                return false;
            }
            return true;
        });

        // Emit particles for active stars
        const currentTime = performance.now();
        if (this.active && animationEngine && currentTime - this.lastParticleEmission > 500) {
            animationEngine.createParticleExplosion(this.x, this.y, this.getTypeColor().primary, 0.1);
            this.lastParticleEmission = currentTime;
        }

        // Ship production based on star type (as specified in the original design)
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
        // Create new ship - handled by the game manager to avoid circular dependencies
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

    // Type color helper
    getTypeColor() {
        return this.animationEngine.starColors[this.type - 1] || this.animationEngine.starColors[0];
    }

    // Enhanced border highlight for active stars (from original)
    activeStarHexBorderHighlight() {
        // This is now handled in the createStarVisuals method
        this.highlighted = true;
        const pulseIntensity = 0.7 + Math.sin(this.animationPhase * 3) * 0.3;

        // Add pulsing effect to the container
        this.container.alpha = 0.8 + pulseIntensity * 0.2;
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

        // Clean up attack vector graphics
        if (this.attackVectorGraphics) {
            this.attackVectorGraphics.forEach(graphics => {
                if (graphics.parent) {
                    graphics.parent.removeChild(graphics);
                }
                graphics.destroy();
            });
            this.attackVectorGraphics = [];
        }

        if (this.container) {
            this.container.destroy({ children: true });
        }
    }
}

export { PixiStar };
