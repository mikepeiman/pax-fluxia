/**
 * territory/engine/TerritoryEngineController.ts
 *
 * Orchestrates config resolution, compiler invocation, cache building,
 * and render dispatch. Holds the TransitionPlan reference between frames.
 *
 * Rules:
 * - No module-level mutable state (all state is class-encapsulated)
 * - No global animation state
 * - Fingerprinting ensures compiler only runs on dirty inputs
 */

import type { Star, Connection } from '@pax/common';
import { GAME_CONFIG } from '$lib/config/game.config';
import { log } from '$lib/utils/logger';
import { TerritoryCompiler } from '../compiler/TerritoryCompiler';
import { planTransition } from '../compiler/TerritoryTransitionPlanner';
import type {
    CompiledTerritoryStateOk,
    CompilerConfig,
    TransitionPlan,
} from '../compiler/types';

export interface ControllerInput {
    stars: Star[];
    connections: Connection[];
    playerIds: string[];
    worldWidth: number;
    worldHeight: number;
    config?: Partial<CompilerConfig>;
}

function isOk(s: unknown): s is CompiledTerritoryStateOk {
    return (s as CompiledTerritoryStateOk)?.kind === 'ok';
}

function buildFingerprint(input: ControllerInput): string {
    const starSig = input.stars
        .map((s) => `${s.id}:${s.ownerId}`)
        .sort()
        .join(',');
    const connSig = input.connections
        .map((c) => `${c.sourceId}-${c.targetId}:${c.distance}`)
        .sort()
        .join(',');
    const confSig = JSON.stringify(input.config ?? {});
    return `${starSig}|${connSig}|${confSig}`;
}

export class TerritoryEngineController {
    private compiler = new TerritoryCompiler();
    private currentState: CompiledTerritoryStateOk | null = null;
    private currentTransitionPlan: TransitionPlan | null = null;
    private lastFingerprint = '';
    private transitionDurationMs: number;

    constructor(options: { transitionDurationMs?: number } = {}) {
        this.transitionDurationMs = options.transitionDurationMs ?? 600;
    }

    /**
     * Called every frame (or on input change).
     * Returns the current compiled state and any active transition plan.
     * Only re-compiles when inputs have changed.
     */
    update(input: ControllerInput, nowMs: number): {
        state: CompiledTerritoryStateOk | null;
        transitionPlan: TransitionPlan | null;
    } {
        const fingerprint = buildFingerprint(input);

        if (fingerprint !== this.lastFingerprint) {
            this.lastFingerprint = fingerprint;
            this._recompile(input, nowMs);
        }

        return {
            state: this.currentState,
            transitionPlan: this.currentTransitionPlan,
        };
    }

    /** Force a recompile regardless of fingerprint (e.g. on style change). */
    invalidate(): void {
        this.lastFingerprint = '';
    }

    /** Access current compiled state without triggering recompile. */
    getState(): CompiledTerritoryStateOk | null {
        return this.currentState;
    }

    // -------------------------------------------------------------------------
    // Private
    // -------------------------------------------------------------------------

    private _recompile(input: ControllerInput, nowMs: number): void {
        const worldBounds = {
            minX: 0,
            minY: 0,
            maxX: input.worldWidth,
            maxY: input.worldHeight,
        };

        const compilerConfig: CompilerConfig = {
            worldBounds,
            metric: { minStarRadius: input.config?.metric?.minStarRadius ?? 0 },
            frontier: { worldBounds, minStarRadius: input.config?.metric?.minStarRadius ?? 0 },
            region: { worldBounds },
            family: input.config?.family ?? 'straight',
            fitter: input.config?.fitter,
        };

        const newState = this.compiler.compile(
            input.stars,
            input.connections,
            input.playerIds,
            compilerConfig,
        );

        if (!isOk(newState)) {
            log.error('TerritoryEngineController', 'compile error', newState);
            // On recoverable error, keep previous state
            if (newState.recoverable && this.currentState) return;
            this.currentState = null;
            this.currentTransitionPlan = null;
            return;
        }

        // Plan transition if we have a previous state (or forced by debug flag)
        if (this.currentState || GAME_CONFIG.DEBUG_DY4_FORCE_TRANSITION_START) {
            const prevState = this.currentState || newState;
            newState.transitionActive = true;

            const plan = planTransition(prevState, newState, nowMs, this.transitionDurationMs);
            if ((plan as { kind?: string }).kind === 'error') {
                log.error('TerritoryEngineController', 'transition plan error', plan);
                this.currentTransitionPlan = null;
            } else {
                this.currentTransitionPlan = plan as TransitionPlan;
                log.renderer('DY4:CONQUEST', JSON.stringify({
                    fillStarted: true,
                    smoothStarted: true,
                    segmentStarted: false,
                    prevFillWasNull: !this.currentState,
                    transitionMs: this.transitionDurationMs,
                }));
            }
        } else {
            this.currentTransitionPlan = null;
        }

        this.currentState = newState;
    }
}
