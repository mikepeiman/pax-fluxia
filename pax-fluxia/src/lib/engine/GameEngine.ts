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
    CombatResult,
    StarType
} from '$lib/types/game.types';

import { Star, createStar } from './Star';
import { FlowLink, createFlowLink } from './FlowLink';
import { resolveCombat } from './Combat';
import { AI, createAI } from './AI';
import { log } from '$lib/utils/logger';
import {
    selectRandomHexPositions,
    generateStarConnections,
    areConnected
} from '$lib/utils/hex.utils';
import { GAME_CONFIG, calculateCombatV4 } from '$lib/config/game.config';
import { applyConquest, STAR_TYPE_STATS, createEmptyTickEvents } from '@pax/common';
import type { ConquestContext, EngineConfig as SharedEngineConfig, TickEvents } from '@pax/common';
import { createFleet, type Fleet } from './Fleet';
import { logCombat } from '$lib/utils/CombatLogger';
import { combatLog } from '$lib/stores/combatLogStore';
// Animation driven by TickEvents, not state diffing (see POST_MORTEMS.md)
// NOTE: CombatRules.ts import removed - was dead code, combat handled by calculateCombatV4
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
    private links: Map<string, FlowLink> = new Map();
    private fleets: Map<string, Fleet> = new Map();
    private players: Map<PlayerId, Player> = new Map();
    private aiPlayers: Map<PlayerId, AI> = new Map();
    private transfers: any[] = []; // Tracking active transfers

    // Timing
    private tick: number = 0;
    private speed: GameSpeed = 0; // 0 = paused
    private tickIntervalId: ReturnType<typeof setInterval> | null = null;
    private tickStartTime: number = 0;

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
        const width = 1600;
        const height = 900;
        let hexRadius = GAME_CONFIG.HEX_RADIUS || 60;

        // Calculate total stars first to determine optimal padding
        const playerIds = Array.from(this.players.keys());
        const starsPerPlayer = GAME_CONFIG.STARS_PER_PLAYER;
        const totalStars = playerIds.length * starsPerPlayer;

        // Dynamic padding: reduce for large star counts
        const basePaddingX = totalStars > 50 ? 80 : totalStars > 20 ? 120 : 150;
        const basePaddingY = totalStars > 50 ? 60 : totalStars > 20 ? 80 : 100;
        const paddingX = basePaddingX;
        const paddingY = basePaddingY;

        // Adaptive hex radius: shrink grid cell size to ensure enough positions
        // Each hex occupies ~(1.5r × sqrt(3)r) area; we need at least 2x positions for spacing freedom
        const gridArea = (width - paddingX * 2) * (height - paddingY * 2);
        const neededPositions = totalStars * 2; // 2x for spacing margin
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

        log.sys('GameEngine', `Hex grid: radius=${hexRadius}, ${hexes.length} positions for ${totalStars} requested stars`);

        // Physics-aware spacing: stars must not overlap each other's orbit layers
        // Formula: minSpacing = (starRadius * 2) + (orbitLayerWidth * MAX_ORBIT_LAYERS * 2) + buffer
        const STAR_RADIUS = 20;  // Default star radius from Star.ts
        const SHIP_BASE_SIZE = 4;
        const RING_SPACING = SHIP_BASE_SIZE * 1.4; // Matches render.utils.ts
        const MAX_ORBIT_LAYERS = 5;  // Max visual orbit layers (R-38)
        const SPACING_BUFFER = 20;  // Adjustable gap between orbit envelopes
        const physicsMinSpacing = (STAR_RADIUS * 2) + (RING_SPACING * MAX_ORBIT_LAYERS * 2) + SPACING_BUFFER;

        // Apply user spacing multiplier (default 1.0)
        const spacingMultiplier = this.settings.starSpacing ?? 1.0;
        const minSpacing = physicsMinSpacing * spacingMultiplier;

        log.sys('GameEngine', `Star spacing: ${minSpacing.toFixed(0)}px (physics min: ${physicsMinSpacing.toFixed(0)}, multiplier: ${spacingMultiplier})`);

        const starPositions = selectRandomHexPositions(hexes, totalStars, minSpacing);

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
                // Weighted random distribution
                const rand = Math.random();
                if (rand < 0.3) starType = 'grey';
                else if (rand < 0.5) starType = 'yellow';
                else if (rand < 0.65) starType = 'red';
                else if (rand < 0.8) starType = 'green';
                else if (rand < 0.9) starType = 'purple';
                else if (rand < 0.95) starType = 'blue';
                else starType = 'grey'; // fallback
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
     * Layout: Triangle (A↔B↔C↔A) + dead-end (D→A only)
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

        // Define connections: Triangle A↔B↔C↔A + dead-end D↔A
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
        this.speed = 0;
        this.clearTickInterval();
    }

    resume(): void {
        if (this.speed === 0) {
            this.speed = 1;
            this.scheduleTick();
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
        this.tickStartTime = performance.now();
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
                const animSpeed = Math.max(GAME_CONFIG.ANIMATION_SPEED_MS / this.speed, GAME_CONFIG.MIN_TICK_MS);
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

        // 2. ORDERS — transfers + combat (collects events)
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
                // Transfer rate: global base rate × star-type speed multiplier
                // (Blue stars have speed=2, so they transfer at 2× the global rate)
                const speedMultiplier = STAR_TYPE_STATS[source.starType as StarType]?.speed ?? 1;
                const effectiveRate = (GAME_CONFIG.TRANSFER_RATE || 0.1) * speedMultiplier;
                const transferAmount = Math.max(
                    GAME_CONFIG.MIN_SHIPS_PER_TRANSFER,
                    Math.ceil(source.activeShips * effectiveRate)
                );

                // Orders persist until explicitly cancelled — zero ships does NOT auto-cancel.
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
     * Multi-Source Combat Resolution
     * Multiple stars attacking the same target - aggregates all attacking forces
     * Both sides take damage simultaneously, conquest evaluated against TOTAL attacking force
     * 
     * FIX: Skips attackers whose target changed mid-tick (e.g., star was conquered
     * and old owner's order was cancelled). If new owner had a chain-through order
     * to this same target, it will still be set and attack proceeds.
     */
    private resolveMultiSourceCombat(attackers: Star[], defender: Star, events: TickEvents): void {
        // Filter out attackers with no ships OR whose target was cancelled mid-tick
        // When a star is conquered, setOwner() clears old target and may set new one from queued order
        const validAttackers = attackers.filter(attacker => {
            if (attacker.activeShips <= 0) {
                attacker.clearTarget();
                return false;
            }
            // FIX: Check if this attacker still has this target set
            // If ownership changed and old order was cancelled, targetId will be different or null
            // If new owner had a chain-through order to same target, it will still match
            if (attacker.targetId !== defender.id) {
                log.sys('Combat', `Skipping attack from ${attacker.id}: target changed mid-tick (was ${defender.id}, now ${attacker.targetId || 'none'})`);
                return false;
            }
            return true;
        });

        if (validAttackers.length === 0) {
            return;
        }

        // Calculate TOTAL attacking force from all sources, grouped by player (ownerId)
        // Per MECHANICS.md §3.3: forces = Map<PlayerId, count>
        let totalAttackShips = 0;
        const attackerContributions: { attacker: Star, ships: number }[] = [];
        const shipsByOwner = new Map<string, { stars: Star[], totalShips: number }>();

        validAttackers.forEach(attacker => {
            const ships = attacker.activeShips;
            totalAttackShips += ships;
            attackerContributions.push({ attacker, ships });

            // Group by owner for per-player victor determination
            const entry = shipsByOwner.get(attacker.ownerId) || { stars: [], totalShips: 0 };
            entry.stars.push(attacker);
            entry.totalShips += ships;
            shipsByOwner.set(attacker.ownerId, entry);
        });

        // Damaged ships count at reduced effectiveness for defense
        const defenderForce = defender.activeShips + Math.floor(defender.damagedShips * GAME_CONFIG.DAMAGED_SHIP_EFFECTIVENESS);

        if (defenderForce <= 0) {
            // Instant conquest - no defenders
            // Victor = PLAYER with largest total attacking ships (not individual star)
            let bestOwnerId = '';
            let bestShips = 0;
            shipsByOwner.forEach((entry, ownerId) => {
                if (entry.totalShips > bestShips) {
                    bestShips = entry.totalShips;
                    bestOwnerId = ownerId;
                }
            });
            // Strongest individual star of winning player for executeConquest
            const winnerStars = shipsByOwner.get(bestOwnerId)!.stars;
            const strongestAttacker = winnerStars.reduce((a, b) =>
                a.activeShips > b.activeShips ? a : b
            );
            this.executeConquest(strongestAttacker, defender, events);
            return;
        }

        // Calculate symmetric damage using TOTAL ships from ALL attackers (all players)
        const attackerIsAttacking = true;
        const defenderIsAttacking = defender.targetId !== null;

        const {
            killsOnA: killsOnDefender,
            disabledOnA: disabledOnDefender,
            killsOnB: killsOnAttacker,
            disabledOnB: disabledOnAttacker
        } = calculateCombatV4(
            defenderForce,
            totalAttackShips,  // Use TOTAL attacking ships (all players combined)
            defenderIsAttacking,
            attackerIsAttacking
        );

        // Apply damage to DEFENDER
        defender.removeActiveShips(killsOnDefender);
        defender.takeDamage(disabledOnDefender);
        defender.markCombat(this.tick);

        // Apply damage to ATTACKERS (proportional return fire based on ship contribution)
        attackerContributions.forEach(({ attacker, ships }) => {
            const proportion = ships / totalAttackShips;
            const kills = Math.floor(killsOnAttacker * proportion);
            const disabled = Math.floor(disabledOnAttacker * proportion);

            attacker.removeActiveShips(kills);
            attacker.takeDamage(disabled);
            attacker.markCombat(this.tick);
        });

        // Increment combat event counter for stats
        this.tickCombatEvents++;

        // Combat telemetry - log the combined attack with OWNER info
        const primaryAttacker = validAttackers[0];
        log.combatBattle(
            this.tick,
            { id: `${validAttackers.length} stars`, ships: totalAttackShips, starType: primaryAttacker.starType, ownerId: primaryAttacker.ownerId },
            { id: defender.id, ships: defenderForce, starType: defender.starType, ownerId: defender.ownerId },
            { kills: killsOnDefender, disabled: disabledOnDefender },
            { kills: killsOnAttacker, disabled: disabledOnAttacker },
            {
                aggressor: GAME_CONFIG.AGGRESSOR_ADVANTAGE,
                damage: GAME_CONFIG.DAMAGE_PER_SHIP,
                lethality: GAME_CONFIG.LETHALITY,
                forceRatio: GAME_CONFIG.FORCE_RATIO_EFFECT,
                repairRate: GAME_CONFIG.REPAIR_RATE
            }
        );

        // Push to UI Combat Log
        combatLog.add({
            tick: this.tick,
            attacker: {
                id: validAttackers.length > 1 ? `${validAttackers.length} stars` : primaryAttacker.id,
                ships: Math.floor(totalAttackShips),
                starType: primaryAttacker.starType,
                ownerId: primaryAttacker.ownerId,
                kills: Math.floor(killsOnAttacker),
                disabled: Math.floor(disabledOnAttacker)
            },
            defender: {
                id: defender.id,
                ships: Math.floor(defenderForce),
                starType: defender.starType,
                ownerId: defender.ownerId,
                kills: Math.floor(killsOnDefender),
                disabled: Math.floor(disabledOnDefender)
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
            attackerIds: validAttackers.map(a => a.id),
            attackerOwnerId: primaryAttacker.ownerId,
            defenderId: defender.id,
            defenderOwnerId: defender.ownerId,
            totalAttackForce: totalAttackShips,
            defenderForce,
            killsOnDefender: Math.floor(killsOnDefender),
            disabledOnDefender: Math.floor(disabledOnDefender),
            killsOnAttacker: Math.floor(killsOnAttacker),
            disabledOnAttacker: Math.floor(disabledOnAttacker),
            conquered: false,
        });

        // Check CONQUEST condition using TOTAL attacking ships (all players)
        const conquestThreshold = totalAttackShips / GAME_CONFIG.CONQUEST_THRESHOLD;
        if (defender.activeShips <= conquestThreshold) {
            // Victor = PLAYER with largest total attacking ships per MECHANICS.md §3.3
            let bestOwnerId = '';
            let bestShips = 0;
            shipsByOwner.forEach((entry, ownerId) => {
                if (entry.totalShips > bestShips) {
                    bestShips = entry.totalShips;
                    bestOwnerId = ownerId;
                }
            });
            // Strongest individual star of winning player for executeConquest
            const winnerStars = shipsByOwner.get(bestOwnerId)!.stars;
            const victor = winnerStars.reduce((a, b) =>
                a.activeShips > b.activeShips ? a : b
            );
            this.executeConquest(victor, defender, events);
        }
    }

    /**
     * Single-Source Combat Resolution
     * Ships stay at their stars during combat - damage is dealt each tick until conquest
     * Both sides take damage simultaneously
     */
    private resolveCombat(attacker: Star, defender: Star, events: TickEvents): void {
        if (attacker.activeShips <= 0) {
            attacker.clearTarget();
            return;
        }

        // Combat uses CURRENT ship counts - ships don't leave
        const attackerForce = attacker.activeShips;
        // Damaged ships count at 1/7th effectiveness for defense
        const defenderForce = defender.activeShips + Math.floor(defender.damagedShips * GAME_CONFIG.DAMAGED_SHIP_EFFECTIVENESS);

        if (defenderForce <= 0) {
            // Instant conquest - no defenders
            this.executeConquest(attacker, defender, events);
            return;
        }

        // Calculate symmetric damage
        const attackerIsAttacking = true;
        const defenderIsAttacking = defender.targetId !== null;

        const {
            killsOnA: killsOnDefender,
            disabledOnA: disabledOnDefender,
            killsOnB: killsOnAttacker,
            disabledOnB: disabledOnAttacker
        } = calculateCombatV4(
            defenderForce,
            attackerForce,
            defenderIsAttacking,
            attackerIsAttacking
        );

        // Apply damage to DEFENDER
        defender.removeActiveShips(killsOnDefender);
        defender.takeDamage(disabledOnDefender);
        defender.markCombat(this.tick);

        // Apply damage to ATTACKER (return fire)
        attacker.removeActiveShips(killsOnAttacker);
        attacker.takeDamage(disabledOnAttacker);
        attacker.markCombat(this.tick);

        // Combat telemetry with OWNER info
        log.combatBattle(
            this.tick,
            { id: attacker.id, ships: attackerForce, starType: attacker.starType, ownerId: attacker.ownerId },
            { id: defender.id, ships: defenderForce, starType: defender.starType, ownerId: defender.ownerId },
            { kills: killsOnDefender, disabled: disabledOnDefender },
            { kills: killsOnAttacker, disabled: disabledOnAttacker },
            {
                aggressor: GAME_CONFIG.AGGRESSOR_ADVANTAGE,
                damage: GAME_CONFIG.DAMAGE_PER_SHIP,
                lethality: GAME_CONFIG.LETHALITY,
                forceRatio: GAME_CONFIG.FORCE_RATIO_EFFECT,
                repairRate: GAME_CONFIG.REPAIR_RATE
            }
        );

        // Push to UI Combat Log
        combatLog.add({
            tick: this.tick,
            attacker: {
                id: attacker.id,
                ships: Math.floor(attackerForce),
                starType: attacker.starType,
                ownerId: attacker.ownerId,
                kills: Math.floor(killsOnAttacker),
                disabled: Math.floor(disabledOnAttacker)
            },
            defender: {
                id: defender.id,
                ships: Math.floor(defenderForce),
                starType: defender.starType,
                ownerId: defender.ownerId,
                kills: Math.floor(killsOnDefender),
                disabled: Math.floor(disabledOnDefender)
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

        // Check CONQUEST condition: defender ships <= 1/7th of attacker
        const conquestThreshold = attackerForce / GAME_CONFIG.CONQUEST_THRESHOLD;
        if (defender.activeShips <= conquestThreshold) {
            this.executeConquest(attacker, defender, events);
        }
    }

    /**
     * Execute star conquest - delegates to shared applyConquest() for mechanics,
     * then handles client-only animation/logging from the result.
     */
    private executeConquest(attacker: Star, defender: Star, events: TickEvents): void {
        const previousOwner = defender.ownerId;

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
        const cfg: SharedEngineConfig = {
            BASE_PRODUCTION: GAME_CONFIG.BASE_PRODUCTION ?? 0.5,
            REPAIR_RATE: GAME_CONFIG.REPAIR_RATE,
            MIN_REPAIR: GAME_CONFIG.MIN_REPAIR ?? 1,
            REPAIR_COMBAT_PENALTY: GAME_CONFIG.REPAIR_COMBAT_PENALTY ?? 0.1,
            MIN_SHIPS_PER_TRANSFER: GAME_CONFIG.MIN_SHIPS_PER_TRANSFER ?? 1,
            CONQUEST_TRANSFER_PERCENTAGE: GAME_CONFIG.CONQUEST_TRANSFER_PERCENTAGE,
            RETAIN_ORDER_ON_CONQUEST: GAME_CONFIG.RETAIN_ORDER_ON_CONQUEST,
            RETREAT_CAPTURE_RATE: GAME_CONFIG.RETREAT_CAPTURE_RATE,
            SCATTER_CAPTURE_RATE: GAME_CONFIG.SCATTER_CAPTURE_RATE,
            SCATTER_DESTROY_RATE: GAME_CONFIG.SCATTER_DESTROY_RATE,
            DAMAGED_SHIP_EFFECTIVENESS: GAME_CONFIG.DAMAGED_SHIP_EFFECTIVENESS,
            TRANSFER_RATE: GAME_CONFIG.TRANSFER_RATE ?? 0.1,
        };

        // Delegate to shared conquest logic
        const result = applyConquest(attacker as any, defender as any, ctx, cfg);

        // ================================================================
        // CLIENT-ONLY: Logging
        // ================================================================

        if (result.retreatTargetId) {
            const retreatTarget = this.stars.get(result.retreatTargetId);
            if (retreatTarget) {
                log.success('Retreat', `${result.shipsEscaped} ships retreat from ${defender.id} to ${retreatTarget.id}`);
            }
        } else if (result.scatterTargetIds && result.scatterTargetIds.length > 0) {
            log.success('Scatter', `${result.shipsEscaped} ships scatter from ${defender.id} to ${result.scatterTargetIds.length} neighbors`);

            if (result.shipsDestroyed > 0) {
                log.data('Scatter', `${result.shipsDestroyed} ships destroyed during scatter`);
            }
        }

        // ================================================================
        // CLIENT-ONLY: Logging
        // ================================================================

        const captureInfo = result.retreatTargetId ? `(retreat: ${result.shipsEscaped} escaped)` :
            (result.scatterTargetIds?.length ?? 0) > 0 ? `(scatter: ${result.shipsEscaped} escaped, ${result.shipsDestroyed} destroyed)` :
                '(no escape)';
        log.success('Conquest', `${attacker.id} conquered ${defender.id} - captured ${result.shipsCaptured}/${result.defenderTotalAtConquest} ${captureInfo}`);

        // Increment conquest counter for stats
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
                kills: Math.floor(result.shipsDestroyed),
                disabled: 0
            },
            defender: {
                id: defender.id,
                ships: Math.floor(result.shipsCaptured),
                starType: defender.starType,
                ownerId: previousOwner,
                kills: 0,
                disabled: Math.floor(result.shipsEscaped)
            },
            settings: {
                aggressor: GAME_CONFIG.AGGRESSOR_ADVANTAGE,
                damage: GAME_CONFIG.DAMAGE_PER_SHIP,
                lethality: GAME_CONFIG.LETHALITY,
                forceRatio: GAME_CONFIG.FORCE_RATIO_EFFECT,
                repairRate: GAME_CONFIG.REPAIR_RATE
            },
            result: 'CONQUERED',
            captured: Math.floor(result.shipsCaptured),
            escaped: Math.floor(result.shipsEscaped),
            destroyed: Math.floor(result.shipsDestroyed),
            defenderTotalAtConquest: result.defenderTotalAtConquest
        });

        // Emit ConquestEvent for unified event pipeline
        events.conquests.push({
            tick: this.tick,
            starId: defender.id,
            previousOwner,
            newOwner: attacker.ownerId,
            shipsCaptured: result.shipsCaptured,
            shipsEscaped: result.shipsEscaped,
            shipsDestroyed: result.shipsDestroyed,
            retreatTargetId: result.retreatTargetId,
            scatterTargetIds: result.scatterTargetIds,
            scatterShipCounts: result.scatterShipCounts,
        });

        // Mark the last combat event as conquered (if combat preceded this)
        if (events.combats.length > 0) {
            const lastCombat = events.combats[events.combats.length - 1];
            if (lastCombat.defenderId === defender.id) {
                lastCombat.conquered = true;
            }
        }

        // ================================================================
        // Cancel orders targeting this conquered star from all other players
        // Also cancel winning player's attack order (star is now friendly)
        // ================================================================
        const conqueredId = defender.id;
        const newOwner = defender.ownerId; // Now owned by attacker
        this.stars.forEach(star => {
            // Cancel targetId pointing at conquered star
            if (star.targetId === conqueredId && star.ownerId !== newOwner) {
                log.state('OrderCancel', `Cancelling ${star.id}'s order to ${conqueredId} (conquered by another player)`);
                star.setTarget(null);
            }
            // Cancel queued/chained orders pointing at conquered star from non-owners
            if (star.queuedOrderTargetId === conqueredId && star.ownerId !== newOwner) {
                log.state('OrderCancel', `Cancelling ${star.id}'s queued order to ${conqueredId}`);
                star.queuedOrderTargetId = null;
            }
        });
    }

    // NOTE: handleFleetArrivals and resolveMultiwayCombat were removed as dead code
    // Combat is now handled by resolveMultiSourceCombatWithOwnership via processFlowLinks

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

        // FIX: Also cancel any queued deferred order from target→source
        // This prevents loops when: A→B deferred, then B→A active order created
        const targetQueuedOrder = target.queuedOrderTargetId;
        if (targetQueuedOrder === sourceId) {
            target.clearQueuedOrder();
            log.sys('GameEngine', `Cancelled queued order ${targetId} → ${sourceId} (would create loop with new order)`);
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

        // FIX: Prevent bidirectional loops - cancel any active order from nextTarget→enemyStar
        // This happens when player owns nextTarget and has active order pointing to enemyStar
        if (nextTarget.ownerId === this.humanPlayerId && nextTarget.targetId === enemyStarId) {
            nextTarget.setTarget(null);
            log.sys('GameEngine', `Cancelled active order ${nextTargetId} → ${enemyStarId} (would create loop with deferred order)`);
        }

        // FIX: Also check and cancel any queued order from nextTarget→enemyStar
        if (nextTarget.queuedOrderTargetId === enemyStarId) {
            nextTarget.clearQueuedOrder();
            log.sys('GameEngine', `Cancelled queued order ${nextTargetId} → ${enemyStarId} (would create loop with deferred order)`);
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
            fleets: [], // Instant fleets don't persist
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
        };
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
        this.links.clear();
        this.fleets.clear();
        this.players.clear();

        log.sys('GameEngine', 'Engine destroyed, resources cleaned up');
    }
}

export function createEngine(config: EngineConfig): GameEngine {
    return new GameEngine(config);
}
