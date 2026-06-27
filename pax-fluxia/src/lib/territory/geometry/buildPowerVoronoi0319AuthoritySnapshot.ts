import type { StarState } from '$lib/types/game.types';
import { measurePerf } from '$lib/perf/perfProbe';
import type {
    ResolvedFrontierPolyline,
    ResolvedGeometrySnapshot,
    ResolvedShell,
    ResolvedShellLoop,
    SharedFrontierMap,
    TerritoryRegionShape,
} from '../contracts/GeometryContracts';
import type {
    TerritoryGeometryData,
    SharedPolyline,
} from '../compiler/powerVoronoiTerritoryGeometryGenerator';
import { buildPowerVoronoiFrontierTopology } from '../families/buildPowerVoronoiFrontierTopology';
import {
    resolveConstraintAlignedTerritoryGeometry,
    type ConstraintAlignedFrontierPolyline,
} from './resolveConstraintAlignedTerritoryGeometry';
import { pointInPolygon, polygonCentroid } from './geometryUtils';
import {
    deriveStableRegionId,
    deriveRegionFallbackId,
    isVirtualSiteId,
    hashString32,
} from './regionIdentity';
import { validateResolvedGeometrySnapshotInvariants } from './resolvedGeometryOracle';

interface BuildPowerVoronoi0319AuthoritySnapshotParams {
    readonly geometry: TerritoryGeometryData;
    readonly stars: ReadonlyArray<StarState>;
    readonly ownershipVersion: string;
    readonly sourceStyle: ResolvedGeometrySnapshot['sourceStyle'];
    readonly worldWidth: number;
    readonly worldHeight: number;
    readonly requestedMarginPx: number;
}

type RawMergedTerritory = TerritoryGeometryData['mergedTerritories'][number];

interface Bounds {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
}

function computePolygonArea(points: ReadonlyArray<[number, number]>): number {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i]!;
        const [bx, by] = points[(i + 1) % points.length]!;
        area += ax * by - bx * ay;
    }
    return area * 0.5;
}

function computeBounds(points: ReadonlyArray<[number, number]>): Bounds {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of points) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }
    return { minX, minY, maxX, maxY };
}

function isPointInBounds(x: number, y: number, bounds: Bounds): boolean {
    return (
        x >= bounds.minX &&
        x <= bounds.maxX &&
        y >= bounds.minY &&
        y <= bounds.maxY
    );
}

function buildSharedFrontierMapFromPolylines(
    polylines: ReadonlyArray<ResolvedFrontierPolyline>,
): SharedFrontierMap {
    const grouped = new Map<string, ResolvedFrontierPolyline[]>();
    for (const polyline of polylines) {
        const bucket = grouped.get(polyline.ownerPairKey);
        if (bucket) {
            bucket.push(polyline);
        } else {
            grouped.set(polyline.ownerPairKey, [polyline]);
        }
    }
    return grouped;
}

function clonePoints(
    points: ReadonlyArray<[number, number]>,
): [number, number][] {
    return points.map(([x, y]) => [x, y] as [number, number]);
}

function clonePolyline<T extends { points: ReadonlyArray<[number, number]> }>(
    polyline: T,
): T {
    return {
        ...polyline,
        points: clonePoints(polyline.points),
    };
}

function createFrontierTopologyPlaceholder(params: {
    ownershipVersion: string;
    worldWidth: number;
    worldHeight: number;
}): ResolvedGeometrySnapshot['frontierTopology'] {
    return {
        version: `topology:placeholder:${params.ownershipVersion}`,
        ownershipVersion: params.ownershipVersion,
        worldBounds: {
            width: params.worldWidth,
            height: params.worldHeight,
        },
        vertices: new Map(),
        sections: new Map(),
        loops: [],
        sectionsByOwnerPair: new Map(),
        sectionsByVertex: new Map(),
        sectionsByOwner: new Map(),
    };
}

function adaptSharedPolyline(params: {
    polyline: SharedPolyline;
    index: number;
    kind: 'raw_shared' | 'raw_world';
}): ResolvedFrontierPolyline {
    const [ownerA, ownerB] = params.polyline.ownerPairKey.split('|');
    return {
        frontierId: `${params.kind}:${params.polyline.ownerPairKey}:${params.index}`,
        ownerA,
        ownerB: ownerB ?? 'world',
        ownerPairKey: params.polyline.ownerPairKey,
        points: clonePoints(params.polyline.points),
        confidence: 1,
    };
}

function toSharedPolyline(polyline: ResolvedFrontierPolyline): SharedPolyline {
    return {
        ownerPairKey: polyline.ownerPairKey,
        color: 0,
        points: clonePoints(polyline.points),
    };
}

function buildOwnerStars(
    stars: ReadonlyArray<StarState>,
): ReadonlyMap<string, readonly StarState[]> {
    const byOwner = new Map<string, StarState[]>();
    for (const star of stars) {
        if (!star.ownerId) continue;
        const bucket = byOwner.get(star.ownerId);
        if (bucket) {
            bucket.push(star);
        } else {
            byOwner.set(star.ownerId, [star]);
        }
    }
    return byOwner;
}

function matchRawTerritoryCandidate(params: {
    anchorStarIds: readonly string[];
    points: ReadonlyArray<[number, number]>;
    rawTerritories: ReadonlyArray<RawMergedTerritory>;
}): RawMergedTerritory | null {
    const candidates = params.rawTerritories;
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0]!;

    if (params.anchorStarIds.length > 0) {
        let matchingAnchorCount = 0;
        let smallestMatchingAnchor: RawMergedTerritory | null = null;
        for (const territory of candidates) {
            let hasAllAnchors = true;
            for (const starId of params.anchorStarIds) {
                if (!territory.starIds.includes(starId)) {
                    hasAllAnchors = false;
                    break;
                }
            }
            if (!hasAllAnchors) continue;
            matchingAnchorCount += 1;
            if (
                !smallestMatchingAnchor ||
                territory.starIds.length < smallestMatchingAnchor.starIds.length
            ) {
                smallestMatchingAnchor = territory;
            }
        }
        if (matchingAnchorCount === 1) return smallestMatchingAnchor!;
        if (matchingAnchorCount > 1) return smallestMatchingAnchor!;
    }

    const centroid = polygonCentroid(params.points);
    const centroidMatch = candidates.find((territory) =>
        pointInPolygon(centroid[0], centroid[1], territory.points),
    );
    if (centroidMatch) return centroidMatch;

    if (params.anchorStarIds.length > 0) {
        let best: RawMergedTerritory | null = null;
        let bestScore = -1;
        for (const territory of candidates) {
            let score = 0;
            for (const starId of params.anchorStarIds) {
                if (territory.starIds.includes(starId)) score += 1;
            }
            if (score > bestScore) {
                best = territory;
                bestScore = score;
            }
        }
        if (best) return best;
    }

    return candidates[0]!;
}

function hydrateResolvedRegions(params: {
    resolvedRegions: ReadonlyArray<TerritoryRegionShape>;
    rawTerritories: ReadonlyArray<RawMergedTerritory>;
    stars: ReadonlyArray<StarState>;
}): TerritoryRegionShape[] {
    const ownerStars = buildOwnerStars(params.stars);
    const rawTerritoriesByOwner = new Map<string, RawMergedTerritory[]>();
    for (const territory of params.rawTerritories) {
        const bucket = rawTerritoriesByOwner.get(territory.ownerId);
        if (bucket) {
            bucket.push(territory);
        } else {
            rawTerritoriesByOwner.set(territory.ownerId, [territory]);
        }
    }
    return params.resolvedRegions.map((region) => {
        const ownedStars = ownerStars.get(region.ownerId) ?? [];
        const regionBounds = computeBounds(region.points);
        const insideAnchorStarIds: string[] = [];
        for (const star of ownedStars) {
            if (
                isPointInBounds(star.x, star.y, regionBounds) &&
                pointInPolygon(star.x, star.y, region.points)
            ) {
                insideAnchorStarIds.push(star.id);
            }
        }
        insideAnchorStarIds.sort();
        const rawMatch = matchRawTerritoryCandidate({
            anchorStarIds: insideAnchorStarIds,
            points: region.points,
            rawTerritories: rawTerritoriesByOwner.get(region.ownerId) ?? [],
        });
        const rawAnchorStarIds: string[] = [];
        const rawContributorIds: string[] = [];
        if (rawMatch) {
            for (const starId of rawMatch.starIds) {
                if (isVirtualSiteId(starId)) {
                    rawContributorIds.push(starId);
                } else {
                    rawAnchorStarIds.push(starId);
                }
            }
            rawAnchorStarIds.sort();
            rawContributorIds.sort();
        }
        const anchorStarIds =
            insideAnchorStarIds.length > 0 ? insideAnchorStarIds : rawAnchorStarIds;
        const starIds =
            rawMatch?.starIds.length
                ? [...rawMatch.starIds].sort()
                : [...anchorStarIds];
        const regionFallbackId = deriveRegionFallbackId(
            region.ownerId,
            region.points,
        );
        return {
            ...region,
            regionId:
                starIds.length > 0
                    ? deriveStableRegionId(region.ownerId, starIds)
                    : regionFallbackId,
            starIds,
            anchorStarIds,
            contributingSiteIds: rawContributorIds,
            points: clonePoints(region.points),
        };
    });
}

function buildShellsFromRegions(
    territoryRegions: ReadonlyArray<TerritoryRegionShape>,
): {
    readonly shells: readonly ResolvedShell[];
    readonly shellLoops: readonly ResolvedShellLoop[];
} {
    const shells: ResolvedShell[] = territoryRegions.map((region) => {
        const area = computePolygonArea(region.points);
        return {
            shellId: `shell:${region.regionId}`,
            ownerId: region.ownerId,
            starIds: region.starIds ? [...region.starIds] : undefined,
            anchorStarIds: region.anchorStarIds
                ? [...region.anchorStarIds]
                : undefined,
            contributingSiteIds: region.contributingSiteIds
                ? [...region.contributingSiteIds]
                : undefined,
            points: clonePoints(region.points),
            area,
            absArea: Math.abs(area),
            confidence: region.confidence,
            holeLoopIds: [],
        };
    });
    const shellLoops: ResolvedShellLoop[] = shells.map((shell) => ({
        shellLoopId: `${shell.shellId}:outer`,
        shellId: shell.shellId,
        ownerId: shell.ownerId,
        starIds: shell.starIds ? [...shell.starIds] : undefined,
        anchorStarIds: shell.anchorStarIds ? [...shell.anchorStarIds] : undefined,
        contributingSiteIds: shell.contributingSiteIds
            ? [...shell.contributingSiteIds]
            : undefined,
        points: clonePoints(shell.points),
        classification: 'outer',
        confidence: shell.confidence,
    }));
    return { shells, shellLoops };
}

export function buildPowerVoronoi0319AuthoritySnapshot(
    params: BuildPowerVoronoi0319AuthoritySnapshotParams,
): ResolvedGeometrySnapshot {
    const rawBoundaryPolylines = measurePerf(
        'territory.geometry0319.authority.rawBoundaries',
        () => ({
            rawFrontierPolylines: params.geometry.sharedPolylines.map(
                (polyline, index) =>
                    adaptSharedPolyline({
                        polyline,
                        index,
                        kind: 'raw_shared',
                    }),
            ),
            rawWorldBorderPolylines: params.geometry.worldBorderPolylines.map(
                (polyline, index) =>
                    adaptSharedPolyline({
                        polyline,
                        index,
                        kind: 'raw_world',
                    }),
            ),
        }),
        {
            shared: params.geometry.sharedPolylines.length,
            world: params.geometry.worldBorderPolylines.length,
        },
    );
    const { rawFrontierPolylines, rawWorldBorderPolylines } =
        rawBoundaryPolylines;
    const rawBoundarySnapshot: ResolvedGeometrySnapshot = {
        version: `${params.geometry.fingerprint}:raw-boundaries`,
        sourceMode: 'unified_vector',
        sourceStyle: params.sourceStyle,
        ownershipVersion: params.ownershipVersion,
        geometryFamily: 'vector-native',
        sourceMethod: 'power_voronoi',
        territoryRegions: [],
        frontierPolylines: rawFrontierPolylines,
        worldBorderPolylines: rawWorldBorderPolylines,
        sharedFrontierMap: buildSharedFrontierMapFromPolylines(rawFrontierPolylines),
        frontierTopology: createFrontierTopologyPlaceholder({
            ownershipVersion: params.ownershipVersion,
            worldWidth: params.worldWidth,
            worldHeight: params.worldHeight,
        }),
        shells: [],
        shellLoops: [],
        provenance: {
            derivedFromField: false,
            notes: ['0319 raw shared/world boundary stage'],
        },
        diagnostics: {
            topologyReliable: true,
            identityReliable: true,
            closureReliable: true,
            notes: ['0319 raw shared/world boundary stage'],
        },
    };

    const resolved = measurePerf(
        'territory.geometry0319.authority.resolveConstraints',
        () =>
            resolveConstraintAlignedTerritoryGeometry({
                geometry: rawBoundarySnapshot,
                stars: params.stars,
                requestedMarginPx: params.requestedMarginPx,
                preferSharedBoundaryResolution: true,
            }),
        {
            stars: params.stars.length,
            rawShared: rawFrontierPolylines.length,
            rawWorld: rawWorldBorderPolylines.length,
        },
    );
    const resolvedRegions = measurePerf(
        'territory.geometry0319.authority.hydrateRegions',
        () =>
            hydrateResolvedRegions({
                resolvedRegions: resolved.territoryRegions,
                rawTerritories: params.geometry.mergedTerritories,
                stars: params.stars,
            }),
        {
            regions: resolved.territoryRegions.length,
            rawTerritories: params.geometry.mergedTerritories.length,
            stars: params.stars.length,
        },
    );
    const resolvedFrontiers = measurePerf(
        'territory.geometry0319.authority.cloneResolvedBoundaries',
        () => resolved.frontierPolylines.map(clonePolyline),
        { frontiers: resolved.frontierPolylines.length },
    );
    const resolvedWorldBorders = measurePerf(
        'territory.geometry0319.authority.cloneResolvedWorldBorders',
        () => resolved.worldBorderPolylines.map(clonePolyline),
        { world: resolved.worldBorderPolylines.length },
    );
    const displayFrontierPolylines = measurePerf(
        'territory.geometry0319.authority.cloneDisplayFrontiers',
        () => resolved.displayFrontierPolylines.map(clonePolyline),
        { frontiers: resolved.displayFrontierPolylines.length },
    );
    const displayWorldBorderPolylines = measurePerf(
        'territory.geometry0319.authority.cloneDisplayWorldBorders',
        () => resolved.displayWorldBorderPolylines.map(clonePolyline),
        { world: resolved.displayWorldBorderPolylines.length },
    );
    const resolvedBoundaryFingerprint = `${params.geometry.fingerprint}:resolved:${resolved.appliedMarginPx.toFixed(2)}`;
    const displayBorderFingerprint = `${resolvedBoundaryFingerprint}:display:${hashString32(
        [
            ...displayFrontierPolylines.map((polyline) => polyline.frontierId),
            ...displayWorldBorderPolylines.map((polyline) => polyline.frontierId),
        ].join('|'),
    )}`;
    const topologyResult = measurePerf(
        'territory.geometry0319.authority.topology',
        () =>
            buildPowerVoronoiFrontierTopology({
                sharedPolylines: resolvedFrontiers.map(toSharedPolyline),
                worldBorderPolylines: resolvedWorldBorders.map(toSharedPolyline),
                ownershipVersion: params.ownershipVersion,
                worldWidth: params.worldWidth,
                worldHeight: params.worldHeight,
                fingerprint: resolvedBoundaryFingerprint,
            }),
        {
            frontiers: resolvedFrontiers.length,
            world: resolvedWorldBorders.length,
        },
    );
    const { shells, shellLoops } = measurePerf(
        'territory.geometry0319.authority.shells',
        () => buildShellsFromRegions(resolvedRegions),
        { regions: resolvedRegions.length },
    );

    const snapshot: ResolvedGeometrySnapshot = {
        version: `${resolvedBoundaryFingerprint}:pfield`,
        sourceMode: 'unified_vector',
        sourceStyle: params.sourceStyle,
        ownershipVersion: params.ownershipVersion,
        geometryFamily: 'vector-native',
        sourceMethod: 'power_voronoi',
        territoryRegions: resolvedRegions,
        frontierPolylines: resolvedFrontiers,
        worldBorderPolylines: resolvedWorldBorders,
        sharedFrontierMap: buildSharedFrontierMapFromPolylines(resolvedFrontiers),
        frontierTopology: topologyResult.topology,
        shells,
        shellLoops,
        provenance: {
            derivedFromField: false,
            notes: [
                '0319 live geometry authority: raw shared/world boundaries resolved once into a shared-boundary seam.',
                'Owner-local merged territories remain diagnostic-only and are not treated as live render truth.',
                ...topologyResult.notes,
            ],
        },
        diagnostics: {
            topologyReliable: topologyResult.topologyReliable,
            identityReliable: true,
            closureReliable: topologyResult.topologyReliable,
            stageLadder: {
                authoritativeSeamFingerprint: resolvedBoundaryFingerprint,
                displayBorderFingerprint,
                appliedMarginPx: resolved.appliedMarginPx,
                rawSharedFrontiers: rawFrontierPolylines,
                rawWorldBorders: rawWorldBorderPolylines,
                resolvedSharedBoundaryFrontiers: resolvedFrontiers,
                resolvedWorldBorders,
                resolvedRegions,
                displayFrontierPolylines,
                displayWorldBorderPolylines,
                notes: [
                    'raw_* stages are upstream 0319 outputs before shared-boundary authority resolution',
                    'resolved_* stages are the authoritative live seam used by 0319 consumers',
                    'display_* stages are derived border chains and are not separate ownership truth',
                ],
            },
            notes: [
                'Power-Voronoi 0319 live consumers use one resolved shared-boundary authority seam.',
                'Diagnostics stages expose raw, resolved, and display geometry without changing the live seam.',
                ...topologyResult.notes,
            ],
        },
    };

    const resolvedGeometryOracle = validateResolvedGeometrySnapshotInvariants(
        snapshot,
        { stars: params.stars },
    );

    return {
        ...snapshot,
        diagnostics: {
            ...snapshot.diagnostics,
            resolvedGeometryOracle,
            notes: [
                ...snapshot.diagnostics.notes,
                ...(resolvedGeometryOracle.ok
                    ? ['resolvedGeometryOracle: ok']
                    : resolvedGeometryOracle.failures.map(
                          (failure) => `resolvedGeometryOracle: ${failure}`,
                      )),
            ],
        },
    };
}
