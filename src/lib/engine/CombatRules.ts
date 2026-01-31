// ============================================================================
// Combat Rules - Centralized combat logic
// ============================================================================

import type { Star } from './Star';
import type { Fleet } from './Fleet';
import { GAME_CONFIG } from '$lib/config/game.config';
import { combatLog } from '$lib/stores/combatLogStore';

/**
 * Calculate damage dealing in a combat round
 */
export function calculateCombatDamage(attack: number, defense: number, isDefending: boolean): number {
    const baseMultiplier = isDefending ? GAME_CONFIG.DEFENSE_MULTIPLIER : 1;
    // Pure size-based damage. 
    const rawDamage = attack * GAME_CONFIG.DAMAGE_RATE;
    return Math.max(GAME_CONFIG.MIN_DAMAGE, Math.floor(rawDamage * baseMultiplier));
}

/**
 * Resolve combat where multiple fleets arrive at a star simultaneously
 * REMOTE ENGAGEMENT MODEL:
 * - A deals damage to B (Source -> Target)
 * - B deals damage to A (Target -> Source)
 * - Movement ONLY occurs on Victory.
 */
export function resolveMultiwayCombat(target: Star, fleets: Fleet[], stars: Map<string, Star>, tick: number): void {
    // 1. Group ships by owner (Defender + All Attackers)
    const forces = new Map<string, number>();

    // Add Defender
    const initialDefenderCount = target.activeShips;
    forces.set(target.ownerId, (forces.get(target.ownerId) || 0) + initialDefenderCount);

    // Add all Arriving Fleets (Forces)
    fleets.forEach(fleet => {
        const fid = String(fleet.ownerId);
        forces.set(fid, (forces.get(fid) || 0) + fleet.shipCount);
    });

    // 2. Identify Attackers
    let totalAttackers = 0;
    forces.forEach((count, playerId) => {
        if (playerId !== target.ownerId) {
            totalAttackers += count;
        }
    });

    if (totalAttackers === 0) {
        // Just reinforcements
        fleets.forEach(f => target.addActiveShips(f.shipCount));
        return;
    }

    // Mark Combat (Pinning)
    target.markCombat(tick);
    fleets.forEach(f => {
        const source = stars.get(f.sourceId);
        if (source) source.markCombat(tick);
    });


    // 3. Check Overwhelm (Pre-Combat surrender)
    const overwhelmThreshold = totalAttackers * GAME_CONFIG.OVERWHELM_THRESHOLD;

    if (initialDefenderCount < overwhelmThreshold && initialDefenderCount > 0) {
        // Instant Capture
        executeCapture(target, forces, tick, initialDefenderCount, 0, stars, "OVERWHELM");
        return;
    }

    // 4. Combat Exchange (Attrition)
    // Defenders hit the Attackers (Target -> Source)
    const damageToAttackers = calculateCombatDamage(initialDefenderCount, totalAttackers, true);

    // Attackers hit the Defenders (Source -> Target)
    const damageToDefenders = calculateCombatDamage(totalAttackers, initialDefenderCount, false);

    // Apply Damage to Target (Defenders)
    const defResult = target.takeDamage(damageToDefenders);
    // defResult = { converted, destroyed }

    // Apply Damage to Sources (Attackers)
    // We must distribute this damage among the attacking stars.
    // Simplification: Proportional to their contribution?
    // Or just iterate?
    let atkConvertedTotal = 0;
    let atkDestroyedTotal = 0;

    if (totalAttackers > 0) {
        fleets.forEach(f => {
            if (f.ownerId === target.ownerId) return; // Friendly

            const source = stars.get(f.sourceId);
            if (source) {
                // Share of damage = (MyForce / TotalForce) * TotalDamage
                const share = (f.shipCount / totalAttackers);
                const damageShare = Math.floor(damageToAttackers * share);

                if (damageShare > 0) {
                    const res = source.takeDamage(damageShare);
                    atkConvertedTotal += res.converted;
                    atkDestroyedTotal += res.destroyed;
                }
            }
        });
    }

    // Check Resolution
    if (target.activeShips <= 0) {
        // Capture (via Attrition)
        // Pass the damage stats for logging
        executeCapture(target, forces, tick, initialDefenderCount, damageToDefenders, stars, "CONQUEST");
    } else {
        // Defense Holds
        // Log the exchange with full stats
        combatLog.add({
            tick,
            starId: target.id,
            starName: `${target.icon} ${target.id}`,
            result: "DEFENSE HOLD",
            color: "#44ff88",
            attackers: totalAttackers,
            defenders: initialDefenderCount,
            damage: damageToDefenders, // Damage DEALT to defenders
            message: `Defense Holds.
            - Defense: ${defResult.converted.toFixed(0)} Damaged, ${defResult.destroyed.toFixed(0)} Destroyed.
            - Attackers: ${atkConvertedTotal.toFixed(0)} Damaged, ${atkDestroyedTotal.toFixed(0)} Destroyed (Remote Return Fire).`
        });
    }
}

/**
 * Helper: Execute Capture Logic
 */
function executeCapture(
    target: Star,
    forces: Map<string, number>,
    tick: number,
    originalDef: number,
    damageDealt: number,
    stars: Map<string, Star>,
    reason: string
) {
    // Find Largest Attacker
    let winnerId: string = "";
    let maxForce = -1;

    forces.forEach((count, playerId) => {
        if (playerId !== target.ownerId) {
            if (count > maxForce) {
                maxForce = count;
                winnerId = playerId;
            }
        }
    });

    const winnerTotal = forces.get(winnerId) || 0;

    // Log
    combatLog.add({
        tick,
        starId: target.id,
        starName: `${target.icon} ${target.id}`,
        result: reason,
        color: "#ff4466",
        attackers: winnerTotal,
        defenders: originalDef,
        damage: damageDealt,
        message: `${reason}! ${winnerId} conquers.
        - Attacker: ${winnerTotal.toFixed(0)} (Engaged)
        - Defender: ${originalDef.toFixed(0)} active ships neutralized.`
    });

    // Apply Ownership
    target.setOwner(winnerId);

    // Clear ALL ships on target (they are gone/captured/converted)
    // Actually, "50% of attacking ships occupy".
    // "active active attackers"?
    // We need to move ships from Source to Target using the 50% rule.
    // We iterate over the *Winner's* engaging fleets (sources).

    // Clear target first
    target.takeDamage(1000000); // Wipe clean.

    const transferPercentage = GAME_CONFIG.CONQUEST_TRANSFER_PERCENTAGE; // 0.5

    // Move 50% of Source to Target
    // We need to find the specific source stars for the winner.
    // We passed `fleets` but we need to know which belong to `winnerId`.
    // Wait, executeCapture doesn't have `fleets`.
    // We need to pass `fleets` or find them. 
    // REFACTOR: Pass `fleets` to `executeCapture`.
}
