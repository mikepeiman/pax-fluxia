import { describe, expect, it } from 'vitest';
import type { ConquestEvent } from '@pax/common';
import type {
    ResolvedGeometrySnapshot,
    TerritoryRegionShape,
} from '../../contracts/GeometryContracts';
import { buildGridClassification } from './buildGridClassification';
import {
    buildOrderedTransitionFrontier,
    computeDualPassBlendAlphas,
    findActiveFrontierRange,
} from './cellGridActiveFrontier';
import { planGridWave } from './planGridWave';
import { renderCellGridScene } from './renderCellGridScene';

function makeSnapshot(
    regions: TerritoryRegionShape[],
): ResolvedGeometrySnapshot {
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

function rect(
    ownerId: string,
    regionId: string,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
): TerritoryRegionShape {
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
    starId: string;
    prev: string;
    next: string;
}): ConquestEvent {
    return {
        tick: 1,
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

describe('cellGridActiveFrontier', () => {
    it('builds a deterministic ordered transition frontier including emergent cells', () => {
        const world = { width: 40, height: 20 };
        const prev = makeSnapshot([rect('A', 'prev-left', 0, 0, 20, 20)]);
        const next = makeSnapshot([rect('B', 'next-all', 0, 0, 40, 20)]);
        const event = makeEvent({ starId: 's:1', prev: 'A', next: 'B' });
        const classification = buildGridClassification({
            world,
            spacingPx: 10,
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
            resolveStarPosition: () => ({ x: 5, y: 5 }),
        });

        expect(plan.orderedTransitionVIds.length).toBe(
            classification.byRole.dispossessed.length
                + classification.byRole.emergent.length
                + classification.byRole.vacating.length,
        );
        expect(plan.orderedTransitionVIds.length).toBe(plan.orderedFlipTimes.length);
        const rebuilt = buildOrderedTransitionFrontier({
            classification,
            flipTimeByVId: plan.flipTimeByVId,
        });
        expect(rebuilt.orderedTransitionVIds).toEqual(plan.orderedTransitionVIds);
        expect(rebuilt.orderedFlipTimes).toEqual(plan.orderedFlipTimes);
    });

    it('finds the active flip window via binary search bounds', () => {
        const orderedFlipTimes = [0, 0.05, 0.1, 0.2, 0.4];
        expect(
            findActiveFrontierRange({
                orderedFlipTimes,
                progress: 0.1,
                flipWindow: 0.05,
            }),
        ).toEqual({ startIndex: 1, endIndex: 3 });
        expect(
            findActiveFrontierRange({
                orderedFlipTimes,
                progress: 0.39,
                flipWindow: 0.02,
            }),
        ).toEqual({ startIndex: 4, endIndex: 5 });
        expect(
            findActiveFrontierRange({
                orderedFlipTimes,
                progress: 0.8,
                flipWindow: 0.05,
            }),
        ).toEqual({ startIndex: 5, endIndex: 5 });
    });

    it('matches dual-pass scene alpha math for an active dispossessed cell', () => {
        const world = { width: 40, height: 40 };
        const prev = makeSnapshot([rect('A', 'rA', 0, 0, 40, 40)]);
        const next = makeSnapshot([rect('B', 'rB', 0, 0, 40, 40)]);
        const event = makeEvent({ starId: 's:1', prev: 'A', next: 'B' });
        const classification = buildGridClassification({
            world,
            spacingPx: 20,
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
        const id = classification.byRole.dispossessed[0];
        const flipTime = plan.flipTimeByVId.get(id)!;
        const scene = renderCellGridScene({
            classification,
            wavePlan: plan,
            progress: flipTime,
            flipTransition: 'dual_pass_blend',
            flipWindow: 0.2,
            strength: 1,
            inwardOffsetPx: 0,
            ownerColorIdx: new Map([
                ['A', 1],
                ['B', 2],
            ]),
        });
        const prevCell = scene.cells.find((cell) => cell.vId === id && cell.pass === 'prev');
        const nextCell = scene.cells.find((cell) => cell.vId === id && cell.pass === 'next');
        const alphas = computeDualPassBlendAlphas({
            progress: flipTime,
            flipTime,
            flipWindow: 0.2,
            strength: 1,
            emitPrev: true,
            emitNext: true,
        });

        expect(prevCell?.alpha).toBeCloseTo(alphas.prevAlpha, 6);
        expect(nextCell?.alpha).toBeCloseTo(alphas.nextAlpha, 6);
    });
});
