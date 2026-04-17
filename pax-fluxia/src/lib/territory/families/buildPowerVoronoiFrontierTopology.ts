/**
 * @file buildPowerVoronoiFrontierTopology.ts
 * Synthesize a FrontierTopology from Power-Voronoi generator outputs.
 *
 * Why this exists:
 *   The perimeter-field rendering family runs on Power-Voronoi (Geometry_0319)
 *   geometry, but the geometry adapter historically emitted an EMPTY
 *   FrontierTopology. Phase 3–7 of the perimeter_field transition plan require
 *   a populated topology (stable vertex/section IDs, region loops, indexes)
 *   because:
 *     - V sampling needs section polylines with canonical orientation.
 *     - Changed-front detection is a set-diff on section.id.
 *     - Span extraction needs arclength-in-loop (→ region loops).
 *     - Motion-path crossing tests walk non-changed section polylines.
 *
 * This builder re-runs executeChainWalk() on the generator outputs and
 * translates its result into the canonical FrontierTopology contract. It is
 * deterministic: identical (sharedPolylines, worldBorderPolylines) always
 * produce identical vertex/section IDs, loop membership, and orientation.
 *
 * Layer: Geometry (compiler-adjacent, no PIXI)
 */

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
import type {
    SharedPolyline,
} from '../compiler/powerVoronoiTerritoryGeometryGenerator';
import { ptKey } from '../compiler/powerVoronoiTerritoryGeometryGenerator';
import {
    executeChainWalk,
    type ChainWalkLoop,
    type ChainWalkSegment,
} from '../compiler/chainWalkCore';

const WORLD_OWNER = 'world';
const WORLD_CORNER_EPS_PX = 1.5;
const WORLD_EDGE_EPS_PX = 1.5;

/** Decode a ptKey back into numeric coordinates (keys are "x,y" with 2dp). */
function parsePtKey(key: string): [number, number] {
    const comma = key.indexOf(',');
    if (comma < 0) return [0, 0];
    const x = Number.parseFloat(key.slice(0, comma));
    const y = Number.parseFloat(key.slice(comma + 1));
    return [Number.isFinite(x) ? x : 0, Number.isFinite(y) ? y : 0];
}

/** Compute total arc length of a polyline. */
function polylineLength(points: ReadonlyArray<[number, number]>): number {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
        const dx = points[i]![0] - points[i - 1]![0];
        const dy = points[i]![1] - points[i - 1]![1];
        total += Math.hypot(dx, dy);
    }
    return total;
}

/** Signed area (shoelace) of a (closed) polyline. */
function signedArea(points: ReadonlyArray<[number, number]>): number {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i]!;
        const [bx, by] = points[(i + 1) % points.length]!;
        area += ax * by - bx * ay;
    }
    return area * 0.5;
}

/**
 * Stable section ID from ownerPairKey + vertex endpoints.
 * Endpoint order is canonicalised by sorting so reversed traversals produce
 * the same section ID. Two sections with the same endpoints AND same owner
 * pair are considered identical — which is the desired invariant because the
 * generator does not emit parallel duplicates.
 */
function makeSectionId(ownerPairKey: string, startKey: string, endKey: string): string {
    const [a, b] = startKey < endKey ? [startKey, endKey] : [endKey, startKey];
    return `section:${ownerPairKey}:${a}:${b}`;
}

/**
 * Classify a vertex kind from its coordinates and incident count.
 * 'world_corner' and 'world_intersection' take priority because they are
 * semantically load-bearing for world-border transitions.
 */
function classifyVertexKind(
    point: [number, number],
    incidentCount: number,
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
        // Require tighter tolerance for actual corners to avoid mislabeling
        const nearLT = Math.hypot(x, y) <= WORLD_CORNER_EPS_PX;
        const nearLB = Math.hypot(x, y - worldHeight) <= WORLD_CORNER_EPS_PX;
        const nearRT = Math.hypot(x - worldWidth, y) <= WORLD_CORNER_EPS_PX;
        const nearRB = Math.hypot(x - worldWidth, y - worldHeight) <= WORLD_CORNER_EPS_PX;
        if (nearLT || nearLB || nearRT || nearRB) return 'world_corner';
    }
    if (onLeft || onRight || onTop || onBottom) return 'world_intersection';
    return incidentCount >= 3 ? 'junction_3way' : 'junction_3way';
}

/**
 * Derive a semantic key for stable cross-frame matching of world-boundary
 * vertices. World corners get a fixed key; edge intersections get a key of
 * the form "world:edge:<side>:<axis-coord-bin>" which keeps identity when
 * nearby topology shifts but the intersection stays on the same edge.
 */
function deriveSemanticKey(
    kind: FrontierVertexKind,
    point: [number, number],
    worldWidth: number,
    worldHeight: number,
): string | undefined {
    const [x, y] = point;
    if (kind === 'world_corner') {
        if (x <= WORLD_CORNER_EPS_PX && y <= WORLD_CORNER_EPS_PX) return 'world:corner:top-left';
        if (x <= WORLD_CORNER_EPS_PX && y >= worldHeight - WORLD_CORNER_EPS_PX) return 'world:corner:bottom-left';
        if (x >= worldWidth - WORLD_CORNER_EPS_PX && y <= WORLD_CORNER_EPS_PX) return 'world:corner:top-right';
        if (x >= worldWidth - WORLD_CORNER_EPS_PX && y >= worldHeight - WORLD_CORNER_EPS_PX) return 'world:corner:bottom-right';
    }
    return undefined;
}

/**
 * Build placeholder influence records for a section. Real star attribution
 * requires the generator to propagate constituent sites — a future step.
 * For now the primary influence is the owner itself with unit score.
 */
function makeInfluenceForOwner(ownerId: string): SectionInfluence {
    return {
        ownerId,
        primaryStarId: ownerId,
        primaryScore: 1,
    };
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
    /** True when every owner loop closed in the chain walk. */
    topologyReliable: boolean;
    /** Diagnostic notes emitted for snapshot provenance. */
    notes: string[];
}

/**
 * Convert Power-Voronoi outputs into a canonical FrontierTopology.
 *
 * Determinism invariants:
 *   - Vertex IDs are ptKey-based (2dp) and do not depend on enumeration order.
 *   - Section IDs are (ownerPairKey, sortedEndpoints) — canonical orientation
 *     is stored separately on the section.
 *   - RegionLoop IDs derive from (ownerId, sorted section-ID hash) so two
 *     snapshots with the same underlying loop topology produce the same ID.
 */
export function buildPowerVoronoiFrontierTopology(
    params: BuildPowerVoronoiFrontierTopologyParams,
): BuildPowerVoronoiFrontierTopologyResult {
    const { sharedPolylines, worldBorderPolylines, worldWidth, worldHeight } = params;
    const notes: string[] = [];

    const walk = executeChainWalk(
        [...sharedPolylines],
        [...worldBorderPolylines],
    );

    // ── Build sections from polylineInfos ───────────────────────────────
    //
    // Each polyline is one section. Canonical orientation = the polyline's
    // forward direction (as emitted by the generator). Left/right owner
    // attribution uses the ownerPairKey split: ownerA on left, ownerB on
    // right. For world-border polylines ownerPairKey is "<owner>|world".
    const sectionByPolylineIdx = new Map<number, FrontierSection>();
    const sections = new Map<string, FrontierSection>();
    const sectionIdCollisions: string[] = [];

    for (const info of walk.polylineInfos) {
        if (info.points.length < 2) continue;
        const kind: FrontierSectionKind = info.ownerB === WORLD_OWNER
            ? 'world_border'
            : 'owner_border';
        const sectionId = makeSectionId(info.ownerPairKey, info.startKey, info.endKey);
        if (sections.has(sectionId)) {
            // Extremely rare: same ownerPair + endpoints on two distinct
            // polylines. Disambiguate with the polyline index so downstream
            // consumers see distinct sections.
            const disambiguated = `${sectionId}#${info.globalIdx}`;
            sectionIdCollisions.push(`${sectionId} -> ${disambiguated}`);
            const section: FrontierSection = {
                id: disambiguated,
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
            sections.set(disambiguated, section);
            sectionByPolylineIdx.set(info.globalIdx, section);
            continue;
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
        notes.push(
            `section-id collisions disambiguated: ${sectionIdCollisions.length}`,
        );
    }

    // ── Build vertices from junctionMap ─────────────────────────────────
    //
    // Each ptKey in junctionMap is a FrontierVertex. Incident section IDs
    // come from the polyline → section mapping established above.
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
        const kind = classifyVertexKind(
            point,
            incidentSectionIds.length,
            worldWidth,
            worldHeight,
        );
        const semanticKey = deriveSemanticKey(kind, point, worldWidth, worldHeight);
        const vertex: FrontierVertex = {
            id: key,
            kind,
            point,
            incidentSectionIds,
            ownerIds: [...ownerIds].sort(),
            ...(semanticKey ? { semanticKey } : {}),
        };
        vertices.set(key, vertex);
    }

    // ── Build region loops from chain walk loops ────────────────────────
    //
    // One RegionLoop per ChainWalkLoop. sectionRefs map each walk segment
    // to its section ID + direction. componentId groups disconnected
    // islands of the same owner — derived from the sorted list of section
    // IDs in the loop (deterministic across frames).
    const loops: RegionLoop[] = [];
    let openLoopCount = 0;
    for (const walkLoop of walk.loops) {
        const refs: SectionRef[] = [];
        const loopPoints: [number, number][] = [];
        for (let i = 0; i < walkLoop.segments.length; i++) {
            const seg: ChainWalkSegment = walkLoop.segments[i]!;
            const section = sectionByPolylineIdx.get(seg.polylineIdx);
            if (!section) continue;
            refs.push({ sectionId: section.id, direction: seg.direction });
            const pts = seg.points;
            if (i === 0) {
                for (const p of pts) loopPoints.push(p);
            } else {
                for (let j = 1; j < pts.length; j++) loopPoints.push(pts[j]!);
            }
        }
        if (refs.length === 0) continue;
        if (!walkLoop.closed) openLoopCount++;
        const componentHash = hashStringList(
            refs.map((r) => r.sectionId).sort(),
        );
        const componentId = `comp:${walkLoop.ownerId}:${componentHash}`;
        const loopId = `loop:${walkLoop.ownerId}:${componentHash}`;
        loops.push({
            id: loopId,
            ownerId: walkLoop.ownerId,
            componentId,
            sectionRefs: refs,
            signedArea: signedArea(loopPoints),
        });
    }

    // ── Indexes ─────────────────────────────────────────────────────────
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

    // Freeze to readonly string[] for contract compliance (ReadonlyMap<string, readonly string[]>)
    const sectionsByOwnerPairRO: Map<string, readonly string[]> = new Map();
    for (const [k, v] of sectionsByOwnerPair) sectionsByOwnerPairRO.set(k, v);
    const sectionsByVertexRO: Map<string, readonly string[]> = new Map();
    for (const [k, v] of sectionsByVertex) sectionsByVertexRO.set(k, v);
    const sectionsByOwnerRO: Map<string, readonly string[]> = new Map();
    for (const [k, v] of sectionsByOwner) sectionsByOwnerRO.set(k, v);

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
        sectionsByOwnerPair: sectionsByOwnerPairRO,
        sectionsByVertex: sectionsByVertexRO,
        sectionsByOwner: sectionsByOwnerRO,
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

function pushInto(map: Map<string, string[]>, key: string, value: string): void {
    const bucket = map.get(key);
    if (bucket) {
        if (!bucket.includes(value)) bucket.push(value);
    } else {
        map.set(key, [value]);
    }
}

/** Simple deterministic hash for an array of strings — used for loop ids. */
function hashStringList(items: ReadonlyArray<string>): string {
    // FNV-1a 32-bit over the concatenation with a separator.
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

/**
 * Chain segments to reconstruct the full loop point array. Mirrors
 * flattenLoopPoints from chainWalkCore but works from section refs so the
 * topology-level representation is self-contained.
 *
 * Exported because Phase 3 (V sampling) and Phase 6 (remesh) both need to
 * traverse loops in canonical order and accumulate arclength.
 */
export function flattenRegionLoopPoints(
    loop: RegionLoop,
    sections: ReadonlyMap<string, FrontierSection>,
): [number, number][] {
    const chain: [number, number][] = [];
    for (let i = 0; i < loop.sectionRefs.length; i++) {
        const ref = loop.sectionRefs[i]!;
        const section = sections.get(ref.sectionId);
        if (!section) continue;
        const pts = ref.direction === 'forward'
            ? section.points
            : [...section.points].reverse();
        if (i === 0) {
            for (const p of pts) chain.push(p);
        } else {
            for (let j = 1; j < pts.length; j++) chain.push(pts[j]!);
        }
    }
    return chain;
}
