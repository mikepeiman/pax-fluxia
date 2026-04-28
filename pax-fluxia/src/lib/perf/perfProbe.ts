type PerfDetail = Record<string, unknown> | null | undefined;

interface PerfMeasureAggregate {
    count: number;
    totalMs: number;
    maxMs: number;
    minMs: number;
    lastMs: number;
    samples: number[];
    detail?: PerfDetail;
}

interface PerfEventSample {
    name: string;
    atMs: number;
    detail?: PerfDetail;
}

export interface PerfCaptureSnapshot {
    measures: Record<string, PerfMeasureAggregate>;
    events: PerfEventSample[];
}

declare global {
    // eslint-disable-next-line no-var
    var __PAX_PERF_CAPTURE__:
        | boolean
        | undefined;
    // eslint-disable-next-line no-var
    var __PAX_PERF_USER_TIMING__:
        | boolean
        | undefined;
    // eslint-disable-next-line no-var
    var __PAX_PERF_STATE__:
        | PerfCaptureSnapshot
        | undefined;
}

const MAX_MEASURE_SAMPLES = 64;
// Long benchmark soaks need enough retained focus events to keep the
// worst late-run frame spikes attributable when we summarize afterward.
const MAX_EVENT_SAMPLES = 65536;
let browserObserversInstalled = false;

function perfNow(): number {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function isPerfCaptureEnabled(): boolean {
    return Boolean(globalThis.__PAX_PERF_CAPTURE__);
}

export function isPerfUserTimingEnabled(): boolean {
    return Boolean(globalThis.__PAX_PERF_USER_TIMING__);
}

export function setPerfUserTimingEnabled(enabled: boolean): void {
    globalThis.__PAX_PERF_USER_TIMING__ = enabled;
}

export function enablePerfCapture(): void {
    globalThis.__PAX_PERF_CAPTURE__ = true;
    ensureBrowserPerfObservers();
    resetPerfCapture();
}

export function disablePerfCapture(): void {
    globalThis.__PAX_PERF_CAPTURE__ = false;
}

function ensurePerfState(): PerfCaptureSnapshot {
    if (!globalThis.__PAX_PERF_STATE__) {
        globalThis.__PAX_PERF_STATE__ = {
            measures: {},
            events: [],
        };
    }
    return globalThis.__PAX_PERF_STATE__;
}

export function resetPerfCapture(): void {
    if (!isPerfCaptureEnabled()) return;
    globalThis.__PAX_PERF_STATE__ = {
        measures: {},
        events: [],
    };
}

export function snapshotPerfCapture(): PerfCaptureSnapshot | null {
    const snapshot = globalThis.__PAX_PERF_STATE__;
    return snapshot
        ? JSON.parse(JSON.stringify(snapshot)) as PerfCaptureSnapshot
        : null;
}

function pushPerfEventSample(
    state: PerfCaptureSnapshot,
    name: string,
    atMs: number,
    detail?: PerfDetail,
): void {
    state.events.push({
        name,
        atMs,
        detail,
    });
    if (state.events.length > MAX_EVENT_SAMPLES) {
        state.events.splice(0, state.events.length - MAX_EVENT_SAMPLES);
    }
}

export function recordPerfEvent(name: string, detail?: PerfDetail): void {
    if (!isPerfCaptureEnabled()) return;
    const state = ensurePerfState();
    pushPerfEventSample(
        state,
        name,
        perfNow(),
        sanitizePerfDetail(detail),
    );
}

export function recordPerfDuration(
    name: string,
    durationMs: number,
    detail?: PerfDetail,
    startedAtMs?: number,
): void {
    if (!isPerfCaptureEnabled()) return;
    const state = ensurePerfState();
    const sanitizedDetail = sanitizePerfDetail(detail);
    const aggregate = state.measures[name] ?? {
        count: 0,
        totalMs: 0,
        maxMs: 0,
        minMs: Number.POSITIVE_INFINITY,
        lastMs: 0,
        samples: [],
        detail: sanitizedDetail,
    };
    aggregate.count += 1;
    aggregate.totalMs += durationMs;
    aggregate.maxMs = Math.max(aggregate.maxMs, durationMs);
    aggregate.minMs = Math.min(aggregate.minMs, durationMs);
    aggregate.lastMs = durationMs;
    aggregate.detail = sanitizedDetail ?? aggregate.detail;
    aggregate.samples.push(durationMs);
    if (aggregate.samples.length > MAX_MEASURE_SAMPLES) {
        aggregate.samples.splice(0, aggregate.samples.length - MAX_MEASURE_SAMPLES);
    }
    state.measures[name] = aggregate;
    const eventStartedAtMs =
        typeof startedAtMs === "number" && Number.isFinite(startedAtMs)
            ? startedAtMs
            : perfNow() - durationMs;
    pushPerfEventSample(state, name, eventStartedAtMs, {
        ...(sanitizedDetail ?? {}),
        kind: "measure",
        durationMs,
        startTimeMs: eventStartedAtMs,
        endTimeMs: eventStartedAtMs + durationMs,
    });
}

function sanitizePerfDetail(value: unknown): PerfDetail {
    if (
        value == null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
    ) {
        return { value };
    }
    if (typeof value !== "object") return { value: String(value) };
    try {
        return JSON.parse(JSON.stringify(value)) as PerfDetail;
    } catch {
        return { value: String(value) };
    }
}

function ensureBrowserPerfObservers(): void {
    if (
        browserObserversInstalled ||
        typeof window === "undefined" ||
        typeof PerformanceObserver === "undefined"
    ) {
        return;
    }

    const observe = (
        entryType: string,
        onEntry: (entry: PerformanceEntry) => void,
    ): void => {
        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    onEntry(entry);
                }
            });
            observer.observe({ type: entryType, buffered: true });
        } catch {
            // Ignore unsupported observers in narrower browser builds.
        }
    };

    observe("longtask", (entry) => {
        recordPerfEvent("browser.longtask", {
            durationMs: entry.duration,
            startTimeMs: entry.startTime,
            name: entry.name,
            entryType: entry.entryType,
        });
    });

    observe("paint", (entry) => {
        recordPerfEvent("browser.paint", {
            durationMs: entry.duration,
            startTimeMs: entry.startTime,
            name: entry.name,
        });
    });

    observe("layout-shift", (entry) => {
        const shift = entry as PerformanceEntry & {
            value?: number;
            hadRecentInput?: boolean;
            sources?: unknown[];
        };
        recordPerfEvent("browser.layoutShift", {
            durationMs: entry.duration,
            startTimeMs: entry.startTime,
            value: typeof shift.value === "number" ? shift.value : 0,
            hadRecentInput: Boolean(shift.hadRecentInput),
            sourceCount: Array.isArray(shift.sources) ? shift.sources.length : 0,
        });
    });

    observe("largest-contentful-paint", (entry) => {
        const lcp = entry as PerformanceEntry & {
            renderTime?: number;
            loadTime?: number;
            size?: number;
            url?: string;
        };
        recordPerfEvent("browser.lcp", {
            startTimeMs: entry.startTime,
            renderTimeMs:
                typeof lcp.renderTime === "number" ? lcp.renderTime : 0,
            loadTimeMs: typeof lcp.loadTime === "number" ? lcp.loadTime : 0,
            size: typeof lcp.size === "number" ? lcp.size : 0,
            url: typeof lcp.url === "string" ? lcp.url : null,
        });
    });

    observe("long-animation-frame", (entry) => {
        const longFrame = entry as PerformanceEntry & {
            blockingDuration?: number;
            scripts?: Array<{ duration?: number; sourceURL?: string }>;
        };
        recordPerfEvent("browser.longAnimationFrame", {
            durationMs: entry.duration,
            startTimeMs: entry.startTime,
            blockingDurationMs:
                typeof longFrame.blockingDuration === "number"
                    ? longFrame.blockingDuration
                    : 0,
            scriptCount: Array.isArray(longFrame.scripts)
                ? longFrame.scripts.length
                : 0,
            topScriptUrl:
                Array.isArray(longFrame.scripts) &&
                typeof longFrame.scripts[0]?.sourceURL === "string"
                    ? longFrame.scripts[0].sourceURL
                    : null,
        });
    });

    observe("event", (entry) => {
        const detail = entry as PerformanceEventTiming & {
            interactionId?: number;
        };
        recordPerfEvent("browser.eventTiming", {
            name: detail.name,
            durationMs: detail.duration,
            startTimeMs: detail.startTime,
            processingStartMs: detail.processingStart,
            processingEndMs: detail.processingEnd,
            interactionId: typeof detail.interactionId === "number"
                ? detail.interactionId
                : undefined,
        });
    });

    browserObserversInstalled = true;
}

function mark(label: string): void {
    if (typeof performance === "undefined" || typeof performance.mark !== "function") {
        return;
    }
    performance.mark(label);
}

function measure(label: string, startLabel: string, endLabel: string): void {
    if (typeof performance === "undefined" || typeof performance.measure !== "function") {
        return;
    }
    try {
        performance.measure(label, startLabel, endLabel);
    } catch {
        // Ignore mark/measure failures in environments with partial support.
    }
}

function clearMark(label: string): void {
    if (typeof performance === "undefined" || typeof performance.clearMarks !== "function") {
        return;
    }
    performance.clearMarks(label);
}

export function measurePerf<T>(
    name: string,
    fn: () => T,
    detail?: PerfDetail,
): T {
    if (!isPerfCaptureEnabled()) {
        return fn();
    }
    const id = `${name}:${Math.random().toString(36).slice(2)}`;
    const startLabel = `${id}:start`;
    const endLabel = `${id}:end`;
    const startedAt = perfNow();
    const captureUserTiming = isPerfUserTimingEnabled();
    if (captureUserTiming) {
        mark(startLabel);
    }
    try {
        return fn();
    } finally {
        if (captureUserTiming) {
            mark(endLabel);
            measure(name, startLabel, endLabel);
            clearMark(startLabel);
            clearMark(endLabel);
        }
        recordPerfDuration(
            name,
            perfNow() - startedAt,
            detail,
            startedAt,
        );
    }
}

export async function measurePerfAsync<T>(
    name: string,
    fn: () => Promise<T> | T,
    detail?: PerfDetail,
): Promise<T> {
    if (!isPerfCaptureEnabled()) {
        return await fn();
    }
    const id = `${name}:${Math.random().toString(36).slice(2)}`;
    const startLabel = `${id}:start`;
    const endLabel = `${id}:end`;
    const startedAt = perfNow();
    const captureUserTiming = isPerfUserTimingEnabled();
    if (captureUserTiming) {
        mark(startLabel);
    }
    try {
        return await fn();
    } finally {
        if (captureUserTiming) {
            mark(endLabel);
            measure(name, startLabel, endLabel);
            clearMark(startLabel);
            clearMark(endLabel);
        }
        recordPerfDuration(
            name,
            perfNow() - startedAt,
            detail,
            startedAt,
        );
    }
}
