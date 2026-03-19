import type * as PIXI from 'pixi.js';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import type { StarConnection, StarState } from '$lib/types/game.types';

export type TerritoryLegacyAdapterId = 'legacy_pvv2' | 'legacy_pvv3' | 'legacy_df' | 'refactored_pvv2';

// ── Unified Method ID ────────────────────────────────────────────────────────
// Replaces the old TerritoryStaticMethodId / TerritoryDynamicMethodId split.
// All methods are just methods — they declare which pipeline stages they
// implement and which adapter renders them.

export type TerritoryMethodId =
    | 'fg1_adaptive_field'
    | 'fg1_mar19_refactor'
    | 'fg2_seed_graph'
    | 'dy4_optimal_transport'
    | 'dy4_mar19_refactor';

// Backward-compat aliases (temporary — remove once all consumers migrate)
/** @deprecated Use TerritoryMethodId */
export type TerritoryStaticMethodId = TerritoryMethodId;
/** @deprecated Use TerritoryMethodId */
export type TerritoryDynamicMethodId = TerritoryMethodId;

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
    methodId: TerritoryMethodId;
    adapter: TerritoryLegacyAdapterId;
    implementedStages: TerritoryPipelineStageId[];
    // Backward-compat aliases (temporary — remove once consumers migrate)
    /** @deprecated Use methodId */
    mode?: string;
    /** @deprecated Use methodId */
    staticMethodId?: TerritoryMethodId;
    /** @deprecated Use methodId */
    dynamicMethodId?: TerritoryMethodId;
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

// ── Unified Method Descriptor ────────────────────────────────────────────────

export interface TerritoryMethodDescriptor {
    id: TerritoryMethodId;
    label: string;
    description: string;
    implementedStages: TerritoryPipelineStageId[];
    adapter: TerritoryLegacyAdapterId;
}

// Backward-compat aliases (temporary)
/** @deprecated Use TerritoryMethodDescriptor */
export type TerritoryStaticMethodDescriptor = TerritoryMethodDescriptor;
/** @deprecated Use TerritoryMethodDescriptor */
export type TerritoryDynamicMethodDescriptor = TerritoryMethodDescriptor & {
    anchorStaticMethodId?: TerritoryMethodId;
};
