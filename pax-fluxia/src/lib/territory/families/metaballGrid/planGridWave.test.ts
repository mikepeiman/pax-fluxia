import { describe, expect, it } from 'vitest';
import type { ConquestEvent } from '@pax/common';
import type { ResolvedGeometrySnapshot, TerritoryRegionShape } from '../../contracts/GeometryContracts';
import { buildGridClassification } from './buildGridClassification';
import { planGridWave } from './planGridWave';
import { summarizeMetaballGridFrontier } from './metaballGridRuntime';
import type { GridAdjacency, GridWaveGeometry, GridWaveSeeding } from './metaballGridTypes';

function makeSnapshot(regions: TerritoryRegionShape[]): ResolvedGeometrySnapshot {
    return {
        version: 'test',
        sourceMode: 'unified_vector',
        sourceStyle: 'vector',
        ownershipVersion: 'test',
        geometryFamily: 'vector-native',
        sourceMethod: 'power_voronoi',
        territoryRegions: regions,
        frontierPolylines: [],
        worldBorderPolylines: [],
        sharedFrontierMap: new Map(),
        frontierTopology: {
            version: 'topo',
            ownershipVersion: 'test',
            worldBounds: { width: 100, height: 100 },
            vertices: new Map(),
            sections: new Map(),
            loops: [],
            sectionsByOwnerPair: new Map(),
            sectionsByVertex: new Map(),
            sectionsByOwner: new Map(),
        },
        shells: [],
        shellLoops: [],
        provenance: { derivedFromField: false, notes: [] },
        diagnostics: {
            topologyReliable: true,
            identityReliable: true,
            closureReliable: true,
            notes: [],
        },
    };
}

function rect(ownerId: string, regionId: string, x0: number, y0: number, x1: number, y1: number): TerritoryRegionShape {
    return {
        regionId,
        ownerId,
        points: [
            [x0, y0],
            [x1, y0],
            [x1, y1],
            [x0, y1],
        ],
        confidence: 1,
    };
}

function makeEvent(params: {
    tick?: number;
    starId: string;
    prev: string;
    next: string;
}): ConquestEvent {
    return {
        tick: params.tick ?? 1,
        starId: params.starId,
        attackerStarId: 'a:1',
        attackerStarIds: ['a:1'],
        attackerShipTransfers: [10],
        previousOwner: params.prev,
        newOwner: params.next,
        shipsCaptured: 10,
        shipsEscaped: 0,
        shipsDestroyed: 0,
        shipsTransferred: 10,
        conquestType: 'complete',
    };
}

/**
 * Build a 10x10 grid world where the LEFT half (x < 50) is A and RIGHT half is B in PREV,
 * and B overruns A → whole world becomes B in NEXT. Winner is B.
 * At spacing 10 & centered origin, cells are at x ∈ {5, 15, 25, 35, 45 | 55, 65, 75, 85, 95}.
 */
function makeHalfFlipFixture(opts: { seeding: GridWaveSeeding; geometry: GridWaveGeometry; adjacency: GridAdjacency }) {
    const world = { width: 100, height: 100 };
    const spacingPx = 10;
    const prev = makeSnapshot([
        rect('A', 'rA', 0, 0, 50, 100),
        rect('B', 'rB', 50, 0, 100, 100),
    ]);
    const next = makeSnapshot([rect('B', 'rB_all', 0, 0, 100, 100)]);
    const event = makeEvent({ starId: 's:1', prev: 'A', next: 'B' });
    const classification = buildGridClassification({
        world,
        spacingPx,
        originMode: 'centered',
        prevGeometry: prev,
        nextGeometry: next,
        conquestEvents: [event],
    });
    const plan = planGridWave({
        classification,
        seeding: opts.seeding,
        geometry: opts.geometry,
        adjacency: opts.adjacency,
        conquestEvents: [event],
    });
    return { classification, plan, event };
}

function makeFrontierShiftFixture(opts: {
    seeding: GridWaveSeeding;
    geometry: GridWaveGeometry;
    adjacency: GridAdjacency;
}) {
    const world = { width: 100, height: 100 };
    const spacingPx = 10;
    const prev = makeSnapshot([
        rect('A', 'rA', 0, 0, 70, 100),
        rect('B', 'rB', 70, 0, 100, 100),
    ]);
    const next = makeSnapshot([
        rect('A', 'rA_next', 0, 0, 30, 100),
        rect('B', 'rB_next', 30, 0, 100, 100),
    ]);
    const event = makeEvent({ starId: 's:shift', prev: 'A', next: 'B' });
    const classification = buildGridClassification({
        world,
        spacingPx,
        originMode: 'centered',
        prevGeometry: prev,
        nextGeometry: next,
        conquestEvents: [event],
    });
    const plan = planGridWave({
        classification,
        seeding: opts.seeding,
        geometry: opts.geometry,
        adjacency: opts.adjacency,
        conquestEvents: [event],
        resolveStarPosition: (id) => (id === 's:shift' ? { x: 65, y: 55 } : null),
    });
    return { classification, plan, event };
}

describe('planGridWave', () => {
    it('assigns flipTime ∈ [0, 1] to every dispossessed cell', () => {
        const { classification, plan } = makeHalfFlipFixture({
            seeding: 'winner_natives',
            geometry: 'grid_bfs',
            adjacency: '4',
        });
        for (const id of classification.byRole.dispossessed) {
            const t = plan.flipTimeByVId.get(id);
            expect(t).toBeDefined();
            expect(t).toBeGreaterThanOrEqual(0);
            expect(t).toBeLessThanOrEqual(1);
        }
    });

    it('native/outside cells are absent from the plan', () => {
        const { classification, plan } = makeHalfFlipFixture({
            seeding: 'winner_natives',
            geometry: 'grid_bfs',
            adjacency: '4',
        });
        for (const id of classification.byRole.native) {
            expect(plan.flipTimeByVId.has(id)).toBe(false);
        }
        for (const id of classification.byRole.outside) {
            expect(plan.flipTimeByVId.has(id)).toBe(false);
        }
    });

    it('winner_natives seeds are adjacent to dispossessed cells of the winner', () => {
        const { classification, plan } = makeHalfFlipFixture({
            seeding: 'winner_natives',
            geometry: 'grid_bfs',
            adjacency: '4',
        });
        const ev = plan.perEvent[0];
        expect(ev.seedVIds.length).toBeGreaterThan(0);
        const byId = new Map(classification.vstars.map((v) => [v.id, v]));
        for (const sid of ev.seedVIds) {
            const s = byId.get(sid);
            expect(s).toBeDefined();
            expect(s?.role).toBe('native');
            expect(s?.nextOwnerId).toBe('B');
        }
    });

    it('grid_bfs with 4-adjacency produces monotone rank from the winner front', () => {
        const { classification, plan } = makeHalfFlipFixture({
            seeding: 'winner_natives',
            geometry: 'grid_bfs',
            adjacency: '4',
        });
        const byId = new Map(classification.vstars.map((v) => [v.id, v]));
        let prevRank = -1;
        for (let ix = 4; ix >= 0; ix--) {
            const id = `g:${ix}:0`;
            const v = byId.get(id);
            if (!v || v.role !== 'dispossessed') continue;
            const t = plan.flipTimeByVId.get(id);
            expect(t).toBeDefined();
            expect(t as number).toBeGreaterThanOrEqual(prevRank);
            prevRank = t as number;
        }
    });

    it('conquered_star_center seeding places rank 0 at nearest cell to the star', () => {
        const world = { width: 100, height: 100 };
        const spacingPx = 10;
        const prev = makeSnapshot([rect('A', 'rA', 0, 0, 100, 100)]);
        const next = makeSnapshot([rect('B', 'rB', 0, 0, 100, 100)]);
        const event = makeEvent({ starId: 's:center', prev: 'A', next: 'B' });
        const classification = buildGridClassification({
            world,
            spacingPx,
            originMode: 'centered',
            prevGeometry: prev,
            nextGeometry: next,
            conquestEvents: [event],
        });
        const plan = planGridWave({
            classification,
            seeding: 'conquered_star_center',
            geometry: 'grid_bfs',
            adjacency: '4',
            conquestEvents: [event],
            resolveStarPosition: (id) => (id === 's:center' ? { x: 55, y: 55 } : null),
        });
        const ev = plan.perEvent[0];
        expect(ev.seedVIds).toEqual(['g:5:5']);
        expect(plan.flipTimeByVId.get('g:5:5')).toBe(0);
    });

    it('winner_nearest_edge restricts seeds to 4-connected winner natives', () => {
        const { plan: plan4 } = makeHalfFlipFixture({
            seeding: 'winner_nearest_edge',
            geometry: 'grid_bfs',
            adjacency: '8',
        });
        const { plan: planNatives } = makeHalfFlipFixture({
            seeding: 'winner_natives',
            geometry: 'grid_bfs',
            adjacency: '8',
        });
        expect(plan4.perEvent[0].seedVIds.length).toBeLessThanOrEqual(
            planNatives.perEvent[0].seedVIds.length,
        );
    });

    it('phase-frontier flip distribution is not unintentionally front-loaded on a representative conquest', () => {
        const { plan } = makeFrontierShiftFixture({
            seeding: 'winner_natives',
            geometry: 'pre_to_post_frontier',
            adjacency: '8',
        });
        const summary = summarizeMetaballGridFrontier({
            orderedFlipTimes: plan.orderedFlipTimes,
            flipWindow: 0.08,
        });

        expect(summary.transitionTotalCount).toBeGreaterThan(0);
        expect(summary.p95).not.toBeNull();
        expect(summary.p95!).toBeGreaterThan(0.5);
        expect(summary.bins['0.5-0.75'] + summary.bins['0.75-1']).toBeGreaterThan(0);
        expect(summary.visibleLifetimeProgress).not.toBeNull();
        expect(summary.visibleLifetimeProgress!).toBeGreaterThan(0.5);
    });

    it('euclidean_band uses distance to seed, not grid graph', () => {
        const world = { width: 100, height: 100 };
        const spacingPx = 10;
        const prev = makeSnapshot([rect('A', 'rA', 0, 0, 100, 100)]);
        const next = makeSnapshot([rect('B', 'rB', 0, 0, 100, 100)]);
        const event = makeEvent({ starId: 's:corner', prev: 'A', next: 'B' });
        const classification = buildGridClassification({
            world,
            spacingPx,
            originMode: 'centered',
            prevGeometry: prev,
            nextGeometry: next,
            conquestEvents: [event],
        });
        const plan = planGridWave({
            classification,
            seeding: 'conquered_star_center',
            geometry: 'euclidean_band',
            adjacency: '4',
            conquestEvents: [event],
            resolveStarPosition: () => ({ x: 5, y: 5 }),
        });
        const tNear = plan.flipTimeByVId.get('g:1:1')!;
        const tFar = plan.flipTimeByVId.get('g:9:9')!;
        expect(tFar).toBeGreaterThan(tNear);
    });

    it('conquered_star_radial assigns earlier flip times nearer the captured star', () => {
        const world = { width: 100, height: 100 };
        const spacingPx = 10;
        const prev = makeSnapshot([rect('A', 'rA', 0, 0, 100, 100)]);
        const next = makeSnapshot([rect('B', 'rB', 0, 0, 100, 100)]);
        const event = makeEvent({ starId: 's:radial', prev: 'A', next: 'B' });
        const classification = buildGridClassification({
            world,
            spacingPx,
            originMode: 'centered',
            prevGeometry: prev,
            nextGeometry: next,
            conquestEvents: [event],
        });
        const plan = planGridWave({
            classification,
            seeding: 'winner_natives',
            geometry: 'conquered_star_radial',
            adjacency: '8',
            conquestEvents: [event],
            resolveStarPosition: (id) => (id === 's:radial' ? { x: 15, y: 15 } : null),
        });
        expect(plan.perEvent[0].seedVIds).toEqual(['g:1:1']);
        expect(plan.flipTimeByVId.get('g:1:1')).toBe(0);
        expect(plan.flipTimeByVId.get('g:9:9')!).toBeGreaterThan(
            plan.flipTimeByVId.get('g:2:2')!,
        );
    });

    it('pre_to_post_frontier moves the flip front from the old border toward the new border', () => {
        const { plan } = makeFrontierShiftFixture({
            seeding: 'winner_natives',
            geometry: 'pre_to_post_frontier',
            adjacency: '4',
        });
        expect(plan.flipTimeByVId.get('g:6:0')!).toBeLessThan(
            plan.flipTimeByVId.get('g:3:0')!,
        );
        expect(plan.flipTimeByVId.get('g:6:5')!).toBeLessThan(
            plan.flipTimeByVId.get('g:3:5')!,
        );
    });

    it('ties broken deterministically by (iy, ix)', () => {
        const { plan: a } = makeHalfFlipFixture({
            seeding: 'winner_natives',
            geometry: 'grid_bfs',
            adjacency: '4',
        });
        const { plan: b } = makeHalfFlipFixture({
            seeding: 'winner_natives',
            geometry: 'grid_bfs',
            adjacency: '4',
        });
        for (const [id, t] of a.flipTimeByVId) {
            expect(b.flipTimeByVId.get(id)).toBe(t);
        }
    });

    it('covers the default event bucket when present', () => {
        const world = { width: 100, height: 100 };
        const spacingPx = 20;
        const prev = makeSnapshot([rect('X', 'rX', 0, 0, 100, 100)]);
        const next = makeSnapshot([rect('Y', 'rY', 0, 0, 100, 100)]);
        const classification = buildGridClassification({
            world,
            spacingPx,
            originMode: 'centered',
            prevGeometry: prev,
            nextGeometry: next,
            conquestEvents: [],
        });
        const plan = planGridWave({
            classification,
            seeding: 'winner_natives',
            geometry: 'grid_bfs',
            adjacency: '4',
            conquestEvents: [],
        });
        expect(plan.perEvent.length).toBe(1);
        expect(plan.perEvent[0].eventId).toBe(classification.defaultEventId);
        expect(plan.flipTimeByVId.size).toBe(classification.byRole.dispossessed.length);
    });

    it('maxRank = 0 yields all flipTime = 0 (degenerate wave)', () => {
        const world = { width: 40, height: 40 };
        const spacingPx = 20;
        const prev = makeSnapshot([rect('A', 'rA', 0, 0, 40, 40)]);
        const next = makeSnapshot([rect('B', 'rB', 0, 0, 20, 20)]);
        const event = makeEvent({ starId: 's:1', prev: 'A', next: 'B' });
        const classification = buildGridClassification({
            world,
            spacingPx,
            originMode: 'centered',
            prevGeometry: prev,
            nextGeometry: next,
            conquestEvents: [event],
        });
        expect(classification.byRole.dispossessed).toEqual(['g:0:0']);
        const plan = planGridWave({
            classification,
            seeding: 'conquered_star_center',
            geometry: 'grid_bfs',
            adjacency: '4',
            conquestEvents: [event],
            resolveStarPosition: () => ({ x: 10, y: 10 }),
        });
        expect(plan.flipTimeByVId.get('g:0:0')).toBe(0);
    });

    it('winner_natives falls back gracefully when winner has no foothold', () => {
        const world = { width: 100, height: 100 };
        const spacingPx = 20;
        const prev = makeSnapshot([rect('A', 'rA', 0, 0, 100, 100)]);
        const next = makeSnapshot([rect('B', 'rB', 0, 0, 100, 100)]);
        const event = makeEvent({ starId: 's:foothold', prev: 'A', next: 'B' });
        const classification = buildGridClassification({
            world,
            spacingPx,
            originMode: 'centered',
            prevGeometry: prev,
            nextGeometry: next,
            conquestEvents: [event],
        });
        const plan = planGridWave({
            classification,
            seeding: 'winner_natives',
            geometry: 'grid_bfs',
            adjacency: '4',
            conquestEvents: [event],
            resolveStarPosition: () => ({ x: 50, y: 50 }),
        });
        expect(plan.perEvent[0].seedVIds.length).toBe(1);
        expect(plan.flipTimeByVId.size).toBe(classification.byRole.dispossessed.length);
    });

    it('each option combination produces a well-formed plan (smoke matrix)', () => {
        const seedings: GridWaveSeeding[] = [
            'winner_natives',
            'conquered_star_center',
            'winner_nearest_edge',
        ];
        const geometries: GridWaveGeometry[] = [
            'grid_bfs',
            'euclidean_band',
            'conquered_star_radial',
            'pre_to_post_frontier',
        ];
        const adjacencies: GridAdjacency[] = ['4', '8'];
        for (const s of seedings) {
            for (const g of geometries) {
                for (const a of adjacencies) {
                    const { classification, plan } = makeHalfFlipFixture({
                        seeding: s,
                        geometry: g,
                        adjacency: a,
                    });
                    for (const id of classification.byRole.dispossessed) {
                        const t = plan.flipTimeByVId.get(id);
                        expect(t, `missing flipTime for ${id} under ${s}/${g}/${a}`).toBeDefined();
                        expect(t as number).toBeGreaterThanOrEqual(0);
                        expect(t as number).toBeLessThanOrEqual(1);
                    }
                }
            }
        }
    });
});
