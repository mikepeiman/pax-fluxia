/**
 * KineticTransitionRuntime — K2: conquest lifecycle over the kinetic core.
 *
 * Owns the settled endpoint state and the set of ACTIVE morphs. Each ownership
 * commit adds a morph animating THAT commit's delta on its OWN clock, so
 * independent (non-overlapping) conquests run CONCURRENTLY and a later capture
 * never restarts an earlier one — the shared cross-mode defect "conquest
 * transitions retriggered by the next tick's conquest". Only commits whose
 * changed cells OVERLAP an in-flight morph (a cell recaptured mid-sweep, or an
 * adjacent region sharing a flex/ring cell) collapse into ONE retargeted morph,
 * so a shared cell stays single-valued and continuous (T4 recapture) with no
 * coincident-owner corruption.
 *
 * sample(now) composites: the settled state is the base; every active morph
 * overlays its moving cells. null = idle (draw the settled snapshot). frozen
 * cells are reference-stable while the morph set is unchanged (the Vector skin
 * keys its static-layer redraw on that identity).
 *
 * T5 (tick-bound): each commit carries startedAtMs + durationMs (resolved from
 * tick timing upstream); a morph's local p = clamp((now − started)/duration).
 *
 * Pure TS: no PIXI, no Svelte, no config reads — fully offline-testable.
 */

import type { PowerCoreSite } from './buildPowerCellsFromSites';
import { polygonArea } from '../kernel';
import { buildTransitionBubble } from './buildTransitionBubble';
import type {
    KineticEndpointState,
    KineticFrame,
    TransitionBubble,
} from './kineticTypes';
import { sampleKineticFrame, sampleFullDiagramMulti } from './sampleKineticFrame';
import { siteIdentityKey } from './kineticTypes';
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
    /** Conquest front field mode (splitCellByFront). Default 'linear'. */
    readonly conquestFrontMode?: import('./conquestFrontField').ConquestFrontMode;
}

interface ActiveMorph {
    readonly key: string;
    readonly startedAtMs: number;
    readonly durationMs: number;
    readonly bubble: TransitionBubble;
    readonly clip: [number, number][];
    /** siteIds this morph moves (owner or shape) — for overlap + compositing. */
    readonly changedSiteIds: ReadonlySet<string>;
}

function clamp01(v: number): number {
    return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** The siteIds a bubble touches at either endpoint (the moving region). */
function changedSiteIdsOf(bubble: TransitionBubble): Set<string> {
    const ids = new Set<string>();
    for (const cell of bubble.bubbleCells0) ids.add(cell.siteId);
    for (const cell of bubble.bubbleCells1) ids.add(cell.siteId);
    return ids;
}

function intersects(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
    const [small, large] = a.size <= b.size ? [a, b] : [b, a];
    for (const id of small) if (large.has(id)) return true;
    return false;
}

export class KineticTransitionRuntime {
    private settled: KineticEndpointState | null = null;
    private settledVersion: string | null = null;
    private morphs: ActiveMorph[] = [];
    /** Reference-stable frozen-cell array cache (Vector skin static-layer key). */
    private frozenCache: { signature: string; cells: PowerCell[] } | null = null;

    /** The state presentation should draw when sample() returns null. */
    get settledState(): KineticEndpointState | null {
        return this.settled;
    }

    /** Non-null while any morph is active; a stable join of the active keys. */
    get activeKey(): string | null {
        if (this.morphs.length === 0) return null;
        return this.morphs.map((m) => m.key).join('|');
    }

    commit(params: KineticCommitParams): void {
        if (params.ownershipVersion === this.settledVersion) return;

        const previous = this.settled;
        this.settled = params.state;
        this.settledVersion = params.ownershipVersion;
        this.frozenCache = null;

        if (!previous || params.transitionKey === null) {
            // Initial load or explicit snap: no animation.
            this.morphs = [];
            return;
        }

        const bubble = buildTransitionBubble({
            s0: previous,
            s1: params.state,
            rippleOrigin: params.rippleOrigin ?? null,
            conquestOrigins: params.conquestOrigins,
            conquestFrontMode: params.conquestFrontMode,
        });
        const changedSiteIds = changedSiteIdsOf(bubble);
        if (changedSiteIds.size === 0) return; // no visible delta; keep morphs

        const durationMs = Math.max(1, params.durationMs);
        const overlaps = this.morphs.some((m) =>
            intersects(m.changedSiteIds, changedSiteIds),
        );

        if (!overlaps) {
            // Independent conquest → its OWN clock; existing morphs untouched.
            this.morphs = [
                ...this.morphs,
                {
                    key: params.transitionKey,
                    startedAtMs: params.nowMs,
                    durationMs,
                    bubble,
                    clip: params.clip,
                    changedSiteIds,
                },
            ];
            return;
        }

        // Overlap (recapture / adjacent shared cell): materialize the CURRENT
        // screen of all active morphs and re-diff into ONE continuous morph, so
        // shared cells stay single-valued (no coincident-owner corruption) and
        // the compositing invariant "no two active morphs share a site" holds.
        const from = this.materializeComposite(params.nowMs, previous);
        const merged = buildTransitionBubble({
            s0: from,
            s1: params.state,
            rippleOrigin: params.rippleOrigin ?? null,
            conquestOrigins: params.conquestOrigins,
            conquestFrontMode: params.conquestFrontMode,
        });
        this.morphs = [
            {
                key: params.transitionKey,
                startedAtMs: params.nowMs,
                durationMs,
                bubble: merged,
                clip: params.clip,
                changedSiteIds: changedSiteIdsOf(merged),
            },
        ];
    }

    /**
     * FULL-diagram per-frame sample: render the whole map as ONE power diagram
     * (no frozen/bubble stitch), so every conquest split's crossings resolve on
     * exact same-diagram edges — the fix for the bucket-fill / dropped-front-
     * segment. Handles ANY number of concurrent DISJOINT morphs (each at its own
     * local p; disjointness is guaranteed at commit, where overlaps merge) — the
     * old single-morph-only limit made multi-conquest ticks fall back to the
     * stitch and its hanging-node artifacts (the "occasional different end-snap").
     * Globally-frozen sites = the intersection of every morph's frozenPairs (by
     * site identity), i.e. the settled map minus every moving region. Returns
     * null when idle. No frozenCells (everything is in bubbleCells).
     */
    sampleFull(
        nowMs: number,
        options?: { readonly deferConquestCuts?: boolean },
    ): KineticFrame | null {
        if (this.morphs.length === 0 || !this.settled) return null;
        const stillActive = this.morphs.filter(
            (m) => (nowMs - m.startedAtMs) / m.durationMs < 1,
        );
        if (stillActive.length !== this.morphs.length) {
            this.morphs = stillActive;
            this.frozenCache = null;
        }
        if (this.morphs.length === 0) return null;

        const parts = this.morphs.map((morph) => ({
            bubble: morph.bubble,
            p: clamp01((nowMs - morph.startedAtMs) / morph.durationMs),
        }));

        // Globally-frozen = frozen in EVERY morph (identity-keyed so duplicate
        // starIds — contest virtuals — stay distinct). For one morph this is
        // exactly its frozenPairs.
        let frozen = this.morphs[0]!.bubble.frozenPairs.map((pair) => ({
            site: pair.site,
            starId: pair.site.starId,
        }));
        for (let i = 1; i < this.morphs.length; i++) {
            const keys = new Set(
                this.morphs[i]!.bubble.frozenPairs.map((pair) =>
                    siteIdentityKey(pair.site),
                ),
            );
            frozen = frozen.filter((entry) => keys.has(siteIdentityKey(entry.site)));
        }

        // Clip from the most recent commit (matches the settled state).
        const clip = this.morphs[this.morphs.length - 1]!.clip;
        return sampleFullDiagramMulti(parts, frozen, clip, options);
    }

    /** Per-frame sample; null = idle (draw the settled state). */
    sample(nowMs: number): KineticFrame | null {
        if (this.morphs.length === 0 || !this.settled) return null;

        // Retire settled morphs (local p ≥ 1).
        const stillActive = this.morphs.filter(
            (m) => (nowMs - m.startedAtMs) / m.durationMs < 1,
        );
        if (stillActive.length !== this.morphs.length) {
            this.morphs = stillActive;
            this.frozenCache = null;
        }
        if (this.morphs.length === 0) return null;

        // Moving cells: each morph's sampled bubble cells. Morphs are disjoint
        // (overlaps were merged at commit), so the union has no site conflicts.
        const bubbleCells: PowerCell[] = [];
        let maxP = 0;
        for (const morph of this.morphs) {
            const p = clamp01((nowMs - morph.startedAtMs) / morph.durationMs);
            if (p > maxP) maxP = p;
            const frame = sampleKineticFrame({
                bubble: morph.bubble,
                p,
                clip: morph.clip,
            });
            for (const cell of frame.bubbleCells) bubbleCells.push(cell);
        }

        // Frozen base = settled cells no morph is moving. Reference-stable while
        // the morph set + settled are unchanged (Vector skin redraw key).
        const signature = `${this.settledVersion}#${this.morphs
            .map((m) => m.key)
            .join('|')}`;
        let frozenCells: PowerCell[];
        if (this.frozenCache && this.frozenCache.signature === signature) {
            frozenCells = this.frozenCache.cells;
        } else {
            const movingSiteIds = new Set<string>();
            for (const morph of this.morphs) {
                for (const id of morph.changedSiteIds) movingSiteIds.add(id);
            }
            frozenCells = this.settled.cells.filter(
                (c) => !movingSiteIds.has(c.siteId),
            );
            this.frozenCache = { signature, cells: frozenCells };
        }

        return { p: maxP, frozenCells, bubbleCells };
    }

    /**
     * Materialize the CURRENT screen (settled base + every morph's mid-frame)
     * as one endpoint state, for the overlap/recapture retarget. Frozen rest
     * comes from `base` (settled truth); each morph contributes its moving
     * cells (dominant-collapsed, see materializeMorphMoving). sourceSiteIndex is
     * re-based onto the combined array so the re-diff gets exact cell↔site links.
     */
    private materializeComposite(
        nowMs: number,
        base: KineticEndpointState,
    ): KineticEndpointState {
        const movingSiteIds = new Set<string>();
        for (const morph of this.morphs) {
            for (const id of morph.changedSiteIds) movingSiteIds.add(id);
        }
        const sites: PowerCoreSite[] = [];
        const cells: PowerCell[] = [];
        for (const cell of base.cells) {
            if (movingSiteIds.has(cell.siteId)) continue;
            if (cell.sourceSiteIndex === undefined) continue;
            const site = base.sites[cell.sourceSiteIndex];
            if (!site) continue;
            sites.push(site);
            cells.push({ ...cell, sourceSiteIndex: sites.length - 1 });
        }
        for (const morph of this.morphs) {
            const moving = this.materializeMorphMoving(morph, nowMs);
            for (let i = 0; i < moving.sites.length; i++) {
                sites.push(moving.sites[i]!);
                cells.push({ ...moving.cells[i]!, sourceSiteIndex: sites.length - 1 });
            }
        }
        return { sites, cells };
    }

    /**
     * One morph's moving cells at nowMs, as (site, cell) pairs. A conquest
     * SWEEP splits ONE captured cell into two owner-parts (a render overlay, not
     * a diagram state) that share a sourceSiteIndex; a faithful endpoint has one
     * owner per site, so each such group collapses to its DOMINANT (larger-area)
     * part. Without this, the two parts become coincident different-owner sites
     * (siteIdentityKey is owner-keyed) and the re-diff re-animates a spurious
     * old→new flip on an already-conquered cell ("half snaps back to old owner").
     */
    private materializeMorphMoving(
        morph: ActiveMorph,
        nowMs: number,
    ): { sites: PowerCoreSite[]; cells: PowerCell[] } {
        const p = Math.min(
            0.999, // strictly mid-flight; p≥1 retires via sample()
            Math.max(0.001, (nowMs - morph.startedAtMs) / morph.durationMs),
        );
        const frame = sampleKineticFrame({
            bubble: morph.bubble,
            p,
            clip: morph.clip,
        });
        const sites: PowerCoreSite[] = [];
        const cells: PowerCell[] = [];
        const groups = new Map<number, PowerCell[]>();
        for (const cell of frame.bubbleCells) {
            if (cell.sourceSiteIndex === undefined) continue;
            const g = groups.get(cell.sourceSiteIndex);
            if (g) g.push(cell);
            else groups.set(cell.sourceSiteIndex, [cell]);
        }
        for (const [sourceSiteIndex, group] of groups) {
            const miniSite = frame.miniSites?.[sourceSiteIndex];
            if (!miniSite) continue; // ε-dominated ramp with no cell — absent
            let dominant = group[0]!;
            if (group.length > 1) {
                let bestArea = polygonArea(dominant.points);
                for (let i = 1; i < group.length; i++) {
                    const a = polygonArea(group[i]!.points);
                    if (a > bestArea) {
                        bestArea = a;
                        dominant = group[i]!;
                    }
                }
            }
            sites.push({
                x: miniSite.x,
                y: miniSite.y,
                weight: miniSite.weight,
                ownerId: dominant.ownerId,
                starId: dominant.siteId,
            });
            cells.push({ ...dominant }); // sourceSiteIndex re-based by caller
        }
        return { sites, cells };
    }
}
