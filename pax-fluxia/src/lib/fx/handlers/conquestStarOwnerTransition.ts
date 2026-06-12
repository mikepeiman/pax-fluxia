import { GAME_CONFIG } from '$lib/config/game.config';
import type { PendingConquestState } from '../VisualStateManager';
import { resolveTerritoryTransitionDurationMs } from './territoryTransitionHandler';

export interface BuildConquestStarOwnerPendingStateParams {
    readonly previousOwner: string;
    readonly newOwner: string;
    readonly gameTime: number;
    readonly effectiveTickMs: number;
}

export function buildConquestStarOwnerPendingState(
    params: BuildConquestStarOwnerPendingStateParams,
): PendingConquestState {
    const colorDelay = (GAME_CONFIG.CONQUEST_COLOR_DELAY_TICKS ?? 2) *
        params.effectiveTickMs;
    const transitionMs = resolveTerritoryTransitionDurationMs(
        params.effectiveTickMs,
    );

    return {
        previousOwner: params.previousOwner,
        newOwner: params.newOwner,
        startedAtMs: params.gameTime,
        durationMs: transitionMs,
        transitionTime: params.gameTime + colorDelay,
    };
}
