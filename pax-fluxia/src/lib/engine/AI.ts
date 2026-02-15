// ============================================================================
// AI - Three-zone attack model with strategies and anti-oscillation
// ============================================================================

import type { StarState, PlayerId, StarId, AILevel, StarConnection } from '$lib/types/game.types';
import { log } from '$lib/utils/logger';
import { GAME_CONFIG } from '$lib/config/game.config';

// ============================================================================
// Types
// ============================================================================

interface AIDecision {
    sourceId: StarId;
    targetId: StarId | null; // null = cancel order
}

/** AI strategies affect target selection and aggression */
export type AIStrategy = 'aggressive' | 'opportunistic' | 'expansionist' | 'defensive';

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

        log.sys('AI', `AI ${playerId}: ${difficulty} difficulty, ${this.strategy} strategy`);
    }

    /**
     * Evaluate the game state and return decisions.
     */
    evaluate(stars: StarState[], connections: StarConnection[]): AIDecision[] {
        const decisions: AIDecision[] = [];
        const myStars = stars.filter(s => s.ownerId === this.playerId);

        if (myStars.length === 0) return []; // Eliminated

        // Read live config values
        const mustAttackRatio = GAME_CONFIG.AI_MUST_ATTACK_RATIO + this.aggressionBonus;
        const upperBounds = GAME_CONFIG.AI_ATTACK_UPPER_BOUNDS - (this.aggressionBonus * 0.5);
        const stickiness = GAME_CONFIG.AI_ATTACK_STICKINESS;
        const evalFreq = GAME_CONFIG.AI_EVALUATION_FREQUENCY * this.evalFreqMult;
        const tacticalAggression = GAME_CONFIG.AI_TACTICAL_AGGRESSION;

        myStars.forEach(star => {
            // Evaluation frequency gate
            if (Math.random() > evalFreq) return;

            // ---------------------------------------------------------
            // ALREADY HAS TARGET: check continue, retreat, or re-target
            // ---------------------------------------------------------
            if (star.targetId) {
                const target = stars.find(s => s.id === star.targetId);

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

                    if (ratio < upperBounds) {
                        const retreatChance = 1.0 - stickiness;
                        if (Math.random() < retreatChance) {
                            decisions.push({ sourceId: star.id, targetId: null });
                            this.attackTicks.delete(star.id);
                            log.sys('AI', `${this.playerId}: Retreat ${star.id}, ratio ${ratio.toFixed(2)} (${ticks} ticks)`);
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
            const connectedTargets = stars.filter(s =>
                s.ownerId !== this.playerId &&
                connections.some(c =>
                    (c.sourceId === star.id && c.targetId === s.id) ||
                    (c.sourceId === s.id && c.targetId === star.id)
                )
            );

            if (connectedTargets.length === 0) return;

            // Strategy-based target selection
            const target = this.selectTarget(star, connectedTargets, mustAttackRatio, upperBounds, tacticalAggression);
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
        source: StarState,
        enemies: StarState[],
        mustAttackRatio: number,
        upperBounds: number,
        tacticalAggression: number,
    ): StarId | null {
        // Strategy-specific pre-filter and sorting
        let sortedTargets: StarState[];

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

            if (ratio >= mustAttackRatio) {
                probability = 1.0;
            } else if (ratio < upperBounds) {
                probability = 0;
            } else {
                probability = (ratio - upperBounds) / Math.max(mustAttackRatio - upperBounds, 0.01);
            }

            if (probability > 0 && Math.random() < probability) {
                log.sys('AI', `${this.playerId} [${this.strategy}]: Attack ${enemy.id} from ${source.id} (ratio ${ratio.toFixed(2)}, p=${probability.toFixed(2)})`);
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

function pickRandomStrategy(): AIStrategy {
    return ALL_STRATEGIES[Math.floor(Math.random() * ALL_STRATEGIES.length)];
}

// ============================================================================
// Factory
// ============================================================================

export function createAI(playerId: PlayerId, difficulty: AILevel = 'normal', strategy?: AIStrategy): AI {
    return new AI(playerId, difficulty, strategy);
}
