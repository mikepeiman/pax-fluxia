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
import type { GameInput, IssueOrderInput, CancelOrderInput, SetDeferredOrderInput } from "./GameInput";

// ============================================================================
// Configuration (can be overridden by caller)
// ============================================================================

export interface GameEngineConfig {
    TRANSFER_RATE: number;
    MIN_SHIPS_PER_TRANSFER: number;
    PRODUCTION_BASE: number;
    REPAIR_RATE: number;
}

export const DEFAULT_ENGINE_CONFIG: GameEngineConfig = {
    TRANSFER_RATE: 0.25,
    MIN_SHIPS_PER_TRANSFER: 1,
    PRODUCTION_BASE: 1,
    REPAIR_RATE: 0.2
};

// ============================================================================
// GameEngine - Static Methods Only
// ============================================================================

export class GameEngine {
    // ════════════════════════════════════════════════════════════════════════
    // MAIN TICK - Called every game tick
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Execute one game tick on the provided state
     * @param state - The game state (Colyseus Schema)
     * @param config - Optional config overrides
     */
    static tick(state: GameRoomState, config: Partial<GameEngineConfig> = {}): void {
        const cfg = { ...DEFAULT_ENGINE_CONFIG, ...config };

        // Skip if paused or not playing
        if (state.isPaused || state.phase !== "playing") return;

        // Increment tick counter
        state.tick++;

        // 1. PRODUCTION - Stars generate ships
        this.processProduction(state, cfg);

        // 2. ORDERS - Process attacks and reinforcements
        this.processOrders(state, cfg);

        // 3. REPAIR - Damaged ships repair
        this.processRepair(state, cfg);

        // 4. PLAYER STATS - Update player totals
        this.updatePlayerStats(state);

        // 5. WIN CHECK
        this.checkWinCondition(state);
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

    private static processProduction(state: GameRoomState, cfg: GameEngineConfig): void {
        state.stars.forEach(star => {
            if (!star.ownerId || star.ownerId === "neutral") return;

            // Each star produces ships equal to its productionRate
            star.activeShips += star.productionRate;
        });
    }

    // ════════════════════════════════════════════════════════════════════════
    // ORDER PROCESSING - Multi-star aggregation
    // ════════════════════════════════════════════════════════════════════════

    private static processOrders(state: GameRoomState, cfg: GameEngineConfig): void {
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
            const transferAmount = Math.max(
                cfg.MIN_SHIPS_PER_TRANSFER,
                Math.floor(source.activeShips * cfg.TRANSFER_RATE)
            );

            if (transferAmount > 0 && source.activeShips > 0) {
                const shipped = Math.min(transferAmount, source.activeShips);
                source.activeShips -= shipped;
                target.activeShips += shipped;
            }
        });

        // Phase 3: Resolve attacks (multi-star aggregation)
        attacksByTarget.forEach((attackers, targetId) => {
            const target = state.stars.get(targetId);
            if (target) {
                this.resolveMultiSourceCombat(state, attackers, target);
            }
        });
    }

    // ════════════════════════════════════════════════════════════════════════
    // COMBAT RESOLUTION
    // ════════════════════════════════════════════════════════════════════════

    private static resolveMultiSourceCombat(
        state: GameRoomState,
        attackers: StarSchema[],
        defender: StarSchema
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
        const defenderForce = getEffectiveDefenderForce(
            defender.activeShips,
            defender.damagedShips
        );

        // Instant conquest if no defenders
        if (defenderForce <= 0) {
            const victor = contributions.reduce((a, b) =>
                a.force > b.force ? a : b
            ).attacker;
            this.executeConquest(state, victor, defender);
            return;
        }

        // Calculate combat damage
        const defenderIsAttacking = !!defender.targetId;
        const result = calculateCombat(
            defenderForce,
            totalAttackForce,
            defenderIsAttacking,
            true
        );

        // Apply damage to defender
        const defenderTotalDamage = result.killsOnA + result.disabledOnA;
        defender.activeShips = Math.max(0, defender.activeShips - defenderTotalDamage);
        defender.damagedShips += result.disabledOnA;

        // Apply proportional damage to attackers
        contributions.forEach(({ attacker, force }) => {
            const proportion = force / totalAttackForce;
            const kills = Math.floor(result.killsOnB * proportion);
            const disabled = Math.floor(result.disabledOnB * proportion);
            const totalDamage = kills + disabled;

            attacker.activeShips = Math.max(0, attacker.activeShips - totalDamage);
            attacker.damagedShips += disabled;

            if (attacker.activeShips <= 0) {
                attacker.targetId = "";
            }
        });

        // Check conquest threshold
        if (defender.activeShips <= 0 || checkConquestThreshold(defender.activeShips, totalAttackForce)) {
            const victor = contributions.reduce((a, b) =>
                a.force > b.force ? a : b
            ).attacker;
            this.executeConquest(state, victor, defender);
        }
    }

    private static executeConquest(
        state: GameRoomState,
        attacker: StarSchema,
        defender: StarSchema
    ): void {
        const previousOwner = defender.ownerId;

        // Transfer ownership
        defender.ownerId = attacker.ownerId;

        // Transfer 50% of attacker's ships
        const transferAmount = Math.floor(attacker.activeShips * 0.5);
        attacker.activeShips -= transferAmount;
        defender.activeShips = transferAmount;
        defender.damagedShips = 0;

        // Clear orders
        defender.targetId = "";

        // Apply queued order if exists
        if (defender.queuedOrderTargetId) {
            defender.targetId = defender.queuedOrderTargetId;
            defender.queuedOrderTargetId = "";
        }

        // Clear attacker's order
        attacker.targetId = "";

        // Void other players' orders to this star
        state.stars.forEach(star => {
            if (star.targetId === defender.id && star.ownerId !== attacker.ownerId) {
                star.targetId = "";
            }
        });
    }

    // ════════════════════════════════════════════════════════════════════════
    // REPAIR PROCESSING
    // ════════════════════════════════════════════════════════════════════════

    private static processRepair(state: GameRoomState, cfg: GameEngineConfig): void {
        state.stars.forEach(star => {
            if (star.damagedShips <= 0) return;

            const repaired = Math.max(1, Math.floor(star.damagedShips * cfg.REPAIR_RATE));
            const actualRepair = Math.min(repaired, star.damagedShips);

            star.damagedShips -= actualRepair;
            star.activeShips += actualRepair;
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
            state.winnerId = activePlayers[0].id;
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
}
