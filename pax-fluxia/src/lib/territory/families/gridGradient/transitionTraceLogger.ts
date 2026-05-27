import { log } from '$lib/utils/logger';

export type GridGradientTransitionTraceState = Map<string, string>;

const ACTIVITY_COUNT_KEYS = new Set([
    'eventCount',
    'sessionCount',
    'activeEntryCount',
    'pendingConquestCount',
    'activeSessionCount',
    'transitionSessionCount',
    'activeTransitionCells',
    'activeDrawableTransitionCells',
    'activeMixingTransitionCells',
    'activeOffsetZoneTransitionCells',
    'orderedTransitionCells',
]);

const IDENTITY_KEYS = new Set([
    'sessionKey',
    'transitionKey',
    'planKey',
    'presentationKey',
    'frameSlot',
]);

const ACTIVE_BOOLEAN_KEYS = new Set([
    'present',
    'hasActiveTransition',
    'usingVisualTransition',
    'traceActive',
]);

const PROGRESS_KEYS = new Set(['progress', 'rawProgress', 'uProgress']);

export function createGridGradientTransitionTraceState(): GridGradientTransitionTraceState {
    return new Map();
}

function progressBucket(value: number): string {
    if (!Number.isFinite(value)) return 'nan';
    const clamped = Math.max(0, Math.min(1, value));
    return (Math.round(clamped * 4) / 4).toFixed(2);
}

function collectTraceParts(
    value: unknown,
    key: string,
    parts: string[],
    activity: { present: boolean },
    visited: WeakSet<object>,
    depth: number,
): void {
    if (depth > 5 || value === null || value === undefined) return;

    if (typeof value === 'boolean') {
        if (value && ACTIVE_BOOLEAN_KEYS.has(key)) {
            activity.present = true;
            parts.push(`${key}:true`);
        }
        return;
    }

    if (typeof value === 'number') {
        if (ACTIVITY_COUNT_KEYS.has(key)) {
            if (value > 0) activity.present = true;
            parts.push(`${key}:${value}`);
            return;
        }
        if (PROGRESS_KEYS.has(key)) {
            parts.push(`${key}:${progressBucket(value)}`);
        }
        return;
    }

    if (typeof value === 'string') {
        if (IDENTITY_KEYS.has(key)) {
            parts.push(`${key}:${value}`);
        } else if (key === 'visibleFrameState' && value === 'transition') {
            activity.present = true;
            parts.push(`${key}:${value}`);
        } else if (key === 'clockSource' && value !== 'none') {
            parts.push(`${key}:${value}`);
        }
        return;
    }

    if (Array.isArray(value)) {
        if (key === 'events' && value.length > 0) {
            activity.present = true;
            parts.push(`events:${value.length}`);
        }
        for (const item of value.slice(0, 8)) {
            collectTraceParts(item, key, parts, activity, visited, depth + 1);
        }
        return;
    }

    if (typeof value !== 'object') return;
    if (visited.has(value)) return;
    visited.add(value);

    const entries = Object.entries(value as Record<string, unknown>);
    for (const [childKey, childValue] of entries.slice(0, 80)) {
        collectTraceParts(
            childValue,
            childKey,
            parts,
            activity,
            visited,
            depth + 1,
        );
    }
}

export function logGridGradientTransitionTrace(params: {
    readonly enabled: boolean;
    readonly state: GridGradientTransitionTraceState;
    readonly stage: string;
    readonly label: string;
    readonly data: Record<string, unknown>;
}): void {
    if (!params.enabled) return;

    const parts: string[] = [];
    const activity = { present: false };
    collectTraceParts(params.data, '', parts, activity, new WeakSet(), 0);
    if (!activity.present) return;

    const activityKey = [...new Set(parts)].sort().join('|');
    if (params.state.get(params.stage) === activityKey) return;
    params.state.set(params.stage, activityKey);
    log.renderer('GG_TRANSITION', `[GG_TRANSITION] ${params.label}`, params.data);
}
