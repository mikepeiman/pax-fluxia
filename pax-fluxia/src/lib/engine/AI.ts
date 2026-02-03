// ============================================================================
// AI - Greedy strategy AI opponent
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
     * 
     * Uses GAME_CONFIG for tunable AI behavior:
     * - AI_ATTACK_THRESHOLD: Min ratio to initiate attack (e.g., 1.33 = need 33% advantage)
     * - AI_DESIST_THRESHOLD: Ratio to stop attacking (e.g., 1.0 = retreat at parity)
     * - AI_RANDOM_AGGRESSION: Chance per tick to attack without advantage
     * - AI_TACTICAL_AGGRESSION: Chance to attack weak targets to bait others
     */
    evaluate(stars: StarState[], connections: StarConnection[]): AIDecision[] {
        const decisions: AIDecision[] = [];
        const myStars = stars.filter(s => s.ownerId === this.playerId);

        if (myStars.length === 0) return []; // We're eliminated

        // Get config values (can change during gameplay)
        const attackThreshold = GAME_CONFIG.AI_ATTACK_THRESHOLD;
        const desistThreshold = GAME_CONFIG.AI_DESIST_THRESHOLD;
        const randomAggression = GAME_CONFIG.AI_RANDOM_AGGRESSION;
        const tacticalAggression = GAME_CONFIG.AI_TACTICAL_AGGRESSION;

        myStars.forEach(star => {
            // ALREADY ATTACKING: Check if we should continue
            if (star.targetId) {
                const target = stars.find(s => s.id === star.targetId);
                if (target && target.ownerId !== this.playerId) {
                    // Still enemy - check if we should retreat
                    const myStrength = star.activeShips;
                    const targetStrength = target.activeShips + target.damagedShips;
                    const ratio = myStrength / Math.max(targetStrength, 1);

                    // CEASE ATTACK: When our ratio drops below desist threshold
                    if (ratio < desistThreshold) {
                        decisions.push({
                            sourceId: star.id,
                            targetId: null as any // Cancel order
                        });
                        log.sys('AI', `${this.playerId}: Retreating ${star.id}, ratio ${ratio.toFixed(2)} < desist ${desistThreshold}`);
                    }
                    // Otherwise: Continue attack (don't add new decision)
                }
                // If target is now friendly (conquered), star.targetId will be cleared naturally
                return; // Don't re-target while attacking
            }

            // NOT ATTACKING: Find a target
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

            // Check for tactical aggression opportunity (attack weak target to bait)
            if (Math.random() < tacticalAggression) {
                const weakestEnemy = [...connectedEnemies].sort((a, b) =>
                    (a.activeShips + a.damagedShips) - (b.activeShips + b.damagedShips)
                )[0];
                if (weakestEnemy) {
                    decisions.push({
                        sourceId: star.id,
                        targetId: weakestEnemy.id
                    });
                    log.sys('AI', `${this.playerId}: Tactical attack on ${weakestEnemy.id} from ${star.id}`);
                    return;
                }
            }

            // Check for random aggression (attack randomly without advantage)
            if (Math.random() < randomAggression && connectedEnemies.length > 0) {
                const randomTarget = connectedEnemies[Math.floor(Math.random() * connectedEnemies.length)];
                decisions.push({
                    sourceId: star.id,
                    targetId: randomTarget.id
                });
                log.sys('AI', `${this.playerId}: Random attack on ${randomTarget.id} from ${star.id}`);
                return;
            }

            // Standard attack: only when we have sufficient advantage
            const validTargets = connectedEnemies.filter(enemy => {
                const enemyStrength = enemy.activeShips + enemy.damagedShips;
                const ratio = star.activeShips / Math.max(enemyStrength, 1);
                return ratio >= attackThreshold; // We have enough advantage
            });

            if (validTargets.length > 0) {
                // Pick weakest target
                validTargets.sort((a, b) =>
                    (a.activeShips + a.damagedShips) - (b.activeShips + b.damagedShips)
                );
                const target = validTargets[0];
                decisions.push({
                    sourceId: star.id,
                    targetId: target.id
                });
                log.sys('AI', `${this.playerId}: Attacking ${target.id} from ${star.id} (ratio ${(star.activeShips / (target.activeShips + target.damagedShips)).toFixed(2)})`);
            }
        });

        return decisions;
    }

    /**
     * Find the best target for a given star
     */
    private findBestTarget(source: StarState, allStars: StarState[], connections: StarConnection[]): StarId | null {
        const candidates = allStars.filter(s =>
            s.id !== source.id &&
            s.ownerId !== this.playerId &&
            // MUST BE CONNECTED
            connections.some(c =>
                (c.sourceId === source.id && c.targetId === s.id) ||
                (c.sourceId === s.id && c.targetId === source.id)
            )
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
    getTargetForStar(starId: StarId, stars: StarState[], connections: StarConnection[]): StarId | null {
        const source = stars.find(s => s.id === starId);
        if (!source || source.ownerId !== this.playerId) return null;

        return this.findBestTarget(source, stars, connections);
    }
}

// ============================================================================
// Factory
// ============================================================================

export function createAI(playerId: PlayerId, difficulty: AILevel = 'normal'): AI {
    return new AI(playerId, difficulty);
}
