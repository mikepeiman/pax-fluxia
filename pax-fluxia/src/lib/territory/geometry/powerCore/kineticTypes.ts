/**
 * kineticTypes — K1 (transition kinetic core) contracts.
 *
 * A conquest transition is an interpolation of DIAGRAM INPUTS (sites/weights),
 * never a correspondence between output shapes (see
 * 2026-07-02_TRANSITION_CORRECTNESS_SPEC_AND_KINETIC_PLAN.md). The bubble is
 * the identity-diffed changed region; everything outside is frozen byte-stable.
 */

import type { PowerCoreSite } from './buildPowerCellsFromSites';
import type { PowerCell } from './powerCoreTypes';

/**
 * Composite site identity. starId alone is NOT unique (corridor CONTEST
 * virtuals share one starId with different owners — the 0319 dropped-frontier
 * root cause). Kinetic code always keys sites by this.
 */
export function siteIdentityKey(site: {
    readonly starId: string;
    readonly ownerId: string;
    readonly x: number;
    readonly y: number;
}): string {
    return `${site.starId}§${site.ownerId}§${Math.round(site.x * 1000)},${Math.round(site.y * 1000)}`;
}

/** Cell identity for diffing: composite site key of its generator. */
export interface KineticEndpointState {
    /** Stage-0 sites for this ownership state (weights pre-solved). */
    readonly sites: readonly PowerCoreSite[];
    /** Global diagram cells for this state (post disconnect-owner remap),
     *  in 1:1 order-independent correspondence with `sites` via composite key. */
    readonly cells: readonly PowerCell[];
}

/**
 * How one site participates in the morph:
 * - 'constant'   — same weight + owner in S0 and S1 (participates in the mini
 *                  diagram unchanged; only present if its CELL changed shape).
 * - 'weight'     — same owner, weight w0 → w1.
 * - 'conquest'   — a captured star (ownerA → ownerB) with a known attack
 *                  direction: ONE ordinary diagram site (so neighbors are
 *                  untouched at any cell size), rendered as a SWEEP by
 *                  geometrically SPLITTING the kept cell with a line that
 *                  travels attack-edge → far-edge with q (splitConquestCell):
 *                  the incoming owner's SOLID region grows across the cell.
 *                  No color blend; the SHAPE of the boundary moves. (Earlier
 *                  ghost-pair / radical-axis mechanisms are retired — a ghost
 *                  pair only swept HALF the cell; see splitConquestCell.)
 * - 'handoff'    — owner changed but no attack direction (e.g. disconnect
 *                  owner remap): a single site whose owner flips at q≥0.5.
 * - 'appear'     — only in S1: weight ramps ε → w1.
 * - 'vanish'     — only in S0: weight ramps w0 → ε.
 */
export type SiteRampKind =
    | 'constant'
    | 'weight'
    | 'conquest'
    | 'handoff'
    | 'appear'
    | 'vanish';

export interface SiteRamp {
    readonly kind: SiteRampKind;
    readonly x: number;
    readonly y: number;
    readonly starId: string;
    /** Owner in S0 ('' when kind==='appear'). */
    readonly ownerA: string;
    /** Owner in S1 ('' when kind==='vanish'). */
    readonly ownerB: string;
    /** Weight at p=0 (ε for 'appear'). */
    readonly w0: number;
    /** Weight at p=1 (ε for 'vanish'). */
    readonly w1: number;
    /**
     * Ripple stagger: this site's local progress q(p) = clamp((p - delay) /
     * span, 0, 1), smoothstepped. delay + span ≤ 1; both ≥ 0. Default: whole
     * window (delay 0, span 1). Monotone per site — required by the no-leak
     * weight bound (spec §2).
     */
    readonly delay: number;
    readonly span: number;
    /**
     * 'conquest' only: unit attack direction (from the attacker toward the
     * captured star) and the cell's outradius. splitConquestCell projects the
     * cell's vertices onto this direction and cuts at fraction q between the
     * attack-side extreme (incoming owner) and the far extreme (old owner), so
     * the incoming owner's region advances from the attack side. cellRadius is
     * retained for diagnostics / future feel tuning.
     */
    readonly attackDirX?: number;
    readonly attackDirY?: number;
    readonly cellRadius?: number;
}

export interface TransitionBubble {
    /** Ramp table for every site participating in the moving region. */
    readonly ramps: readonly SiteRamp[];
    /**
     * Deep-frozen (site, cell) pairs — everything in `frozenCells` with its
     * generator site. The runtime materializes MID-MORPH endpoint states from
     * these plus the sampled frame (retarget support, T4).
     */
    readonly frozenPairs: readonly {
        readonly site: import('./buildPowerCellsFromSites').PowerCoreSite;
        readonly cell: PowerCell;
    }[];
    /**
     * Frozen ring: sites whose cells are UNCHANGED but adjacent (within
     * `ringDepth` adjacency layers) to changed cells. Included in the mini
     * diagram as boundary conditions; their mini-cells are DISCARDED.
     */
    readonly ringSites: readonly PowerCoreSite[];
    /** Cells identical in S0 and S1 — the S1 objects, byte-stable all frames. */
    readonly frozenCells: readonly PowerCell[];
    /** Changed cells at the endpoints (exact snap targets for p=0 / p=1). */
    readonly bubbleCells0: readonly PowerCell[];
    readonly bubbleCells1: readonly PowerCell[];
    /** Bounding box of the changed region (+ ring), for sanity clamps. */
    readonly bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

/** One sampled frame: frozen cells (S1 refs) + the morphing bubble cells. */
export interface KineticFrame {
    /** p passed in, clamped to [0,1]. */
    readonly p: number;
    /** Byte-stable across all frames (T3). */
    readonly frozenCells: readonly PowerCell[];
    /** The moving cells at this p (exact S0/S1 cells at p=0/1 — T1). */
    readonly bubbleCells: readonly PowerCell[];
    /**
     * The (deduped) site array the mini diagram ran on; bubbleCells'
     * sourceSiteIndex points into it. Absent on snapped endpoint frames
     * (p=0/1), which return the endpoint cells directly.
     */
    readonly miniSites?: readonly import('./buildPowerCellsFromSites').PowerCoreSite[];
}
