import type * as PIXI from 'pixi.js';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import type { StarConnection, StarState } from '$lib/types/game.types';

export type TerritoryLegacyAdapterId = 'legacy_pvv2' | 'legacy_pvv3' | 'legacy_df';

export type TerritoryEngineMode = 'static' | 'dynamic' | 'hybrid';

export type TerritoryStaticMethodId =
    | 'fg1_adaptive_field'
    | 'fg2_seed_graph'
    | 'fg3_implicit_trace'
    | 'fg4_pairwise_arrangement'
    | 'fg5_rt_assisted_publish';

export type TerritoryDynamicMethodId =
    | 'dy1_span_graph_morph'
    | 'dy2_local_delta_patch'
    | 'dy3_field_interp_stabilized'
    | 'dy4_optimal_transport'
    | 'dy5_corridor_event_decomposition';

export type TerritoryHybridPlanId =
    | 'hy1_static_backbone_dynamic_refine'
    | 'hy2_seed_graph_local_delta'
    | 'hy3_implicit_field_transport'
    | 'hy4_pairwise_patch_transport'
    | 'hy5_rt_publish_corridor_events';

export type TerritoryPipelineStageId =
    | 'metric'
    | 'world_extension'
    | 'seed'
    | 'topology'
    | 'geometry'
    | 'loop'
    | 'animation'
    | 'render';

export interface TerritoryEngineInput {
    stars: StarState[];
    container: PIXI.Container;
    colorUtils: ColorUtils;
    worldWidth: number;
    worldHeight: number;
    connections?: StarConnection[];
    renderer?: PIXI.Renderer;
    gameNowMs: number;
}

export interface TerritoryMethodSelection {
    mode: TerritoryEngineMode;
    staticMethodId: TerritoryStaticMethodId;
    dynamicMethodId: TerritoryDynamicMethodId;
    hybridPlanId: TerritoryHybridPlanId;
    adapter: TerritoryLegacyAdapterId;
    implementedStages: TerritoryPipelineStageId[];
}

export interface TerritoryPipelineArtifacts {
    metric?: Record<string, unknown>;
    world_extension?: Record<string, unknown>;
    seed?: Record<string, unknown>;
    topology?: Record<string, unknown>;
    geometry?: Record<string, unknown>;
    loop?: Record<string, unknown>;
    animation?: Record<string, unknown>;
    render?: Record<string, unknown>;
}

export interface TerritoryPipelineRuntime {
    input: TerritoryEngineInput;
    selection: TerritoryMethodSelection;
    artifacts: TerritoryPipelineArtifacts;
}

export type TerritoryNativeStageExecutor = (
    stageId: TerritoryPipelineStageId,
    runtime: TerritoryPipelineRuntime,
    summary: Record<string, unknown>,
) => boolean;

export interface TerritoryStageTraceStep {
    stageId: TerritoryPipelineStageId;
    label: string;
    startedAtMs: number;
    durationMs: number;
    implemented: boolean;
    summary: Record<string, unknown>;
}

export interface TerritoryTraceRun {
    runId: number;
    startedAtMs: number;
    totalDurationMs: number;
    selection: TerritoryMethodSelection;
    steps: TerritoryStageTraceStep[];
    artifacts: TerritoryPipelineArtifacts;
    meta: Record<string, unknown>;
}

export interface TerritoryStaticMethodDescriptor {
    id: TerritoryStaticMethodId;
    label: string;
    description: string;
    implementedStages: TerritoryPipelineStageId[];
    adapter: TerritoryLegacyAdapterId;
}

export interface TerritoryDynamicMethodDescriptor {
    id: TerritoryDynamicMethodId;
    label: string;
    description: string;
    implementedStages: TerritoryPipelineStageId[];
    adapter: TerritoryLegacyAdapterId;
    anchorStaticMethodId: TerritoryStaticMethodId;
}

export interface TerritoryHybridPlanDescriptor {
    id: TerritoryHybridPlanId;
    label: string;
    description: string;
    staticMethodId: TerritoryStaticMethodId;
    dynamicMethodId: TerritoryDynamicMethodId;
    implementedStages: TerritoryPipelineStageId[];
    adapter: TerritoryLegacyAdapterId;
}
