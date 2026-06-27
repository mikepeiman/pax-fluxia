import type { TerritoryGeometryData } from '../compiler/powerVoronoiTerritoryGeometryGenerator';
import type { PowerCoreCandidateDiagnostics } from '../contracts/GeometryContracts';
import {
    buildSharedEdgeGraph,
    reconstructLoopPolygon,
    walkRegionLoops,
} from './powerCore/sharedEdgeGraph';
import type { Point, PowerCell } from './powerCore/powerCoreTypes';

interface Bounds {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
}

const AREA_RELATIVE_TOLERANCE = 1e-9;
const AREA_ABSOLUTE_TOLERANCE_PX2 = 0.01;

function computeBounds(cells: TerritoryGeometryData['cells']): Bounds | null {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const cell of cells) {
        for (const [x, y] of cell.points) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }
    }
    if (
        !Number.isFinite(minX) ||
        !Number.isFinite(minY) ||
        !Number.isFinite(maxX) ||
        !Number.isFinite(maxY) ||
        maxX <= minX ||
        maxY <= minY
    ) {
        return null;
    }
    return { minX, minY, maxX, maxY };
}

function normalizePoint([x, y]: readonly [number, number], bounds: Bounds): Point {
    return [x - bounds.minX, y - bounds.minY];
}

function computeArea(points: ReadonlyArray<readonly [number, number]>): number {
    if (points.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i]!;
        const [bx, by] = points[(i + 1) % points.length]!;
        area += ax * by - bx * ay;
    }
    return Math.abs(area * 0.5);
}

function addToMap(map: Map<string, number>, key: string, value: number): void {
    map.set(key, (map.get(key) ?? 0) + value);
}

function countDuplicateSiteIds(cells: TerritoryGeometryData['cells']): number {
    const seen = new Set<string>();
    let duplicates = 0;
    for (const cell of cells) {
        if (seen.has(cell.siteId)) {
            duplicates += 1;
        } else {
            seen.add(cell.siteId);
        }
    }
    return duplicates;
}

function toPowerCells(cells: TerritoryGeometryData['cells'], bounds: Bounds): PowerCell[] {
    const seenSiteIds = new Map<string, number>();
    return cells.map((cell, index) => {
        const seenCount = seenSiteIds.get(cell.siteId) ?? 0;
        seenSiteIds.set(cell.siteId, seenCount + 1);
        const siteId = seenCount === 0 ? cell.siteId : `${cell.siteId}#${index}`;
        return {
            siteId,
            ownerId: cell.ownerId,
            points: cell.points.map((point) => normalizePoint(point, bounds)),
        };
    });
}

function fnv1aHex(input: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
}

function buildTopologyFingerprint(params: {
    readonly sharedEdges: ReturnType<typeof buildSharedEdgeGraph>['sharedEdges'];
    readonly worldEdges: ReturnType<typeof buildSharedEdgeGraph>['worldEdges'];
    readonly loops: ReturnType<typeof walkRegionLoops>;
}): string {
    const payload = JSON.stringify({
        sharedEdges: params.sharedEdges.map((edge) => [
            edge.edgeId,
            edge.ownerA,
            edge.ownerB,
        ]),
        worldEdges: params.worldEdges.map((edge) => [edge.edgeId, edge.owner]),
        loops: params.loops.map((loop) => [
            loop.loopId,
            loop.ownerId,
            loop.starIds,
            loop.orderedEdgeRefs.map((ref) => [
                ref.edgeId,
                ref.kind,
                ref.forward ? 1 : 0,
            ]),
        ]),
    });
    return `pcore:${fnv1aHex(payload)}`;
}

export function auditPowerCoreCandidateGeometry(
    geometry: TerritoryGeometryData,
): PowerCoreCandidateDiagnostics {
    const notes: string[] = [];
    const bounds = computeBounds(geometry.cells);
    if (!bounds) {
        return {
            ok: false,
            cellCount: geometry.cells.length,
            loopCount: 0,
            sharedEdgeCount: 0,
            worldEdgeCount: 0,
            raw0319SharedEdgeCount: geometry.sharedEdges.length,
            raw0319MergedRegionCount: geometry.mergedTerritories.length,
            maxOwnerAreaDeltaPx2: null,
            ownerComparisons: [],
            topologyFingerprint: 'pcore:empty',
            duplicateSourceSiteIdCount: countDuplicateSiteIds(geometry.cells),
            notes: ['powerCore candidate audit skipped: no bounded cell geometry'],
        };
    }

    const duplicateSourceSiteIdCount = countDuplicateSiteIds(geometry.cells);
    if (duplicateSourceSiteIdCount > 0) {
        notes.push(
            `normalized ${duplicateSourceSiteIdCount} duplicate 0319 site id(s) for candidate identity audit`,
        );
    }

    const powerCells = toPowerCells(geometry.cells, bounds);
    const graph = buildSharedEdgeGraph(powerCells, {
        width: bounds.maxX - bounds.minX,
        height: bounds.maxY - bounds.minY,
    });
    const loops = walkRegionLoops(graph, powerCells);

    const cellAreaByOwner = new Map<string, number>();
    const cellCountByOwner = new Map<string, number>();
    for (const cell of powerCells) {
        addToMap(cellAreaByOwner, cell.ownerId, computeArea(cell.points));
        addToMap(cellCountByOwner, cell.ownerId, 1);
    }

    const loopAreaByOwner = new Map<string, number>();
    const loopCountByOwner = new Map<string, number>();
    for (const loop of loops) {
        addToMap(
            loopAreaByOwner,
            loop.ownerId,
            computeArea(reconstructLoopPolygon(loop, graph)),
        );
        addToMap(loopCountByOwner, loop.ownerId, 1);
    }

    const ownerIds = [...new Set([...cellAreaByOwner.keys(), ...loopAreaByOwner.keys()])].sort();
    let maxOwnerAreaDeltaPx2 = 0;
    const ownerComparisons = ownerIds.map((ownerId) => {
        const cellAreaPx2 = cellAreaByOwner.get(ownerId) ?? 0;
        const loopAreaPx2 = loopAreaByOwner.get(ownerId) ?? 0;
        const areaDeltaPx2 = Math.abs(cellAreaPx2 - loopAreaPx2);
        maxOwnerAreaDeltaPx2 = Math.max(maxOwnerAreaDeltaPx2, areaDeltaPx2);
        return {
            ownerId,
            cellCount: cellCountByOwner.get(ownerId) ?? 0,
            loopCount: loopCountByOwner.get(ownerId) ?? 0,
            cellAreaPx2,
            loopAreaPx2,
            areaDeltaPx2,
        };
    });

    const totalCellArea = [...cellAreaByOwner.values()].reduce((sum, value) => sum + value, 0);
    const areaTolerancePx2 = Math.max(
        AREA_ABSOLUTE_TOLERANCE_PX2,
        totalCellArea * AREA_RELATIVE_TOLERANCE,
    );
    const missingOwners = ownerComparisons
        .filter((comparison) => comparison.cellCount > 0 && comparison.loopCount === 0)
        .map((comparison) => comparison.ownerId);
    if (missingOwners.length > 0) {
        notes.push(`powerCore missed owner loop(s): ${missingOwners.join(', ')}`);
    }
    if (maxOwnerAreaDeltaPx2 > areaTolerancePx2) {
        notes.push(
            `powerCore owner-area delta ${maxOwnerAreaDeltaPx2.toFixed(6)}px^2 exceeds ${areaTolerancePx2.toFixed(6)}px^2 tolerance`,
        );
    } else {
        notes.push(
            `powerCore owner areas match 0319 cells within ${areaTolerancePx2.toFixed(6)}px^2 tolerance`,
        );
    }

    const ok =
        loops.length > 0 &&
        missingOwners.length === 0 &&
        maxOwnerAreaDeltaPx2 <= areaTolerancePx2;

    return {
        ok,
        cellCount: geometry.cells.length,
        loopCount: loops.length,
        sharedEdgeCount: graph.sharedEdges.length,
        worldEdgeCount: graph.worldEdges.length,
        raw0319SharedEdgeCount: geometry.sharedEdges.length,
        raw0319MergedRegionCount: geometry.mergedTerritories.length,
        maxOwnerAreaDeltaPx2,
        ownerComparisons,
        topologyFingerprint: buildTopologyFingerprint({
            sharedEdges: graph.sharedEdges,
            worldEdges: graph.worldEdges,
            loops,
        }),
        duplicateSourceSiteIdCount,
        notes,
    };
}
