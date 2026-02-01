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
    CombatResult
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
import { GAME_CONFIG } from '$lib/config/game.config';
import { createFleet, type Fleet } from './Fleet';
import { logCombat } from '$lib/utils/CombatLogger';
import { resolveMultiwayCombat } from './CombatRules';
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
        this.initializeMap();
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

            // Determine color type
            let colorType: StarColor = 'grey';
            if (isCapital) {
                // Capital (User didn't specify color for Capital, assuming white/grey or specific?)
                // User map: Yellow(Prod), Green(Att), Red(Def), Blue(Mov), Purple(Rep), Grey(None).
                // Let's stick to Standard 'grey' for capital unless user specifies, OR maybe Yellow for prod?
                // Actually, let's keep it 'grey' (Standard) to be safe, or 'red' if defensive?
                // Re-reading user request: "Stars: yellow (production) green (att) red (def) blue (mov) purple (repair) grey (no bonus)"
                // Capital should probably be a good all-rounder, or maybe just standard Grey.
                // I will set it to 'grey' to avoid assumption, or maybe 'yellow' for production start?
                // Let's use 'grey' to be safe.
                colorType = 'grey';
            } else {
                // Weighted random for other types
                const rand = Math.random();
                if (rand < 0.3) colorType = 'grey';
                else if (rand < 0.5) colorType = 'yellow';
                else if (rand < 0.65) colorType = 'red';
                else if (rand < 0.8) colorType = 'green';
                else if (rand < 0.9) colorType = 'purple';
                else if (rand < 0.95) colorType = 'blue';
                else colorType = 'grey'; // fallback
            }

            starsAssigned++;

            const star = createStar({
                x: pos.x,
                y: pos.y,
                radius: 25,
                productionRate: 1,
                ownerId: ownerId,
                colorType: colorType
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
        const arrivals: Fleet[] = [];

        this.stars.forEach(source => {
            if (!source.targetId) return;

            const target = this.stars.get(source.targetId);
            if (!target) return;

            // Calculate Flow Amount (Uses Config)
            const flowPercentage = GAME_CONFIG.FLOW_PERCENTAGE || 0.25;
            const flowAmount = Math.max(GAME_CONFIG.MIN_FLOW_SHIPS, Math.floor(source.activeShips * flowPercentage));

            if (flowAmount === 0 || source.activeShips === 0) return;

            const shipped = source.removeActiveShips(flowAmount);
            if (shipped === 0) return;

            const fleetId = `transfer-${this.tick}-${source.id}-${target.id}`;
            const transferPacket = createFleet({
                id: fleetId,
                sourceId: source.id,
                targetId: target.id,
                ownerId: source.ownerId,
                shipCount: shipped,
                totalDistance: 100, // Dummy
                speed: 0
            });

            this.transfers.push(transferPacket);
            arrivals.push(transferPacket);
        });

        if (arrivals.length > 0) {
            this.handleFleetArrivals(arrivals);
        }
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
        const DAMAGE_RATE = GAME_CONFIG.DAMAGE_RATE ?? 0.5; // Configurable
        const DEFENSE_MULT = GAME_CONFIG.DEFENSE_MULTIPLIER ?? 1.5;

        // 2. Calculate Damage
        let totalDamageIncoming = 0;
        let strongestAttackerId: PlayerId | null = null;
        let maxAttackForce = 0;

        forces.forEach((force, playerId) => {
            if (playerId !== ownerId) {
                // Formula: Damage = Force * Rate / DefenseMult
                // Defender takes reduced damage based on multiplier
                const effectiveDamage = (force * DAMAGE_RATE) / DEFENSE_MULT;
                totalDamageIncoming += effectiveDamage;

                // Return Fire (Defender damages attacker source)
                // We need to find the SOURCE star for this valid attack??
                // Wait, fleets don't store "Source Star ID", just "Source ID".
                // Actually they do: fleet.sourceId.
                // But we grouped by PlayerID, losing source info?
                // We need to iterate fleets to apply return fire.
                // Optimization: Total Def power applies to ALL attackers? Or split?
                // Logic: Defender fires at ALL incoming vectors simultaneously (omnidirectional).
                // Strength = (Active + Damaged) * Rate? Or just Active?
                // Let's use Active for damage output.
                const defenseOutput = (target.activeShips * DAMAGE_RATE);

                // Which fleet gets hit? We must find the fleets for this player.
                const playerFleets = fleets.filter(f => String(f.ownerId) === playerId);
                playerFleets.forEach(f => {
                    const sourceStar = this.stars.get(f.sourceId);
                    if (sourceStar && sourceStar.ownerId === f.ownerId) {
                        // Apply fractional damage proportional to fleet size?
                        // Or full damage? "Remote Engagement" = Direct link.
                        // Let's simply apply based on connection.
                        // If mutiple sources, defender splits fire? Or full fire?
                        // Let's do: Damage = DefensePower * (Fleet / TotalAttackingForce)
                        // Proportional return fire.
                        const proportion = f.shipCount / force;
                        sourceStar.takeDamage(defenseOutput * proportion);
                        sourceStar.markCombat(this.tick);
                    }
                });

                if (force > maxAttackForce) {
                    maxAttackForce = force;
                    strongestAttackerId = playerId;
                }
            } else {
                target.addActiveShips(force);
            }
        });

        if (totalDamageIncoming === 0) return; // No combat

        // Mark combat to inhibit repair
        target.markCombat(this.tick);

        // 3. Apply Damage to Star
        target.takeDamage(totalDamageIncoming);

        const remainingActive = target.activeShips;

        // CONQUEST CONDITION: Overwhelm
        // If Active <= 0 OR Active <= (Attacker / 7)
        const overwhelmThreshold = maxAttackForce / 7;

        if (remainingActive <= 0 || remainingActive <= overwhelmThreshold) {
            // CONQUEST
            if (strongestAttackerId) {
                const survivorCount = Math.max(0, maxAttackForce - totalDefenders); // Simple subtraction for survival?
                // Or just keep the active ships at the star?
                // Conquest flips ownership. 
                // Damaged ships:
                // User said: "50% destroyed / captured"?
                // Let's capture 50% of damaged ships.
                const capturedDamaged = Math.floor(target.damagedShips * 0.5);

                target.setOwner(strongestAttackerId);
                target.addActiveShips(Math.floor(survivorCount)); // Add surviving attackers?
                // Actually, maxAttackForce is "virtual" pressure from remote.
                // Ships don't "travel" to occupy in this model?
                // Wait, PRD says "NO TRAVEL". So "Occupation" means transferring ships?
                // PRD 2.2.4: "Transfer 50% of the Winner's ships instantly teleport".
                // We need to deduct from Source?
                // Complex... For now, let's just Spawn 10 ships as starter? 
                // Or assume the "survivorCount" represents the transferred force.

                this.starsCaptured++;

                logCombat({
                    tick: this.tick,
                    starId: targetId,
                    attackers: maxAttackForce,
                    defenders: totalDefenders,
                    damage: totalDamageIncoming,
                    result: 'CONQUEST',
                    formula: `Atk ${maxAttackForce} vs Def ${totalDefenders}`
                });
            }
        } else {
            // DEFENSE HOLD
            logCombat({
                tick: this.tick,
                starId: targetId,
                attackers: maxAttackForce,
                defenders: totalDefenders,
                damage: totalDamageIncoming,
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
            const decisions = ai.evaluate(allStars);

            decisions.forEach(decision => {
                // Issue orders
                // We need an internal issueOrder that doesn't check 'humanPlayerId'
                const source = this.stars.get(decision.sourceId);
                // Handle Retreat (targetId null)
                if (decision.targetId === null) {
                    if (source && source.ownerId === playerId) {
                        source.setTarget(null);
                        // log.sys('AI', `Player ${playerId} retreating from ${source.id}`);
                    }
                    return;
                }

                const target = this.stars.get(decision.targetId);
                if (source && target && source.ownerId === playerId) {
                    source.setTarget(target.id);
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

        // FIX: Prevent Opposite Flow (A->B and B->A loop)
        // If target was sending to source, CANCEL target's link.
        if (target.targetId === sourceId) {
            target.setTarget(null);
            log.sys('GameEngine', `Cancelled opposite link from ${targetId} to ${sourceId}`);
        }

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
