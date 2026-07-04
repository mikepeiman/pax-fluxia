/**
 * KineticTransitionRuntime — K2: conquest lifecycle over the kinetic core.
 *
 * Owns the settled endpoint state and the active morph. Presentation asks
 * `sample(nowMs)` every frame: null means "draw the settled snapshot"
 * (nothing moving); a KineticFrame means "draw frozen cells + these moving
 * bubble cells".
 *
 * T4 (recapture/retarget): because transition state is INPUTS (sites,
 * weights, progress) rather than shapes, a mid-flight ownership change simply
 * materializes the current frame as a brand-new endpoint state and diffs it
 * against the new target — the morph re-aims continuously, no restart, no
 * stale ownership, no correspondence heuristics.
 *
 * T5 (tick-bound): the caller supplies startedAtMs + durationMs per commit
 * (resolved from tick timing upstream); p = clamp((now − started)/duration).
 *
 * Pure TS: no PIXI, no Svelte, no config reads — fully offline-testable.
 */

import type { PowerCoreSite } from './buildPowerCellsFromSites';
import { buildTransitionBubble } from './buildTransitionBubble';
import type {
    KineticEndpointState,
    KineticFrame,
    TransitionBubble,
} from './kineticTypes';
import { sampleKineticFrame } from './sampleKineticFrame';
import type { PowerCell, Point } from './powerCoreTypes';

export interface KineticCommitParams {
    /** The new settled state (post-ownership-change endpoint). */
    readonly state: KineticEndpointState;
    /** The clip ring this state's diagram was computed with. */
    readonly clip: [number, number][];
    /** Ownership version — identical versions are ignored (idempotent). */
    readonly ownershipVersion: string;
    /**
     * Transition identity (`tick:starId:prevOwner:newOwner`, session-bundled
     * upstream). null → SNAP to the new state with no animation (mode/config
     * changes, initial load).
     */
    readonly transitionKey: string | null;
    readonly nowMs: number;
    /** Tick-bound animation window (T5). */
    readonly durationMs: number;
    /** Capture epicenter for the ripple stagger (usually the captured star). */
    readonly rippleOrigin?: { x: number; y: number } | null;
    /** Captured starId → attacker position, for directional conquest sweeps. */
    readonly conquestOrigins?: ReadonlyMap<string, { x: number; y: number }>;
}

interface ActiveMorph {
    readonly key: string;
    readonly startedAtMs: number;
    readonly durationMs: number;
    readonly bubble: TransitionBubble;
    readonly clip: [number, number][];
}

export class KineticTransitionRuntime {
    private settled: KineticEndpointState | null = null;
    private settledVersion: string | null = null;
    private active: ActiveMorph | null = null;

    /** The state presentation should draw when sample() returns null. */
    get settledState(): KineticEndpointState | null {
        return this.settled;
    }

    get activeKey(): string | null {
        return this.active?.key ?? null;
    }

    commit(params: KineticCommitParams): void {
        if (params.ownershipVersion === this.settledVersion) return;

        const previous = this.settled;
        this.settled = params.state;
        this.settledVersion = params.ownershipVersion;

        if (!previous || params.transitionKey === null) {
            // Initial load or explicit snap: no animation.
            this.active = null;
            return;
        }

        // Retarget (T4): a morph in flight re-aims from its CURRENT frame.
        const from = this.active
            ? this.materializeMidState(params.nowMs)
            : previous;
        this.active = {
            key: params.transitionKey,
            startedAtMs: params.nowMs,
            durationMs: Math.max(1, params.durationMs),
            bubble: buildTransitionBubble({
                s0: from,
                s1: params.state,
                rippleOrigin: params.rippleOrigin ?? null,
                conquestOrigins: params.conquestOrigins,
            }),
            clip: params.clip,
        };
    }

    /** Per-frame sample; null = idle (draw the settled state). */
    sample(nowMs: number): KineticFrame | null {
        if (!this.active) return null;
        const p =
            (nowMs - this.active.startedAtMs) / this.active.durationMs;
        if (p >= 1) {
            // Settle: emit nothing further; settled state is the truth.
            this.active = null;
            return null;
        }
        return sampleKineticFrame({
            bubble: this.active.bubble,
            p: Math.max(0, p),
            clip: this.active.clip,
        });
    }

    /**
     * Materialize the in-flight frame as an endpoint state: frozen pairs stay
     * as-is; each moving cell pairs with its (deduped) mini site, carried at
     * its CURRENT interpolated weight/owner. sourceSiteIndex is re-based onto
     * the combined array so the bubble diff gets exact cell↔site links.
     *
     * A conquest SWEEP splits ONE captured cell into two owner-parts (a render
     * overlay — not a diagram state) that share a sourceSiteIndex. A faithful
     * endpoint has exactly ONE owner per site, so each such group is collapsed
     * to its DOMINANT (larger-area) part before emitting. Without this, the two
     * parts become two coincident different-owner sites (siteIdentityKey is
     * owner-keyed) and the re-diff re-animates a spurious old→new flip on an
     * already-conquered cell — the "half snaps back to old owner" retarget
     * corruption (kineticTransitionRuntime.test: UNRELATED capture mid-sweep).
     */
    private materializeMidState(nowMs: number): KineticEndpointState {
        const morph = this.active!;
        const p = Math.min(
            0.999, // stay strictly mid-flight; p≥1 settles via sample()
            Math.max(0.001, (nowMs - morph.startedAtMs) / morph.durationMs),
        );
        const frame = sampleKineticFrame({
            bubble: morph.bubble,
            p,
            clip: morph.clip,
        });

        const sites: PowerCoreSite[] = [];
        const cells: PowerCell[] = [];
        for (const { site, cell } of morph.bubble.frozenPairs) {
            sites.push(site);
            cells.push({ ...cell, sourceSiteIndex: sites.length - 1 });
        }
        // Group moving cells by their mini-site: >1 cell ⇒ a split conquest.
        const groups = new Map<number, PowerCell[]>();
        for (const cell of frame.bubbleCells) {
            if (cell.sourceSiteIndex === undefined) continue; // ramp with no cell
            const g = groups.get(cell.sourceSiteIndex);
            if (g) g.push(cell);
            else groups.set(cell.sourceSiteIndex, [cell]);
        }
        for (const [sourceSiteIndex, group] of groups) {
            const miniSite = frame.miniSites?.[sourceSiteIndex];
            if (!miniSite) continue; // ε-dominated ramp with no cell — absent
            // Dominant part = the owner that currently holds the cell.
            let dominant = group[0]!;
            if (group.length > 1) {
                let bestArea = polyArea(dominant.points);
                for (let i = 1; i < group.length; i++) {
                    const a = polyArea(group[i]!.points);
                    if (a > bestArea) { bestArea = a; dominant = group[i]!; }
                }
            }
            sites.push({
                x: miniSite.x,
                y: miniSite.y,
                weight: miniSite.weight,
                ownerId: dominant.ownerId,
                starId: dominant.siteId,
            });
            cells.push({ ...dominant, sourceSiteIndex: sites.length - 1 });
        }
        return { sites, cells };
    }
}

/** Shoelace area (absolute) of a polygon ring. */
function polyArea(points: readonly Point[]): number {
    let s = 0;
    for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i]!;
        const [bx, by] = points[(i + 1) % points.length]!;
        s += ax * by - bx * ay;
    }
    return Math.abs(s / 2);
}
