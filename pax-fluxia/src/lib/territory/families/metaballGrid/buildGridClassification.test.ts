import { describe, expect, it } from 'vitest';
import type { ConquestEvent } from '@pax/common';
import type { CanonicalGeometrySnapshot, TerritoryRegionShape } from '../../contracts/GeometryContracts';
import { buildGridClassification, makeEventId } from './buildGridClassification';
import type { GridOriginMode } from './metaballGridTypes';

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

const WORLD = { width: 100, height: 100 };
const SPACING = 20;
const ORIGIN: GridOriginMode = 'centered';

describe('buildGridClassification', () => {
    it('produces cols = ceil(w/s), rows = ceil(h/s)', () => {
        const prev = makeSnapshot([]);
        const next = makeSnapshot([]);
        const result = buildGridClassification({
            world: { width: 105, height: 85 },
            spacingPx: 20,
            originMode: 'centered',
            prevGeometry: prev,
            nextGeometry: next,
            conquestEvents: [],
        });
        expect(result.cols).toBe(6); // ceil(105/20)
        expect(result.rows).toBe(5); // ceil(85/20)
        expect(result.vstars.length).toBe(30);
    });

    it('centered origin places cell (0,0) at (spacing/2, spacing/2)', () => {
        const result = buildGridClassification({
            world: WORLD,
            spacingPx: SPACING,
            originMode: 'centered',
            prevGeometry: makeSnapshot([]),
            nextGeometry: makeSnapshot([]),
            conquestEvents: [],
        });
        expect(result.vstars[0].x).toBe(10);
        expect(result.vstars[0].y).toBe(10);
    });

    it('corner origin places cell (0,0) at (0, 0)', () => {
        const result = buildGridClassification({
            world: WORLD,
            spacingPx: SPACING,
            originMode: 'corner',
            prevGeometry: makeSnapshot([]),
            nextGeometry: makeSnapshot([]),
            conquestEvents: [],
        });
        expect(result.vstars[0].x).toBe(0);
        expect(result.vstars[0].y).toBe(0);
    });

    it('vstar id is deterministic g:ix:iy', () => {
        const result = buildGridClassification({
            world: WORLD,
            spacingPx: SPACING,
            originMode: ORIGIN,
            prevGeometry: makeSnapshot([]),
            nextGeometry: makeSnapshot([]),
            conquestEvents: [],
        });
        expect(result.vstars[0].id).toBe('g:0:0');
        expect(result.vstars[result.vstars.length - 1].id).toBe(`g:${result.cols - 1}:${result.rows - 1}`);
    });

    it('classifies native when PREV owner equals NEXT owner', () => {
        // Full-world square owned by A in both snapshots.
        const regionsA = [rect('A', 'rA', 0, 0, 100, 100)];
        const result = buildGridClassification({
            world: WORLD,
            spacingPx: SPACING,
            originMode: ORIGIN,
            prevGeometry: makeSnapshot(regionsA),
            nextGeometry: makeSnapshot(regionsA),
            conquestEvents: [],
        });
        expect(result.byRole.native.length).toBe(result.vstars.length);
        expect(result.byRole.dispossessed.length).toBe(0);
        for (const v of result.vstars) {
            expect(v.role).toBe('native');
            expect(v.prevOwnerId).toBe('A');
            expect(v.nextOwnerId).toBe('A');
            expect(v.eventId).toBeNull();
        }
    });

    it('classifies dispossessed when PREV owner differs from NEXT owner', () => {
        // Whole map flips from A to B.
        const prev = makeSnapshot([rect('A', 'rA', 0, 0, 100, 100)]);
        const next = makeSnapshot([rect('B', 'rB', 0, 0, 100, 100)]);
        const event = makeEvent({ starId: 's:1', prev: 'A', next: 'B' });
        const result = buildGridClassification({
            world: WORLD,
            spacingPx: SPACING,
            originMode: ORIGIN,
            prevGeometry: prev,
            nextGeometry: next,
            conquestEvents: [event],
        });
        expect(result.byRole.dispossessed.length).toBe(result.vstars.length);
        expect(result.byRole.native.length).toBe(0);
        const eid = makeEventId(event);
        expect(result.dispossessedByEventId[eid].length).toBe(result.vstars.length);
    });

    it('classifies emergent when PREV is null and NEXT is set', () => {
        const prev = makeSnapshot([]); // no regions → everyone null
        const next = makeSnapshot([rect('B', 'rB', 0, 0, 100, 100)]);
        const event = makeEvent({ starId: 's:1', prev: 'A', next: 'B' });
        const result = buildGridClassification({
            world: WORLD,
            spacingPx: SPACING,
            originMode: ORIGIN,
            prevGeometry: prev,
            nextGeometry: next,
            conquestEvents: [event],
        });
        expect(result.byRole.emergent.length).toBe(result.vstars.length);
    });

    it('classifies vacating when PREV is set and NEXT is null', () => {
        const prev = makeSnapshot([rect('A', 'rA', 0, 0, 100, 100)]);
        const next = makeSnapshot([]);
        const result = buildGridClassification({
            world: WORLD,
            spacingPx: SPACING,
            originMode: ORIGIN,
            prevGeometry: prev,
            nextGeometry: next,
            conquestEvents: [],
        });
        expect(result.byRole.vacating.length).toBe(result.vstars.length);
    });

    it('classifies outside when both PREV and NEXT are null', () => {
        const result = buildGridClassification({
            world: WORLD,
            spacingPx: SPACING,
            originMode: ORIGIN,
            prevGeometry: makeSnapshot([]),
            nextGeometry: makeSnapshot([]),
            conquestEvents: [],
        });
        expect(result.byRole.outside.length).toBe(result.vstars.length);
        for (const v of result.vstars) {
            expect(v.role).toBe('outside');
            expect(v.eventId).toBeNull();
        }
    });

    it('first-match wins when regions overlap', () => {
        // Two overlapping regions; A is first in array order.
        const regions = [
            rect('A', 'rA', 0, 0, 100, 100),
            rect('B', 'rB', 0, 0, 100, 100),
        ];
        const result = buildGridClassification({
            world: WORLD,
            spacingPx: SPACING,
            originMode: ORIGIN,
            prevGeometry: makeSnapshot(regions),
            nextGeometry: makeSnapshot(regions),
            conquestEvents: [],
        });
        for (const v of result.vstars) {
            expect(v.prevOwnerId).toBe('A');
            expect(v.nextOwnerId).toBe('A');
        }
    });

    it('splits dispossessed V\'s across two events by owner-pair match', () => {
        // Left half A→B, right half C→D.
        const prev = makeSnapshot([
            rect('A', 'rA', 0, 0, 50, 100),
            rect('C', 'rC', 50, 0, 100, 100),
        ]);
        const next = makeSnapshot([
            rect('B', 'rB', 0, 0, 50, 100),
            rect('D', 'rD', 50, 0, 100, 100),
        ]);
        const eAB = makeEvent({ starId: 's:AB', prev: 'A', next: 'B' });
        const eCD = makeEvent({ starId: 's:CD', prev: 'C', next: 'D' });
        const result = buildGridClassification({
            world: WORLD,
            spacingPx: SPACING,
            originMode: ORIGIN,
            prevGeometry: prev,
            nextGeometry: next,
            conquestEvents: [eAB, eCD],
        });
        const idAB = makeEventId(eAB);
        const idCD = makeEventId(eCD);
        expect(result.dispossessedByEventId[idAB].length).toBeGreaterThan(0);
        expect(result.dispossessedByEventId[idCD].length).toBeGreaterThan(0);
        // No overlap between event buckets.
        const setAB = new Set(result.dispossessedByEventId[idAB]);
        for (const id of result.dispossessedByEventId[idCD]) {
            expect(setAB.has(id)).toBe(false);
        }
    });

    it('tiebreaks identical (prev, next) events by starPosition proximity', () => {
        // Both events are A→B; use star positions to attribute cells.
        const prev = makeSnapshot([rect('A', 'rA', 0, 0, 100, 100)]);
        const next = makeSnapshot([rect('B', 'rB', 0, 0, 100, 100)]);
        const eLeft = makeEvent({ starId: 's:left', prev: 'A', next: 'B' });
        const eRight = makeEvent({ starId: 's:right', prev: 'A', next: 'B', tick: 2 });
        const resolveStarPosition = (starId: string) => {
            if (starId === 's:left') return { x: 10, y: 50 };
            if (starId === 's:right') return { x: 90, y: 50 };
            return null;
        };
        const result = buildGridClassification({
            world: WORLD,
            spacingPx: SPACING,
            originMode: ORIGIN,
            prevGeometry: prev,
            nextGeometry: next,
            conquestEvents: [eLeft, eRight],
            resolveStarPosition,
        });
        const idLeft = makeEventId(eLeft);
        const idRight = makeEventId(eRight);
        // Left column cells (ix=0) should attribute to s:left; right column (ix=cols-1) to s:right.
        const leftIds = new Set(result.dispossessedByEventId[idLeft]);
        const rightIds = new Set(result.dispossessedByEventId[idRight]);
        const v00 = result.vstars[0];                  // ix=0, iy=0
        const vLast = result.vstars[result.cols - 1];  // ix=cols-1, iy=0
        expect(leftIds.has(v00.id)).toBe(true);
        expect(rightIds.has(vLast.id)).toBe(true);
    });

    it('routes unmatched owner pairs to the default event bucket', () => {
        // Conquest event is A→B, but grid actually shows X→Y (no matching event).
        const prev = makeSnapshot([rect('X', 'rX', 0, 0, 100, 100)]);
        const next = makeSnapshot([rect('Y', 'rY', 0, 0, 100, 100)]);
        const result = buildGridClassification({
            world: WORLD,
            spacingPx: SPACING,
            originMode: ORIGIN,
            prevGeometry: prev,
            nextGeometry: next,
            conquestEvents: [makeEvent({ starId: 's:1', prev: 'A', next: 'B' })],
        });
        expect(result.dispossessedByEventId[result.defaultEventId].length).toBe(result.vstars.length);
    });

    it('is deterministic across identical calls', () => {
        const prev = makeSnapshot([
            rect('A', 'rA', 0, 0, 50, 100),
            rect('C', 'rC', 50, 0, 100, 100),
        ]);
        const next = makeSnapshot([
            rect('B', 'rB', 0, 0, 50, 100),
            rect('D', 'rD', 50, 0, 100, 100),
        ]);
        const events = [
            makeEvent({ starId: 's:AB', prev: 'A', next: 'B' }),
            makeEvent({ starId: 's:CD', prev: 'C', next: 'D' }),
        ];
        const a = buildGridClassification({
            world: WORLD,
            spacingPx: SPACING,
            originMode: ORIGIN,
            prevGeometry: prev,
            nextGeometry: next,
            conquestEvents: events,
        });
        const b = buildGridClassification({
            world: WORLD,
            spacingPx: SPACING,
            originMode: ORIGIN,
            prevGeometry: prev,
            nextGeometry: next,
            conquestEvents: events,
        });
        expect(b.vstars).toEqual(a.vstars);
        expect(b.byRole).toEqual(a.byRole);
        expect(b.dispossessedByEventId).toEqual(a.dispossessedByEventId);
    });

    it('rejects non-positive spacing and world dimensions', () => {
        const prev = makeSnapshot([]);
        const next = makeSnapshot([]);
        expect(() =>
            buildGridClassification({
                world: WORLD,
                spacingPx: 0,
                originMode: ORIGIN,
                prevGeometry: prev,
                nextGeometry: next,
                conquestEvents: [],
            }),
        ).toThrow();
        expect(() =>
            buildGridClassification({
                world: { width: 0, height: 100 },
                spacingPx: 20,
                originMode: ORIGIN,
                prevGeometry: prev,
                nextGeometry: next,
                conquestEvents: [],
            }),
        ).toThrow();
    });
});
