import type { GeometrySnapshot } from '../contracts/GeometryContracts';
import type { TerritoryConquestEvent, OwnershipSnapshot } from '../contracts/OwnershipContracts';
import type { TerritoryTunables } from '../contracts/TerritoryFrameInput';
import type { FillTransitionFrame } from '../contracts/TransitionContracts';
import type {
    FrontierTopology,
    FrontierVertexKind,
} from '../contracts/FrontierTopologyContracts';
import type { ActiveFrontTransitionPlan } from '../layers/transition/ActiveFrontTransition';

export type PowerVoronoiFrontSplitMode = '1to1' | '1to2' | '2to1';

export interface PowerVoronoiTransitionAnchor {
    vertexId: string;
    point: [number, number];
    kind: FrontierVertexKind;
}

export interface PowerVoronoiFrontChain {
    chainId: string;
    anchorStartId: string;
    anchorEndId: string;
    sectionIds: readonly string[];
    points: readonly [number, number][];
}

export interface PowerVoronoiTransitionVertex {
    vertexId: string;
    progressIndex: number;
    prePoint: [number, number];
    postPoint: [number, number];
}

export interface PowerVoronoiTransitionPair {
    pairId: string;
    splitMode: PowerVoronoiFrontSplitMode;
    preChainId: string | null;
    postChainId: string | null;
}

export interface PowerVoronoiTransitionFront {
    frontId: string;
    ownerPairKey: string;
    splitMode: PowerVoronoiFrontSplitMode;
    changeAnchorStart: PowerVoronoiTransitionAnchor;
    changeAnchorEnd: PowerVoronoiTransitionAnchor;
    preConquestFront: readonly PowerVoronoiFrontChain[];
    postConquestFront: readonly PowerVoronoiFrontChain[];
    transitionVertices: readonly PowerVoronoiTransitionVertex[];
    transitionPairs: readonly PowerVoronoiTransitionPair[];
}

export interface TransientTransitionFrontline {
    frontId: string;
    ownerPairKey: string;
    splitMode: PowerVoronoiFrontSplitMode;
    progress: number;
    points: readonly [number, number][];
}

export interface PowerVoronoiTransitionPlan {
    kind: 'power_voronoi_canonical';
    planId: string;
    startGeometryVersion: string;
    endGeometryVersion: string;
    conquestEvents: readonly TerritoryConquestEvent[];
    fronts: readonly PowerVoronoiTransitionFront[];
    frozenTunables: TerritoryTunables;
    unaffectedLoopIds: readonly string[];
}

export interface PowerVoronoiOwnershipStageSummary {
    previousOwnerCount: number;
    nextOwnerCount: number;
    conquestCount: number;
    conquestStarIds: readonly string[];
}

export interface PowerVoronoiOwnershipDiagnostics {
    stage: 'ownership';
    stageId: string;
    tunables: TerritoryTunables;
    previousOwnership: OwnershipSnapshot;
    nextOwnership: OwnershipSnapshot;
    conquestEvents: readonly TerritoryConquestEvent[];
    summary: PowerVoronoiOwnershipStageSummary;
}

export interface PowerVoronoiGeometryStageSummary {
    preRegionCount: number;
    postRegionCount: number;
    preFrontierCount: number;
    postFrontierCount: number;
    preLoopCount: number;
    postLoopCount: number;
}

export interface PowerVoronoiGeometryDiagnostics {
    stage: 'geometry';
    stageId: string;
    tunables: TerritoryTunables;
    preGeometry: GeometrySnapshot;
    postGeometry: GeometrySnapshot;
    summary: PowerVoronoiGeometryStageSummary;
}

export interface PowerVoronoiTransitionPlanningStageSummary {
    transitionFrontCount: number;
    activeFrontPlanFrontCount: number;
    transitionPairCount: number;
    unaffectedLoopCount: number;
    splitModes: readonly PowerVoronoiFrontSplitMode[];
}

export interface PowerVoronoiTransitionPlanningDiagnostics {
    stage: 'transition_planning';
    stageId: string;
    tunables: TerritoryTunables;
    preTopology: FrontierTopology;
    postTopology: FrontierTopology;
    transitionPlan: PowerVoronoiTransitionPlan;
    summary: PowerVoronoiTransitionPlanningStageSummary;
}

export interface PowerVoronoiFrameSampleDiagnostics {
    sampleId: string;
    progress: number;
    regions: number;
    transientFrontlines: readonly TransientTransitionFrontline[];
    matchesPreGeometry: boolean;
    matchesPostGeometry: boolean;
}

export interface PowerVoronoiFrameEvaluationStageSummary {
    sampledFrameCount: number;
    lastProgress: number | null;
    lastFrontlineCount: number;
}

export interface PowerVoronoiFrameEvaluationDiagnostics {
    stage: 'frame_evaluation';
    stageId: string;
    tunables: TerritoryTunables;
    sampledFrames: PowerVoronoiFrameSampleDiagnostics[];
    currentFrame: FillTransitionFrame | null;
    summary: PowerVoronoiFrameEvaluationStageSummary;
}

export interface PowerVoronoiDiagnosticBundle {
    kind: 'power_voronoi_canonical';
    bundleId: string;
    modeId: 'power_voronoi_canonical';
    planId: string;
    tunables: TerritoryTunables;
    ownershipStage: PowerVoronoiOwnershipDiagnostics;
    geometryStage: PowerVoronoiGeometryDiagnostics;
    transitionPlanningStage: PowerVoronoiTransitionPlanningDiagnostics;
    frameEvaluationStage: PowerVoronoiFrameEvaluationDiagnostics;
}

export interface CanonicalPowerVoronoiTransitionRuntime {
    readonly kind: 'power_voronoi_canonical_runtime';
    readonly preGeometry: GeometrySnapshot;
    readonly postGeometry: GeometrySnapshot;
    readonly activeFrontPlan: ActiveFrontTransitionPlan;
    readonly plan: PowerVoronoiTransitionPlan;
    readonly diagnostics: PowerVoronoiDiagnosticBundle;
}
