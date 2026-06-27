import type { ConquestEvent } from '@pax/common';
import {
    buildTerritoryTransitionKey,
    resolveTerritoryTransitionDurationMs,
    type TerritoryTransitionEntry,
} from '$lib/fx/handlers/territoryTransitionHandler';
import type {
    RenderFamilyActiveTransition,
    RenderFamilyTransitionEvent,
    RenderFamilyTransitionSession,
} from '$lib/territory/families/RenderFamilyTypes';

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

interface LifecycleEvent extends RenderFamilyTransitionEvent {
    starIdToMark?: string;
    transitionKeyToMark?: string;
}

export interface RenderFamilyTransitionLifecycleResult {
    activeTransition: RenderFamilyActiveTransition | null;
    activeSessions: readonly RenderFamilyTransitionSession[];
    terminalFrameStarIds: readonly string[];
    terminalFrameTransitionKeys: readonly string[];
}

function buildSessionKey(events: ReadonlyArray<LifecycleEvent>): string {
    const tick = events[0]?.event.tick ?? -1;
    const conquestSig = events
        .map((event) => buildTerritoryTransitionKey(event.event))
        .sort()
        .join('|');
    return `tick:${tick}:${conquestSig}`;
}

function buildSession(
    events: ReadonlyArray<LifecycleEvent>,
): RenderFamilyTransitionSession {
    const sessionEvents = [...events].sort((a, b) => {
        if (a.startedAtMs !== b.startedAtMs) {
            return a.startedAtMs - b.startedAtMs;
        }
        return buildTerritoryTransitionKey(a.event).localeCompare(
            buildTerritoryTransitionKey(b.event),
        );
    });
    const normalizedEvents: RenderFamilyTransitionEvent[] = sessionEvents.map(
        ({
            starIdToMark: _starIdToMark,
            transitionKeyToMark: _transitionKeyToMark,
            ...event
        }) => event,
    );
    const startedAtMs = Math.min(
        ...normalizedEvents.map((event) => event.startedAtMs),
    );
    const durationMs = Math.max(
        ...normalizedEvents.map((event) => event.durationMs),
    );
    const rawProgress = Math.max(
        ...normalizedEvents.map((event) => event.rawProgress),
    );

    return {
        sessionKey: buildSessionKey(sessionEvents),
        conquestEvents: normalizedEvents.map((event) => event.event),
        events: normalizedEvents,
        startedAtMs,
        durationMs,
        rawProgress,
        progress: clamp01(rawProgress),
    };
}

export function buildRenderFamilyTransitionLifecycle(params: {
    nowMs: number;
    effectiveTickMs: number;
    activeEntries: ReadonlyArray<TerritoryTransitionEntry>;
    pendingConquests?: ReadonlyArray<ConquestEvent>;
    pendingConquestStartedAtMsByKey?: ReadonlyMap<string, number>;
}): RenderFamilyTransitionLifecycleResult {
    const eventsByKey = new Map<string, LifecycleEvent>();

    for (const entry of params.activeEntries) {
        const key = entry.transitionKey;
        const durationMs = Math.max(1, entry.durationMs);
        const startedAtMs =
            params.pendingConquestStartedAtMsByKey?.get(key) ??
            entry.startTimeMs;
        const rawProgress = (params.nowMs - startedAtMs) / durationMs;
        if (rawProgress > 1 && entry.terminalFrameRendered) continue;

        eventsByKey.set(key, {
            event: entry.event,
            startedAtMs,
            durationMs,
            rawProgress,
            progress: clamp01(rawProgress),
            starIdToMark:
                rawProgress >= 1 && !entry.terminalFrameRendered
                    ? entry.starId
                    : undefined,
            transitionKeyToMark:
                rawProgress >= 1 && !entry.terminalFrameRendered
                    ? key
                    : undefined,
        });
    }

    const previewDurationMs = resolveTerritoryTransitionDurationMs(
        params.effectiveTickMs,
    );
    if (previewDurationMs > 0) {
        for (const conquest of params.pendingConquests ?? []) {
            const key = buildTerritoryTransitionKey(conquest);
            if (eventsByKey.has(key)) continue;
            const startedAtMs =
                params.pendingConquestStartedAtMsByKey?.get(key) ??
                params.nowMs;
            eventsByKey.set(key, {
                event: conquest,
                startedAtMs,
                durationMs: previewDurationMs,
                rawProgress: (params.nowMs - startedAtMs) / previewDurationMs,
                progress: clamp01(
                    (params.nowMs - startedAtMs) / previewDurationMs,
                ),
            });
        }
    }

    const lifecycleEvents = [...eventsByKey.values()].sort(
        (a, b) => a.startedAtMs - b.startedAtMs,
    );
    if (lifecycleEvents.length === 0) {
        return {
            activeTransition: null,
            activeSessions: [],
            terminalFrameStarIds: [],
            terminalFrameTransitionKeys: [],
        };
    }

    const terminalFrameStarIds = [
        ...new Set(
            lifecycleEvents
                .map((event) => event.starIdToMark)
                .filter((starId): starId is string => Boolean(starId)),
        ),
    ];
    const terminalFrameTransitionKeys = [
        ...new Set(
            lifecycleEvents
                .map((event) => event.transitionKeyToMark)
                .filter((key): key is string => Boolean(key)),
        ),
    ];

    const eventsByTick = new Map<number, LifecycleEvent[]>();
    for (const event of lifecycleEvents) {
        const bucket = eventsByTick.get(event.event.tick);
        if (bucket) {
            bucket.push(event);
        } else {
            eventsByTick.set(event.event.tick, [event]);
        }
    }

    const activeSessions = [...eventsByTick.entries()]
        .sort((a, b) => {
            if (a[0] !== b[0]) return a[0] - b[0];
            const aStartedAtMs = Math.min(
                ...a[1].map((event) => event.startedAtMs),
            );
            const bStartedAtMs = Math.min(
                ...b[1].map((event) => event.startedAtMs),
            );
            return aStartedAtMs - bStartedAtMs;
        })
        .map(([, events]) => buildSession(events));
    const activeTransition =
        activeSessions.length > 0
            ? activeSessions[activeSessions.length - 1]
            : null;

    return {
        activeTransition,
        activeSessions,
        terminalFrameStarIds,
        terminalFrameTransitionKeys,
    };
}
