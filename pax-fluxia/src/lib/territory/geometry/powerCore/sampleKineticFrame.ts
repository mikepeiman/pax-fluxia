/**
 * sampleKineticFrame — K1 step 2: one frame of the kinetic bubble morph.
 *
 * At p, every ramped site gets its interpolated weight; a MINI power diagram
 * of (ramped sites + frozen ring) is computed; ring cells are discarded; the
 * surviving bubble cells are stitched with the frozen S1 cells.
 *
 * Endpoints are SNAPPED: p<=0 returns bubbleCells0, p>=1 returns bubbleCells1
 * exactly (T1 byte-exactness); the kinetic diagram covers 0<p<1 only. The
 * no-leak weight bound (spec §2) keeps ramped influence inside the bubble;
 * a bounds assertion guards the residual excluded-blocker risk.
 *
 * Owner semantics need no interpolation: a 'handoff' ramp is realized as TWO
 * co-located sites (ownerA fading out, ownerB fading in) — whichever wins
 * owns the ground, so the frontier sweeps continuously.
 */

import { buildPowerCellsFromSites, type PowerCoreSite } from './buildPowerCellsFromSites';
import { splitCellByFront, type ConquestFront } from './conquestFrontField';
import type { PowerCell, Point } from './powerCoreTypes';
import {
    KINETIC_EPSILON_WEIGHT,
} from './buildTransitionBubble';
import type { KineticFrame, SiteRamp, TransitionBubble } from './kineticTypes';

function smoothstep(q: number): number {
    const t = q < 0 ? 0 : q > 1 ? 1 : q;
    return t * t * (3 - 2 * t);
}

/**
 * ALL geometric motion finishes at this fraction of the morph timeline; the
 * remaining tail HOLDS the settled geometry (byte-identical to the snapshot),
 * so retirement swaps identical pixels and is invisible.
 *
 * Why (the transition "physics"): every moving element — the conquest front,
 * weight-ramped cell bisectors (neighbour and third-party borders), APPEARING
 * virtual cells (a growing bulge pushing into its neighbours), and VANISHING
 * virtual cells (a shrinking bump collapsing toward a point) — converges to the
 * settled shape exactly AT p=1, under smoothstep whose velocity → 0 at the end.
 * So the last visible remnants (a thin conquest strip; a vanishing cell's final
 * point; the bulge of a replaced contest virtual on a border) sit almost static
 * on screen and then POP when the morph retires — the reported "bulge or small
 * point that snaps back", on the conquered border AND on adjacent/third-party
 * borders alike. Completing ALL motion early lets every remnant animate to
 * nothing while the clock still runs. Applied INSIDE rampProgress so every
 * consumer (weights, appear/vanish scaling, the front split) shares it.
 */
const MORPH_COMPLETE_AT_DEFAULT = 0.92;

/**
 * Live-tunable completion fraction (Territory → Motion Completion slider).
 * Module-mutable rather than a config import so this module stays pure /
 * offline-testable; the frame boundary (GameCanvas) injects the config value
 * via setMorphCompleteAt each frame. At 1.0 motion runs the FULL window (no
 * early-completion hold) — snap-free only once topology-stable smoothing lands;
 * until then higher values place the completion snap closer to the tick edge.
 */
let morphCompleteAt = MORPH_COMPLETE_AT_DEFAULT;

/** Inject the completion fraction (clamped to a sane 0.5–1.0). */
export function setMorphCompleteAt(fraction: number): void {
    if (!Number.isFinite(fraction)) return;
    morphCompleteAt = fraction < 0.5 ? 0.5 : fraction > 1 ? 1 : fraction;
}

/** Current completion fraction (for diagnostics/tests). */
export function getMorphCompleteAt(): number {
    return morphCompleteAt;
}

// ── END_SNAP_FIX_EVAL ('converge' mode) ──────────────────────────────────────
// Blend weight for projecting a morph frame's surface onto the SETTLED surface
// over the conquest's final approach (buildSurfaceFromCells SurfaceConvergeTarget).
// Driven by the same rampProgress the front uses, so it tracks completion for
// ANY morphCompleteAt: 0 until CONVERGE_Q_START (pure sweep), smoothstep to 1
// as q→1 so the transition LANDS on the settled map with no pop.
const CONVERGE_Q_START = 0.8;

/** Convergence blend (0..1) at aggregate frame progress `p`. */
export function conquestConvergeBlend(p: number): number {
    const q = Math.min(1, smoothstep(p < 0 ? 0 : p > 1 ? 1 : p) / morphCompleteAt);
    const t = (q - CONVERGE_Q_START) / (1 - CONVERGE_Q_START);
    const c = t < 0 ? 0 : t > 1 ? 1 : t;
    return c * c * (3 - 2 * c);
}

function conquestFrontQ(ramp: SiteRamp, p: number): number {
    return rampProgress(ramp, p); // early-completion lives in rampProgress
}

/** Local progress of one ramp at global progress p (monotone in p; reaches 1
 *  at morphCompleteAt of the ramp's window and holds — see note above). */
export function rampProgress(ramp: SiteRamp, p: number): number {
    if (ramp.span <= 0) return p >= ramp.delay ? 1 : 0;
    return Math.min(1, smoothstep((p - ramp.delay) / ramp.span) / morphCompleteAt);
}

/**
 * Mini-diagram site ids are SYNTHETIC and unique (`k<rampIndex>[~out|~in]`,
 * `ring§<i>`): starIds are NOT unique in this codebase (corridor contest
 * virtuals share one starId dozens of times), so filtering or mapping by
 * starId silently drops bubble cells that share a name with ring cells.
 */
function rampSites(ramp: SiteRamp, p: number, index: number): PowerCoreSite[] {
    const q = rampProgress(ramp, p);
    // Power-diagram cell radius scales ~sqrt(weight): ramp gained/lost weight
    // QUADRATICALLY so the visible radius onset is LINEAR in q — no fast pop
    // at the ends, matching the water/ripple feel target (T1 continuity).
    const grow = q * q;
    const shrink = (1 - q) * (1 - q);
    const id = `k${index}`;
    switch (ramp.kind) {
        case 'constant':
            return [
                { x: ramp.x, y: ramp.y, weight: ramp.w1, ownerId: ramp.ownerB, starId: id },
            ];
        case 'weight':
            return [
                {
                    x: ramp.x, y: ramp.y,
                    weight: ramp.w0 + (ramp.w1 - ramp.w0) * q,
                    ownerId: ramp.ownerB,
                    starId: id,
                },
            ];
        case 'conquest':
            // Conquest = ONE ordinary site in the diagram (the cell's SHAPE is
            // whatever the diagram says — no ghost pairs, no weight games, so
            // neighbors are untouched at ANY cell size incl. world-bound
            // cells). The visible SWEEP is applied afterwards: the kept cell is
            // geometrically SPLIT by a line that travels attack-edge → far-edge
            // with q (see splitConquestCell in sampleKineticFrame). Failed
            // prior mechanisms, for the record: co-located ghost pair = binary
            // flip; equal-weight sliding pair = bisector travels only HALF the
            // cell (the "sweep ends early, final pops late" defect); weight-
            // delta sweep needs Δw ~ cellRadius² which dwarfs star weights and
            // bleeds into neighbors on large cells.
            return [
                {
                    x: ramp.x, y: ramp.y,
                    weight: ramp.w0 + (ramp.w1 - ramp.w0) * q,
                    ownerId: ramp.ownerB,
                    starId: id,
                },
            ];
        case 'handoff':
            // Owner change with NO attack direction (e.g. disconnect owner
            // remap). No sweep is possible without a direction, so flip the
            // single site's owner at the midpoint (geometry unchanged).
            return [
                {
                    x: ramp.x, y: ramp.y,
                    weight: ramp.w0 + (ramp.w1 - ramp.w0) * q,
                    ownerId: q < 0.5 ? ramp.ownerA : ramp.ownerB,
                    starId: id,
                },
            ];
        case 'appear':
            // Fixed position, weight grows quadratically (radius ~ linear).
            // An ε-weight site inside reach of full-weight neighbors has an
            // empty cell, so appearing virtuals are truly absent at q≈0.
            return [
                {
                    x: ramp.x, y: ramp.y,
                    weight: Math.max(KINETIC_EPSILON_WEIGHT, ramp.w1 * grow),
                    ownerId: ramp.ownerB,
                    starId: id,
                },
            ];
        case 'vanish':
            return [
                {
                    x: ramp.x, y: ramp.y,
                    weight: Math.max(KINETIC_EPSILON_WEIGHT, ramp.w0 * shrink),
                    ownerId: ramp.ownerA,
                    starId: id,
                },
            ];
    }
}

export interface SampleKineticFrameParams {
    readonly bubble: TransitionBubble;
    /** Global progress 0..1 (clamped). */
    readonly p: number;
    /** World clip ring (the same padded clip the endpoint diagrams used). */
    readonly clip: [number, number][];
    /** Safety margin (px) for the bounds assertion. */
    readonly boundsMarginPx?: number;
    /**
     * FULL mode: build ONE power diagram of EVERY site at p (ramps + all frozen
     * sites) instead of the mini-diagram + frozen-S1 stitch. The whole map is a
     * single conforming diagram, so the conquest split's crossing points land on
     * EXACT same-diagram neighbour edges (resolvable) rather than across the
     * frozen/bubble precision boundary (unresolvable ⇒ dropped frontier ⇒
     * bucket-fill). Returns everything in bubbleCells; frozenCells is empty.
     */
    readonly full?: boolean;
}

export function sampleKineticFrame(params: SampleKineticFrameParams): KineticFrame {
    const p = params.p <= 0 ? 0 : params.p >= 1 ? 1 : params.p;
    const { bubble } = params;

    if (params.full) return sampleFullDiagram(bubble, params.p, params.clip);

    // T1: exact endpoint snap.
    if (p === 0) {
        return { p, frozenCells: bubble.frozenCells, bubbleCells: bubble.bubbleCells0 };
    }
    if (p === 1) {
        return { p, frozenCells: bubble.frozenCells, bubbleCells: bubble.bubbleCells1 };
    }

    // Ramped sites at p + the frozen ring as boundary conditions — all under
    // SYNTHETIC unique ids (see rampSites doc).
    const miniSites: PowerCoreSite[] = [];
    bubble.ramps.forEach((ramp, index) => {
        for (const site of rampSites(ramp, p, index)) miniSites.push(site);
    });
    bubble.ringSites.forEach((site, i) => {
        miniSites.push({ ...site, starId: `ring§${i}` });
    });

    // The diagram library can fail on degenerate configurations ("twin is
    // null": near-coincident / collinear sites at unlucky weight ratios).
    // Deterministic escape: retry with a SUB-QUANTUM golden-angle jitter on
    // RAMPED sites only (ring sites stay exact — they define the seam with
    // the frozen exterior; moving them by even one 1e-3 quantum tears the
    // stitched edge keys). Magnitudes 2.5e-4 / 5e-4: below the quantum,
    // above the library's degeneracy epsilon, identical on every run.
    const ringStart = miniSites.length - bubble.ringSites.length;
    let miniCells: PowerCell[] | null = null;
    let usedSites: PowerCoreSite[] = miniSites;
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3 && !miniCells; attempt++) {
        try {
            const jitter = attempt * 2.5e-4;
            const sites =
                attempt === 0
                    ? miniSites
                    : miniSites.map((site, i) =>
                          i >= ringStart
                              ? site
                              : {
                                    ...site,
                                    x: site.x + jitter * Math.cos(i * 2.399963229728653),
                                    y: site.y + jitter * Math.sin(i * 2.399963229728653),
                                },
                      );
            usedSites = dedupeCoincident(sites);
            miniCells = buildPowerCellsFromSites(usedSites, params.clip);
        } catch (error) {
            lastError = error;
        }
    }
    if (!miniCells) {
        throw new Error(`sampleKineticFrame: diagram failed after retries at p=${p}: ${lastError}`);
    }

    // Discard ring cells; keep the morphing bubble cells, mapping synthetic
    // ids back to the originating ramp's starId for consumers.
    const margin = params.boundsMarginPx ?? 4;
    const { minX, minY, maxX, maxY } = bubble.bounds;
    const bubbleCells: PowerCell[] = [];
    for (const cell of miniCells) {
        if (cell.siteId.startsWith('ring§')) continue;
        const match = /^k(\d+)/.exec(cell.siteId);
        const ramp = match ? bubble.ramps[Number(match[1])] : undefined;
        // Bounds guard: a kept cell escaping the bubble bbox means an excluded
        // far blocker mattered — surface loudly instead of drawing bad frames.
        for (const [x, y] of cell.points) {
            if (
                x < minX - margin || y < minY - margin ||
                x > maxX + margin || y > maxY + margin
            ) {
                throw new Error(
                    `sampleKineticFrame: bubble cell ${cell.siteId} escaped bounds at p=${p} ` +
                    `(${x.toFixed(1)},${y.toFixed(1)}) — increase ringDepth`,
                );
            }
        }
        if (ramp?.kind === 'conquest') {
            // Visible sweep: split the captured cell by the arrival-time front.
            const q = conquestFrontQ(ramp, p);
            const front: ConquestFront = {
                mode: ramp.frontMode ?? 'linear',
                dirX: ramp.attackDirX ?? 0,
                dirY: ramp.attackDirY ?? 0,
                originX: ramp.attackOriginX ?? ramp.x,
                originY: ramp.attackOriginY ?? ramp.y,
                starId: ramp.starId,
                ownerIn: ramp.ownerB,
                ownerOld: ramp.ownerA,
                subdiv: 6,
            };
            for (const partCell of splitCellByFront(cell, front, q)) {
                bubbleCells.push(partCell);
            }
            continue;
        }
        bubbleCells.push({ ...cell, siteId: ramp?.starId ?? cell.siteId });
    }

    return { p, frozenCells: bubble.frozenCells, bubbleCells, miniSites: usedSites };
}

/** One morph's contribution to the combined full diagram: its bubble's ramps
 *  animated at its OWN local progress (independent clocks). */
export interface FullDiagramPart {
    readonly bubble: TransitionBubble;
    /** Local progress 0..1 for THIS morph. */
    readonly p: number;
}

/**
 * FULL-diagram frame: ONE power diagram of every site — each part's ramps at
 * that part's local p, plus every globally-frozen site — then the conquest
 * splits. No frozen/bubble seam, so each split's crossings land on exact
 * same-diagram edges. Handles ANY number of DISJOINT concurrent morphs (the
 * runtime guarantees disjointness by merging overlaps at commit); with one part
 * this is exactly the old single-morph full diagram. Synthetic ids: `m<part>k<ramp>`
 * for ramps, `frozen<i>` for frozen sites. Local p is clamped off the exact
 * endpoints so appear/vanish ε-weights don't go fully degenerate.
 */
export function sampleFullDiagramMulti(
    parts: readonly FullDiagramPart[],
    frozenSites: readonly { site: PowerCoreSite; starId: string }[],
    clip: [number, number][],
    options?: {
        /**
         * END_SNAP_FIX_EVAL 'round_cut': do NOT apply conquest splits here —
         * emit the captured cell UNSPLIT (victor-owned, idle-identical input for
         * the border graph + Chaikin) and return the cut records in
         * KineticFrame.conquestCuts for the presentation layer to apply AFTER
         * rounding (cutSurfaceByFront).
         */
        readonly deferConquestCuts?: boolean;
    },
): KineticFrame {
    const clampedP = parts.map((part) =>
        part.p <= 0 ? 1e-4 : part.p >= 1 ? 1 - 1e-4 : part.p,
    );

    const sites: PowerCoreSite[] = [];
    parts.forEach((part, pi) => {
        part.bubble.ramps.forEach((ramp, ri) => {
            for (const site of rampSites(ramp, clampedP[pi]!, ri)) {
                sites.push({ ...site, starId: `m${pi}${site.starId}` });
            }
        });
    });
    const rampSiteCount = sites.length; // jitter only these; frozen stay exact
    frozenSites.forEach((pair, i) => {
        sites.push({ ...pair.site, starId: `frozen${i}` });
    });

    let cells: PowerCell[] | null = null;
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3 && !cells; attempt++) {
        try {
            const jitter = attempt * 2.5e-4;
            const jittered =
                attempt === 0
                    ? sites
                    : sites.map((site, i) =>
                          i >= rampSiteCount
                              ? site
                              : {
                                    ...site,
                                    x: site.x + jitter * Math.cos(i * 2.399963229728653),
                                    y: site.y + jitter * Math.sin(i * 2.399963229728653),
                                },
                      );
            cells = buildPowerCellsFromSites(dedupeCoincident(jittered), clip);
        } catch (error) {
            lastError = error;
        }
    }
    if (!cells) {
        throw new Error(`sampleFullDiagramMulti: diagram failed after retries: ${lastError}`);
    }

    const bubbleCells: PowerCell[] = [];
    const conquestCuts: import('./kineticTypes').ConquestCut[] = [];
    const islandCollapses: import('./kineticTypes').IslandCollapse[] = [];
    for (const cell of cells) {
        const kMatch = /^m(\d+)k(\d+)/.exec(cell.siteId);
        const part = kMatch ? parts[Number(kMatch[1])] : undefined;
        const ramp = kMatch && part ? part.bubble.ramps[Number(kMatch[2])] : undefined;
        if (part && ramp?.kind === 'conquest') {
            const q = conquestFrontQ(ramp, clampedP[Number(kMatch![1])]!);
            if (ramp.collapse) {
                // ISLAND: emit the captured cell as VICTOR (settled geometry, tiles
                // watertight); the shrinking old region is a transient overlay.
                bubbleCells.push({ ...cell, siteId: ramp.starId, ownerId: ramp.ownerB });
                islandCollapses.push({
                    siteId: ramp.starId,
                    starX: ramp.x,
                    starY: ramp.y,
                    oldOwner: ramp.ownerA,
                    victorOwner: ramp.ownerB,
                    q,
                });
                continue;
            }
            const front: ConquestFront = {
                mode: ramp.frontMode ?? 'linear',
                dirX: ramp.attackDirX ?? 0,
                dirY: ramp.attackDirY ?? 0,
                originX: ramp.attackOriginX ?? ramp.x,
                originY: ramp.attackOriginY ?? ramp.y,
                starId: ramp.starId,
                ownerIn: ramp.ownerB,
                ownerOld: ramp.ownerA,
                subdiv: 6,
            };
            if (options?.deferConquestCuts) {
                // 'round_cut': the graph + smoothing must see the UNSPLIT cell
                // (idle-identical tessellation); the cut applies after rounding.
                bubbleCells.push({ ...cell, siteId: ramp.starId, ownerId: ramp.ownerB });
                conquestCuts.push({ siteId: ramp.starId, front, q });
                continue;
            }
            for (const partCell of splitCellByFront(cell, front, q)) bubbleCells.push(partCell);
            continue;
        }
        if (ramp) {
            bubbleCells.push({ ...cell, siteId: ramp.starId });
            continue;
        }
        const fMatch = /^frozen(\d+)/.exec(cell.siteId);
        const frozenStarId = fMatch ? frozenSites[Number(fMatch[1])]?.starId : undefined;
        bubbleCells.push({ ...cell, siteId: frozenStarId ?? cell.siteId });
    }

    let maxP = 0;
    for (const part of parts) {
        const p = part.p <= 0 ? 0 : part.p >= 1 ? 1 : part.p;
        if (p > maxP) maxP = p;
    }
    if (conquestCuts.length > 0 || islandCollapses.length > 0) {
        return {
            p: maxP,
            frozenCells: [],
            bubbleCells,
            ...(conquestCuts.length > 0 ? { conquestCuts } : {}),
            ...(islandCollapses.length > 0 ? { islandCollapses } : {}),
        };
    }
    return { p: maxP, frozenCells: [], bubbleCells };
}

/** Single-morph full diagram (the `full` param path) — one part, the bubble's
 *  own frozenPairs as the globally-frozen set. */
function sampleFullDiagram(
    bubble: TransitionBubble,
    rawP: number,
    clip: [number, number][],
): KineticFrame {
    return sampleFullDiagramMulti(
        [{ bubble, p: rawP }],
        bubble.frozenPairs.map((pair) => ({ site: pair.site, starId: pair.site.starId })),
        clip,
    );
}

/**
 * d3-weighted-voronoi fails ("twin is null") on exactly-coincident sites —
 * ghost pairs and duplicate contest virtuals produce them. Spread coincident
 * groups on a deterministic micro-ring (3e-3 px — invisible at render scale,
 * larger than the library's degeneracy epsilon).
 */
function dedupeCoincident(sites: readonly PowerCoreSite[]): PowerCoreSite[] {
    const byPos = new Map<string, number>();
    const out: PowerCoreSite[] = [];
    for (const site of sites) {
        // 1e-2 px quantum: anything closer than 0.01px is degenerate for the
        // library and indistinguishable at render scale.
        const key = `${Math.round(site.x * 100)},${Math.round(site.y * 100)}`;
        const n = byPos.get(key) ?? 0;
        byPos.set(key, n + 1);
        if (n === 0) {
            out.push(site);
        } else {
            const angle = n * 2.399963229728653; // golden angle — deterministic spread
            out.push({
                ...site,
                x: site.x + 5e-3 * n * Math.cos(angle),
                y: site.y + 5e-3 * n * Math.sin(angle),
            });
        }
    }
    return out;
}
