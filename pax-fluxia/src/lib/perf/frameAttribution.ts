interface PerfEventLike {
    readonly name: string;
    readonly atMs: number;
    readonly detail?: Record<string, unknown> | null;
}

interface FrameWindow {
    readonly frameMs: number;
    readonly startAtMs: number;
    readonly endAtMs: number;
}

export interface FramePerfMeasureAttribution {
    readonly name: string;
    readonly durationMs: number;
    readonly overlapMs: number;
    readonly startOffsetMs: number;
    readonly endOffsetMs: number;
    readonly detail?: Record<string, unknown> | null;
}

export interface FramePerfAttribution {
    readonly measuredOverlapMs: number;
    readonly unattributedFrameMs: number;
    readonly measures: FramePerfMeasureAttribution[];
}

function finiteNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function roundMs(value: number): number {
    return Number(value.toFixed(3));
}

function mergeMeasuredIntervals(
    intervals: Array<{ startMs: number; endMs: number }>,
): number {
    if (intervals.length === 0) return 0;
    const sorted = [...intervals].sort((a, b) => a.startMs - b.startMs);
    let total = 0;
    let currentStart = sorted[0].startMs;
    let currentEnd = sorted[0].endMs;
    for (let i = 1; i < sorted.length; i += 1) {
        const next = sorted[i];
        if (next.startMs <= currentEnd) {
            currentEnd = Math.max(currentEnd, next.endMs);
            continue;
        }
        total += currentEnd - currentStart;
        currentStart = next.startMs;
        currentEnd = next.endMs;
    }
    total += currentEnd - currentStart;
    return total;
}

function isCadenceOnlyMeasure(name: string): boolean {
    return name === 'game.frameLoop.interval' || name === 'game.pixi.ticker.interval';
}

export function summarizeFramePerfAttribution(
    events: readonly PerfEventLike[],
    frame: FrameWindow,
    limit = 8,
): FramePerfAttribution {
    const measures: FramePerfMeasureAttribution[] = [];
    const intervals: Array<{ startMs: number; endMs: number }> = [];
    for (const event of events) {
        if (isCadenceOnlyMeasure(event.name)) continue;
        const detail = event.detail;
        if (!detail || detail.kind !== 'measure') continue;
        const startTimeMs = finiteNumber(detail.startTimeMs);
        const endTimeMs = finiteNumber(detail.endTimeMs);
        const durationMs = finiteNumber(detail.durationMs);
        if (startTimeMs === null || endTimeMs === null || durationMs === null) {
            continue;
        }
        const overlapStartMs = Math.max(startTimeMs, frame.startAtMs);
        const overlapEndMs = Math.min(endTimeMs, frame.endAtMs);
        const overlapMs = overlapEndMs - overlapStartMs;
        if (overlapMs <= 0) continue;
        intervals.push({ startMs: overlapStartMs, endMs: overlapEndMs });
        measures.push({
            name: event.name,
            durationMs: roundMs(durationMs),
            overlapMs: roundMs(overlapMs),
            startOffsetMs: roundMs(startTimeMs - frame.startAtMs),
            endOffsetMs: roundMs(endTimeMs - frame.startAtMs),
            detail,
        });
    }

    const measuredOverlapMs = Math.min(
        frame.frameMs,
        mergeMeasuredIntervals(intervals),
    );
    measures.sort(
        (a, b) => b.overlapMs - a.overlapMs || b.durationMs - a.durationMs,
    );
    return {
        measuredOverlapMs: roundMs(measuredOverlapMs),
        unattributedFrameMs: roundMs(Math.max(0, frame.frameMs - measuredOverlapMs)),
        measures: measures.slice(0, Math.max(0, limit)),
    };
}
