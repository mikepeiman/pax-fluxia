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
import { resolveMultiSourceCombat as sharedResolveCombat } from "../combatResolution";
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
    static processInput(state: GameRoomState, input: GameInput, config: Partial<EngineConfig> = {}): void {
        const cfg: EngineConfig = { ...DEFAULT_ENGINE_CONFIG, ...config };
        switch (input.type) {
            case "ISSUE_ORDER":
                this.issueOrder(state, input, cfg);
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

    private static issueOrder(state: GameRoomState, input: IssueOrderInput, cfg: EngineConfig): void {
        const source = state.stars.get(input.sourceId);
        if (!source) return;

        // Security: Only owner can issue orders
        if (source.ownerId !== input.playerId) return;

        // Validate connection exists
        const connected = this.areConnected(state, input.sourceId, input.targetId);
        if (!connected) return;

        // Prevent same-player opposing loops (A→B and B→A by same owner).
        // Cross-player mutual combat is always allowed — that's normal gameplay.
        if (!cfg.ALLOW_OPPOSING_ORDERS) {
            const target = state.stars.get(input.targetId);
            if (target && target.targetId === input.sourceId && target.ownerId === source.ownerId) {
                target.targetId = '';
            }
        }

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
    // COMBAT RESOLUTION — delegates to shared standalone function
    // ════════════════════════════════════════════════════════════════════════

    private static resolveMultiSourceCombat(
        state: GameRoomState,
        attackers: StarSchema[],
        defender: StarSchema,
        cfg: EngineConfig,
        events: TickEvents
    ): void {
        // Build conquest context for neighbor lookups
        const ctx: ConquestContext = {
            getNeighborIds: (starId: string) => this.getNeighborIds(state, starId),
            getStar: (id: string) => state.stars.get(id) as any,
        };

        // Delegate to shared standalone function
        const result = sharedResolveCombat(
            attackers as any[],
            defender as any,
            ctx,
            cfg,
            state.tick
        );

        if (!result.occurred) return;

        // Emit combat event (if damage was dealt, not just instant-conquest-with-no-defenders)
        if (result.defenderForce > 0) {
            events.combats.push({
                tick: state.tick,
                attackerIds: result.attackerDamage.map((a: { starId: string }) => a.starId),
                attackerOwnerId: attackers.find((a: StarSchema) => a.activeShips > 0)?.ownerId ?? attackers[0].ownerId,
                defenderId: defender.id,
                defenderOwnerId: defender.ownerId,
                totalAttackForce: result.totalAttackShips,
                defenderForce: result.defenderForce,
                killsOnDefender: result.defenderKills,
                disabledOnDefender: result.defenderDisabled,
                killsOnAttacker: result.attackerDamage.reduce((s: number, a: { kills: number }) => s + a.kills, 0),
                disabledOnAttacker: result.attackerDamage.reduce((s: number, a: { disabled: number }) => s + a.disabled, 0),
                conquered: result.conquest !== null,
            });
        }

        // Emit conquest event if conquest occurred
        if (result.conquest && result.victorStarId) {
            const victor = state.stars.get(result.victorStarId);
            events.conquests.push({
                tick: state.tick,
                starId: defender.id,
                attackerStarId: result.victorStarId,
                attackerStarIds: result.conquest.perStarTransfers.map(t => t.starId),
                attackerShipTransfers: result.conquest.perStarTransfers.map(t => t.shipsTransferred),
                previousOwner: result.conquest.previousOwner,
                newOwner: victor?.ownerId ?? '',
                shipsCaptured: result.conquest.shipsCaptured,
                shipsEscaped: result.conquest.shipsEscaped,
                shipsDestroyed: result.conquest.shipsDestroyed,
                shipsTransferred: result.conquest.shipsTransferred,
                conquestType: result.conquest.conquestType,
                retreatTargetId: result.conquest.retreatTargetId,
                scatterTargetIds: result.conquest.scatterTargetIds,
                scatterShipCounts: result.conquest.scatterShipCounts,
            });

            // Void other players' orders to the conquered star
            state.stars.forEach(star => {
                if (star.targetId === defender.id && star.ownerId !== (victor?.ownerId ?? '')) {
                    star.targetId = "";
                }
            });
        }
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

    public static updatePlayerStats(state: GameRoomState): void {
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
