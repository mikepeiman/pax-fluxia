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
import { createFleet, type Fleet } from './Fleet';
import { logCombat } from '$lib/utils/CombatLogger';
import { combatLog } from '$lib/stores/combatLogStore';
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

    // Callbacks
    private onTick: TickCallback | null = null;
    private onTickProgress: TickProgressCallback | null = null;

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
        const hexRadius = GAME_CONFIG.HEX_RADIUS || 60;
        const paddingX = 250;
        const paddingY = 120;

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

        log.sys('GameEngine', `Generated hex grid with ${hexes.length} positions`);

        const playerIds = Array.from(this.players.keys());
        const starsPerPlayer = GAME_CONFIG.STARS_PER_PLAYER;
        const totalStars = playerIds.length * starsPerPlayer;
        const minSpacing = hexRadius * 3;
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
            this.stars.set(star.id, star);
        });

        this.updateTerritories(width, height);

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
        starA.addActiveShips(100);
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
        starB.addActiveShips(100);
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
        starC.addActiveShips(100);
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
        starD.addActiveShips(100);
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
                const interval = Math.max(GAME_CONFIG.BASE_TICK_MS / this.speed, GAME_CONFIG.MIN_TICK_MS);
                const progress = Math.min(elapsed / interval, 1);
                this.onTickProgress(progress);
            }
            this.progressLoopId = requestAnimationFrame(loop);
        };
        this.progressLoopId = requestAnimationFrame(loop);
    }

    private executeTick(): void {
        this.tick++;
        this.tickStartTime = performance.now();

        // 1. PRODUCTION
        this.stars.forEach(star => star.produce());

        // 2. FLOW
        this.processFlowLinks();

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

        // 6. HISTORY (Record every 60 ticks)
        if (this.tick - this.lastHistoryTick >= 60) {
            this.recordHistory();
        }

        // 7. AI
        this.executeAI();

        // 8. CALLBACK
        if (this.onTick) {
            this.onTick(this.getState());
        }
    }

    private processFlowLinks(): void {
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
                // ATTACK: Remote engagement - ships DON'T leave source
                // Combat will use source.activeShips directly
                attackOrders.push({ source, target });
            } else {
                // REINFORCEMENT: Ships physically transfer to friendly star
                const flowPercentage = GAME_CONFIG.FLOW_PERCENTAGE || 0.25;
                const flowAmount = Math.max(
                    GAME_CONFIG.MIN_FLOW_SHIPS,
                    Math.floor(source.activeShips * flowPercentage)
                );

                if (flowAmount === 0 || source.activeShips === 0) {
                    source.clearTarget();
                    return;
                }

                const shipped = source.removeActiveShips(flowAmount);
                if (shipped > 0) {
                    reinforcements.push({ source, target, shipped });

                    // Create transfer packet for visual
                    const transferPacket = createFleet({
                        id: `transfer-${this.tick}-${source.id}-${target.id}`,
                        sourceId: source.id,
                        targetId: target.id,
                        ownerId: source.ownerId,
                        shipCount: shipped,
                        totalDistance: 100,
                        speed: 0
                    });
                    this.transfers.push(transferPacket);
                }
            }
        });

        // Process REINFORCEMENTS: Add ships to friendly destination
        reinforcements.forEach(({ target, shipped }) => {
            target.addActiveShips(shipped);
        });

        // Process ATTACKS: Remote engagement combat
        attackOrders.forEach(({ source, target }) => {
            this.resolveRemoteCombat(source, target);
        });
    }

    /**
     * Remote Engagement Combat
     * Ships stay at their stars - combat uses current ship counts
     * Both sides take damage simultaneously
     */
    private resolveRemoteCombat(attacker: Star, defender: Star): void {
        if (attacker.activeShips <= 0) {
            attacker.clearTarget();
            return;
        }

        // Combat uses CURRENT ship counts - ships don't leave
        const attackerForce = attacker.activeShips;
        // Damaged ships count at 1/7th effectiveness for defense
        const defenderForce = defender.activeShips + Math.floor(defender.damagedShips / 7);

        if (defenderForce <= 0) {
            // Instant conquest - no defenders
            this.executeConquest(attacker, defender);
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

        // Combat telemetry
        log.combatBattle(
            this.tick,
            { id: attacker.id, ships: attackerForce, starType: attacker.starType },
            { id: defender.id, ships: defenderForce, starType: defender.starType },
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
                ships: attackerForce,
                starType: attacker.starType,
                ownerId: attacker.ownerId,
                kills: killsOnAttacker,
                disabled: disabledOnAttacker
            },
            defender: {
                id: defender.id,
                ships: defenderForce,
                starType: defender.starType,
                ownerId: defender.ownerId,
                kills: killsOnDefender,
                disabled: disabledOnDefender
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
            this.executeConquest(attacker, defender);
        }
    }

    /**
     * Execute star conquest - change ownership and transfer ships
     */
    private executeConquest(attacker: Star, defender: Star): void {
        const previousOwner = defender.ownerId;

        // Transfer ownership using setter method
        defender.setOwner(attacker.ownerId);

        // CRITICAL: Transfer ships from attacker to newly conquered star
        // This prevents the star from being immediately re-conquered
        const transferPercentage = GAME_CONFIG.CONQUEST_TRANSFER_PERCENTAGE / 100;
        const shipsToTransfer = Math.floor(attacker.activeShips * transferPercentage);

        if (shipsToTransfer > 0) {
            attacker.removeActiveShips(shipsToTransfer);
            defender.addActiveShips(shipsToTransfer);
            log.data('Conquest', `Transferred ${shipsToTransfer} ships from ${attacker.id} to ${defender.id}`);
        }

        // Clear orders
        if (GAME_CONFIG.CLEAR_ORDER_ON_CAPTURE) {
            attacker.clearTarget();
            defender.clearTarget();
        }

        // Log conquest
        log.success('Conquest', `${attacker.id} conquered ${defender.id}`);

        // Update combat log result
        combatLog.add({
            tick: this.tick,
            attacker: {
                id: attacker.id,
                ships: attacker.activeShips,
                starType: attacker.starType,
                ownerId: attacker.ownerId,
                kills: 0,
                disabled: 0
            },
            defender: {
                id: defender.id,
                ships: defender.activeShips,
                starType: defender.starType,
                ownerId: previousOwner,
                kills: 0,
                disabled: 0
            },
            settings: {
                aggressor: GAME_CONFIG.AGGRESSOR_ADVANTAGE,
                damage: GAME_CONFIG.DAMAGE_PER_SHIP,
                lethality: GAME_CONFIG.LETHALITY,
                forceRatio: GAME_CONFIG.FORCE_RATIO_EFFECT,
                repairRate: GAME_CONFIG.REPAIR_RATE
            },
            result: 'CONQUERED'
        });
    }


    private handleFleetArrivals(arrivedFleets: Fleet[]): void {
        const arrivalsByTarget = new Map<StarId, Fleet[]>();

        arrivedFleets.forEach(fleet => {
            if (!arrivalsByTarget.has(fleet.targetId)) {
                arrivalsByTarget.set(fleet.targetId, []);
            }
            arrivalsByTarget.get(fleet.targetId)!.push(fleet);
        });

        arrivalsByTarget.forEach((fleets, targetId) => {
            this.resolveMultiwayCombat(targetId, fleets);
        });
    }

    private resolveMultiwayCombat(targetId: StarId, fleets: Fleet[]): void {
        const target = this.stars.get(targetId);
        if (!target) return;

        // 1. Group forces
        const forces = new Map<PlayerId, number>();

        // Add Defenders (Ships at star)
        // Note: Defenders don't "attack" incoming ships in this phase, 
        // they just defend the star.

        // Add Attackers (Arriving fleets)
        fleets.forEach(fleet => {
            const fid = String(fleet.ownerId);
            forces.set(fid, (forces.get(fid) || 0) + fleet.shipCount);
        });

        const ownerId = target.ownerId;
        const totalDefenders = target.activeShips + target.damagedShips;

        // ====================================================================
        // COMBAT V4: Symmetric Damage Model
        // Both sides take damage using the same base formula, modified by:
        // - Aggressor advantage (if attacking)
        // - Force ratio (larger force takes less damage)
        // - Lethality (splits damage into kills vs. disabled)
        // ====================================================================

        // 2. Calculate total attacking force and find strongest attacker
        let totalAttackForce = 0;
        let strongestAttackerId: PlayerId | null = null;
        let maxAttackForce = 0;

        forces.forEach((force, playerId) => {
            if (playerId !== ownerId) {
                totalAttackForce += force;
                if (force > maxAttackForce) {
                    maxAttackForce = force;
                    strongestAttackerId = playerId;
                }
            } else {
                // Reinforce - own ships arriving
                target.addActiveShips(force);
            }
        });

        if (totalAttackForce === 0) return; // No combat

        // 3. Determine if defender is counter-attacking
        const defenderIsAttacking = target.targetId !== null;
        const attackerIsAttacking = true; // By definition, attacking fleets are attacking

        // 4. Use V4 symmetric damage formula
        const {
            killsOnA: killsOnDefender,
            disabledOnA: disabledOnDefender,
            killsOnB: killsOnAttacker,
            disabledOnB: disabledOnAttacker
        } = calculateCombatV4(
            totalDefenders,          // Side A = Defender
            totalAttackForce,        // Side B = Attacker
            defenderIsAttacking,     // Defender may be counter-attacking
            attackerIsAttacking      // Attacker is always attacking
        );

        // 5. Apply damage to defender
        // KILLS: Permanently remove ships
        // DISABLED: Convert active → damaged (can repair later)
        target.removeActiveShips(killsOnDefender);
        target.takeDamage(disabledOnDefender);
        target.markCombat(this.tick);

        // 6. Apply return fire to attacking sources (proportional)
        fleets.forEach(fleet => {
            const sourceStar = this.stars.get(fleet.sourceId);
            if (sourceStar && sourceStar.ownerId === fleet.ownerId) {
                // Proportional damage based on fleet contribution
                const proportion = fleet.shipCount / totalAttackForce;
                const kills = Math.floor(killsOnAttacker * proportion);
                const disabled = Math.floor(disabledOnAttacker * proportion);

                sourceStar.removeActiveShips(kills);
                sourceStar.takeDamage(disabled);
                sourceStar.markCombat(this.tick);
            }
        });

        // ====================================================================
        // COMBAT TELEMETRY - Per visual-telemetry skill
        // Format: ATTACKER(ships) [type] → DEFENDER(ships) [type], each side's losses, settings
        // ====================================================================
        const attackerSourceId = fleets.length > 0 ? fleets[0].sourceId : 'unknown';
        const attackerStar = fleets.length > 0 ? this.stars.get(fleets[0].sourceId) : null;
        log.combatBattle(
            this.tick,
            { id: attackerSourceId, ships: totalAttackForce, starType: attackerStar?.starType },
            { id: targetId, ships: totalDefenders, starType: target.starType },
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

        // Push to UI Combat Log Panel
        combatLog.add({
            tick: this.tick,
            attacker: {
                id: attackerSourceId,
                ships: Math.floor(totalAttackForce),
                starType: attackerStar?.starType || 'grey',
                ownerId: attackerStar?.ownerId || strongestAttackerId || 'unknown',
                kills: killsOnAttacker,
                disabled: disabledOnAttacker
            },
            defender: {
                id: targetId,
                ships: Math.floor(totalDefenders),
                starType: target.starType,
                ownerId: ownerId,
                kills: killsOnDefender,
                disabled: disabledOnDefender
            },
            settings: {
                aggressor: GAME_CONFIG.AGGRESSOR_ADVANTAGE,
                damage: GAME_CONFIG.DAMAGE_PER_SHIP,
                lethality: GAME_CONFIG.LETHALITY,
                forceRatio: GAME_CONFIG.FORCE_RATIO_EFFECT,
                repairRate: GAME_CONFIG.REPAIR_RATE
            },
            result: target.activeShips > 0 ? 'DEFENSE' : 'FALLING'
        });

        const remainingActive = target.activeShips;

        // CONQUEST CONDITION: Overwhelm (use configurable threshold)
        // FIX: Use totalAttackForce to account for multiple sources
        const overwhelmThreshold = totalAttackForce / GAME_CONFIG.CONQUEST_THRESHOLD;

        if (remainingActive <= 0 || remainingActive <= overwhelmThreshold) {
            // CONQUEST with Scatter/Escape Logic (V3)
            if (strongestAttackerId) {
                const defenderTotal = target.totalShips;
                const defenderId = ownerId;

                // 1. Check for Directed Retreat (defender has active order to friendly star)
                let isRetreating = false;
                let retreatTargetId: string | null = null;
                if (target.targetId) {
                    const retreatDest = this.stars.get(target.targetId);
                    if (retreatDest && retreatDest.ownerId === defenderId) {
                        isRetreating = true;
                        retreatTargetId = target.targetId;
                    }
                }

                // 2. Find Escape Routes (connected friendly stars)
                const escapeRoutes: typeof target[] = [];
                if (!isRetreating) {
                    this.connections.forEach(conn => {
                        const connectedId = conn.sourceId === targetId ? conn.targetId :
                            conn.targetId === targetId ? conn.sourceId : null;
                        if (connectedId) {
                            const neighbor = this.stars.get(connectedId);
                            if (neighbor && neighbor.ownerId === defenderId) {
                                escapeRoutes.push(neighbor);
                            }
                        }
                    });
                }

                // 3. Capture Rates (V3 spec)
                let captureRate: number;
                if (isRetreating) {
                    captureRate = 0.35; // 35% captured, 65% escapes
                } else if (escapeRoutes.length > 0) {
                    captureRate = 0.50; // 50% captured, 25% destroyed, 25% scatter
                } else {
                    captureRate = 1.0; // 100% captured
                }

                // 4. Process Defender Ships
                const shipsCaptured = Math.floor(defenderTotal * captureRate);
                let shipsEscaping = 0;

                if (isRetreating) {
                    shipsEscaping = defenderTotal - shipsCaptured;
                } else if (escapeRoutes.length > 0) {
                    const remaining = defenderTotal - shipsCaptured;
                    const shipsDestroyed = Math.floor(remaining * 0.5);
                    shipsEscaping = remaining - shipsDestroyed;
                }

                // 5. Execute Escape
                if (isRetreating && retreatTargetId && shipsEscaping > 0) {
                    const dest = this.stars.get(retreatTargetId);
                    if (dest) {
                        dest.addActiveShips(shipsEscaping);
                        log.success('Combat', `${shipsEscaping} ships retreat from ${targetId} to ${retreatTargetId}`);
                    }
                } else if (escapeRoutes.length > 0 && shipsEscaping > 0) {
                    const perRoute = Math.floor(shipsEscaping / escapeRoutes.length);
                    let remainder = shipsEscaping % escapeRoutes.length;
                    escapeRoutes.forEach(route => {
                        const toAdd = perRoute + (remainder > 0 ? 1 : 0);
                        remainder = Math.max(0, remainder - 1);
                        route.addActiveShips(toAdd);
                    });
                    log.success('Combat', `${shipsEscaping} ships scatter from ${targetId} to ${escapeRoutes.length} neighbors`);
                }

                // 6. Execute Conquest
                target.clearShips();
                target.setOwner(strongestAttackerId);
                target.addActiveShips(shipsCaptured); // Captured ships go to new owner

                // 7. Transfer 50% of attacking ships from source stars (V3 occupation)
                let totalTransferred = 0;
                fleets.forEach(f => {
                    if (f.ownerId === strongestAttackerId) {
                        const source = this.stars.get(f.sourceId);
                        if (source && source.ownerId === strongestAttackerId) {
                            const transferPct = GAME_CONFIG.CONQUEST_TRANSFER_PERCENTAGE / 100;
                            const toTransfer = Math.floor(source.activeShips * transferPct);
                            if (toTransfer > 0) {
                                source.removeActiveShips(toTransfer);
                                target.addActiveShips(toTransfer);
                                totalTransferred += toTransfer;
                            }
                        }
                    }
                });
                if (totalTransferred > 0) {
                    log.success('Combat', `${totalTransferred} ships transferred to occupy ${targetId}`);
                }

                this.starsCaptured++;

                logCombat({
                    tick: this.tick,
                    starId: targetId,
                    attackers: maxAttackForce,
                    defenders: totalDefenders,
                    damage: killsOnDefender + disabledOnDefender,
                    result: 'CONQUEST',
                    formula: `Captured: ${shipsCaptured}, Escaped: ${shipsEscaping}`
                });
            }
        } else {
            // DEFENSE HOLD
            logCombat({
                tick: this.tick,
                starId: targetId,
                attackers: maxAttackForce,
                defenders: totalDefenders,
                damage: killsOnDefender + disabledOnDefender,
                result: 'DEFENSE',
                formula: `Remaining: ${target.activeShips} Active`
            });
        }
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

    createLink(sourceId: StarId, targetId: StarId): boolean {
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

        // New order replaces old order (source can only target one star)
        source.setTarget(targetId);
        return true;
    }

    cancelLink(starId: StarId): void {
        const star = this.stars.get(starId);
        if (star && star.ownerId === this.humanPlayerId) {
            star.setTarget(null);
        }
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
        const entry: import('$lib/types/game.types').GameHistoryEntry = {
            tick: this.tick,
            players: []
        };

        this.players.forEach(player => {
            if (!player.isEliminated) {
                entry.players.push({
                    id: player.id,
                    totalShips: this.getPlayerShipCount(player.id),
                    starCount: this.getPlayerStarCount(player.id)
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
                starCount: this.getPlayerStarCount(winner.id)
            };
        }
        return null;
    }

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

export function createEngine(config: EngineConfig): GameEngine {
    return new GameEngine(config);
}
