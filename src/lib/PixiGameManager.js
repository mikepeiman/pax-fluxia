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
        this.transferringShips = [];
        this.activeStars = [];
        this.selectedStar = null;
        this.targetStar = null;

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

        // Initialize the game
        this.initializeGame();

        // Setup input handling
        this.setupInputHandling();
    }

    initializeGame() {
        // Clear existing game objects
        this.clearGame();

        // Generate stars in network pattern
        this.generateStars();

        // Generate initial ships for each star
        this.generateInitialShips();

        console.log(`Game initialized with ${this.stars.length} stars`);
    }

    generateStars() {
        const width = this.animationEngine.width;
        const height = this.animationEngine.height;
        const margin = 150;

        // Generate stars in a distributed pattern
        for (let i = 0; i < this.numStars; i++) {
            const x = margin + Math.random() * (width - margin * 2);
            const y = margin + Math.random() * (height - margin * 2);
            const radius = 50 + Math.random() * 50; // 50-100px as specified
            const type = Math.floor(Math.random() * 6) + 1; // 1-6 for the 6 colors

            // Ensure minimum distance between stars
            let validPosition = true;
            const minDistance = 200;

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
        // Handle keyboard input for game controls
        document.addEventListener('keydown', (event) => {
            this.handleKeyDown(event);
        });

        // Handle star clicks for selection and commands
        this.stars.forEach(star => {
            star.container.on('pointerdown', (event) => {
                this.handleStarClick(star, event);
            });
        });
    }

    handleKeyDown(event) {
        switch (event.code) {
            case 'Space':
                event.preventDefault();
                this.toggleAnimation();
                break;
            case 'KeyR':
                this.resetGame();
                break;
            case 'Escape':
                this.clearSelection();
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

    handleStarClick(star, event) {
        // Implement star selection and attack move logic
        if (!this.selectedStar) {
            // Select this star
            this.selectedStar = star;
            star.setActive(true);
            console.log(`Selected star ${star.id}`);
        } else if (this.selectedStar === star) {
            // Deselect
            this.clearSelection();
        } else {
            // Order attack move from selected star to this star
            this.orderAttackMove(this.selectedStar, star);
            this.clearSelection();
        }
    }

    orderAttackMove(sourceStar, targetStar) {
        if (!sourceStar || !targetStar || sourceStar === targetStar) return;

        console.log(`Ordering attack move from star ${sourceStar.id} to star ${targetStar.id}`);

        // Transfer ships (30% + 3 minimum as specified)
        sourceStar.transferShipsTo(targetStar, 0.3, 3);

        // Create visual connection
        this.createAttackVector(sourceStar, targetStar);
    }

    createAttackVector(sourceStar, targetStar) {
        // Create a visual line showing the attack route
        const graphics = new PIXI.Graphics();
        graphics.lineStyle(3, 0x00ff00, 0.8);
        graphics.moveTo(sourceStar.x, sourceStar.y);
        graphics.lineTo(targetStar.x, targetStar.y);

        // Add arrowhead
        const dx = targetStar.x - sourceStar.x;
        const dy = targetStar.y - sourceStar.y;
        const angle = Math.atan2(dy, dx);
        const arrowSize = 20;

        graphics.lineStyle(3, 0x00ff00, 0.8);
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

        this.animationEngine.uiLayer.addChild(graphics);

        // Remove after a short time
        setTimeout(() => {
            this.animationEngine.uiLayer.removeChild(graphics);
            graphics.destroy();
        }, 2000);
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

    // Tick rate control
    setTickSpeed(speed) {
        this.animationEngine.setTickSpeed(speed);
        console.log(`Tick speed set to: ${speed}x`);
    }

    setTickDuration(duration) {
        this.animationEngine.setTickDuration(duration);
        console.log(`Tick duration set to: ${duration}ms`);
    }

    // Animation control
    start() {
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

    toggleAnimation() {
        if (this.animationEngine.isRunning) {
            this.stop();
        } else {
            this.start();
        }
    }

    resetGame() {
        this.stop();
        this.initializeGame();
        console.log('Game reset');
    }

    clearGame() {
        // Clean up existing stars
        this.stars.forEach(star => star.destroy());
        this.stars = [];

        // Clear transferring ships
        this.transferringShips.forEach(ship => ship.destroy());
        this.transferringShips = [];

        // Clear selections
        this.clearSelection();

        // Clear UI elements
        this.animationEngine.uiLayer.removeChildren();
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

    // Statistics for UI
    getGameStats() {
        const totalShips = this.stars.reduce((sum, star) => sum + star.ships.length, 0);
        const activeParticles = this.animationEngine.activeParticles.length;

        return {
            stars: this.stars.length,
            totalShips: totalShips,
            activeParticles: activeParticles,
            transferringShips: this.transferringShips.length,
            currentTick: this.currentTick,
            tickProgress: this.tickProgress,
            performanceMode: this.performanceSettings.mode,
            fps: this.animationEngine.app.ticker.FPS.toFixed(1)
        };
    }

    // Cleanup
    destroy() {
        this.clearGame();
        this.animationEngine.destroy();
    }
}

export { PixiGameManager };
