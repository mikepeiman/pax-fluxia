import { describe, expect, it } from 'vitest';
import type { ConquestEvent } from '@pax/common';
import type { CanonicalGeometrySnapshot, TerritoryRegionShape } from '../../contracts/GeometryContracts';
import { buildGridClassification } from './buildGridClassification';
import { planGridWave } from './planGridWave';
import { renderMetaballGridScene } from './renderMetaballGridScene';
import type { GridFlipTransition } from './metaballGridTypes';

function makeSnapshot(regions: TerritoryRegionShape[]): CanonicalGeometrySnapshot {
    return {
        version: 'test',
        sourceMode: 'unified_vector',
        sourceStyle: 'canonical',
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

function makeEvent(starId: string, prev: string, next: string): ConquestEvent {
    return {
        tick: 1,
        starId,
        attackerStarId: 'a:1',
        attackerStarIds: ['a:1'],
        attackerShipTransfers: [10],
        previousOwner: prev,
        newOwner: next,
        shipsCaptured: 10,
        shipsEscaped: 0,
        shipsDestroyed: 0,
        shipsTransferred: 10,
        conquestType: 'complete',
    };
}

const OWNER_COLORS = new Map<string, number>([
    ['A', 1],
    ['B', 2],
    ['C', 3],
]);

function fullFlipFixture() {
    const world = { width: 40, height: 40 };
    const spacingPx = 20;
    const prev = makeSnapshot([rect('A', 'rA', 0, 0, 40, 40)]);
    const next = makeSnapshot([rect('B', 'rB', 0, 0, 40, 40)]);
    const event = makeEvent('s:1', 'A', 'B');
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
        resolveStarPosition: () => ({ x: 10, y: 10 }),
    });
    return { classification, plan };
}

function mixedFixture() {
    // Left half A→B, right half A→C (dispossessed to two different winners).
    // Top-right quadrant empty in PREV (emergent under C), bottom-left empty in NEXT (vacating).
    // Actually simpler: full-world A in both → native only. Use a half-flip with events.
    const world = { width: 40, height: 40 };
    const spacingPx = 20;
    const prev = makeSnapshot([rect('A', 'rA_left', 0, 0, 20, 40), rect('A', 'rA_right', 20, 0, 40, 40)]);
    const next = makeSnapshot([rect('A', 'rA_left2', 0, 0, 20, 40), rect('B', 'rB_right', 20, 0, 40, 40)]);
    const event = makeEvent('s:1', 'A', 'B');
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
    });
    return { classification, plan };
}

describe('renderMetaballGridScene', () => {
    it('emits exactly one cell per native vstar at NEXT color, alpha 1', () => {
        const { classification, plan } = mixedFixture();
        const scene = renderMetaballGridScene({
            classification,
            wavePlan: plan,
            progress: 0.5,
            flipTransition: 'hard',
            flipWindow: 0.1,
            strength: 1.35,
            inwardOffsetPx: 0,
            ownerColorIdx: OWNER_COLORS,
        });
        const nativeIds = new Set(classification.byRole.native);
        const nativeCells = scene.cells.filter((c) => nativeIds.has(c.vId));
        expect(nativeCells.length).toBe(nativeIds.size);
        for (const c of nativeCells) {
            expect(c.alpha).toBe(1);
            expect(c.colorIdx).toBe(OWNER_COLORS.get('A'));
            expect(c.pass).toBe('single');
        }
        // Outside cells still must not appear.
        const outsideIds = new Set(classification.byRole.outside);
        for (const c of scene.cells) {
            expect(outsideIds.has(c.vId)).toBe(false);
        }
    });

    it('hard: dispossessed cell shows PREV color below flipTime, NEXT color at/after', () => {
        const { classification, plan } = fullFlipFixture();
        const dispossessedId = classification.byRole.dispossessed[0];
        const flipTime = plan.flipTimeByVId.get(dispossessedId)!;

        const before = renderMetaballGridScene({
            classification,
            wavePlan: plan,
            progress: Math.max(0, flipTime - 0.1),
            flipTransition: 'hard',
            flipWindow: 0,
            strength: 1,
            inwardOffsetPx: 0,
            ownerColorIdx: OWNER_COLORS,
        });
        const after = renderMetaballGridScene({
            classification,
            wavePlan: plan,
            progress: Math.min(1, flipTime + 0.1),
            flipTransition: 'hard',
            flipWindow: 0,
            strength: 1,
            inwardOffsetPx: 0,
            ownerColorIdx: OWNER_COLORS,
        });
        const cellBefore = before.cells.find((c) => c.vId === dispossessedId);
        const cellAfter = after.cells.find((c) => c.vId === dispossessedId);
        // If flipTime is already 0, "before" may not exist — just check "after" in that case.
        if (flipTime > 0) {
            expect(cellBefore?.colorIdx).toBe(OWNER_COLORS.get('A'));
        }
        expect(cellAfter?.colorIdx).toBe(OWNER_COLORS.get('B'));
    });

    it('hard: at progress=1 every dispossessed cell renders as NEXT color (terminal parity)', () => {
        const { classification, plan } = fullFlipFixture();
        const scene = renderMetaballGridScene({
            classification,
            wavePlan: plan,
            progress: 1,
            flipTransition: 'hard',
            flipWindow: 0,
            strength: 1,
            inwardOffsetPx: 0,
            ownerColorIdx: OWNER_COLORS,
        });
        for (const id of classification.byRole.dispossessed) {
            const c = scene.cells.find((cell) => cell.vId === id);
            expect(c).toBeDefined();
            expect(c?.colorIdx).toBe(OWNER_COLORS.get('B'));
            expect(c?.alpha).toBe(1);
        }
    });

    it('hard: at progress=0 every dispossessed cell renders as PREV color (start parity)', () => {
        const { classification, plan } = fullFlipFixture();
        // Force flipTime > 0 by picking a star far away — conquered_star_center already does this for all but nearest cell.
        const scene = renderMetaballGridScene({
            classification,
            wavePlan: plan,
            progress: -0.01,
            flipTransition: 'hard',
            flipWindow: 0,
            strength: 1,
            inwardOffsetPx: 0,
            ownerColorIdx: OWNER_COLORS,
        });
        // Any cell with flipTime > 0 should be PREV at progress<=0.
        for (const id of classification.byRole.dispossessed) {
            const t = plan.flipTimeByVId.get(id)!;
            if (t > 0) {
                const c = scene.cells.find((cell) => cell.vId === id);
                expect(c?.colorIdx).toBe(OWNER_COLORS.get('A'));
            }
        }
    });

    it('lerp_per_cell: inside window, emits two cells with complementary alphas summing to 1', () => {
        const { classification, plan } = fullFlipFixture();
        const id = classification.byRole.dispossessed[0];
        const flipTime = plan.flipTimeByVId.get(id)!;
        const flipWindow = 0.2;
        const scene = renderMetaballGridScene({
            classification,
            wavePlan: plan,
            progress: flipTime, // dead center of window
            flipTransition: 'lerp_per_cell',
            flipWindow,
            strength: 1,
            inwardOffsetPx: 0,
            ownerColorIdx: OWNER_COLORS,
        });
        const cellsForId = scene.cells.filter((c) => c.vId === id);
        expect(cellsForId.length).toBe(2);
        const prevCell = cellsForId.find((c) => c.pass === 'prev')!;
        const nextCell = cellsForId.find((c) => c.pass === 'next')!;
        expect(prevCell.colorIdx).toBe(OWNER_COLORS.get('A'));
        expect(nextCell.colorIdx).toBe(OWNER_COLORS.get('B'));
        expect(prevCell.alpha + nextCell.alpha).toBeCloseTo(1, 5);
        // At center of smoothstep window, alpha should be ~0.5 each.
        expect(prevCell.alpha).toBeCloseTo(0.5, 5);
        expect(nextCell.alpha).toBeCloseTo(0.5, 5);
    });

    it('lerp_per_cell: outside window behaves as hard (single cell)', () => {
        const { classification, plan } = fullFlipFixture();
        const id = classification.byRole.dispossessed[0];
        const flipTime = plan.flipTimeByVId.get(id)!;
        const W = 0.05;
        const sceneBefore = renderMetaballGridScene({
            classification,
            wavePlan: plan,
            progress: Math.max(0, flipTime - W - 0.1),
            flipTransition: 'lerp_per_cell',
            flipWindow: W,
            strength: 1,
            inwardOffsetPx: 0,
            ownerColorIdx: OWNER_COLORS,
        });
        const cellsBefore = sceneBefore.cells.filter((c) => c.vId === id);
        if (flipTime - W - 0.1 > 0) {
            expect(cellsBefore.length).toBe(1);
            expect(cellsBefore[0].pass).toBe('single');
            expect(cellsBefore[0].colorIdx).toBe(OWNER_COLORS.get('A'));
        }

        const sceneAfter = renderMetaballGridScene({
            classification,
            wavePlan: plan,
            progress: Math.min(1, flipTime + W + 0.1),
            flipTransition: 'lerp_per_cell',
            flipWindow: W,
            strength: 1,
            inwardOffsetPx: 0,
            ownerColorIdx: OWNER_COLORS,
        });
        const cellsAfter = sceneAfter.cells.filter((c) => c.vId === id);
        expect(cellsAfter.length).toBe(1);
        expect(cellsAfter[0].pass).toBe('single');
        expect(cellsAfter[0].colorIdx).toBe(OWNER_COLORS.get('B'));
    });

    it('dual_pass_blend: always emits two cells per dispossessed vstar with complementary alphas', () => {
        const { classification, plan } = fullFlipFixture();
        const progresses = [0, 0.1, 0.3, 0.5, 0.7, 0.9, 1];
        for (const p of progresses) {
            const scene = renderMetaballGridScene({
                classification,
                wavePlan: plan,
                progress: p,
                flipTransition: 'dual_pass_blend',
                flipWindow: 0.1,
                strength: 1,
                inwardOffsetPx: 0,
                ownerColorIdx: OWNER_COLORS,
            });
            for (const id of classification.byRole.dispossessed) {
                const cells = scene.cells.filter((c) => c.vId === id);
                expect(cells.length, `progress=${p} id=${id}`).toBe(2);
                const sum = cells.reduce((acc, c) => acc + c.alpha, 0);
                expect(sum).toBeCloseTo(1, 5);
            }
        }
    });

    it('outside cells never appear in the scene', () => {
        const world = { width: 40, height: 40 };
        const spacingPx = 20;
        const classification = buildGridClassification({
            world,
            spacingPx,
            originMode: 'centered',
            prevGeometry: makeSnapshot([]),
            nextGeometry: makeSnapshot([]),
            conquestEvents: [],
        });
        const plan = planGridWave({
            classification,
            seeding: 'winner_natives',
            geometry: 'grid_bfs',
            adjacency: '4',
            conquestEvents: [],
        });
        const flips: GridFlipTransition[] = ['hard', 'lerp_per_cell', 'dual_pass_blend'];
        for (const f of flips) {
            const scene = renderMetaballGridScene({
                classification,
                wavePlan: plan,
                progress: 0.5,
                flipTransition: f,
                flipWindow: 0.1,
                strength: 1,
                inwardOffsetPx: 0,
                ownerColorIdx: OWNER_COLORS,
            });
            expect(scene.cells.length).toBe(0);
        }
    });

    it('native invariance: native cells do not change across progress values', () => {
        const { classification, plan } = mixedFixture();
        const nativeIds = classification.byRole.native;
        if (nativeIds.length === 0) return;
        const snapshots = [0, 0.25, 0.5, 0.75, 1].map((p) =>
            renderMetaballGridScene({
                classification,
                wavePlan: plan,
                progress: p,
                flipTransition: 'lerp_per_cell',
                flipWindow: 0.2,
                strength: 1.35,
                inwardOffsetPx: 0,
                ownerColorIdx: OWNER_COLORS,
            }),
        );
        for (const nid of nativeIds) {
            const perSnapshot = snapshots.map((s) => {
                const c = s.cells.find((cc) => cc.vId === nid)!;
                return { color: c.colorIdx, alpha: c.alpha, strength: c.strength, pass: c.pass };
            });
            for (let i = 1; i < perSnapshot.length; i++) {
                expect(perSnapshot[i]).toEqual(perSnapshot[0]);
            }
        }
    });

    it('emergent cells omit PREV side (one cell only, NEXT color)', () => {
        // Empty PREV + full NEXT → every cell emergent.
        const world = { width: 40, height: 40 };
        const spacingPx = 20;
        const classification = buildGridClassification({
            world,
            spacingPx,
            originMode: 'centered',
            prevGeometry: makeSnapshot([]),
            nextGeometry: makeSnapshot([rect('B', 'rB', 0, 0, 40, 40)]),
            conquestEvents: [],
        });
        const plan = planGridWave({
            classification,
            seeding: 'winner_natives',
            geometry: 'grid_bfs',
            adjacency: '4',
            conquestEvents: [],
        });
        const scene = renderMetaballGridScene({
            classification,
            wavePlan: plan,
            progress: 0.5,
            flipTransition: 'dual_pass_blend',
            flipWindow: 0.1,
            strength: 1,
            inwardOffsetPx: 0,
            ownerColorIdx: OWNER_COLORS,
        });
        // With dual_pass_blend, emergent should emit only the 'next' pass (alpha=s).
        for (const id of classification.byRole.emergent) {
            const cells = scene.cells.filter((c) => c.vId === id);
            expect(cells.length).toBe(1);
            expect(cells[0].pass).toBe('next');
            expect(cells[0].colorIdx).toBe(OWNER_COLORS.get('B'));
        }
    });

    it('vacating cells omit NEXT side (one cell only, PREV color)', () => {
        const world = { width: 40, height: 40 };
        const spacingPx = 20;
        const classification = buildGridClassification({
            world,
            spacingPx,
            originMode: 'centered',
            prevGeometry: makeSnapshot([rect('A', 'rA', 0, 0, 40, 40)]),
            nextGeometry: makeSnapshot([]),
            conquestEvents: [],
        });
        const plan = planGridWave({
            classification,
            seeding: 'winner_natives',
            geometry: 'grid_bfs',
            adjacency: '4',
            conquestEvents: [],
        });
        const scene = renderMetaballGridScene({
            classification,
            wavePlan: plan,
            progress: 0.5,
            flipTransition: 'dual_pass_blend',
            flipWindow: 0.1,
            strength: 1,
            inwardOffsetPx: 0,
            ownerColorIdx: OWNER_COLORS,
        });
        for (const id of classification.byRole.vacating) {
            const cells = scene.cells.filter((c) => c.vId === id);
            expect(cells.length).toBe(1);
            expect(cells[0].pass).toBe('prev');
            expect(cells[0].colorIdx).toBe(OWNER_COLORS.get('A'));
        }
    });

    it('is deterministic across identical calls', () => {
        const { classification, plan } = fullFlipFixture();
        const a = renderMetaballGridScene({
            classification,
            wavePlan: plan,
            progress: 0.4,
            flipTransition: 'lerp_per_cell',
            flipWindow: 0.1,
            strength: 1,
            inwardOffsetPx: 0,
            ownerColorIdx: OWNER_COLORS,
        });
        const b = renderMetaballGridScene({
            classification,
            wavePlan: plan,
            progress: 0.4,
            flipTransition: 'lerp_per_cell',
            flipWindow: 0.1,
            strength: 1,
            inwardOffsetPx: 0,
            ownerColorIdx: OWNER_COLORS,
        });
        expect(b.cells).toEqual(a.cells);
    });
});
