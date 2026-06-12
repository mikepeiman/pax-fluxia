import { afterEach, describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '$lib/config/game.config';
import { buildConquestStarOwnerPendingState } from './conquestStarOwnerTransition';
import { resolveTerritoryTransitionDurationMs } from './territoryTransitionHandler';

const originalTransitionBindToTick = GAME_CONFIG.TERRITORY_TRANSITION_BIND_TO_TICK;
const originalTransitionMs = GAME_CONFIG.TERRITORY_TRANSITION_MS;
const originalColorDelayTicks = GAME_CONFIG.CONQUEST_COLOR_DELAY_TICKS;

afterEach(() => {
    GAME_CONFIG.TERRITORY_TRANSITION_BIND_TO_TICK = originalTransitionBindToTick;
    GAME_CONFIG.TERRITORY_TRANSITION_MS = originalTransitionMs;
    GAME_CONFIG.CONQUEST_COLOR_DELAY_TICKS = originalColorDelayTicks;
});

describe('buildConquestStarOwnerPendingState', () => {
    it('uses territory transition timing for star owner blend duration', () => {
        GAME_CONFIG.TERRITORY_TRANSITION_BIND_TO_TICK = true;
        GAME_CONFIG.TERRITORY_TRANSITION_MS = 900;
        GAME_CONFIG.CONQUEST_COLOR_DELAY_TICKS = 5;

        const pending = buildConquestStarOwnerPendingState({
            previousOwner: 'A',
            newOwner: 'B',
            gameTime: 1_000,
            effectiveTickMs: 300,
        });

        expect(pending.startedAtMs).toBe(1_000);
        expect(pending.durationMs).toBe(
            resolveTerritoryTransitionDurationMs(300),
        );
        expect(pending.durationMs).toBe(300);
        expect(pending.transitionTime).toBe(2_500);
    });
});
