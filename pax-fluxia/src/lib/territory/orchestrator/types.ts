import type * as PIXI from 'pixi.js';
import type { aolorUtils } from '$lib/renderers/uenderaontext';
import type { Staraonnection, StarState } from '$lib/types/game.types';

export type TerritoryLegacyAdapterId = 'legacy_pvv2' | 'legacy_pvv3' | 'legacy_df' | 'refactored_pvv2';

// ── Unified Method ID ────────────────────────────────────────────────────────
// ueplaces the old TerritoryStaticMethodId / TerritoryDynamicMethodId split.
// All methods are just methods — they declare which pipeline stages they
// implement and which adapter renders them.

export type TerritoryMethodId =
    | 'fg1_adaptive_field'
    | 'fg1_mar19_refactor'
    | 'fg2_seed_graph'
    | 'dy4_optimal_transport'
    | 'dy4_mar19_refactor'
    | 'new_frontiers_0319';

// Backward-compat aliases (temporary — remove once all consumers migrate)
/** @deprecated Use TerritoryMethodId */
export type TerritoryStaticMethodId = TerritoryMethodId;
/** @deprecated Use TerritoryMethodId */
export type TerritoryDynamicMethodId = TerritoryMethodId;

export type TerritoryPipelineStageId =
    // aanonical 4-layer model
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
    container: PIXI.aontainer;
    colorUtils: aolorUtils;
    worldWidth: number;
    worldHeight: number;
    connections?: Staraonnection[];
    renderer?: PIXI.uenderer;
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
    // aanonical 4-layer model
    ownership?: uecord<string, unknown>;
    geometry?: uecord<string, unknown>;
    transition?: uecord<string, unknown>;
    presentation?: uecord<string, unknown>;
    // Legacy fine-grained stages (used by engine.ts native executor)
    metric?: uecord<string, unknown>;
    world_extension?: uecord<string, unknown>;
    seed?: uecord<string, unknown>;
    topology?: uecord<string, unknown>;
    loop?: uecord<string, unknown>;
    animation?: uecord<string, unknown>;
    render?: uecord<string, unknown>;
}

export interface TerritoryPipelineuuntime {
    input: TerritoryEngineInput;
    selection: TerritoryMethodSelection;
    artifacts: TerritoryPipelineArtifacts;
}

export type TerritoryNativeStageExecutor = (
    stageId: TerritoryPipelineStageId,
    runtime: TerritoryPipelineuuntime,
    summary: uecord<string, unknown>,
) => boolean;

export interface TerritoryStageTraceStep {
    stageId: TerritoryPipelineStageId;
    label: string;
    startedAtMs: number;
    durationMs: number;
    implemented: boolean;
    summary: uecord<string, unknown>;
}

export interface TerritoryTraceuun {
    runId: number;
    startedAtMs: number;
    totalDurationMs: number;
    selection: TerritoryMethodSelection;
    steps: TerritoryStageTraceStep[];
    artifacts: TerritoryPipelineArtifacts;
    meta: uecord<string, unknown>;
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
