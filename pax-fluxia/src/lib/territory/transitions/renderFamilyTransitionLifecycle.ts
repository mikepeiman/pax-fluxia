import type { ConquestEvent } from '@pax/common';
import {
    resolveTerritoryTransitionDurationMs,
    type TerritoryTransitionEntry,
} from '$lib/fx/handlers/territoryTransitionHandler';
import type {
    RenderFamilyActiveTransition,
    RenderFamilyTransitionEvent,
} from '$lib/territory/families/RenderFamilyTypes';

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function transitionIdentityKey(conquest: ConquestEvent): string {
    return [
        conquest.tick,
        conquest.starId,
        conquest.previousOwner,
        conquest.newOwner,
    ].join(':');
}

interface LifecycleEvent extends RenderFamilyTransitionEvent {
    starIdToMark?: string;
}

export interface RenderFamilyTransitionLifecycleResult {
    activeTransition: RenderFamilyActiveTransition | null;
    terminalFrameStarIds: readonly string[];
}

export function buildRenderFamilyTransitionLifecycle(params: {
    nowMs: number;
    effectiveTickMs: number;
    activeEntries: ReadonlyArray<TerritoryTransitionEntry>;
    pendingConquests?: ReadonlyArray<ConquestEvent>;
}): RenderFamilyTransitionLifecycleResult {
    const eventsByKey = new Map<string, LifecycleEvent>();

    for (const entry of params.activeEntries) {
        const durationMs = Math.max(1, entry.durationMs);
        const rawProgress = (params.nowMs - entry.startTimeMs) / durationMs;
        if (rawProgress > 1 && entry.terminalFrameRendered) continue;

        eventsByKey.set(transitionIdentityKey(entry.event), {
            event: entry.event,
            startedAtMs: entry.startTimeMs,
            durationMs,
            rawProgress,
            progress: clamp01(rawProgress),
            starIdToMark:
                rawProgress >= 1 && !entry.terminalFrameRendered
                    ? entry.starId
                    : undefined,
        });
    }

    const previewDurationMs = resolveTerritoryTransitionDurationMs(
        params.effectiveTickMs,
    );
    if (previewDurationMs > 0) {
        for (const conquest of params.pendingConquests ?? []) {
            const key = transitionIdentityKey(conquest);
            if (eventsByKey.has(key)) continue;
            eventsByKey.set(key, {
                event: conquest,
                startedAtMs: params.nowMs,
                durationMs: previewDurationMs,
                rawProgress: 0,
                progress: 0,
            });
        }
    }

    const lifecycleEvents = [...eventsByKey.values()].sort(
        (a, b) => a.startedAtMs - b.startedAtMs,
    );
    if (lifecycleEvents.length === 0) {
        return {
            activeTransition: null,
            terminalFrameStarIds: [],
        };
    }

    const terminalFrameStarIds = [
        ...new Set(
            lifecycleEvents
                .map((event) => event.starIdToMark)
                .filter((starId): starId is string => Boolean(starId)),
        ),
    ];

    const activeTick = Math.max(
        ...lifecycleEvents.map((event) => event.event.tick),
    );
    const activeEvents = lifecycleEvents.filter(
        (event) => event.event.tick === activeTick,
    );

    const events: RenderFamilyTransitionEvent[] = activeEvents.map(
        ({ starIdToMark: _starIdToMark, ...event }) => event,
    );
    const startedAtMs = Math.min(...events.map((event) => event.startedAtMs));
    const durationMs = Math.max(...events.map((event) => event.durationMs));
    const rawProgress = Math.max(...events.map((event) => event.rawProgress));

    return {
        activeTransition: {
            conquestEvents: events.map((event) => event.event),
            events,
            startedAtMs,
            durationMs,
            rawProgress,
            progress: clamp01(rawProgress),
        },
        terminalFrameStarIds,
    };
}
