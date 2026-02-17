// ============================================================================
// Pax Fluxia - Combat Resolution (Shared between client and server)
// ============================================================================
// Stateless multi-source combat function — extracted from both engines.
// Handles attacker filtering, force aggregation, damage distribution,
// and conquest triggering. Returns a result object; caller is responsible
// for animations/logging/event emission.
// ============================================================================

import type { Star } from './types';
import type { EngineConfig } from './config';
import { STAR_TYPE_STATS } from './config';
import type { StarType } from './types';
import { calculateCombat, checkConquestThreshold } from './combat';
import { applyConquest } from './conquest';
import type { ConquestContext, ConquestResult } from './conquest';

// ============================================================================
// Types
// ============================================================================

/** Per-attacker damage breakdown */
export interface AttackerDamageEntry {
    starId: string;
    ownerId: string;
    shipsBefore: number;
    kills: number;
    disabled: number;
}

/** Full result of a multi-source combat resolution */
export interface CombatResolutionResult {
    /** Whether combat actually occurred (false if all attackers filtered out) */
    occurred: boolean;
    /** Per-attacker damage applied */
    attackerDamage: AttackerDamageEntry[];
    /** Kills applied to defender */
    defenderKills: number;
    /** Disabled applied to defender */
    defenderDisabled: number;
    /** Total attacking force (after star-type weighting) */
    effectiveAttackForce: number;
    /** Raw total attacking ships (before weighting) */
    totalAttackShips: number;
    /** Effective defender force (including damaged ships + defense mult) */
    defenderForce: number;
    /** Whether defender is counter-attacking */
    defenderIsAttacking: boolean;
    /** Conquest result (null if no conquest occurred) */
    conquest: ConquestResult | null;
    /** Star ID of the victor (strongest attacker star), null if no conquest */
    victorStarId: string | null;
    /** Grouped ships by owner for multi-player aggregation */
    shipsByOwner: Map<string, { starIds: string[]; totalShips: number }>;
}

// ============================================================================
// Combat Resolution
// ============================================================================

/**
 * Resolve multi-source combat against a single defender.
 * 
 * Multiple stars from one or more players attack a single target.
 * Forces are aggregated, damage is calculated symmetrically via calculateCombat(),
 * and distributed proportionally back to attackers.
 * 
 * This function MUTATES the star objects directly:
 * - Reduces attacker/defender activeShips
 * - Increases damagedShips
 * - Sets lastCombatTick
 * - On conquest: delegates to applyConquest() which handles ownership transfer
 * 
 * Callers add their own logging, event emission, and animation hooks after.
 * 
 * @param attackers Stars with orders targeting the defender
 * @param defender The star being attacked
 * @param ctx Conquest context (neighbor/star lookups)
 * @param cfg Engine config
 * @param tick Current game tick
 * @returns CombatResolutionResult with all damage/conquest details
 */
export function resolveMultiSourceCombat(
    attackers: Star[],
    defender: Star,
    ctx: ConquestContext,
    cfg: EngineConfig,
    tick: number
): CombatResolutionResult {
    const emptyResult: CombatResolutionResult = {
        occurred: false,
        attackerDamage: [],
        defenderKills: 0,
        defenderDisabled: 0,
        effectiveAttackForce: 0,
        totalAttackShips: 0,
        defenderForce: 0,
        defenderIsAttacking: false,
        conquest: null,
        victorStarId: null,
        shipsByOwner: new Map(),
    };

    // ────────────────────────────────────────────────────────────────────────
    // STEP 1: Filter valid attackers
    // Skip attackers with no ships or whose target changed mid-tick
    // ────────────────────────────────────────────────────────────────────────
    const validAttackers = attackers.filter(attacker => {
        if (attacker.activeShips <= 0) {
            attacker.targetId = null;
            return false;
        }
        if (attacker.targetId !== defender.id) {
            return false;
        }
        return true;
    });

    if (validAttackers.length === 0) return emptyResult;

    // ────────────────────────────────────────────────────────────────────────
    // STEP 2: Aggregate attacking force, group by owner
    // ────────────────────────────────────────────────────────────────────────
    let totalAttackShips = 0;
    const contributions: { attacker: Star; ships: number }[] = [];
    const shipsByOwner = new Map<string, { starIds: string[]; totalShips: number }>();

    validAttackers.forEach(attacker => {
        const ships = attacker.activeShips;
        totalAttackShips += ships;
        contributions.push({ attacker, ships });

        const entry = shipsByOwner.get(attacker.ownerId) || { starIds: [], totalShips: 0 };
        entry.starIds.push(attacker.id);
        entry.totalShips += ships;
        shipsByOwner.set(attacker.ownerId, entry);
    });

    // ────────────────────────────────────────────────────────────────────────
    // STEP 3: Calculate defender force (active + damaged at reduced effectiveness)
    // ────────────────────────────────────────────────────────────────────────
    const defenderBaseForce = defender.activeShips +
        Math.floor(defender.damagedShips * cfg.DAMAGED_SHIP_EFFECTIVENESS);
    const defenderDefenseMult = STAR_TYPE_STATS[(defender.starType || 'grey') as StarType]?.defense ?? 1;
    const defenderForce = Math.floor(defenderBaseForce * defenderDefenseMult);

    // ────────────────────────────────────────────────────────────────────────
    // STEP 4: Instant conquest if no defenders
    // ────────────────────────────────────────────────────────────────────────
    if (defenderForce <= 0) {
        // Victor = player with largest total attacking ships
        let bestOwnerId = '';
        let bestShips = 0;
        shipsByOwner.forEach((entry, ownerId) => {
            if (entry.totalShips > bestShips) {
                bestShips = entry.totalShips;
                bestOwnerId = ownerId;
            }
        });
        // Strongest individual star of winning player
        const winnerStarIds = shipsByOwner.get(bestOwnerId)!.starIds;
        const winnerStars = validAttackers.filter(a => winnerStarIds.includes(a.id));
        const victor = winnerStars.reduce((a, b) => a.activeShips > b.activeShips ? a : b);

        const conquestResult = applyConquest(victor, defender, ctx, cfg, winnerStars);

        return {
            occurred: true,
            attackerDamage: [],
            defenderKills: 0,
            defenderDisabled: 0,
            effectiveAttackForce: totalAttackShips,
            totalAttackShips,
            defenderForce: 0,
            defenderIsAttacking: !!defender.targetId,
            conquest: conquestResult,
            victorStarId: victor.id,
            shipsByOwner,
        };
    }

    // ────────────────────────────────────────────────────────────────────────
    // STEP 5: Calculate weighted average attack multiplier from star types
    // ────────────────────────────────────────────────────────────────────────
    let weightedAttackMult = 0;
    contributions.forEach(({ attacker, ships }) => {
        const attackMult = STAR_TYPE_STATS[(attacker.starType || 'grey') as StarType]?.attack ?? 1;
        weightedAttackMult += attackMult * (ships / totalAttackShips);
    });
    const effectiveAttackForce = Math.floor(totalAttackShips * weightedAttackMult);

    // ────────────────────────────────────────────────────────────────────────
    // STEP 6: Calculate symmetric damage
    // ────────────────────────────────────────────────────────────────────────
    const defenderIsAttacking = !!defender.targetId;
    const result = calculateCombat(
        defenderForce,
        effectiveAttackForce,
        defenderIsAttacking,
        true, // attackers are always attacking
        {
            DAMAGE_PER_SHIP: cfg.DAMAGE_PER_SHIP,
            LETHALITY: cfg.LETHALITY,
            AGGRESSOR_ADVANTAGE: cfg.AGGRESSOR_ADVANTAGE,
            FORCE_RATIO_EFFECT: cfg.FORCE_RATIO_EFFECT,
            MINIMUM_DAMAGE: cfg.MINIMUM_DAMAGE,
            CONQUEST_THRESHOLD: cfg.CONQUEST_THRESHOLD,
        }
    );

    // ────────────────────────────────────────────────────────────────────────
    // STEP 7: Apply damage to defender
    // ────────────────────────────────────────────────────────────────────────
    const defenderTotalDamage = result.killsOnA + result.disabledOnA;
    defender.activeShips = Math.max(0, defender.activeShips - defenderTotalDamage);
    defender.damagedShips += result.disabledOnA;
    defender.lastCombatTick = tick;

    // ────────────────────────────────────────────────────────────────────────
    // STEP 8: Apply proportional damage to attackers
    // ────────────────────────────────────────────────────────────────────────
    const attackerDamage: AttackerDamageEntry[] = [];
    contributions.forEach(({ attacker, ships }) => {
        const proportion = ships / totalAttackShips;
        const kills = Math.floor(result.killsOnB * proportion);
        const disabled = Math.floor(result.disabledOnB * proportion);
        const totalDamage = kills + disabled;

        attackerDamage.push({
            starId: attacker.id,
            ownerId: attacker.ownerId,
            shipsBefore: attacker.activeShips,
            kills,
            disabled,
        });

        attacker.activeShips = Math.max(0, attacker.activeShips - totalDamage);
        attacker.damagedShips += disabled;
        attacker.lastCombatTick = tick;

        if (attacker.activeShips <= 0) {
            attacker.targetId = null;
        }
    });

    // ────────────────────────────────────────────────────────────────────────
    // STEP 9: Check conquest threshold
    // ────────────────────────────────────────────────────────────────────────
    let conquest: ConquestResult | null = null;
    let victorStarId: string | null = null;

    if (defender.activeShips <= 0 || checkConquestThreshold(defender.activeShips, totalAttackShips)) {
        // Victor = player with largest total attacking ships
        let bestOwnerId = '';
        let bestShips = 0;
        shipsByOwner.forEach((entry, ownerId) => {
            if (entry.totalShips > bestShips) {
                bestShips = entry.totalShips;
                bestOwnerId = ownerId;
            }
        });
        const winnerStarIds = shipsByOwner.get(bestOwnerId)!.starIds;
        const winnerStars = validAttackers.filter(a => winnerStarIds.includes(a.id));
        const victor = winnerStars.reduce((a, b) => a.activeShips > b.activeShips ? a : b);

        conquest = applyConquest(victor, defender, ctx, cfg, winnerStars);
        victorStarId = victor.id;
    }

    return {
        occurred: true,
        attackerDamage,
        defenderKills: result.killsOnA,
        defenderDisabled: result.disabledOnA,
        effectiveAttackForce,
        totalAttackShips,
        defenderForce,
        defenderIsAttacking,
        conquest,
        victorStarId,
        shipsByOwner,
    };
}
