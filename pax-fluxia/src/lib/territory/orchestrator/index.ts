export {
    renderTerritoryEngine,
    resetTerritoryEngineCaches,
    getLastTerritoryTraceRun,
    runFG2DataPipeline,
} from './engine';
export { territoryTraceRun } from './traceStore';

export {
    TERRITORY_STATIC_METHODS,
    TERRITORY_DYNAMIC_METHODS,
    TERRITORY_PIPELINE_STAGE_ORDER,
    DEFAULT_TERRITORY_STATIC_METHOD,
    DEFAULT_TERRITORY_DYNAMIC_METHOD,
} from './registry';

export type {
    TerritoryDynamicMethodDescriptor,
    TerritoryDynamicMethodId,
    TerritoryEngineInput,
    TerritoryEngineMode,
    TerritoryMethodSelection,
    TerritoryNativeStageExecutor,
    TerritoryPipelineArtifacts,
    TerritoryPipelineRuntime,
    TerritoryPipelineStageId,
    TerritoryStageTraceStep,
    TerritoryStaticMethodDescriptor,
    TerritoryStaticMethodId,
    TerritoryTraceRun,
} from './types';

export { extractCanonicalData } from './engine';

export type {
    CanonicalShell,
    CanonicalShellLoop,
    CanonicalAnimatedShell,
    CanonicalTerritoryData,
    RenderModeId,
    RenderModeTunables,
    RenderModeContext,
    RenderMode,
} from './renderMode';
