/**
 * buildTransitionBubble — K1 step 1: identity-diff two endpoint states into
 * (frozen cells) + (ramp table + frozen ring) for the kinetic morph.
 *
 * Freeze rule: a cell is FROZEN iff its generator site exists in BOTH states
 * with identical owner/weight AND its polygon is identical (1e-3 quantized) in
 * S0 and S1. Everything else — changed polygons, handoffs, appear/vanish —
 * is bubble.
 *
 * Ring rule: frozen sites whose cells touch any bubble cell (shared quantized
 * segment or vertex), expanded `ringDepth` layers over frozen-cell adjacency.
 * Ring sites join the mini diagram as boundary conditions (their mini-cells
 * are discarded by the sampler). Two layers default — see the no-leak bound in
 * the spec (§2): ramped sites cannot beat frozen sites anywhere frozen wins at
 * both endpoints, so errors could only arise from EXCLUDED far blockers; two
 * true-blocker layers push that region beyond reach in practice, and the
 * sampler's bounds clamp asserts it.
 */

import type { PowerCoreSite } from './buildPowerCellsFromSites';
import type { PowerCell, Point } from './powerCoreTypes';
import {
    siteIdentityKey,
    type KineticEndpointState,
    type SiteRamp,
    type TransitionBubble,
} from './kineticTypes';

/** Weight given to appearing/vanishing sites at their zero end. Must be small
 *  enough to make the cell empty (or negligible) but finite for d3. */
export const KINETIC_EPSILON_WEIGHT = 1e-6;

const Q = 1000; // 1e-3 px quantization, matching the shared-edge graph.

function pointKey(p: Point): string {
    return `${Math.round(p[0] * Q)},${Math.round(p[1] * Q)}`;
}

export function polygonKey(points: readonly Point[]): string {
    // Rotation-invariant ring signature: start at lexicographically smallest
    // vertex key, keep orientation as-is (both states produce same orientation
    // for an unchanged cell).
    const keys = points.map(pointKey);
    if (keys.length === 0) return '';
    let best = 0;
    for (let i = 1; i < keys.length; i++) if (keys[i]! < keys[best]!) best = i;
    const rotated: string[] = [];
    for (let i = 0; i < keys.length; i++) {
        rotated.push(keys[(best + i) % keys.length]!);
    }
    return rotated.join('|');
}

function segmentKeysOf(cell: PowerCell): string[] {
    const keys: string[] = [];
    const n = cell.points.length;
    for (let i = 0; i < n; i++) {
        const a = pointKey(cell.points[i]!);
        const b = pointKey(cell.points[(i + 1) % n]!);
        keys.push(a < b ? `${a}>${b}` : `${b}>${a}`);
    }
    return keys;
}

export interface BuildTransitionBubbleParams {
    readonly s0: KineticEndpointState;
    readonly s1: KineticEndpointState;
    /** Frozen adjacency layers to include as mini-diagram boundary conditions. */
    readonly ringDepth?: number;
    /**
     * Optional ripple origin (the captured star). When set, each ramp gets a
     * distance-staggered window so the morph propagates outward like a wave;
     * when absent all ramps use the whole window.
     */
    readonly rippleOrigin?: { x: number; y: number } | null;
    /** Fraction of the timeline a single site's ramp occupies when rippling. */
    readonly rippleSpan?: number;
    /**
     * Captured-star attack origins: starId → the attacker's position (the new
     * owner's star the conquest came from). A handoff ramp whose starId is here
     * becomes a 'conquest' SWEEP (incoming owner grows from the attack side).
     * Handoffs not in this map (e.g. disconnect owner remap) stay a plain flip.
     */
    readonly conquestOrigins?: ReadonlyMap<string, { x: number; y: number }>;
}

export function buildTransitionBubble(
    params: BuildTransitionBubbleParams,
): TransitionBubble {
    const ringDepth = params.ringDepth ?? 3;
    // Default 1.0 = NO stagger: every ramp morphs over the FULL window, so the
    // conquest sweep spans the whole tick instead of finishing at ~0.55 and
    // sitting. The wave/ripple (rippleSpan < 1) becomes an opt-in tunable.
    const rippleSpan = Math.min(1, Math.max(0.05, params.rippleSpan ?? 1.0));

    // Index both states by composite site key.
    const sites0 = new Map<string, PowerCoreSite>();
    for (const site of params.s0.sites) sites0.set(siteIdentityKey(site), site);
    const sites1 = new Map<string, PowerCoreSite>();
    for (const site of params.s1.sites) sites1.set(siteIdentityKey(site), site);
    const mapCells = (
        cells: readonly PowerCell[],
        stateSites: readonly PowerCoreSite[],
    ): Map<string, PowerCell> => {
        const map = new Map<string, PowerCell>();
        for (const cell of cells) {
            // Exact link when available; containment fallback is unreliable in
            // weighted diagrams (a site may lie outside its own cell).
            const site =
                cell.sourceSiteIndex !== undefined
                    ? stateSites[cell.sourceSiteIndex]
                    : findSiteForCell(cell, stateSites);
            if (site) map.set(siteIdentityKey(site), cell);
        }
        return map;
    };
    const cells0 = mapCells(params.s0.cells, params.s0.sites);
    const cells1 = mapCells(params.s1.cells, params.s1.sites);

    // Position key → the sites at that position in each state (for handoff
    // detection: same spot, different owner ⇒ ghost pair, one ramp).
    const posKey = (s: { x: number; y: number }) =>
        `${Math.round(s.x * Q)},${Math.round(s.y * Q)}`;

    // ── Classify sites into frozen / ramps ─────────────────────────────────
    const frozenSites: PowerCoreSite[] = [];
    const frozenCells: PowerCell[] = [];
    const bubbleKeys0 = new Set<string>();
    const bubbleKeys1 = new Set<string>();
    const ramps: SiteRamp[] = [];
    const consumed0 = new Set<string>();
    const consumed1 = new Set<string>();

    // Pass 1: identical-key sites → frozen (cell unchanged incl. EFFECTIVE
    // owner — disconnect remap can flip a cell's owner without moving it) or
    // weight/constant/handoff ramp. Effective owners come from the CELLS.
    for (const [key, site1] of sites1) {
        const site0 = sites0.get(key);
        if (!site0) continue;
        consumed0.add(key);
        consumed1.add(key);
        const c0 = cells0.get(key);
        const c1 = cells1.get(key);
        const sameWeight = site0.weight === site1.weight;
        const samePoly =
            c0 && c1 ? polygonKey(c0.points) === polygonKey(c1.points) : c0 === c1;
        const owner0 = c0?.ownerId ?? site0.ownerId;
        const owner1 = c1?.ownerId ?? site1.ownerId;
        if (sameWeight && samePoly && owner0 === owner1) {
            frozenSites.push(site1);
            if (c1) frozenCells.push(c1);
            continue;
        }
        bubbleKeys0.add(key);
        bubbleKeys1.add(key);
        // Cell-EXISTENCE flips (site present in both states, but its cell was
        // squeezed empty at one endpoint by neighbors) must ramp like
        // appear/vanish — classifying them 'constant' materializes a full-
        // weight cell instantly at p=0+ that S0 never had.
        const existenceKind: 'appear' | 'vanish' | null =
            !c0 && c1 ? 'appear' : c0 && !c1 ? 'vanish' : null;
        ramps.push(
            existenceKind === 'appear'
                ? {
                      kind: 'appear', x: site1.x, y: site1.y, starId: site1.starId,
                      ownerA: '', ownerB: owner1,
                      w0: KINETIC_EPSILON_WEIGHT, w1: site1.weight,
                      delay: 0, span: 1,
                  }
                : existenceKind === 'vanish'
                    ? {
                          kind: 'vanish', x: site0.x, y: site0.y, starId: site0.starId,
                          ownerA: owner0, ownerB: '',
                          w0: site0.weight, w1: KINETIC_EPSILON_WEIGHT,
                          delay: 0, span: 1,
                      }
                    : {
                          kind: owner0 !== owner1 ? 'handoff' : sameWeight ? 'constant' : 'weight',
                          x: site1.x, y: site1.y, starId: site1.starId,
                          ownerA: owner0, ownerB: owner1,
                          w0: site0.weight, w1: site1.weight,
                          delay: 0, span: 1,
                      },
        );
    }

    // Pass 2: unmatched sites — pair by position across states (handoff), else
    // appear/vanish.
    const unmatched0 = [...sites0.entries()].filter(([k]) => !consumed0.has(k));
    const unmatched1 = [...sites1.entries()].filter(([k]) => !consumed1.has(k));
    const unmatched1ByPos = new Map<string, [string, PowerCoreSite][]>();
    for (const entry of unmatched1) {
        const pk = posKey(entry[1]);
        const bucket = unmatched1ByPos.get(pk) ?? [];
        bucket.push(entry);
        unmatched1ByPos.set(pk, bucket);
    }
    for (const [key0, site0] of unmatched0) {
        const bucket = unmatched1ByPos.get(posKey(site0)) ?? [];
        const partner = bucket.shift(); // deterministic: sites sorted upstream
        bubbleKeys0.add(key0);
        const owner0 = cells0.get(key0)?.ownerId ?? site0.ownerId;
        if (partner) {
            const [key1, site1] = partner;
            consumed1.add(key1);
            bubbleKeys1.add(key1);
            ramps.push({
                kind: 'handoff',
                x: site1.x,
                y: site1.y,
                starId: site1.starId,
                ownerA: owner0,
                ownerB: cells1.get(key1)?.ownerId ?? site1.ownerId,
                w0: site0.weight,
                w1: site1.weight,
                delay: 0,
                span: 1,
            });
        } else {
            ramps.push({
                kind: 'vanish',
                x: site0.x,
                y: site0.y,
                starId: site0.starId,
                ownerA: owner0,
                ownerB: '',
                w0: site0.weight,
                w1: KINETIC_EPSILON_WEIGHT,
                delay: 0,
                span: 1,
            });
        }
    }
    for (const [key1, site1] of unmatched1) {
        if (consumed1.has(key1)) continue;
        bubbleKeys1.add(key1);
        ramps.push({
            kind: 'appear',
            x: site1.x,
            y: site1.y,
            starId: site1.starId,
            ownerA: '',
            ownerB: cells1.get(key1)?.ownerId ?? site1.ownerId,
            w0: KINETIC_EPSILON_WEIGHT,
            w1: site1.weight,
            delay: 0,
            span: 1,
        });
    }

    // ── Bubble endpoint cells + adjacency-based frozen ring ────────────────
    const bubbleCells0 = [...bubbleKeys0].map((k) => cells0.get(k)).filter(Boolean) as PowerCell[];
    const bubbleCells1 = [...bubbleKeys1].map((k) => cells1.get(k)).filter(Boolean) as PowerCell[];

    // Segment/vertex adjacency over S1 (and S0 for vanished cells' neighbors).
    const touchIndex = new Map<string, Set<string>>(); // point/segment key → site keys
    const register = (cell: PowerCell, key: string) => {
        for (const sk of segmentKeysOf(cell)) {
            (touchIndex.get(sk) ?? touchIndex.set(sk, new Set()).get(sk)!).add(key);
        }
        for (const p of cell.points) {
            const pk = `v:${pointKey(p)}`;
            (touchIndex.get(pk) ?? touchIndex.set(pk, new Set()).get(pk)!).add(key);
        }
    };
    const frozenByKey = new Map<string, { site: PowerCoreSite; cell: PowerCell }>();
    for (const site of frozenSites) {
        const key = siteIdentityKey(site);
        const cell = cells1.get(key);
        if (cell) {
            frozenByKey.set(key, { site, cell });
            register(cell, key);
        }
    }

    const ringKeys = new Set<string>();
    const flexKeys = new Set<string>(); // layer 1 — adjacent to changed cells
    let frontier: PowerCell[] = [...bubbleCells0, ...bubbleCells1];
    for (let depth = 0; depth < ringDepth; depth++) {
        const next = new Set<string>();
        for (const cell of frontier) {
            for (const sk of segmentKeysOf(cell)) {
                for (const k of touchIndex.get(sk) ?? []) next.add(k);
            }
            for (const p of cell.points) {
                for (const k of touchIndex.get(`v:${pointKey(p)}`) ?? []) next.add(k);
            }
        }
        frontier = [];
        for (const k of next) {
            if (ringKeys.has(k)) continue;
            ringKeys.add(k);
            if (depth === 0) flexKeys.add(k);
            const entry = frozenByKey.get(k);
            if (entry) frontier.push(entry.cell);
        }
    }
    // FLEX layer: space vacated/claimed between two RAMPING sites can be
    // transiently won by an adjacent unchanged site mid-morph (the static
    // no-leak bound only covers competitors at full endpoint strength). Those
    // innermost neighbors therefore render from the live mini diagram —
    // constant ramps whose cells are KEPT — instead of being discarded. The
    // deeper guard layers cannot move (shielded by the flex layer's full-
    // strength frozen sites) and stay discard-only boundary conditions.
    for (const k of flexKeys) {
        const entry = frozenByKey.get(k);
        if (!entry) continue;
        const frozenIdx = frozenCells.indexOf(entry.cell);
        if (frozenIdx >= 0) frozenCells.splice(frozenIdx, 1);
        bubbleCells0.push(entry.cell);
        bubbleCells1.push(entry.cell);
        ramps.push({
            kind: 'constant',
            x: entry.site.x,
            y: entry.site.y,
            starId: entry.site.starId,
            ownerA: entry.cell.ownerId,
            ownerB: entry.cell.ownerId,
            w0: entry.site.weight,
            w1: entry.site.weight,
            delay: 0,
            span: 1,
        });
    }
    const ringSites = [...ringKeys]
        .filter((k) => !flexKeys.has(k))
        .map((k) => frozenByKey.get(k)?.site)
        .filter(Boolean) as PowerCoreSite[];
    ringSites.sort((a, b) => (siteIdentityKey(a) < siteIdentityKey(b) ? -1 : 1));

    // Deep-frozen (site, cell) pairs — exactly the frozenCells set, with
    // generator sites, for mid-morph endpoint materialization (retarget).
    const frozenPairs = [...frozenByKey.entries()]
        .filter(([k]) => !flexKeys.has(k))
        .map(([, entry]) => entry)
        .sort((a, b) =>
            siteIdentityKey(a.site) < siteIdentityKey(b.site) ? -1 : 1,
        );

    // ── Conquest sweeps: captured-star handoffs → directional sweeps ────────
    const conquestOrigins = params.conquestOrigins;
    const conquestRamps: SiteRamp[] =
        conquestOrigins && conquestOrigins.size > 0
            ? ramps.map((r) => {
                  if (r.kind !== 'handoff') return r;
                  const origin = conquestOrigins.get(r.starId);
                  if (!origin) return r;
                  const dirX = r.x - origin.x;
                  const dirY = r.y - origin.y;
                  const len = Math.hypot(dirX, dirY);
                  if (len < 1e-6) return r; // attacker coincident — keep the flip
                  // Sweep span = outradius of the captured cell in S0.
                  let radius = 0;
                  for (const cell of params.s0.cells) {
                      if (cell.siteId !== r.starId) continue;
                      for (const [px, py] of cell.points) {
                          const d = Math.hypot(px - r.x, py - r.y);
                          if (d > radius) radius = d;
                      }
                      break;
                  }
                  if (radius <= 0) return r;
                  return {
                      ...r,
                      kind: 'conquest' as const,
                      attackDirX: dirX / len,
                      attackDirY: dirY / len,
                      cellRadius: radius,
                  };
              })
            : ramps;

    // ── Ripple stagger ─────────────────────────────────────────────────────
    let staggered = conquestRamps;
    if (params.rippleOrigin && conquestRamps.length > 1) {
        let maxDist = 0;
        const dists = conquestRamps.map((r) => {
            const d = Math.hypot(r.x - params.rippleOrigin!.x, r.y - params.rippleOrigin!.y);
            if (d > maxDist) maxDist = d;
            return d;
        });
        const window = Math.max(0, 1 - rippleSpan);
        staggered = conquestRamps.map((r, i) => ({
            ...r,
            delay: maxDist > 0 ? (dists[i]! / maxDist) * window : 0,
            span: rippleSpan,
        }));
    }
    // Deterministic ramp order.
    const rampKey = (r: SiteRamp) =>
        `${r.starId}§${r.ownerA}→${r.ownerB}§${Math.round(r.x * Q)},${Math.round(r.y * Q)}`;
    staggered = [...staggered].sort((a, b) => (rampKey(a) < rampKey(b) ? -1 : 1));

    // ── Bounds ─────────────────────────────────────────────────────────────
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const extend = (cells: readonly PowerCell[]) => {
        for (const cell of cells) {
            for (const [x, y] of cell.points) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }
    };
    extend(bubbleCells0);
    extend(bubbleCells1);
    for (const k of ringKeys) {
        const entry = frozenByKey.get(k);
        if (entry) extend([entry.cell]);
    }

    return {
        ramps: staggered,
        frozenPairs,
        ringSites,
        frozenCells,
        bubbleCells0,
        bubbleCells1,
        bounds: { minX, minY, maxX, maxY },
    };
}

/** Match a cell back to its generator site (composite identity; cells carry
 *  only siteId+ownerId, so disambiguate duplicates by containment of the
 *  site position — cheap: duplicates are rare contest virtuals). */
function findSiteForCell(
    cell: PowerCell,
    sites: readonly PowerCoreSite[],
): PowerCoreSite | null {
    let candidate: PowerCoreSite | null = null;
    let count = 0;
    for (const site of sites) {
        if (site.starId === cell.siteId) {
            count++;
            candidate = site;
        }
    }
    if (count <= 1) return candidate;
    // Duplicate starIds: pick the site whose position is inside the cell.
    for (const site of sites) {
        if (site.starId !== cell.siteId) continue;
        if (pointInRing(site.x, site.y, cell.points)) return site;
    }
    return candidate;
}

function pointInRing(x: number, y: number, ring: readonly Point[]): boolean {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i]!;
        const [xj, yj] = ring[j]!;
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
            inside = !inside;
        }
    }
    return inside;
}
