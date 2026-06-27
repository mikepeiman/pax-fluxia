import { describe, expect, it } from 'vitest';
import type { ConquestEvent } from '@pax/common';
import type {
    ResolvedGeometrySnapshot,
    TerritoryRegionShape,
} from '../../contracts/GeometryContracts';
import { buildGridClassification } from '../cellGrid/buildGridClassification';
import type { GridOwnedStar } from '../cellGrid/cellGridTypes';
import {
    buildGridGradientTypedClassification,
    codeToRole,
    GridGradientOwnerGridLruCache,
    type GridGradientOwnerGrid,
} from './typedClassification';

const WORLD = { width: 100, height: 40 };
const SPACING = 10;

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

function makeSnapshot(
    version: string,
    regions: TerritoryRegionShape[],
): ResolvedGeometrySnapshot {
    return {
        version,
        sourceMode: 'unified_vector',
        sourceStyle: 'vector',
        ownershipVersion: version,
        geometryFamily: 'vector-native',
        sourceMethod: 'power_voronoi',
        territoryRegions: regions,
        frontierPolylines: [],
        worldBorderPolylines: [],
        sharedFrontierMap: new Map(),
        frontierTopology: {
            version: `topo:${version}`,
            ownershipVersion: version,
            worldBounds: WORLD,
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

function makeEvent(): ConquestEvent {
    return {
        tick: 1,
        starId: 'target',
        attackerStarId: 'attacker',
        attackerStarIds: ['attacker'],
        attackerShipTransfers: [10],
        previousOwner: 'A',
        newOwner: 'B',
        shipsCaptured: 10,
        shipsEscaped: 0,
        shipsDestroyed: 0,
        shipsTransferred: 10,
        conquestType: 'complete',
    };
}

function ownedStars(): GridOwnedStar[] {
    return [
        { id: 'attacker', ownerId: 'B', x: 75, y: 20 },
        { id: 'target', ownerId: 'B', x: 25, y: 20 },
    ];
}

function previousOwnedStars(): GridOwnedStar[] {
    return [
        { id: 'attacker', ownerId: 'B', x: 75, y: 20 },
        { id: 'target', ownerId: 'A', x: 25, y: 20 },
    ];
}

function compareToReference(params: {
    distribution: 'square' | 'jittered';
    positionJitter: number;
}): void {
    const prevGeometry = makeSnapshot('pre', [
        rect('A', 'left', 0, 0, 50, 40),
        rect('B', 'right', 50, 0, 100, 40),
    ]);
    const nextGeometry = makeSnapshot('post', [
        rect('B', 'all', 0, 0, 100, 40),
    ]);
    const event = makeEvent();
    const resolveStarPosition = (starId: string) => {
        if (starId === 'target') return { x: 25, y: 20 };
        if (starId === 'attacker') return { x: 75, y: 20 };
        return null;
    };
    const reference = buildGridClassification({
        world: WORLD,
        spacingPx: SPACING,
        originMode: 'centered',
        prevGeometry,
        nextGeometry,
        conquestEvents: [event],
        resolveStarPosition,
        prevOwnedStars: previousOwnedStars(),
        nextOwnedStars: ownedStars(),
        distribution: params.distribution,
        positionJitter: params.positionJitter,
    });
    const result = buildGridGradientTypedClassification({
        world: WORLD,
        spacingPx: SPACING,
        originMode: 'centered',
        prevGeometry,
        nextGeometry,
        conquestEvents: [event],
        resolveStarPosition,
        prevOwnedStars: previousOwnedStars(),
        nextOwnedStars: ownedStars(),
        distribution: params.distribution,
        positionJitter: params.positionJitter,
    });

    expect(result.classification.vstars).toEqual(reference.vstars);
    expect(result.classification.byRole).toEqual(reference.byRole);
    expect(result.classification.dispossessedByEventId).toEqual(
        reference.dispossessedByEventId,
    );
    for (const vstar of reference.vstars) {
        const cellIndex = vstar.iy * reference.cols + vstar.ix;
        expect(codeToRole(result.typed.roleCodeByCell[cellIndex])).toBe(vstar.role);
    }
}

describe('Grid Gradient typed classification', () => {
    it('bounds owner-grid cache entries and refreshes recently used grids', () => {
        const cache = new GridGradientOwnerGridLruCache(2);
        const makeGrid = (key: string): GridGradientOwnerGrid => ({
            key,
            algorithm: 'raster_scanline',
            ownerIndexByCell: new Int16Array(4),
        });

        cache.set('a', makeGrid('a'));
        cache.set('b', makeGrid('b'));
        expect(cache.get('a')?.key).toBe('a');
        cache.set('c', makeGrid('c'));

        expect(cache.get('b')).toBeUndefined();
        expect(cache.get('a')?.key).toBe('a');
        expect(cache.get('c')?.key).toBe('c');
        expect(cache.snapshot()).toEqual({
            entries: 2,
            maxEntries: 2,
            byteLength: 16,
            evictions: 1,
        });
    });

    it('matches the existing classifier for square grids', () => {
        compareToReference({ distribution: 'square', positionJitter: 0 });
    });

    it('keeps jittered grids on the point classifier path', () => {
        const prevGeometry = makeSnapshot('pre', [rect('A', 'all', 0, 0, 100, 40)]);
        const nextGeometry = makeSnapshot('post', [rect('A', 'all', 0, 0, 100, 40)]);
        const result = buildGridGradientTypedClassification({
            world: WORLD,
            spacingPx: SPACING,
            originMode: 'centered',
            prevGeometry,
            nextGeometry,
            conquestEvents: [],
            prevOwnedStars: previousOwnedStars(),
            nextOwnedStars: ownedStars(),
            distribution: 'jittered',
            positionJitter: 0.25,
        });

        expect(result.algorithm).toBe('point_polygon');
        compareToReference({ distribution: 'jittered', positionJitter: 0.25 });
    });

    it('reuses owner grids when inputs are unchanged', () => {
        const prevGeometry = makeSnapshot('pre', [rect('A', 'all', 0, 0, 100, 40)]);
        const nextGeometry = makeSnapshot('post', [rect('A', 'all', 0, 0, 100, 40)]);
        const ownerGridCache = new Map<string, GridGradientOwnerGrid>();
        buildGridGradientTypedClassification({
            world: WORLD,
            spacingPx: SPACING,
            originMode: 'centered',
            prevGeometry,
            nextGeometry,
            conquestEvents: [],
            prevOwnedStars: previousOwnedStars(),
            nextOwnedStars: ownedStars(),
            ownerGridCache,
        });
        const second = buildGridGradientTypedClassification({
            world: WORLD,
            spacingPx: SPACING,
            originMode: 'centered',
            prevGeometry,
            nextGeometry,
            conquestEvents: [],
            prevOwnedStars: previousOwnedStars(),
            nextOwnedStars: ownedStars(),
            ownerGridCache,
        });

        expect(second.prevOwnerGridCacheHit).toBe(true);
        expect(second.nextOwnerGridCacheHit).toBe(true);
    });
});
