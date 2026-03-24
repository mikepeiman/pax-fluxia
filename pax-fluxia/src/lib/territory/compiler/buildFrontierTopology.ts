// ---------------------------------------------------------------------------
// buildFrontierTopology.ts — Convert TerritoryFrontierMap → FrontierTopology
// ---------------------------------------------------------------------------
// Produces the FrontierTopology type from the already-computed TMAP data.
// This is a THIN conversion — the heavy lifting is done by buildFrontierMap.
//
// Layer: Geometry (compiler output)
// No PIXI imports. No rendering. Pure data conversion.
// ---------------------------------------------------------------------------

import type { TerritoryFrontierMap, CanonicalVertex, CanonicalEdge, CanonicalLoop } from './canonicalTypes';
import type {
    FrontierTopology,
    FrontierVertex,
    FrontierVertexKind,
    FrontierSection,
    FrontierSectionKind,
    RegionLoop,
    SectionRef,
    SectionInfluence,
} from '../contracts/FrontierTopologyContracts';

// ---------------------------------------------------------------------------
// Vertex kind mapping: CanonicalVertexKind → FrontierVertexKind
// ---------------------------------------------------------------------------

function mapVertexKind(kind: string): FrontierVertexKind {
    switch (kind) {
        case 'junction-3way': return 'junction_3way';
        case 'frontier-mapedge': return 'world_intersection';
        case 'loop-closure': return 'world_corner'; // closure vertices are typically corners
        case 'endpoint': return 'world_intersection'; // fallback
        default: return 'world_intersection';
    }
}

// ---------------------------------------------------------------------------
// Section kind mapping
// ---------------------------------------------------------------------------

function mapSectionKind(kind: string): FrontierSectionKind {
    return kind === 'owner-world' ? 'world_border' : 'owner_border';
}

// ---------------------------------------------------------------------------
// Arc length computation
// ---------------------------------------------------------------------------

function computeArcLength(points: [number, number][]): number {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
        const dx = points[i][0] - points[i - 1][0];
        const dy = points[i][1] - points[i - 1][1];
        length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
}

// ---------------------------------------------------------------------------
// Build owner pair key (canonical sorted)
// ---------------------------------------------------------------------------

function makeOwnerPairKey(leftOwnerId: string, rightOwnerId: string): string {
    const a = leftOwnerId < rightOwnerId ? leftOwnerId : rightOwnerId;
    const b = leftOwnerId < rightOwnerId ? rightOwnerId : leftOwnerId;
    return `${a}|${b}`;
}

// ---------------------------------------------------------------------------
// Stub influence — we don't have per-section star attribution yet
// ---------------------------------------------------------------------------

function stubInfluence(ownerId: string): SectionInfluence {
    return {
        ownerId,
        primaryStarId: '',
        primaryScore: 1.0,
    };
}

// ---------------------------------------------------------------------------
// Main builder
// ---------------------------------------------------------------------------

/**
 * Convert a TerritoryFrontierMap (canonical types) to FrontierTopology
 * (the clean architecture contract type).
 *
 * This is a 1:1 structural conversion:
 * - CanonicalVertex → FrontierVertex
 * - CanonicalEdge   → FrontierSection
 * - CanonicalLoop   → RegionLoop (with SectionRef[])
 *
 * Also builds the lookup indexes required by FrontierTopology.
 */
export function buildFrontierTopology(
    tmap: TerritoryFrontierMap,
    ownershipVersion: string,
    worldBounds: { width: number; height: number },
): FrontierTopology {
    // ── Convert vertices ─────────────────────────────────────────────────
    const vertices = new Map<string, FrontierVertex>();
    const incidentSections = new Map<string, string[]>(); // vertexId → sectionIds

    for (const [id, cv] of tmap.vertices) {
        vertices.set(id, {
            id: cv.id,
            kind: mapVertexKind(cv.kind),
            point: [cv.x, cv.y],
            incidentSectionIds: [], // populated below
            ownerIds: [], // populated below from edges
        });
        incidentSections.set(id, []);
    }

    // ── Convert edges → sections ─────────────────────────────────────────
    const sections = new Map<string, FrontierSection>();
    const sectionsByOwnerPair = new Map<string, string[]>();
    const sectionsByVertex = new Map<string, string[]>();
    const sectionsByOwner = new Map<string, string[]>();

    for (const [edgeId, ce] of tmap.edges) {
        const rightOwnerId = ce.rightOwnerId ?? 'world';
        const ownerPairKey = makeOwnerPairKey(ce.leftOwnerId, rightOwnerId);

        const section: FrontierSection = {
            id: edgeId,
            kind: mapSectionKind(ce.kind),
            startVertexId: ce.startVertexId,
            endVertexId: ce.endVertexId,
            leftOwnerId: ce.leftOwnerId,
            rightOwnerId,
            points: ce.curvePoints,
            length: computeArcLength(ce.curvePoints),
            ownerPairKey,
            leftInfluence: stubInfluence(ce.leftOwnerId),
            rightInfluence: stubInfluence(rightOwnerId),
        };
        sections.set(edgeId, section);

        // ── Build indexes ────────────────────────────────────────────────
        // sectionsByOwnerPair
        if (!sectionsByOwnerPair.has(ownerPairKey)) {
            sectionsByOwnerPair.set(ownerPairKey, []);
        }
        sectionsByOwnerPair.get(ownerPairKey)!.push(edgeId);

        // sectionsByVertex
        for (const vid of [ce.startVertexId, ce.endVertexId]) {
            if (!sectionsByVertex.has(vid)) {
                sectionsByVertex.set(vid, []);
            }
            sectionsByVertex.get(vid)!.push(edgeId);

            // Also populate incidentSectionIds on the vertex
            incidentSections.get(vid)?.push(edgeId);
        }

        // sectionsByOwner
        for (const oid of [ce.leftOwnerId, rightOwnerId]) {
            if (!sectionsByOwner.has(oid)) {
                sectionsByOwner.set(oid, []);
            }
            sectionsByOwner.get(oid)!.push(edgeId);
        }
    }

    // ── Finalize vertex incidentSectionIds and ownerIds ──────────────────
    for (const [vid, vertex] of vertices) {
        vertex.incidentSectionIds = incidentSections.get(vid) ?? [];

        // Derive ownerIds from incident sections
        const ownerSet = new Set<string>();
        for (const sid of vertex.incidentSectionIds) {
            const sec = sections.get(sid);
            if (sec) {
                ownerSet.add(sec.leftOwnerId);
                ownerSet.add(sec.rightOwnerId);
            }
        }
        vertex.ownerIds = Array.from(ownerSet);
    }

    // ── Convert loops → RegionLoops ──────────────────────────────────────
    const loops: RegionLoop[] = [];

    for (const cl of tmap.loops) {
        const sectionRefs: SectionRef[] = [];
        for (const edgeId of cl.edgeIds) {
            const ce = tmap.edges.get(edgeId);
            sectionRefs.push({
                sectionId: edgeId,
                direction: ce?.orientation === 'reverse' ? 'reverse' : 'forward',
            });
        }

        loops.push({
            id: cl.loopId,
            ownerId: cl.ownerId,
            componentId: `${cl.ownerId}:0`, // single component until cluster split
            sectionRefs,
            signedArea: 0, // computed below
        });
    }

    // ── Compute signed area for each loop ────────────────────────────────
    for (const loop of loops) {
        const pts = rebuildLoopPoints(loop, sections);
        if (pts.length >= 3) {
            loop.signedArea = computeSignedArea(pts);
        }
    }

    return {
        version: tmap.fingerprint,
        ownershipVersion,
        worldBounds,
        vertices,
        sections,
        loops,
        sectionsByOwnerPair,
        sectionsByVertex,
        sectionsByOwner,
    };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Rebuild the flat point array for a RegionLoop by walking its section refs.
 * This is the CANONICAL way to get fill points — from border sections.
 */
export function rebuildLoopPoints(
    loop: RegionLoop,
    sections: ReadonlyMap<string, FrontierSection>,
): [number, number][] {
    const points: [number, number][] = [];

    for (const ref of loop.sectionRefs) {
        const section = sections.get(ref.sectionId);
        if (!section) continue;

        const sectionPts = ref.direction === 'reverse'
            ? [...section.points].reverse()
            : section.points;

        // Append points, skipping the first point of subsequent sections
        // (it's the same as the last point of the previous section — junction vertex)
        if (points.length === 0) {
            points.push(...sectionPts);
        } else {
            for (let i = 1; i < sectionPts.length; i++) {
                points.push(sectionPts[i]);
            }
        }
    }

    return points;
}

/**
 * Compute signed area via the shoelace formula.
 * Positive = clockwise (standard screen coords), negative = counterclockwise.
 */
function computeSignedArea(pts: [number, number][]): number {
    let area = 0;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += pts[i][0] * pts[j][1];
        area -= pts[j][0] * pts[i][1];
    }
    return area / 2;
}
