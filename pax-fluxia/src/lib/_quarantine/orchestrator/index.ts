export {
    renderTerritoryEngine,
    resetTerritoryEngineCaches,
    getLastTerritoryTraceRun,
    runFG2DataPipeline,
} from './engine';
export { territoryTraceRun } from './traceStore';

export {
    TERRITORY_METHODS,
    TERRITORY_METHOD_BY_ID,
    TERRITORY_PIPELINE_STAGE_ORDER,
    DEFAULT_TERRITORY_METHOD,
    // Backward-compat aliases (temporary)
    TERRITORY_STATIC_METHODS,
    TERRITORY_DYNAMIC_METHODS,
    DEFAULT_TERRITORY_STATIC_METHOD,
    DEFAULT_TERRITORY_DYNAMIC_METHOD,
} from './registry';

export type {
    TerritoryMethodId,
    TerritoryMethodDescriptor,
    TerritoryEngineInput,
    TerritoryMethodSelection,
    TerritoryNativeStageExecutor,
    TerritoryPipelineArtifacts,
    TerritoryPipelineRuntime,
    TerritoryPipelineStageId,
    TerritoryStageTraceStep,
    TerritoryTraceRun,
    TerritoryLegacyAdapterId,
    // Backward-compat aliases (temporary)
    TerritoryStaticMethodId,
    TerritoryDynamicMethodId,
    TerritoryStaticMethodDescriptor,
    TerritoryDynamicMethodDescriptor,
} from './types';

export { extractTerritoryRenderData } from './engine';

export type {
    ResolvedShell,
    ResolvedShellLoop,
    AnimatedTerritoryRenderShell,
    TerritoryRenderData,
    RenderModeId,
    RenderModeTunables,
    RenderModeContext,
    RenderMode,
} from './renderMode';
