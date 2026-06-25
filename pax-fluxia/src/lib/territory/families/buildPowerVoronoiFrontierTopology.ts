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
    type PolylineInfo,
} from '../compiler/chainWalkCore';
import { validateFrontierTopologyInvariants } from '../geometry/frontierTopologyOracle';

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

function pointKey(point: readonly [number, number]): string {
    return `${+point[0].toFixed(2)},${+point[1].toFixed(2)}`;
}

function pointsKey(points: ReadonlyArray<[number, number]>): string {
    return points.map(pointKey).join(';');
}

function canonicalPointsKey(points: ReadonlyArray<[number, number]>): string {
    const forward = pointsKey(points);
    const reverse = pointsKey([...points].reverse());
    return forward <= reverse ? forward : reverse;
}

function canonicalPolylineSortKey(info: PolylineInfo): string {
    return [
        info.ownerPairKey,
        canonicalPointsKey(info.points),
        info.startKey < info.endKey ? info.startKey : info.endKey,
        info.startKey < info.endKey ? info.endKey : info.startKey,
    ].join('|');
}

function assignCanonicalSectionIds(
    polylineInfos: ReadonlyArray<PolylineInfo>,
): {
    readonly sectionIdByPolylineIdx: ReadonlyMap<number, string>;
    readonly duplicateSectionIdCount: number;
} {
    const buckets = new Map<string, PolylineInfo[]>();
    for (const info of polylineInfos) {
        if (info.points.length < 2) continue;
        const baseId = makeSectionId(info.ownerPairKey, info.startKey, info.endKey);
        const bucket = buckets.get(baseId);
        if (bucket) {
            bucket.push(info);
        } else {
            buckets.set(baseId, [info]);
        }
    }

    const sectionIdByPolylineIdx = new Map<number, string>();
    let duplicateSectionIdCount = 0;
    for (const baseId of [...buckets.keys()].sort()) {
        const infos = buckets.get(baseId)!.slice().sort((a, b) => {
            const keyCompare = canonicalPolylineSortKey(a).localeCompare(
                canonicalPolylineSortKey(b),
            );
            return keyCompare || a.globalIdx - b.globalIdx;
        });
        duplicateSectionIdCount += Math.max(0, infos.length - 1);
        infos.forEach((info, index) => {
            sectionIdByPolylineIdx.set(
                info.globalIdx,
                index === 0 ? baseId : `${baseId}#${index + 1}`,
            );
        });
    }

    return { sectionIdByPolylineIdx, duplicateSectionIdCount };
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

function sortIndexMap(map: ReadonlyMap<string, readonly string[]>): Map<string, string[]> {
    return new Map(
        [...map.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => [key, [...value].sort()]),
    );
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

function sectionRefKey(ref: SectionRef): string {
    return `${ref.sectionId}:${ref.direction}`;
}

function rotatedSectionRefKey(
    refs: ReadonlyArray<SectionRef>,
    startIndex: number,
): string {
    const keys: string[] = [];
    for (let offset = 0; offset < refs.length; offset++) {
        keys.push(sectionRefKey(refs[(startIndex + offset) % refs.length]!));
    }
    return keys.join('|');
}

function rotateClosedSectionRefsToCanonicalStart(
    refs: ReadonlyArray<SectionRef>,
): SectionRef[] {
    if (refs.length <= 1) return [...refs];

    let bestIndex = 0;
    let bestKey = rotatedSectionRefKey(refs, 0);
    for (let index = 1; index < refs.length; index++) {
        const key = rotatedSectionRefKey(refs, index);
        if (key < bestKey) {
            bestIndex = index;
            bestKey = key;
        }
    }

    const rotated: SectionRef[] = [];
    for (let offset = 0; offset < refs.length; offset++) {
        rotated.push(refs[(bestIndex + offset) % refs.length]!);
    }
    return rotated;
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
    const sectionRecords: FrontierSection[] = [];
    const { sectionIdByPolylineIdx, duplicateSectionIdCount } =
        assignCanonicalSectionIds(walk.polylineInfos);

    for (const info of walk.polylineInfos) {
        if (info.points.length < 2) continue;
        const kind: FrontierSectionKind =
            info.ownerB === WORLD_OWNER ? 'world_border' : 'owner_border';
        const sectionId = sectionIdByPolylineIdx.get(info.globalIdx);
        if (!sectionId) continue;
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
        sectionRecords.push(section);
        sectionByPolylineIdx.set(info.globalIdx, section);
    }

    sectionRecords
        .sort((a, b) => a.id.localeCompare(b.id))
        .forEach((section) => sections.set(section.id, section));

    if (duplicateSectionIdCount > 0) {
        notes.push(`section-id collisions disambiguated: ${duplicateSectionIdCount}`);
    }

    const vertices = new Map<string, FrontierVertex>();
    const vertexRecords: [string, FrontierVertex][] = [];
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
        vertexRecords.push([key, {
            id: key,
            kind,
            point,
            incidentSectionIds,
            ownerIds: ownerIdsSorted,
            ...(semanticKey ? { semanticKey } : {}),
        }]);
    }
    vertexRecords
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([key, vertex]) => vertices.set(key, vertex));

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
        const canonicalSectionRefs = walkLoop.closed
            ? rotateClosedSectionRefsToCanonicalStart(sectionRefs)
            : sectionRefs;
        const sectionKey = hashStringList(
            canonicalSectionRefs.map((entry) => entry.sectionId).sort(),
        );
        loops.push({
            id: `loop:${walkLoop.ownerId}:${sectionKey}`,
            ownerId: walkLoop.ownerId,
            componentId: `comp:${walkLoop.ownerId}:${sectionKey}`,
            sectionRefs: canonicalSectionRefs,
            signedArea: signedArea(loopPoints),
        });
    }
    loops.sort((a, b) => {
        const idCompare = a.id.localeCompare(b.id);
        if (idCompare) return idCompare;
        const ownerCompare = a.ownerId.localeCompare(b.ownerId);
        if (ownerCompare) return ownerCompare;
        return a.sectionRefs
            .map(sectionRefKey)
            .join('|')
            .localeCompare(
                b.sectionRefs.map(sectionRefKey).join('|'),
            );
    });

    const unsortedSectionsByOwnerPair = new Map<string, string[]>();
    const unsortedSectionsByVertex = new Map<string, string[]>();
    const unsortedSectionsByOwner = new Map<string, string[]>();

    for (const section of sections.values()) {
        pushInto(unsortedSectionsByOwnerPair, section.ownerPairKey, section.id);
        pushInto(unsortedSectionsByVertex, section.startVertexId, section.id);
        if (section.endVertexId !== section.startVertexId) {
            pushInto(unsortedSectionsByVertex, section.endVertexId, section.id);
        }
        pushInto(unsortedSectionsByOwner, section.leftOwnerId, section.id);
        if (section.rightOwnerId !== section.leftOwnerId) {
            pushInto(unsortedSectionsByOwner, section.rightOwnerId, section.id);
        }
    }
    const sectionsByOwnerPair = sortIndexMap(unsortedSectionsByOwnerPair);
    const sectionsByVertex = sortIndexMap(unsortedSectionsByVertex);
    const sectionsByOwner = sortIndexMap(unsortedSectionsByOwner);

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

    const baselineTopologyReliable =
        sections.size > 0 &&
        vertices.size > 0 &&
        loops.length > 0 &&
        openLoopCount === 0 &&
        duplicateSectionIdCount === 0;

    if (openLoopCount > 0) {
        notes.push(`chain-walk produced ${openLoopCount} open loop(s)`);
    }

    const invariantReport = validateFrontierTopologyInvariants(topology);
    if (!invariantReport.ok) {
        notes.push(
            `frontier topology oracle failed ${invariantReport.failureCount} invariant(s)`,
        );
        for (const failure of invariantReport.failures) {
            notes.push(`frontier topology invariant: ${failure}`);
        }
    }

    const topologyReliable = baselineTopologyReliable && invariantReport.ok;

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
