// ============================================================================
// AI - Three-zone attack model with stickiness-based persistence
// ============================================================================

import type { StarState, PlayerId, StarId, AILevel, StarConnection } from '$lib/types/game.types';
import { distance } from '$lib/utils/math.utils';
import { log } from '$lib/utils/logger';
import { GAME_CONFIG } from '$lib/config/game.config';

// ============================================================================
// Types
// ============================================================================

interface AIDecision {
    sourceId: StarId;
    targetId: StarId | null; // null = cancel order
}

// ============================================================================
// AI Class
// ============================================================================

/**
 * AI - Three-zone attack model
 *
 * Attack zones (based on myShips/enemyShips ratio):
 *   ratio >= MUST_ATTACK_RATIO  → always attack
 *   ratio <  ATTACK_UPPER_BOUNDS → never initiate (may retreat)
 *   between → linear probability interpolation
 *
 * Stickiness (0-1):
 *   1 = fight until one star falls (never retreat)
 *   0 = disengage when ratio drops below ATTACK_UPPER_BOUNDS
 */
export class AI {
    readonly playerId: PlayerId;
    readonly difficulty: AILevel;

    // Difficulty-based evaluation frequency multiplier
    private readonly evalFreqMult: number;

    constructor(playerId: PlayerId, difficulty: AILevel = 'normal') {
        this.playerId = playerId;
        this.difficulty = difficulty;

        // Difficulty scales evaluation frequency
        switch (difficulty) {
            case 'easy':
                this.evalFreqMult = 0.4;
                break;
            case 'normal':
                this.evalFreqMult = 1.0;
                break;
            case 'hard':
                this.evalFreqMult = 1.0;
                break;
            case 'expert':
                this.evalFreqMult = 1.0;
                break;
            default:
                this.evalFreqMult = 1.0;
        }

        log.sys('AI', `AI initialized for ${playerId} at ${difficulty} difficulty`);
    }

    /**
     * Evaluate the game state and return decisions.
     *
     * Three-zone attack model:
     *   Zone 1: ratio >= AI_MUST_ATTACK_RATIO → MUST attack
     *   Zone 2: ratio < AI_ATTACK_UPPER_BOUNDS → NEVER initiate
     *   Zone 3: between → probability = (ratio - upper) / (must - upper)
     *
     * Stickiness governs retreat:
     *   1.0 = fight to the death
     *   0.0 = disengage instantly when ratio drops below upper bounds
     */
    evaluate(stars: StarState[], connections: StarConnection[]): AIDecision[] {
        const decisions: AIDecision[] = [];
        const myStars = stars.filter(s => s.ownerId === this.playerId);

        if (myStars.length === 0) return []; // Eliminated

        // Read live config values (can change during gameplay via sliders)
        const mustAttackRatio = GAME_CONFIG.AI_MUST_ATTACK_RATIO;
        const upperBounds = GAME_CONFIG.AI_ATTACK_UPPER_BOUNDS;
        const stickiness = GAME_CONFIG.AI_ATTACK_STICKINESS;
        const evalFreq = GAME_CONFIG.AI_EVALUATION_FREQUENCY * this.evalFreqMult;
        const tacticalAggression = GAME_CONFIG.AI_TACTICAL_AGGRESSION;

        myStars.forEach(star => {
            // Evaluation frequency gate — skip some ticks for less robotic feel
            if (Math.random() > evalFreq) return;

            // ---------------------------------------------------------
            // ALREADY ATTACKING: check continue vs retreat
            // ---------------------------------------------------------
            if (star.targetId) {
                const target = stars.find(s => s.id === star.targetId);

                // Target conquered by us or gone → clear naturally
                if (!target || target.ownerId === this.playerId) return;

                const ratio = star.activeShips / Math.max(target.activeShips + target.damagedShips, 1);

                // Stickiness-based retreat decision
                if (stickiness >= 1.0) {
                    // stickiness=1: never retreat, fight to the death
                    return;
                }

                if (ratio < upperBounds) {
                    // Below upper bounds — retreat probability based on stickiness
                    // stickiness=0 → always retreat, stickiness=0.9 → 10% retreat chance
                    const retreatChance = 1.0 - stickiness;
                    if (Math.random() < retreatChance) {
                        decisions.push({ sourceId: star.id, targetId: null });
                        log.sys('AI', `${this.playerId}: Retreat from ${target.id}, ratio ${ratio.toFixed(2)} < ${upperBounds}`);
                    }
                }
                // Above upper bounds while attacking → continue
                return;
            }

            // ---------------------------------------------------------
            // NOT ATTACKING: find a target
            // ---------------------------------------------------------
            if (star.activeShips < 5) return; // Skip weak stars

            // Find connected enemy stars
            const connectedEnemies = stars.filter(s =>
                s.ownerId !== this.playerId &&
                connections.some(c =>
                    (c.sourceId === star.id && c.targetId === s.id) ||
                    (c.sourceId === s.id && c.targetId === star.id)
                )
            );

            if (connectedEnemies.length === 0) return;

            // Tactical aggression: target weakest neighbor
            if (Math.random() < tacticalAggression) {
                const weakest = [...connectedEnemies].sort((a, b) =>
                    (a.activeShips + a.damagedShips) - (b.activeShips + b.damagedShips)
                )[0];
                if (weakest) {
                    decisions.push({ sourceId: star.id, targetId: weakest.id });
                    log.sys('AI', `${this.playerId}: Tactical attack on ${weakest.id} from ${star.id}`);
                    return;
                }
            }

            // Three-zone model: evaluate each enemy
            const bestTarget = this.pickBestTarget(star, connectedEnemies, mustAttackRatio, upperBounds);
            if (bestTarget) {
                decisions.push({ sourceId: star.id, targetId: bestTarget });
            }
        });

        return decisions;
    }

    /**
     * Pick the best target using three-zone probability model.
     * Returns target StarId or null.
     */
    private pickBestTarget(
        source: StarState,
        enemies: StarState[],
        mustAttackRatio: number,
        upperBounds: number,
    ): StarId | null {
        // Score candidates by attack viability
        const candidates: { id: StarId; ratio: number; strength: number; probability: number }[] = [];

        for (const enemy of enemies) {
            const strength = enemy.activeShips + enemy.damagedShips;
            const ratio = source.activeShips / Math.max(strength, 1);

            let probability: number;

            if (ratio >= mustAttackRatio) {
                // Zone 1: MUST attack
                probability = 1.0;
            } else if (ratio < upperBounds) {
                // Zone 2: NEVER initiate
                probability = 0;
            } else {
                // Zone 3: linear interpolation between bounds
                probability = (ratio - upperBounds) / (mustAttackRatio - upperBounds);
            }

            if (probability > 0) {
                candidates.push({ id: enemy.id, ratio, strength, probability });
            }
        }

        if (candidates.length === 0) return null;

        // Sort by probability DESC, then by weakness (prefer weaker targets)
        candidates.sort((a, b) => {
            if (Math.abs(a.probability - b.probability) > 0.1) {
                return b.probability - a.probability;
            }
            return a.strength - b.strength; // Prefer weaker
        });

        // Roll against the best candidate's probability
        const best = candidates[0];
        if (Math.random() < best.probability) {
            log.sys('AI', `${this.playerId}: Attack ${best.id} from ${source.id} (ratio ${best.ratio.toFixed(2)}, p=${best.probability.toFixed(2)})`);
            return best.id;
        }

        return null;
    }
}

// ============================================================================
// Factory
// ============================================================================

export function createAI(playerId: PlayerId, difficulty: AILevel = 'normal'): AI {
    return new AI(playerId, difficulty);
}
