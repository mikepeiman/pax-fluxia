// ============================================================================
// GameEngine - Authoritative game state and tick loop
// ============================================================================

import type {
    GameState,
    GameSpeed,
    GameSettings,
    StarId,
    PlayerId,
    PlayerState,
    EngineConfig,
    StarConnection
} from '$lib/types/game.types';

import { Star, createStar } from './Star';
import { FlowLink, createFlowLink } from './FlowLink';
import { resolveCombat } from './Combat';
import { AI, createAI } from './AI';
import { log } from '$lib/utils/logger';
import {
    generateHexGrid,
    selectRandomHexPositions,
    generateStarConnections,
    areConnected
} from '$lib/utils/hex.utils';
import { GAME_CONFIG, getTickInterval, calculateFlowAmount } from '$lib/config/game.config';

// ============================================================================
// Constants
// ============================================================================

/** Base tick interval at 1x speed - USE GAME_CONFIG.BASE_TICK_MS */
export const BASE_TICK_MS = GAME_CONFIG.BASE_TICK_MS;

/** Minimum tick interval at max speed */
export const MIN_TICK_MS = GAME_CONFIG.MIN_TICK_MS;

/** Player colors palette */
const PLAYER_COLORS = [
    '#4488ff', // Blue (human)
    '#ff4466', // Red
    '#44ff88', // Green
    '#ffcc44', // Yellow
    '#aa66ff', // Purple
    '#ff8844'  // Orange
];

// ============================================================================
// Types
// ============================================================================

interface Player {
    id: PlayerId;
    name: string;
    color: string;
    isAI: boolean;
    isEliminated: boolean;
}

type TickCallback = (state: GameState) => void;
type TickProgressCallback = (progress: number) => void;

// ============================================================================
// GameEngine Class
// ============================================================================

/**
 * GameEngine - The authoritative source of game state
 * 
 * Responsibilities:
 * - Manage tick loop (production → flow → combat → repair → win check)
 * - Maintain star and link state
 * - Track players and elimination
 * - Provide state snapshots for UI
 * 
 * The engine knows nothing about Svelte or PixiJS.
 */
export class GameEngine {
    // Configuration
    private readonly humanPlayerId: PlayerId;
    private readonly settings: GameSettings;

    // State
    private stars: Map<StarId, Star> = new Map();
    private connections: StarConnection[] = [];
    private links: Map<string, FlowLink> = new Map();
    private players: Map<PlayerId, Player> = new Map();
    private aiPlayers: Map<PlayerId, AI> = new Map();

    // Timing
    private tick: number = 0;
    private speed: GameSpeed = 0; // 0 = paused
    private tickIntervalId: ReturnType<typeof setInterval> | null = null;
    private lastTickTime: number = 0;
    private tickStartTime: number = 0;

    // Stats
    private startTime: number = 0;
    private peakFleetSize: number = 0;
    private starsCaptured: number = 0;

    // Callbacks
    private onTick: TickCallback | null = null;
    private onTickProgress: TickProgressCallback | null = null;

    // ============================================================================
    // Constructor
    // ============================================================================

    constructor(config: EngineConfig) {
        this.settings = config.settings;
        this.humanPlayerId = config.humanPlayerId;

        this.initializePlayers();
        this.initializeMap();
        this.initializeAI();

        log.sys('GameEngine', `Initialized with ${this.players.size} players, ${this.stars.size} stars, ${this.aiPlayers.size} AIs`);
    }

    // ============================================================================
    // Initialization
    // ============================================================================

    private initializePlayers(): void {
        const { playerCount, difficulty } = this.settings;

        // Human player is always first
        this.players.set(this.humanPlayerId, {
            id: this.humanPlayerId,
            name: 'You',
            color: PLAYER_COLORS[0],
            isAI: false,
            isEliminated: false
        });

        // AI players
        for (let i = 1; i < playerCount; i++) {
            const id = `ai-${i}`;
            this.players.set(id, {
                id,
                name: `AI ${i}`,
                color: PLAYER_COLORS[i % PLAYER_COLORS.length],
                isAI: true,
                isEliminated: false
            });
        }
    }

    private initializeMap(): void {
        // Generate hex grid for random star positioning
        const hexGrid = generateHexGrid(1000, 800, 80, 60);
        log.sys('GameEngine', `Generated hex grid with ${hexGrid.length} positions`);

        // Calculate how many stars we need
        const playerIds = Array.from(this.players.keys());
        const starsPerPlayer = 3;
        const neutralStars = Math.max(3, playerIds.length * 2);
        const totalStars = playerIds.length * starsPerPlayer + neutralStars;

        // Select random hex positions for stars
        const starPositions = selectRandomHexPositions(hexGrid, totalStars, 100);
        log.sys('GameEngine', `Selected ${starPositions.length} positions for stars`);

        // Assign home stars to each player (first starsPerPlayer for each)
        let posIndex = 0;
        playerIds.forEach((playerId) => {
            for (let i = 0; i < starsPerPlayer && posIndex < starPositions.length; i++) {
                const pos = starPositions[posIndex++];
                const star = createStar({
                    x: pos.x,
                    y: pos.y,
                    radius: 25 + Math.random() * 15,
                    productionRate: 1,
                    ownerId: playerId
                }, this.stars.size);
                this.stars.set(star.id, star);
            }
        });

        // Remaining positions are neutral stars
        while (posIndex < starPositions.length) {
            const pos = starPositions[posIndex++];
            const star = createStar({
                x: pos.x,
                y: pos.y,
                radius: 20 + Math.random() * 10,
                productionRate: 1,
                ownerId: 'neutral'
            }, this.stars.size);
            this.stars.set(star.id, star);
        }

        // Generate connections between stars (200px max distance)
        const starArray = Array.from(this.stars.values()).map(s => ({
            id: s.id,
            x: s.getState().x,
            y: s.getState().y
        }));
        this.connections = generateStarConnections(starArray, 200);

        log.success('GameEngine', `Map initialized with ${this.stars.size} stars and ${this.connections.length} connections`);
    }

    /**
     * Generate Empire map - players start at opposite positions
     */
    private generateEmpireMap(playerIds: PlayerId[]): Array<{
        x: number;
        y: number;
        radius: number;
        productionRate: number;
        ownerId: PlayerId;
    }> {
        const configs: Array<{
            x: number;
            y: number;
            radius: number;
            productionRate: number;
            ownerId: PlayerId;
        }> = [];

        const centerX = 500;
        const centerY = 400;
        const mapRadius = 300;
        const starsPerPlayer = 3;

        playerIds.forEach((playerId, playerIndex) => {
            // Player's sector angle
            const sectorAngle = (playerIndex / playerIds.length) * Math.PI * 2;

            for (let i = 0; i < starsPerPlayer; i++) {
                // Distribute stars in player's sector
                const distance = mapRadius * (0.3 + (i / starsPerPlayer) * 0.7);
                const angleOffset = (i - 1) * 0.3;
                const angle = sectorAngle + angleOffset;

                configs.push({
                    x: centerX + Math.cos(angle) * distance,
                    y: centerY + Math.sin(angle) * distance,
                    radius: 30 + Math.random() * 20,
                    productionRate: 1,
                    ownerId: playerId
                });
            }
        });

        return configs;
    }

    // ============================================================================
    // Tick Loop
    // ============================================================================

    /**
     * Start the game loop
     */
    start(): void {
        if (this.tickIntervalId) return; // Already running

        this.startTime = performance.now();
        this.speed = 1;
        this.scheduleTick();
        this.startProgressLoop();

        log.sys('GameEngine', 'Game started at 1x speed');
    }

    /**
     * Pause the game
     */
    pause(): void {
        this.speed = 0;
        this.clearTickInterval();
    }

    /**
     * Resume the game
     */
    resume(): void {
        if (this.speed === 0) {
            this.speed = 1;
            this.scheduleTick();
        }
    }

    /**
     * Set game speed
     */
    setSpeed(newSpeed: GameSpeed): void {
        const wasPaused = this.speed === 0;
        this.speed = newSpeed;

        if (newSpeed === 0) {
            this.clearTickInterval();
        } else if (wasPaused || this.tickIntervalId) {
            // Reschedule at new speed
            this.clearTickInterval();
            this.scheduleTick();
        }
    }

    /**
     * Schedule the next tick
     */
    private scheduleTick(): void {
        if (this.speed === 0) return;

        const interval = Math.max(BASE_TICK_MS / this.speed, MIN_TICK_MS);
        this.tickStartTime = performance.now();

        this.tickIntervalId = setInterval(() => {
            this.executeTick();
        }, interval);
    }

    /**
     * Clear tick interval
     */
    private clearTickInterval(): void {
        if (this.tickIntervalId) {
            clearInterval(this.tickIntervalId);
            this.tickIntervalId = null;
        }
    }

    /**
     * Start the progress animation loop (60fps)
     */
    private progressLoopId: number | null = null;

    private startProgressLoop(): void {
        const loop = () => {
            if (this.speed > 0 && this.onTickProgress) {
                const elapsed = performance.now() - this.tickStartTime;
                const interval = Math.max(BASE_TICK_MS / this.speed, MIN_TICK_MS);
                const progress = Math.min(elapsed / interval, 1);
                this.onTickProgress(progress);
            }
            this.progressLoopId = requestAnimationFrame(loop);
        };
        this.progressLoopId = requestAnimationFrame(loop);
    }

    /**
     * Execute one game tick
     * Order: Production → Flow → Combat → Repair → Win Check
     */
    private executeTick(): void {
        this.tick++;
        this.tickStartTime = performance.now();

        // 1. PRODUCTION - All stars produce ships
        this.stars.forEach(star => star.produce());

        // 2. FLOW - Process all active flow links
        this.processFlowLinks();

        // 3. REPAIR - All stars repair damaged ships
        this.stars.forEach(star => star.repair());

        // 4. STATS - Track peak fleet size
        const humanPlayer = this.players.get(this.humanPlayerId);
        if (humanPlayer && !humanPlayer.isEliminated) {
            const humanShips = this.getPlayerShipCount(this.humanPlayerId);
            this.peakFleetSize = Math.max(this.peakFleetSize, humanShips);
        }

        // 5. WIN CHECK - Check for eliminated players
        this.checkWinCondition();

        // 6. AI - Execute AI moves (placeholder)
        this.executeAI();

        // 7. CALLBACK - Notify listeners
        if (this.onTick) {
            this.onTick(this.getState());
        }
    }

    /**
     * Process all flow links - transfer ships and resolve combat
     */
    private processFlowLinks(): void {
        // Get active links from stars
        this.stars.forEach(source => {
            if (!source.targetId) return;

            const target = this.stars.get(source.targetId);
            if (!target) return;

            // Calculate flow amount using config (10% instead of 50%)
            const flowAmount = calculateFlowAmount(source.activeShips);
            if (flowAmount === 0 || source.activeShips === 0) return;

            // Remove ships from source
            const shipped = source.removeActiveShips(flowAmount);
            if (shipped === 0) return;

            // Check if friendly or hostile
            if (target.ownerId === source.ownerId) {
                // Friendly transfer
                target.addActiveShips(shipped);
                log.state('GameEngine', `Transferred ${shipped} ships from ${source.id} to ${target.id}`);
            } else {
                // Combat!
                const result = resolveCombat(shipped, target.activeShips, source.ownerId);

                // Apply defender losses
                target.takeDamage(result.defenderLoss);

                if (result.captured && result.newOwnerId) {
                    // CAPTURE SUCCESSFUL
                    target.setOwner(result.newOwnerId);

                    // Surviving attackers move to captured star
                    const attackerSurvivors = shipped - result.attackerLoss;
                    target.addActiveShips(attackerSurvivors);

                    // CRITICAL FIX: Clear the flow order!
                    if (GAME_CONFIG.CLEAR_ORDER_ON_CAPTURE) {
                        source.setTarget(null);
                        log.success('GameEngine',
                            `★ CAPTURED ${target.id}! ${attackerSurvivors} survivors occupy. Order cleared.`);
                    }

                    this.starsCaptured++;
                } else {
                    // Attack failed, survivors return as damaged
                    const survivors = shipped - result.attackerLoss;
                    if (survivors > 0) {
                        source.addDamagedShips(survivors);
                        log.combat('GameEngine',
                            `Attack on ${target.id} repelled. ${survivors} survivors retreating.`);
                    }
                }
            }
        });
    }

    /**
     * Check for eliminated players and game end
     */
    private checkWinCondition(): void {
        this.players.forEach(player => {
            if (player.isEliminated) return;

            const starCount = this.getPlayerStarCount(player.id);
            if (starCount === 0) {
                player.isEliminated = true;
            }
        });

        // Check if only one player remains
        const activePlayers = Array.from(this.players.values()).filter(p => !p.isEliminated);
        if (activePlayers.length === 1) {
            // Game over - we have a winner
            log.success('GameEngine', `${activePlayers[0].name} wins!`);
            this.pause();
        }
    }

    /**
     * Initialize AI for each AI player
     */
    private initializeAI(): void {
        this.players.forEach(player => {
            if (player.isAI) {
                const ai = createAI(player.id, this.settings.difficulty);
                this.aiPlayers.set(player.id, ai);
            }
        });
    }

    /**
     * Execute AI moves
     */
    private executeAI(): void {
        const starsArray = Array.from(this.stars.values()).map(s => s.getState());

        this.aiPlayers.forEach((ai, playerId) => {
            const player = this.players.get(playerId);
            if (!player || player.isEliminated) return;

            const decisions = ai.evaluate(starsArray);

            decisions.forEach(decision => {
                const source = this.stars.get(decision.sourceId);
                if (source && source.ownerId === playerId) {
                    source.setTarget(decision.targetId);
                }
            });
        });
    }

    // ============================================================================
    // Player Commands
    // ============================================================================

    /**
     * Create a flow link from source to target
     */
    createLink(sourceId: StarId, targetId: StarId): boolean {
        const source = this.stars.get(sourceId);
        if (!source) return false;

        // Validate ownership
        if (source.ownerId !== this.humanPlayerId) return false;

        // Validate target exists and is different
        if (!this.stars.has(targetId) || sourceId === targetId) return false;

        // Validate stars are connected
        if (!areConnected(sourceId, targetId, this.connections)) {
            log.state('GameEngine', `Link rejected: ${sourceId} → ${targetId} (not connected)`);
            return false;
        }

        // Set the target (overwrites any existing)
        source.setTarget(targetId);
        return true;
    }

    /**
     * Cancel flow link from a star
     */
    cancelLink(starId: StarId): boolean {
        const star = this.stars.get(starId);
        if (!star) return false;

        // Validate ownership
        if (star.ownerId !== this.humanPlayerId) return false;

        star.setTarget(null);
        return true;
    }

    // ============================================================================
    // Queries
    // ============================================================================

    private getPlayerStarCount(playerId: PlayerId): number {
        let count = 0;
        this.stars.forEach(star => {
            if (star.ownerId === playerId) count++;
        });
        return count;
    }

    private getPlayerShipCount(playerId: PlayerId): number {
        let count = 0;
        this.stars.forEach(star => {
            if (star.ownerId === playerId) {
                count += star.totalShips;
            }
        });
        return count;
    }

    getWinner(): PlayerState | null {
        const activePlayers = Array.from(this.players.values()).filter(p => !p.isEliminated);
        if (activePlayers.length === 1) {
            const winner = activePlayers[0];
            return {
                id: winner.id,
                name: winner.name,
                color: winner.color,
                isAI: winner.isAI,
                isEliminated: false,
                totalShips: this.getPlayerShipCount(winner.id),
                starCount: this.getPlayerStarCount(winner.id)
            };
        }
        return null;
    }

    // ============================================================================
    // State Snapshot
    // ============================================================================

    /**
     * Get complete game state for UI
     */
    getState(): GameState {
        const playerStates: PlayerState[] = Array.from(this.players.values()).map(player => ({
            id: player.id,
            name: player.name,
            color: player.color,
            isAI: player.isAI,
            isEliminated: player.isEliminated,
            totalShips: this.getPlayerShipCount(player.id),
            starCount: this.getPlayerStarCount(player.id)
        }));

        return {
            tick: this.tick,
            tickProgress: 0, // Set by progress loop
            speed: this.speed,
            isPaused: this.speed === 0,
            stars: Array.from(this.stars.values()).map(s => s.getState()),
            connections: this.connections,
            links: [], // Links are derived from star targets
            players: playerStates,
            winner: this.getWinner(),
            elapsedMs: performance.now() - this.startTime
        };
    }

    /**
     * Get game statistics
     */
    getStats() {
        return {
            elapsedMs: performance.now() - this.startTime,
            totalTicks: this.tick,
            peakFleetSize: this.peakFleetSize,
            starsCaptured: this.starsCaptured
        };
    }

    // ============================================================================
    // Callbacks
    // ============================================================================

    /**
     * Set callback for tick events
     */
    setOnTick(callback: TickCallback): void {
        this.onTick = callback;
    }

    /**
     * Set callback for tick progress (for metronome)
     */
    setOnTickProgress(callback: TickProgressCallback): void {
        this.onTickProgress = callback;
    }

    // ============================================================================
    // Cleanup
    // ============================================================================

    /**
     * Destroy the engine and clean up resources
     */
    destroy(): void {
        this.clearTickInterval();
        if (this.progressLoopId) {
            cancelAnimationFrame(this.progressLoopId);
            this.progressLoopId = null;
        }
        this.onTick = null;
        this.onTickProgress = null;
        this.stars.clear();
        this.links.clear();
        this.players.clear();

        log.sys('GameEngine', 'Engine destroyed, resources cleaned up');
    }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a new game engine
 */
export function createEngine(config: EngineConfig): GameEngine {
    return new GameEngine(config);
}
