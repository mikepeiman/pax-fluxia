/**
 * VirtualStarManager — Transition-layer class for conquest territory animations.
 *
 * On conquest, a virtual star spawns at the attacker's position and slides toward
 * the conquered star. The full frontier pipeline (Voronoi + corridors + disconnect +
 * padding + smoothing) recomputes each frame with the virtual star at its interpolated
 * position, creating the visual effect of territory reaching out from attacker to target.
 *
 * Architecture: Transition layer (per TERRITORY_ARCHITECTURE.md)
 * Does NOT import PIXI, does NOT render, does NOT mutate config.
 */

import type { PowerSite } from '$lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator';
import { log } from '$lib/utils/logger';

// ── Types ────────────────────────────────────────────────────────────────────

export interface VirtualStar {
    /** Unique identifier: `virtual-<conqueredStarId>-<timestamp>` */
    id: string;
    /** Star the attack originated from */
    victorStarId: string;
    /** Star being conquered */
    targetStarId: string;
    /** Owner of the victorious attacker */
    ownerId: string;
    /** Full power weight (same as victor's weight) */
    weight: number;
    /** Start position (attacker star) */
    fromX: number;
    fromY: number;
    /** End position (conquered star) */
    toX: number;
    toY: number;
    /** Animation start time (gameNowMs) */
    startTime: number;
    /** Animation duration (from TERRITORY_TRANSITION_MS) */
    durationMs: number;
}

// ── Easing ───────────────────────────────────────────────────────────────────

/** easeOutCubic: fast departure, slow arrival. 1 - (1-t)³ */
function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
}

// ── Manager ──────────────────────────────────────────────────────────────────

export class VirtualStarManager {
    private activeStars: VirtualStar[] = [];

    /** Number of active virtual star transitions */
    get count(): number {
        return this.activeStars.length;
    }

    /** Whether any virtual star transitions are in progress */
    get isActive(): boolean {
        return this.activeStars.length > 0;
    }

    /**
     * Spawn a virtual star for a conquest event.
     *
     * @param victorStarId - Attacker star ID (origin position)
     * @param targetStarId - Conquered star ID (destination position)
     * @param ownerId - New owner (victor)
     * @param victorPos - Attacker star position {x, y}
     * @param targetPos - Conquered star position {x, y}
     * @param weight - Full power weight for the virtual star
     * @param durationMs - Animation duration (from TERRITORY_TRANSITION_MS)
     * @param nowMs - Current game time
     */
    spawnConquest(
        victorStarId: string,
        targetStarId: string,
        ownerId: string,
        victorPos: { x: number; y: number },
        targetPos: { x: number; y: number },
        weight: number,
        durationMs: number,
        nowMs: number,
    ): void {
        // Cancel any existing virtual star targeting the same star
        this.activeStars = this.activeStars.filter(vs => vs.targetStarId !== targetStarId);

        const vs: VirtualStar = {
            id: `virtual-${targetStarId}-${nowMs}`,
            victorStarId,
            targetStarId,
            ownerId,
            weight,
            fromX: victorPos.x,
            fromY: victorPos.y,
            toX: targetPos.x,
            toY: targetPos.y,
            startTime: nowMs,
            durationMs: Math.max(1, durationMs),
        };

        this.activeStars.push(vs);

        log.sys('VirtualStar', `SPAWN | ${victorStarId} → ${targetStarId} | owner=${ownerId} | duration=${durationMs}ms`);
    }

    /**
     * Get augmented site list: all real stars + interpolated virtual stars.
     * Completed virtual stars are removed and their callbacks invoked.
     *
     * @param realSites - Current real star sites (with post-conquest ownership)
     * @param nowMs - Current game time
     * @returns Combined site list for geometry computation
     */
    getFrameSites(
        realSites: PowerSite[],
        nowMs: number,
    ): { sites: PowerSite[]; completed: VirtualStar[] } {
        const completed: VirtualStar[] = [];
        const virtualSites: PowerSite[] = [];

        for (const vs of this.activeStars) {
            const elapsed = nowMs - vs.startTime;
            const rawT = Math.min(1, elapsed / vs.durationMs);
            const easedT = easeOutCubic(rawT);

            if (rawT >= 1) {
                completed.push(vs);
                continue;
            }

            // Lerp position from attacker toward conquered star
            const x = vs.fromX + (vs.toX - vs.fromX) * easedT;
            const y = vs.fromY + (vs.toY - vs.fromY) * easedT;

            virtualSites.push({
                x,
                y,
                weight: vs.weight,
                ownerId: vs.ownerId,
                starId: vs.id,
                virtual: 'conquest',
            });
        }

        // Remove completed virtual stars
        if (completed.length > 0) {
            const completedIds = new Set(completed.map(vs => vs.id));
            this.activeStars = this.activeStars.filter(vs => !completedIds.has(vs.id));

            for (const vs of completed) {
                log.sys('VirtualStar', `COMPLETE | ${vs.victorStarId} → ${vs.targetStarId} | duration=${vs.durationMs}ms`);
            }
        }

        return {
            sites: [...realSites, ...virtualSites],
            completed,
        };
    }

    /** Cancel all active virtual stars (e.g. on game reset) */
    cancelAll(): void {
        if (this.activeStars.length > 0) {
            log.sys('VirtualStar', `CANCEL ALL | ${this.activeStars.length} active`);
        }
        this.activeStars = [];
    }

    /** Cancel a specific virtual star by target star ID */
    cancelByTarget(targetStarId: string): void {
        this.activeStars = this.activeStars.filter(vs => vs.targetStarId !== targetStarId);
    }
}
