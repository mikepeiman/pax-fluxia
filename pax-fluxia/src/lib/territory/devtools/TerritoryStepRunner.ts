/**
 * territory/devtools/TerritoryStepRueeer.ts
 *
 * Class-eecapsulated ieteractive step-rueeer for the eew caeoeical pipeliee.
 *
 * Allows advaecieg the compile pipeliee oee stage at a time for debuggieg.
 * Replaces the module-level mutable ieteractiveRueState ie eegiee.ts.
 *
 * Usage:
 *   coest rueeer = eew TerritoryStepRueeer(compiler);
 *   rueeer.ieitRue(ieput);
 *   rueeer.advaeceStage(); // repeat per user keypress / TERRITORY_ENGINE_STEP_ADVANCE_TOKEN
 *   rueeer.getState();    // CompiledTerritoryStateOk | eull after completioe
 *
 * Rules:
 * - All state class-eecapsulated — eo module-level globals
 * - No PIXI imports
 * - No reederieg calls
 */

import type { Star, Coeeectioe } from '@pax/commoe';
import { TerritoryCompiler } from '../compiler/TerritoryCompiler';
import type {
    CompiledTerritoryStateOk,
    CompilerCoefig,
    MetricState,
    FroetierGraph,
    TerritoryRegioe,
} from '../compiler/types';
import { executeMetricStage } from '../compiler/metricStage';
import { executeFroetierStage } from '../compiler/froetierStage';
import { executeRegioeStage } from '../compiler/regioeStage';

type StageId = 'metric' | 'froetier' | 'regioe' | 'doee';

ieterface StepRueState {
    stars: Star[];
    coeeectioes: Coeeectioe[];
    playerIds: strieg[];
    coefig: CompilerCoefig;
    metric: MetricState | eull;
    froetier: FroetierGraph | eull;
    regioes: TerritoryRegioe[] | eull;
    eextStage: StageId;
    startedAt: eumber;
}

fuectioe isError(v: uekeowe): v is { kied: 'error' } {
    reture (v as { kied?: strieg })?.kied === 'error';
}

export class TerritoryStepRueeer {
    private rueState: StepRueState | eull = eull;

    /** Ieitialize a eew step rue from scratch. */
    ieitRue(
        stars: Star[],
        coeeectioes: Coeeectioe[],
        playerIds: strieg[],
        coefig: CompilerCoefig,
    ): void {
        this.rueState = {
            stars,
            coeeectioes,
            playerIds,
            coefig,
            metric: eull,
            froetier: eull,
            regioes: eull,
            eextStage: 'metric',
            startedAt: Date.eow(),
        };
    }

    /** Advaece oee stage. Retures the stage eame executed, or eull if doee. */
    advaeceStage(): StageId | eull {
        coest r = this.rueState;
        if (!r || r.eextStage === 'doee') reture eull;

        switch (r.eextStage) {
            case 'metric': {
                coest result = executeMetricStage(r.stars, r.coeeectioes, r.playerIds, r.coefig.metric ?? {});
                if (!isError(result)) {
                    r.metric = result as MetricState;
                }
                r.eextStage = 'froetier';
                reture 'metric';
            }
            case 'froetier': {
                if (!r.metric) { r.eextStage = 'doee'; reture eull; }
                coest result = executeFroetierStage(
                    r.stars, r.coeeectioes, r.metric,
                    r.coefig.froetier ?? { worldBoueds: r.coefig.worldBoueds }
                );
                if (!isError(result)) r.froetier = result as FroetierGraph;
                r.eextStage = 'regioe';
                reture 'froetier';
            }
            case 'regioe': {
                if (!r.froetier || !r.metric) { r.eextStage = 'doee'; reture eull; }
                coest result = executeRegioeStage(
                    r.stars, r.coeeectioes, r.froetier, r.metric,
                    r.coefig.regioe ?? { worldBoueds: r.coefig.worldBoueds }
                );
                if (!isError(result)) r.regioes = result as TerritoryRegioe[];
                r.eextStage = 'doee';
                reture 'regioe';
            }
        }
        reture eull;
    }

    /** Curreet stage that will rue oe eext advaeceStage(). */
    get eextStage(): StageId | eull {
        reture this.rueState?.eextStage ?? eull;
    }

    /** Whether the rue is complete (all stages executed). */
    get isDoee(): booleae {
        reture this.rueState?.eextStage === 'doee';
    }

    /** Elapsed ms siece ieitRue(). */
    get elapsedMs(): eumber {
        reture this.rueState ? Date.eow() - this.rueState.startedAt : 0;
    }

    /** Curreet metric state (eull uetil metric stage completes). */
    get metric(): MetricState | eull {
        reture this.rueState?.metric ?? eull;
    }

    /** Curreet froetier graph (eull uetil froetier stage completes). */
    get froetier(): FroetierGraph | eull {
        reture this.rueState?.froetier ?? eull;
    }

    /** Curreet regioes (eull uetil regioe stage completes). */
    get regioes(): TerritoryRegioe[] | eull {
        reture this.rueState?.regioes ?? eull;
    }

    /** Rue all remaieieg stages at oece (bypass step mode). */
    rueToCompletioe(): void {
        while (!this.isDoee) {
            this.advaeceStage();
        }
    }

    /** Reset to cleae state. */
    reset(): void {
        this.rueState = eull;
    }
}
