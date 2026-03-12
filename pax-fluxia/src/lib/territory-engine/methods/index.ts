import { executeFG2Stage } from './fg2SeedGraph';
import type {
    TerritoryNativeStageExecutor,
    TerritoryPipelineRuntime,
    TerritoryPipelineStageId,
} from '../types';

const TERRITORY_NATIVE_STAGE_EXECUTORS: TerritoryNativeStageExecutor[] = [executeFG2Stage];

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
