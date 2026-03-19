import type * as PIXI from 'pixi.js';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import type { StarConnection, StarState } from '$lib/types/game.types';

export type TerritoryLegacyAdapterId = 'legacy_pvv2' | 'legacy_pvv3' | 'legacy_df';

export type TerritoryEngineMode = 'static' | 'dynamic' | 'hybrid';

export type TerritoryStaticMethodId =
    | 'fg1_adaptive_field'
    | 'fg2_seed_graph';

export type TerritoryDynamicMethodId =
    | 'dy4_optimal_transport';

// Hybrid plans removed — all were stubs referencing stub methods.

export type TerritoryPipelineStageId =
    // Canonical 4-layer model
    | 'ownership'
    | 'geometry'
    | 'transition'
    | 'presentation'
    // Legacy fine-grained stages (used by engine.ts native executor)
    | 'metric'
    | 'world_extension'
    | 'seed'
    | 'topology'
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
    adapter: TerritoryLegacyAdapterId;
    implementedStages: TerritoryPipelineStageId[];
}

export interface TerritoryPipelineArtifacts {
    // Canonical 4-layer model
    ownership?: Record<string, unknown>;
    geometry?: Record<string, unknown>;
    transition?: Record<string, unknown>;
    presentation?: Record<string, unknown>;
    // Legacy fine-grained stages (used by engine.ts native executor)
    metric?: Record<string, unknown>;
    world_extension?: Record<string, unknown>;
    seed?: Record<string, unknown>;
    topology?: Record<string, unknown>;
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

