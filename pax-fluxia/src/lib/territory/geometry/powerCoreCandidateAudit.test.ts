import { describe, expect, it } from 'vitest';
import type { TerritoryGeometryData } from '../compiler/powerVoronoiTerritoryGeometryGenerator';
import { auditPowerCoreCandidateGeometry } from './powerCoreCandidateAudit';

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
});
