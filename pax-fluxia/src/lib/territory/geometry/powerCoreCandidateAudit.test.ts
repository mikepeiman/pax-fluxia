import { describe, expect, it } from 'vitest';
import type { StarConnection, StarState } from '$lib/types/game.types';
import { computeGeometry0319 } from '../compiler/Geometry_0319';
import type { TerritoryGeometryData } from '../compiler/powerVoronoiTerritoryGeometryGenerator';
import type { TerritoryGeneratorSettings } from '../compiler/powerVoronoiTerritoryGeometryGenerator';
import { auditPowerCoreCandidateGeometry } from './powerCoreCandidateAudit';

const GENERATED_SETTINGS: TerritoryGeneratorSettings = {
    starCoreGuardRadius: 20,
    starMargin: 0,
    msrStarBias: 0,
    corridorEnabled: false,
    corridorSpacing: 10,
    cxCount: 0,
    cxWeight: 0.5,
    cxContestMidpointVstars: true,
    cxContestPairCount: 1,
    cxContestPairWeight: 0.5,
    cxContestPairSpacing: 75,
    disconnectEnabled: false,
    disconnectDistance: 295,
    dxWeight: 3,
    clusterSplit: false,
    chaikinPasses: 0,
    frontierResolution: 5,
    boundaryPad: 50,
    boundaryEps: 6,
    worldWidth: 100,
    worldHeight: 80,
};

const GENERATED_STARS = [
    {
        id: 'alpha',
        ownerId: 'red',
        x: 20,
        y: 40,
        radius: 18,
    },
    {
        id: 'beta',
        ownerId: 'blue',
        x: 80,
        y: 40,
        radius: 18,
    },
] as StarState[];

const GENERATED_LANES = [
    {
        sourceId: 'alpha',
        targetId: 'beta',
        distance: 60,
        lanePathKind: 'straight',
        laneConstraintStatus: 'straight_ok',
        laneWaypoints: [
            [40, 40],
            [60, 40],
        ],
    },
] as StarConnection[];

function computeGenerated0319Geometry(params: {
    readonly stars?: StarState[];
    readonly lanes?: StarConnection[];
    readonly settings?: TerritoryGeneratorSettings;
} = {}): TerritoryGeometryData {
    const result = computeGeometry0319(
        [...(params.stars ?? GENERATED_STARS)],
        [...(params.lanes ?? [])],
        params.settings ?? GENERATED_SETTINGS,
    );
    if ('kind' in result) {
        throw new Error(result.message);
    }
    return result;
}

function makeSplitGeometryData(): TerritoryGeometryData {
    return {
        cells: [
            {
                siteId: 'left-star',
                ownerId: 'red',
                points: [
                    [-10, -10],
                    [50, -10],
                    [50, 110],
                    [-10, 110],
                    [-10, -10],
                ],
            },
            {
                siteId: 'right-star',
                ownerId: 'blue',
                points: [
                    [50, -10],
                    [110, -10],
                    [110, 110],
                    [50, 110],
                    [50, -10],
                ],
            },
        ],
        mergedTerritories: [
            {
                ownerId: 'red',
                color: 0,
                starIds: ['left-star'],
                points: [
                    [-10, -10],
                    [50, -10],
                    [50, 110],
                    [-10, 110],
                    [-10, -10],
                ],
            },
            {
                ownerId: 'blue',
                color: 0,
                starIds: ['right-star'],
                points: [
                    [50, -10],
                    [110, -10],
                    [110, 110],
                    [50, 110],
                    [50, -10],
                ],
            },
        ],
        sharedEdges: [
            {
                x1: 50,
                y1: -10,
                x2: 50,
                y2: 110,
                ownerA: 'red',
                ownerB: 'blue',
                colorA: 0,
                colorB: 0,
                siteIdA: 'left-star',
                siteIdB: 'right-star',
            },
        ],
        rawSharedPolylines: [
            {
                ownerPairKey: 'blue|red',
                color: 0,
                points: [
                    [50, -10],
                    [50, 110],
                ],
            },
        ],
        sharedPolylines: [
            {
                ownerPairKey: 'blue|red',
                color: 0,
                points: [
                    [50, -10],
                    [50, 110],
                ],
            },
        ],
        worldBorderPolylines: [],
        enclaveMap: new Map(),
        fingerprint: '0319-fixture:split',
        frontierMap: undefined,
    };
}

describe('auditPowerCoreCandidateGeometry', () => {
    it('compares a 0319-style split-cell fixture against power-core loops', () => {
        const audit = auditPowerCoreCandidateGeometry(makeSplitGeometryData());

        expect(audit.ok).toBe(true);
        expect(audit.cellCount).toBe(2);
        expect(audit.loopCount).toBe(2);
        expect(audit.sharedEdgeCount).toBe(1);
        expect(audit.raw0319SharedEdgeCount).toBe(1);
        expect(audit.raw0319MergedRegionCount).toBe(2);
        expect(audit.maxOwnerAreaDeltaPx2).toBe(0);
        expect(audit.ownerComparisons).toEqual([
            {
                ownerId: 'blue',
                cellCount: 1,
                loopCount: 1,
                cellAreaPx2: 7200,
                loopAreaPx2: 7200,
                areaDeltaPx2: 0,
            },
            {
                ownerId: 'red',
                cellCount: 1,
                loopCount: 1,
                cellAreaPx2: 7200,
                loopAreaPx2: 7200,
                areaDeltaPx2: 0,
            },
        ]);
    });

    it('keeps the candidate topology fingerprint stable when cell order changes', () => {
        const ordered = makeSplitGeometryData();
        const reordered: TerritoryGeometryData = {
            ...ordered,
            cells: [ordered.cells[1]!, ordered.cells[0]!],
        };

        expect(auditPowerCoreCandidateGeometry(reordered).topologyFingerprint).toBe(
            auditPowerCoreCandidateGeometry(ordered).topologyFingerprint,
        );
    });

    it('passes on generated 0319 two-owner geometry without virtual sites', () => {
        const audit = auditPowerCoreCandidateGeometry(computeGenerated0319Geometry());

        expect(audit.ok).toBe(true);
        expect(audit.cellCount).toBe(2);
        expect(audit.loopCount).toBe(2);
        expect(audit.sharedEdgeCount).toBe(1);
        expect(audit.worldEdgeCount).toBeGreaterThan(0);
        expect(audit.maxOwnerAreaDeltaPx2).not.toBeNull();
        expect(audit.maxOwnerAreaDeltaPx2!).toBeLessThanOrEqual(0.01);
    });

    it('passes on generated 0319 corridor-virtual geometry with duplicate source site ids', () => {
        const audit = auditPowerCoreCandidateGeometry(
            computeGenerated0319Geometry({
                lanes: GENERATED_LANES,
                settings: {
                    ...GENERATED_SETTINGS,
                    corridorEnabled: true,
                    cxCount: 4,
                },
            }),
        );

        expect(audit.ok).toBe(true);
        expect(audit.cellCount).toBeGreaterThan(2);
        expect(audit.duplicateSourceSiteIdCount).toBeGreaterThan(0);
        expect(audit.maxOwnerAreaDeltaPx2).not.toBeNull();
        expect(audit.maxOwnerAreaDeltaPx2!).toBeLessThanOrEqual(0.01);
    });
});
