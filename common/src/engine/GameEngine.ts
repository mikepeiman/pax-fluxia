// ============================================================================
// GameEngine - Stateless Game Logic Processor
// ============================================================================
// This engine has NO STATE. All methods are static and operate on injected state.
// This allows the same logic to run on:
//   - Server (authoritative, with Colyseus Schema)
//   - Client (prediction, instant feedback)

import {
    GameRoomState,
    StarSchema,
    ConnectionSchema,
    PlayerSchema
} from "../schema/GameState";
import { calculateCombat, getEffectiveDefenderForce, checkConquestThreshold, COMBAT_CONFIG } from "../combat";
import { applyProduction, applyRepair } from "../production";
import { applyConquest } from "../conquest";
import type { ConquestContext } from "../conquest";
import type { EngineConfig } from "../config";
import { DEFAULT_ENGINE_CONFIG, STAR_TYPE_STATS } from "../config";
import type { StarType } from "../types";
import type { GameInput, IssueOrderInput, CancelOrderInput, SetDeferredOrderInput } from "./GameInput";
import type { TickEvents } from "./TickEvents";
import { createEmptyTickEvents } from "./TickEvents";

// ============================================================================
// Configuration (can be overridden by caller)
// ============================================================================

// Re-export config types for consumers
export type { EngineConfig };
export { DEFAULT_ENGINE_CONFIG };

// ============================================================================
// GameEngine - Static Methods Only
// ============================================================================

export class GameEngine {
    // ════════════════════════════════════════════════════════════════════════
    // MAIN TICK - Called every game tick
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Execute one game tick. Mutates state in place.
     * Returns TickEvents for server to broadcast to clients (animations, combat logs).
     */
    static tick(state: GameRoomState, config: Partial<EngineConfig> = {}): TickEvents {
        const cfg: EngineConfig = { ...DEFAULT_ENGINE_CONFIG, ...config };
        const events = createEmptyTickEvents();

        // Skip if paused or not playing
        if (state.isPaused || state.phase !== "playing") return events;

        // Increment tick counter
        state.tick++;

        // 1. PRODUCTION - Stars generate ships
        this.processProduction(state, cfg);

        // 2. ORDERS - Process attacks and reinforcements (collects events)
        this.processOrders(state, cfg, events);

        // 3. REPAIR - Damaged ships repair
        this.processRepair(state, cfg);

        // 4. PLAYER STATS - Update player totals
        this.updatePlayerStats(state);

        // 5. WIN CHECK
        this.checkWinCondition(state);

        return events;
    }

    // ════════════════════════════════════════════════════════════════════════
    // INPUT PROCESSING - Handle player commands
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Process a player input command
     * @param state - The game state
     * @param input - The input to process
     */
    static processInput(state: GameRoomState, input: GameInput): void {
        switch (input.type) {
            case "ISSUE_ORDER":
                this.issueOrder(state, input);
                break;
            case "CANCEL_ORDER":
                this.cancelOrder(state, input);
                break;
            case "SET_DEFERRED_ORDER":
                this.setDeferredOrder(state, input);
                break;
            case "PAUSE":
                state.isPaused = true;
                break;
            case "RESUME":
                state.isPaused = false;
                break;
            case "SET_SPEED":
                state.speed = input.speed;
                break;
            case "START_GAME":
                if (state.phase === "lobby") {
                    state.phase = "playing";
                    state.isPaused = false;
                }
                break;
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // ORDER LOGIC
    // ════════════════════════════════════════════════════════════════════════

    private static issueOrder(state: GameRoomState, input: IssueOrderInput): void {
        const source = state.stars.get(input.sourceId);
        if (!source) return;

        // Security: Only owner can issue orders
        if (source.ownerId !== input.playerId) return;

        // Validate connection exists
        const connected = this.areConnected(state, input.sourceId, input.targetId);
        if (!connected) return;

        // Set order
        source.targetId = input.targetId;
    }

    private static cancelOrder(state: GameRoomState, input: CancelOrderInput): void {
        const star = state.stars.get(input.starId);
        if (!star) return;

        // Security: Only owner can cancel orders
        if (star.ownerId !== input.playerId) return;

        star.targetId = "";
        star.queuedOrderTargetId = "";
    }

    private static setDeferredOrder(state: GameRoomState, input: SetDeferredOrderInput): void {
        const star = state.stars.get(input.starId);
        if (!star) return;

        // Deferred orders can be set on enemy stars (will activate on conquest)
        star.queuedOrderTargetId = input.targetId;
    }

    // ════════════════════════════════════════════════════════════════════════
    // PRODUCTION PROCESSING
    // ════════════════════════════════════════════════════════════════════════

    private static processProduction(state: GameRoomState, cfg: EngineConfig): void {
        state.stars.forEach(star => {
            applyProduction(star, cfg);
        });
    }

    // ════════════════════════════════════════════════════════════════════════
    // ORDER PROCESSING - Multi-star aggregation
    // ════════════════════════════════════════════════════════════════════════

    private static processOrders(state: GameRoomState, cfg: EngineConfig, events: TickEvents): void {
        // Phase 1: Collect and group orders
        const attacksByTarget = new Map<string, StarSchema[]>();
        const reinforcements: { source: StarSchema; target: StarSchema }[] = [];

        state.stars.forEach(source => {
            if (!source.targetId) return;

            const target = state.stars.get(source.targetId);
            if (!target) return;

            const isAttack = source.ownerId !== target.ownerId;

            if (isAttack) {
                if (!attacksByTarget.has(target.id)) {
                    attacksByTarget.set(target.id, []);
                }
                attacksByTarget.get(target.id)!.push(source);
            } else {
                reinforcements.push({ source, target });
            }
        });

        // Phase 2: Process reinforcements
        reinforcements.forEach(({ source, target }) => {
            // Transfer rate: global base rate × star-type speed multiplier
            // (Blue stars have speed=2, so they transfer at 2× the global rate)
            const starType = (source.starType || 'grey') as StarType;
            const speedMultiplier = STAR_TYPE_STATS[starType]?.speed ?? 1;
            const effectiveRate = cfg.TRANSFER_RATE * speedMultiplier;
            const transferAmount = Math.max(
                cfg.MIN_SHIPS_PER_TRANSFER,
                Math.ceil(source.activeShips * effectiveRate)
            );

            if (transferAmount > 0 && source.activeShips > 0) {
                const shipped = Math.min(transferAmount, Math.floor(source.activeShips));
                source.activeShips -= shipped;
                target.activeShips += shipped;

                // Emit transfer event for client animations
                events.transfers.push({
                    sourceId: source.id,
                    targetId: target.id,
                    ownerId: source.ownerId,
                    shipCount: shipped,
                });
            }
        });

        // Phase 3: Resolve attacks (multi-star aggregation)
        attacksByTarget.forEach((attackers, targetId) => {
            const target = state.stars.get(targetId);
            if (target) {
                this.resolveMultiSourceCombat(state, attackers, target, cfg, events);
            }
        });
    }

    // ════════════════════════════════════════════════════════════════════════
    // COMBAT RESOLUTION
    // ════════════════════════════════════════════════════════════════════════

    private static resolveMultiSourceCombat(
        state: GameRoomState,
        attackers: StarSchema[],
        defender: StarSchema,
        cfg: EngineConfig,
        events: TickEvents
    ): void {
        // Filter valid attackers
        const validAttackers = attackers.filter(attacker => {
            if (attacker.activeShips <= 0) {
                attacker.targetId = "";
                return false;
            }
            if (attacker.targetId !== defender.id) {
                return false;
            }
            return true;
        });

        if (validAttackers.length === 0) return;

        // Calculate total attacking force
        let totalAttackForce = 0;
        const contributions: { attacker: StarSchema; force: number }[] = [];

        validAttackers.forEach(attacker => {
            const force = attacker.activeShips;
            totalAttackForce += force;
            contributions.push({ attacker, force });
        });

        // Calculate defender force (active + damaged at reduced effectiveness)
        const defenderForce = defender.activeShips +
            Math.floor(defender.damagedShips * cfg.DAMAGED_SHIP_EFFECTIVENESS);

        // Instant conquest if no defenders
        if (defenderForce <= 0) {
            const victor = contributions.reduce((a, b) =>
                a.force > b.force ? a : b
            ).attacker;
            this.executeConquest(state, victor, defender, cfg, events);
            return;
        }

        // Calculate combat damage using config-driven values
        const defenderIsAttacking = !!defender.targetId;
        const result = calculateCombat(
            defenderForce,
            totalAttackForce,
            defenderIsAttacking,
            true,
            {
                DAMAGE_PER_SHIP: cfg.DAMAGE_PER_SHIP,
                LETHALITY: cfg.LETHALITY,
                AGGRESSOR_ADVANTAGE: cfg.AGGRESSOR_ADVANTAGE,
                FORCE_RATIO_EFFECT: cfg.FORCE_RATIO_EFFECT,
                MINIMUM_DAMAGE: cfg.MINIMUM_DAMAGE,
                CONQUEST_THRESHOLD: cfg.CONQUEST_THRESHOLD,
            }
        );

        // Apply damage to defender
        const defenderTotalDamage = result.killsOnA + result.disabledOnA;
        defender.activeShips = Math.max(0, defender.activeShips - defenderTotalDamage);
        defender.damagedShips += result.disabledOnA;

        // Mark combat for repair pinning penalty (both sides)
        defender.lastCombatTick = state.tick;

        // Apply proportional damage to attackers
        contributions.forEach(({ attacker, force }) => {
            const proportion = force / totalAttackForce;
            const kills = Math.floor(result.killsOnB * proportion);
            const disabled = Math.floor(result.disabledOnB * proportion);
            const totalDamage = kills + disabled;

            attacker.activeShips = Math.max(0, attacker.activeShips - totalDamage);
            attacker.damagedShips += disabled;

            // Mark combat on attacker too
            attacker.lastCombatTick = state.tick;

            if (attacker.activeShips <= 0) {
                attacker.targetId = "";
            }
        });

        // Emit combat event
        events.combats.push({
            tick: state.tick,
            attackerIds: validAttackers.map(a => a.id),
            attackerOwnerId: validAttackers[0].ownerId,
            defenderId: defender.id,
            defenderOwnerId: defender.ownerId,
            totalAttackForce,
            defenderForce,
            killsOnDefender: result.killsOnA,
            disabledOnDefender: result.disabledOnA,
            killsOnAttacker: result.killsOnB,
            disabledOnAttacker: result.disabledOnB,
            conquered: false,
        });

        // Check conquest threshold
        if (defender.activeShips <= 0 || checkConquestThreshold(defender.activeShips, totalAttackForce)) {
            const victor = contributions.reduce((a, b) =>
                a.force > b.force ? a : b
            ).attacker;
            // Mark the last combat event as conquered
            events.combats[events.combats.length - 1].conquered = true;
            this.executeConquest(state, victor, defender, cfg, events);
        }
    }

    private static executeConquest(
        state: GameRoomState,
        attacker: StarSchema,
        defender: StarSchema,
        cfg: EngineConfig,
        events: TickEvents
    ): void {
        const previousOwner = defender.ownerId;

        // Build conquest context for neighbor lookups
        const ctx: ConquestContext = {
            getNeighborIds: (starId: string) => this.getNeighborIds(state, starId),
            getStar: (id: string) => state.stars.get(id) as any,
        };

        // Delegate to shared conquest function
        const conquestResult = applyConquest(attacker, defender as any, ctx, cfg);

        // Emit conquest event
        events.conquests.push({
            tick: state.tick,
            starId: defender.id,
            previousOwner,
            newOwner: attacker.ownerId,
            shipsCaptured: conquestResult.shipsCaptured,
            shipsEscaped: conquestResult.shipsEscaped,
            shipsDestroyed: conquestResult.shipsDestroyed,
            retreatTargetId: conquestResult.retreatTargetId,
            scatterTargetIds: conquestResult.scatterTargetIds,
            scatterShipCounts: conquestResult.scatterShipCounts,
        });

        // Void other players' orders to the conquered star
        state.stars.forEach(star => {
            if (star.targetId === defender.id && star.ownerId !== attacker.ownerId) {
                star.targetId = "";
            }
        });
    }

    // ════════════════════════════════════════════════════════════════════════
    // REPAIR PROCESSING
    // ════════════════════════════════════════════════════════════════════════

    private static processRepair(state: GameRoomState, cfg: EngineConfig): void {
        state.stars.forEach(star => {
            applyRepair(star, state.tick, cfg);
        });
    }

    // ════════════════════════════════════════════════════════════════════════
    // PLAYER STATS
    // ════════════════════════════════════════════════════════════════════════

    private static updatePlayerStats(state: GameRoomState): void {
        // Reset all player stats
        state.players.forEach(player => {
            player.starCount = 0;
            player.activeShips = 0;
            player.damagedShips = 0;
            player.totalShips = 0;
            player.production = 0;
        });

        // Aggregate from stars
        state.stars.forEach(star => {
            const player = state.players.get(star.ownerId);
            if (player) {
                player.starCount++;
                player.activeShips += star.activeShips;
                player.damagedShips += star.damagedShips;
                player.totalShips = player.activeShips + player.damagedShips;
                player.production += star.productionRate;
            }
        });

        // Check elimination
        state.players.forEach(player => {
            if (player.starCount === 0 && !player.isEliminated) {
                player.isEliminated = true;
            }
        });
    }

    // ════════════════════════════════════════════════════════════════════════
    // WIN CONDITION
    // ════════════════════════════════════════════════════════════════════════

    private static checkWinCondition(state: GameRoomState): void {
        const activePlayers = Array.from(state.players.values())
            .filter(p => !p.isEliminated);

        if (activePlayers.length === 1) {
            // Use sessionId since that's how players are keyed in the map
            state.winnerId = activePlayers[0].sessionId || activePlayers[0].id;
            state.phase = "ended";
        } else if (activePlayers.length === 0) {
            state.phase = "ended";
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ════════════════════════════════════════════════════════════════════════

    private static areConnected(state: GameRoomState, sourceId: string, targetId: string): boolean {
        for (const conn of state.connections) {
            if (conn.sourceId === sourceId && conn.targetId === targetId) {
                return true;
            }
        }
        return false;
    }

    /** Get all neighbor star IDs connected to the given star */
    private static getNeighborIds(state: GameRoomState, starId: string): string[] {
        const neighbors: string[] = [];
        state.connections.forEach(conn => {
            if (conn.sourceId === starId) neighbors.push(conn.targetId);
            else if (conn.targetId === starId) neighbors.push(conn.sourceId);
        });
        return neighbors;
    }
}
