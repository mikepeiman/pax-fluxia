// ============================================================================
// AI - Greedy strategy AI opponent
// ============================================================================

import type { StarState, PlayerId, StarId, AILevel } from '$lib/types/game.types';
import { distance } from '$lib/utils/math.utils';
import { log } from '$lib/utils/logger';

// ============================================================================
// Types
// ============================================================================

interface AIDecision {
    sourceId: StarId;
    targetId: StarId;
}

// ============================================================================
// AI Class
// ============================================================================

/**
 * AI - Simple greedy strategy AI opponent
 * 
 * Strategy:
 * - For each owned star with ships, find the best target
 * - Prefer weaker enemy stars over stronger ones
 * - Prefer closer stars over distant ones
 * - Avoid attacking if outnumbered
 */
export class AI {
    readonly playerId: PlayerId;
    readonly difficulty: AILevel;

    // Difficulty modifiers
    private readonly aggressionThreshold: number;
    private readonly evaluationChance: number;

    constructor(playerId: PlayerId, difficulty: AILevel = 'normal') {
        this.playerId = playerId;
        this.difficulty = difficulty;

        // Set difficulty-based behavior
        switch (difficulty) {
            case 'easy':
                this.aggressionThreshold = 2.0; // Only attack with 2:1 advantage
                this.evaluationChance = 0.3;    // Only make decisions 30% of ticks
                break;
            case 'normal':
                this.aggressionThreshold = 1.2; // Attack with 20% advantage
                this.evaluationChance = 0.5;    // Decide 50% of ticks
                break;
            case 'hard':
                this.aggressionThreshold = 0.8; // Attack even at slight disadvantage
                this.evaluationChance = 0.8;    // Decide 80% of ticks
                break;
            case 'expert':
                this.aggressionThreshold = 0.6; // Aggressive attacking
                this.evaluationChance = 1.0;    // Always decide
                break;
            default:
                this.aggressionThreshold = 1.2;
                this.evaluationChance = 0.5;
        }

        log.sys('AI', `AI initialized for ${playerId} at ${difficulty} difficulty`);
    }

    /**
     * Evaluate the game state and return decisions
     */
    evaluate(stars: StarState[]): AIDecision[] {
        // Random chance based on difficulty
        if (Math.random() > this.evaluationChance) {
            return [];
        }

        const decisions: AIDecision[] = [];
        const myStars = stars.filter(s => s.ownerId === this.playerId);
        const enemyStars = stars.filter(s => s.ownerId !== this.playerId);

        if (enemyStars.length === 0) return []; // We won

        myStars.forEach(star => {
            // Skip if already attacking
            if (star.targetId) return;

            // Skip if not enough ships to attack
            if (star.activeShips < 5) return;

            const target = this.findBestTarget(star, stars);
            if (target) {
                decisions.push({
                    sourceId: star.id,
                    targetId: target
                });
            }
        });

        return decisions;
    }

    /**
     * Find the best target for a given star
     */
    private findBestTarget(source: StarState, allStars: StarState[]): StarId | null {
        const candidates = allStars.filter(s =>
            s.id !== source.id &&
            s.ownerId !== this.playerId
        );

        if (candidates.length === 0) return null;

        // Score each candidate
        const scored = candidates.map(target => {
            const dist = distance(source.x, source.y, target.x, target.y);
            const shipRatio = source.activeShips / Math.max(target.activeShips, 1);

            // Higher score = better target
            // Prefer: weaker targets, closer targets
            let score = 0;

            // Ship advantage bonus (0-100)
            score += Math.min(shipRatio * 20, 100);

            // Distance penalty (closer is better)
            score -= dist * 0.1;

            // Aggression check
            if (shipRatio < this.aggressionThreshold) {
                score -= 50; // Penalty for risky attacks
            }

            return { target, score };
        });

        // Sort by score descending
        scored.sort((a, b) => b.score - a.score);

        // Only attack if best target has positive score
        if (scored.length > 0 && scored[0].score > 0) {
            return scored[0].target.id;
        }

        return null;
    }

    /**
     * Get target for a specific star (for external use)
     */
    getTargetForStar(starId: StarId, stars: StarState[]): StarId | null {
        const source = stars.find(s => s.id === starId);
        if (!source || source.ownerId !== this.playerId) return null;

        return this.findBestTarget(source, stars);
    }
}

// ============================================================================
// Factory
// ============================================================================

export function createAI(playerId: PlayerId, difficulty: AILevel = 'normal'): AI {
    return new AI(playerId, difficulty);
}
