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
import { createFleet, type Fleet } from './Fleet';
import { logCombat } from '$lib/utils/CombatLogger';
import { resolveMultiwayCombat } from './CombatRules';

// ============================================================================
// Constants
// ============================================================================

// Removed local constants to ensure we read latest config
// const BASE_TICK_MS = ...

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

import { Delaunay } from 'd3-delaunay';

/**
 * GameEngine - Core game logic
 * Handles game loop, state updates, and rule enforcement
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
    private fleets: Map<string, Fleet> = new Map();
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

    // History
    private statsHistory: import('$lib/types/game.types').GameHistoryEntry[] = [];
    private lastHistoryTick: number = 0;

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
        // Standard 16:9 viewport size
        const width = 1600;
        const height = 900;

        // Use configured hex settings (larger padding per user request)
        // HEX_PADDING should be at least 50 if radius is 25 (diameter 50) + spacing 50
        const hexRadius = GAME_CONFIG.HEX_RADIUS || 60;
        const hexPadding = Math.max(GAME_CONFIG.HEX_PADDING, 60);

        const hexGrid = generateHexGrid(width, height, hexRadius, hexPadding);
        log.sys('GameEngine', `Generated hex grid with ${hexGrid.length} positions (radius: ${hexRadius}, padding: ${hexPadding})`);

        // Calculate how many stars we need (all owned by players)
        const playerIds = Array.from(this.players.keys());
        const starsPerPlayer = GAME_CONFIG.STARS_PER_PLAYER;
        const totalStars = playerIds.length * starsPerPlayer;

        // Select random hex positions with strict spacing
        // Minimum spacing = 2x diameter = 4 * radius = 100
        const minSpacing = 100;
        const starPositions = selectRandomHexPositions(hexGrid, totalStars, minSpacing);
        log.sys('GameEngine', `Selected ${starPositions.length} positions for stars`);

        // Correctly assign all available positions to players round-robin
        // to ensure even distribution and no neutrals.
        let starIndex = 0;
        starPositions.forEach((pos) => {
            const ownerId = playerIds[starIndex % playerIds.length];
            starIndex++;

            // Add random offset for less uniform distribution
            const offsetX = (Math.random() - 0.5) * 20;
            const offsetY = (Math.random() - 0.5) * 20;

            const star = createStar({
                x: pos.x + offsetX,
                y: pos.y + offsetY,
                radius: 25, // Fixed radius as requested ("eliminate size differences")
                productionRate: 1,
                ownerId: ownerId
            }, this.stars.size);
            this.stars.set(star.id, star);
        });

        // Generate territory map (Voronoi)
        this.updateTerritories(width, height);

        // Generate connections between stars using Delaunay Triangulation
        // Pass Infinity to ensure we keep ALL Delaunay edges (guaranteed planar connected graph)
        const starArray = Array.from(this.stars.values()).map(s => ({
            id: s.id,
            x: s.x,
            y: s.y,
            ownerId: s.ownerId
        }));
        this.connections = generateStarConnections(starArray, Infinity);

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

    /**
     * Update territory ownership based on star control
     */
    private updateTerritories(width: number, height: number): void {
        const points: [number, number][] = [];
        const starIds: string[] = [];

        this.stars.forEach(star => {
            points.push([star.x, star.y]);
            starIds.push(star.id);
        });

        if (points.length === 0) return;

        // Calculate Voronoi diagram
        const delaunay = Delaunay.from(points);
        const voronoi = delaunay.voronoi([0, 0, width, height]);

        // Store polygon data in state (simplified)
        // ideally we just send the polygons to the frontend?
        // Actually, we can just send the cell polygons + owner.
        // For efficiency, let's store it on the stars?
        // Or add a new 'territories' field to GameState.
        // For now, let's just make sure star ownership is updated. Only need to recalc if stars move (they don't).
        // BUT ownership changes. The polygons don't change, only their color.

        // We will store the polygons in a map: StarId -> Polygon points string/array
        // This only needs to happen ONCE at init.

        // Wait, 'updateTerritories' implies recalc. But if stars are static, polygons are static.
        // So we can calculate once.

        const polygons: Record<string, number[][]> = {};

        starIds.forEach((id, i) => {
            const cell = voronoi.cellPolygon(i);
            if (cell) {
                polygons[id] = cell; // Array of [x, y]
            }
        });

        this.territoryPolygons = polygons;
    }

    // Store static polygons
    private territoryPolygons: Record<string, number[][]> = {};

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
    /**
     * Set game speed
     */
    setSpeed(newSpeed: GameSpeed): void {
        const wasPaused = this.speed === 0;
        this.speed = newSpeed;

        if (newSpeed === 0) {
            this.clearTickInterval();
        } else {
            // Always reschedule to pick up any config changes (tickRate)
            this.clearTickInterval();
            this.scheduleTick();
        }
    }

    /**
     * Force update config (e.g. from DebugPanel)
     */
    updateConfig(): void {
        if (this.speed > 0) {
            this.clearTickInterval();
            this.scheduleTick();
        }
    }

    /**
     * Schedule the next tick
     */
    private scheduleTick(): void {
        if (this.speed === 0) return;

        const interval = Math.max(GAME_CONFIG.BASE_TICK_MS / this.speed, GAME_CONFIG.MIN_TICK_MS);
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
                const interval = Math.max(GAME_CONFIG.BASE_TICK_MS / this.speed, GAME_CONFIG.MIN_TICK_MS);
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

        // 2. FLOW - Process flow links (launch fleets)
        this.processFlowLinks();

        // 3. FLEETS - Update fleet positions and handle arrivals
        this.updateFleets();

        // 4. REPAIR - All stars repair damaged ships
        this.stars.forEach(star => star.repair(this.tick));

        // 4. STATS - Track peak fleet size
        const humanPlayer = this.players.get(this.humanPlayerId);
        if (humanPlayer && !humanPlayer.isEliminated) {
            const humanShips = this.getPlayerShipCount(this.humanPlayerId);
            this.peakFleetSize = Math.max(this.peakFleetSize, humanShips);
        }

        // 5. WIN CHECK - Check for eliminated players
        this.checkWinCondition();

        // 6. HISTORY - Record stats every 60 ticks (~1 sec at 1x)
        if (this.tick - this.lastHistoryTick >= 60) {
            this.recordHistory();
        }

        // 7. AI - Execute AI moves (placeholder)
        this.executeAI();

        // 8. CALLBACK - Notify listeners
        if (this.onTick) {
            this.onTick(this.getState());
        }
    }

    /**
     * Process flow links - launch fleets (every tick)
     * INSTANT TRAVEL: Ships move and arrive in the same tick.
     */
    private processFlowLinks(): void {
        this.transfers = []; // Clear previous frame's visual transfers
        const arrivals: Fleet[] = [];

        this.stars.forEach(source => {
            if (!source.targetId) return;

            const target = this.stars.get(source.targetId);
            if (!target) return;

            // Calculate flow amount
            const flowAmount = calculateFlowAmount(source.activeShips);
            if (flowAmount === 0 || source.activeShips === 0) return;

            // Remove ships from source
            const shipped = source.removeActiveShips(flowAmount);
            if (shipped === 0) return;

            // Create Fleet object (now just a distinct transfer packet)
            // Distance is used for visual speed calc only? Or irrelevant?
            // User says "Visuals optimized to the tick".
            const connection = this.connections.find(c =>
                (c.sourceId === source.id && c.targetId === target.id) ||
                (c.sourceId === target.id && c.targetId === source.id)
            );
            const dist = connection ? connection.distance : 100;

            const fleetId = `transfer-${this.tick}-${source.id}-${target.id}`;
            const transferPacket = createFleet({
                id: fleetId,
                sourceId: source.id,
                targetId: target.id,
                ownerId: source.ownerId,
                shipCount: shipped,
                totalDistance: dist,
                speed: 0 // Speed is irrelevant for instant logic
            });

            // Add to visual list
            this.transfers.push(transferPacket);

            // Add to logical arrivals
            arrivals.push(transferPacket);
        });

        // Resolve arrivals immediately
        if (arrivals.length > 0) {
            this.handleFleetArrivals(arrivals);
        }
    }

    /**
     * Update all active fleets
     * NO-OP: Fleets are now instant. Kept for signature compatibility if needed, 
     * but logic is moved to processFlowLinks.
     */
    private updateFleets(): void {
        // Instant travel means no "updating" of positions.
    }

    /**
     * Handle fleet arrivals - grouping by target for multi-way combat
     */
    private handleFleetArrivals(arrivedFleets: Fleet[]): void {
        // Group fleets by target
        const arrivalsByTarget = new Map<StarId, Fleet[]>();

        arrivedFleets.forEach(fleet => {
            if (!arrivalsByTarget.has(fleet.targetId)) {
                arrivalsByTarget.set(fleet.targetId, []);
            }
            arrivalsByTarget.get(fleet.targetId)!.push(fleet);
        });

        // Resolve combat for each target
        arrivalsByTarget.forEach((fleets, targetId) => {
            this.resolveMultiwayCombat(targetId, fleets);
        });
    }

    /**
     * Resolve combat where multiple fleets arrive at a star simultaneously
     * Rule: Largest total attacking force wins
     */
    private resolveMultiwayCombat(targetId: StarId, fleets: Fleet[]): void {
        const target = this.stars.get(targetId);
        if (!target) return;

        // Group ships by owner (Defender + All Attackers)
        const forces = new Map<PlayerId, number>();

        // 1. Add Defender
        forces.set(target.ownerId, (forces.get(target.ownerId) || 0) + target.activeShips);

        // 2. Add all Arriving Fleets
        fleets.forEach(fleet => {
            // Ensure ownerId matches exactly (strings)
            const fid = String(fleet.ownerId);
            forces.set(fid, (forces.get(fid) || 0) + fleet.shipCount);
        });

        // 3. Find Largest Force (Winner)
        let winnerId: PlayerId = target.ownerId; // Default to current owner
        let maxForce = -1;

        forces.forEach((count, playerId) => {
            if (count > maxForce) {
                maxForce = count;
                winnerId = playerId;
            }
        });

        // 4. Calculate Resolution
        if (winnerId === target.ownerId) {
            // DEFENDERS HOLD (or Friendly Reinforcement wins)

            // Apply reinforcements
            fleets.forEach(fleet => {
                if (fleet.ownerId === target.ownerId) {
                    target.addActiveShips(fleet.shipCount);
                } else {
                    // Attackers damage the defenders
                    // Simple model: Attackers deal damage, then die.
                    // But we must respect "Largest Force Wins". 
                    // If defenders are largest, they survive. 
                    // How much damage?
                    // logic: damage = Min(Attacker, Defender) * Rate
                    const damage = this.calculateCombatDamage(fleet.shipCount, target.activeShips, true);
                    target.takeDamage(damage);

                    // Attackers failed, return damaged?
                    const survivors = fleet.shipCount - this.calculateCombatDamage(target.activeShips, fleet.shipCount, false);
                    if (survivors > 0) {
                        const source = this.stars.get(fleet.sourceId);
                        if (source) source.addDamagedShips(survivors);
                        // log.combat('GameEngine', `Attack on ${target.id} repelled. ${survivors} returned damaged.`);

                        logCombat({
                            tick: this.tick,
                            starId: targetId,
                            attackers: fleet.shipCount,
                            defenders: target.activeShips,
                            damage: damage,
                            result: 'DEFENSE HOLD',
                            formula: `Dmg = Min(${fleet.shipCount}, ${target.activeShips}) * ${GAME_CONFIG.DAMAGE_RATE.toFixed(2)} * ${GAME_CONFIG.DEFENSE_MULTIPLIER} = ${damage}`
                        });
                    }
                }
            });
        } else {
            // CONQUEST - A new owner takes over
            const oldOwner = target.ownerId;
            target.setOwner(winnerId);
            this.starsCaptured++;

            // Clear order on source if relevant
            if (GAME_CONFIG.CLEAR_ORDER_ON_CAPTURE) {
                fleets.filter(f => f.ownerId === winnerId).forEach(f => {
                    const source = this.stars.get(f.sourceId);
                    if (source && source.targetId === targetId) {
                        source.setTarget(null);
                    }
                });
                log.success('GameEngine', `★ CAPTURED ${target.id} by ${winnerId}!`);
            }

            // Occupy with HALF the attacking force (User Requirement)
            let totalWinnerShips = forces.get(winnerId) || 0;

            // Subtract damage from other forces
            forces.forEach((count, pid) => {
                if (pid !== winnerId) {
                    const damage = Math.floor(count * GAME_CONFIG.DAMAGE_RATE);
                    totalWinnerShips = Math.max(0, totalWinnerShips - damage);
                }
            });

            // Occupy with HALF
            const occupiers = Math.floor(totalWinnerShips * 0.5);

            // Use method instead of assignment
            // We need to set active ships directly. But it's readonly (getter).
            // Star class should have a method to set population?
            // Checking Star.ts... likely 'addActiveShips' or similar but we need to overwrite.
            // If no setter, we can takeDamage until 0 then add.
            target.takeDamage(target.activeShips + target.damagedShips); // Clear all
            target.addActiveShips(occupiers);

            // Calculate total attackers for log
            const totalAttackers = Array.from(forces.entries())
                .filter(([pid]) => pid !== target.ownerId)
                .reduce((sum, [_, count]) => sum + count, 0);

            logCombat({
                tick: this.tick,
                starId: targetId,
                attackers: totalAttackers,
                defenders: forces.get(target.ownerId) || 0,
                damage: 0,
                result: `CAPTURED by ${winnerId}`,
                formula: `Attack(${maxForce}) > Defense -> Occupy(${occupiers})`
            });
        }
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
                log.state('GameEngine', `Player ${player.id} ELIMINATED`);

                // Fast-forward if human died
                if (player.id === this.humanPlayerId) {
                    log.sys('GameEngine', 'Human player eliminated. Fast-forwarding (50x)...');
                    this.setSpeed(50);
                }
            }
        });

        // Check if only one player remains
        const activePlayers = Array.from(this.players.values()).filter(p => !p.isEliminated);
        if (activePlayers.length === 1) {
            // Game over - we have a winner
            const winner = activePlayers[0];
            log.success('GameEngine', `${winner.name} wins!`);
            this.pause();
        } else if (activePlayers.length === 0) {
            // Should not happen, but safe to handle
            log.state('GameEngine', 'Draw - all eliminated');
            this.pause();
        }
    }

    private recordHistory(): void {
        this.lastHistoryTick = this.tick;
        this.statsHistory.push({
            tick: this.tick,
            players: Array.from(this.players.values()).map(p => ({
                id: p.id,
                totalShips: this.getPlayerShipCount(p.id),
                starCount: this.getPlayerStarCount(p.id)
            }))
        });
    }

    // ============================================================================
    // Helpers
    // ============================================================================

    /**
     * Calculate damage with defense multiplier
     */
    private calculateCombatDamage(attack: number, defense: number, isDefending: boolean): number {
        const baseMultiplier = isDefending ? GAME_CONFIG.DEFENSE_MULTIPLIER : 1;
        const effectiveDamage = Math.min(attack, defense) * GAME_CONFIG.DAMAGE_RATE;
        return Math.max(GAME_CONFIG.MIN_DAMAGE, Math.floor(effectiveDamage * baseMultiplier));
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

        // Validate target exists and is different
        if (!this.stars.has(targetId) || sourceId === targetId) return false;

        // Validate stars are connected
        if (!areConnected(sourceId, targetId, this.connections)) {
            log.state('GameEngine', `Link rejected: ${sourceId} → ${targetId} (not connected)`);
            return false;
        }

        // Logic split:
        // 1. We own the source: Immediate Order
        // 2. We don't own source (Enemy): Queued Order (for drag-through)

        if (source.ownerId === this.humanPlayerId) {
            // Immediate
            source.setTarget(targetId);

            // Allow queuing on NEW target too if we keep dragging? No, simple logic.
        } else {
            // Queued: "When I capture Source, attack Target"
            // This enables dragging A (Mine) -> B (Enemy) -> C (Enemy)
            // A->B starts attack.
            // B->C queues order on B.
            source.setQueuedOrder(this.humanPlayerId, targetId);
            log.state('GameEngine', `Order Queued: ${sourceId} → ${targetId} (pending capture)`);
        }

        // Immediate feedback: broadcast state update
        if (this.onTick) {
            this.onTick(this.getState());
        }

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

        // Immediate feedback: broadcast state update
        if (this.onTick) {
            this.onTick(this.getState());
        }

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

        const winner = this.getWinner();

        return {
            tick: this.tick,
            tickProgress: 0, // Calculated by loop
            speed: this.speed,
            isPaused: this.speed === 0,
            stars: Array.from(this.stars.values()).map(s => s.getState()),
            fleets: Array.from(this.fleets.values()).map(f => f.getState()),
            connections: this.connections,
            links: Array.from(this.stars.values()).filter(s => s.targetId).map(s => ({
                id: `link-${s.id}-${s.targetId}`,
                sourceId: s.id,
                targetId: s.targetId!,
                ownerId: s.ownerId
            })),
            players: playerStates,
            winner: winner,
            elapsedMs: performance.now() - this.startTime,
            history: this.statsHistory
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
        this.fleets.clear();
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
