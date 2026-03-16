/**
 * territory/devtools/TerritoryStepRunner.ts
 *
 * Class-encapsulated interactive step-runner for the new canonical pipeline.
 *
 * Allows advancing the compile pipeline one stage at a time for debugging.
 * Replaces the module-level mutable interactiveRunState in engine.ts.
 *
 * Usage:
 *   const runner = new TerritoryStepRunner(compiler);
 *   runner.initRun(input);
 *   runner.advanceStage(); // repeat per user keypress / TERRITORY_ENGINE_STEP_ADVANCE_TOKEN
 *   runner.getState();    // CanonicalTerritoryStateOk | null after completion
 *
 * Rules:
 * - All state class-encapsulated — no module-level globals
 * - No PIXI imports
 * - No rendering calls
 */

import type { Star, Connection } from '@pax/common';
import { TerritoryCompiler } from '../compiler/TerritoryCompiler';
import type {
    CanonicalTerritoryStateOk,
    CompilerConfig,
    MetricState,
    FrontierGraph,
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
        const r = this.runState;
        if (!r || r.nextStage === 'done') return null;

        switch (r.nextStage) {
            case 'metric': {
                const result = executeMetricStage(r.stars, r.connections, r.playerIds, r.config.metric ?? {});
                if (!isError(result)) {
                    r.metric = result as MetricState;
                }
                r.nextStage = 'frontier';
                return 'metric';
            }
            case 'frontier': {
                if (!r.metric) { r.nextStage = 'done'; return null; }
                const result = executeFrontierStage(
                    r.stars, r.connections, r.metric,
                    r.config.frontier ?? { worldBounds: r.config.worldBounds }
                );
                if (!isError(result)) r.frontier = result as FrontierGraph;
                r.nextStage = 'region';
                return 'frontier';
            }
            case 'region': {
                if (!r.frontier || !r.metric) { r.nextStage = 'done'; return null; }
                const result = executeRegionStage(
                    r.stars, r.connections, r.frontier, r.metric,
                    r.config.region ?? { worldBounds: r.config.worldBounds }
                );
                if (!isError(result)) r.regions = result as TerritoryRegion[];
                r.nextStage = 'done';
                return 'region';
            }
        }
        return null;
    }

    /** Current stage that will run on next advanceStage(). */
    get nextStage(): StageId | null {
        return this.runState?.nextStage ?? null;
    }

    /** Whether the run is complete (all stages executed). */
    get isDone(): boolean {
        return this.runState?.nextStage === 'done';
    }

    /** Elapsed ms since initRun(). */
    get elapsedMs(): number {
        return this.runState ? Date.now() - this.runState.startedAt : 0;
    }

    /** Current metric state (null until metric stage completes). */
    get metric(): MetricState | null {
        return this.runState?.metric ?? null;
    }

    /** Current frontier graph (null until frontier stage completes). */
    get frontier(): FrontierGraph | null {
        return this.runState?.frontier ?? null;
    }

    /** Current regions (null until region stage completes). */
    get regions(): TerritoryRegion[] | null {
        return this.runState?.regions ?? null;
    }

    /** Run all remaining stages at once (bypass step mode). */
    runToCompletion(): void {
        while (!this.isDone) {
            this.advanceStage();
        }
    }

    /** Reset to clean state. */
    reset(): void {
        this.runState = null;
    }
}
