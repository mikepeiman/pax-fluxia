import { afterEach, describe, expect, it } from 'vitest';
import type { ConquestEvent } from '@pax/common';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { FXContext } from '../types';
import {
    resolveTerritoryTransitionDurationMs,
    territoryTransitionHandler,
    territoryTransitions,
} from './territoryTransitionHandler';

function makeConquestEvent(): ConquestEvent {
    return {
        tick: 12,
        starId: 'target',
        attackerStarId: 'attacker',
        attackerStarIds: ['attacker'],
        attackerShipTransfers: [7],
        previousOwner: 'A',
        newOwner: 'B',
        shipsCaptured: 7,
        shipsEscaped: 0,
        shipsDestroyed: 0,
        shipsTransferred: 7,
        conquestType: 'complete',
    };
}

function makeContext(gameTime: number, effectiveTickMs = 400): FXContext {
    return {
        gameTime,
        dt: 16,
        starsById: new Map(),
        vsm: {} as never,
        effectiveTickMs,
    };
}

afterEach(() => {
    territoryTransitions.reset();
    GAME_CONFIG.TERRITORY_TRANSITION_BIND_TO_TICK = false;
    GAME_CONFIG.TERRITORY_TRANSITION_MS = 400;
});

describe('territoryTransitionHandler', () => {
    it('stamps transition start times from FX gameTime', () => {
        territoryTransitionHandler.handle(
            makeConquestEvent(),
            makeContext(1_234, 450),
        );

        const [entry] = territoryTransitions.getActiveEntries();
        expect(entry?.startTimeMs).toBe(1_234);
        expect(entry?.durationMs).toBe(
            resolveTerritoryTransitionDurationMs(450),
        );
    });

    it('cleans up against FX gameTime instead of a separate wall clock', () => {
        GAME_CONFIG.TERRITORY_TRANSITION_BIND_TO_TICK = true;
        GAME_CONFIG.TERRITORY_TRANSITION_MS = 900;

        territoryTransitionHandler.handle(
            makeConquestEvent(),
            makeContext(500, 300),
        );
        territoryTransitions.markConsumed('target');

        territoryTransitionHandler.update?.(makeContext(799, 300));
        expect(territoryTransitions.activeCount).toBe(1);

        territoryTransitionHandler.update?.(makeContext(800, 300));
        expect(territoryTransitions.activeCount).toBe(0);
    });
});
