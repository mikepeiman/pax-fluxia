/**
 * territory/devtools/TerritoryStepRunner.ts
 *
 * Class-encapsulated interactive step runner for the canonical compiler pipeline.
 * Allows advancing the compile pipeline one stage at a time for debugging.
 */

import type { Connection, Star } from '@pax/common';
import type {
    CompiledTerritoryStateOk,
    CompilerConfig,
    FrontierGraph,
    MetricState,
    TerritoryRegion,
} from '../compiler/types';
import { executeMetricStage } from '../compiler/metricStage';
import { executeFrontierStage } from '../compiler/frontierStage';
import { executeRegionStage } from '../compiler/regionStage';

type StageId = 'metric' | 'frontier' | 'region' | 'done';

interface StepRunState {
    stars: Star[];
    connections: Connection[];
    playerIds: string[];
    config: CompilerConfig;
    metric: MetricState | null;
    frontier: FrontierGraph | null;
    regions: TerritoryRegion[] | null;
    nextStage: StageId;
    startedAt: number;
}

function isError(v: unknown): v is { kind: 'error' } {
    return (v as { kind?: string })?.kind === 'error';
}

export class TerritoryStepRunner {
    private runState: StepRunState | null = null;

    /** Initialize a new step run from scratch. */
    initRun(
        stars: Star[],
        connections: Connection[],
        playerIds: string[],
        config: CompilerConfig,
    ): void {
        this.runState = {
            stars,
            connections,
            playerIds,
            config,
            metric: null,
            frontier: null,
            regions: null,
            nextStage: 'metric',
            startedAt: Date.now(),
        };
    }

    /** Advance one stage. Returns the stage name executed, or null if done. */
    advanceStage(): StageId | null {
        const run = this.runState;
        if (!run || run.nextStage === 'done') return null;

        switch (run.nextStage) {
            case 'metric': {
                const result = executeMetricStage(
                    run.stars,
                    run.connections,
                    run.playerIds,
                    run.config.metric ?? {},
                );
                if (!isError(result)) {
                    run.metric = result;
                }
                run.nextStage = 'frontier';
                return 'metric';
            }
            case 'frontier': {
                if (!run.metric) {
                    run.nextStage = 'done';
                    return null;
                }
                const result = executeFrontierStage(
                    run.stars,
                    run.connections,
                    run.metric,
                    run.config.frontier ?? { worldBounds: run.config.worldBounds },
                );
                if (!isError(result)) {
                    run.frontier = result;
                }
                run.nextStage = 'region';
                return 'frontier';
            }
            case 'region': {
                if (!run.frontier || !run.metric) {
                    run.nextStage = 'done';
                    return null;
                }
                const result = executeRegionStage(
                    run.stars,
                    run.connections,
                    run.frontier,
                    run.metric,
                    run.config.region ?? { worldBounds: run.config.worldBounds },
                );
                if (!isError(result)) {
                    run.regions = result;
                }
                run.nextStage = 'done';
                return 'region';
            }
        }
    }

    /** Current stage that will run on the next advanceStage(). */
    get nextStage(): StageId | null {
        return this.runState?.nextStage ?? null;
    }

    /** Whether the run is complete. */
    get isDone(): boolean {
        return this.runState?.nextStage === 'done';
    }

    /** Elapsed milliseconds since initRun(). */
    get elapsedMs(): number {
        return this.runState ? Date.now() - this.runState.startedAt : 0;
    }

    get metric(): MetricState | null {
        return this.runState?.metric ?? null;
    }

    get frontier(): FrontierGraph | null {
        return this.runState?.frontier ?? null;
    }

    get regions(): TerritoryRegion[] | null {
        return this.runState?.regions ?? null;
    }

    getState(): CompiledTerritoryStateOk | null {
        const run = this.runState;
        if (!run?.metric || !run.frontier || !run.regions) return null;
        return {
            kind: 'ok',
            metricTruth: run.metric,
            frontierGraph: run.frontier,
            fittedFrontiers: [],
            regions: run.regions,
            componentsByOwner: new Map(),
            transitionActive: false,
        };
    }

    /** Run all remaining stages at once. */
    runToCompletion(): void {
        while (!this.isDone) {
            this.advanceStage();
        }
    }

    reset(): void {
        this.runState = null;
    }
}
