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

/** Local progress of one ramp at global progress p (monotone in p). */
export function rampProgress(ramp: SiteRamp, p: number): number {
    if (ramp.span <= 0) return p >= ramp.delay ? 1 : 0;
    return smoothstep((p - ramp.delay) / ramp.span);
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
}

export function sampleKineticFrame(params: SampleKineticFrameParams): KineticFrame {
    const p = params.p <= 0 ? 0 : params.p >= 1 ? 1 : params.p;
    const { bubble } = params;

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
            const q = rampProgress(ramp, p);
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
