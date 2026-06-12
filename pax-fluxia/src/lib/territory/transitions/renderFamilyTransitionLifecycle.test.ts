import { describe, expect, it } from 'vitest';
import type { ConquestEvent } from '@pax/common';
import {
    TerritoryTransitionState,
    type TerritoryTransitionEntry,
} from '$lib/fx/handlers/territoryTransitionHandler';
import { buildRenderFamilyTransitionLifecycle } from './renderFamilyTransitionLifecycle';

function makeConquestEvent(
    overrides: Partial<ConquestEvent> = {},
): ConquestEvent {
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
        ...overrides,
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

    it('keeps one stable session per conquest tick while exposing the newest session as activeTransition', () => {
        const older = makeEntry({
            event: makeConquestEvent({
                tick: 10,
                starId: 'target-a',
                previousOwner: 'red',
                newOwner: 'blue',
            }),
            starId: 'target-a',
            startTimeMs: 1000,
            durationMs: 400,
        });
        const newer = makeEntry({
            event: makeConquestEvent({
                tick: 11,
                starId: 'target-b',
                previousOwner: 'blue',
                newOwner: 'green',
            }),
            starId: 'target-b',
            startTimeMs: 1200,
            durationMs: 400,
        });

        const result = buildRenderFamilyTransitionLifecycle({
            nowMs: 1410,
            effectiveTickMs: 1000,
            activeEntries: [older, newer],
        });

        expect(result.activeTransition).not.toBeNull();
        expect(result.activeTransition?.startedAtMs).toBe(1200);
        expect(result.activeTransition?.events.map((entry) => entry.event.starId)).toEqual([
            'target-b',
        ]);
        expect(result.activeTransition?.progress).toBeCloseTo(0.525);
        expect(result.activeSessions.map((session) => session.events.map((entry) => entry.event.starId))).toEqual([
            ['target-a'],
            ['target-b'],
        ]);
        expect(result.terminalFrameStarIds).toEqual(['target-a']);
    });

    it('keeps same-start-time conquests batched into one render-family transition', () => {
        const left = makeEntry({
            event: makeConquestEvent({
                tick: 12,
                starId: 'left',
                previousOwner: 'red',
                newOwner: 'blue',
            }),
            starId: 'left',
            startTimeMs: 1600,
        });
        const right = makeEntry({
            event: makeConquestEvent({
                tick: 12,
                starId: 'right',
                previousOwner: 'yellow',
                newOwner: 'green',
            }),
            starId: 'right',
            startTimeMs: 1600,
        });

        const result = buildRenderFamilyTransitionLifecycle({
            nowMs: 1700,
            effectiveTickMs: 1000,
            activeEntries: [left, right],
        });

        expect(result.activeTransition).not.toBeNull();
        expect(result.activeTransition?.startedAtMs).toBe(1600);
        expect(result.activeTransition?.events.map((entry) => entry.event.starId)).toEqual([
            'left',
            'right',
        ]);
        expect(result.activeSessions).toHaveLength(1);
        expect(result.activeSessions[0]?.sessionKey).toContain('tick:12:');
    });

    it('keeps pending conquest previews separated by tick and still marks the newest as activeTransition', () => {
        const result = buildRenderFamilyTransitionLifecycle({
            nowMs: 2000,
            effectiveTickMs: 1000,
            activeEntries: [],
            pendingConquests: [
                makeConquestEvent({
                    tick: 20,
                    starId: 'older',
                    previousOwner: 'red',
                    newOwner: 'blue',
                }),
                makeConquestEvent({
                    tick: 21,
                    starId: 'newer',
                    previousOwner: 'blue',
                    newOwner: 'green',
                }),
            ],
        });

        expect(result.activeTransition).not.toBeNull();
        expect(result.activeTransition?.events.map((entry) => entry.event.starId)).toEqual([
            'newer',
        ]);
        expect(result.activeSessions.map((session) => session.events.map((entry) => entry.event.starId))).toEqual([
            ['older'],
            ['newer'],
        ]);
        expect(result.activeTransition?.events[0]?.progress).toBe(0);
        expect(result.terminalFrameStarIds).toEqual([]);
    });

    it('advances pending conquest previews from a stable first-seen time', () => {
        const event = makeConquestEvent({ tick: 20, starId: 'preview' });
        const key = '20:preview:red:blue';
        const result = buildRenderFamilyTransitionLifecycle({
            nowMs: 2120,
            effectiveTickMs: 1000,
            activeEntries: [],
            pendingConquests: [event],
            pendingConquestStartedAtMsByKey: new Map([[key, 2000]]),
        });

        expect(result.activeTransition?.events[0]?.event.starId).toBe('preview');
        expect(result.activeTransition?.startedAtMs).toBe(2000);
        expect(result.activeTransition?.progress).toBeGreaterThan(0);
        expect(result.activeTransition?.progress).toBeCloseTo(0.12);
    });

    it('preserves pending preview progress when the handler-owned active entry arrives', () => {
        const event = makeConquestEvent({ tick: 22, starId: 'handoff' });
        const key = '22:handoff:red:blue';
        const result = buildRenderFamilyTransitionLifecycle({
            nowMs: 2180,
            effectiveTickMs: 1000,
            activeEntries: [
                makeEntry({
                    event,
                    starId: event.starId,
                    startTimeMs: 2100,
                    durationMs: 400,
                }),
            ],
            pendingConquestStartedAtMsByKey: new Map([[key, 2000]]),
        });

        expect(result.activeTransition?.events[0]?.event.starId).toBe('handoff');
        expect(result.activeTransition?.startedAtMs).toBe(2000);
        expect(result.activeTransition?.progress).toBeCloseTo(0.45);
    });

    it('preserves entry duration through the lifecycle so downstream families can see 200ms vs 1500ms', () => {
        const short = buildRenderFamilyTransitionLifecycle({
            nowMs: 1100,
            effectiveTickMs: 1000,
            activeEntries: [makeEntry({ durationMs: 200 })],
        });
        const long = buildRenderFamilyTransitionLifecycle({
            nowMs: 1750,
            effectiveTickMs: 1000,
            activeEntries: [makeEntry({ durationMs: 1500 })],
        });

        expect(short.activeTransition?.durationMs).toBe(200);
        expect(long.activeTransition?.durationMs).toBe(1500);
        expect(short.activeTransition?.events[0]?.durationMs).toBe(200);
        expect(long.activeTransition?.events[0]?.durationMs).toBe(1500);
    });
});
