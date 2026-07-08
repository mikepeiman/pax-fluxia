/**
 * conquestFrontField.test — the arrival-time-field conquest front. Validates the
 * geometry offline (no visuals): both modes cover the cell 0→1 monotonically
 * with single-owner parts and exact endpoints; radial actually curves (its
 * boundary is a sampled circle arc, not a straight chord).
 */

import { describe, expect, it } from 'vitest';
import { splitCellByFront, type ConquestFront } from './conquestFrontField';
import type { PowerCell, Point } from './powerCoreTypes';

const SQUARE: Point[] = [
    [0, 0],
    [100, 0],
    [100, 100],
    [0, 100],
];

function cell(points: Point[]): PowerCell {
    return { siteId: 'star-x', ownerId: 'old', points } as PowerCell;
}

function polyArea(pts: readonly Point[]): number {
    let s = 0;
    for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i]!;
        const [bx, by] = pts[(i + 1) % pts.length]!;
        s += ax * by - bx * ay;
    }
    return Math.abs(s / 2);
}

function incomingShare(parts: PowerCell[], ownerIn: string): number {
    let total = 0;
    let inArea = 0;
    for (const p of parts) {
        const a = polyArea(p.points);
        total += a;
        if (p.ownerId === ownerIn) inArea += a;
    }
    return total > 0 ? inArea / total : 0;
}

describe('conquestFrontField', () => {
    it('linear: single-owner parts, share 0→1 monotone, exact endpoints', () => {
        const front: ConquestFront = {
            mode: 'linear', dirX: 1, dirY: 0, originX: 0, originY: 0,
            starId: 'star-x', ownerIn: 'new', ownerOld: 'old',
        };
        let prev = -1;
        for (const q of [0, 0.25, 0.5, 0.75, 1]) {
            const parts = splitCellByFront(cell(SQUARE), front, q);
            for (const p of parts) expect(['new', 'old']).toContain(p.ownerId);
            const share = incomingShare(parts, 'new');
            expect(share).toBeGreaterThanOrEqual(prev - 1e-9);
            prev = share;
        }
        expect(incomingShare(splitCellByFront(cell(SQUARE), front, 0), 'new')).toBeLessThan(0.001);
        expect(incomingShare(splitCellByFront(cell(SQUARE), front, 1), 'new')).toBeGreaterThan(0.999);
        // Linear is the exact two-part convex split at a mid sweep.
        expect(splitCellByFront(cell(SQUARE), front, 0.5).length).toBe(2);
    });

    it('radial: curved arc front, full coverage 0→1, monotone', () => {
        const front: ConquestFront = {
            mode: 'radial', dirX: 1, dirY: 1, originX: -40, originY: -40,
            starId: 'star-x', ownerIn: 'new', ownerOld: 'old', subdiv: 6,
        };
        let prev = -Infinity;
        for (const q of [0.1, 0.3, 0.5, 0.7, 0.9]) {
            const parts = splitCellByFront(cell(SQUARE), front, q);
            for (const p of parts) expect(['new', 'old']).toContain(p.ownerId);
            const share = incomingShare(parts, 'new');
            expect(share).toBeGreaterThan(prev);
            prev = share;
        }
        expect(incomingShare(splitCellByFront(cell(SQUARE), front, 0), 'new')).toBeLessThan(0.03);
        expect(incomingShare(splitCellByFront(cell(SQUARE), front, 1), 'new')).toBeGreaterThan(0.97);
        // Radial builds ONE clean polygon per side (no fan). Curvature shows as
        // the sampled circle arc on the boundary → far more vertices than a
        // straight chord split (which would give a 3–5 vertex polygon).
        const parts = splitCellByFront(cell(SQUARE), front, 0.5);
        expect(parts.length).toBe(2);
        const incoming = parts.find((p) => p.ownerId === 'new')!;
        expect(incoming.points.length).toBeGreaterThan(6);
    });

    it('radial LENS case (long world-edge cell, attacker beside it): exact coverage, monotone', () => {
        // Regression for the "big fill glitch on a long vertical cell at world
        // edge": the disk pokes through the MIDDLE of a long edge (both segment
        // endpoints outside — two circle roots on one segment). The old walk
        // recorded no crossings there and the split ballooned to >2× the cell.
        const TALL: Point[] = [[0, 0], [60, 0], [60, 500], [0, 500]];
        const front: ConquestFront = {
            mode: 'radial', dirX: 1, dirY: 0, originX: -80, originY: 250,
            starId: 'star-x', ownerIn: 'new', ownerOld: 'old', subdiv: 8,
        };
        const CELL = 60 * 500;
        let prev = -1;
        for (const q of [0, 0.05, 0.2, 0.5, 0.8, 0.99, 1]) {
            const parts = splitCellByFront(cell(TALL), front, q);
            const total = parts.reduce((s, p) => s + polyArea(p.points), 0);
            expect(Math.abs(total - CELL) / CELL).toBeLessThan(0.005); // exact cover
            const newA = parts
                .filter((p) => p.ownerId === 'new')
                .reduce((s, p) => s + polyArea(p.points), 0);
            expect(newA).toBeGreaterThanOrEqual(prev - 1); // monotone
            prev = newA;
        }
        // Exact endpoints: q=0 captures nothing, q=1 captures all.
        expect(incomingShare(splitCellByFront(cell(TALL), front, 0), 'new')).toBe(0);
        expect(incomingShare(splitCellByFront(cell(TALL), front, 1), 'new')).toBe(1);
    });

    it('radial split never bloats past the cell (arc picks the INSIDE direction, no giant-arc blotch)', () => {
        // Regression for the ~q→1 blotch: a wrong arc direction spanned the whole
        // circle, ballooning a part to many× the cell (area 117k / bbox 290 for a
        // 100×100 cell) and stalling earcut. incoming+old must stay ≈ the cell.
        const CELL_AREA = 100 * 100;
        for (const [ox, oy] of [[-40, -40], [50, -40], [-40, 50], [120, 50], [50, 140], [140, 50], [10, 10]] as Point[]) {
            const front: ConquestFront = {
                mode: 'radial', dirX: 1, dirY: 1, originX: ox, originY: oy,
                starId: 'x', ownerIn: 'new', ownerOld: 'old', subdiv: 8,
            };
            for (const q of [0.1, 0.5, 0.9, 0.95, 0.99, 0.999]) {
                const parts = splitCellByFront(cell(SQUARE), front, q);
                const total = parts.reduce((s, p) => s + polyArea(p.points), 0);
                expect(total).toBeLessThan(CELL_AREA * 1.3);
                for (const p of parts) {
                    for (const [x, y] of p.points) {
                        expect(x).toBeGreaterThan(-30);
                        expect(x).toBeLessThan(130);
                        expect(y).toBeGreaterThan(-30);
                        expect(y).toBeLessThan(130);
                    }
                }
            }
        }
    });

    it('radial tiling invariant under dense sweep INCLUDING exact vertex hits (degeneracy guard)', () => {
        // The user-observed 1-frame overlap fragment: when the sweep threshold c
        // lands within float noise of a vertex's distance, entry/exit pairing can
        // misfire. The area guard must make the tiling invariant hold on EVERY
        // frame — including q values engineered to hit each vertex exactly.
        const segD = (sx: number, sy: number, a: Point, b: Point) => {
            const dx = b[0] - a[0];
            const dy = b[1] - a[1];
            const l2 = dx * dx + dy * dy;
            let t = l2 < 1e-12 ? 0 : ((sx - a[0]) * dx + (sy - a[1]) * dy) / l2;
            t = t < 0 ? 0 : t > 1 ? 1 : t;
            return Math.hypot(a[0] + t * dx - sx, a[1] + t * dy - sy);
        };
        const TALL: Point[] = [[0, 0], [60, 0], [60, 500], [0, 500]];
        for (const [shape, cellPts] of [['square', SQUARE], ['tall', TALL]] as const) {
            for (const [ox, oy] of [[-40, -40], [50, -40], [-80, 250], [10, 10]] as Point[]) {
                const front: ConquestFront = {
                    mode: 'radial', dirX: 1, dirY: 0, originX: ox, originY: oy,
                    starId: 'star-x', ownerIn: 'new', ownerOld: 'old', subdiv: 8,
                };
                const cellArea = polyArea(cellPts);
                let minD = Infinity;
                let maxD = -Infinity;
                for (let i = 0; i < cellPts.length; i++) {
                    const d = segD(ox, oy, cellPts[i]!, cellPts[(i + 1) % cellPts.length]!);
                    if (d < minD) minD = d;
                    const dv = Math.hypot(cellPts[i]![0] - ox, cellPts[i]![1] - oy);
                    if (dv > maxD) maxD = dv;
                }
                const qs: number[] = [];
                for (let q = 0; q <= 1; q += 0.01) qs.push(q);
                // Exact vertex hits: q such that c === T(vertex).
                for (const v of cellPts) {
                    const tv = Math.hypot(v[0] - ox, v[1] - oy);
                    const q = (tv - minD) / (maxD - minD);
                    if (q > 0 && q < 1) qs.push(q, q - 1e-12, q + 1e-12);
                }
                for (const q of qs) {
                    const parts = splitCellByFront(cell(cellPts), front, q);
                    const total = parts.reduce((s, p) => s + polyArea(p.points), 0);
                    expect(
                        Math.abs(total - cellArea) / cellArea,
                        `${shape} origin=(${ox},${oy}) q=${q}`,
                    ).toBeLessThan(0.006);
                }
            }
        }
    });

    it('radial front genuinely CURVES (arc bows away from the entry–exit chord)', () => {
        // Area-vs-linear was a weak curvature proxy (distance fronts track plane
        // fronts closely in area). Measure the SHAPE: the incoming part's front
        // must bow away from the straight chord between its boundary crossings.
        const front: ConquestFront = {
            mode: 'radial', dirX: 1, dirY: 0, originX: -40, originY: 50,
            starId: 'star-x', ownerIn: 'new', ownerOld: 'old', subdiv: 6,
        };
        const parts = splitCellByFront(cell(SQUARE), front, 0.5);
        const incoming = parts.find((p) => p.ownerId === 'new')!;
        // Interior (non-boundary) vertices = the sampled arc.
        const interior = incoming.points.filter(
            ([x, y]) => x > 1e-6 && x < 100 - 1e-6 && y > 1e-6 && y < 100 - 1e-6,
        );
        expect(interior.length).toBeGreaterThan(2); // a real sampled arc, not a chord
        // Sagitta: max perpendicular distance of arc points from the chord
        // between the two boundary crossings (first/last boundary-touching pts).
        const boundary = incoming.points.filter(
            ([x, y]) => !(x > 1e-6 && x < 100 - 1e-6 && y > 1e-6 && y < 100 - 1e-6),
        );
        const a = boundary[0]!;
        const b = boundary[boundary.length - 1]!;
        const chordLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
        expect(chordLen).toBeGreaterThan(1);
        let sagitta = 0;
        for (const p of interior) {
            const d =
                Math.abs(
                    (b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1]),
                ) / chordLen;
            if (d > sagitta) sagitta = d;
        }
        expect(sagitta).toBeGreaterThan(2); // visibly bowed, not a straight cut
    });
});
