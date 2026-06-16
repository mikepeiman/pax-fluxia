/**
 * @file compiler_UnifiedVectorGeometry.ts
 *
 * The single authoritative compiler entry point for vector-native territory
 * geometry. Produces ResolvedGeometrySnapshot from ownership data.
 *
 * Orchestration flow:
 *   1. Build settings + version hash
 *   2. Call computeGeometry0319 (will be renamed to 0324 after reevaluation)
 *   3. Build resolved frontier polylines (inter-owner + world border)
 *   4. Build territory regions with identity
 *   5. Build shared frontier map (D-90 multimap)
 *   6. Build frontier topology (from TMAP)
 *   7. Build owner shells with hole classification (FG2 concepts absorbed)
 *   8. Assemble ResolvedGeometrySnapshot
 *
 * SMOOTHING: Chaikin smoothing is applied inside computeGeometry0319
 * (geometry concern per TERRITORY_ARCHITECTURE.md L69). The points emitted
 * in the snapshot are already smoothed. Renderers must NOT re-smooth.
 *
 * Layer: Geometry (Layer 2)
 * PIXI imports: NEVER
 */

import { computeGeometry0319 } from '../../compiler/Geometry_0319';
import { buildFrontierTopology } from '../../compiler/buildFrontierTopology';
import type { TerritoryGeometryData, MergedTerritory } from '../../compiler/powerVoronoiTerritoryGeometryGenerator';
import type {
    ResolvedGeometrySnapshot,
    ResolvedFrontierPolyline,
    ResolvedShell,
    ResolvedShellLoop,
    TerritoryRegionShape,
    SharedFrontierMap,
    GeometryProvenance,
    GeometryDiagnostics,
    GeometryLayerInput,
} from '../../contracts/GeometryContracts';
import type { FrontierTopology } from '../../contracts/FrontierTopologyContracts';
import { buildGeometryVersion } from './planners/GeometryFingerprint';
import {
    deriveStableRegionId,
    deriveRegionFallbackId,
} from '../../geometry/regionIdentity';
import {
    buildGeneratorSettings,
    createEmptyTerritoryGeometryData,
    isCompileError,
} from './modes/geometryModeUtils';
import { log } from '../../../utils/logger';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CompileResult {
    snapshot: ResolvedGeometrySnapshot;
    /** Raw compiler output for debugging — NOT part of the contract. */
    _rawGeometry?: TerritoryGeometryData;
}

interface CompileVectorGeometryOptions {
    sourceMode?: GeometryLayerInput['ownership'] extends never
        ? never
        : ResolvedGeometrySnapshot['sourceMode'];
}

function serializeTunables(
    tunables: GeometryLayerInput['tunables'],
): Record<string, unknown> {
    return { ...tunables };
}

function serializeSharedFrontierMap(
    sharedFrontierMap: SharedFrontierMap,
): Record<string, unknown> {
    return Object.fromEntries(
        [...sharedFrontierMap.entries()].map(([ownerPairKey, polylines]) => [
            ownerPairKey,
            polylines.map((polyline) => ({
                frontierId: polyline.frontierId,
                ownerPairKey: polyline.ownerPairKey,
                pointCount: polyline.points.length,
                ownerA: polyline.ownerA,
                ownerB: polyline.ownerB,
            })),
        ]),
    );
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

/**
 * Single authoritative compilier for vector-native territory geometry.
 *
 * This function replaces the orchestration previously embedded in
 * UnifiedVectorGeometryMode.compute(). It produces a complete
 * ResolvedGeometrySnapshot with:
 *  - Frontier polylines with stable identity
 *  - Territory regions with identity and confidence
 *  - Shell classification (FG2 concepts absorbed)
 *  - Frontier topology (vertices, sections, loops, influence)
 *  - Provenance and diagnostic metadata
 *
 * Error fallback: returns an empty typed snapshot with
 * diagnostics.topologyReliable = false. NO legacyGeometryBridge.
 */
export function compileVectorGeometry(
    input: GeometryLayerInput,
    options: CompileVectorGeometryOptions = {},
): ResolvedGeometrySnapshot {
    log.renderer('Compiler', `compileVectorGeometry() — ownership v${input.ownership.version}, ${input.stars.length} stars`);


    const settings = buildGeneratorSettings(input.world, input.tunables);
    const sourceMode = options.sourceMode ?? 'unified_vector';
    const version = buildGeometryVersion(
        sourceMode,
        input.stars,
        settings,
        input.ownership.version,
    );

    // ── Step 1: Run the geometry generator ──
    const result = computeGeometry0319(
        [...input.stars],
        [...input.lanes],
        settings,
    );

    if (isCompileError(result)) {
        log.renderer('Compiler', `computeGeometry0319 returned error — producing empty snapshot`);
        return buildEmptySnapshot(version, input, sourceMode);
    }

    const geometry = result as TerritoryGeometryData;


    // ── Step 2: Build resolved frontier polylines ──
    const frontierPolylines = buildResolvedFrontierPolylines(geometry);
    const worldBorderPolylines = buildWorldBorderPolylines(geometry);
    const allInterOwnerPolylines = frontierPolylines.filter(
        (p) => !p.ownerPairKey.includes('__world__') && !p.ownerPairKey.endsWith('|world'),
    );


    // ── Step 3: Build territory regions ──
    const territoryRegions = buildTerritoryRegions(geometry);


    // ── Step 4: Build shared frontier map (D-90 multimap) ──
    const sharedFrontierMap = buildSharedFrontierMap(allInterOwnerPolylines);


    // ── Step 5: Build frontier topology from TMAP ──
    const frontierTopology = buildFrontierTopologyFromGeometry(geometry, input);


    // ── Step 6: Build owner shells (FG2 concepts absorbed) ──
    const { shells, shellLoops } = buildOwnerShells(geometry);


    // ── Step 7: Assemble resolved snapshot ──
    const snapshot: ResolvedGeometrySnapshot = {
        // Identity
        version,
        sourceMode,
        sourceStyle: input.styleMode,
        ownershipVersion: input.ownership.version,

        // Family & provenance
        geometryFamily: 'vector-native',
        sourceMethod: 'power_voronoi',

        // Core geometry
        territoryRegions,
        frontierPolylines: allInterOwnerPolylines,
        worldBorderPolylines,
        sharedFrontierMap,

        // Rich topology
        frontierTopology: frontierTopology ?? buildEmptyFrontierTopology(input),

        // Shell structure
        shells,
        shellLoops,

        // Provenance & diagnostics
        provenance: buildProvenance(input, settings),
        diagnostics: buildDiagnostics(frontierTopology, shells),
    };


    log.renderer('Compiler',
        `Compiled: ${territoryRegions.length} regions, ` +
        `${allInterOwnerPolylines.length} frontiers, ` +
        `${worldBorderPolylines.length} world borders, ` +
        `${shells.length} shells, ` +
        `topology: ${frontierTopology ? `${frontierTopology.vertices.size}v/${frontierTopology.sections.size}s/${frontierTopology.loops.length}l` : 'MISSING'}`,
    );

    return snapshot;
}

// ─── Resolved Frontier Polyline Builders ────────────────────────────────────

function buildResolvedFrontierPolylines(
    geometry: TerritoryGeometryData,
): ResolvedFrontierPolyline[] {
    const polylines: ResolvedFrontierPolyline[] = [];

    for (const polyline of geometry.sharedPolylines) {
        const [ownerA, ownerB] = polyline.ownerPairKey.split('|');
        polylines.push({
            frontierId: `frontier:${polyline.ownerPairKey}:${polylines.length}`,
            ownerA,
            ownerB,
            ownerPairKey: polyline.ownerPairKey,
            points: polyline.points,
            confidence: 1.0, // vector-native → full confidence
        });
    }

    return polylines;
}

function buildWorldBorderPolylines(
    geometry: TerritoryGeometryData,
): ResolvedFrontierPolyline[] {
    return geometry.worldBorderPolylines.map(
        (p: { ownerPairKey: string; points: [number, number][] }, idx: number) => {
            const [ownerA, ownerB] = p.ownerPairKey.split('|');
            return {
                frontierId: `world-border:${p.ownerPairKey}:${idx}`,
                ownerA,
                ownerB: ownerB ?? '__world__',
                ownerPairKey: p.ownerPairKey,
                points: p.points,
                confidence: 1.0,
            };
        },
    );
}

// ─── Territory Region Builder ───────────────────────────────────────────────

function buildTerritoryRegions(
    geometry: TerritoryGeometryData,
): TerritoryRegionShape[] {
    // Region identity is anchored to the real star set via the shared
    // regionIdentity module — the SAME derivation the render-family assembler
    // (buildPowerVoronoi0319AuthoritySnapshot) uses, so a given region gets the
    // same id from either assembler. Star-set ids are stable under conquest
    // morphing, unlike the centroid-hash anti-pattern this replaces (which
    // drifted as geometry shifted and needed iteration-order collision
    // suffixes). Disconnected regions of one owner have disjoint star sets, so
    // ids stay unique without a counter. (hybrid-converge Phase 1)
    return geometry.mergedTerritories.map((territory: MergedTerritory) => {
        const pts = territory.points;
        const starIds = [...territory.starIds];
        const regionId =
            starIds.length > 0
                ? deriveStableRegionId(territory.ownerId, starIds)
                : deriveRegionFallbackId(territory.ownerId, pts);

        return {
            regionId,
            ownerId: territory.ownerId,
            starIds,
            points: pts,
            confidence: 1.0,
        };
    });
}

// ─── Shared Frontier Map (D-90 Multimap) ────────────────────────────────────

function buildSharedFrontierMap(
    polylines: readonly ResolvedFrontierPolyline[],
): SharedFrontierMap {
    const map = new Map<string, ResolvedFrontierPolyline[]>();
    for (const p of polylines) {
        const arr = map.get(p.ownerPairKey);
        if (arr) {
            arr.push(p);
        } else {
            map.set(p.ownerPairKey, [p]);
        }
    }
    return map;
}

// ─── Frontier Topology ──────────────────────────────────────────────────────

function buildFrontierTopologyFromGeometry(
    geometry: TerritoryGeometryData,
    input: GeometryLayerInput,
): FrontierTopology | undefined {
    if (!geometry.frontierMap) return undefined;

    const topology = buildFrontierTopology(
        geometry.frontierMap,
        input.ownership.version,
        { width: input.world.width, height: input.world.height },
    );

    if (topology) {
        log.renderer('Compiler',
            `FrontierTopology: ${topology.vertices.size} vertices, ` +
            `${topology.sections.size} sections, ` +
            `${topology.loops.length} loops`,
        );
    }

    return topology;
}

// ─── Shell Builder (FG2 Concepts Absorbed) ───────────────────────────────────

/**
 * Classify merged territories into shells (outer boundaries + holes).
 *
 * Absorbs FG2's shell classification concept:
 *  - FG2HalfEdge → FrontierSection left/rightOwnerId + normalized orientation
 *  - FG2FaceWalk → RegionLoop with ordered SectionRef[]
 *  - FG2OwnerShellArtifact → ResolvedShell with signed area classification
 *
 * Algorithm:
 *  1. Compute signed area (shoelace) for each merged territory
 *  2. Positive area (CW winding) = outer boundary
 *  3. Negative area (CCW winding) = hole
 *  4. Assign holes to shells via point-in-polygon containment
 */
function buildOwnerShells(
    geometry: TerritoryGeometryData,
): { shells: ResolvedShell[]; shellLoops: ResolvedShellLoop[] } {
    const shells: ResolvedShell[] = [];
    const shellLoops: ResolvedShellLoop[] = [];

    // Group merged territories by owner
    const byOwner = new Map<string, MergedTerritory[]>();
    for (const territory of geometry.mergedTerritories) {
        const arr = byOwner.get(territory.ownerId);
        if (arr) arr.push(territory);
        else byOwner.set(territory.ownerId, [territory]);
    }

    for (const [ownerId, territories] of byOwner) {
        const outerLoops: ResolvedShellLoop[] = [];
        const holeLoops: ResolvedShellLoop[] = [];

        for (let i = 0; i < territories.length; i++) {
            const territory = territories[i];
            const area = shoelaceArea(territory.points);
            const loopId = `shell-loop:${ownerId}:${i}`;

            const loop: ResolvedShellLoop = {
                shellLoopId: loopId,
                ownerId,
                starIds: [...territory.starIds],
                points: territory.points,
                classification: area >= 0 ? 'outer' : 'hole',
                confidence: 1.0,
            };

            shellLoops.push(loop);

            if (area >= 0) {
                outerLoops.push(loop);
            } else {
                holeLoops.push(loop);
            }
        }

        // Create a shell per outer loop, assign holes via containment
        for (let o = 0; o < outerLoops.length; o++) {
            const outer = outerLoops[o];
            const shellId = `shell:${ownerId}:${o}`;
            outer.shellId = shellId;

            const containedHoles: string[] = [];
            for (const hole of holeLoops) {
                if (hole.points.length > 0 && pointInPolygon(hole.points[0], outer.points)) {
                    hole.shellId = shellId;
                    containedHoles.push(hole.shellLoopId);
                }
            }

            shells.push({
                shellId,
                ownerId,
                starIds: [...(outer.starIds ?? [])],
                points: outer.points,
                area: shoelaceArea(outer.points),
                absArea: Math.abs(shoelaceArea(outer.points)),
                confidence: 1.0,
                holeLoopIds: containedHoles,
            });
        }
    }

    return { shells, shellLoops };
}

// ─── Geometry Utilities ─────────────────────────────────────────────────────

/** Signed area via shoelace formula. Positive = CW, negative = CCW. */
function shoelaceArea(points: [number, number][]): number {
    let area = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[(i + 1) % n];
        area += (x2 - x1) * (y2 + y1);
    }
    return area / 2;
}

/** Ray-casting point-in-polygon test. */
function pointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
    const [px, py] = point;
    let inside = false;
    const n = polygon.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        if (
            yi > py !== yj > py &&
            px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
        ) {
            inside = !inside;
        }
    }
    return inside;
}

// ─── Provenance & Diagnostics ───────────────────────────────────────────────

function buildProvenance(
    input: GeometryLayerInput,
    settings: ReturnType<typeof buildGeneratorSettings>,
): GeometryProvenance {
    return {
        derivedFromField: false,
        smoothPasses: settings.chaikinPasses,
        notes: [
            `stars=${input.stars.length}`,
            `ownership_v=${input.ownership.version}`,
        ],
    };
}

function buildDiagnostics(
    topology: FrontierTopology | undefined,
    shells: readonly ResolvedShell[],
): GeometryDiagnostics {
    return {
        topologyReliable: topology !== undefined && topology.sections.size > 0,
        identityReliable: topology !== undefined,
        closureReliable: topology !== undefined && topology.loops.length > 0,
        notes: [
            topology ? `topology: ${topology.vertices.size}v/${topology.sections.size}s/${topology.loops.length}l` : 'topology: MISSING',
            `shells: ${shells.length}`,
        ],
    };
}

// ─── Empty Snapshot (Error Fallback) ─────────────────────────────────────────

function buildEmptySnapshot(
    version: string,
    input: GeometryLayerInput,
    sourceMode: ResolvedGeometrySnapshot['sourceMode'],
): ResolvedGeometrySnapshot {
    return {
        version,
        sourceMode,
        sourceStyle: input.styleMode,
        ownershipVersion: input.ownership.version,
        geometryFamily: 'vector-native',
        sourceMethod: 'power_voronoi',
        territoryRegions: [],
        frontierPolylines: [],
        worldBorderPolylines: [],
        sharedFrontierMap: new Map(),
        frontierTopology: buildEmptyFrontierTopology(input),
        shells: [],
        shellLoops: [],
        provenance: {
            derivedFromField: false,
            notes: ['compile error — empty snapshot'],
        },
        diagnostics: {
            topologyReliable: false,
            identityReliable: false,
            closureReliable: false,
            notes: ['compile error'],
        },
    };
}

function buildEmptyFrontierTopology(input: GeometryLayerInput): FrontierTopology {
    return {
        version: 'empty',
        ownershipVersion: input.ownership.version,
        worldBounds: { width: input.world.width, height: input.world.height },
        vertices: new Map(),
        sections: new Map(),
        loops: [],
        sectionsByOwnerPair: new Map(),
        sectionsByVertex: new Map(),
        sectionsByOwner: new Map(),
    };
}
