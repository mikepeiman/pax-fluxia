import { describe, expect, it } from 'vitest';
import type { ConquestEvent } from '@pax/common';
import {
    TerritoryTransitionState,
    type TerritoryTransitionEntry,
} from '$lib/fx/handlers/territoryTransitionHandler';
import { buildRenderFamilyTransitionLifecycle } from './renderFamilyTransitionLifecycle';

function makeConquestEvent(): ConquestEvent {
    return {
        tick: 10,
        starId: 'target',
        attackerStarId: 'attacker',
        attackerStarIds: ['attacker'],
        attackerShipTransfers: [5],
        previousOwner: 'red',
        newOwner: 'blue',
        shipsCaptured: 5,
        shipsEscaped: 0,
        shipsDestroyed: 0,
        shipsTransferred: 5,
        conquestType: 'complete',
    };
}

function makeEntry(overrides: Partial<TerritoryTransitionEntry> = {}): TerritoryTransitionEntry {
    const event = overrides.event ?? makeConquestEvent();
    return {
        event,
        starId: event.starId,
        attackerStarIds: event.attackerStarIds ?? [event.attackerStarId],
        previousOwner: event.previousOwner,
        newOwner: event.newOwner,
        startTimeMs: 1000,
        durationMs: 400,
        consumed: false,
        terminalFrameRendered: false,
        ...overrides,
    };
}

describe('buildRenderFamilyTransitionLifecycle', () => {
    it('keeps an exact terminal frame at rawProgress=1 instead of dropping the transition', () => {
        const result = buildRenderFamilyTransitionLifecycle({
            nowMs: 1400,
            effectiveTickMs: 1000,
            activeEntries: [makeEntry()],
        });

        expect(result.activeTransition).not.toBeNull();
        expect(result.activeTransition?.events).toHaveLength(1);
        expect(result.activeTransition?.events[0]?.rawProgress).toBe(1);
        expect(result.activeTransition?.events[0]?.progress).toBe(1);
        expect(result.terminalFrameStarIds).toEqual(['target']);
    });

    it('keeps one clamped overshoot frame for render-family consumers before retirement', () => {
        const result = buildRenderFamilyTransitionLifecycle({
            nowMs: 1425,
            effectiveTickMs: 1000,
            activeEntries: [makeEntry()],
        });

        expect(result.activeTransition).not.toBeNull();
        expect(result.activeTransition?.events[0]?.rawProgress).toBeGreaterThan(1);
        expect(result.activeTransition?.events[0]?.progress).toBe(1);
        expect(result.terminalFrameStarIds).toEqual(['target']);
    });

    it('removes transitions only after a terminal frame has rendered once', () => {
        const state = new TerritoryTransitionState();
        state.add(makeEntry());

        state.cleanup(1450);
        expect(state.activeCount).toBe(1);

        const lifecycle = buildRenderFamilyTransitionLifecycle({
            nowMs: 1450,
            effectiveTickMs: 1000,
            activeEntries: state.getActiveEntries(),
        });
        expect(lifecycle.terminalFrameStarIds).toEqual(['target']);

        state.markTerminalFrameRendered(lifecycle.terminalFrameStarIds);
        state.cleanup(1466);
        expect(state.activeCount).toBe(0);
    });

    it('still allows legacy consumed transitions to retire without terminal-frame bookkeeping', () => {
        const state = new TerritoryTransitionState();
        state.add(makeEntry({ consumed: true }));

        state.cleanup(1466);
        expect(state.activeCount).toBe(0);
    });
});
