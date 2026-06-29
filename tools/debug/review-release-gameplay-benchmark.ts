import {
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    writeFileSync,
} from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

type JsonValue =
    | null
    | string
    | number
    | boolean
    | JsonValue[]
    | { [key: string]: JsonValue };

type CdpMessage = {
    id?: number;
    method?: string;
    params?: Record<string, JsonValue>;
    result?: Record<string, JsonValue>;
    error?: { code: number; message: string };
    exceptionDetails?: Record<string, JsonValue>;
};

type FrameSample = {
    index: number;
    frameMs: number;
    startAtMs: number;
    endAtMs: number;
};

type SchedulerSample = {
    index: number;
    sampledAtMs: number;
    elapsedMs: number;
    tick: number | null;
    renderMode: string | null;
    commitLagMs: number | null;
    queueWaitMs: number | null;
    pendingAgeMs: number | null;
    postedCount: number | null;
    completedCount: number | null;
    supersededCount: number | null;
    dedupedCount: number | null;
    yieldCount: number | null;
    forcedCount: number | null;
    scheduled: boolean | null;
    running: boolean | null;
    pendingMode: string | null;
    scheduleMode: string | null;
    yieldReason: string | null;
};

type FrameWindowObservation = {
    frames: FrameSample[];
    schedulerSamples: SchedulerSample[];
};

const DEFAULT_MODES = [
    "power_voronoi_runtime",
    "perimeter_field",
    "metaball",
    "cell_grid",
    "phase_edges",
    "ember_lattice",
    "phase_field",
    "grid_gradient",
] as const;

const TOPBAR_MODE_LABELS: Record<string, { label: string; shortLabel: string }> = {
    power_voronoi_runtime: { label: "Power Voronoi", shortLabel: "PVV4" },
    perimeter_field: { label: "Perimeter", shortLabel: "Perimeter" },
    metaball: { label: "Metaball", shortLabel: "Metaball" },
    cell_grid: { label: "Cell Grid", shortLabel: "Grid" },
    phase_edges: { label: "Phase Edges", shortLabel: "Edges" },
    ember_lattice: { label: "Ember Lattice", shortLabel: "Ember" },
    phase_field: { label: "Phase Field", shortLabel: "Field" },
    grid_gradient: { label: "Grid Gradient", shortLabel: "Grad" },
};

const HOST = "127.0.0.1";
const ROOT = path.resolve(
    process.env.PAX_REVIEW_TARGET_ROOT?.trim() ||
        path.resolve(import.meta.dir, "..", ".."),
);
const CLIENT_DIR = path.join(ROOT, "pax-fluxia");
const FIXTURE_MAP_PATH = path.join(
    ROOT,
    "common",
    "resources",
    "fixture-maps",
    "metaball_conquest_lane_push.json",
);
const OUTPUT_DIR = path.join(
    ROOT,
    ".agent-harness",
    "metrics",
    "review-release",
);
const BUN_EXECUTABLE = process.execPath;
const RUNS = positiveInteger(process.env.PAX_REVIEW_RUNS, 3);
const FRAME_MS = positiveInteger(process.env.PAX_REVIEW_FRAME_MS, 3600);
const WARMUP_MS = positiveInteger(process.env.PAX_REVIEW_WARMUP_MS, 500);
const SCENARIOS = splitEnv(process.env.PAX_REVIEW_SCENARIOS, [
    "gameplay",
    "transition",
]);
const MODES = splitEnv(process.env.PAX_REVIEW_MODES, [...DEFAULT_MODES]);
const MAP_NAME = process.env.PAX_REVIEW_MAP_NAME?.trim() ?? "";
const APP_PATH = normalizeAppPath(process.env.PAX_REVIEW_APP_PATH, "/bench");
const REVIEW_MAP = loadReviewMapDefinition();

function splitEnv(value: string | undefined, fallback: string[]): string[] {
    const parsed = (value ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    return parsed.length > 0 ? parsed : fallback;
}

function positiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value ?? "");
    return Number.isFinite(parsed) && parsed > 0
        ? Math.round(parsed)
        : fallback;
}

function normalizeAppPath(value: string | undefined, fallback: string): string {
    const trimmed = value?.trim();
    if (!trimmed) return fallback;
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function round(value: number, digits = 3): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function quantile(values: readonly number[], q: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(
        sorted.length - 1,
        Math.max(0, Math.round((sorted.length - 1) * q)),
    );
    return sorted[index] ?? 0;
}

function summarizeSamples(samples: readonly FrameSample[]) {
    const frameTimes = samples.map((sample) => sample.frameMs);
    return {
        count: samples.length,
        p50Ms: round(quantile(frameTimes, 0.5)),
        p95Ms: round(quantile(frameTimes, 0.95)),
        p99Ms: round(quantile(frameTimes, 0.99)),
        maxMs: round(frameTimes.length ? Math.max(...frameTimes) : 0),
        over16_7: frameTimes.filter((value) => value > 1000 / 60).length,
        over20: frameTimes.filter((value) => value > 20).length,
        over33: frameTimes.filter((value) => value > 33.34).length,
        histogram: summarizeHistogram(frameTimes),
    };
}

function numericSampleValues(
    samples: readonly SchedulerSample[],
    key: keyof SchedulerSample,
): number[] {
    return samples
        .map((sample) => sample[key])
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function numericCountDelta(
    samples: readonly SchedulerSample[],
    key: keyof SchedulerSample,
): number {
    const values = numericSampleValues(samples, key);
    if (values.length === 0) return 0;
    return round(Math.max(...values) - Math.min(...values));
}

function uniqueStrings(
    samples: readonly SchedulerSample[],
    key: keyof SchedulerSample,
): string[] {
    return [
        ...new Set(
            samples
                .map((sample) => sample[key])
                .filter((value): value is string => typeof value === "string" && value.length > 0),
        ),
    ].sort();
}

function summarizeSchedulerSamples(samples: readonly SchedulerSample[]): JsonValue {
    const commitLag = numericSampleValues(samples, "commitLagMs");
    const queueWait = numericSampleValues(samples, "queueWaitMs");
    const pendingAge = numericSampleValues(samples, "pendingAgeMs");
    return {
        count: samples.length,
        commitLagMs: summarizeDistribution(commitLag),
        queueWaitMs: summarizeDistribution(queueWait),
        pendingAgeMs: summarizeDistribution(pendingAge),
        postedDelta: numericCountDelta(samples, "postedCount"),
        completedDelta: numericCountDelta(samples, "completedCount"),
        supersededDelta: numericCountDelta(samples, "supersededCount"),
        dedupedDelta: numericCountDelta(samples, "dedupedCount"),
        yieldDelta: numericCountDelta(samples, "yieldCount"),
        forcedDelta: numericCountDelta(samples, "forcedCount"),
        scheduledSampleCount: samples.filter((sample) => sample.scheduled === true).length,
        runningSampleCount: samples.filter((sample) => sample.running === true).length,
        scheduleModes: uniqueStrings(samples, "scheduleMode"),
        yieldReasons: uniqueStrings(samples, "yieldReason"),
        pendingModes: uniqueStrings(samples, "pendingMode"),
    };
}

function summarizePerfCapture(capture: unknown): JsonValue {
    const measures =
        (capture as { measures?: Record<string, { samples?: unknown[]; count?: number; maxMs?: number; lastMs?: number }> } | null)
            ?.measures ?? {};
    const rows = Object.entries(measures)
        .map(([name, measure]) => {
            const samples = (measure.samples ?? [])
                .map((value) => Number(value))
                .filter((value) => Number.isFinite(value));
            return {
                name,
                count: Number(measure.count ?? samples.length),
                p50Ms: round(quantile(samples, 0.5)),
                p95Ms: round(quantile(samples, 0.95)),
                p99Ms: round(quantile(samples, 0.99)),
                maxMs: round(Number(measure.maxMs ?? (samples.length ? Math.max(...samples) : 0))),
                lastMs: round(Number(measure.lastMs ?? 0)),
            };
        })
        .sort((left, right) => right.p95Ms - left.p95Ms || right.maxMs - left.maxMs);

    return {
        measureCount: rows.length,
        topMeasures: rows.slice(0, 48),
    };
}

function summarizeHistogram(values: readonly number[]) {
    const buckets = [
        { label: "<=8", max: 8 },
        { label: "<=12", max: 12 },
        { label: "<=16.7", max: 1000 / 60 },
        { label: "<=20", max: 20 },
        { label: "<=25", max: 25 },
        { label: "<=33.4", max: 33.34 },
        { label: "<=50", max: 50 },
        { label: ">50", max: Number.POSITIVE_INFINITY },
    ];
    return buckets.map((bucket, index) => {
        const min = index === 0 ? Number.NEGATIVE_INFINITY : buckets[index - 1]!.max;
        return {
            bucket: bucket.label,
            count: values.filter((value) => value > min && value <= bucket.max)
                .length,
        };
    });
}

function normalizeName(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function loadReviewMapDefinition(): {
    name: string | null;
    sourcePath: string;
    definition: Record<string, JsonValue>;
} {
    if (!MAP_NAME) {
        return {
            name: null,
            sourcePath: FIXTURE_MAP_PATH,
            definition: JSON.parse(readFileSync(FIXTURE_MAP_PATH, "utf8")),
        };
    }

    const savedMapsDir = path.join(ROOT, "common", "resources", "saved-maps");
    const targetName = normalizeName(MAP_NAME);
    const candidates = readdirSync(savedMapsDir)
        .filter((entry) => entry.endsWith(".json"))
        .map((entry) => path.join(savedMapsDir, entry));

    for (const candidate of candidates) {
        const definition = JSON.parse(
            readFileSync(candidate, "utf8"),
        ) as Record<string, JsonValue>;
        const metadataName = String(
            (definition.metadata as Record<string, JsonValue> | undefined)?.name ??
                "",
        );
        const fileName = path.basename(candidate, ".json");
        if (
            normalizeName(metadataName) === targetName ||
            normalizeName(fileName) === targetName
        ) {
            return {
                name: metadataName || MAP_NAME,
                sourcePath: candidate,
                definition,
            };
        }
    }

    throw new Error(`Could not find saved map JSON for: ${MAP_NAME}`);
}

async function sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
}

async function findAvailablePort(startPort: number): Promise<number> {
    for (let port = startPort; port < startPort + 200; port += 1) {
        const isFree = await new Promise<boolean>((resolve) => {
            const server = net.createServer();
            server.once("error", () => resolve(false));
            server.listen(port, HOST, () => {
                server.close(() => resolve(true));
            });
        });
        if (isFree) return port;
    }
    throw new Error(`No free port found from ${startPort}`);
}

async function waitForHttp(url: string, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(url);
            if (response.ok) return;
        } catch {
            // keep polling
        }
        await sleep(250);
    }
    throw new Error(`Timed out waiting for ${url}`);
}

async function waitForJson<T>(url: string, timeoutMs: number): Promise<T> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(url);
            if (response.ok) return (await response.json()) as T;
        } catch {
            // keep polling
        }
        await sleep(250);
    }
    throw new Error(`Timed out waiting for JSON endpoint ${url}`);
}

function resolveBrowserPath(): string {
    const candidates = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    ];
    const match = candidates.find((candidate) => existsSync(candidate));
    if (!match) throw new Error("Could not find Chrome or Edge.");
    return match;
}

async function killProcessTree(pid: number | undefined | null): Promise<void> {
    if (!pid) return;
    const killer = Bun.spawn(["taskkill.exe", "/PID", String(pid), "/T", "/F"], {
        stdout: "ignore",
        stderr: "ignore",
    });
    await killer.exited;
}

class CdpClient {
    private nextId = 1;
    private readonly pending = new Map<
        number,
        {
            resolve: (value: Record<string, JsonValue>) => void;
            reject: (reason?: unknown) => void;
        }
    >();
    private readonly notifications: CdpMessage[] = [];

    private constructor(private readonly socket: WebSocket) {
        socket.addEventListener("message", (event) => {
            const message = JSON.parse(String(event.data)) as CdpMessage;
            if (!message.id) {
                this.notifications.push(message);
                if (this.notifications.length > 300) {
                    this.notifications.splice(0, this.notifications.length - 300);
                }
                return;
            }
            const handler = this.pending.get(message.id);
            if (!handler) return;
            this.pending.delete(message.id);
            if (message.error) {
                handler.reject(
                    new Error(`${message.error.code}: ${message.error.message}`),
                );
                return;
            }
            handler.resolve(message.result ?? {});
        });
    }

    static async connect(wsUrl: string): Promise<CdpClient> {
        const socket = new WebSocket(wsUrl);
        await new Promise<void>((resolve, reject) => {
            socket.addEventListener("open", () => resolve());
            socket.addEventListener("error", (event) => reject(event));
        });
        return new CdpClient(socket);
    }

    async send(
        method: string,
        params?: Record<string, JsonValue>,
    ): Promise<Record<string, JsonValue>> {
        const id = this.nextId++;
        this.socket.send(JSON.stringify({ id, method, params }));
        return await new Promise<Record<string, JsonValue>>((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
        });
    }

    async evaluate<T>(expression: string): Promise<T> {
        const result = await this.send("Runtime.evaluate", {
            expression,
            awaitPromise: true,
            returnByValue: true,
        });
        if (result.exceptionDetails) {
            const exception = result.exceptionDetails as {
                text?: string;
                exception?: { description?: string; value?: string };
            };
            throw new Error(
                exception.exception?.description ??
                    exception.exception?.value ??
                    exception.text ??
                    "Runtime.evaluate failed",
            );
        }
        return (result.result as { value?: T })?.value as T;
    }

    recentProblems(): CdpMessage[] {
        return this.notifications
            .filter((message) =>
                [
                    "Runtime.exceptionThrown",
                    "Runtime.consoleAPICalled",
                    "Network.loadingFailed",
                ].includes(String(message.method ?? "")),
            )
            .slice(-20);
    }

    close(): void {
        this.socket.close();
    }
}

async function waitForBenchBridge(client: CdpClient, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            if (await client.evaluate<boolean>("Boolean(window.__PAX_BENCH__)")) {
                return;
            }
        } catch {
            // keep polling
        }
        await sleep(250);
    }
    const diagnostics = await client.evaluate<Record<string, unknown>>(`({
        href: window.location.href,
        readyState: document.readyState,
        body: document.body ? document.body.innerText.slice(0, 600) : "",
    })`);
    throw new Error(
        `Timed out waiting for benchmark bridge: ${JSON.stringify(diagnostics)} problems=${JSON.stringify(client.recentProblems())}`,
    );
}

function collectFrameExpression(durationMs: number, warmupMs: number): string {
    return `
        (async () => {
            const samples = [];
            const startedAt = performance.now();
            const warmupDeadlineAt = startedAt + ${warmupMs};
            const measuredDeadlineAt = warmupDeadlineAt + ${durationMs};
            let previousFrameAt = startedAt;
            await new Promise((resolve) => {
                const step = (now) => {
                    samples.push({
                        index: samples.length,
                        frameMs: now - previousFrameAt,
                        startAtMs: previousFrameAt,
                        endAtMs: now,
                    });
                    previousFrameAt = now;
                    if (now < measuredDeadlineAt) {
                        requestAnimationFrame(step);
                    } else {
                        resolve();
                    }
                };
                requestAnimationFrame(step);
            });
            return samples
                .slice(1)
                .filter((sample) => sample.endAtMs > warmupDeadlineAt)
                .map((sample, index) => ({
                    index,
                    frameMs: Number(sample.frameMs.toFixed(3)),
                    startAtMs: Number(sample.startAtMs.toFixed(3)),
                    endAtMs: Number(sample.endAtMs.toFixed(3)),
                }));
        })()
    `;
}

function collectFrameWindowExpression(durationMs: number, warmupMs: number): string {
    const schedulerSampleMs = 100;
    return `
        (async () => {
            const frames = [];
            const schedulerSamples = [];
            const bench = window.__PAX_BENCH__;
            const startedAt = performance.now();
            const warmupDeadlineAt = startedAt + ${warmupMs};
            const measuredDeadlineAt = warmupDeadlineAt + ${durationMs};
            let previousFrameAt = startedAt;
            let schedulerIndex = 0;

            const readScheduler = async () => {
                if (!bench?.getTerritorySchedulerSnapshot) return;
                const now = performance.now();
                if (now < warmupDeadlineAt) return;
                const snapshot = await bench.getTerritorySchedulerSnapshot();
                if (!snapshot) return;
                schedulerSamples.push({
                    index: schedulerIndex++,
                    sampledAtMs: Number(now.toFixed(3)),
                    elapsedMs: Number((now - warmupDeadlineAt).toFixed(3)),
                    tick: Number.isFinite(Number(snapshot.currentTick)) ? Number(snapshot.currentTick) : null,
                    renderMode: typeof snapshot.renderMode === "string" ? snapshot.renderMode : null,
                    commitLagMs: Number.isFinite(Number(snapshot.territoryPresentationLastCommitLagMs)) ? Number(Number(snapshot.territoryPresentationLastCommitLagMs).toFixed(3)) : null,
                    queueWaitMs: Number.isFinite(Number(snapshot.territoryPresentationLastQueueWaitMs)) ? Number(Number(snapshot.territoryPresentationLastQueueWaitMs).toFixed(3)) : null,
                    pendingAgeMs: Number.isFinite(Number(snapshot.territoryPresentationPendingAgeMs)) ? Number(Number(snapshot.territoryPresentationPendingAgeMs).toFixed(3)) : null,
                    postedCount: Number.isFinite(Number(snapshot.territoryPresentationPostedCount)) ? Number(snapshot.territoryPresentationPostedCount) : null,
                    completedCount: Number.isFinite(Number(snapshot.territoryPresentationCompletedCount)) ? Number(snapshot.territoryPresentationCompletedCount) : null,
                    supersededCount: Number.isFinite(Number(snapshot.territoryPresentationSupersededCount)) ? Number(snapshot.territoryPresentationSupersededCount) : null,
                    dedupedCount: Number.isFinite(Number(snapshot.territoryPresentationDedupedCount)) ? Number(snapshot.territoryPresentationDedupedCount) : null,
                    yieldCount: Number.isFinite(Number(snapshot.territoryPresentationYieldCount)) ? Number(snapshot.territoryPresentationYieldCount) : null,
                    forcedCount: Number.isFinite(Number(snapshot.territoryPresentationForcedCount)) ? Number(snapshot.territoryPresentationForcedCount) : null,
                    scheduled: typeof snapshot.territoryPresentationScheduled === "boolean" ? snapshot.territoryPresentationScheduled : null,
                    running: typeof snapshot.territoryPresentationRunning === "boolean" ? snapshot.territoryPresentationRunning : null,
                    pendingMode: typeof snapshot.territoryPresentationPendingMode === "string" ? snapshot.territoryPresentationPendingMode : null,
                    scheduleMode: typeof snapshot.territoryPresentationLastScheduleMode === "string" ? snapshot.territoryPresentationLastScheduleMode : null,
                    yieldReason: typeof snapshot.territoryPresentationLastYieldReason === "string" ? snapshot.territoryPresentationLastYieldReason : null,
                });
            };

            const schedulerTimer = setInterval(() => {
                void readScheduler();
            }, ${schedulerSampleMs});

            await new Promise((resolve) => {
                const step = (now) => {
                    frames.push({
                        index: frames.length,
                        frameMs: now - previousFrameAt,
                        startAtMs: previousFrameAt,
                        endAtMs: now,
                    });
                    previousFrameAt = now;
                    if (now < measuredDeadlineAt) {
                        requestAnimationFrame(step);
                    } else {
                        resolve();
                    }
                };
                requestAnimationFrame(step);
            });
            clearInterval(schedulerTimer);
            await readScheduler();

            return {
                frames: frames
                    .slice(1)
                    .filter((sample) => sample.endAtMs > warmupDeadlineAt)
                    .map((sample, index) => ({
                        index,
                        frameMs: Number(sample.frameMs.toFixed(3)),
                        startAtMs: Number(sample.startAtMs.toFixed(3)),
                        endAtMs: Number(sample.endAtMs.toFixed(3)),
                    })),
                schedulerSamples,
            };
        })()
    `;
}

async function captureScreenshot(client: CdpClient, outputPath: string): Promise<void> {
    const result = await client.send("Page.captureScreenshot", {
        format: "png",
        fromSurface: true,
    });
    const data = result.data;
    if (typeof data === "string") {
        writeFileSync(outputPath, Buffer.from(data, "base64"));
    }
}

async function prepareMode(
    client: CdpClient,
    mode: string,
): Promise<Record<string, JsonValue>> {
    const mapPayload = JSON.stringify(REVIEW_MAP.definition);
    return await client.evaluate<Record<string, JsonValue>>(`
        (async () => {
            const bench = window.__PAX_BENCH__;
            bench.enablePerfCapture?.();
            bench.setPerfUserTimingEnabled?.(false);
            await bench.setTransitionRecorderEnabled?.(false);
            await bench.clearTransitionRecorderBundles?.();
            bench.resetTransitionDiagnosticCapture?.();
            bench.resetPerfCapture?.();
            const loaded = await bench.loadMapDefinition(${mapPayload});
            if (!loaded) throw new Error("Could not load review map");
            const modePrep = await bench.ensureTerritoryMode(${JSON.stringify(mode)});
            const gameplayPrep = await bench.beginGameplay(6000, 1);
            await new Promise((resolve) => setTimeout(resolve, 1200));
            return {
                mapName: ${JSON.stringify(REVIEW_MAP.name)},
                mapSourcePath: ${JSON.stringify(REVIEW_MAP.sourcePath)},
                modePrep,
                gameplayPrep,
                state: await bench.getStateSummary(),
            };
        })()
    `);
}

async function beginPerfWindow(client: CdpClient): Promise<number> {
    return await client.evaluate<number>(`
        (() => {
            const bench = window.__PAX_BENCH__;
            bench.enablePerfCapture?.();
            bench.setPerfUserTimingEnabled?.(false);
            bench.resetPerfCapture?.();
            return bench.getPerfEventCursor ? bench.getPerfEventCursor() : 0;
        })()
    `);
}

async function collectPerfWindow(
    client: CdpClient,
    cursor: number,
): Promise<JsonValue> {
    const capture = await client.evaluate<Record<string, JsonValue> | null>(`
        (() => {
            const bench = window.__PAX_BENCH__;
            return {
                cursor: ${cursor},
                eventCountSinceCursor: bench.getPerfEventsSince
                    ? bench.getPerfEventsSince(${cursor}, 50000).length
                    : null,
                capture: bench.snapshotPerfCapture ? bench.snapshotPerfCapture() : null,
            };
        })()
    `);
    return {
        cursor,
        eventCountSinceCursor: capture?.eventCountSinceCursor ?? null,
        measures: summarizePerfCapture(capture?.capture),
    };
}

async function collectSchedulerSnapshot(
    client: CdpClient,
): Promise<JsonValue | null> {
    return await client.evaluate<JsonValue | null>(`
        (async () => {
            const bench = window.__PAX_BENCH__;
            return bench.getTerritorySchedulerSnapshot
                ? await bench.getTerritorySchedulerSnapshot()
                : null;
        })()
    `);
}

async function collectRouteSentinel(client: CdpClient): Promise<JsonValue> {
    return await client.evaluate<JsonValue>(`
        (() => {
            const shellDiag = window.__PAX_GAME_SHELL_DIAG__ ?? null;
            const bodyText = String(document.body?.innerText ?? "")
                .replace(/\\s+/g, " ")
                .slice(0, 500);
            return {
                href: window.location.href,
                pathname: window.location.pathname,
                search: window.location.search,
                title: document.title,
                hasBenchBridge: Boolean(window.__PAX_BENCH__),
                hasPixiCanvas: Boolean(document.querySelector("canvas")),
                hasGameCanvasElement: Boolean(document.querySelector(".game-canvas")),
                visibleTextStart: bodyText,
                shellDiag,
            };
        })()
    `);
}

async function runGameplayScenario(
    client: CdpClient,
    mode: string,
): Promise<Record<string, JsonValue>> {
    const prep = await prepareMode(client, mode);
    const perfCursor = await beginPerfWindow(client);
    const observation = await client.evaluate<FrameWindowObservation>(
        collectFrameWindowExpression(FRAME_MS, WARMUP_MS),
    );
    const samples = observation.frames;
    const perf = await collectPerfWindow(client, perfCursor);
    const finalState = await client.evaluate<Record<string, JsonValue>>(`
        (async () => await window.__PAX_BENCH__.getStateSummary())()
    `);
    const finalSchedulerSnapshot = await collectSchedulerSnapshot(client);
    const routeSentinel = await collectRouteSentinel(client);
    return {
        prep: prep as JsonValue,
        finalState: finalState as JsonValue,
        finalSchedulerSnapshot,
        routeSentinel,
        frames: summarizeSamples(samples) as JsonValue,
        scheduler: summarizeSchedulerSamples(observation.schedulerSamples),
        perf,
        sampleCount: samples.length,
        schedulerSampleCount: observation.schedulerSamples.length,
    };
}

async function installSyntheticInputPending(
    client: CdpClient,
    activeMs: number,
): Promise<Record<string, JsonValue>> {
    return await client.evaluate<Record<string, JsonValue>>(`
        (() => {
            const activeMs = ${Math.max(1, Math.round(activeMs))};
            const global = window;
            const ownDescriptor = Object.getOwnPropertyDescriptor(navigator, "scheduling") ?? null;
            if (!global.__PAX_REVIEW_INPUT_PENDING_RESTORE__) {
                global.__PAX_REVIEW_INPUT_PENDING_RESTORE__ = {
                    hadOwn: Boolean(ownDescriptor),
                    ownDescriptor,
                };
            }
            const untilMs = performance.now() + activeMs;
            global.__PAX_REVIEW_INPUT_PENDING_UNTIL_MS__ = untilMs;
            const syntheticScheduling = {
                isInputPending: () => performance.now() < global.__PAX_REVIEW_INPUT_PENDING_UNTIL_MS__,
            };
            let installed = false;
            let error = null;
            try {
                Object.defineProperty(navigator, "scheduling", {
                    configurable: true,
                    enumerable: false,
                    value: syntheticScheduling,
                });
                installed = navigator.scheduling?.isInputPending?.() === true;
            } catch (caught) {
                error = caught instanceof Error ? caught.message : String(caught);
            }
            return {
                installed,
                active: navigator.scheduling?.isInputPending?.() === true,
                activeMs,
                untilMs: Number(untilMs.toFixed(3)),
                hadOwnScheduling: Boolean(ownDescriptor),
                error,
            };
        })()
    `);
}

async function restoreSyntheticInputPending(
    client: CdpClient,
): Promise<Record<string, JsonValue>> {
    return await client.evaluate<Record<string, JsonValue>>(`
        (() => {
            const global = window;
            const restore = global.__PAX_REVIEW_INPUT_PENDING_RESTORE__ ?? null;
            let restored = false;
            let error = null;
            try {
                if (restore?.hadOwn && restore.ownDescriptor) {
                    Object.defineProperty(navigator, "scheduling", restore.ownDescriptor);
                } else {
                    delete navigator.scheduling;
                }
                restored = true;
            } catch (caught) {
                error = caught instanceof Error ? caught.message : String(caught);
            }
            delete global.__PAX_REVIEW_INPUT_PENDING_RESTORE__;
            delete global.__PAX_REVIEW_INPUT_PENDING_UNTIL_MS__;
            return {
                restored,
                activeAfterRestore: navigator.scheduling?.isInputPending?.() === true,
                error,
            };
        })()
    `);
}

async function runInputPressureScenario(
    client: CdpClient,
    mode: string,
): Promise<Record<string, JsonValue>> {
    const prep = await prepareMode(client, mode);
    const syntheticInput = await installSyntheticInputPending(
        client,
        FRAME_MS + WARMUP_MS + 1000,
    );
    const perfCursor = await beginPerfWindow(client);
    const observation = await client.evaluate<FrameWindowObservation>(
        collectFrameWindowExpression(FRAME_MS, WARMUP_MS),
    );
    const restoreInput = await restoreSyntheticInputPending(client);
    const samples = observation.frames;
    const perf = await collectPerfWindow(client, perfCursor);
    const finalState = await client.evaluate<Record<string, JsonValue>>(`
        (async () => await window.__PAX_BENCH__.getStateSummary())()
    `);
    const finalSchedulerSnapshot = await collectSchedulerSnapshot(client);
    const routeSentinel = await collectRouteSentinel(client);
    return {
        prep: prep as JsonValue,
        syntheticInput: syntheticInput as JsonValue,
        restoreInput: restoreInput as JsonValue,
        finalState: finalState as JsonValue,
        finalSchedulerSnapshot,
        routeSentinel,
        frames: summarizeSamples(samples) as JsonValue,
        scheduler: summarizeSchedulerSamples(observation.schedulerSamples),
        perf,
        sampleCount: samples.length,
        schedulerSampleCount: observation.schedulerSamples.length,
    };
}

async function runTransitionScenario(
    client: CdpClient,
    mode: string,
    diagnosticRecorder: boolean,
): Promise<Record<string, JsonValue>> {
    const prep = await prepareMode(client, mode);
    const perfCursor = await beginPerfWindow(client);
    const order = await client.evaluate<Record<string, JsonValue> | null>(`
        (async () => {
            const bench = window.__PAX_BENCH__;
            const order = await bench.prepareConquestDiagnosticOrder();
            if (!order) return null;
            await bench.clearTransitionRecorderBundles?.();
            await bench.setTransitionRecorderEnabled?.(${diagnosticRecorder ? "true" : "false"});
            const issued = await bench.issueOrderDirect(order.sourceId, order.targetId, true);
            return { ...order, issued };
        })()
    `);
    if (!order?.issued) {
        throw new Error(`Could not issue conquest order for mode ${mode}`);
    }
    const observation = await client.evaluate<FrameWindowObservation>(
        collectFrameWindowExpression(FRAME_MS, 0),
    );
    const samples = observation.frames;
    const perf = await collectPerfWindow(client, perfCursor);
    const finalState = await client.evaluate<Record<string, JsonValue>>(`
        (async () => await window.__PAX_BENCH__.getStateSummary())()
    `);
    const finalSchedulerSnapshot = await collectSchedulerSnapshot(client);
    const routeSentinel = await collectRouteSentinel(client);
    const recorder = await client.evaluate<Record<string, JsonValue> | null>(`
        (async () => {
            const bench = window.__PAX_BENCH__;
            return ${diagnosticRecorder ? "true" : "false"} && bench.getTransitionRecorderSummary
                ? await bench.getTransitionRecorderSummary()
                : null;
        })()
    `);
    return {
        prep: prep as JsonValue,
        finalState: finalState as JsonValue,
        finalSchedulerSnapshot,
        routeSentinel,
        order: order as JsonValue,
        recorder: (recorder ?? null) as JsonValue,
        frames: summarizeSamples(samples) as JsonValue,
        scheduler: summarizeSchedulerSamples(observation.schedulerSamples),
        perf,
        sampleCount: samples.length,
        schedulerSampleCount: observation.schedulerSamples.length,
    };
}

function resolveModeSwitchSourceMode(targetMode: string): string {
    return targetMode === "power_voronoi_runtime"
        ? "cell_grid"
        : "power_voronoi_runtime";
}

async function clickTopbarModeShortcut(
    client: CdpClient,
    mode: string,
): Promise<Record<string, JsonValue>> {
    const modeLabels = TOPBAR_MODE_LABELS[mode] ?? {
        label: mode,
        shortLabel: mode,
    };
    return await client.evaluate<Record<string, JsonValue>>(`
        (() => {
            const targetLabel = ${JSON.stringify(modeLabels.label)};
            const targetShortLabel = ${JSON.stringify(modeLabels.shortLabel)};
            const buttons = Array.from(document.querySelectorAll(
                ".topbar-modes .mode-shortcut, .pf-hud-topbar__modes .pf-hud-topbar__mode"
            ));
            const button = buttons.find((entry) => {
                const label = entry.querySelector(".mode-shortcut__label, .pf-hud-topbar__mode-label")?.textContent?.trim();
                const shortLabel = entry.querySelector(".mode-shortcut__short, .pf-hud-topbar__mode-short")?.textContent?.trim();
                const text = entry.textContent?.replace(/\\s+/g, " ").trim() ?? "";
                return label === targetLabel
                    || shortLabel === targetShortLabel
                    || text.includes(targetLabel)
                    || text.includes(targetShortLabel);
            });
            if (!(button instanceof HTMLButtonElement)) {
                return {
                    clicked: false,
                    targetLabel,
                    targetShortLabel,
                    available: buttons.map((entry) => ({
                        label: entry.querySelector(".mode-shortcut__label, .pf-hud-topbar__mode-label")?.textContent?.trim() ?? "",
                        shortLabel: entry.querySelector(".mode-shortcut__short, .pf-hud-topbar__mode-short")?.textContent?.trim() ?? "",
                        text: entry.textContent?.replace(/\\s+/g, " ").trim() ?? "",
                    })),
                };
            }
            button.click();
            return {
                clicked: true,
                targetLabel,
                targetShortLabel,
                buttonText: button.textContent?.replace(/\\s+/g, " ").trim() ?? "",
            };
        })()
    `);
}

async function runModeSwitchScenario(
    client: CdpClient,
    mode: string,
): Promise<Record<string, JsonValue>> {
    const sourceMode = resolveModeSwitchSourceMode(mode);
    const prep = await prepareMode(client, sourceMode);
    const beforeSwitch = await client.evaluate<Record<string, JsonValue>>(`
        (async () => await window.__PAX_BENCH__.getStateSummary())()
    `);
    const perfCursor = await beginPerfWindow(client);
    const clickResult = await clickTopbarModeShortcut(client, mode);
    if (!clickResult.clicked) {
        throw new Error(`Could not click topbar mode shortcut for ${mode}: ${JSON.stringify(clickResult)}`);
    }
    const observation = await client.evaluate<FrameWindowObservation>(
        collectFrameWindowExpression(FRAME_MS, 0),
    );
    const samples = observation.frames;
    const waitResult = await client.evaluate<Record<string, JsonValue>>(`
        (async () => await window.__PAX_BENCH__.waitForRenderMode(${JSON.stringify(mode)}))()
    `);
    const perf = await collectPerfWindow(client, perfCursor);
    const finalState = await client.evaluate<Record<string, JsonValue>>(`
        (async () => await window.__PAX_BENCH__.getStateSummary())()
    `);
    const finalSchedulerSnapshot = await collectSchedulerSnapshot(client);
    const routeSentinel = await collectRouteSentinel(client);
    return {
        prep: prep as JsonValue,
        sourceMode,
        targetMode: mode,
        beforeSwitch: beforeSwitch as JsonValue,
        clickResult: clickResult as JsonValue,
        waitResult: waitResult as JsonValue,
        finalState: finalState as JsonValue,
        finalSchedulerSnapshot,
        routeSentinel,
        frames: summarizeSamples(samples) as JsonValue,
        scheduler: summarizeSchedulerSamples(observation.schedulerSamples),
        perf,
        sampleCount: samples.length,
        schedulerSampleCount: observation.schedulerSamples.length,
    };
}

async function main(): Promise<void> {
    if (!existsSync(CLIENT_DIR)) {
        throw new Error(`Missing client directory: ${CLIENT_DIR}`);
    }
    if (!existsSync(FIXTURE_MAP_PATH)) {
        throw new Error(`Missing fixture map: ${FIXTURE_MAP_PATH}`);
    }
    mkdirSync(OUTPUT_DIR, { recursive: true });

    const appPort = await findAvailablePort(5177);
    const cdpPort = await findAvailablePort(9277);
    const appUrl = `http://${HOST}:${appPort}${APP_PATH}`;
    const profileDir = path.join(
        os.tmpdir(),
        `pax-review-release-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    );
    const server = Bun.spawn(
        [
            BUN_EXECUTABLE,
            "x",
            "vite",
            "preview",
            "--host",
            HOST,
            "--port",
            String(appPort),
        ],
        {
            cwd: CLIENT_DIR,
            stdout: "ignore",
            stderr: "ignore",
            env: {
                ...process.env,
                PAX_BENCH_NO_HMR: "1",
                PAX_BENCH_STANDALONE: "1",
            },
        },
    );
    const browser = Bun.spawn(
        [
            resolveBrowserPath(),
            `--remote-debugging-port=${cdpPort}`,
            "--headless=new",
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            "--disable-renderer-backgrounding",
            "--disable-features=CalculateNativeWinOcclusion",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-extensions",
            "--window-size=1600,900",
            `--user-data-dir=${profileDir}`,
            "about:blank",
        ],
        { stdout: "ignore", stderr: "ignore" },
    );

    let client: CdpClient | null = null;
    try {
        await waitForHttp(appUrl, 60_000);
        const targets = await waitForJson<
            Array<{
                type?: string;
                url?: string;
                webSocketDebuggerUrl?: string;
            }>
        >(`http://${HOST}:${cdpPort}/json/list`, 30_000);
        const target =
            targets.find(
                (entry) =>
                    entry.webSocketDebuggerUrl &&
                    entry.type === "page" &&
                    !String(entry.url ?? "").startsWith("chrome-extension://"),
            ) ?? targets.find((entry) => entry.webSocketDebuggerUrl);
        if (!target?.webSocketDebuggerUrl) {
            throw new Error("No browser CDP target found");
        }
        client = await CdpClient.connect(target.webSocketDebuggerUrl);
        await client.send("Page.enable");
        await client.send("Runtime.enable");
        await client.send("Page.navigate", { url: appUrl });
        await waitForBenchBridge(client, 60_000);
        const routeSentinel = await collectRouteSentinel(client);

        const generatedAt = new Date().toISOString();
        const screenshotDir = path.join(
            OUTPUT_DIR,
            `screenshots-${generatedAt.replace(/[:.]/g, "-")}`,
        );
        mkdirSync(screenshotDir, { recursive: true });

        const results: Record<string, JsonValue> = {};
        for (const mode of MODES) {
            for (const scenario of SCENARIOS) {
                const key = `${mode}.${scenario}`;
                const runs: JsonValue[] = [];
                for (let runIndex = 0; runIndex < RUNS; runIndex += 1) {
                    const startedAt = performance.now();
                    try {
                        const result =
                            scenario === "transition" ||
                            scenario === "transition_diagnostic"
                                ? await runTransitionScenario(
                                      client,
                                      mode,
                                      scenario === "transition_diagnostic",
                                  )
                                : scenario === "mode_switch"
                                  ? await runModeSwitchScenario(client, mode)
                                : scenario === "input_pressure"
                                  ? await runInputPressureScenario(client, mode)
                                : await runGameplayScenario(client, mode);
                        if (runIndex === 0) {
                            await captureScreenshot(
                                client,
                                path.join(screenshotDir, `${key}.png`),
                            );
                        }
                        runs.push({
                            ok: true,
                            elapsedMs: round(performance.now() - startedAt),
                            ...result,
                        } as JsonValue);
                    } catch (error) {
                        runs.push({
                            ok: false,
                            elapsedMs: round(performance.now() - startedAt),
                            error: String(error),
                            recentProblems: client.recentProblems() as JsonValue,
                        });
                    }
                }
                results[key] = {
                    mode,
                    scenario,
                    runs,
                    aggregate: aggregateRuns(runs),
                } as JsonValue;
            }
        }

        const report = {
            generatedAt,
            targetRoot: ROOT,
            clientDir: CLIENT_DIR,
            appPath: APP_PATH,
            appUrl,
            runsPerScenario: RUNS,
            frameMs: FRAME_MS,
            warmupMs: WARMUP_MS,
            mapName: REVIEW_MAP.name,
            mapSourcePath: REVIEW_MAP.sourcePath,
            routeSentinel,
            modes: MODES,
            scenarios: SCENARIOS,
            screenshotDir,
            results,
        };
        const latestPath = path.join(
            OUTPUT_DIR,
            "review-release-gameplay-benchmark-latest.json",
        );
        const timestampPath = path.join(
            OUTPUT_DIR,
            `review-release-gameplay-benchmark-${generatedAt.replace(/[:.]/g, "-")}.json`,
        );
        const serialized = JSON.stringify(report, null, 2);
        writeFileSync(latestPath, serialized, "utf8");
        writeFileSync(timestampPath, serialized, "utf8");
        console.log(
            JSON.stringify(
                {
                    generatedAt,
                    targetRoot: ROOT,
                    latestPath,
                    timestampPath,
                },
                null,
                2,
            ),
        );
    } finally {
        client?.close();
        await killProcessTree(browser.pid);
        await killProcessTree(server.pid);
    }
}

function aggregateRuns(runs: readonly JsonValue[]): JsonValue {
    const okRuns = runs.filter(
        (run): run is Record<string, JsonValue> =>
            Boolean((run as Record<string, JsonValue>)?.ok),
    );
    const p50 = okRuns.map((run) => Number((run.frames as any)?.p50Ms ?? 0));
    const p95 = okRuns.map((run) => Number((run.frames as any)?.p95Ms ?? 0));
    const p99 = okRuns.map((run) => Number((run.frames as any)?.p99Ms ?? 0));
    const max = okRuns.map((run) => Number((run.frames as any)?.maxMs ?? 0));
    const schedulerCommitLagP95 = okRuns.map((run) =>
        Number((run.scheduler as any)?.commitLagMs?.p95 ?? 0),
    );
    const schedulerCommitLagP99 = okRuns.map((run) =>
        Number((run.scheduler as any)?.commitLagMs?.p99 ?? 0),
    );
    const schedulerCommitLagMax = okRuns.map((run) =>
        Number((run.scheduler as any)?.commitLagMs?.max ?? 0),
    );
    const schedulerPendingAgeMax = okRuns.map((run) =>
        Number((run.scheduler as any)?.pendingAgeMs?.max ?? 0),
    );
    const schedulerYieldDelta = okRuns.map((run) =>
        Number((run.scheduler as any)?.yieldDelta ?? 0),
    );
    const schedulerForcedDelta = okRuns.map((run) =>
        Number((run.scheduler as any)?.forcedDelta ?? 0),
    );
    return {
        okRunCount: okRuns.length,
        failedRunCount: runs.length - okRuns.length,
        runP50Ms: summarizeDistribution(p50),
        runP95Ms: summarizeDistribution(p95),
        runP99Ms: summarizeDistribution(p99),
        runMaxMs: summarizeDistribution(max),
        schedulerCommitLagP95Ms: summarizeDistribution(schedulerCommitLagP95),
        schedulerCommitLagP99Ms: summarizeDistribution(schedulerCommitLagP99),
        schedulerCommitLagMaxMs: summarizeDistribution(schedulerCommitLagMax),
        schedulerPendingAgeMaxMs: summarizeDistribution(schedulerPendingAgeMax),
        schedulerYieldDelta: summarizeDistribution(schedulerYieldDelta),
        schedulerForcedDelta: summarizeDistribution(schedulerForcedDelta),
    };
}

function summarizeDistribution(values: readonly number[]): JsonValue {
    return {
        p50: round(quantile(values, 0.5)),
        p95: round(quantile(values, 0.95)),
        p99: round(quantile(values, 0.99)),
        max: round(values.length ? Math.max(...values) : 0),
    };
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
