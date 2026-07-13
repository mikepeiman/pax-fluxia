/**
 * islandCollapse.test.ts — the transient island-capture shrink overlay.
 *
 * An island (a captured star surrounded ENTIRELY by the new owner) has no
 * persistent border, so the captured cell is emitted as the VICTOR (settled,
 * tiling) and the shrinking old region is a TRANSIENT overlay appended by
 * buildSurfaceFromCells. This tests that overlay's geometry directly:
 *  - the victor tiling fill is untouched (coverage stays whole);
 *  - the overlay shrinks monotonically toward the star and VANISHES near the
 *    perimeter (q→1 leaves nothing to pop);
 *  - overlay fill and ring border read the SAME curve (single source);
 *  - the overlay is flagged transient (excluded from tiling invariants).
 */

import { describe, expect, it } from 'vitest';
import { buildSurfaceFromCells } from './buildSurfaceFromCells';
import type { PowerCell, Point } from './powerCoreTypes';
import type { IslandCollapse } from './kineticTypes';

const STAR: [number, number] = [100, 100];
// A victor cell: a square around the star (owned by the NEW owner post-capture).
const VICTOR_CELL: PowerCell = {
    siteId: 'star-island',
    ownerId: 'ai-2',
    points: [
        [40, 40],
        [160, 40],
        [160, 160],
        [40, 160],
    ] as Point[],
    sourceSiteIndex: 0,
};

function collapse(q: number): IslandCollapse {
    return {
        siteId: 'star-island',
        starX: STAR[0],
        starY: STAR[1],
        oldOwner: 'human-player',
        victorOwner: 'ai-2',
        q,
    };
}

function polyArea(ring: readonly Point[]): number {
    let s = 0;
    for (let i = 0; i < ring.length; i++) {
        const a = ring[i]!;
        const b = ring[(i + 1) % ring.length]!;
        s += a[0] * b[1] - b[0] * a[1];
    }
    return Math.abs(s / 2);
}
function maxRadius(ring: readonly Point[]): number {
    let r = 0;
    for (const [x, y] of ring) r = Math.max(r, Math.hypot(x - STAR[0], y - STAR[1]));
    return r;
}

describe('island collapse — transient shrink overlay', () => {
    const PASSES = 2;
    const build = (q: number) =>
        buildSurfaceFromCells([VICTOR_CELL], PASSES, undefined, false, [collapse(q)]);

    it('victor tiling fill is present and untouched at every q (overlay is additive)', () => {
        for (const q of [0, 0.3, 0.6, 0.9, 1]) {
            const s = build(q);
            const victor = s.cellFills.filter((r) => !r.transient);
            expect(victor.length).toBe(1);
            expect(victor[0]!.ownerId).toBe('ai-2');
            expect(polyArea(victor[0]!.points)).toBeGreaterThan(120 * 120 * 0.9);
        }
    });

    it('overlay shrinks monotonically and VANISHES near the star perimeter', () => {
        const radii: number[] = [];
        for (const q of [0, 0.2, 0.4, 0.6, 0.8]) {
            const overlay = build(q).cellFills.find((r) => r.transient);
            expect(overlay, `overlay present at q=${q}`).toBeTruthy();
            radii.push(maxRadius(overlay!.points));
        }
        for (let i = 1; i < radii.length; i++) {
            expect(radii[i]!).toBeLessThan(radii[i - 1]!); // strictly shrinking
        }
        // By q=1 the overlay has shrunk past the vanish radius → gone (no pop).
        expect(build(1).cellFills.some((r) => r.transient)).toBe(false);
        expect(build(0.98).cellFills.some((r) => r.transient)).toBe(false);
    });

    it('overlay fill and its ring border read the SAME curve (single source)', () => {
        const s = build(0.4);
        const overlayFill = s.cellFills.find((r) => r.transient)!;
        const ring = s.frontiers.find(
            (f) => (f.ownerA === 'ai-2' && f.ownerB === 'human-player') || (f.ownerA === 'human-player' && f.ownerB === 'ai-2'),
        );
        expect(ring, 'overlay ring frontier present').toBeTruthy();
        expect(ring!.closed).toBe(true);
        // Same vertex set (border is fill ring + closing vertex).
        const fillArea = polyArea(overlayFill.points);
        const ringArea = polyArea(ring!.points.map((p) => [p[0], p[1]] as Point));
        expect(Math.abs(fillArea - ringArea) / fillArea).toBeLessThan(0.001);
    });

    it('no island param ⇒ no overlay, no transient fills (pure passthrough)', () => {
        const s = buildSurfaceFromCells([VICTOR_CELL], PASSES);
        expect(s.cellFills.some((r) => r.transient)).toBe(false);
    });
});
