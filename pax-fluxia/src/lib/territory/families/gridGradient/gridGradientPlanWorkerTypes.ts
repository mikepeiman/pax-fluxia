import type {
    ResolvedGeometryOracleResult,
    ResolvedGeometrySnapshot,
    TerritoryRegionShape,
} from '../../contracts/GeometryContracts';
import type {
    FrontierSection,
    FrontierTopology,
    FrontierVertex,
    RegionLoop,
    SectionInfluence,
} from '../../contracts/FrontierTopologyContracts';
import type { RenderFamilyActiveTransition, RenderFamilyInput } from '../RenderFamilyTypes';
import type { CachedGridGradientPlan } from './plan';
import type { GridGradientSettings } from './settings';
import type { GridGradientOwnerGridCacheStats } from './typedClassification';

export type WorkerIndexEntries = readonly (readonly [string, readonly string[]])[];

export interface GridGradientPlanWorkerDiagnostics {
    readonly topologyReliable: boolean;
    readonly identityReliable: boolean;
    readonly closureReliable: boolean;
    readonly resolvedGeometryOracle?: ResolvedGeometryOracleResult;
    readonly notes: readonly string[];
}

export interface GridGradientPlanWorkerVertex {
    readonly id: string;
    readonly kind: FrontierVertex['kind'];
    readonly point: readonly [number, number];
    readonly incidentSectionIds: readonly string[];
    readonly ownerIds: readonly string[];
    readonly semanticKey?: string;
}

export interface GridGradientPlanWorkerSection {
    readonly id: string;
    readonly kind: FrontierSection['kind'];
    readonly startVertexId: string;
    readonly endVertexId: string;
    readonly leftOwnerId: string;
    readonly rightOwnerId: string;
    readonly points: readonly (readonly [number, number])[];
    readonly length: number;
    readonly ownerPairKey: string;
    readonly leftInfluence: SectionInfluence;
    readonly rightInfluence: SectionInfluence;
}

export interface GridGradientPlanWorkerLoop {
    readonly id: string;
    readonly ownerId: string;
    readonly componentId: string;
    readonly sectionRefs: RegionLoop['sectionRefs'];
    readonly signedArea: number;
}

export interface GridGradientPlanWorkerTopology {
    readonly version: string;
    readonly ownershipVersion: string;
    readonly worldBounds: FrontierTopology['worldBounds'];
    readonly vertices: readonly GridGradientPlanWorkerVertex[];
    readonly sections: readonly GridGradientPlanWorkerSection[];
    readonly loops: readonly GridGradientPlanWorkerLoop[];
    readonly sectionsByOwnerPair: WorkerIndexEntries;
    readonly sectionsByVertex: WorkerIndexEntries;
    readonly sectionsByOwner: WorkerIndexEntries;
}

export interface GridGradientPlanWorkerGeometry {
    readonly version: string;
    readonly territoryRegions: readonly TerritoryRegionShape[];
    readonly diagnostics?: GridGradientPlanWorkerDiagnostics;
    readonly frontierTopology?: GridGradientPlanWorkerTopology | null;
}

export interface GridGradientPlanWorkerStar {
    readonly id: string;
    readonly ownerId: string | null;
    readonly x: number;
    readonly y: number;
}

export interface GridGradientPlanWorkerRequest {
    readonly requestId: number;
    readonly planKey: string;
    readonly world: RenderFamilyInput['world'];
    readonly stars: readonly GridGradientPlanWorkerStar[];
    readonly prevGeometry: GridGradientPlanWorkerGeometry;
    readonly geometry: GridGradientPlanWorkerGeometry;
    readonly settings: GridGradientSettings;
    readonly activeTransition: RenderFamilyActiveTransition | null;
}

export interface GridGradientPlanWorkerResponse {
    readonly requestId: number;
    readonly planKey: string;
    readonly plan: CachedGridGradientPlan;
    readonly workerBuildMs: number;
    readonly ownerGridCacheStats?: GridGradientOwnerGridCacheStats;
}

function clonePoint(point: readonly [number, number]): [number, number] {
    return [point[0], point[1]];
}

function clonePoints(
    points: readonly (readonly [number, number])[],
): [number, number][] {
    return points.map(clonePoint);
}

function cloneIndexMap(
    map: ReadonlyMap<string, readonly string[]>,
): WorkerIndexEntries {
    return [...map.entries()].map(([key, ids]) => [key, [...ids]] as const);
}

function inflateIndexMap(entries: WorkerIndexEntries): Map<string, string[]> {
    return new Map(entries.map(([key, ids]) => [key, [...ids]]));
}

function cloneInfluence(influence: SectionInfluence): SectionInfluence {
    return { ...influence };
}

function dehydrateTopology(
    topology: FrontierTopology,
): GridGradientPlanWorkerTopology {
    return {
        version: topology.version,
        ownershipVersion: topology.ownershipVersion,
        worldBounds: { ...topology.worldBounds },
        vertices: [...topology.vertices.values()].map((vertex) => ({
            id: vertex.id,
            kind: vertex.kind,
            point: clonePoint(vertex.point),
            incidentSectionIds: [...vertex.incidentSectionIds],
            ownerIds: [...vertex.ownerIds],
            ...(vertex.semanticKey ? { semanticKey: vertex.semanticKey } : {}),
        })),
        sections: [...topology.sections.values()].map((section) => ({
            id: section.id,
            kind: section.kind,
            startVertexId: section.startVertexId,
            endVertexId: section.endVertexId,
            leftOwnerId: section.leftOwnerId,
            rightOwnerId: section.rightOwnerId,
            points: clonePoints(section.points),
            length: section.length,
            ownerPairKey: section.ownerPairKey,
            leftInfluence: cloneInfluence(section.leftInfluence),
            rightInfluence: cloneInfluence(section.rightInfluence),
        })),
        loops: topology.loops.map((loop) => ({
            id: loop.id,
            ownerId: loop.ownerId,
            componentId: loop.componentId,
            sectionRefs: loop.sectionRefs.map((ref) => ({ ...ref })),
            signedArea: loop.signedArea,
        })),
        sectionsByOwnerPair: cloneIndexMap(topology.sectionsByOwnerPair),
        sectionsByVertex: cloneIndexMap(topology.sectionsByVertex),
        sectionsByOwner: cloneIndexMap(topology.sectionsByOwner),
    };
}

function inflateTopology(
    topology: GridGradientPlanWorkerTopology,
): FrontierTopology {
    const vertices = new Map<string, FrontierVertex>();
    for (const vertex of topology.vertices) {
        vertices.set(vertex.id, {
            id: vertex.id,
            kind: vertex.kind,
            point: clonePoint(vertex.point),
            incidentSectionIds: [...vertex.incidentSectionIds],
            ownerIds: [...vertex.ownerIds],
            ...(vertex.semanticKey ? { semanticKey: vertex.semanticKey } : {}),
        });
    }

    const sections = new Map<string, FrontierSection>();
    for (const section of topology.sections) {
        sections.set(section.id, {
            id: section.id,
            kind: section.kind,
            startVertexId: section.startVertexId,
            endVertexId: section.endVertexId,
            leftOwnerId: section.leftOwnerId,
            rightOwnerId: section.rightOwnerId,
            points: clonePoints(section.points),
            length: section.length,
            ownerPairKey: section.ownerPairKey,
            leftInfluence: cloneInfluence(section.leftInfluence),
            rightInfluence: cloneInfluence(section.rightInfluence),
        });
    }

    return {
        version: topology.version,
        ownershipVersion: topology.ownershipVersion,
        worldBounds: { ...topology.worldBounds },
        vertices,
        sections,
        loops: topology.loops.map((loop) => ({
            id: loop.id,
            ownerId: loop.ownerId,
            componentId: loop.componentId,
            sectionRefs: loop.sectionRefs.map((ref) => ({ ...ref })),
            signedArea: loop.signedArea,
        })),
        sectionsByOwnerPair: inflateIndexMap(topology.sectionsByOwnerPair),
        sectionsByVertex: inflateIndexMap(topology.sectionsByVertex),
        sectionsByOwner: inflateIndexMap(topology.sectionsByOwner),
    };
}

function emptyWorkerTopology(version: string): FrontierTopology {
    return {
        version: `worker:${version}`,
        ownershipVersion: version,
        worldBounds: { width: 0, height: 0 },
        vertices: new Map(),
        sections: new Map(),
        loops: [],
        sectionsByOwnerPair: new Map(),
        sectionsByVertex: new Map(),
        sectionsByOwner: new Map(),
    };
}

export function dehydrateGridGradientWorkerGeometry(
    geometry: ResolvedGeometrySnapshot,
): GridGradientPlanWorkerGeometry {
    const diagnostics: GridGradientPlanWorkerDiagnostics = {
        topologyReliable: geometry.diagnostics.topologyReliable,
        identityReliable: geometry.diagnostics.identityReliable,
        closureReliable: geometry.diagnostics.closureReliable,
        resolvedGeometryOracle: geometry.diagnostics.resolvedGeometryOracle,
        notes: [...geometry.diagnostics.notes],
    };
    const canTransportTopology =
        diagnostics.topologyReliable &&
        diagnostics.identityReliable &&
        diagnostics.closureReliable &&
        diagnostics.resolvedGeometryOracle?.ok !== false;

    return {
        version: geometry.version,
        territoryRegions: geometry.territoryRegions,
        diagnostics,
        frontierTopology: canTransportTopology
            ? dehydrateTopology(geometry.frontierTopology)
            : null,
    };
}

export function inflateGridGradientWorkerGeometry(
    geometry: GridGradientPlanWorkerGeometry,
): ResolvedGeometrySnapshot {
    const transportedTopology = geometry.frontierTopology
        ? inflateTopology(geometry.frontierTopology)
        : null;
    const diagnostics = geometry.diagnostics ?? {
        topologyReliable: false,
        identityReliable: false,
        closureReliable: false,
        notes: [] as readonly string[],
    };
    const topologyReliable = Boolean(
        transportedTopology &&
            diagnostics.topologyReliable &&
            diagnostics.identityReliable &&
            diagnostics.closureReliable &&
            diagnostics.resolvedGeometryOracle?.ok !== false,
    );
    const notes = topologyReliable
        ? ['grid-gradient-worker-topology-transported', ...diagnostics.notes]
        : [
              'grid-gradient-worker-minimal-topology-omitted',
              ...diagnostics.notes,
          ];

    return {
        version: geometry.version,
        sourceMode: 'unified_vector',
        sourceStyle: 'vector',
        ownershipVersion: geometry.version,
        geometryFamily: 'vector-native',
        sourceMethod: 'power_voronoi',
        territoryRegions: geometry.territoryRegions,
        frontierPolylines: [],
        worldBorderPolylines: [],
        sharedFrontierMap: new Map(),
        frontierTopology: transportedTopology ?? emptyWorkerTopology(geometry.version),
        shells: [],
        shellLoops: [],
        provenance: {
            derivedFromField: false,
            notes: topologyReliable
                ? ['grid-gradient-worker-topology-transported']
                : ['grid-gradient-worker-minimal'],
        },
        diagnostics: {
            topologyReliable,
            identityReliable: topologyReliable,
            closureReliable: topologyReliable,
            resolvedGeometryOracle: diagnostics.resolvedGeometryOracle,
            notes,
        },
    };
}
