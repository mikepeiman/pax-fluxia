import * as PIXI from 'pixi.js';
import { TickBasedAnimationEngine } from './PixiAnimationEngine.js';
import { PixiStar } from './PixiStar.js';
import { PixiShip } from './PixiShip.js';

class PixiGameManager {
    constructor(containerElement, width, height) {
        // Initialize the animation engine
        this.animationEngine = new TickBasedAnimationEngine(containerElement, width, height);
        this.animationEngine.gameManager = this; // Back-reference for ship creation

        // Game state
        this.stars = [];
        this.starConnections = []; // Network connections between stars
        this.connectionGraphics = []; // Visual connection lines
        this.transferringShips = [];
        this.activeStars = [];
        this.selectedStar = null;
        this.lastSelectedStar = null;
        this.targetStar = null;

        // Enhanced drag state for original-style click handling
        this.isDragging = false;
        this.dragStartStar = null;
        this.dragArrow = null;
        this.mousedownStar = null;
        this.mouseupStar = null;

        // Game settings
        this.numStars = 15;
        this.minShips = 5;
        this.maxShips = 25;

        // Performance settings with UI controls
        this.performanceSettings = {
            mode: 'high', // high, medium, low
            enableParticles: true,
            enableTrails: true,
            enableGlow: true,
            enableAntialiasing: false,
            maxParticles: 2000,
            shipAnimationDetail: 'high'
        };

        // Update animation engine with game manager reference
        this.animationEngine.gameManager = this;

        // Wait for animation engine to initialize before setting up the game
        this.initializeGameWhenReady();

        // Setup input handling
        this.setupInputHandling();
    }

    async initializeGameWhenReady() {
        // Wait for the animation engine to be fully ready with all layers
        while (!this.animationEngine.app || !this.animationEngine.starLayer) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Additional wait to ensure layers are properly added to stage
        await new Promise(resolve => setTimeout(resolve, 100));

        // Initialize the game
        this.initializeGame();

        // Auto-start the animation
        setTimeout(() => {
            this.start();
        }, 200);
    }

    initializeGame() {
        // Clear existing game objects
        this.clearGame();

        // Generate stars in network pattern
        this.generateStars();

        // Generate star network connections
        this.generateStarConnections();

        // Generate initial ships for each star
        this.generateInitialShips();

        // Setup interaction after stars are created
        this.setupStarInteractions();

        console.log(`Game initialized with ${this.stars.length} stars and ${this.starConnections.length} connections`);
    }

    generateStars() {
        const width = this.animationEngine.width;
        const height = this.animationEngine.height;
        const margin = 150;

        // Generate stars in a distributed pattern
        for (let i = 0; i < this.numStars; i++) {
            const x = margin + Math.random() * (width - margin * 2);
            const y = margin + Math.random() * (height - margin * 2);
            const radius = 25 + Math.random() * 20; // Smaller: 25-45px instead of 50-100px
            const type = Math.floor(Math.random() * 6) + 1; // 1-6 for the 6 colors

            // Ensure minimum distance between stars
            let validPosition = true;
            const minDistance = 150; // Reduced from 200 since stars are smaller

            for (const existingStar of this.stars) {
                const dx = x - existingStar.x;
                const dy = y - existingStar.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < minDistance) {
                    validPosition = false;
                    break;
                }
            }

            if (validPosition) {
                const star = new PixiStar(i + 1, x, y, radius, type, this.animationEngine);
                this.stars.push(star);
            } else {
                i--; // Try again with a different position
            }
        }
    }

    generateStarConnections() {
        // Generate network connections between stars
        this.starConnections = [];

        // Simple approach: connect each star to 2-4 nearest neighbors
        for (let i = 0; i < this.stars.length; i++) {
            const star = this.stars[i];
            const distances = [];

            // Calculate distances to all other stars
            for (let j = 0; j < this.stars.length; j++) {
                if (i !== j) {
                    const other = this.stars[j];
                    const dx = star.x - other.x;
                    const dy = star.y - other.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    distances.push({ star: other, distance: distance, index: j });
                }
            }

            // Sort by distance and connect to 2-4 nearest
            distances.sort((a, b) => a.distance - b.distance);
            const connectionsToMake = 2 + Math.floor(Math.random() * 3); // 2-4 connections

            for (let k = 0; k < Math.min(connectionsToMake, distances.length); k++) {
                const target = distances[k];

                // Avoid connections that are too long (keep network reasonable)
                if (target.distance < 300) {
                    const connectionId = `${Math.min(i, target.index)}-${Math.max(i, target.index)}`;

                    // Avoid duplicate connections
                    if (!this.starConnections.find(conn => conn.id === connectionId)) {
                        this.starConnections.push({
                            id: connectionId,
                            star1: star,
                            star2: target.star,
                            distance: target.distance
                        });

                        // Update star's connections array
                        if (!star.connections) star.connections = [];
                        if (!target.star.connections) target.star.connections = [];

                        star.connections.push(target.star.id);
                        target.star.connections.push(star.id);
                    }
                }
            }
        }

        // Draw connection lines
        this.drawStarConnections();
    }

    drawStarConnections() {
        // Clear existing connection graphics
        this.connectionGraphics.forEach(graphics => {
            if (this.animationEngine.backgroundLayer && graphics.parent) {
                this.animationEngine.backgroundLayer.removeChild(graphics);
                graphics.destroy();
            }
        });
        this.connectionGraphics = [];

        // Draw each connection
        this.starConnections.forEach(connection => {
            const graphics = new PIXI.Graphics();

            // Thin, subtle connection lines
            graphics.stroke({ color: 0x444444, width: 1, alpha: 0.3 });
            graphics.moveTo(connection.star1.x, connection.star1.y);
            graphics.lineTo(connection.star2.x, connection.star2.y);

            // Add to background layer so connections appear behind stars
            if (this.animationEngine.backgroundLayer) {
                this.animationEngine.backgroundLayer.addChild(graphics);
                this.connectionGraphics.push(graphics);
            }
        });
    }

    generateInitialShips() {
        this.stars.forEach(star => {
            const numShips = this.minShips + Math.floor(Math.random() * (this.maxShips - this.minShips));

            for (let i = 0; i < numShips; i++) {
                const shipType = Math.floor(Math.random() * 4) + 1; // 1-4 ship types
                const ship = this.createShip(star, shipType);
                star.addShip(ship);
            }
        });
    }

    createShip(star, type = null) {
        const shipType = type || (Math.floor(Math.random() * 4) + 1);
        const ship = new PixiShip(shipType, this.animationEngine);
        return ship;
    }

    setupInputHandling() {
        // Prevent context menu and handle right-clicks (like original)
        document.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            return false;
        });

        // Handle keyboard input for game controls
        document.addEventListener('keydown', (event) => {
            this.handleKeyDown(event);
        });

        document.addEventListener('keyup', (event) => {
            this.handleKeyUp(event);
        });

        // Setup enhanced mouse handlers based on original onClick.js
        if (this.animationEngine.app) {
            this.animationEngine.app.stage.interactive = true;
            this.animationEngine.app.stage.on('pointerdown', (event) => this.handlePointerDown(event));
            this.animationEngine.app.stage.on('pointermove', (event) => this.handlePointerMove(event));
            this.animationEngine.app.stage.on('pointerup', (event) => this.handlePointerUp(event));
            this.animationEngine.app.stage.on('rightclick', (event) => this.handleRightClick(event));
        }
    }

    setupStarInteractions() {
        // Handle star interactions for enhanced click-drag mechanics
        this.stars.forEach(star => {
            if (star.container) {
                star.container.interactive = true;
                star.container.cursor = 'pointer';

                // Enhanced event handling based on original
                star.container.on('pointerdown', (event) => {
                    this.handleStarPointerDown(star, event);
                });

                star.container.on('rightclick', (event) => {
                    this.handleStarRightClick(star, event);
                });

                star.container.on('pointerover', () => {
                    star.highlighted = true;
                    star.updateVisuals();
                });

                star.container.on('pointerout', () => {
                    star.highlighted = false;
                    star.updateVisuals();
                });
            }
        });
    }

    handlePointerDown(event) {
        // Global pointer down - start monitoring for drag operations
        const globalPos = event.data.global;
        const starUnderMouse = this.getStarAtPosition(globalPos.x, globalPos.y);

        if (starUnderMouse) {
            this.mousedownStar = starUnderMouse;
        }
    }

    handleStarPointerDown(star, event) {
        // Handle star-specific pointer down (like original's click handling)
        console.log(`Star ${star.id} pointer down`);

        // Check for right-click
        if (event.data.pointerType === 'mouse' && event.data.button === 2) {
            this.handleStarRightClick(star, event);
            return;
        }

        // Start drag operation for left-click
        this.isDragging = true;
        this.dragStartStar = star;
        this.mousedownStar = star;

        // Select the star (integrated from original setActiveStar function)
        this.setActiveStar(star);

        console.log(`Started drag from star ${star.id}`);

        // Stop event propagation
        event.stopPropagation();
    }

    handleStarRightClick(star, event) {
        // Right-click cancels outgoing move commands (from original)
        console.log(`Right-click on star ${star.id} - canceling attack move`);

        if (star.attackMoveTargetId) {
            star.attackMoveTargetId = null;
            star.attackMoveTarget = null;

            // Clear visual indicators
            this.clearAttackVector(star);
        }

        // If this was the active star, deactivate it
        if (this.selectedStar === star) {
            star.setActive(false);
            this.selectedStar = null;
        }

        event.stopPropagation();
    }

    handleRightClick(event) {
        // Global right-click handler
        console.log('Global right-click');
        event.preventDefault();
        return false;
    }

    setActiveStar(star) {
        // Enhanced star activation (from original setActiveStar function)
        console.log(`Setting active star: ${star.id}`);

        // Store previous selection
        this.lastSelectedStar = this.selectedStar;

        // Clear previous selection
        if (this.selectedStar && this.selectedStar !== star) {
            this.selectedStar.setActive(false);
        }

        // Set new selection
        this.selectedStar = star;
        star.setActive(true);

        // If we had a previous selection, set up attack move
        if (this.lastSelectedStar && this.lastSelectedStar !== star) {
            this.setAttackMoveTarget(this.lastSelectedStar, star);
            this.executeAttackMoveOperations(this.lastSelectedStar, star);
        }
    }

    setAttackMoveTarget(sourceStar, targetStar) {
        // Set attack move target (from original)
        if (targetStar && sourceStar !== targetStar) {
            console.log(`Setting attack move: ${sourceStar.id} -> ${targetStar.id}`);
            sourceStar.attackMoveTargetId = targetStar.id;
            sourceStar.attackMoveTarget = targetStar;

            // Add to target's incoming list if not already there
            if (!targetStar.starsThatTargetThisStar) {
                targetStar.starsThatTargetThisStar = [];
            }
            if (!targetStar.starsThatTargetThisStar.includes(sourceStar.id)) {
                targetStar.starsThatTargetThisStar.push(sourceStar.id);
            }
        }
    }

    executeAttackMoveOperations(sourceStar, targetStar) {
        // Execute attack move operations (from original)
        if (!sourceStar || !targetStar) return;

        console.log(`Executing attack move: ${sourceStar.id} -> ${targetStar.id}`);

        // Clear any conflicting attack moves
        if (targetStar.attackMoveTargetId === sourceStar.id) {
            targetStar.attackMoveTargetId = null;
            targetStar.attackMoveTarget = null;
        }

        // Create visual attack vector
        this.createAttackVector(sourceStar, targetStar);

        // Set up the attack move
        sourceStar.attackMoveTarget = targetStar;
        sourceStar.attackMoveTargetId = targetStar.id;
    }

    handlePointerMove(event) {
        if (!this.isDragging || !this.dragStartStar) return;

        const globalPos = event.data.global;

        // Clear previous arrow
        if (this.dragArrow) {
            this.animationEngine.uiLayer.removeChild(this.dragArrow);
            this.dragArrow.destroy();
        }

        // Create drag arrow
        this.dragArrow = this.createDragArrow(
            this.dragStartStar.x,
            this.dragStartStar.y,
            globalPos.x,
            globalPos.y
        );

        this.animationEngine.uiLayer.addChild(this.dragArrow);
    }

    handlePointerUp(event) {
        const globalPos = event.data.global;
        const targetStar = this.getStarAtPosition(globalPos.x, globalPos.y);
        this.mouseupStar = targetStar;

        if (this.isDragging && this.dragStartStar) {
            // Handle drag completion
            if (targetStar && targetStar !== this.dragStartStar) {
                // Execute attack move
                this.orderAttackMove(this.dragStartStar, targetStar);
            }

            // Clean up drag state
            this.endDrag();
        } else if (targetStar) {
            // Handle simple click (no drag)
            this.setActiveStar(targetStar);
        }
    }

    handleKeyDown(event) {
        console.log(`Key down: ${event.key} (${event.keyCode})`);

        switch (event.code) {
            case 'Space':
                event.preventDefault();
                this.togglePause();
                break;
            case 'KeyR':
                this.resetGame();
                break;
            case 'Escape':
                // Clear all selections and attack moves (like original)
                this.clearAllSelections();
                this.endDrag();
                break;
            case 'KeyL':
                // Log star details (from original)
                this.logAllStarDetails();
                break;
            case 'ControlLeft':
            case 'ControlRight':
                // Clear all attack moves on Ctrl (from original)
                this.clearAllAttackMoves();
                break;
            case 'Digit1':
                this.setPerformanceMode('low');
                break;
            case 'Digit2':
                this.setPerformanceMode('medium');
                break;
            case 'Digit3':
                this.setPerformanceMode('high');
                break;
        }
    }

    handleKeyUp(event) {
        console.log(`Key up: ${event.key} (${event.keyCode})`);
        // Handle key up events if needed
    }

    clearAllSelections() {
        // Clear all star selections (from original)
        this.stars.forEach(star => {
            star.setActive(false);
            star.highlighted = false;
            star.updateVisuals();
        });
        this.selectedStar = null;
        this.lastSelectedStar = null;
    }

    clearAllAttackMoves() {
        // Clear all attack moves (from original Ctrl functionality)
        this.stars.forEach(star => {
            star.attackMoveTargetId = null;
            star.attackMoveTarget = null;
            star.starsThatTargetThisStar = [];
        });
        this.clearAllAttackVectors();
    }

    logAllStarDetails() {
        // Log details for all stars (from original 'L' key functionality)
        this.stars.forEach(star => {
            console.log(`Star ${star.id}: ships=${star.ships.length}, active=${star.active}, attackTarget=${star.attackMoveTargetId}`);
        });
    }

    endDrag() {
        this.isDragging = false;
        this.dragStartStar = null;

        // Clear drag arrow
        if (this.dragArrow) {
            this.animationEngine.uiLayer.removeChild(this.dragArrow);
            this.dragArrow.destroy();
            this.dragArrow = null;
        }
    }

    getStarAtPosition(x, y) {
        for (const star of this.stars) {
            const dx = x - star.x;
            const dy = y - star.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= star.radius + 10) { // Small margin for easier targeting
                return star;
            }
        }
        return null;
    }

    createDragArrow(startX, startY, endX, endY) {
        const graphics = new PIXI.Graphics();

        // Enhanced arrow design
        graphics.stroke({ color: 0x00ff88, width: 3, alpha: 0.8 });
        graphics.moveTo(startX, startY);
        graphics.lineTo(endX, endY);

        // Draw arrowhead
        const dx = endX - startX;
        const dy = endY - startY;
        const angle = Math.atan2(dy, dx);
        const arrowSize = 15;

        graphics.stroke({ color: 0x00ff88, width: 3, alpha: 0.8 });
        graphics.moveTo(endX, endY);
        graphics.lineTo(
            endX - arrowSize * Math.cos(angle - Math.PI / 6),
            endY - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        graphics.moveTo(endX, endY);
        graphics.lineTo(
            endX - arrowSize * Math.cos(angle + Math.PI / 6),
            endY - arrowSize * Math.sin(angle + Math.PI / 6)
        );

        return graphics;
    }

    orderAttackMove(sourceStar, targetStar) {
        if (!sourceStar || !targetStar || sourceStar === targetStar) return;

        console.log(`Ordering attack move from star ${sourceStar.id} to star ${targetStar.id}`);

        // Transfer ships (30% + 3 minimum as specified)
        sourceStar.transferShipsTo(targetStar, 0.3, 3);

        // Set attack move target
        this.setAttackMoveTarget(sourceStar, targetStar);

        // Create visual connection
        this.createAttackVector(sourceStar, targetStar);
    }

    createAttackVector(sourceStar, targetStar) {
        if (!this.animationEngine.uiLayer) return;

        // Create enhanced attack vector visualization
        const graphics = new PIXI.Graphics();

        // Animated dashed line
        graphics.stroke({ color: 0x00ff00, width: 3, alpha: 0.8 });
        graphics.moveTo(sourceStar.x, sourceStar.y);
        graphics.lineTo(targetStar.x, targetStar.y);

        // Enhanced arrowhead
        const dx = targetStar.x - sourceStar.x;
        const dy = targetStar.y - sourceStar.y;
        const angle = Math.atan2(dy, dx);
        const arrowSize = 20;

        graphics.stroke({ color: 0x00ff00, width: 3, alpha: 0.8 });
        graphics.moveTo(targetStar.x, targetStar.y);
        graphics.lineTo(
            targetStar.x - arrowSize * Math.cos(angle - Math.PI / 6),
            targetStar.y - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        graphics.moveTo(targetStar.x, targetStar.y);
        graphics.lineTo(
            targetStar.x - arrowSize * Math.cos(angle + Math.PI / 6),
            targetStar.y - arrowSize * Math.sin(angle + Math.PI / 6)
        );

        // Add to UI layer with identifier for later removal
        graphics.attackVectorId = `${sourceStar.id}-${targetStar.id}`;
        this.animationEngine.uiLayer.addChild(graphics);

        // Store reference for potential removal
        if (!sourceStar.attackVectorGraphics) {
            sourceStar.attackVectorGraphics = [];
        }
        sourceStar.attackVectorGraphics.push(graphics);

        // Attack vectors remain until manually cancelled (no auto-fade timeout)
        console.log(`Attack vector created from ${sourceStar.id} to ${targetStar.id} - will persist until cancelled`);
    }

    clearAttackVector(star) {
        // Clear attack vector graphics for a specific star
        if (star.attackVectorGraphics) {
            star.attackVectorGraphics.forEach(graphics => {
                if (this.animationEngine.uiLayer && graphics.parent) {
                    this.animationEngine.uiLayer.removeChild(graphics);
                    graphics.destroy();
                }
            });
            star.attackVectorGraphics = [];
        }
    }

    clearAllAttackVectors() {
        // Clear all attack vector graphics
        this.stars.forEach(star => {
            this.clearAttackVector(star);
        });
    }

    clearSelection() {
        if (this.selectedStar) {
            this.selectedStar.setActive(false);
            this.selectedStar = null;
        }
    }

    // Game loop update method
    update() {
        // Update all stars
        this.stars.forEach(star => {
            star.update(this.animationEngine.currentTick, this.animationEngine);
        });

        // Update transferring ships
        this.updateTransferringShips();

        // Handle ship arrivals and battles
        this.handleShipArrivals();
    }

    updateTransferringShips() {
        // This is handled by individual ships, but we could add global logic here
        this.transferringShips = this.transferringShips.filter(ship => {
            return ship.update();
        });
    }

    handleShipArrivals() {
        // Handle ships arriving at destination stars
        // For now, ships just join the destination star
        // In a more complex game, this would handle battles
    }

    // Performance control methods
    setPerformanceMode(mode) {
        this.performanceSettings.mode = mode;
        this.animationEngine.setPerformanceMode(mode);

        console.log(`Performance mode set to: ${mode}`);

        // Adjust settings based on mode
        switch (mode) {
            case 'low':
                this.performanceSettings.enableParticles = false;
                this.performanceSettings.enableTrails = false;
                this.performanceSettings.enableGlow = false;
                this.performanceSettings.maxParticles = 500;
                break;
            case 'medium':
                this.performanceSettings.enableParticles = true;
                this.performanceSettings.enableTrails = true;
                this.performanceSettings.enableGlow = false;
                this.performanceSettings.maxParticles = 1000;
                break;
            case 'high':
                this.performanceSettings.enableParticles = true;
                this.performanceSettings.enableTrails = true;
                this.performanceSettings.enableGlow = true;
                this.performanceSettings.maxParticles = 2000;
                break;
        }
    }

    togglePerformanceSetting(setting) {
        if (setting in this.performanceSettings) {
            this.performanceSettings[setting] = !this.performanceSettings[setting];
            this.applyPerformanceSettings();
        }
    }

    applyPerformanceSettings() {
        this.animationEngine.enableGlow = this.performanceSettings.enableGlow;
        this.animationEngine.enableTrails = this.performanceSettings.enableTrails;
        this.animationEngine.particleLimit = this.performanceSettings.maxParticles;
    }

    // Unified tick speed control (replaces separate tick duration and speed)
    setTickSpeed(speed) {
        this.animationEngine.setTickSpeed(speed);
        console.log(`Tick speed set to: ${speed}x`);
    }

    // FPS control
    setTargetFPS(fps) {
        this.animationEngine.setTargetFPS(fps);
        console.log(`Target FPS set to: ${fps}`);
    }

    // Legacy method support (for backward compatibility)
    setTickDuration(duration) {
        this.animationEngine.setTickDuration(duration);
        console.log(`Tick duration set to: ${duration}ms`);
    }

    // Animation control with proper pause support
    start() {
        if (!this.animationEngine.app) {
            console.warn('Animation engine not ready yet');
            return;
        }

        this.animationEngine.start();

        // Start game update loop
        this.animationEngine.app.ticker.add(() => {
            this.update();
        });

        console.log('Game started');
    }

    stop() {
        this.animationEngine.stop();
        console.log('Game stopped');
    }

    pause() {
        this.animationEngine.pause();
        console.log('Game paused');
    }

    resume() {
        this.animationEngine.resume();
        console.log('Game resumed');
    }

    togglePause() {
        this.animationEngine.togglePause();
    }

    // Legacy method - now uses pause/resume instead of stop/start
    toggleAnimation() {
        this.togglePause();
    }

    resetGame() {
        this.stop();
        this.initializeGame();
        // Auto-restart after reset
        setTimeout(() => {
            this.start();
        }, 200);
        console.log('Game reset');
    }

    clearGame() {
        // End any ongoing drag
        this.endDrag();

        // Clear all attack vectors
        this.clearAllAttackVectors();

        // Clear connection graphics
        this.connectionGraphics.forEach(graphics => {
            if (this.animationEngine.backgroundLayer && graphics.parent) {
                this.animationEngine.backgroundLayer.removeChild(graphics);
                graphics.destroy();
            }
        });
        this.connectionGraphics = [];
        this.starConnections = [];

        // Clean up existing stars
        this.stars.forEach(star => {
            if (star.destroy) {
                star.destroy();
            }
        });
        this.stars = [];

        // Clear transferring ships
        this.transferringShips.forEach(ship => {
            if (ship.destroy) {
                ship.destroy();
            }
        });
        this.transferringShips = [];

        // Clear selections
        this.clearSelection();

        // Clear UI elements (only if uiLayer exists)
        if (this.animationEngine.uiLayer && this.animationEngine.uiLayer.removeChildren) {
            this.animationEngine.uiLayer.removeChildren();
        }
    }

    // Getters for UI integration
    get currentTick() {
        return this.animationEngine.currentTick;
    }

    get tickProgress() {
        return this.animationEngine.tickProgress;
    }

    get surgeProgress() {
        return this.animationEngine.getSurgeProgress();
    }

    get isInStillness() {
        return this.animationEngine.isInStillness();
    }

    get isRunning() {
        return this.animationEngine.isRunning;
    }

    get isPaused() {
        return this.animationEngine.isPaused;
    }

    // Statistics for UI
    getGameStats() {
        const totalShips = this.stars.reduce((sum, star) => sum + (star.ships ? star.ships.length : 0), 0);
        const activeParticles = this.animationEngine.activeParticles ? this.animationEngine.activeParticles.length : 0;
        const fps = this.animationEngine.app?.ticker ? this.animationEngine.app.ticker.FPS.toFixed(1) : '0';

        return {
            stars: this.stars.length,
            totalShips: totalShips,
            activeParticles: activeParticles,
            transferringShips: this.transferringShips.length,
            currentTick: this.currentTick,
            tickProgress: this.tickProgress,
            performanceMode: this.performanceSettings.mode,
            targetFPS: this.animationEngine.targetFPS,
            isPaused: this.isPaused,
            fps: fps
        };
    }

    // Cleanup
    destroy() {
        this.clearGame();
        this.animationEngine.destroy();
    }
}

export { PixiGameManager };
