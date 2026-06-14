import { describe, expect, it } from 'vitest';
import { ringContainsPolyline } from './resolveConstraintAlignedTerritoryGeometry';

type Pt = [number, number];

// Reference = the previous string-segment-key implementation, retained here to
// prove the numeric-id refactor in resolveConstraintAlignedTerritoryGeometry.ts
// is behavior-identical (same containment decisions, including reversed and
// wrap-around matches).
function refPointKey(x: number, y: number): string {
    return `${x.toFixed(4)},${y.toFixed(4)}`;
}
function refNormalizeRing(points: ReadonlyArray<Pt>): readonly Pt[] {
    if (points.length < 2) return points;
    const first = points[0]!;
    const last = points[points.length - 1]!;
    if (first[0] === last[0] && first[1] === last[1]) return points.slice(0, -1);
    return points;
}
function refSegs(points: ReadonlyArray<Pt>, closed: boolean): string[] {
    if (points.length < 2) return [];
    const keys: string[] = [];
    const limit = closed ? points.length : points.length - 1;
    for (let i = 0; i < limit; i++) {
        const [ax, ay] = points[i]!;
        const [bx, by] = points[(i + 1) % points.length]!;
        keys.push(`${refPointKey(ax, ay)}>${refPointKey(bx, by)}`);
    }
    return keys;
}
function refContains(ring: ReadonlyArray<Pt>, poly: ReadonlyArray<Pt>): boolean {
    const nr = refNormalizeRing(ring);
    const rs = refSegs(nr, true);
    const ps = refSegs(poly, false);
    if (rs.length === 0 || ps.length === 0) return false;
    if (rs.length < ps.length) return false;
    const dr = [...rs, ...rs];
    const revs = refSegs([...poly].reverse(), false);
    const at = (c: readonly string[], s: number): boolean => {
        for (let i = 0; i < c.length; i++) if (dr[s + i] !== c[i]) return false;
        return true;
    };
    for (let s = 0; s < rs.length; s++) {
        if (at(ps, s)) return true;
        if (at(revs, s)) return true;
    }
    return false;
}

// Deterministic PRNG so the randomized parity sweep is reproducible.
function makeRng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0xffffffff;
    };
}

const SQUARE: Pt[] = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
];

describe('ringContainsPolyline (numeric-id refactor)', () => {
    it('matches a forward sub-polyline of the ring', () => {
        expect(ringContainsPolyline(SQUARE, [[10, 0], [10, 10]])).toBe(true);
    });
    it('matches a reversed sub-polyline', () => {
        expect(ringContainsPolyline(SQUARE, [[10, 10], [10, 0]])).toBe(true);
    });
    it('matches across the closed-ring wrap-around', () => {
        expect(
            ringContainsPolyline(SQUARE, [[0, 10], [0, 0], [10, 0]]),
        ).toBe(true);
    });
    it('tolerates a ring authored with a duplicated closing point', () => {
        expect(
            ringContainsPolyline([...SQUARE, [0, 0]], [[10, 0], [10, 10]]),
        ).toBe(true);
    });
    it('rejects a polyline that is not on the ring', () => {
        expect(ringContainsPolyline(SQUARE, [[1, 1], [2, 2]])).toBe(false);
    });
    it('rejects a polyline longer than the ring', () => {
        const ring: Pt[] = [[0, 0], [10, 0], [10, 10]];
        const poly: Pt[] = [[0, 0], [10, 0], [10, 10], [0, 0], [10, 0]];
        expect(ringContainsPolyline(ring, poly)).toBe(false);
    });
    it('handles degenerate inputs', () => {
        expect(ringContainsPolyline([[0, 0]], [[0, 0], [1, 1]])).toBe(false);
        expect(ringContainsPolyline(SQUARE, [[0, 0]])).toBe(false);
        expect(ringContainsPolyline([], [])).toBe(false);
    });

    it('is identical to the reference string implementation over randomized fixtures', () => {
        const rng = makeRng(0x9e3779b1);
        let checked = 0;
        for (let trial = 0; trial < 500; trial++) {
            const n = 3 + Math.floor(rng() * 8); // 3..10 ring vertices
            const ring: Pt[] = [];
            for (let i = 0; i < n; i++) {
                // integer coords keep toFixed(4) equality exact
                ring.push([Math.floor(rng() * 40), Math.floor(rng() * 40)]);
            }
            const start = Math.floor(rng() * n);
            const len = 1 + Math.floor(rng() * n);
            const slice: Pt[] = [];
            for (let k = 0; k <= len; k++) slice.push(ring[(start + k) % n]!);

            const candidates: Pt[][] = [
                slice,
                [...slice].reverse(),
                [
                    [Math.floor(rng() * 40), Math.floor(rng() * 40)],
                    [Math.floor(rng() * 40), Math.floor(rng() * 40)],
                ],
            ];
            for (const poly of candidates) {
                expect(ringContainsPolyline(ring, poly)).toBe(
                    refContains(ring, poly),
                );
                checked++;
            }
        }
        expect(checked).toBeGreaterThan(1000);
    });
});
