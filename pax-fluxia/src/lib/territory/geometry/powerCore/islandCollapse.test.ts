/**
 * islandCollapse.test.ts — island capture = RADIAL COLLAPSE via weight-vanish.
 *
 * An island (a captured star enclosed ENTIRELY by the new owner) has no
 * persistent border, so a directional sweep is wrong and it must not pop. The
 * captured site's weight ramps w0 → (w0 − dMin²), so its cell shrinks radially
 * to nothing while the same-owner neighbours grow in — the power-diagram analog
 * of the grid family's radial region-shrink. Purely the diagram: no split, no
 * overlay, watertight throughout.
 *
 * This is the INTEGRATION (detection → ramp → diagram frame), the thing the
 * earlier isolated test failed to cover.
 */

import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarState, StarConnection } from '$lib/types/game.types';
import { computePowerCoreEndpoint } from './buildPowerCoreAuthoritySnapshot';
import { buildPowerVoronoi0319Settings } from '../../families/buildFamilyGeometry';
import { buildTransitionBubble } from './buildTransitionBubble';
import { KineticTransitionRuntime } from './kineticTransitionRuntime';
import type { KineticEndpointState } from './kineticTypes';
import type { PowerCell, Point } from './powerCoreTypes';

function star(id: string, x: number, y: number, ownerId: string): StarState {
    return { id, x, y, ownerId, starType: 'grey', activeShips: 0, damagedShips: 0, targetId: null } as StarState;
}
// A centre star enclosed by a ring of others.
const RING: [string, number, number][] = [
    ['star-n', 400, 250], ['star-e', 550, 400], ['star-s', 400, 550], ['star-w', 250, 400],
    ['star-ne', 520, 270], ['star-se', 520, 530], ['star-sw', 280, 530], ['star-nw', 280, 270],
];
const NO_LANES: StarConnection[] = [];
const CFG = buildPowerVoronoi0319Settings({
    lanes: NO_LANES, worldWidth: 800, worldHeight: 800,
    configSource: GAME_CONFIG as unknown as Record<string, unknown>,
});
function endpoint(owners: Record<string, string>): { state: KineticEndpointState; clip: [number, number][] } {
    const stars: StarState[] = [
        star('star-c', 400, 400, owners['star-c'] ?? 'human-player'),
        ...RING.map(([id, x, y]) => star(id, x, y, owners[id] ?? 'ai-1')),
    ];
    const r = computePowerCoreEndpoint({ stars, connections: NO_LANES, config: CFG });
    if ('kind' in r) throw new Error(r.message);
    return { state: { sites: r.sites, cells: r.cells }, clip: r.clip };
}
function polyArea(pts: readonly Point[]): number {
    let s = 0;
    for (let i = 0; i < pts.length; i++) { const a = pts[i]!, b = pts[(i + 1) % pts.length]!; s += a[0] * b[1] - b[0] * a[1]; }
    return Math.abs(s / 2);
}
const clipArea = (clip: [number, number][]) => polyArea(clip.map((p) => [p[0], p[1]] as Point));
const centerArea = (cells: readonly PowerCell[]) => {
    const c = cells.find((x) => x.siteId === 'star-c');
    return c ? polyArea(c.points) : 0;
};

describe('island capture — radial collapse (weight-vanish)', () => {
    const ISLAND_S0 = endpoint({ 'star-c': 'human-player' }); // all ring ai-1
    const ISLAND_S1 = endpoint({ 'star-c': 'ai-1' }); // star-c → ai-1 (enclosed → island)

    it('detection: enclosed capture → conquest ramp with collapse + negative collapseWeight', () => {
        const bubble = buildTransitionBubble({ s0: ISLAND_S0.state, s1: ISLAND_S1.state });
        const ramp = bubble.ramps.find((r) => r.starId === 'star-c')!;
        expect(ramp.kind).toBe('conquest');
        expect(ramp.collapse).toBe(true);
        expect(ramp.collapseWeight!).toBeLessThan(ramp.w0 - 1000); // collapses well below w0
    });

    it('collapses WITHOUT any conquest origin (no attack axis needed)', () => {
        const bubble = buildTransitionBubble({ s0: ISLAND_S0.state, s1: ISLAND_S1.state });
        expect(bubble.ramps.find((r) => r.starId === 'star-c')!.collapse).toBe(true);
    });

    it('NOT an island when a different-owner neighbour remains (stays a normal capture)', () => {
        const s0 = endpoint({ 'star-c': 'human-player', 'star-n': 'ai-2' });
        const s1 = endpoint({ 'star-c': 'ai-1', 'star-n': 'ai-2' }); // star-c → ai-1 but borders ai-2
        const bubble = buildTransitionBubble({ s0: s0.state, s1: s1.state });
        const ramp = bubble.ramps.find((r) => r.starId === 'star-c')!;
        expect(ramp.collapse).toBeFalsy();
    });

    it('FRAME BEHAVIOUR: captured cell shrinks radially, neighbours fill, tiling holds', () => {
        const rt = new KineticTransitionRuntime();
        rt.commit({ state: ISLAND_S0.state, clip: ISLAND_S0.clip, ownershipVersion: 'v0', transitionKey: null, nowMs: 0, durationMs: 1000 });
        rt.commit({ state: ISLAND_S1.state, clip: ISLAND_S1.clip, ownershipVersion: 'v1', transitionKey: 'k', nowMs: 0, durationMs: 1000 });

        const areas: number[] = [];
        const CA = clipArea(ISLAND_S1.clip);
        for (const nowMs of [50, 250, 450, 650]) {
            const frame = rt.sampleFull(nowMs)!;
            expect(frame).not.toBeNull();
            const cells = frame.bubbleCells;
            // captured cell is OLD owner while collapsing
            const c = cells.find((x) => x.siteId === 'star-c');
            if (c) expect(c.ownerId).toBe('human-player');
            areas.push(centerArea(cells));
            // neighbours fill the vacated space → still tiles the clip
            let total = 0;
            for (const cell of cells) total += polyArea(cell.points);
            expect(total / CA).toBeGreaterThan(0.999);
            expect(total / CA).toBeLessThan(1.001);
        }
        // monotonically shrinking toward nothing
        for (let i = 1; i < areas.length; i++) expect(areas[i]!).toBeLessThan(areas[i - 1]!);
        expect(areas[areas.length - 1]!).toBeLessThan(areas[0]! * 0.5);
    });
});
