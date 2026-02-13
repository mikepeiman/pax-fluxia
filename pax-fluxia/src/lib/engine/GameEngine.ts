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
    StarConnection,
    StarType
} from '$lib/types/game.types';

import { Star, createStar } from './Star';
import { AI, createAI } from './AI';
import { log } from '$lib/utils/logger';
import {
    selectRandomHexPositions,
    generateStarConnections,
    areConnected
} from '$lib/utils/hex.utils';
import { GAME_CONFIG, calculateCombatV4, buildEngineConfig } from '$lib/config/game.config';
import { applyConquest, STAR_TYPE_STATS, createEmptyTickEvents, resolveMultiSourceCombat as sharedResolveCombat } from '@pax/common';
import type { ConquestContext, ConquestResult, EngineConfig as SharedEngineConfig, TickEvents } from '@pax/common';
import { combatLog } from '$lib/stores/combatLogStore';
import { HexGrid } from './HexGrid';
import { Delaunay } from 'd3-delaunay';

// ============================================================================
// Constants
// ============================================================================

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
type TickEventsCallback = (events: TickEvents) => void;

// ============================================================================
// GameEngine Class
// ============================================================================

/**
 * GameEngine - Core game logic
 * Handles game loop, state updates, and rule enforcement
 */
export class GameEngine {
    // Configuration
    private readonly humanPlayerId: PlayerId;
    private readonly settings: GameSettings;

    // State
    private stars: Map<StarId, Star> = new Map();
    private connections: StarConnection[] = [];
    private players: Map<PlayerId, Player> = new Map();
    private aiPlayers: Map<PlayerId, AI> = new Map();
    private transfers: any[] = []; // Tracking active transfers

    // Timing
    private tick: number = 0;
    private speed: GameSpeed = 0; // 0 = paused
    private tickIntervalId: ReturnType<typeof setInterval> | null = null;
    private tickStartTime: number = 0;
    private pausedElapsed: number = 0; // How far into tick when paused (ms)

    // Stats
    private startTime: number = 0;
    private peakFleetSize: number = 0;
    private starsCaptured: number = 0;

    // History
    private statsHistory: import('$lib/types/game.types').GameHistoryEntry[] = [];
    private lastHistoryTick: number = 0;

    // Per-tick combat metrics (reset each tick)
    private tickCombatEvents: number = 0;
    private tickConquests: number = 0;

    // Callbacks
    private onTick: TickCallback | null = null;
    private onTickProgress: TickProgressCallback | null = null;
    private onTickEvents: TickEventsCallback | null = null;

    // Territory
    private territoryPolygons: Record<string, number[][]> = {};

    // ============================================================================
    // Constructor
    // ============================================================================

    constructor(config: EngineConfig) {
        this.settings = config.settings;
        this.humanPlayerId = config.humanPlayerId;

        this.initializePlayers();

        // Check mapType for debug vs standard map
        if (this.settings.mapType === 'debug') {
            this.initDebugMap();
        } else if (this.settings.mapType === 'debug-b') {
            this.initDebugMapB();
        } else {
            this.initializeMap();
        }

        this.initializeAI();

        log.sys('GameEngine', `Initialized with ${this.players.size} players, ${this.stars.size} stars, ${this.aiPlayers.size} AIs`);
    }

    // ============================================================================
    // Initialization
    // ============================================================================

    private initializePlayers(): void {
        const { playerCount } = this.settings;

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

    private initializeAI(): void {
        this.players.forEach(player => {
            if (player.isAI) {
                const ai = createAI(player.id, this.settings.difficulty as any);
                this.aiPlayers.set(player.id, ai);
            }
        });
    }

    private initializeMap(): void {
        // Apply user spacing multiplier FIRST â€” scales the entire map
        const spacingMultiplier = this.settings.starSpacing ?? 1.0;
        const scaleFactor = Math.max(1, spacingMultiplier);
        const width = Math.round(1600 * scaleFactor);
        const height = Math.round(900 * scaleFactor);
        let hexRadius = GAME_CONFIG.HEX_RADIUS || 60;

        // Calculate total stars first to determine optimal padding
        const playerIds = Array.from(this.players.keys());
        const starsPerPlayer = GAME_CONFIG.STARS_PER_PLAYER;
        const totalStars = playerIds.length * starsPerPlayer;

        // Dynamic padding: reduce for large star counts, scale with map size
        const basePaddingX = totalStars > 50 ? 80 : totalStars > 20 ? 120 : 150;
        const basePaddingY = totalStars > 50 ? 60 : totalStars > 20 ? 80 : 100;
        const paddingX = Math.round(basePaddingX * scaleFactor);
        const paddingY = Math.round(basePaddingY * scaleFactor);

        // Adaptive hex radius: shrink grid cell size to ensure enough positions
        // Each hex occupies ~(1.5r Ã— sqrt(3)r) area; we need at least 3x positions for spacing freedom
        const gridArea = (width - paddingX * 2) * (height - paddingY * 2);
        const neededPositions = totalStars * 3; // 3x for physics spacing margin
        const maxHexArea = gridArea / neededPositions;
        const maxHexRadius = Math.sqrt(maxHexArea / (1.5 * Math.sqrt(3)));
        hexRadius = Math.max(20, Math.min(hexRadius, Math.floor(maxHexRadius)));

        const grid = new HexGrid({
            width: width - (paddingX * 2),
            height: height - (paddingY * 2),
            radius: hexRadius,
            offset: 0
        });

        const offsetX = paddingX;
        const offsetY = paddingY;
        const rawHexes = grid.generate();
        const hexes = rawHexes.map(h => ({
            x: h.x + offsetX,
            y: h.y + offsetY,
            q: 0, r: 0
        }));

        log.sys('GameEngine', `Hex grid: radius=${hexRadius}, ${hexes.length} positions for ${totalStars} requested stars (map: ${width}x${height}, spacing: ${spacingMultiplier}x)`);

        // Physics-aware spacing: stars must not overlap each other's orbit layers
        // Formula: minSpacing = (starRadius * 2) + (orbitLayerWidth * MAX_ORBIT_LAYERS * 2) + buffer
        const STAR_RADIUS = 20;  // Default star radius from Star.ts
        const SHIP_BASE_SIZE = 4;
        const RING_SPACING = SHIP_BASE_SIZE * 1.4; // Matches render.utils.ts
        const MAX_ORBIT_LAYERS = 5;  // Max visual orbit layers (R-38)
        const SPACING_BUFFER = 20;  // Adjustable gap between orbit envelopes
        const physicsMinSpacing = (STAR_RADIUS * 2) + (RING_SPACING * MAX_ORBIT_LAYERS * 2) + SPACING_BUFFER;

        // Apply spacing multiplier to physics minimum
        const minSpacing = physicsMinSpacing * spacingMultiplier;

        log.sys('GameEngine', `Star spacing: ${minSpacing.toFixed(0)}px (physics min: ${physicsMinSpacing.toFixed(0)}, multiplier: ${spacingMultiplier})`);

        // Pass physicsMinSpacing as absolute floor â€” spacing should never go below what physics requires
        const starPositions = selectRandomHexPositions(hexes, totalStars, minSpacing, physicsMinSpacing);

        log.sys('GameEngine', `Selected ${starPositions.length} positions for stars`);

        let starsAssigned = 0;
        starPositions.forEach((pos) => {
            const ownerId = playerIds[starsAssigned % playerIds.length];
            const isCapital = starsAssigned < playerIds.length;

            // Determine star type (color semantics)
            let starType: StarType = 'grey';
            if (isCapital) {
                // Capital assignment
                starType = 'grey';
            } else {
                // Guaranteed even distribution: round-robin across all 6 types
                const types: StarType[] = ['grey', 'yellow', 'red', 'green', 'purple', 'blue'];
                const nonCapitalIndex = starsAssigned - playerIds.length;
                starType = types[nonCapitalIndex % types.length];
            }

            starsAssigned++;

            const star = createStar({
                x: pos.x,
                y: pos.y,
                radius: 25,
                productionRate: 1,
                ownerId: ownerId,
                starType: starType
            }, this.stars.size);
            // Add starting ships
            star.addActiveShips(GAME_CONFIG.STARTING_SHIPS);
            this.stars.set(star.id, star);
        });

        this.updateTerritories(width, height);

        const starArray = Array.from(this.stars.values()).map(s => ({
            id: s.id,
            x: s.x,
            y: s.y,
            ownerId: s.ownerId
        }));

        this.connections = generateStarConnections(
            starArray,
            Infinity,
            GAME_CONFIG.MIN_LINKS_PER_STAR,
            GAME_CONFIG.MAX_LINKS_PER_STAR
        );
        log.success('GameEngine', `Map initialized with ${this.stars.size} stars and ${this.connections.length} connections (links: ${GAME_CONFIG.MIN_LINKS_PER_STAR}-${GAME_CONFIG.MAX_LINKS_PER_STAR}/star)`);
    }

    /**
     * Initialize DEBUG MAP - 4 stars in a fixed configuration for testing combat
     * Layout: Triangle (Aâ†”Bâ†”Câ†”A) + dead-end (Dâ†’A only)
     * All stars start with 100 ships, owned by neutral except A (human) and B (AI)
     */
    private initDebugMap(): void {
        // Fixed positions for debug map
        const centerX = 800;
        const centerY = 450;
        const spread = 250;

        // Star A: Human homeworld (top)
        const starA = createStar({
            x: centerX,
            y: centerY - spread,
            radius: 25,
            productionRate: 1,
            ownerId: this.humanPlayerId,
            starType: 'green',
        }, 1);
        starA.addActiveShips(GAME_CONFIG.STARTING_SHIPS);
        this.stars.set(starA.id, starA);

        // Star B: AI homeworld (bottom-left)
        const aiPlayer = Array.from(this.players.values()).find(p => p.isAI);
        const aiId = aiPlayer ? aiPlayer.id as PlayerId : 'ai-1' as PlayerId;
        const starB = createStar({
            x: centerX - spread,
            y: centerY + spread * 0.6,
            radius: 25,
            productionRate: 1,
            ownerId: aiId,
            starType: 'red',
        }, 2);
        starB.addActiveShips(GAME_CONFIG.STARTING_SHIPS);
        this.stars.set(starB.id, starB);

        // Star C: Neutral (bottom-right)
        const starC = createStar({
            x: centerX + spread,
            y: centerY + spread * 0.6,
            radius: 25,
            productionRate: 1,
            ownerId: 'neutral' as PlayerId,
            starType: 'yellow',
        }, 3);
        starC.addActiveShips(GAME_CONFIG.STARTING_SHIPS);
        this.stars.set(starC.id, starC);

        // Star D: Dead-end connected only to A (far top-right)
        const starD = createStar({
            x: centerX + spread * 1.2,
            y: centerY - spread * 0.8,
            radius: 25,
            productionRate: 1,
            ownerId: 'neutral' as PlayerId,
            starType: 'blue',
        }, 4);
        starD.addActiveShips(GAME_CONFIG.STARTING_SHIPS);
        this.stars.set(starD.id, starD);

        // Define connections: Triangle Aâ†”Bâ†”Câ†”A + dead-end Dâ†”A
        // Calculate distances for each connection
        const dist = (id1: string, id2: string) => {
            const s1 = this.stars.get(id1 as StarId)!;
            const s2 = this.stars.get(id2 as StarId)!;
            return Math.sqrt((s1.x - s2.x) ** 2 + (s1.y - s2.y) ** 2);
        };

        this.connections = [
            { sourceId: starA.id, targetId: starB.id, distance: dist(starA.id, starB.id) },
            { sourceId: starB.id, targetId: starA.id, distance: dist(starB.id, starA.id) },
            { sourceId: starB.id, targetId: starC.id, distance: dist(starB.id, starC.id) },
            { sourceId: starC.id, targetId: starB.id, distance: dist(starC.id, starB.id) },
            { sourceId: starC.id, targetId: starA.id, distance: dist(starC.id, starA.id) },
            { sourceId: starA.id, targetId: starC.id, distance: dist(starA.id, starC.id) },
            { sourceId: starA.id, targetId: starD.id, distance: dist(starA.id, starD.id) },
            { sourceId: starD.id, targetId: starA.id, distance: dist(starD.id, starA.id) },
        ];

        log.success('GameEngine', `DEBUG MAP initialized: 4 stars (A=Human, B=AI, C=Neutral, D=Dead-end)`);
    }

    /**
     * Debug Map B: Conquest Tuning Chain
     * 6 stars in a chain designed to test all conquest scenarios:
     * A(Human,60) → B(AI,10) easy conquest
     * A → F(Neutral,0) empty conquest
     * B → C(AI,10) → D(AI,40) → E(AI,20) chain with escape routes
     */
    private initDebugMapB(): void {
        const centerX = 800;
        const centerY = 450;
        const spacing = 200;

        const aiPlayer = Array.from(this.players.values()).find(p => p.isAI);
        const aiId = aiPlayer ? aiPlayer.id as PlayerId : 'ai-1' as PlayerId;

        // Star A: Human homeworld (left) — strong attacker
        const starA = createStar({
            x: centerX - spacing * 1.5,
            y: centerY,
            radius: 25,
            productionRate: 1,
            ownerId: this.humanPlayerId,
            starType: 'green',
        }, 1);
        starA.addActiveShips(60);
        this.stars.set(starA.id, starA);

        // Star B: AI — weak, easy conquest target
        const starB = createStar({
            x: centerX - spacing * 0.3,
            y: centerY - spacing * 0.5,
            radius: 25,
            productionRate: 1,
            ownerId: aiId,
            starType: 'red',
        }, 2);
        starB.addActiveShips(10);
        this.stars.set(starB.id, starB);

        // Star C: AI — connected to B & D, tests scatter
        const starC = createStar({
            x: centerX + spacing * 0.5,
            y: centerY - spacing * 0.3,
            radius: 25,
            productionRate: 1,
            ownerId: aiId,
            starType: 'yellow',
        }, 3);
        starC.addActiveShips(10);
        this.stars.set(starC.id, starC);

        // Star D: AI — strong defender with escape route to E
        const starD = createStar({
            x: centerX + spacing * 1.3,
            y: centerY + spacing * 0.2,
            radius: 25,
            productionRate: 1,
            ownerId: aiId,
            starType: 'purple',
        }, 4);
        starD.addActiveShips(40);
        this.stars.set(starD.id, starD);

        // Star E: AI — retreat target for D
        const starE = createStar({
            x: centerX + spacing * 2.0,
            y: centerY + spacing * 0.5,
            radius: 25,
            productionRate: 1,
            ownerId: aiId,
            starType: 'blue',
        }, 5);
        starE.addActiveShips(20);
        this.stars.set(starE.id, starE);

        // Star F: Neutral — empty, undefended conquest
        const starF = createStar({
            x: centerX - spacing * 1.0,
            y: centerY + spacing * 0.8,
            radius: 25,
            productionRate: 1,
            ownerId: 'neutral' as PlayerId,
            starType: 'grey',
        }, 6);
        starF.addActiveShips(0);
        this.stars.set(starF.id, starF);

        // Connections: Chain A↔B↔C↔D↔E + branch A↔F
        const dist = (id1: string, id2: string) => {
            const s1 = this.stars.get(id1 as StarId)!;
            const s2 = this.stars.get(id2 as StarId)!;
            return Math.sqrt((s1.x - s2.x) ** 2 + (s1.y - s2.y) ** 2);
        };

        const link = (s1: { id: string }, s2: { id: string }) => [
            { sourceId: s1.id, targetId: s2.id, distance: dist(s1.id, s2.id) },
            { sourceId: s2.id, targetId: s1.id, distance: dist(s2.id, s1.id) },
        ];

        this.connections = [
            ...link(starA, starB),
            ...link(starB, starC),
            ...link(starC, starD),
            ...link(starD, starE),
            ...link(starA, starF),
        ];

        log.success('GameEngine', `DEBUG MAP B initialized: 6 stars (A=Human60, B=AI10, C=AI10, D=AI40, E=AI20, F=Neutral0)`);
    }

    private updateTerritories(width: number, height: number): void {
        const points: [number, number][] = [];
        const starIds: string[] = [];

        this.stars.forEach(star => {
            points.push([star.x, star.y]);
            starIds.push(star.id);
        });

        if (points.length === 0) return;

        const delaunay = Delaunay.from(points);
        const voronoi = delaunay.voronoi([0, 0, width, height]);
        const polygons: Record<string, number[][]> = {};

        starIds.forEach((id, i) => {
            const cell = voronoi.cellPolygon(i);
            if (cell) {
                polygons[id] = cell;
            }
        });

        this.territoryPolygons = polygons;
    }

    // ============================================================================
    // Tick Loop
    // ============================================================================

    start(): void {
        if (this.tickIntervalId) return;
        this.startTime = performance.now();
        this.speed = 1;
        this.scheduleTick();
        this.startProgressLoop();
        log.sys('GameEngine', 'Game started at 1x speed');
    }

    pause(): void {
        // Save how far into the current tick we are
        const tickInterval = Math.max(GAME_CONFIG.BASE_TICK_MS / Math.max(this.speed, 1), GAME_CONFIG.MIN_TICK_MS);
        this.pausedElapsed = Math.min(performance.now() - this.tickStartTime, tickInterval);
        this.speed = 0;
        this.clearTickInterval();
    }

    resume(): void {
        if (this.speed === 0) {
            this.speed = 1;
            // Restore tickStartTime so progress continues from where we paused
            this.tickStartTime = performance.now() - this.pausedElapsed;
            // Calculate remaining time until next tick should fire
            const fullInterval = Math.max(GAME_CONFIG.BASE_TICK_MS / this.speed, GAME_CONFIG.MIN_TICK_MS);
            const remaining = Math.max(0, fullInterval - this.pausedElapsed);
            this.pausedElapsed = 0;
            // Use setTimeout for the remaining time, then switch to regular setInterval
            this.clearTickInterval();
            this.tickIntervalId = setTimeout(() => {
                this.executeTick();
                // Now start regular interval for subsequent ticks
                this.tickIntervalId = null;
                this.scheduleTick();
            }, remaining) as unknown as ReturnType<typeof setInterval>;
        }
    }

    setSpeed(newSpeed: GameSpeed): void {
        this.speed = newSpeed;
        if (newSpeed === 0) {
            this.clearTickInterval();
        } else {
            this.clearTickInterval();
            this.scheduleTick();
        }
    }

    updateConfig(): void {
        if (this.speed > 0) {
            this.clearTickInterval();
            this.scheduleTick();
        }
    }

    private scheduleTick(): void {
        if (this.speed === 0) return;
        const interval = Math.max(GAME_CONFIG.BASE_TICK_MS / this.speed, GAME_CONFIG.MIN_TICK_MS);
        // Don't reset tickStartTime here â€” it's managed by resume() and executeTick()
        if (this.tickStartTime === 0) this.tickStartTime = performance.now();
        this.tickIntervalId = setInterval(() => {
            this.executeTick();
        }, interval);
    }

    private clearTickInterval(): void {
        if (this.tickIntervalId) {
            clearInterval(this.tickIntervalId);
            this.tickIntervalId = null;
        }
    }

    private progressLoopId: number | null = null;
    private startProgressLoop(): void {
        const loop = () => {
            if (this.speed > 0 && this.onTickProgress) {
                const elapsed = performance.now() - this.tickStartTime;
                // Use BASE_TICK_MS so tickProgress fills the full tick period (surge pulse aligns)
                const animSpeed = Math.max(GAME_CONFIG.BASE_TICK_MS / this.speed, GAME_CONFIG.MIN_TICK_MS);
                const progress = Math.min(elapsed / animSpeed, 1);
                this.onTickProgress(progress);
            }
            this.progressLoopId = requestAnimationFrame(loop);
        };
        this.progressLoopId = requestAnimationFrame(loop);
    }

    private executeTick(): void {
        this.tick++;
        this.tickStartTime = performance.now();

        // Collect typed events for animations (POST_MORTEMS.md: event-driven, not diff-based)
        const events = createEmptyTickEvents();

        // Reset per-tick combat metrics
        this.tickCombatEvents = 0;
        this.tickConquests = 0;

        // 1. PRODUCTION
        this.stars.forEach(star => star.produce());

        // 2. ORDERS â€” transfers + combat (collects events)
        this.executeTransferOrders(events);

        // 3. REPAIR
        this.stars.forEach(star => star.repair(this.tick));

        // 4. STATS
        const humanPlayer = this.players.get(this.humanPlayerId);
        if (humanPlayer && !humanPlayer.isEliminated) {
            const humanShips = this.getPlayerShipCount(this.humanPlayerId);
            this.peakFleetSize = Math.max(this.peakFleetSize, humanShips);
        }

        // 5. WIN CHECK
        this.checkWinCondition();

        // 6. HISTORY (Record EVERY tick for detailed charts)
        this.recordHistory();

        // 7. AI
        this.executeAI();

        // 8. CALLBACKS
        if (this.onTick) {
            this.onTick(this.getState());
        }
        if (this.onTickEvents) {
            this.onTickEvents(events);
        }
    }

    private executeTransferOrders(events: TickEvents): void {
        this.transfers = [];
        const attackOrders: { source: Star, target: Star }[] = [];
        const reinforcements: { source: Star, target: Star, shipped: number }[] = [];

        this.stars.forEach(source => {
            if (!source.targetId) return;

            const target = this.stars.get(source.targetId);
            if (!target) return;

            // ================================================================
            // KEY DISTINCTION: ATTACKS vs REINFORCEMENTS
            // ================================================================
            const isAttack = source.ownerId !== target.ownerId;

            if (isAttack) {
                // ATTACK: Combat initiated - ships remain at source during combat
                // Combat will use source.activeShips directly
                attackOrders.push({ source, target });
            } else {
                // REINFORCEMENT: Ships physically transfer to friendly star
                // Transfer rate: global base rate Ã— star-type speed multiplier
                // (Blue stars have speed=2, so they transfer at 2Ã— the global rate)
                const speedMultiplier = STAR_TYPE_STATS[source.starType as StarType]?.speed ?? 1;
                const effectiveRate = (GAME_CONFIG.TRANSFER_RATE || 0.1) * speedMultiplier;
                const transferAmount = Math.max(
                    GAME_CONFIG.MIN_SHIPS_PER_TRANSFER,
                    Math.ceil(source.activeShips * effectiveRate)
                );

                // Orders persist until explicitly cancelled â€” zero ships does NOT auto-cancel.
                // Ships will flow again when reinforcements arrive.
                const shipped = source.removeActiveShips(transferAmount);
                if (shipped > 0) {
                    reinforcements.push({ source, target, shipped });

                    // Emit transfer event for animations (event-driven, not diff-based)
                    events.transfers.push({
                        sourceId: source.id,
                        targetId: target.id,
                        ownerId: source.ownerId,
                        shipCount: shipped,
                    });
                }
            }
        });

        // Process REINFORCEMENTS: Add ships to friendly destination
        reinforcements.forEach(({ target, shipped }) => {
            target.addActiveShips(shipped);
        });

        // ================================================================
        // MULTI-STAR ATTACK AGGREGATION
        // Group all attacks by target, then process each target once
        // This ensures conquest is evaluated against TOTAL attacking force
        // ================================================================
        const attacksByTarget = new Map<StarId, Star[]>();
        attackOrders.forEach(({ source, target }) => {
            const targetId = target.id;
            if (!attacksByTarget.has(targetId)) {
                attacksByTarget.set(targetId, []);
            }
            attacksByTarget.get(targetId)!.push(source);
        });

        // Process each target with all its attackers
        attacksByTarget.forEach((attackers, targetId) => {
            const target = this.stars.get(targetId);
            if (target) {
                this.resolveMultiSourceCombat(attackers, target, events);
            }
        });
    }

    /**
     * Multi-Source Combat Resolution â€” delegates to shared function from @pax/common
     * Client adds logging, combat log entries, and TickEvents emission.
     */
    private resolveMultiSourceCombat(attackers: Star[], defender: Star, events: TickEvents): void {
        // Build conquest context for neighbor lookups
        const ctx: ConquestContext = {
            getNeighborIds: (starId: string) => {
                const neighbors: string[] = [];
                this.connections.forEach(conn => {
                    if (conn.sourceId === starId) neighbors.push(conn.targetId);
                    else if (conn.targetId === starId) neighbors.push(conn.sourceId);
                });
                return neighbors;
            },
            getStar: (id: string) => this.stars.get(id) as any,
        };

        // Build config from GAME_CONFIG
        const cfg = buildEngineConfig();

        // Delegate to shared standalone function
        const result = sharedResolveCombat(
            attackers as any[],
            defender as any,
            ctx,
            cfg,
            this.tick
        );

        if (!result.occurred) return;

        // Increment combat event counter for stats
        this.tickCombatEvents++;

        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // CLIENT-ONLY: Combat telemetry logging
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        if (result.defenderForce > 0) {
            const primaryAttacker = attackers.find(a => a.activeShips > 0) ?? attackers[0];
            const totalKillsOnAttacker = result.attackerDamage.reduce((s: number, a: { kills: number }) => s + a.kills, 0);
            const totalDisabledOnAttacker = result.attackerDamage.reduce((s: number, a: { disabled: number }) => s + a.disabled, 0);

            // Compute debug formula breakdown
            const _dmgPerShip = GAME_CONFIG.DAMAGE_PER_SHIP;
            const _aggAdv = GAME_CONFIG.AGGRESSOR_ADVANTAGE;
            const _forceEffect = GAME_CONFIG.FORCE_RATIO_EFFECT;
            const _lethality = GAME_CONFIG.LETHALITY;
            const _baseOutputAtk = result.effectiveAttackForce * _dmgPerShip;
            const _baseOutputDef = result.defenderForce * _dmgPerShip;
            const _aggressorMultAtk = 1.0 * _aggAdv; // attackers always attacking
            const _aggressorMultDef = result.defenderIsAttacking ? _aggAdv : 1.0;
            const _outputAtk = _baseOutputAtk * _aggressorMultAtk;
            const _outputDef = _baseOutputDef * _aggressorMultDef;
            const _ratio = Math.max(result.effectiveAttackForce, result.defenderForce) / Math.min(result.effectiveAttackForce, result.defenderForce);
            const _forceBonus = 1 + (Math.log2(_ratio) * _forceEffect);
            const _atkIsLarger = result.effectiveAttackForce > result.defenderForce;
            const _forceMod_dmgToDef = _atkIsLarger ? _forceBonus : (1 / _forceBonus);
            const _forceMod_dmgToAtk = _atkIsLarger ? (1 / _forceBonus) : _forceBonus;
            const _rawDmgToDef = _outputAtk * _forceMod_dmgToDef;
            const _rawDmgToAtk = _outputDef * _forceMod_dmgToAtk;
            const _minDmg = 1;
            const _finalDmgToDef = Math.max(_minDmg, _rawDmgToDef);
            const _finalDmgToAtk = Math.max(_minDmg, _rawDmgToAtk);

            log.combatBattle(
                this.tick,
                { id: `${attackers.length} stars`, ships: result.totalAttackShips, starType: primaryAttacker.starType, ownerId: primaryAttacker.ownerId, isAttacking: true },
                { id: defender.id, ships: result.defenderForce, starType: defender.starType, ownerId: defender.ownerId, isAttacking: result.defenderIsAttacking },
                { kills: result.defenderKills, disabled: result.defenderDisabled },
                { kills: totalKillsOnAttacker, disabled: totalDisabledOnAttacker },
                {
                    aggressor: _aggAdv,
                    damage: _dmgPerShip,
                    lethality: _lethality,
                    forceRatio: _forceEffect,
                    repairRate: GAME_CONFIG.REPAIR_RATE
                },
                {
                    baseOutputAtk: _baseOutputAtk,
                    baseOutputDef: _baseOutputDef,
                    aggressorMultAtk: _aggressorMultAtk,
                    aggressorMultDef: _aggressorMultDef,
                    outputAtk: _outputAtk,
                    outputDef: _outputDef,
                    forceRatio: _ratio,
                    forceBonus: _forceBonus,
                    forceMod_dmgToDefender: _forceMod_dmgToDef,
                    forceMod_dmgToAttacker: _forceMod_dmgToAtk,
                    rawDmgToDefender: _rawDmgToDef,
                    rawDmgToAttacker: _rawDmgToAtk,
                    minDamage: _minDmg,
                    finalDmgToDefender: _finalDmgToDef,
                    finalDmgToAttacker: _finalDmgToAtk
                }
            );

            // Push to UI Combat Log
            combatLog.add({
                tick: this.tick,
                attacker: {
                    id: attackers.length > 1 ? `${attackers.length} stars` : primaryAttacker.id,
                    ships: Math.floor(result.totalAttackShips),
                    starType: primaryAttacker.starType,
                    ownerId: primaryAttacker.ownerId,
                    kills: Math.floor(totalKillsOnAttacker),
                    disabled: Math.floor(totalDisabledOnAttacker)
                },
                defender: {
                    id: defender.id,
                    ships: Math.floor(result.defenderForce),
                    starType: defender.starType,
                    ownerId: defender.ownerId,
                    kills: Math.floor(result.defenderKills),
                    disabled: Math.floor(result.defenderDisabled)
                },
                settings: {
                    aggressor: GAME_CONFIG.AGGRESSOR_ADVANTAGE,
                    damage: GAME_CONFIG.DAMAGE_PER_SHIP,
                    lethality: GAME_CONFIG.LETHALITY,
                    forceRatio: GAME_CONFIG.FORCE_RATIO_EFFECT,
                    repairRate: GAME_CONFIG.REPAIR_RATE
                },
                result: defender.activeShips > 0 ? 'DEFENSE' : 'FALLING'
            });

            // Emit CombatEvent for unified event pipeline
            events.combats.push({
                tick: this.tick,
                attackerIds: result.attackerDamage.map((a: { starId: string }) => a.starId),
                attackerOwnerId: primaryAttacker.ownerId,
                defenderId: defender.id,
                defenderOwnerId: defender.ownerId,
                totalAttackForce: result.totalAttackShips,
                defenderForce: result.defenderForce,
                killsOnDefender: Math.floor(result.defenderKills),
                disabledOnDefender: Math.floor(result.defenderDisabled),
                killsOnAttacker: Math.floor(totalKillsOnAttacker),
                disabledOnAttacker: Math.floor(totalDisabledOnAttacker),
                conquered: result.conquest !== null,
            });
        }

        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // CONQUEST: handled by shared function, client adds logging/events
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        if (result.conquest && result.victorStarId) {
            const victor = this.stars.get(result.victorStarId);
            if (victor) {
                this.handleConquestClientEffects(victor, defender, result.conquest, events);
            }
        }
    }

    // NOTE: resolveCombat() and executeConquest() removed - dead code.
    // All combat goes through resolveMultiSourceCombat() (single attackers are arrays of one).
    // Conquest is handled by the shared function + handleConquestClientEffects().

    private handleConquestClientEffects(attacker: Star, defender: Star, conquestResult: ConquestResult, events: TickEvents): void {
        const previousOwner = conquestResult.previousOwner;

        // Flat, readable conquest log via log.conquest()
        log.conquest(this.tick, {
            starId: defender.id,
            previousOwner,
            newOwner: attacker.ownerId,
            shipsCaptured: conquestResult.shipsCaptured,
            shipsEscaped: conquestResult.shipsEscaped,
            shipsDestroyed: conquestResult.shipsDestroyed,
            defenderTotal: conquestResult.defenderTotalAtConquest,
            attackerShips: Math.floor(attacker.activeShips + (conquestResult.shipsCaptured ?? 0)),
            attackerPostShips: Math.floor(attacker.activeShips),
            defenderPostShips: Math.floor(defender.activeShips),
            retreatTargetId: conquestResult.retreatTargetId,
            scatterTargetIds: conquestResult.scatterTargetIds,
            scatterShipCounts: conquestResult.scatterShipCounts,
        });

        if (conquestResult.retreatTargetId) {
            const retreatTarget = this.stars.get(conquestResult.retreatTargetId);
            if (retreatTarget) {
                log.success('Retreat', `${conquestResult.shipsEscaped} ships retreat from ${defender.id} to ${retreatTarget.id}`);
            }
        } else if (conquestResult.scatterTargetIds && conquestResult.scatterTargetIds.length > 0) {
            log.success('Scatter', `${conquestResult.shipsEscaped} ships scatter from ${defender.id} to ${conquestResult.scatterTargetIds.length} neighbors`);
            if (conquestResult.shipsDestroyed > 0) {
                log.data('Scatter', `${conquestResult.shipsDestroyed} ships destroyed during scatter`);
            }
        }

        const captureInfo = conquestResult.retreatTargetId ? `(retreat: ${conquestResult.shipsEscaped} escaped)` :
            (conquestResult.scatterTargetIds?.length ?? 0) > 0 ? `(scatter: ${conquestResult.shipsEscaped} escaped, ${conquestResult.shipsDestroyed} destroyed)` :
                '(no escape)';
        log.success('Conquest', `${attacker.id} conquered ${defender.id} - captured ${conquestResult.shipsCaptured}/${conquestResult.defenderTotalAtConquest} ${captureInfo}`);

        this.tickConquests++;
        this.starsCaptured++;

        // Combat log entry
        combatLog.add({
            tick: this.tick,
            attacker: {
                id: attacker.id,
                ships: Math.floor(attacker.activeShips),
                starType: attacker.starType,
                ownerId: attacker.ownerId,
                kills: Math.floor(conquestResult.shipsDestroyed),
                disabled: 0
            },
            defender: {
                id: defender.id,
                ships: Math.floor(conquestResult.shipsCaptured),
                starType: defender.starType,
                ownerId: previousOwner,
                kills: 0,
                disabled: Math.floor(conquestResult.shipsEscaped)
            },
            settings: {
                aggressor: GAME_CONFIG.AGGRESSOR_ADVANTAGE,
                damage: GAME_CONFIG.DAMAGE_PER_SHIP,
                lethality: GAME_CONFIG.LETHALITY,
                forceRatio: GAME_CONFIG.FORCE_RATIO_EFFECT,
                repairRate: GAME_CONFIG.REPAIR_RATE
            },
            result: 'CONQUERED',
            captured: Math.floor(conquestResult.shipsCaptured),
            escaped: Math.floor(conquestResult.shipsEscaped),
            destroyed: Math.floor(conquestResult.shipsDestroyed),
            defenderTotalAtConquest: conquestResult.defenderTotalAtConquest
        });

        // Emit ConquestEvent for unified event pipeline
        events.conquests.push({
            tick: this.tick,
            starId: defender.id,
            attackerStarId: attacker.id,
            previousOwner,
            newOwner: attacker.ownerId,
            shipsCaptured: conquestResult.shipsCaptured,
            shipsEscaped: conquestResult.shipsEscaped,
            shipsDestroyed: conquestResult.shipsDestroyed,
            shipsTransferred: conquestResult.shipsTransferred,
            retreatTargetId: conquestResult.retreatTargetId,
            scatterTargetIds: conquestResult.scatterTargetIds,
            scatterShipCounts: conquestResult.scatterShipCounts,
        });

        // Cancel orders targeting this conquered star from all other players
        const conqueredId = defender.id;
        const newOwner = defender.ownerId;
        this.stars.forEach(star => {
            if (star.targetId === conqueredId && star.ownerId !== newOwner) {
                log.state('OrderCancel', `Cancelling ${star.id}'s order to ${conqueredId} (conquered by another player)`);
                star.setTarget(null);
            }
            if (star.queuedOrderTargetId === conqueredId && star.ownerId !== newOwner) {
                log.state('OrderCancel', `Cancelling ${star.id}'s queued order to ${conqueredId}`);
                star.queuedOrderTargetId = null;
            }
        });
    }

    private executeAI(): void {
        this.aiPlayers.forEach((ai, playerId) => {
            // Get all stars
            const allStars = this.getState().stars;
            // Decide
            const decisions = ai.evaluate(allStars, this.connections);

            decisions.forEach(decision => {
                // Issue orders
                // We need an internal issueOrder that doesn't check 'humanPlayerId'
                const source = this.stars.get(decision.sourceId);
                // Handle Retreat (targetId null)
                if (decision.targetId === null) {
                    if (source && source.ownerId === playerId) {
                        source.setTarget(null);
                    }
                    return;
                }

                const target = this.stars.get(decision.targetId);

                // VALIDATION: Check connection before executing (Security Layer)
                const isConnected = this.connections.some(c =>
                    (c.sourceId === decision.sourceId && c.targetId === decision.targetId) ||
                    (c.sourceId === decision.targetId && c.targetId === decision.sourceId)
                );

                if (source && target && source.ownerId === playerId && isConnected) {
                    source.setTarget(target.id);
                } else if (!isConnected) {
                    log.error('GameEngine', `AI ${playerId} attempted illegal attack from ${decision.sourceId} to ${decision.targetId} (Not Connected)`);
                }
            });
        });
    }

    // ============================================================================
    // Game Logic Helpers
    // ============================================================================

    createLink(sourceId: StarId, targetId: StarId, persistAfterConquest?: boolean): boolean {
        const source = this.stars.get(sourceId);
        const target = this.stars.get(targetId);

        if (!source || !target) return false;
        if (source.ownerId !== this.humanPlayerId) return false;

        // Check if connected
        const isConnected = this.connections.some(
            c => (c.sourceId === sourceId && c.targetId === targetId) ||
                (c.sourceId === targetId && c.targetId === sourceId)
        );
        if (!isConnected) return false;

        // FIX: Prevent Opposite Flow (A->B and B->A loop) for same-owner stars
        // If target is owned by same player and was sending to source, CANCEL target's link.
        if (target.ownerId === source.ownerId && target.targetId === sourceId) {
            target.setTarget(null);
            log.sys('GameEngine', `Cancelled opposite link from ${targetId} to ${sourceId}`);
        }

        // FIX: Also cancel any queued deferred order from targetâ†’source
        // This prevents loops when: Aâ†’B deferred, then Bâ†’A active order created
        const targetQueuedOrder = target.queuedOrderTargetId;
        if (targetQueuedOrder === sourceId) {
            target.clearQueuedOrder();
            log.sys('GameEngine', `Cancelled queued order ${targetId} â†’ ${sourceId} (would create loop with new order)`);
        }

        // New order replaces old order (source can only target one star)
        // persistAfterConquest defaults to global config if not specified
        source.setTarget(targetId, persistAfterConquest);
        return true;
    }

    cancelLink(starId: StarId): void {
        const star = this.stars.get(starId);
        if (star && star.ownerId === this.humanPlayerId) {
            star.setTarget(null);
        }
    }

    /**
     * Set a deferred order on an enemy star (to be executed when captured)
     * This allows players to chain orders through enemy territory
     * @param enemyStarId - The enemy star to set the order on
     * @param nextTargetId - Where to attack after capturing
     * @param persistAfterConquest - If false, order clears if star is captured again
     */
    setDeferredOrder(enemyStarId: StarId, nextTargetId: StarId, persistAfterConquest?: boolean): boolean {
        const enemyStar = this.stars.get(enemyStarId);
        const nextTarget = this.stars.get(nextTargetId);

        if (!enemyStar || !nextTarget) return false;
        // Must be enemy star (not owned by human)
        if (enemyStar.ownerId === this.humanPlayerId) return false;

        // Check if enemyStar -> nextTarget is connected
        const isConnected = this.connections.some(
            c => (c.sourceId === enemyStarId && c.targetId === nextTargetId) ||
                (c.sourceId === nextTargetId && c.targetId === enemyStarId)
        );
        if (!isConnected) return false;

        // FIX: Prevent bidirectional loops - cancel any active order from nextTargetâ†’enemyStar
        // This happens when player owns nextTarget and has active order pointing to enemyStar
        if (nextTarget.ownerId === this.humanPlayerId && nextTarget.targetId === enemyStarId) {
            nextTarget.setTarget(null);
            log.sys('GameEngine', `Cancelled active order ${nextTargetId} â†’ ${enemyStarId} (would create loop with deferred order)`);
        }

        // FIX: Also check and cancel any queued order from nextTargetâ†’enemyStar
        if (nextTarget.queuedOrderTargetId === enemyStarId) {
            nextTarget.clearQueuedOrder();
            log.sys('GameEngine', `Cancelled queued order ${nextTargetId} â†’ ${enemyStarId} (would create loop with deferred order)`);
        }

        // Set queued order (will execute when human captures this star)
        enemyStar.setQueuedOrder(this.humanPlayerId, nextTargetId, persistAfterConquest);
        log.sys('GameEngine', `Deferred order set: ${enemyStarId} -> ${nextTargetId} (on capture, persist=${persistAfterConquest ?? 'default'})`);
        return true;
    }

    /**
     * Get deferred order for a star (if any)
     */
    getDeferredOrder(starId: StarId): StarId | null {
        const star = this.stars.get(starId);
        if (!star) return null;
        // Access the internal queued order if it's for the human player
        const state = star.getState();
        return state.queuedOrderTargetId ?? null;
    }

    private checkWinCondition(): void {
        const activePlayers = Array.from(this.players.values()).filter(p => !p.isEliminated);

        // Check eliminations
        this.players.forEach(p => {
            if (!p.isEliminated && this.getPlayerStarCount(p.id) === 0 && this.getPlayerShipCount(p.id) === 0) {
                p.isEliminated = true;
                log.state('GameEngine', `Player ${p.name} eliminated!`);
            }
        });

        // Dominant victory: if one player owns 99%+ of all ships, they win
        if (activePlayers.length > 1) {
            let totalShips = 0;
            const shipCounts = new Map<PlayerId, number>();
            this.players.forEach(p => {
                if (!p.isEliminated) {
                    const count = this.getPlayerActiveShips(p.id) + this.getPlayerDamagedShips(p.id);
                    shipCounts.set(p.id, count);
                    totalShips += count;
                }
            });
            if (totalShips > 0) {
                for (const [pid, count] of shipCounts) {
                    if (count / totalShips >= 0.99) {
                        // This player dominates â€” eliminate everyone else
                        this.players.forEach(p => {
                            if (p.id !== pid && !p.isEliminated) {
                                p.isEliminated = true;
                                log.state('GameEngine', `Player ${p.name} eliminated (${Math.round(count / totalShips * 100)}% ship dominance by ${pid})`);
                            }
                        });
                        break;
                    }
                }
            }
        }
    }

    private recordHistory(): void {
        this.lastHistoryTick = this.tick;

        // Pre-calculate attack metrics
        const playerAttacks = new Map<PlayerId, number>();
        const playerUnderAttack = new Map<PlayerId, number>();

        // Initialize counters
        this.players.forEach(p => {
            playerAttacks.set(p.id, 0);
            playerUnderAttack.set(p.id, 0);
        });

        // Count active attacks and stars under attack
        this.stars.forEach(star => {
            if (star.targetId) {
                const target = this.stars.get(star.targetId);
                if (target && target.ownerId !== star.ownerId) {
                    // This is an attack (not reinforcement)
                    playerAttacks.set(star.ownerId, (playerAttacks.get(star.ownerId) || 0) + 1);
                    playerUnderAttack.set(target.ownerId, (playerUnderAttack.get(target.ownerId) || 0) + 1);
                }
            }
        });

        const entry: import('$lib/types/game.types').GameHistoryEntry = {
            tick: this.tick,
            players: [],
            totalCombatEvents: this.tickCombatEvents,
            conquestsThisTick: this.tickConquests
        };

        this.players.forEach(player => {
            if (!player.isEliminated) {
                entry.players.push({
                    id: player.id,
                    totalShips: this.getPlayerShipCount(player.id),
                    starCount: this.getPlayerStarCount(player.id),
                    activeAttacks: playerAttacks.get(player.id) || 0,
                    underAttack: playerUnderAttack.get(player.id) || 0
                });
            }
        });

        this.statsHistory.push(entry);
        // Cap history to prevent memory leak (500 entries â‰ˆ 10 min at 1x speed)
        if (this.statsHistory.length > 500) {
            this.statsHistory.splice(0, this.statsHistory.length - 500);
        }
    }

    private getPlayerShipCount(playerId: PlayerId): number {
        let count = 0;
        this.stars.forEach(star => {
            if (star.ownerId === playerId) {
                count += star.totalShips;
            }
        });
        return Math.floor(count);
    }

    private getPlayerActiveShips(playerId: PlayerId): number {
        let count = 0;
        this.stars.forEach(star => {
            if (star.ownerId === playerId) {
                count += star.activeShips;
            }
        });
        return Math.floor(count);
    }

    private getPlayerDamagedShips(playerId: PlayerId): number {
        let count = 0;
        this.stars.forEach(star => {
            if (star.ownerId === playerId) {
                count += star.damagedShips;
            }
        });
        return Math.floor(count);
    }

    private getPlayerProduction(playerId: PlayerId): number {
        let total = 0;
        this.stars.forEach(star => {
            if (star.ownerId === playerId) {
                total += star.productionRate;
            }
        });
        return Math.round(total * 10) / 10; // Round to 1 decimal
    }

    private getPlayerStarCount(playerId: PlayerId): number {
        let count = 0;
        this.stars.forEach(star => {
            if (star.ownerId === playerId) count++;
        });
        return count;
    }

    // ============================================================================
    // Public Getters
    // ============================================================================

    getStatsHistory() {
        return this.statsHistory;
    }

    getStats() {
        return {
            elapsedMs: performance.now() - this.startTime,
            totalTicks: this.tick,
            peakFleetSize: this.peakFleetSize,
            starsCaptured: this.starsCaptured
        };
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
                activeShips: this.getPlayerActiveShips(winner.id),
                damagedShips: this.getPlayerDamagedShips(winner.id),
                production: this.getPlayerProduction(winner.id),
                starCount: this.getPlayerStarCount(winner.id)
            };
        }
        return null;
    }

    /** Surrender: Eliminate human player and determine winner */
    surrender(): PlayerState | null {
        // Eliminate human player
        const humanPlayer = this.players.get(this.humanPlayerId);
        if (humanPlayer) {
            humanPlayer.isEliminated = true;
            log.state('GameEngine', `${humanPlayer.name} has surrendered!`);
        }

        // Find winner (AI with most stars, then most ships)
        const activePlayers = Array.from(this.players.values()).filter(p => !p.isEliminated);
        if (activePlayers.length === 0) return null;

        // Sort by star count, then ship count
        activePlayers.sort((a, b) => {
            const starsA = this.getPlayerStarCount(a.id);
            const starsB = this.getPlayerStarCount(b.id);
            if (starsA !== starsB) return starsB - starsA;
            return this.getPlayerShipCount(b.id) - this.getPlayerShipCount(a.id);
        });

        const winner = activePlayers[0];
        return {
            id: winner.id,
            name: winner.name,
            color: winner.color,
            isAI: winner.isAI,
            isEliminated: false,
            totalShips: this.getPlayerShipCount(winner.id),
            activeShips: this.getPlayerActiveShips(winner.id),
            damagedShips: this.getPlayerDamagedShips(winner.id),
            production: this.getPlayerProduction(winner.id),
            starCount: this.getPlayerStarCount(winner.id)
        };
    }

    getState(): GameState {
        const playerStates: PlayerState[] = Array.from(this.players.values()).map(player => ({
            id: player.id,
            name: player.name,
            color: player.color,
            isAI: player.isAI,
            isEliminated: player.isEliminated,
            totalShips: this.getPlayerShipCount(player.id),
            activeShips: this.getPlayerActiveShips(player.id),
            damagedShips: this.getPlayerDamagedShips(player.id),
            production: this.getPlayerProduction(player.id),
            starCount: this.getPlayerStarCount(player.id)
        }));

        return {
            tick: this.tick,
            tickProgress: 0,
            speed: this.speed,
            isPaused: this.speed === 0,
            stars: Array.from(this.stars.values()).map(s => s.getState()),
            connections: this.connections,
            links: Array.from(this.stars.values()).filter(s => s.targetId).map(s => ({
                id: `link-${s.id}-${s.targetId}`,
                sourceId: s.id,
                targetId: s.targetId!,
                ownerId: s.ownerId
            })),
            players: playerStates,
            winner: this.getWinner(),
            elapsedMs: performance.now() - this.startTime,
            history: this.statsHistory
        } as GameState & { links: any[]; elapsedMs: number; history: any[] };
    }

    setOnTick(callback: TickCallback): void {
        this.onTick = callback;
    }

    setOnTickProgress(callback: TickProgressCallback): void {
        this.onTickProgress = callback;
    }

    setOnTickEvents(callback: TickEventsCallback): void {
        this.onTickEvents = callback;
    }

    destroy(): void {
        this.clearTickInterval();
        if (this.progressLoopId) {
            cancelAnimationFrame(this.progressLoopId);
            this.progressLoopId = null;
        }
        this.onTick = null;
        this.onTickProgress = null;
        this.onTickEvents = null;
        this.stars.clear();
        this.players.clear();

        log.sys('GameEngine', 'Engine destroyed, resources cleaned up');
    }
}

export function createEngine(config: EngineConfig): GameEngine {
    return new GameEngine(config);
}
