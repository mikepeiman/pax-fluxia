// ============================================================================
// Universal Geometry Modifiers
//
// Pipeline step functions that refine merged territory polygons.
// Pure geometry — no rendering, no PIXI, no config reads.
//
// Reference pipeline order:
//   Merge → CX → DX → Arc Smooth → Star Margin → Weld contested seams → Chaikin → Output
//
// Each function mutates MergedTerritory[].points in place for efficiency.
// ============================================================================

import type { MergedTerritory } from './types';
import type { StarState, StarConnection } from '$lib/types/game.types';
import { log } from '$lib/utils/logger';
import { edgeKey } from './polyUtils';

// ── Star Margin ─────────────────────────────────────────────────────────────

/**
 * Push territory boundary vertices outward so no vertex is closer than
 * `minRadius` to any star center within the same territory.
 *
 * Prevents territory fill from visually overlapping star icons.
 * Should run BEFORE smoothing so the margin is a hard geometric constraint.
 */
export function applyMinStarMargin(
    territories: MergedTerritory[],
    stars: StarState[],
    minRadius: number,
): void {
    if (minRadius <= 0) return;

    for (const territory of territories) {
        // Collect stars belonging to this owner
        const ownerStars = stars.filter(s => s.ownerId === territory.ownerId);

        for (let i = 0; i < territory.points.length; i++) {
            const [vx, vy] = territory.points[i];

            for (const star of ownerStars) {
                const dx = vx - star.x;
                const dy = vy - star.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < minRadius && dist > 0.001) {
                    // Push outward along star→vertex ray
                    const scale = minRadius / dist;
                    territory.points[i] = [star.x + dx * scale, star.y + dy * scale];
                }
            }
        }
    }
}

// ── Bézier Arc Smoothing ────────────────────────────────────────────────────

/**
 * Compute interior angle at vertex i of a polygon (in degrees).
 * Returns 0-180, where small values mean sharp/acute corners.
 */
function interiorAngle(pts: [number, number][], i: number): number {
    const n = pts.length;
    const isClosed = pts[0][0] === pts[n - 1][0] && pts[0][1] === pts[n - 1][1];
    const len = isClosed ? n - 1 : n;

    const prev = (i - 1 + len) % len;
    const next = (i + 1) % len;

    const ax = pts[prev][0] - pts[i][0];
    const ay = pts[prev][1] - pts[i][1];
    const bx = pts[next][0] - pts[i][0];
    const by = pts[next][1] - pts[i][1];

    const dot = ax * bx + ay * by;
    const magA = Math.hypot(ax, ay);
    const magB = Math.hypot(bx, by);
    if (magA === 0 || magB === 0) return 180;

    const cosAngle = Math.max(-1, Math.min(1, dot / (magA * magB)));
    return Math.acos(cosAngle) * (180 / Math.PI);
}

/**
 * Evaluate a quadratic Bézier curve at parameter t.
 * B(t) = (1-t)²·P0 + 2(1-t)t·P1 + t²·P2
 */
function quadBezier(
    p0: [number, number], p1: [number, number], p2: [number, number], t: number,
): [number, number] {
    const u = 1 - t;
    return [
        u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
        u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
    ];
}

/**
 * Smooth sharp vertices by replacing them with quadratic Bézier arcs.
 * For each vertex with interior angle < threshold:
 *   1. Retract vertex toward the nearest star center by arcStrength
 *   2. Tessellate a Bézier arc from prev vertex through retracted point to next
 *   3. Splice arc segments into the polygon
 *
 * Geometrically aware — uses star positions as retraction origins,
 * producing more natural territory shapes than pure Chaikin smoothing.
 */
export function smoothSharpVertices(
    territories: MergedTerritory[],
    stars: StarState[],
    arcStrength: number,
    arcThreshold: number,
    arcMinSegment: number,
): void {
    if (arcStrength <= 0) return;

    for (const territory of territories) {
        let pts = territory.points;
        const isClosed = pts.length > 1 &&
            pts[0][0] === pts[pts.length - 1][0] &&
            pts[0][1] === pts[pts.length - 1][1];
        if (isClosed) pts = pts.slice(0, -1) as [number, number][];

        const newPts: [number, number][] = [];
        const len = pts.length;

        const ownerStars = stars.filter(s => s.ownerId === territory.ownerId);

        for (let i = 0; i < len; i++) {
            const angle = interiorAngle(pts, i);

            if (angle < arcThreshold && angle > 0) {
                const prev = pts[(i - 1 + len) % len];
                const curr = pts[i];
                const next = pts[(i + 1) % len];

                // Find nearest star center as retraction origin
                let nearestStar = ownerStars[0];
                let minDist = Infinity;
                for (const s of ownerStars) {
                    const d = Math.hypot(s.x - curr[0], s.y - curr[1]);
                    if (d < minDist) { minDist = d; nearestStar = s; }
                }

                const origin: [number, number] = [nearestStar.x, nearestStar.y];
                const controlPt: [number, number] = [
                    curr[0] + arcStrength * (origin[0] - curr[0]),
                    curr[1] + arcStrength * (origin[1] - curr[1]),
                ];

                const arcLen = Math.hypot(next[0] - prev[0], next[1] - prev[1]) +
                    Math.hypot(controlPt[0] - prev[0], controlPt[1] - prev[1]);
                const segments = Math.max(3, Math.ceil(arcLen / Math.max(1, arcMinSegment)));

                for (let s = 0; s <= segments; s++) {
                    const t = s / segments;
                    newPts.push(quadBezier(prev, controlPt, next, t));
                }
            } else {
                newPts.push(pts[i]);
            }
        }

        // Re-close
        if (newPts.length > 0) {
            newPts.push([newPts[0][0], newPts[0][1]]);
        }
        territory.points = newPts;
    }
}

// ── Disconnect Buffer ───────────────────────────────────────────────────────

/**
 * For same-owner star pairs that are NOT lane-connected, create a visible
 * enemy-territory buffer between their regions.
 *
 * Two-phase algorithm:
 * Phase A: Push same-owner polygon vertices AWAY from the center third
 *          of the connection vector (cede space)
 * Phase B: Extend adjacent enemy territory vertices INTO the center third
 *          (fill the gap so enemies meet at the connection vector)
 *
 * This prevents visually misleading territory continuity between stars
 * that cannot actually transfer ships.
 */
export function applyDisconnectBuffer(
    territories: MergedTerritory[],
    ownedStars: StarState[],
    connections: StarConnection[],
): void {
    // Build fast connection lookup
    const connSet = new Set<string>();
    for (const c of connections) {
        connSet.add(`${c.sourceId}|${c.targetId}`);
        connSet.add(`${c.targetId}|${c.sourceId}`);
    }

    // Group stars by owner
    const starsByOwner = new Map<string, StarState[]>();
    for (const s of ownedStars) {
        if (!s.ownerId) continue;
        if (!starsByOwner.has(s.ownerId)) starsByOwner.set(s.ownerId, []);
        starsByOwner.get(s.ownerId)!.push(s);
    }

    type DisconnectZone = {
        ownerId: string;
        cx: number; cy: number;
        ax: number; ay: number;
        nx: number; ny: number;
        thirdLen: number;
        dist: number;
        starA: StarState; starB: StarState;
    };

    const zones: DisconnectZone[] = [];

    for (const [ownerId, ownerStars] of starsByOwner) {
        for (let i = 0; i < ownerStars.length; i++) {
            for (let j = i + 1; j < ownerStars.length; j++) {
                const a = ownerStars[i];
                const b = ownerStars[j];

                if (connSet.has(`${a.id}|${b.id}`)) continue;

                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 1 || dist > 400) continue;

                const axDir = dx / dist;
                const ayDir = dy / dist;

                zones.push({
                    ownerId,
                    cx: (a.x + b.x) / 2,
                    cy: (a.y + b.y) / 2,
                    ax: axDir, ay: ayDir,
                    nx: -ayDir, ny: axDir,
                    thirdLen: dist / 6,
                    dist,
                    starA: a, starB: b,
                });
            }
        }
    }

    if (zones.length === 0) return;

    for (const zone of zones) {
        const corridorWidth = zone.thirdLen * 2.5;

        for (const poly of territories) {
            const isSameOwner = poly.ownerId === zone.ownerId;

            for (let vi = 0; vi < poly.points.length; vi++) {
                const [px, py] = poly.points[vi];

                const relX = px - zone.cx;
                const relY = py - zone.cy;
                const projAlong = relX * zone.ax + relY * zone.ay;
                const projPerp = relX * zone.nx + relY * zone.ny;
                const absProjPerp = Math.abs(projPerp);

                if (Math.abs(projAlong) >= zone.thirdLen || absProjPerp >= corridorWidth) continue;

                if (isSameOwner) {
                    const pushDir = projAlong < 0 ? -1 : 1;
                    const pushAmount = zone.thirdLen - Math.abs(projAlong);
                    poly.points[vi] = [
                        px + zone.ax * pushDir * pushAmount * 0.8,
                        py + zone.ay * pushDir * pushAmount * 0.8,
                    ];
                } else {
                    const pullStrength = 0.6;
                    const perpPull = -projPerp * pullStrength;
                    const alongPull = -projAlong * 0.3;
                    poly.points[vi] = [
                        px + zone.nx * perpPull + zone.ax * alongPull,
                        py + zone.ny * perpPull + zone.ay * alongPull,
                    ];
                }
            }
        }
    }

    log.sys('GeometryModifiers', `Applied disconnect buffer to ${zones.length} non-connected same-owner pairs`);
}

// ── Contested boundary welding ───────────────────────────────────────────────

/** Any merged outline with owner + ring points (MV / PVV-style consumers). */
export type WeldableTerritoryOutline = Pick<MergedTerritory, 'ownerId' | 'points'>;

function refKey(pi: number, vi: number): string {
    return `${pi}|${vi}`;
}

function parseRefKey(k: string): { pi: number; vi: number } {
    const i = k.indexOf('|');
    return { pi: Number(k.slice(0, i)), vi: Number(k.slice(i + 1)) };
}

/** Unique vertex count for one boundary ring (drops duplicate closing copy of first point). */
function ringVertexCount(pts: [number, number][]): number {
    const n = pts.length;
    if (n < 2) return 0;
    const closed =
        n > 2 &&
        pts[0]![0] === pts[n - 1]![0] &&
        pts[0]![1] === pts[n - 1]![1];
    return closed ? n - 1 : n;
}

/**
 * After per-polygon warps (disconnect, arcs, star margin), adjacent owners’ rings
 * no longer share identical coordinates along contested edges. This pass groups
 * endpoints that belong to the **same** undirected contested edge (two different
 * owners, opposite winding along the seam) and replaces each group with the
 * centroid of its members so fills and borders share one polyline.
 *
 * Mutates `points` in place. Run once after the last asymmetric modifier and
 * before Chaikin / tessellation.
 */
export function weldContestedBoundaryVertices(territories: WeldableTerritoryOutline[]): void {
    if (territories.length < 2) return;

    type Contrib = { pi: number; i: number; ni: number };
    const byKey = new Map<string, Contrib[]>();

    for (let pi = 0; pi < territories.length; pi++) {
        const pts = territories[pi]!.points as [number, number][];
        const m = ringVertexCount(pts);
        if (m < 2) continue;

        for (let j = 0; j < m; j++) {
            const nj = (j + 1) % m;
            const k = edgeKey(pts[j]![0], pts[j]![1], pts[nj]![0], pts[nj]![1]);
            if (!byKey.has(k)) byKey.set(k, []);
            byKey.get(k)!.push({ pi, i: j, ni: nj });
        }
    }

    const parent = new Map<string, string>();

    function find(a: string): string {
        let p = parent.get(a);
        if (p === undefined) {
            parent.set(a, a);
            return a;
        }
        if (p !== a) {
            const r = find(p);
            parent.set(a, r);
            return r;
        }
        return a;
    }

    function union(a: string, b: string): void {
        const ra = find(a);
        const rb = find(b);
        if (ra !== rb) parent.set(ra, rb);
    }

    const active = new Set<string>();

    for (const list of byKey.values()) {
        const byPi = new Map<number, Contrib>();
        for (const c of list) {
            if (!byPi.has(c.pi)) byPi.set(c.pi, c);
        }
        const uniq = [...byPi.values()];
        if (uniq.length !== 2) continue;

        const a = uniq[0]!;
        const b = uniq[1]!;
        const oa = territories[a.pi]!.ownerId;
        const ob = territories[b.pi]!.ownerId;
        if (oa === ob) continue;

        // Opposite orientation along the shared seam (both polygons wound CCW/CW).
        union(refKey(a.pi, a.i), refKey(b.pi, b.ni));
        union(refKey(a.pi, a.ni), refKey(b.pi, b.i));

        active.add(refKey(a.pi, a.i));
        active.add(refKey(a.pi, a.ni));
        active.add(refKey(b.pi, b.i));
        active.add(refKey(b.pi, b.ni));
    }

    if (active.size === 0) return;

    const buckets = new Map<string, { sx: number; sy: number; n: number }>();
    for (const rk of active) {
        const root = find(rk);
        const { pi, vi } = parseRefKey(rk);
        const p = territories[pi]!.points[vi] as [number, number];
        let g = buckets.get(root);
        if (!g) {
            g = { sx: 0, sy: 0, n: 0 };
            buckets.set(root, g);
        }
        g.sx += p[0];
        g.sy += p[1];
        g.n += 1;
    }

    const centroid = new Map<string, [number, number]>();
    for (const [root, g] of buckets) {
        if (g.n < 1) continue;
        centroid.set(root, [g.sx / g.n, g.sy / g.n]);
    }

    for (const rk of active) {
        const root = find(rk);
        const c = centroid.get(root);
        if (!c) continue;
        const { pi, vi } = parseRefKey(rk);
        territories[pi]!.points[vi] = [c[0], c[1]];
    }

    // Keep explicit closing duplicate identical to vertex 0 (merge pipeline convention).
    for (const t of territories) {
        const pts = t.points as [number, number][];
        const n = pts.length;
        if (n > 2) {
            const a = pts[0]!;
            const b = pts[n - 1]!;
            if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-3) {
                pts[n - 1] = [a[0], a[1]];
            }
        }
    }
}
