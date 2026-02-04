// ============================================================================
// Combat Rules - Centralized combat logic (V2 Posture-Based)
// ============================================================================

import type { Star } from './Star';
import type { Fleet } from './Fleet';
import { GAME_CONFIG } from '$lib/config/game.config';
// NOTE: combatLog removed - combat logging now handled by GameEngine with V4 format

/**
 * Resolve combat where multiple fleets arrive at a star simultaneously
 * POSTURE-BASED ENGAGEMENT MODEL (V2):
 * - Casualties scale with force size and "Defensive Posture".
 * - Retreating defenders (Active Order + Escape Route) save 65% of ships.
 * - Standing defenders lose 70% of ships on capture (30% destroyed).
 */
export function resolveMultiwayCombat(target: Star, fleets: Fleet[], stars: Map<string, Star>, tick: number): void {
    // 1. Group ships by owner
    const forces = new Map<string, number>();

    // Add Defender
    const initialDefenderCount = target.activeShips; // Only active fight
    forces.set(target.ownerId, (forces.get(target.ownerId) || 0) + initialDefenderCount);

    // Add all Arriving Fleets
    fleets.forEach(fleet => {
        const fid = String(fleet.ownerId);
        forces.set(fid, (forces.get(fid) || 0) + fleet.shipCount);
    });

    // 2. Identify Attacker Force
    let attackingForce = 0;
    let strongestAttackerId: string | null = null;
    let maxAttackForce = 0;

    // Sum of all generic enemies (simple model: Everyone vs Owner)
    forces.forEach((count, playerId) => {
        if (playerId !== target.ownerId) {
            attackingForce += count;
            if (count > maxAttackForce) {
                maxAttackForce = count;
                strongestAttackerId = playerId;
            }
        }
    });

    if (attackingForce === 0) {
        // Reinforcements only
        fleets.forEach(f => target.addActiveShips(f.shipCount));
        return;
    }

    // Mark engaged
    target.markCombat(tick);
    fleets.forEach(f => {
        const source = stars.get(f.sourceId);
        if (source) source.markCombat(tick);
    });

    const defendingForce = initialDefenderCount;

    // 3. Combat Ratio & Overwhelm Check
    // Prevent divide by zero
    const combatRatio = defendingForce === 0 ? 999 : (attackingForce / defendingForce);
    const CONQUEST_THRESHOLD = GAME_CONFIG.CONQUEST_THRESHOLD || 7;

    // Check Capture Condition
    // Trigger: Defenders <= 0 OR Overwhelm
    if (defendingForce <= 0 || combatRatio >= CONQUEST_THRESHOLD) {
        if (strongestAttackerId) {
            executeCapture(target, strongestAttackerId, attackingForce, defendingForce, stars, fleets, tick, "CONQUEST");
        }
        return;
    }

    // 4. Combat Exchange (Attrition) - Per Tick - V3 Formula
    const COMBAT_MOD = GAME_CONFIG.COMBAT_MODIFIER || 0.1;
    const smallerForce = Math.min(defendingForce, attackingForce);
    const largerForce = Math.max(defendingForce, attackingForce);
    const defenderIsLarger = defendingForce >= attackingForce;

    // V3 CASUALTY FORMULA:
    // If I am larger, damage scales with smaller force (less hurt by weak enemy)
    // If I am smaller, damage scales with larger force (crushed by strong enemy)
    // shipsDamaged = isLarger ? (mod * smallerForce) : (mod * largerForce)

    // DEFENDER CASUALTIES
    const damageToDefenderBase = defenderIsLarger
        ? COMBAT_MOD * smallerForce   // Defender larger: less damage from weak attacker
        : COMBAT_MOD * largerForce;   // Defender smaller: crushed by strong attacker

    // Split into Wounded vs Killed based on Defensive Posture
    const defWounded = damageToDefenderBase * (1 - target.defensivePosture);
    const defKilled = damageToDefenderBase * target.defensivePosture;

    // Apply: First kill (remove), then wound (convert to damaged)
    target.removeActiveShips(defKilled);
    target.takeDamage(defWounded);

    // ATTACKER RETURN FIRE — Symmetric V3.1 Formula (same calculation as defender)
    // ===========================================================================
    // TUNING: Attackers take 90% LESS damage than defenders.
    // Rationale: Attacking should not be overly punishing. Defenders have
    // terrain/fortification advantage which is reflected in their posture.
    // Attackers take proportionally less return fire.
    // ===========================================================================
    const ATTACKER_DAMAGE_MODIFIER = 0.1; // Attackers take only 10% of calculated damage

    const attackerIsLarger = attackingForce > defendingForce;
    const damageToAttackerBase = attackerIsLarger
        ? COMBAT_MOD * smallerForce * ATTACKER_DAMAGE_MODIFIER
        : COMBAT_MOD * largerForce * ATTACKER_DAMAGE_MODIFIER;

    fleets.forEach(f => {
        if (f.ownerId === target.ownerId) return;

        const source = stars.get(f.sourceId);
        if (source) {
            const share = f.shipCount / attackingForce;
            const casualty = damageToAttackerBase * share;

            // Attacker Posture (at source star)
            const atkPosture = source.defensivePosture || 0.5;
            const atkWounded = casualty * (1 - atkPosture);
            const atkKilled = casualty * atkPosture;

            // Apply: kill then wound
            source.removeActiveShips(atkKilled);
            source.takeDamage(atkWounded);
        }
    });

    // Log Defense - DISABLED: Combat logging now handled by GameEngine
    // Legacy V1 format removed, V4 format in GameEngine.resolveMultiwayCombat
    /*
    if (tick % 10 === 0) {
        combatLog.add({ ... old format ... });
    }
    */
}

/**
 * Execute Capture Logic (Disperse/Retreat)
 */
function executeCapture(
    target: Star,
    victorId: string,
    attackerF: number,
    defenderF: number,
    stars: Map<string, Star>,
    fleets: Fleet[],
    tick: number,
    reason: string
) {
    // 1. Retreat Check
    let isRetreating = false;
    let retreatTargetId: string | null = null;

    if (target.targetId) {
        const retreatDest = stars.get(target.targetId);
        // Check if friendly
        if (retreatDest && retreatDest.ownerId === target.ownerId) {
            // Check implicit connection? Star Connections are static.
            // If targetId is set, it implies a Link was created, which required a Connection.
            isRetreating = true;
            retreatTargetId = target.targetId;
        }
    }

    // 2. Check for Escape Routes (V3: scatter to friendly neighbors if not actively retreating)
    let escapeRoutes: Star[] = [];
    if (!isRetreating) {
        // Find all friendly connected stars for scatter
        stars.forEach(star => {
            if (star.ownerId === target.ownerId && star.id !== target.id) {
                // Note: We assume all stars in map are connected for V1
                // In a proper impl, we'd check connections array
                escapeRoutes.push(star);
            }
        });
    }
    const canRetreat = isRetreating || escapeRoutes.length > 0;

    // 3. Capture Rates (V3 spec)
    // Retreating: 35% captured, 65% escapes to target
    // Not Retreating but escape exists: 50% captured, 25% destroyed, 25% scattered
    // No escape: 100% captured
    let captureRate: number;
    if (isRetreating) {
        captureRate = 0.35;
    } else if (escapeRoutes.length > 0) {
        captureRate = 0.50;
    } else {
        captureRate = 1.0;
    }

    // 4. Process Defender Ships
    const totalShips = target.totalShips;
    const shipsCaptured = Math.floor(totalShips * captureRate);
    let shipsEscaping = 0;
    let shipsDestroyed = 0;

    if (isRetreating) {
        shipsEscaping = totalShips - shipsCaptured; // 65% escapes
    } else if (escapeRoutes.length > 0) {
        // 50% captured, remaining 50% split: half destroyed, half scatter
        const remaining = totalShips - shipsCaptured;
        shipsDestroyed = Math.floor(remaining * 0.5);
        shipsEscaping = remaining - shipsDestroyed;
    }

    // 5. Execution
    // A. Handle Directed Retreat
    if (isRetreating && retreatTargetId && shipsEscaping > 0) {
        const dest = stars.get(retreatTargetId);
        if (dest) {
            dest.addActiveShips(shipsEscaping);
        }
    }
    // B. Handle Escape Route Scatter
    else if (!isRetreating && escapeRoutes.length > 0 && shipsEscaping > 0) {
        const perRoute = Math.floor(shipsEscaping / escapeRoutes.length);
        let remainder = shipsEscaping % escapeRoutes.length;
        escapeRoutes.forEach(route => {
            const toAdd = perRoute + (remainder > 0 ? 1 : 0);
            remainder = Math.max(0, remainder - 1);
            route.addActiveShips(toAdd);
        });
    }

    // C. Handle Capture - Clear and repopulate
    target.setOwner(victorId);
    target.clearShips(); // Use new clearShips() method

    // New population from captured ships
    const newActive = Math.floor(shipsCaptured * target.activationRate);
    const newDamaged = shipsCaptured - newActive;

    target.addActiveShips(newActive);
    target.addDamagedShips(newDamaged);

    // C. Conquest Transfer (Attacker moves in)
    const transferMod = GAME_CONFIG.CONQUEST_TRANSFER_MODIFIER || 1.0;
    fleets.forEach(f => {
        if (f.ownerId === victorId) {
            const source = stars.get(f.sourceId);
            if (source) {
                const transfer = Math.floor(source.activeShips * source.transferRate * transferMod);
                if (transfer > 0) {
                    source.removeActiveShips(transfer);
                    target.addActiveShips(transfer);
                }
            }
        }
    });

    // DISABLED: Combat logging now handled by GameEngine with V4 format
    /*
    combatLog.add({ ... old format ... });
    */
}
