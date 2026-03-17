import { executeFG2Stage, resetFG2StageCaches } from './fg2SeedGraph';
import type {
    TerritoryNativeStageExecutor,
    TerritoryPipelineRuntime,
    TerritoryPipelineStageId,
} from '../types';

const TERRITORY_NATIVE_STAGE_EXECUTORS: TerritoryNativeStageExecutor[] = [executeFG2Stage];
const TERRITORY_NATIVE_STAGE_RESETS: Array<() => void> = [resetFG2StageCaches];

export function executeNativeTerritoryStage(
    stageId: TerritoryPipelineStageId,
    runtime: TerritoryPipelineRuntime,
    summary: Record<string, unknown>,
): boolean {
    for (const executeStage of TERRITORY_NATIVE_STAGE_EXECUTORS) {
        if (executeStage(stageId, runtime, summary)) {
            return true;
        }
    }

    return false;
}

export function resetNativeTerritoryStageCaches(): void {
    for (const resetStageCaches of TERRITORY_NATIVE_STAGE_RESETS) {
        resetStageCaches();
    }
}
