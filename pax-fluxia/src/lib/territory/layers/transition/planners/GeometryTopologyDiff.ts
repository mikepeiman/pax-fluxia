import type { GeometrySnapshot, FrontierPolylineShape, TerritoryRegionShape } from '../../../contracts/GeometryContracts';

// ─── Topology classification ────────────────────────────────────────────────

export type FrontierTopology = 'static' | 'drifted' | 'spawned' | 'vanished';
export type RegionTopology = 'static' | 'drifted' | 'spawned' | 'vanished';

export interface FrontierDiffEntry {
    ownerPairKey: string;
    topology: FrontierTopology;
    /** Previous points (null for spawned) */
    previousPoints: [number, number][] | null;
    /** Next points (null for vanished) */
    nextPoints: [number, number][] | null;
}

export interface RegionDiffEntry {
    ownerId: string;
    topology: RegionTopology;
    /** Previous points (null for spawned) */
    previousPoints: [number, number][] | null;
    /** Next points (null for vanished) */
    nextPoints: [number, number][] | null;
}

export interface GeometryTopologyDiff {
    frontiers: FrontierDiffEntry[];
    regions: RegionDiffEntry[];
    /** Quick stats for diagnostics */
    stats: {
        staticFrontiers: number;
        driftedFrontiers: number;
        spawnedFrontiers: number;
        vanishedFrontiers: number;
        staticRegions: number;
        driftedRegions: number;
        spawnedRegions: number;
        vanishedRegions: number;
    };
}

// ─── Point comparison ───────────────────────────────────────────────────────

/** Squared distance between two points */
function dist2(a: [number, number], b: [number, number]): number {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    return dx * dx + dy * dy;
}

/**
 * Check if two point arrays are "close enough" to be considered static.
 * Uses max-vertex-displacement: if the maximum displacement of any
 * corresponding vertex is below threshold, the shape hasn't meaningfully moved.
 *
 * Returns true if the shapes are effectively identical.
 */
function pointsAreStatic(
    a: readonly [number, number][],
    b: readonly [number, number][],
    thresholdPx: number = 2.0,
): boolean {
    if (a.length !== b.length) return false;
    const threshold2 = thresholdPx * thresholdPx;
    for (let i = 0; i < a.length; i++) {
        if (dist2(a[i], b[i]) > threshold2) return false;
    }
    return true;
}

// ─── Diff computation ───────────────────────────────────────────────────────

function diffPolylines(
    previous: readonly FrontierPolylineShape[],
    next: readonly FrontierPolylineShape[],
): FrontierDiffEntry[] {
    const prevByKey = new Map<string, [number, number][]>();
    for (const p of previous) {
        prevByKey.set(p.ownerPairKey, p.points);
    }

    const result: FrontierDiffEntry[] = [];
    const seenKeys = new Set<string>();

    // Process next frontiers: classify as static, drifted, or spawned
    for (const polyline of next) {
        seenKeys.add(polyline.ownerPairKey);
        const prev = prevByKey.get(polyline.ownerPairKey);

        if (!prev) {
            result.push({
                ownerPairKey: polyline.ownerPairKey,
                topology: 'spawned',
                previousPoints: null,
                nextPoints: polyline.points,
            });
        } else if (pointsAreStatic(prev, polyline.points)) {
            result.push({
                ownerPairKey: polyline.ownerPairKey,
                topology: 'static',
                previousPoints: prev,
                nextPoints: polyline.points,
            });
        } else {
            result.push({
                ownerPairKey: polyline.ownerPairKey,
                topology: 'drifted',
                previousPoints: prev,
                nextPoints: polyline.points,
            });
        }
    }

    // Detect vanished frontiers (in previous but not in next)
    for (const [key, pts] of prevByKey) {
        if (!seenKeys.has(key)) {
            result.push({
                ownerPairKey: key,
                topology: 'vanished',
                previousPoints: pts,
                nextPoints: null,
            });
        }
    }

    return result;
}

function diffRegions(
    previous: readonly TerritoryRegionShape[],
    next: readonly TerritoryRegionShape[],
): RegionDiffEntry[] {
    const prevByOwner = new Map<string, [number, number][]>();
    for (const r of previous) {
        prevByOwner.set(r.ownerId, r.points);
    }

    const result: RegionDiffEntry[] = [];
    const seenOwners = new Set<string>();

    for (const region of next) {
        seenOwners.add(region.ownerId);
        const prev = prevByOwner.get(region.ownerId);

        if (!prev) {
            result.push({
                ownerId: region.ownerId,
                topology: 'spawned',
                previousPoints: null,
                nextPoints: region.points,
            });
        } else if (pointsAreStatic(prev, region.points)) {
            result.push({
                ownerId: region.ownerId,
                topology: 'static',
                previousPoints: prev,
                nextPoints: region.points,
            });
        } else {
            result.push({
                ownerId: region.ownerId,
                topology: 'drifted',
                previousPoints: prev,
                nextPoints: region.points,
            });
        }
    }

    for (const [ownerId, pts] of prevByOwner) {
        if (!seenOwners.has(ownerId)) {
            result.push({
                ownerId,
                topology: 'vanished',
                previousPoints: pts,
                nextPoints: null,
            });
        }
    }

    return result;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function computeGeometryTopologyDiff(
    previous: GeometrySnapshot | null | undefined,
    next: GeometrySnapshot,
): GeometryTopologyDiff {
    if (!previous) {
        // No previous → everything is spawned
        return {
            frontiers: next.frontierPolylines.map(p => ({
                ownerPairKey: p.ownerPairKey,
                topology: 'spawned' as const,
                previousPoints: null,
                nextPoints: p.points,
            })),
            regions: next.territoryRegions.map(r => ({
                ownerId: r.ownerId,
                topology: 'spawned' as const,
                previousPoints: null,
                nextPoints: r.points,
            })),
            stats: {
                staticFrontiers: 0,
                driftedFrontiers: 0,
                spawnedFrontiers: next.frontierPolylines.length,
                vanishedFrontiers: 0,
                staticRegions: 0,
                driftedRegions: 0,
                spawnedRegions: next.territoryRegions.length,
                vanishedRegions: 0,
            },
        };
    }

    const frontiers = diffPolylines(previous.frontierPolylines, next.frontierPolylines);
    const regions = diffRegions(previous.territoryRegions, next.territoryRegions);

    return {
        frontiers,
        regions,
        stats: {
            staticFrontiers: frontiers.filter(f => f.topology === 'static').length,
            driftedFrontiers: frontiers.filter(f => f.topology === 'drifted').length,
            spawnedFrontiers: frontiers.filter(f => f.topology === 'spawned').length,
            vanishedFrontiers: frontiers.filter(f => f.topology === 'vanished').length,
            staticRegions: regions.filter(r => r.topology === 'static').length,
            driftedRegions: regions.filter(r => r.topology === 'drifted').length,
            spawnedRegions: regions.filter(r => r.topology === 'spawned').length,
            vanishedRegions: regions.filter(r => r.topology === 'vanished').length,
        },
    };
}
