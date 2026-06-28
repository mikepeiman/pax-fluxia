import { afterEach, describe, expect, it } from 'vitest';
import type { ConquestEvent } from '@pax/common';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { FXContext } from '../types';
import {
    buildTerritoryTransitionKey,
    resolveTerritoryTransitionDurationMs,
    territoryTransitionHandler,
    territoryTransitions,
} from './territoryTransitionHandler';

const originalTransitionBindToTick = GAME_CONFIG.TERRITORY_TRANSITION_BIND_TO_TICK;
const originalTransitionMs = GAME_CONFIG.TERRITORY_TRANSITION_MS;

function makeConquestEvent(
    overrides: Partial<ConquestEvent> = {},
): ConquestEvent {
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
        ...overrides,
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
    GAME_CONFIG.TERRITORY_TRANSITION_BIND_TO_TICK = originalTransitionBindToTick;
    GAME_CONFIG.TERRITORY_TRANSITION_MS = originalTransitionMs;
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
        territoryTransitions.markConsumed(
            buildTerritoryTransitionKey(makeConquestEvent()),
        );

        territoryTransitionHandler.update?.(makeContext(799, 300));
        expect(territoryTransitions.activeCount).toBe(1);

        territoryTransitionHandler.update?.(makeContext(800, 300));
        expect(territoryTransitions.activeCount).toBe(0);
    });

    it('keeps repeated captures of the same star as separate active transitions', () => {
        const firstCapture = makeConquestEvent({
            tick: 12,
            previousOwner: 'A',
            newOwner: 'B',
        });
        const secondCapture = makeConquestEvent({
            tick: 13,
            previousOwner: 'B',
            newOwner: 'A',
        });

        territoryTransitionHandler.handle(firstCapture, makeContext(1000, 450));
        territoryTransitionHandler.handle(secondCapture, makeContext(1100, 450));

        const entries = territoryTransitions.getActiveEntries();
        expect(entries).toHaveLength(2);
        expect(entries.map((entry) => entry.transitionKey)).toEqual([
            buildTerritoryTransitionKey(firstCapture),
            buildTerritoryTransitionKey(secondCapture),
        ]);
        expect(entries.map((entry) => entry.newOwner)).toEqual(['B', 'A']);
    });

    it('consumes only the exact same-star transition key', () => {
        const firstCapture = makeConquestEvent({
            tick: 12,
            previousOwner: 'A',
            newOwner: 'B',
        });
        const secondCapture = makeConquestEvent({
            tick: 13,
            previousOwner: 'B',
            newOwner: 'A',
        });
        const firstKey = buildTerritoryTransitionKey(firstCapture);
        const secondKey = buildTerritoryTransitionKey(secondCapture);

        territoryTransitionHandler.handle(firstCapture, makeContext(1000, 450));
        territoryTransitionHandler.handle(secondCapture, makeContext(1100, 450));
        territoryTransitions.markConsumed(firstKey);

        const entriesByKey = new Map(
            territoryTransitions
                .getActiveEntries()
                .map((entry) => [entry.transitionKey, entry]),
        );
        expect(entriesByKey.get(firstKey)?.consumed).toBe(true);
        expect(entriesByKey.get(secondKey)?.consumed).toBe(false);
    });

    it('marks terminal frames only for exact same-star transition keys', () => {
        const firstCapture = makeConquestEvent({
            tick: 12,
            previousOwner: 'A',
            newOwner: 'B',
        });
        const secondCapture = makeConquestEvent({
            tick: 13,
            previousOwner: 'B',
            newOwner: 'A',
        });
        const firstKey = buildTerritoryTransitionKey(firstCapture);
        const secondKey = buildTerritoryTransitionKey(secondCapture);

        territoryTransitionHandler.handle(firstCapture, makeContext(1000, 450));
        territoryTransitionHandler.handle(secondCapture, makeContext(1100, 450));
        territoryTransitions.markTerminalFrameRendered([firstKey]);

        const entriesByKey = new Map(
            territoryTransitions
                .getActiveEntries()
                .map((entry) => [entry.transitionKey, entry]),
        );
        expect(entriesByKey.get(firstKey)?.terminalFrameRendered).toBe(true);
        expect(entriesByKey.get(secondKey)?.terminalFrameRendered).toBe(false);
    });
});
