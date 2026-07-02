/**
 * buildPowerCoreAuthoritySnapshot — P1b assembly: PowerCore graph output →
 * the full ResolvedGeometrySnapshot contract.
 *
 * Shares Stage 0 (sites + weights + CX/DX virtuals + clip) with the 0319
 * pipeline via buildGeometry0319SitesAndClip, so an A/B comparison between the
 * two sources isolates exactly what PowerCore replaces: the edge/loop ASSEMBLY
 * (shared-edge graph + angular-order DCEL walk instead of greedy chain walks).
 *
 * DESIGN DIFFERENCE vs 0319 (intentional, per the PowerCore plan): min-star-
 * margin (MSR) is expressed ONLY through Stage-0 site weights — there is no
 * post-hoc boundary repair pass (0319 runs applyExplicitMinStarMargin +
 * resolveConstraintAlignedTerritoryGeometry after the diagram). Region identity
 * needs no fuzzy re-matching either: loop membership comes out of the walk.
 */

import type { StarConnection, StarState } from '$lib/types/game.types';
import type { CompileError } from '../../compiler/types';
import {
    buildGeometry0319SitesAndClip,
    resolveDisconnectCellOwner,
} from '../../compiler/Geometry_0319';
import {
    buildTerritoryGeometryFingerprint,
    type PowerSite,
    type SharedPolyline,
    type TerritoryGeneratorSettings,
} from '../../compiler/powerVoronoiTerritoryGeometryGenerator';
import { DISCONNECT_OWNER_ID } from '../../../renderers/territoryFeatures';
import type {
    ResolvedFrontierPolyline,
    ResolvedGeometrySnapshot,
    SharedFrontierMap,
    TerritoryRegionShape,
} from '../../contracts/GeometryContracts';
import { buildPowerVoronoiFrontierTopology } from '../../families/buildPowerVoronoiFrontierTopology';
import { buildShellsFromRegions } from '../buildPowerVoronoi0319AuthoritySnapshot';
import { pointInPolygon } from '../geometryUtils';
import {
    deriveRegionFallbackId,
    deriveStableRegionId,
    isVirtualSiteId,
} from '../regionIdentity';
import { buildPowerCellsFromSites } from './buildPowerCellsFromSites';
import type { Point, PowerCell } from './powerCoreTypes';
import {
    buildSharedEdgeGraph,
    reconstructLoopPolygon,
    walkRegionLoops,
} from './sharedEdgeGraph';
import { smoothSharedEdges } from './smoothSharedEdges';

export interface BuildPowerCoreAuthoritySnapshotParams {
    readonly stars: ReadonlyArray<StarState>;
    readonly connections: ReadonlyArray<StarConnection>;
    readonly config: TerritoryGeneratorSettings;
    readonly ownershipVersion: string;
    readonly sourceStyle: ResolvedGeometrySnapshot['sourceStyle'];
}

// ---------------------------------------------------------------------------
// Deterministic edge → polyline chaining
// ---------------------------------------------------------------------------

/** Endpoint key at the same 1e-3 quantization the shared-edge graph uses. */
function endpointKey(p: Point): string {
    return `${Math.round(p[0] * 1000)},${Math.round(p[1] * 1000)}`;
}

interface ChainableEdge {
    readonly edgeId: string;
    readonly points: readonly Point[]; // smoothed; first/last are junction vertices
}

/**
 * Chain edges that share endpoints into maximal polylines. Deterministic:
 * edges are processed sorted by edgeId; open chains start from degree-1
 * endpoints in sorted key order; leftover closed loops start at the unused
 * edge with the smallest edgeId. Junction endpoints (degree ≥ 3) terminate
 * chains — a polyline never runs through a junction.
 */
function chainEdgesIntoPolylines(edges: readonly ChainableEdge[]): {
    points: [number, number][];
    closed: boolean;
}[] {
    const sorted = [...edges].sort((a, b) =>
        a.edgeId < b.edgeId ? -1 : a.edgeId > b.edgeId ? 1 : 0,
    );
    const incident = new Map<string, number[]>();
    sorted.forEach((edge, index) => {
        const a = endpointKey(edge.points[0]!);
        const b = endpointKey(edge.points[edge.points.length - 1]!);
        (incident.get(a) ?? incident.set(a, []).get(a)!).push(index);
        (incident.get(b) ?? incident.set(b, []).get(b)!).push(index);
    });
    const used = new Array<boolean>(sorted.length).fill(false);
    const results: { points: [number, number][]; closed: boolean }[] = [];

    const takeNextAt = (key: string): number | null => {
        const list = incident.get(key);
        if (!list) return null;
        // Chains stop at junctions: only continue through degree-2 interior
        // vertices (for starts we are called with degree-1 keys explicitly).
        for (const index of list) {
            if (!used[index]) return index;
        }
        return null;
    };

    const walkFrom = (startKey: string, stopAtJunctions: boolean): void => {
        const points: Point[] = [];
        let key = startKey;
        for (;;) {
            const list = incident.get(key) ?? [];
            if (stopAtJunctions && points.length > 0 && list.length !== 2) break;
            const index = takeNextAt(key);
            if (index === null) break;
            used[index] = true;
            const edge = sorted[index]!;
            const forward = endpointKey(edge.points[0]!) === key;
            const seq = forward ? edge.points : [...edge.points].reverse();
            if (points.length === 0) points.push(seq[0]!);
            for (let i = 1; i < seq.length; i++) points.push(seq[i]!);
            key = endpointKey(points[points.length - 1]!);
            if (key === startKey) break; // closed loop
        }
        if (points.length >= 2) {
            const closed =
                endpointKey(points[0]!) === endpointKey(points[points.length - 1]!);
            results.push({
                points: points.map(([x, y]) => [x, y] as [number, number]),
                closed,
            });
        }
    };

    // Degree per endpoint key (over this group only).
    const degree = new Map<string, number>();
    for (const [key, list] of incident) degree.set(key, list.length);

    // 1) Open chains + junction-terminated chains: start at every key whose
    //    degree != 2, in sorted order (junctions spawn one chain per spoke).
    const startKeys = [...degree.entries()]
        .filter(([, d]) => d !== 2)
        .map(([key]) => key)
        .sort();
    for (const key of startKeys) {
        while (takeNextAt(key) !== null) walkFrom(key, true);
    }
    // 2) Remaining edges form pure closed loops; start at smallest edgeId.
    for (let index = 0; index < sorted.length; index++) {
        if (used[index]) continue;
        walkFrom(endpointKey(sorted[index]!.points[0]!), false);
    }
    return results;
}

function buildSharedFrontierMapFromPolylines(
    polylines: ReadonlyArray<ResolvedFrontierPolyline>,
): SharedFrontierMap {
    const grouped = new Map<string, ResolvedFrontierPolyline[]>();
    for (const polyline of polylines) {
        const bucket = grouped.get(polyline.ownerPairKey);
        if (bucket) bucket.push(polyline);
        else grouped.set(polyline.ownerPairKey, [polyline]);
    }
    return grouped;
}

function toSharedPolyline(polyline: ResolvedFrontierPolyline): SharedPolyline {
    return {
        ownerPairKey: polyline.ownerPairKey,
        color: 0,
        points: polyline.points.map(([x, y]) => [x, y] as [number, number]),
    };
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export function buildPowerCoreAuthoritySnapshot(
    params: BuildPowerCoreAuthoritySnapshotParams,
): ResolvedGeometrySnapshot | CompileError {
    const { config } = params;

    // Stage 0 — byte-identical shared inputs with 0319.
    const stage0 = buildGeometry0319SitesAndClip(
        [...params.stars],
        [...params.connections],
        config,
    );
    if ('kind' in stage0) return stage0;
    const { sites, ownedStars, clip } = stage0;

    // Stage 1+2 — power diagram → PowerCell[], with the same disconnect-cell
    // effective-owner resolution 0319 applies.
    const siteById = new Map<string, PowerSite>();
    for (const site of sites) siteById.set(site.starId, site);
    const rawCells = buildPowerCellsFromSites(sites, clip);
    const cells: PowerCell[] = [];
    for (const cell of rawCells) {
        if (cell.ownerId !== DISCONNECT_OWNER_ID) {
            cells.push(cell);
            continue;
        }
        const site = siteById.get(cell.siteId);
        const resolved = site
            ? resolveDisconnectCellOwner(site, ownedStars)
            : null;
        if (!resolved) continue;
        cells.push({ ...cell, ownerId: resolved });
    }

    // Stage 3 — the PowerCore replacement for 0319's edge extraction/chaining:
    // one shared edge per border, smoothed once, loops walked in angular order.
    // World bounds come from the ACTUAL clip ring (0319 pads it), so world-edge
    // classification matches where the diagram was really clipped.
    let clipMinX = Infinity;
    let clipMinY = Infinity;
    let clipMaxX = -Infinity;
    let clipMaxY = -Infinity;
    for (const [x, y] of clip) {
        if (x < clipMinX) clipMinX = x;
        if (y < clipMinY) clipMinY = y;
        if (x > clipMaxX) clipMaxX = x;
        if (y > clipMaxY) clipMaxY = y;
    }
    const graph = buildSharedEdgeGraph(cells, {
        width: config.worldWidth,
        height: config.worldHeight,
        minX: clipMinX,
        minY: clipMinY,
        maxX: clipMaxX,
        maxY: clipMaxY,
    });
    smoothSharedEdges(graph, config.chaikinPasses);
    const loops = walkRegionLoops(graph, cells);

    // Stage 4 — regions with identity carried straight out of the walk.
    const ownerRealStars = new Map<string, StarState[]>();
    for (const star of ownedStars) {
        const bucket = ownerRealStars.get(star.ownerId!);
        if (bucket) bucket.push(star);
        else ownerRealStars.set(star.ownerId!, [star]);
    }
    const territoryRegions: TerritoryRegionShape[] = loops.map((loop) => {
        const points = reconstructLoopPolygon(loop, graph).map(
            ([x, y]) => [x, y] as [number, number],
        );
        const memberIds = [...loop.starIds].sort();
        const anchorStarIds = (ownerRealStars.get(loop.ownerId) ?? [])
            .filter((star) => pointInPolygon(star.x, star.y, points))
            .map((star) => star.id)
            .sort();
        return {
            regionId:
                memberIds.length > 0
                    ? deriveStableRegionId(loop.ownerId, memberIds)
                    : deriveRegionFallbackId(loop.ownerId, points),
            ownerId: loop.ownerId,
            starIds: memberIds,
            anchorStarIds,
            contributingSiteIds: memberIds.filter(isVirtualSiteId),
            points,
            confidence: 1,
        };
    });

    // Stage 5 — frontier polylines chained from the shared-edge graph.
    // Pair-key conventions mirror 0319: inter-owner keys are sorted 'a|b'
    // (SharedEdge.ownerA < ownerB by construction); world keys are
    // '<owner>|world' with ownerB 'world'.
    const edgesByPair = new Map<string, ChainableEdge[]>();
    for (const edge of graph.sharedEdges) {
        const pairKey = `${edge.ownerA}|${edge.ownerB}`;
        const bucket = edgesByPair.get(pairKey);
        const chainable = { edgeId: edge.edgeId, points: edge.smoothedPts };
        if (bucket) bucket.push(chainable);
        else edgesByPair.set(pairKey, [chainable]);
    }
    const frontierPolylines: ResolvedFrontierPolyline[] = [];
    for (const pairKey of [...edgesByPair.keys()].sort()) {
        const [ownerA, ownerB] = pairKey.split('|') as [string, string];
        chainEdgesIntoPolylines(edgesByPair.get(pairKey)!).forEach(
            (chain, index) => {
                frontierPolylines.push({
                    frontierId: `pc_shared:${pairKey}:${index}`,
                    ownerA,
                    ownerB,
                    ownerPairKey: pairKey,
                    points: chain.points,
                    closed: chain.closed,
                    confidence: 1,
                });
            },
        );
    }
    const worldEdgesByOwner = new Map<string, ChainableEdge[]>();
    for (const edge of graph.worldEdges) {
        const bucket = worldEdgesByOwner.get(edge.owner);
        const chainable = { edgeId: edge.edgeId, points: edge.smoothedPts };
        if (bucket) bucket.push(chainable);
        else worldEdgesByOwner.set(edge.owner, [chainable]);
    }
    const worldBorderPolylines: ResolvedFrontierPolyline[] = [];
    for (const owner of [...worldEdgesByOwner.keys()].sort()) {
        const pairKey = `${owner}|world`;
        chainEdgesIntoPolylines(worldEdgesByOwner.get(owner)!).forEach(
            (chain, index) => {
                worldBorderPolylines.push({
                    frontierId: `pc_world:${pairKey}:${index}`,
                    ownerA: owner,
                    ownerB: 'world',
                    ownerPairKey: pairKey,
                    points: chain.points,
                    closed: chain.closed,
                    confidence: 1,
                });
            },
        );
    }

    // Stage 6 — topology, shells, provenance.
    const fingerprint =
        buildTerritoryGeometryFingerprint([...params.stars], config) + ':pcore';
    const topologyResult = buildPowerVoronoiFrontierTopology({
        sharedPolylines: frontierPolylines.map(toSharedPolyline),
        worldBorderPolylines: worldBorderPolylines.map(toSharedPolyline),
        ownershipVersion: params.ownershipVersion,
        worldWidth: config.worldWidth,
        worldHeight: config.worldHeight,
        fingerprint,
    });
    const { shells, shellLoops } = buildShellsFromRegions(territoryRegions);

    return {
        version: `${fingerprint}:powercore`,
        sourceMode: 'unified_vector',
        sourceStyle: params.sourceStyle,
        ownershipVersion: params.ownershipVersion,
        geometryFamily: 'vector-native',
        sourceMethod: 'power_voronoi',
        territoryRegions,
        frontierPolylines,
        worldBorderPolylines,
        sharedFrontierMap: buildSharedFrontierMapFromPolylines(frontierPolylines),
        frontierTopology: topologyResult.topology,
        shells,
        shellLoops,
        provenance: {
            derivedFromField: false,
            smoothPasses: config.chaikinPasses,
            notes: [
                'PowerCore geometry authority: shared-edge graph + angular-order loop walk (single source for fills and borders).',
                'Stage 0 (sites, MSR weights, CX/DX virtuals, clip) is shared byte-identically with power_voronoi_0319.',
                'MSR is expressed via Stage-0 weights only — no post-hoc boundary repair pass (intentional difference vs 0319).',
                ...topologyResult.notes,
            ],
        },
        diagnostics: {
            topologyReliable: topologyResult.topologyReliable,
            identityReliable: true,
            closureReliable: true,
            notes: [
                'Region membership comes from the loop walk (no fuzzy region re-matching).',
                'Known Phase-1 limit: enclave (hole) loops are not yet classified — enclave-producing maps are out of scope until the hole pass lands.',
            ],
        },
    };
}
