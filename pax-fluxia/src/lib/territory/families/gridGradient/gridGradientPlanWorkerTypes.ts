import type { ResolvedGeometrySnapshot, TerritoryRegionShape } from '../../contracts/GeometryContracts';
import type { RenderFamilyActiveTransition, RenderFamilyInput } from '../RenderFamilyTypes';
import type { CachedGridGradientPlan } from './plan';
import type { GridGradientSettings } from './settings';

export interface GridGradientPlanWorkerGeometry {
    readonly version: string;
    readonly territoryRegions: readonly TerritoryRegionShape[];
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
}

export function inflateGridGradientWorkerGeometry(
    geometry: GridGradientPlanWorkerGeometry,
): ResolvedGeometrySnapshot {
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
        frontierTopology: {
            version: `worker:${geometry.version}`,
            ownershipVersion: geometry.version,
            worldBounds: { width: 0, height: 0 },
            vertices: new Map(),
            sections: new Map(),
            loops: [],
            sectionsByOwnerPair: new Map(),
            sectionsByVertex: new Map(),
            sectionsByOwner: new Map(),
        },
        shells: [],
        shellLoops: [],
        provenance: { derivedFromField: false, notes: ['grid-gradient-worker-minimal'] },
        diagnostics: {
            topologyReliable: true,
            identityReliable: true,
            closureReliable: true,
            notes: [],
        },
    };
}
