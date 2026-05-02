import type {
    FrontierSection,
    FrontierSectionKind,
    FrontierTopology,
    FrontierVertex,
    FrontierVertexKind,
    RegionLoop,
    SectionInfluence,
    SectionRef,
} from '../contracts/FrontierTopologyContracts';
import type { SharedPolyline } from '../compiler/powerVoronoiTerritoryGeometryGenerator';
import {
    executeChainWalk,
    type ChainWalkSegment,
} from '../compiler/chainWalkCore';

const WORLD_OWNER = 'world';
const WORLD_CORNER_EPS_PX = 1.5;
const WORLD_EDGE_EPS_PX = 1.5;

function parsePtKey(key: string): [number, number] {
    const comma = key.indexOf(',');
    if (comma < 0) return [0, 0];
    const x = Number.parseFloat(key.slice(0, comma));
    const y = Number.parseFloat(key.slice(comma + 1));
    return [Number.isFinite(x) ? x : 0, Number.isFinite(y) ? y : 0];
}

function polylineLength(points: ReadonlyArray<[number, number]>): number {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
        const dx = points[i]![0] - points[i - 1]![0];
        const dy = points[i]![1] - points[i - 1]![1];
        total += Math.hypot(dx, dy);
    }
    return total;
}

function signedArea(points: ReadonlyArray<[number, number]>): number {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i]!;
        const [bx, by] = points[(i + 1) % points.length]!;
        area += ax * by - bx * ay;
    }
    return area * 0.5;
}

function makeSectionId(ownerPairKey: string, startKey: string, endKey: string): string {
    const [a, b] = startKey < endKey ? [startKey, endKey] : [endKey, startKey];
    return `section:${ownerPairKey}:${a}:${b}`;
}

function classifyVertexKind(
    point: [number, number],
    worldWidth: number,
    worldHeight: number,
): FrontierVertexKind {
    const [x, y] = point;
    const onLeft = Math.abs(x) <= WORLD_EDGE_EPS_PX;
    const onRight = Math.abs(x - worldWidth) <= WORLD_EDGE_EPS_PX;
    const onTop = Math.abs(y) <= WORLD_EDGE_EPS_PX;
    const onBottom = Math.abs(y - worldHeight) <= WORLD_EDGE_EPS_PX;

    const isNearCorner =
        (onLeft && onTop) ||
        (onLeft && onBottom) ||
        (onRight && onTop) ||
        (onRight && onBottom);
    if (isNearCorner) {
        const nearLT = Math.hypot(x, y) <= WORLD_CORNER_EPS_PX;
        const nearLB = Math.hypot(x, y - worldHeight) <= WORLD_CORNER_EPS_PX;
        const nearRT = Math.hypot(x - worldWidth, y) <= WORLD_CORNER_EPS_PX;
        const nearRB = Math.hypot(x - worldWidth, y - worldHeight) <= WORLD_CORNER_EPS_PX;
        if (nearLT || nearLB || nearRT || nearRB) return 'world_corner';
    }
    if (onLeft || onRight || onTop || onBottom) return 'world_intersection';
    return 'junction_3way';
}

function deriveSemanticKey(
    kind: FrontierVertexKind,
    point: [number, number],
    worldWidth: number,
    worldHeight: number,
): string | undefined {
    const [x, y] = point;
    if (kind !== 'world_corner') return undefined;
    if (x <= WORLD_CORNER_EPS_PX && y <= WORLD_CORNER_EPS_PX) {
        return 'world:corner:top-left';
    }
    if (x <= WORLD_CORNER_EPS_PX && y >= worldHeight - WORLD_CORNER_EPS_PX) {
        return 'world:corner:bottom-left';
    }
    if (x >= worldWidth - WORLD_CORNER_EPS_PX && y <= WORLD_CORNER_EPS_PX) {
        return 'world:corner:top-right';
    }
    if (x >= worldWidth - WORLD_CORNER_EPS_PX && y >= worldHeight - WORLD_CORNER_EPS_PX) {
        return 'world:corner:bottom-right';
    }
    return undefined;
}

function makeInfluenceForOwner(ownerId: string): SectionInfluence {
    return {
        ownerId,
        primaryStarId: ownerId,
        primaryScore: 1,
    };
}

function pushInto(map: Map<string, string[]>, key: string, value: string): void {
    const bucket = map.get(key);
    if (bucket) {
        if (!bucket.includes(value)) bucket.push(value);
        return;
    }
    map.set(key, [value]);
}

function hashStringList(items: ReadonlyArray<string>): string {
    let h = 0x811c9dc5 >>> 0;
    const FNV_PRIME = 0x01000193;
    for (const s of items) {
        for (let i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, FNV_PRIME) >>> 0;
        }
        h ^= 0x1f;
        h = Math.imul(h, FNV_PRIME) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
}

function reverseSectionRefs(sectionRefs: ReadonlyArray<SectionRef>): SectionRef[] {
    return [...sectionRefs]
        .reverse()
        .map((ref) => ({
            sectionId: ref.sectionId,
            direction: ref.direction === 'forward' ? 'reverse' : 'forward',
        }));
}

export interface BuildPowerVoronoiFrontierTopologyParams {
    sharedPolylines: ReadonlyArray<SharedPolyline>;
    worldBorderPolylines: ReadonlyArray<SharedPolyline>;
    ownershipVersion: string;
    worldWidth: number;
    worldHeight: number;
    fingerprint: string;
}

export interface BuildPowerVoronoiFrontierTopologyResult {
    topology: FrontierTopology;
    topologyReliable: boolean;
    notes: string[];
}

export function buildPowerVoronoiFrontierTopology(
    params: BuildPowerVoronoiFrontierTopologyParams,
): BuildPowerVoronoiFrontierTopologyResult {
    const { sharedPolylines, worldBorderPolylines, worldWidth, worldHeight } = params;
    const notes: string[] = [];
    const walk = executeChainWalk(
        [...sharedPolylines],
        [...worldBorderPolylines],
    );

    const sectionByPolylineIdx = new Map<number, FrontierSection>();
    const sections = new Map<string, FrontierSection>();
    const sectionIdCollisions: string[] = [];

    for (const info of walk.polylineInfos) {
        if (info.points.length < 2) continue;
        const kind: FrontierSectionKind =
            info.ownerB === WORLD_OWNER ? 'world_border' : 'owner_border';
        const baseId = makeSectionId(info.ownerPairKey, info.startKey, info.endKey);
        const sectionId = sections.has(baseId) ? `${baseId}#${info.globalIdx}` : baseId;
        if (sectionId !== baseId) {
            sectionIdCollisions.push(`${baseId} -> ${sectionId}`);
        }
        const section: FrontierSection = {
            id: sectionId,
            kind,
            startVertexId: info.startKey,
            endVertexId: info.endKey,
            leftOwnerId: info.ownerA,
            rightOwnerId: info.ownerB,
            points: info.points,
            length: polylineLength(info.points),
            ownerPairKey: info.ownerPairKey,
            leftInfluence: makeInfluenceForOwner(info.ownerA),
            rightInfluence: makeInfluenceForOwner(
                info.ownerB === WORLD_OWNER ? WORLD_OWNER : info.ownerB,
            ),
        };
        sections.set(sectionId, section);
        sectionByPolylineIdx.set(info.globalIdx, section);
    }

    if (sectionIdCollisions.length > 0) {
        notes.push(`section-id collisions disambiguated: ${sectionIdCollisions.length}`);
    }

    const vertices = new Map<string, FrontierVertex>();
    for (const [key, entries] of walk.junctionMap.entries()) {
        const point = parsePtKey(key);
        const incidentSectionIds: string[] = [];
        const ownerIds = new Set<string>();
        for (const entry of entries) {
            const section = sectionByPolylineIdx.get(entry.plIdx);
            if (!section) continue;
            if (!incidentSectionIds.includes(section.id)) {
                incidentSectionIds.push(section.id);
            }
            ownerIds.add(section.leftOwnerId);
            ownerIds.add(section.rightOwnerId);
        }
        incidentSectionIds.sort();
        const ownerIdsSorted = [...ownerIds].sort();
        const kind = classifyVertexKind(point, worldWidth, worldHeight);
        const semanticKey = deriveSemanticKey(kind, point, worldWidth, worldHeight);
        vertices.set(key, {
            id: key,
            kind,
            point,
            incidentSectionIds,
            ownerIds: ownerIdsSorted,
            ...(semanticKey ? { semanticKey } : {}),
        });
    }

    const loops: RegionLoop[] = [];
    let openLoopCount = 0;
    for (const walkLoop of walk.loops) {
        const sectionRefs: SectionRef[] = [];
        const loopPoints: [number, number][] = [];
        for (let i = 0; i < walkLoop.segments.length; i++) {
            const segment: ChainWalkSegment = walkLoop.segments[i]!;
            const section = sectionByPolylineIdx.get(segment.polylineIdx);
            if (!section) continue;
            sectionRefs.push({
                sectionId: section.id,
                direction: segment.direction,
            });
            if (i === 0) {
                loopPoints.push(...segment.points);
            } else {
                loopPoints.push(...segment.points.slice(1));
            }
        }
        if (sectionRefs.length === 0) continue;
        if (!walkLoop.closed) openLoopCount += 1;
        const sectionKey = hashStringList(
            sectionRefs.map((entry) => entry.sectionId).sort(),
        );
        const rawSignedArea = signedArea(loopPoints);
        // Chain-walk segment order is deterministic but not guaranteed to emit outer
        // loops with the same winding every frame; normalize here so downstream
        // perimeter sampling never drops a valid owner loop on sign alone.
        const normalizedSectionRefs =
            rawSignedArea < 0 ? reverseSectionRefs(sectionRefs) : sectionRefs;
        loops.push({
            id: `loop:${walkLoop.ownerId}:${sectionKey}`,
            ownerId: walkLoop.ownerId,
            componentId: `comp:${walkLoop.ownerId}:${sectionKey}`,
            sectionRefs: normalizedSectionRefs,
            signedArea: Math.abs(rawSignedArea),
        });
    }

    const sectionsByOwnerPair = new Map<string, string[]>();
    const sectionsByVertex = new Map<string, string[]>();
    const sectionsByOwner = new Map<string, string[]>();

    for (const section of sections.values()) {
        pushInto(sectionsByOwnerPair, section.ownerPairKey, section.id);
        pushInto(sectionsByVertex, section.startVertexId, section.id);
        if (section.endVertexId !== section.startVertexId) {
            pushInto(sectionsByVertex, section.endVertexId, section.id);
        }
        pushInto(sectionsByOwner, section.leftOwnerId, section.id);
        if (section.rightOwnerId !== section.leftOwnerId) {
            pushInto(sectionsByOwner, section.rightOwnerId, section.id);
        }
    }

    const topology: FrontierTopology = {
        version: `${params.fingerprint}:pfield-topology`,
        ownershipVersion: params.ownershipVersion,
        worldBounds: {
            width: worldWidth,
            height: worldHeight,
        },
        vertices,
        sections,
        loops,
        sectionsByOwnerPair,
        sectionsByVertex,
        sectionsByOwner,
    };

    const topologyReliable =
        sections.size > 0 &&
        vertices.size > 0 &&
        loops.length > 0 &&
        openLoopCount === 0 &&
        sectionIdCollisions.length === 0;

    if (openLoopCount > 0) {
        notes.push(`chain-walk produced ${openLoopCount} open loop(s)`);
    }

    return { topology, topologyReliable, notes };
}

export function flattenRegionLoopPoints(
    loop: RegionLoop,
    sections: ReadonlyMap<string, FrontierSection>,
): [number, number][] {
    const points: [number, number][] = [];
    for (let i = 0; i < loop.sectionRefs.length; i++) {
        const ref = loop.sectionRefs[i]!;
        const section = sections.get(ref.sectionId);
        if (!section) continue;
        const segmentPoints =
            ref.direction === 'forward' ? section.points : [...section.points].reverse();
        if (i === 0) {
            points.push(...segmentPoints);
        } else {
            points.push(...segmentPoints.slice(1));
        }
    }
    return points;
}
