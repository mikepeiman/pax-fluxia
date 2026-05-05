// ── Compact snapshot export for debug downloads ─────────────────────────────
// Full GeometrySnapshot / FrontierTopology JSON can be 5MB+. These helpers
// preserve identity + structure while downsampling dense polylines for review.

import type { GeometrySnapshot } from '../contracts/GeometryContracts';
import type { FrontierTopology } from '../contracts/FrontierTopologyContracts';
import type { OwnershipSnapshot } from '../contracts/OwnershipContracts';
import type { TerritoryFrameInput } from '../contracts/TerritoryFrameInput';
import type { TransitionSnapshot } from '../contracts/TransitionContracts';

/** Max points retained per polyline after downsampling (endpoints always kept). */
export const DEFAULT_EXPORT_MAX_POINTS_PER_POLYLINE = 36;

export function boundsOf(points: readonly [number, number][]): {
    minX: number; minY: number; maxX: number; maxY: number;
} {
    if (points.length === 0) {
        return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }
    let minX = points[0][0], maxX = points[0][0], minY = points[0][1], maxY = points[0][1];
    for (let i = 1; i < points.length; i++) {
        const [x, y] = points[i];
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    return { minX, minY, maxX, maxY };
}

/**
 * Uniform index sampling: keeps first, last, and evenly spaced interior points.
 */
export function downsamplePoints(
    points: readonly [number, number][],
    maxPoints: number,
): [number, number][] {
    if (points.length <= maxPoints || maxPoints < 2) return [...points];
    const out: [number, number][] = [];
    const last = points.length - 1;
    out.push(points[0]);
    const interiorSlots = maxPoints - 2;
    for (let k = 1; k <= interiorSlots; k++) {
        const t = k / (interiorSlots + 1);
        const idx = Math.round(t * last);
        const clamped = Math.max(1, Math.min(last - 1, idx));
        out.push(points[clamped]);
    }
    out.push(points[last]);
    // Dedupe consecutive duplicates
    const dedup: [number, number][] = [out[0]];
    for (let i = 1; i < out.length; i++) {
        const a = dedup[dedup.length - 1], b = out[i];
        if (a[0] !== b[0] || a[1] !== b[1]) dedup.push(b);
    }
    return dedup;
}

export function compactFrontierTopologyForExport(
    topo: FrontierTopology | null | undefined,
    maxPointsPerSection = DEFAULT_EXPORT_MAX_POINTS_PER_POLYLINE,
): unknown {
    if (!topo) return null;
    return {
        version: topo.version,
        ownershipVersion: topo.ownershipVersion,
        worldBounds: topo.worldBounds,
        vertexCount: topo.vertices.size,
        sectionCount: topo.sections.size,
        loopCount: topo.loops.length,
        vertices: [...topo.vertices.values()],
        sections: [...topo.sections.values()].map(s => ({
            id: s.id,
            kind: s.kind,
            startVertexId: s.startVertexId,
            endVertexId: s.endVertexId,
            leftOwnerId: s.leftOwnerId,
            rightOwnerId: s.rightOwnerId,
            ownerPairKey: s.ownerPairKey,
            length: s.length,
            pointCount: s.points.length,
            bounds: boundsOf(s.points),
            pointsSampled: downsamplePoints(s.points, maxPointsPerSection),
            leftInfluence: s.leftInfluence,
            rightInfluence: s.rightInfluence,
        })),
        loops: topo.loops.map(l => ({
            id: l.id,
            ownerId: l.ownerId,
            componentId: l.componentId,
            sectionRefs: l.sectionRefs,
            signedArea: l.signedArea,
        })),
        sectionsByOwnerPairCount: topo.sectionsByOwnerPair.size,
    };
}

/** Compact geometry for JSON export — omits full shell/shellLoop point arrays. */
export function compactGeometrySnapshotForExport(geo: GeometrySnapshot | null | undefined): unknown {
    if (!geo) return null;
    return {
        version: geo.version,
        sourceMode: geo.sourceMode,
        sourceStyle: geo.sourceStyle,
        ownershipVersion: geo.ownershipVersion,
        geometryFamily: geo.geometryFamily,
        sourceMethod: geo.sourceMethod,
        territoryRegions: geo.territoryRegions.map(r => ({
            regionId: r.regionId,
            ownerId: r.ownerId,
            starIds: r.starIds ?? [],
            confidence: r.confidence,
            pointCount: r.points.length,
            bounds: boundsOf(r.points),
            pointsSampled: downsamplePoints(r.points, DEFAULT_EXPORT_MAX_POINTS_PER_POLYLINE),
        })),
        frontierPolylines: geo.frontierPolylines.map(f => ({
            frontierId: f.frontierId,
            ownerPairKey: f.ownerPairKey,
            ownerA: f.ownerA,
            ownerB: f.ownerB,
            confidence: f.confidence,
            closed: f.closed,
            pointCount: f.points.length,
            bounds: boundsOf(f.points),
            pointsSampled: downsamplePoints(f.points, DEFAULT_EXPORT_MAX_POINTS_PER_POLYLINE),
        })),
        worldBorderPolylines: geo.worldBorderPolylines.map(f => ({
            frontierId: f.frontierId,
            ownerPairKey: f.ownerPairKey,
            pointCount: f.points.length,
            bounds: boundsOf(f.points),
            pointsSampled: downsamplePoints(f.points, DEFAULT_EXPORT_MAX_POINTS_PER_POLYLINE),
        })),
        sharedFrontierMapKeys: [...geo.sharedFrontierMap.keys()],
        sharedFrontierMapSummary: [...geo.sharedFrontierMap.entries()].map(([k, segs]) => ({
            ownerPairKey: k,
            segmentCount: segs.length,
        })),
        frontierTopology: compactFrontierTopologyForExport(geo.frontierTopology),
        shells: geo.shells.map(s => ({
            shellId: s.shellId,
            ownerId: s.ownerId,
            starIds: s.starIds ?? [],
            area: s.area,
            absArea: s.absArea,
            confidence: s.confidence,
            pointCount: s.points.length,
            bounds: boundsOf(s.points),
            pointsSampled: downsamplePoints(s.points, 24),
            holeLoopIds: s.holeLoopIds,
        })),
        shellLoops: geo.shellLoops.map(l => ({
            shellLoopId: l.shellLoopId,
            shellId: l.shellId,
            ownerId: l.ownerId,
            starIds: l.starIds ?? [],
            classification: l.classification,
            confidence: l.confidence,
            pointCount: l.points.length,
            bounds: boundsOf(l.points),
            pointsSampled: downsamplePoints(l.points, 24),
        })),
        provenance: geo.provenance,
        diagnostics: geo.diagnostics,
    };
}

/** `hh:mm:ss---mmm` local time from ISO timestamp string, for human-readable labels. */
export function formatLocalCaptureTimeFromIsoTimestamp(iso: string): string {
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${hh}:${mm}:${ss}---${ms}`;
}

function sortPrimitiveArray<T extends string | number | boolean>(
    values: readonly T[],
): T[] {
    return [...values].sort((a, b) => String(a).localeCompare(String(b)));
}

export function toSerializableExportValue(value: unknown): unknown {
    if (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    ) {
        return value;
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (Array.isArray(value)) {
        return value.map((entry) => toSerializableExportValue(entry));
    }
    if (value instanceof Map) {
        const entries = [...value.entries()].sort(([a], [b]) =>
            String(a).localeCompare(String(b)),
        );
        const allStringKeys = entries.every(([key]) => typeof key === 'string');
        if (allStringKeys) {
            return Object.fromEntries(
                entries.map(([key, entryValue]) => [
                    key,
                    toSerializableExportValue(entryValue),
                ]),
            );
        }
        return entries.map(([key, entryValue]) => ({
            key: toSerializableExportValue(key),
            value: toSerializableExportValue(entryValue),
        }));
    }
    if (value instanceof Set) {
        const entries = [...value.values()].map((entry) =>
            toSerializableExportValue(entry),
        );
        const allPrimitives = entries.every(
            (entry) =>
                typeof entry === 'string' ||
                typeof entry === 'number' ||
                typeof entry === 'boolean',
        );
        return allPrimitives
            ? sortPrimitiveArray(entries as Array<string | number | boolean>)
            : entries;
    }
    if (typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value)
                .filter(([, entryValue]) => entryValue !== undefined)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, entryValue]) => [
                    key,
                    toSerializableExportValue(entryValue),
                ]),
        );
    }
    return String(value);
}

export function serializeFrameInputForExport(
    input: TerritoryFrameInput,
): unknown {
    return toSerializableExportValue(input);
}

export function serializeOwnershipSnapshotForExport(
    snapshot: OwnershipSnapshot | null | undefined,
): unknown {
    if (!snapshot) return null;
    return {
        version: snapshot.version,
        starOwners: Object.fromEntries(
            [...snapshot.starOwners.entries()].sort(([a], [b]) =>
                a.localeCompare(b),
            ),
        ),
        contestedLaneIds: sortPrimitiveArray(snapshot.contestedLaneIds),
        conquestEvents: snapshot.conquestEvents.map((event) => ({
            ...event,
            attackerStarIds: event.attackerStarIds
                ? sortPrimitiveArray(event.attackerStarIds)
                : undefined,
            attackerShipTransfers: event.attackerShipTransfers
                ? [...event.attackerShipTransfers]
                : undefined,
        })),
        virtualStars: [...snapshot.virtualStars]
            .map((virtualStar) => ({
                ...virtualStar,
                pos: { ...virtualStar.pos },
            }))
            .sort((a, b) => a.id.localeCompare(b.id)),
    };
}

export function serializeTransitionSnapshotForExport(
    snapshot: TransitionSnapshot | null | undefined,
): unknown {
    if (!snapshot) return null;
    return toSerializableExportValue(snapshot);
}

export function serializeGeometrySnapshotForExport(
    geometry: GeometrySnapshot | null | undefined,
): unknown {
    if (!geometry) return null;
    return toSerializableExportValue(geometry);
}

export function serializeFrontierTopologyForExport(
    topology: FrontierTopology | null | undefined,
): unknown {
    if (!topology) return null;
    return toSerializableExportValue(topology);
}

/**
 * File-safe local capture time. Windows filenames cannot contain `:`, so use
 * the same human layout with `-` substituted for the separators.
 *
 * Example: `14-30-52---187`
 */
export function filePrefixFromIsoTimestamp(iso: string): string {
    return formatLocalCaptureTimeFromIsoTimestamp(iso).replace(/:/g, '-');
}
