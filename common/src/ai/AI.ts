// ============================================================================
// AI - Three-zone attack model with strategies and anti-oscillation
// Shared between client (SP) and server (MP)
// ============================================================================

import type { Star, Connection, PlayerId, StarId, AILevel } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface AIDecision {
    sourceId: StarId;
    targetId: StarId | null; // null = cancel order
}

/** AI strategies affect target selection and aggression */
export type AIStrategy = 'aggressive' | 'opportunistic' | 'expansionist' | 'defensive';

/** Runtime-tunable AI behavior config (passed per evaluate call) */
export interface AIConfig {
    AI_MUST_ATTACK_RATIO: number;
    AI_ATTACK_UPPER_BOUNDS: number;
    AI_ATTACK_STICKINESS: number;
    AI_EVALUATION_FREQUENCY: number;
    AI_TACTICAL_AGGRESSION: number;
    /** Chance per evaluation to ignore ratio rules and attack anyway (0-1, default 0.05) */
    AI_RANDOM_AGGRESSION: number;
}

export const DEFAULT_AI_CONFIG: AIConfig = {
    AI_MUST_ATTACK_RATIO: 1.25,
    AI_ATTACK_UPPER_BOUNDS: 0.8,
    AI_ATTACK_STICKINESS: 0.5,
    AI_EVALUATION_FREQUENCY: 0.5,
    AI_TACTICAL_AGGRESSION: 0.1,
    AI_RANDOM_AGGRESSION: 0.05,
};

// ============================================================================
// AI Class
// ============================================================================

/**
 * AI - Three-zone attack model with strategy variety
 *
 * Attack zones (based on myShips/enemyShips ratio):
 *   ratio >= MUST_ATTACK_RATIO  → always attack
 *   ratio <  ATTACK_UPPER_BOUNDS → never initiate
 *   between → linear probability interpolation
 *
 * Strategies:
 *   aggressive    → attacks strongest neighbor, low retreat chance
 *   opportunistic → attacks weakest neighbor, standard retreat
 *   expansionist  → targets neutrals first, then weakest enemy
 *   defensive     → only attacks with overwhelming force, high stickiness
 */
export class AI {
    readonly playerId: PlayerId;
    readonly difficulty: AILevel;
    readonly strategy: AIStrategy;

    // Difficulty modifiers
    private readonly evalFreqMult: number;
    private readonly aggressionBonus: number; // Widens the "may attack" zone

    // Anti-oscillation: track how many ticks each star has been attacking
    private attackTicks: Map<StarId, number> = new Map();
    private readonly minAttackTicks: number; // Min ticks before retreat is allowed

    constructor(playerId: PlayerId, difficulty: AILevel = 'normal', strategy?: AIStrategy) {
        this.playerId = playerId;
        this.difficulty = difficulty;
        this.strategy = strategy ?? pickRandomStrategy();

        // Difficulty scales behavior
        switch (difficulty) {
            case 'easy':
                this.evalFreqMult = 0.5;
                this.aggressionBonus = -0.2; // Less aggressive
                this.minAttackTicks = 3;
                break;
            case 'normal':
                this.evalFreqMult = 1.0;
                this.aggressionBonus = 0;
                this.minAttackTicks = 5;
                break;
            case 'hard':
                this.evalFreqMult = 1.0;
                this.aggressionBonus = 0.15;
                this.minAttackTicks = 8;
                break;
            case 'expert':
                this.evalFreqMult = 1.0;
                this.aggressionBonus = 0.3;
                this.minAttackTicks = 12;
                break;
            default:
                this.evalFreqMult = 1.0;
                this.aggressionBonus = 0;
                this.minAttackTicks = 5;
        }
    }

    /**
     * Evaluate the game state and return decisions.
     * @param stars - All stars in the game
     * @param connections - All connections between stars
     * @param config - Runtime-tunable AI config (defaults to DEFAULT_AI_CONFIG)
     */
    evaluate(stars: Star[], connections: Connection[], config: AIConfig = DEFAULT_AI_CONFIG): AIDecision[] {
        const decisions: AIDecision[] = [];
        const myStars: Star[] = [];
        const starsById = new Map<StarId, Star>();
        for (const star of stars) {
            starsById.set(star.id, star);
            if (star.ownerId === this.playerId) {
                myStars.push(star);
            }
        }

        if (myStars.length === 0) return []; // Eliminated

        const neighborIdsByStarId = new Map<StarId, StarId[]>();
        for (const connection of connections) {
            const sourceNeighbors = neighborIdsByStarId.get(connection.sourceId);
            if (sourceNeighbors) {
                sourceNeighbors.push(connection.targetId);
            } else {
                neighborIdsByStarId.set(connection.sourceId, [connection.targetId]);
            }

            const targetNeighbors = neighborIdsByStarId.get(connection.targetId);
            if (targetNeighbors) {
                targetNeighbors.push(connection.sourceId);
            } else {
                neighborIdsByStarId.set(connection.targetId, [connection.sourceId]);
            }
        }

        // Read live config values
        const mustAttackRatio = config.AI_MUST_ATTACK_RATIO + this.aggressionBonus;
        const upperBounds = config.AI_ATTACK_UPPER_BOUNDS - (this.aggressionBonus * 0.5);
        const stickiness = config.AI_ATTACK_STICKINESS;
        const evalFreq = config.AI_EVALUATION_FREQUENCY * this.evalFreqMult;
        const tacticalAggression = config.AI_TACTICAL_AGGRESSION;
        const randomAggression = config.AI_RANDOM_AGGRESSION ?? 0;

        myStars.forEach(star => {
            // Evaluation frequency gate
            if (Math.random() > evalFreq) return;

            // ---------------------------------------------------------
            // ALREADY HAS TARGET: check continue, retreat, or re-target
            // ---------------------------------------------------------
            if (star.targetId) {
                const target = starsById.get(star.targetId);

                // Target gone or now friendly → CLEAR and fall through to find new target
                if (!target || target.ownerId === this.playerId) {
                    decisions.push({ sourceId: star.id, targetId: null });
                    this.attackTicks.delete(star.id);
                    // Fall through to find a new target below
                } else {
                    // Target is still enemy — check continue vs retreat
                    const ticks = (this.attackTicks.get(star.id) ?? 0) + 1;
                    this.attackTicks.set(star.id, ticks);

                    const ratio = star.activeShips / Math.max(target.activeShips + target.damagedShips, 1);

                    // Don't retreat until minimum attack ticks elapsed
                    if (ticks < this.minAttackTicks) return;

                    // Stickiness-based retreat
                    if (stickiness >= 1.0) return; // Never retreat

                    // Random aggression: chance to persist even when losing
                    if (randomAggression > 0 && Math.random() < randomAggression) return;

                    if (ratio < upperBounds) {
                        const retreatChance = 1.0 - stickiness;
                        if (Math.random() < retreatChance) {
                            decisions.push({ sourceId: star.id, targetId: null });
                            this.attackTicks.delete(star.id);
                        }
                    }
                    return; // Don't re-target while still fighting
                }
            }

            // ---------------------------------------------------------
            // FIND NEW TARGET
            // ---------------------------------------------------------
            if (star.activeShips < 3) return; // Skip very weak stars

            // Find connected enemy/neutral stars
            const connectedTargets: Star[] = [];
            const neighborIds = neighborIdsByStarId.get(star.id) ?? [];
            for (const neighborId of neighborIds) {
                const neighbor = starsById.get(neighborId);
                if (!neighbor || neighbor.ownerId === this.playerId) continue;
                connectedTargets.push(neighbor);
            }

            if (connectedTargets.length === 0) return;

            // Strategy-based target selection (randomAggression may bypass ratio checks)
            const target = this.selectTarget(star, connectedTargets, mustAttackRatio, upperBounds, tacticalAggression, randomAggression);
            if (target) {
                decisions.push({ sourceId: star.id, targetId: target });
                this.attackTicks.set(star.id, 0);
            }
        });

        return decisions;
    }

    /**
     * Strategy-aware target selection with three-zone probability.
     */
    private selectTarget(
        source: Star,
        enemies: Star[],
        mustAttackRatio: number,
        upperBounds: number,
        tacticalAggression: number,
        randomAggression: number = 0,
    ): StarId | null {
        // Random aggression wildcard: bypass ratio checks entirely
        const bypassRatios = randomAggression > 0 && Math.random() < randomAggression;
        // Strategy-specific pre-filter and sorting
        let sortedTargets: Star[];

        switch (this.strategy) {
            case 'aggressive':
                // Attack the STRONGEST neighbor (head-on)
                sortedTargets = [...enemies].sort((a, b) =>
                    (b.activeShips + b.damagedShips) - (a.activeShips + a.damagedShips)
                );
                break;

            case 'expansionist': {
                // Prefer neutrals, then weakest enemy
                const neutrals = enemies.filter(e => e.ownerId === ('neutral' as PlayerId));
                const hostiles = enemies.filter(e => e.ownerId !== ('neutral' as PlayerId));
                hostiles.sort((a, b) =>
                    (a.activeShips + a.damagedShips) - (b.activeShips + b.damagedShips)
                );
                sortedTargets = [...neutrals, ...hostiles];
                break;
            }

            case 'defensive':
                // Only attack very weak targets (effectively lowers must-attack ratio)
                sortedTargets = [...enemies].sort((a, b) =>
                    (a.activeShips + a.damagedShips) - (b.activeShips + b.damagedShips)
                );
                // Defensive AI needs even higher ratio
                mustAttackRatio = mustAttackRatio * 1.5;
                upperBounds = upperBounds * 1.5;
                break;

            case 'opportunistic':
            default:
                // Tactical aggression: target weakest
                if (Math.random() < tacticalAggression) {
                    sortedTargets = [...enemies].sort((a, b) =>
                        (a.activeShips + a.damagedShips) - (b.activeShips + b.damagedShips)
                    );
                } else {
                    // Standard: pick best ratio target
                    sortedTargets = [...enemies].sort((a, b) => {
                        const ratioA = source.activeShips / Math.max(a.activeShips + a.damagedShips, 1);
                        const ratioB = source.activeShips / Math.max(b.activeShips + b.damagedShips, 1);
                        return ratioB - ratioA; // Best ratio first
                    });
                }
                break;
        }

        // Apply three-zone probability to sorted targets in order
        for (const enemy of sortedTargets) {
            const strength = enemy.activeShips + enemy.damagedShips;
            const ratio = source.activeShips / Math.max(strength, 1);

            let probability: number;

            if (bypassRatios) {
                probability = 1.0; // Random aggression: attack regardless of ratio
            } else if (ratio >= mustAttackRatio) {
                probability = 1.0;
            } else if (ratio < upperBounds) {
                probability = 0;
            } else {
                probability = (ratio - upperBounds) / Math.max(mustAttackRatio - upperBounds, 0.01);
            }

            if (probability > 0 && Math.random() < probability) {
                return enemy.id;
            }
        }

        return null;
    }
}

// ============================================================================
// Strategy Picker
// ============================================================================

const ALL_STRATEGIES: AIStrategy[] = ['aggressive', 'opportunistic', 'expansionist', 'defensive'];

export function pickRandomStrategy(): AIStrategy {
    return ALL_STRATEGIES[Math.floor(Math.random() * ALL_STRATEGIES.length)];
}

// ============================================================================
// Factory
// ============================================================================

export function createAI(playerId: PlayerId, difficulty: AILevel = 'normal', strategy?: AIStrategy): AI {
    return new AI(playerId, difficulty, strategy);
}
