import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

type JsonValue =
    | null
    | boolean
    | number
    | string
    | JsonValue[]
    | { [key: string]: JsonValue };

interface CdpMessage {
    id?: number;
    method?: string;
    params?: Record<string, JsonValue>;
    result?: Record<string, JsonValue>;
    error?: { code: number; message: string };
}

interface CpuHotspot {
    label: string;
    selfMs: number;
    sampleCount: number;
}

interface TraceDurationBucket {
    name: string;
    cat: string;
    totalMs: number;
    maxMs: number;
    count: number;
}

const ROOT = path.resolve(import.meta.dir, "..", "..");
const CLIENT_DIR = path.join(ROOT, "pax-fluxia");
const METRICS_DIR = path.join(ROOT, ".agent-harness", "metrics");
const HOST = "127.0.0.1";
const SELECTED_SCENARIOS = new Set(
    (process.env.PAX_BENCH_ONLY ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
);

function shouldRunScenario(name: string): boolean {
    return SELECTED_SCENARIOS.size === 0 || SELECTED_SCENARIOS.has(name);
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function round(value: number, digits = 3): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function resolveBrowserPath(): string {
    const candidates = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ];
    const match = candidates.find((candidate) => existsSync(candidate));
    if (!match) {
        throw new Error("Could not find Edge or Chrome for CDP benchmark run.");
    }
    return match;
}

async function fetchText(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Request failed ${response.status} for ${url}`);
    }
    return await response.text();
}

async function waitForHttp(url: string, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(url);
            if (response.ok) return;
        } catch {}
        await sleep(250);
    }
    throw new Error(`Timed out waiting for ${url}`);
}

async function findAvailablePort(startPort: number): Promise<number> {
    for (let port = startPort; port < startPort + 50; port++) {
        const isFree = await new Promise<boolean>((resolve) => {
            const server = net.createServer();
            server.once("error", () => resolve(false));
            server.listen(port, HOST, () => {
                server.close(() => resolve(true));
            });
        });
        if (isFree) return port;
    }
    throw new Error(`Could not find an available port starting at ${startPort}.`);
}

async function waitForJson<T>(url: string, timeoutMs: number): Promise<T> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(url);
            if (response.ok) return (await response.json()) as T;
        } catch {}
        await sleep(250);
    }
    throw new Error(`Timed out waiting for JSON endpoint ${url}`);
}

async function waitForDevAppReady(entryUrl: string, timeoutMs: number): Promise<void> {
    await waitForHttp(entryUrl, timeoutMs);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const html = await fetchText(entryUrl);
            if (html.length > 0) {
                return;
            }
        } catch {}
        await sleep(250);
    }
    throw new Error("Timed out waiting for the Vite/SvelteKit client graph to become ready.");
}

async function waitForBenchBridge(client: CdpClient, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const ready = await client.evaluate<boolean>("Boolean(window.__PAX_BENCH__)");
            if (ready) return;
        } catch {}
        await sleep(250);
    }
    const debugState = await collectBridgeFailureDiagnostics(client);
    throw new Error(`Timed out waiting for window.__PAX_BENCH__. ${debugState}`);
}

async function collectBridgeFailureDiagnostics(client: CdpClient): Promise<string> {
    try {
        const href = await client.evaluate<string>("window.location.href");
        const readyState = await client.evaluate<string>("document.readyState");
        const bodyText = await client.evaluate<string>(
            "document.body ? document.body.innerText.slice(0, 1000) : ''",
        );
        const bodyHtml = await client.evaluate<string>(
            "document.body ? document.body.innerHTML.slice(0, 1500) : ''",
        );
        const notifications = client
            .getRecentNotifications()
            .filter((message) =>
                [
                    "Runtime.exceptionThrown",
                    "Runtime.consoleAPICalled",
                    "Network.loadingFailed",
                ].includes(String(message.method ?? "")),
            )
            .slice(-20);
        return (
            `href=${href} readyState=${readyState}` +
            ` body=${JSON.stringify(bodyText)}` +
            ` html=${JSON.stringify(bodyHtml)}` +
            ` notifications=${JSON.stringify(notifications)}`
        );
    } catch (error) {
        return `failed to collect diagnostics: ${String(error)}`;
    }
}

class CdpClient {
    private readonly socket: WebSocket;
    private nextId = 1;
    private readonly pending = new Map<
        number,
        {
            resolve: (value: Record<string, JsonValue>) => void;
            reject: (reason?: unknown) => void;
        }
    >();
    private readonly notifications: CdpMessage[] = [];
    private readonly notificationListeners = new Map<
        string,
        Set<(message: CdpMessage) => void>
    >();

    private constructor(socket: WebSocket) {
        this.socket = socket;
        socket.addEventListener("message", (event) => {
            const message = JSON.parse(String(event.data)) as CdpMessage;
            if (!message.id) {
                this.notifications.push(message);
                if (this.notifications.length > 200) {
                    this.notifications.splice(0, this.notifications.length - 200);
                }
                const listeners = this.notificationListeners.get(
                    String(message.method ?? ""),
                );
                if (listeners) {
                    for (const listener of listeners) {
                        listener(message);
                    }
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
        const payload: CdpMessage = { id, method, params };
        this.socket.send(JSON.stringify(payload));
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
        const exception = result.exceptionDetails as
            | { text?: string }
            | undefined;
        if (exception) {
            throw new Error(`Runtime.evaluate failed: ${exception.text ?? "unknown"}`);
        }
        return (result.result as { value?: T } | undefined)?.value as T;
    }

    close(): void {
        this.socket.close();
    }

    getRecentNotifications(): CdpMessage[] {
        return [...this.notifications];
    }

    onNotification(
        method: string,
        listener: (message: CdpMessage) => void,
    ): () => void {
        const listeners =
            this.notificationListeners.get(method) ?? new Set();
        listeners.add(listener);
        this.notificationListeners.set(method, listeners);
        return () => {
            const current = this.notificationListeners.get(method);
            current?.delete(listener);
            if (current && current.size === 0) {
                this.notificationListeners.delete(method);
            }
        };
    }
}

function summarizeLongTasks(snapshot: any): Record<string, JsonValue> {
    const longTasks = (snapshot?.events ?? []).filter(
        (event: any) => event.name === "browser.longtask",
    );
    const durations = longTasks.map((event: any) =>
        Number(event.detail?.durationMs ?? 0),
    );
    const totalMs = durations.reduce((sum: number, value: number) => sum + value, 0);
    return {
        count: longTasks.length,
        totalMs: round(totalMs),
        maxMs: round(durations.length > 0 ? Math.max(...durations) : 0),
        top: durations
            .sort((a, b) => b - a)
            .slice(0, 10)
            .map((value) => round(value)),
    };
}

const MEASURE_GROUP_PREFIXES = [
    "game.renderFrame",
    "territory.metaballFamily",
    "territory.perimeterFieldFamily",
    "territory.metaballRenderer",
    "territory.perimeterField",
    "territory.geometry",
    "game.input",
    "game.startGame",
] as const;

function summarizeMeasureGroups(snapshot: any): Record<string, JsonValue> {
    const groups = new Map<
        string,
        { count: number; totalMs: number; maxMs: number }
    >();
    for (const [name, aggregate] of Object.entries(snapshot?.measures ?? {})) {
        const typedAggregate = aggregate as any;
        const matchingPrefix =
            MEASURE_GROUP_PREFIXES.find((prefix) =>
                String(name).startsWith(prefix),
            ) ?? String(name).split(".").slice(0, 2).join(".");
        const bucket = groups.get(matchingPrefix) ?? {
            count: 0,
            totalMs: 0,
            maxMs: 0,
        };
        bucket.count += Number(typedAggregate.count ?? 0);
        bucket.totalMs += Number(typedAggregate.totalMs ?? 0);
        bucket.maxMs = Math.max(
            bucket.maxMs,
            Number(typedAggregate.maxMs ?? 0),
        );
        groups.set(matchingPrefix, bucket);
    }
    return {
        groups: [...groups.entries()]
            .map(([name, bucket]) => ({
                name,
                count: bucket.count,
                totalMs: round(bucket.totalMs),
                maxMs: round(bucket.maxMs),
            }))
            .sort((a, b) => (b.totalMs as number) - (a.totalMs as number))
            .slice(0, 20),
    };
}

function summarizeEventTiming(snapshot: any): Record<string, JsonValue> {
    const timingEvents = (snapshot?.events ?? []).filter(
        (event: any) => event.name === "browser.eventTiming",
    );
    const buckets = new Map<
        string,
        { count: number; totalMs: number; maxMs: number }
    >();
    for (const event of timingEvents) {
        const detail = event.detail ?? {};
        const name = String(detail.name ?? "unknown");
        const durationMs = Number(detail.durationMs ?? 0);
        const bucket = buckets.get(name) ?? { count: 0, totalMs: 0, maxMs: 0 };
        bucket.count += 1;
        bucket.totalMs += durationMs;
        bucket.maxMs = Math.max(bucket.maxMs, durationMs);
        buckets.set(name, bucket);
    }

    return {
        groups: [...buckets.entries()]
            .map(([name, bucket]) => ({
                name,
                count: bucket.count,
                avgMs: round(bucket.count > 0 ? bucket.totalMs / bucket.count : 0),
                maxMs: round(bucket.maxMs),
            }))
            .sort((a, b) => (b.maxMs as number) - (a.maxMs as number))
            .slice(0, 10),
    };
}

function summarizeInputLatency(snapshot: any): Record<string, JsonValue> {
    const latencyEvents = (snapshot?.events ?? []).filter((event: any) =>
        String(event.name ?? "").startsWith("input."),
    );
    const groups = new Map<
        string,
        { count: number; totalMs: number; maxMs: number }
    >();
    for (const event of latencyEvents) {
        const name = String(event.name ?? "unknown");
        const queueDelayMs = Number(event.detail?.queueDelayMs ?? 0);
        const bucket = groups.get(name) ?? { count: 0, totalMs: 0, maxMs: 0 };
        bucket.count += 1;
        bucket.totalMs += queueDelayMs;
        bucket.maxMs = Math.max(bucket.maxMs, queueDelayMs);
        groups.set(name, bucket);
    }
    return {
        groups: [...groups.entries()]
            .map(([name, bucket]) => ({
                name,
                count: bucket.count,
                avgMs: round(bucket.count > 0 ? bucket.totalMs / bucket.count : 0),
                maxMs: round(bucket.maxMs),
            }))
            .sort((a, b) => (b.maxMs as number) - (a.maxMs as number))
            .slice(0, 20),
    };
}

function summarizeTerritorySchedulerSnapshot(
    scheduler: Record<string, JsonValue> | null,
): Record<string, JsonValue> | null {
    if (!scheduler) return null;
    return {
        territory: {
            lastUpdateMs: round(Number(scheduler.lastTerritoryUpdateCostMs ?? 0)),
            lastPresentedAtMs: round(
                Number(scheduler.lastTerritoryPresentedAtMs ?? 0),
            ),
            deferralActive: Boolean(scheduler.territoryDeferralActive),
            deferredFrames: Number(scheduler.deferredTerritoryFrameCount ?? 0),
            deferReason: scheduler.deferredTerritoryReason ?? null,
            cadenceSkips: Number(scheduler.territoryCadenceSkipCount ?? 0),
            lastMode: scheduler.territoryLastMode ?? null,
        },
        territoryAsync: {
            scheduled: Boolean(scheduler.territoryPresentationScheduled),
            running: Boolean(scheduler.territoryPresentationRunning),
            postedCount: Number(scheduler.territoryPresentationPostedCount ?? 0),
            completedCount: Number(
                scheduler.territoryPresentationCompletedCount ?? 0,
            ),
            supersededCount: Number(
                scheduler.territoryPresentationSupersededCount ?? 0,
            ),
            queueWaitMs: round(
                Number(scheduler.territoryPresentationLastQueueWaitMs ?? 0),
            ),
            commitLagMs: round(
                Number(scheduler.territoryPresentationLastCommitLagMs ?? 0),
            ),
            pendingRequestId:
                scheduler.territoryPresentationPendingRequestId ?? null,
            pendingMode: scheduler.territoryPresentationPendingMode ?? null,
            pendingAgeMs: round(
                Number(scheduler.territoryPresentationPendingAgeMs ?? 0),
            ),
        },
        ships: {
            lastRenderMs: round(Number(scheduler.lastShipRenderCostMs ?? 0)),
            lastPresentedAtMs: round(
                Number(scheduler.lastShipRenderPresentedAtMs ?? 0),
            ),
            deferralActive: Boolean(scheduler.shipRenderDeferralActive),
            deferredFrames: Number(scheduler.deferredShipRenderFrameCount ?? 0),
            deferReason: scheduler.deferredShipRenderReason ?? null,
            cadenceSkips: Number(scheduler.shipRenderCadenceSkipCount ?? 0),
        },
        orders: {
            queuedMutations: Number(scheduler.queuedOrderMutations ?? 0),
            inputPriorityUntilMs: round(
                Number(scheduler.territoryInputPriorityUntilMs ?? 0),
            ),
        },
    };
}

function summarizePerfSnapshot(snapshot: any): Record<string, JsonValue> {
    const measures = Object.entries(snapshot?.measures ?? {})
        .map(([name, aggregate]: [string, any]) => ({
            name,
            count: aggregate.count,
            totalMs: round(aggregate.totalMs ?? 0),
            maxMs: round(aggregate.maxMs ?? 0),
            lastMs: round(aggregate.lastMs ?? 0),
            avgMs: round(
                aggregate.count > 0
                    ? (aggregate.totalMs ?? 0) / aggregate.count
                    : 0,
            ),
        }))
        .sort((a, b) => (b.totalMs as number) - (a.totalMs as number))
        .slice(0, 40);

    const frameMeasures = measures.filter((entry) =>
        entry.name.startsWith("game.renderFrame."),
    );

    const eventCounts = new Map<string, number>();
    for (const event of snapshot?.events ?? []) {
        const name = String(event.name ?? "unknown");
        eventCounts.set(name, (eventCounts.get(name) ?? 0) + 1);
    }

    return {
        topMeasures: measures,
        highlightMeasures: measures.filter((entry) =>
            [
                "game.renderFrame.territory.",
                "game.renderFrame.renderFamilyInput.",
                "game.renderFrame.geometry.",
                "game.renderFrame.ownership.",
                "game.renderFrame.connections",
                "game.renderFrame.orderArrows",
                "game.renderFrame.tickEvents.",
                "game.renderFrame.ships",
                "game.renderFrame.shipParticleUpdate",
                "game.renderFrame.selectionOverlay",
                "territory.metaballFamily.",
                "territory.perimeterFieldFamily.",
                "territory.metaballRenderer.",
                "game.renderFrame.ownership.",
                "game.renderFrame.geometry.",
                "game.renderFrame.renderFamilyInput.",
                "game.renderFrame.territory.",
            ].some((prefix) => entry.name.startsWith(prefix)),
        ),
        renderLineItems: measures.filter((entry) =>
            [
                "game.renderFrame.ownership.",
                "game.renderFrame.geometry.",
                "game.renderFrame.renderFamilyInput.",
                "game.renderFrame.territory.",
                "game.renderFrame.connections",
                "game.renderFrame.orderArrows",
                "game.renderFrame.stars",
                "game.renderFrame.ships",
                "game.renderFrame.shipParticleUpdate",
                "game.renderFrame.selectionOverlay",
            ].some((prefix) => entry.name.startsWith(prefix)),
        ),
        frameMeasures: frameMeasures.slice(0, 25),
        measureGroups: summarizeMeasureGroups(snapshot),
        eventCounts: [...eventCounts.entries()]
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => (b.count as number) - (a.count as number))
            .slice(0, 25),
        longTasks: summarizeLongTasks(snapshot),
        eventTiming: summarizeEventTiming(snapshot),
        inputLatency: summarizeInputLatency(snapshot),
        recentEvents: (snapshot?.events ?? []).slice(-40),
    };
}

function summarizeCpuProfile(profile: any): CpuHotspot[] {
    const nodes = new Map<number, any>();
    for (const node of profile.nodes ?? []) {
        nodes.set(node.id, node);
    }
    const totals = new Map<string, { selfMs: number; sampleCount: number }>();
    const samples: number[] = profile.samples ?? [];
    const timeDeltas: number[] = profile.timeDeltas ?? [];
    for (let index = 0; index < samples.length; index++) {
        const nodeId = samples[index];
        const deltaUs = timeDeltas[index] ?? 0;
        const node = nodes.get(nodeId);
        const frame = node?.callFrame ?? {};
        const functionName =
            typeof frame.functionName === "string" && frame.functionName.length > 0
                ? frame.functionName
                : "(anonymous)";
        const url = typeof frame.url === "string" ? frame.url.split("/").slice(-1)[0] : "";
        const line = typeof frame.lineNumber === "number" ? frame.lineNumber + 1 : 0;
        const label = url ? `${functionName} (${url}:${line})` : functionName;
        const bucket = totals.get(label) ?? { selfMs: 0, sampleCount: 0 };
        bucket.selfMs += deltaUs / 1000;
        bucket.sampleCount += 1;
        totals.set(label, bucket);
    }

    return [...totals.entries()]
        .map(([label, bucket]) => ({
            label,
            selfMs: round(bucket.selfMs),
            sampleCount: bucket.sampleCount,
        }))
        .sort((a, b) => b.selfMs - a.selfMs)
        .slice(0, 20);
}

function isTraceDurationEvent(event: any): boolean {
    return Boolean(
        event &&
            typeof event.name === "string" &&
            typeof event.cat === "string" &&
            event.ph === "X" &&
            typeof event.dur === "number",
    );
}

function collectMainThreadIds(traceEvents: readonly any[]): Set<string> {
    const mainThreadIds = new Set<string>();
    for (const event of traceEvents) {
        if (event?.name !== "thread_name") continue;
        const threadName = String(event.args?.name ?? "");
        if (
            threadName === "CrRendererMain" ||
            threadName === "MainThread"
        ) {
            mainThreadIds.add(`${String(event.pid)}:${String(event.tid)}`);
        }
    }
    return mainThreadIds;
}

function summarizeTraceBuckets(traceEvents: readonly any[]): {
    all: TraceDurationBucket[];
    mainThread: TraceDurationBucket[];
    largestSlices: Array<Record<string, JsonValue>>;
} {
    const mainThreadIds = collectMainThreadIds(traceEvents);
    const allBuckets = new Map<string, TraceDurationBucket>();
    const mainThreadBuckets = new Map<string, TraceDurationBucket>();
    const largestSlices: Array<Record<string, JsonValue>> = [];

    const append = (
        bucketMap: Map<string, TraceDurationBucket>,
        event: any,
        durationMs: number,
    ) => {
        const key = `${String(event.cat)}::${String(event.name)}`;
        const bucket = bucketMap.get(key) ?? {
            name: String(event.name),
            cat: String(event.cat),
            totalMs: 0,
            maxMs: 0,
            count: 0,
        };
        bucket.totalMs += durationMs;
        bucket.maxMs = Math.max(bucket.maxMs, durationMs);
        bucket.count += 1;
        bucketMap.set(key, bucket);
    };

    for (const event of traceEvents) {
        if (!isTraceDurationEvent(event)) continue;
        const durationMs = Number(event.dur) / 1000;
        append(allBuckets, event, durationMs);
        const threadKey = `${String(event.pid)}:${String(event.tid)}`;
        if (mainThreadIds.has(threadKey)) {
            append(mainThreadBuckets, event, durationMs);
        }
        largestSlices.push({
            name: String(event.name),
            cat: String(event.cat),
            durMs: round(durationMs),
            tsMs: round(Number(event.ts ?? 0) / 1000),
            pid: Number(event.pid ?? 0),
            tid: Number(event.tid ?? 0),
        });
    }

    const sortBuckets = (buckets: Map<string, TraceDurationBucket>) =>
        [...buckets.values()]
            .map((bucket) => ({
                ...bucket,
                totalMs: round(bucket.totalMs),
                maxMs: round(bucket.maxMs),
            }))
            .sort((a, b) => b.totalMs - a.totalMs)
            .slice(0, 25);

    return {
        all: sortBuckets(allBuckets),
        mainThread: sortBuckets(mainThreadBuckets),
        largestSlices: largestSlices
            .sort((a, b) => Number(b.durMs ?? 0) - Number(a.durMs ?? 0))
            .slice(0, 25),
    };
}

function summarizeNumericSamples(
    values: number[],
): Record<string, JsonValue> | null {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const p95Index = Math.min(
        sorted.length - 1,
        Math.max(0, Math.ceil(sorted.length * 0.95) - 1),
    );
    const total = values.reduce((sum, value) => sum + value, 0);
    return {
        count: values.length,
        avgMs: round(total / values.length),
        minMs: round(sorted[0]),
        p95Ms: round(sorted[p95Index]),
        maxMs: round(sorted[sorted.length - 1]),
    };
}

function summarizeSampleMetric(
    sampleSet: any,
    metricKey: string,
): Record<string, JsonValue> | null {
    const values = (sampleSet?.samples ?? [])
        .map((sample: any) => Number(sample?.[metricKey]))
        .filter((value: number) => Number.isFinite(value) && value >= 0);
    return summarizeNumericSamples(values);
}

function summarizeOrderPathGap(
    actionResult: any,
): Record<string, JsonValue> | null {
    const pointerIssueAvg = Number(
        summarizeSampleMetric(
            actionResult?.pointerSamples,
            "issueCommitMs",
        )?.avgMs ?? Number.NaN,
    );
    const directIssueAvg = Number(
        summarizeSampleMetric(
            actionResult?.directSamples,
            "issueCommitMs",
        )?.avgMs ?? Number.NaN,
    );
    const pointerCancelAvg = Number(
        summarizeSampleMetric(
            actionResult?.pointerSamples,
            "cancelCommitMs",
        )?.avgMs ?? Number.NaN,
    );
    const directCancelAvg = Number(
        summarizeSampleMetric(
            actionResult?.directSamples,
            "cancelCommitMs",
        )?.avgMs ?? Number.NaN,
    );
    if (
        !Number.isFinite(pointerIssueAvg) &&
        !Number.isFinite(pointerCancelAvg)
    ) {
        return null;
    }
    return {
        pointerIssueCommit: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "issueCommitMs",
        ),
        pointerIssueAfterTargetClick: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "issueAfterTargetClickMs",
        ),
        pointerIssueQueueFlush: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "issueQueueFlushMs",
        ),
        pointerIssueQueueFlushAfterTargetClick: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "issueQueueFlushAfterTargetClickMs",
        ),
        pointerIssuePerfEvent: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "issuePerfEventMs",
        ),
        pointerIssuePerfEventAfterTargetClick: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "issuePerfEventAfterTargetClickMs",
        ),
        pointerCancelCommit: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "cancelCommitMs",
        ),
        pointerCancelQueueFlush: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "cancelQueueFlushMs",
        ),
        pointerCancelPerfEvent: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "cancelPerfEventMs",
        ),
        directIssueCommit: summarizeSampleMetric(
            actionResult?.directSamples,
            "issueCommitMs",
        ),
        directIssuePerfEvent: summarizeSampleMetric(
            actionResult?.directSamples,
            "issuePerfEventMs",
        ),
        directCancelCommit: summarizeSampleMetric(
            actionResult?.directSamples,
            "cancelCommitMs",
        ),
        directCancelPerfEvent: summarizeSampleMetric(
            actionResult?.directSamples,
            "cancelPerfEventMs",
        ),
        pointerVsDirectIssueGapMs:
            Number.isFinite(pointerIssueAvg) && Number.isFinite(directIssueAvg)
                ? round(pointerIssueAvg - directIssueAvg)
                : null,
        pointerTargetClickVsDirectIssueGapMs:
            Number.isFinite(
                Number(
                    summarizeSampleMetric(
                        actionResult?.pointerSamples,
                        "issueAfterTargetClickMs",
                    )?.avgMs ?? Number.NaN,
                ),
            ) && Number.isFinite(directIssueAvg)
                ? round(
                      Number(
                          summarizeSampleMetric(
                              actionResult?.pointerSamples,
                              "issueAfterTargetClickMs",
                          )?.avgMs ?? 0,
                      ) - directIssueAvg,
                  )
                : null,
        pointerVsDirectCancelGapMs:
            Number.isFinite(pointerCancelAvg) &&
            Number.isFinite(directCancelAvg)
                ? round(pointerCancelAvg - directCancelAvg)
                : null,
    };
}

function summarizeScenarioCollection(
    scenarios: Record<string, any>,
): Record<string, JsonValue> {
    const summaryEntries = Object.entries(scenarios).map(([name, scenario]) => ({
        name,
        requestedMode: scenario?.requestedMode ?? null,
        elapsedMs: round(Number(scenario?.elapsedMs ?? 0)),
        longTasks: scenario?.perf?.longTasks ?? null,
        frameMeasures: scenario?.perf?.frameMeasures ?? [],
        highlightMeasures: scenario?.perf?.highlightMeasures ?? [],
        inputLatency: scenario?.perf?.inputLatency ?? null,
        renderLineItems: scenario?.perf?.renderLineItems ?? [],
        orderLatency: summarizeOrderPathGap(scenario?.actionResult),
        cpuHotspots: scenario?.cpuHotspots ?? [],
        territoryScheduler: scenario?.territoryScheduler ?? null,
        traceMainThread: scenario?.trace?.mainThreadTopByTotalMs ?? [],
    }));
    return {
        scenarios: summaryEntries,
        largestPointerVsDirectIssueGapMs: summaryEntries
            .map((entry) =>
                Number(entry.orderLatency?.pointerVsDirectIssueGapMs ?? Number.NaN),
            )
            .filter((value) => Number.isFinite(value))
            .sort((a, b) => b - a)
            .slice(0, 5)
            .map((value) => round(value)),
    };
}

function summarizeTrace(traceEvents: readonly any[]): Record<string, JsonValue> {
    const summary = summarizeTraceBuckets(traceEvents);
    return {
        eventCount: traceEvents.length,
        mainThreadCount: summary.mainThread.length,
        topByTotalMs: summary.all,
        mainThreadTopByTotalMs: summary.mainThread,
        largestSlices: summary.largestSlices,
    };
}

async function collectTraceDuring<T>(
    client: CdpClient,
    action: () => Promise<T>,
): Promise<{ actionResult: T; traceSummary: Record<string, JsonValue> }> {
    const traceEvents: any[] = [];
    let resolveComplete!: () => void;
    let rejectComplete!: (reason?: unknown) => void;
    const tracingComplete = new Promise<void>((resolve, reject) => {
        resolveComplete = resolve;
        rejectComplete = reject;
    });
    const timeoutId = setTimeout(() => {
        rejectComplete(new Error("Timed out waiting for CDP tracing to complete."));
    }, 120_000);
    const detachData = client.onNotification("Tracing.dataCollected", (message) => {
        const values = message.params?.value;
        if (Array.isArray(values)) {
            traceEvents.push(...values);
        }
    });
    const detachComplete = client.onNotification("Tracing.tracingComplete", () => {
        clearTimeout(timeoutId);
        resolveComplete();
    });

    await client.send("Tracing.start", {
        categories: [
            "-*",
            "devtools.timeline",
            "blink.user_timing",
            "loading",
            "v8.execute",
            "disabled-by-default-devtools.timeline",
            "disabled-by-default-devtools.timeline.frame",
            "disabled-by-default-v8.cpu_profiler",
        ].join(","),
        transferMode: "ReportEvents",
    });

    let tracingEnded = false;
    try {
        const actionResult = await action();
        await client.send("Tracing.end");
        tracingEnded = true;
        await tracingComplete;
        return {
            actionResult,
            traceSummary: summarizeTrace(traceEvents),
        };
    } finally {
        if (!tracingEnded) {
            try {
                await client.send("Tracing.end");
            } catch {}
        }
        detachData();
        detachComplete();
        clearTimeout(timeoutId);
    }
}

function summarizeDevtoolsMetrics(metricsPayload: any): Record<string, JsonValue> {
    const selectedNames = new Set([
        "TaskDuration",
        "ScriptDuration",
        "LayoutDuration",
        "RecalcStyleDuration",
        "JSHeapUsedSize",
        "JSHeapTotalSize",
        "Nodes",
        "JSEventListeners",
        "Frames",
        "LayoutCount",
        "RecalcStyleCount",
    ]);
    const values = new Map<string, number>();
    for (const metric of metricsPayload?.metrics ?? []) {
        if (!selectedNames.has(String(metric.name))) continue;
        values.set(String(metric.name), round(Number(metric.value ?? 0)));
    }
    return Object.fromEntries(values.entries());
}

async function collectBrowserRuntimeStats(client: CdpClient): Promise<Record<string, JsonValue>> {
    return await client.evaluate<Record<string, JsonValue>>(`
        (() => {
            const paints = performance.getEntriesByType("paint").map((entry) => ({
                name: entry.name,
                startTimeMs: Number(entry.startTime.toFixed(3)),
                durationMs: Number(entry.duration.toFixed(3)),
            }));
            const nav = performance.getEntriesByType("navigation")[0];
            const navSummary = nav
                ? {
                    domContentLoadedMs: Number(nav.domContentLoadedEventEnd.toFixed(3)),
                    loadEventMs: Number(nav.loadEventEnd.toFixed(3)),
                    responseEndMs: Number(nav.responseEnd.toFixed(3)),
                    transferSize: nav.transferSize,
                    encodedBodySize: nav.encodedBodySize,
                    decodedBodySize: nav.decodedBodySize,
                }
                : null;
            const memory = performance.memory
                ? {
                    jsHeapUsedSize: performance.memory.usedJSHeapSize,
                    jsHeapTotalSize: performance.memory.totalJSHeapSize,
                    jsHeapLimitSize: performance.memory.jsHeapSizeLimit,
                }
                : null;
            return { paints, navigation: navSummary, memory };
        })()
    `);
}

function summarizeNetworkFailures(client: CdpClient): Array<Record<string, JsonValue>> {
    return client
        .getRecentNotifications()
        .filter((message) => message.method === "Network.loadingFailed")
        .slice(-20)
        .map((message) => {
            const params = message.params ?? {};
            return {
                requestId: params.requestId ?? null,
                blockedReason: params.blockedReason ?? null,
                canceled: params.canceled ?? null,
                errorText: params.errorText ?? null,
                type: params.type ?? null,
            };
        });
}

async function dispatchMouseClick(
    client: CdpClient,
    x: number,
    y: number,
    button: "left" | "right" = "left",
): Promise<void> {
    const clickCount = 1;
    await client.send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: round(x),
        y: round(y),
        button: "none",
    });
    await client.send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: round(x),
        y: round(y),
        button,
        buttons: button === "left" ? 1 : 2,
        clickCount,
    });
    await client.send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: round(x),
        y: round(y),
        button,
        buttons: 0,
        clickCount,
    });
}

async function waitForOrderState(
    client: CdpClient,
    sourceId: string,
    predicateSource: string,
    timeoutMs = 3000,
): Promise<Record<string, JsonValue>> {
    const sourceLiteral = JSON.stringify(sourceId);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const result = await client.evaluate<Record<string, JsonValue>>(`
            (async () => {
                const status = await window.__PAX_BENCH__.getOrderStatus(${sourceLiteral});
                if (!status) return { matched: false, status: null, observedAtMs: performance.now() };
                const predicate = (${predicateSource});
                return {
                    matched: Boolean(predicate(status)),
                    status,
                    observedAtMs: performance.now(),
                };
            })()
        `);
        if (result.matched) return result;
        await sleep(24);
    }
    return {
        matched: false,
        status: await client.evaluate<Record<string, JsonValue> | null>(
            `window.__PAX_BENCH__.getOrderStatus(${sourceLiteral})`,
        ) ?? null,
        observedAtMs: await client.evaluate<number>("performance.now()"),
    };
}

async function waitForPerfEvent(
    client: CdpClient,
    sinceIndex: number,
    name: string,
    detailMatchers: Record<string, JsonValue> = {},
    timeoutMs = 3000,
): Promise<Record<string, JsonValue>> {
    const nameLiteral = JSON.stringify(name);
    const detailLiteral = JSON.stringify(detailMatchers);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const result = await client.evaluate<Record<string, JsonValue>>(`
            (() => {
                return {
                    event: window.__PAX_BENCH__.findPerfEventSince(
                        ${sinceIndex},
                        ${nameLiteral},
                        ${detailLiteral},
                    ),
                };
            })()
        `);
        if (result.event) {
            return {
                matched: true,
                event: result.event,
            };
        }
        await sleep(12);
    }
    return { matched: false, event: null };
}

async function executePointerOrderLoop(
    client: CdpClient,
    iterations: number,
): Promise<JsonValue> {
    const samples: Array<Record<string, JsonValue>> = [];
    for (let i = 0; i < iterations; i += 1) {
        const path = await client.evaluate<any>(
            "window.__PAX_BENCH__.getOrderPointerPath()",
        );
        if (!path) {
            samples.push({ ok: false, reason: "missing-order-path" });
            await sleep(80);
            continue;
        }
        const issueStartedAt = await client.evaluate<number>("performance.now()");
        const issueEventStartIndex = await client.evaluate<number>(
            "window.__PAX_BENCH__.getPerfEventCursor()",
        );
        await dispatchMouseClick(
            client,
            Number(path.sourceClientX),
            Number(path.sourceClientY),
        );
        await sleep(24);
        const targetClickStartedAt = await client.evaluate<number>(
            "performance.now()",
        );
        await dispatchMouseClick(
            client,
            Number(path.targetClientX),
            Number(path.targetClientY),
        );
        const issueApplied = await waitForOrderState(
            client,
            String(path.sourceId),
            `(status) => status.targetId === ${JSON.stringify(path.targetId)} || status.queuedOrderTargetId === ${JSON.stringify(path.targetId)}`,
        );
        const issueQueueFlush = await waitForPerfEvent(
            client,
            issueEventStartIndex,
            "input.orderQueue.flushed",
        );
        const issuePerfEvent = await waitForPerfEvent(
            client,
            issueEventStartIndex,
            "game.order.issued",
            {
                from: `Star ${String(path.sourceId)}`,
                to: `Star ${String(path.targetId)}`,
            },
        );
        const cancelStartedAt = await client.evaluate<number>("performance.now()");
        const cancelEventStartIndex = await client.evaluate<number>(
            "window.__PAX_BENCH__.getPerfEventCursor()",
        );
        await dispatchMouseClick(
            client,
            Number(path.sourceClientX),
            Number(path.sourceClientY),
            "right",
        );
        const cancelApplied = await waitForOrderState(
            client,
            String(path.sourceId),
            `(status) => !status.targetId && !status.queuedOrderTargetId`,
        );
        const cancelQueueFlush = await waitForPerfEvent(
            client,
            cancelEventStartIndex,
            "input.orderQueue.flushed",
        );
        const cancelPerfEvent = await waitForPerfEvent(
            client,
            cancelEventStartIndex,
            "game.order.cancelled",
            {
                from: `Star ${String(path.sourceId)}`,
            },
        );
        samples.push({
            ok: true,
            sourceId: path.sourceId ?? null,
            targetId: path.targetId ?? null,
            issueCommitMs: round(
                Number(issueApplied.observedAtMs ?? issueStartedAt) -
                    issueStartedAt,
            ),
            issueAfterTargetClickMs: round(
                Number(issueApplied.observedAtMs ?? targetClickStartedAt) -
                    targetClickStartedAt,
            ),
            cancelCommitMs: round(
                Number(cancelApplied.observedAtMs ?? cancelStartedAt) -
                    cancelStartedAt,
            ),
            issueQueueFlushMs: issueQueueFlush.event
                ? round(Number((issueQueueFlush.event as Record<string, JsonValue>).atMs ?? issueStartedAt) - issueStartedAt)
                : null,
            issueQueueFlushAfterTargetClickMs: issueQueueFlush.event
                ? round(
                      Number(
                          (issueQueueFlush.event as Record<string, JsonValue>)
                              .atMs ?? targetClickStartedAt,
                      ) - targetClickStartedAt,
                  )
                : null,
            issuePerfEventMs: issuePerfEvent.event
                ? round(Number((issuePerfEvent.event as Record<string, JsonValue>).atMs ?? issueStartedAt) - issueStartedAt)
                : null,
            issuePerfEventAfterTargetClickMs: issuePerfEvent.event
                ? round(
                      Number(
                          (issuePerfEvent.event as Record<string, JsonValue>)
                              .atMs ?? targetClickStartedAt,
                      ) - targetClickStartedAt,
                  )
                : null,
            issueMatched: issueApplied.matched ?? false,
            cancelMatched: cancelApplied.matched ?? false,
            cancelQueueFlushMs: cancelQueueFlush.event
                ? round(Number((cancelQueueFlush.event as Record<string, JsonValue>).atMs ?? cancelStartedAt) - cancelStartedAt)
                : null,
            cancelPerfEventMs: cancelPerfEvent.event
                ? round(Number((cancelPerfEvent.event as Record<string, JsonValue>).atMs ?? cancelStartedAt) - cancelStartedAt)
                : null,
            issueStatus: issueApplied.status ?? null,
            cancelStatus: cancelApplied.status ?? null,
        });
        await sleep(120);
    }
    return { samples };
}

async function executeDirectOrderLoop(
    client: CdpClient,
    iterations: number,
): Promise<JsonValue> {
    const samples: Array<Record<string, JsonValue>> = [];
    for (let i = 0; i < iterations; i += 1) {
        const order = await client.evaluate<Record<string, JsonValue> | null>(
            "window.__PAX_BENCH__.resolveSampleOrder()",
        );
        if (!order?.sourceId || !order?.targetId) {
            samples.push({ ok: false, reason: "missing-direct-order" });
            await sleep(80);
            continue;
        }
        const sourceId = String(order.sourceId);
        const targetId = String(order.targetId);

        const issueStartedAt = await client.evaluate<number>("performance.now()");
        const issueEventStartIndex = await client.evaluate<number>(
            "window.__PAX_BENCH__.getPerfEventCursor()",
        );
        const issueAccepted = await client.evaluate<boolean>(
            `window.__PAX_BENCH__.issueOrderDirect(${JSON.stringify(sourceId)}, ${JSON.stringify(targetId)}, false)`,
        );
        const issueApplied = await waitForOrderState(
            client,
            sourceId,
            `(status) => status.targetId === ${JSON.stringify(targetId)} || status.queuedOrderTargetId === ${JSON.stringify(targetId)}`,
        );
        const issuePerfEvent = await waitForPerfEvent(
            client,
            issueEventStartIndex,
            "game.order.issued",
            {
                from: `Star ${sourceId}`,
                to: `Star ${targetId}`,
            },
        );

        const cancelStartedAt = await client.evaluate<number>("performance.now()");
        const cancelEventStartIndex = await client.evaluate<number>(
            "window.__PAX_BENCH__.getPerfEventCursor()",
        );
        await client.evaluate<void>(
            `window.__PAX_BENCH__.cancelOrderDirect(${JSON.stringify(sourceId)})`,
        );
        const cancelApplied = await waitForOrderState(
            client,
            sourceId,
            `(status) => !status.targetId && !status.queuedOrderTargetId`,
        );
        const cancelPerfEvent = await waitForPerfEvent(
            client,
            cancelEventStartIndex,
            "game.order.cancelled",
            {
                from: `Star ${sourceId}`,
            },
        );

        samples.push({
            ok: true,
            sourceId,
            targetId,
            issueAccepted,
            issueCommitMs: round(
                Number(issueApplied.observedAtMs ?? issueStartedAt) -
                    issueStartedAt,
            ),
            issuePerfEventMs: issuePerfEvent.event
                ? round(
                      Number(
                          (issuePerfEvent.event as Record<string, JsonValue>)
                              .atMs ?? issueStartedAt,
                      ) - issueStartedAt,
                  )
                : null,
            issueMatched: issueApplied.matched ?? false,
            cancelCommitMs: round(
                Number(cancelApplied.observedAtMs ?? cancelStartedAt) -
                    cancelStartedAt,
            ),
            cancelPerfEventMs: cancelPerfEvent.event
                ? round(
                      Number(
                          (cancelPerfEvent.event as Record<string, JsonValue>)
                              .atMs ?? cancelStartedAt,
                      ) - cancelStartedAt,
                  )
                : null,
            cancelMatched: cancelApplied.matched ?? false,
            issueStatus: issueApplied.status ?? null,
            cancelStatus: cancelApplied.status ?? null,
        });
        await sleep(80);
    }
    return { samples };
}

type ScenarioAction = string | ((client: CdpClient) => Promise<JsonValue>);

async function profileScenario(
    client: CdpClient,
    label: string,
    action: ScenarioAction,
    options?: {
        timeoutMs?: number;
        expectedMode?: string;
    },
): Promise<Record<string, JsonValue>> {
    const timeoutMs = options?.timeoutMs ?? 90_000;
    console.log(JSON.stringify({ stage: "scenario_start", label }));
    await client.send("Profiler.enable");
    await client.send("Profiler.setSamplingInterval", { interval: 1000 });
    await client.send("Profiler.start");
    const scenarioStartedAt = Date.now();
    const traced = await collectTraceDuring(client, async () => {
        return await Promise.race([
            (typeof action === "string"
                ? client.evaluate<JsonValue>(action)
                : action(client)),
            sleep(timeoutMs).then(() => {
                throw new Error(`Scenario timed out after ${timeoutMs}ms: ${label}`);
            }),
        ]);
    });
    const modeWait =
        options?.expectedMode == null
            ? null
            : await client.evaluate<Record<string, JsonValue>>(
                  `window.__PAX_BENCH__.waitForRenderMode(${JSON.stringify(options.expectedMode)}, 6000)`,
              );
    const profileResult = await client.send("Profiler.stop");
    const snapshot = await client.evaluate<any>(
        "window.__PAX_BENCH__.snapshotPerfCapture()",
    );
    const stateSummary = await client.evaluate<any>(
        "window.__PAX_BENCH__.getStateSummary()",
    );
    const territoryScheduler = await client.evaluate<Record<string, JsonValue> | null>(
        "window.__PAX_BENCH__.getTerritorySchedulerSnapshot()",
    );
    const browserRuntime = await collectBrowserRuntimeStats(client);
    const devtoolsMetrics = await client.send("Performance.getMetrics");
    if (
        options?.expectedMode &&
        (modeWait?.matches !== true ||
            stateSummary.renderMode !== options.expectedMode)
    ) {
        throw new Error(
            `Scenario ${label} expected renderMode=${options.expectedMode} but saw ${String(stateSummary.renderMode)} after ${String(modeWait?.attempts ?? 0)} attempts`,
        );
    }

    const result = {
        label,
        startedAt: new Date(scenarioStartedAt).toISOString(),
        elapsedMs: Date.now() - scenarioStartedAt,
        actionResult: traced.actionResult,
        stateSummary,
        modeWait,
        requestedMode: options?.expectedMode ?? null,
        perf: summarizePerfSnapshot(snapshot),
        trace: traced.traceSummary,
        territoryScheduler: summarizeTerritorySchedulerSnapshot(
            territoryScheduler,
        ),
        browserRuntime,
        devtoolsMetrics: summarizeDevtoolsMetrics(devtoolsMetrics),
        cpuHotspots: summarizeCpuProfile(profileResult.profile),
        networkFailures: summarizeNetworkFailures(client),
    };
    console.log(JSON.stringify({ stage: "scenario_done", label }));
    return result;
}

async function main(): Promise<void> {
    const appPort = await findAvailablePort(4173);
    const cdpPort = await findAvailablePort(9223);
    const appRootUrl = `http://${HOST}:${appPort}/`;
    const appUrl = `${appRootUrl}__bench`;
    const browserPath = resolveBrowserPath();
    const profileDir = mkdtempSync(path.join(tmpdir(), "pax-bench-browser-"));
    const devServer = Bun.spawn(
        ["cmd.exe", "/c", "bunx", "vite", "dev", "--host", HOST, "--port", String(appPort)],
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
            browserPath,
            `--remote-debugging-port=${cdpPort}`,
            "--headless=new",
            "--disable-gpu",
            "--no-first-run",
            "--no-default-browser-check",
            "--window-size=1600,900",
            `--user-data-dir=${profileDir}`,
            "about:blank",
        ],
        {
            stdout: "ignore",
            stderr: "ignore",
        },
    );

    try {
        console.log(JSON.stringify({ stage: "ports", host: HOST, appPort, cdpPort }));
        await waitForDevAppReady(appUrl, 60_000);
        console.log(JSON.stringify({ stage: "server_ready", appUrl }));
        const targets = await waitForJson<any[]>(
            `http://${HOST}:${cdpPort}/json/list`,
            30_000,
        );
        const pageTarget = targets.find((target) => target.type === "page");
        if (!pageTarget?.webSocketDebuggerUrl) {
            throw new Error("Could not locate browser page target for CDP.");
        }

        const client = await CdpClient.connect(pageTarget.webSocketDebuggerUrl);
        await client.send("Page.enable");
        await client.send("Runtime.enable");
        await client.send("Log.enable");
        await client.send("Network.enable");
        await client.send("Performance.enable");
        await client.send("Page.navigate", { url: appUrl });
        await waitForBenchBridge(client, 45_000);
        console.log(JSON.stringify({ stage: "bridge_ready", appUrl }));

        await client.evaluate(`
            (async () => {
                const bench = window.__PAX_BENCH__;
                if (!bench) return false;
                bench.enablePerfCapture();
                bench.setLogFlags({
                    data: false,
                    state: false,
                    renderer: false,
                    input: false,
                    canvas: false,
                    sys: false,
                    success: false,
                });
                return true;
            })()
        `);

        const scenarios: Record<string, JsonValue> = {};
        if (shouldRunScenario("mainMenuIdle")) {
            scenarios.mainMenuIdle = await profileScenario(
                client,
                "mainMenuIdle",
                `
                    (async () => {
                        window.__PAX_BENCH__.resetPerfCapture();
                        await window.__PAX_BENCH__.openGameShell();
                        await new Promise((resolve) => setTimeout(resolve, 1200));
                        return {
                            state: await window.__PAX_BENCH__.getStateSummary(),
                            frames: await window.__PAX_BENCH__.collectFrameStats(2200),
                        };
                    })()
                `,
            );
        }
        if (shouldRunScenario("metaballLoad")) {
            scenarios.metaballLoad = await profileScenario(
                client,
                "metaballLoad",
                `
                    (async () => {
                        window.__PAX_BENCH__.resetPerfCapture();
                        await window.__PAX_BENCH__.restartSinglePlayerGame();
                        const modePrep = await window.__PAX_BENCH__.ensureTerritoryMode("metaball");
                        return {
                            modePrep,
                            state: await window.__PAX_BENCH__.getStateSummary(),
                            frames: await window.__PAX_BENCH__.collectFrameStats(1600),
                        };
                    })()
                `,
                { expectedMode: "metaball" },
            );
        }
        if (shouldRunScenario("metaballGameplay")) {
            scenarios.metaballGameplay = await profileScenario(
                client,
                "metaballGameplay",
                `
                    (async () => {
                        window.__PAX_BENCH__.resetPerfCapture();
                        await window.__PAX_BENCH__.restartSinglePlayerGame();
                        const modePrep = await window.__PAX_BENCH__.ensureTerritoryMode("metaball");
                        await window.__PAX_BENCH__.beginGameplay();
                        await new Promise((resolve) => setTimeout(resolve, 1200));
                        return {
                            modePrep,
                            frames: await window.__PAX_BENCH__.collectFrameStats(2600),
                        };
                    })()
                `,
                { expectedMode: "metaball" },
            );
        }
        if (shouldRunScenario("metaballOrders")) {
            scenarios.metaballOrders = await profileScenario(
                client,
                "metaballOrders",
                async (scenarioClient) => {
                    await scenarioClient.evaluate(`
                        (async () => {
                            window.__PAX_BENCH__.resetPerfCapture();
                            await window.__PAX_BENCH__.restartSinglePlayerGame();
                            const modePrep = await window.__PAX_BENCH__.ensureTerritoryMode("metaball");
                            await window.__PAX_BENCH__.beginGameplay();
                            await new Promise((resolve) => setTimeout(resolve, 1200));
                            return modePrep;
                        })()
                    `);
                    const pointerSamples = await executePointerOrderLoop(
                        scenarioClient,
                        3,
                    );
                    const directSamples = await executeDirectOrderLoop(
                        scenarioClient,
                        4,
                    );
                    const frames = await scenarioClient.evaluate<JsonValue>(
                        "window.__PAX_BENCH__.collectFrameStats(1800)",
                    );
                    return { pointerSamples, directSamples, frames };
                },
                { expectedMode: "metaball" },
            );
        }
        if (shouldRunScenario("perimeterLoad")) {
            scenarios.perimeterLoad = await profileScenario(
                client,
                "perimeterLoad",
                `
                    (async () => {
                        window.__PAX_BENCH__.resetPerfCapture();
                        await window.__PAX_BENCH__.restartSinglePlayerGame();
                        const modePrep = await window.__PAX_BENCH__.ensureTerritoryMode("perimeter_field");
                        return {
                            modePrep,
                            state: await window.__PAX_BENCH__.getStateSummary(),
                            frames: await window.__PAX_BENCH__.collectFrameStats(1600),
                        };
                    })()
                `,
                { expectedMode: "perimeter_field" },
            );
        }
        if (shouldRunScenario("perimeterGameplay")) {
            scenarios.perimeterGameplay = await profileScenario(
                client,
                "perimeterGameplay",
                `
                    (async () => {
                        window.__PAX_BENCH__.resetPerfCapture();
                        await window.__PAX_BENCH__.restartSinglePlayerGame();
                        const modePrep = await window.__PAX_BENCH__.ensureTerritoryMode("perimeter_field");
                        await window.__PAX_BENCH__.beginGameplay();
                        await new Promise((resolve) => setTimeout(resolve, 1200));
                        return {
                            modePrep,
                            frames: await window.__PAX_BENCH__.collectFrameStats(2600),
                        };
                    })()
                `,
                { expectedMode: "perimeter_field" },
            );
        }
        if (shouldRunScenario("perimeterOrders")) {
            scenarios.perimeterOrders = await profileScenario(
                client,
                "perimeterOrders",
                async (scenarioClient) => {
                    await scenarioClient.evaluate(`
                        (async () => {
                            window.__PAX_BENCH__.resetPerfCapture();
                            await window.__PAX_BENCH__.restartSinglePlayerGame();
                            const modePrep = await window.__PAX_BENCH__.ensureTerritoryMode("perimeter_field");
                            await window.__PAX_BENCH__.beginGameplay();
                            await new Promise((resolve) => setTimeout(resolve, 1200));
                            return modePrep;
                        })()
                    `);
                    const pointerSamples = await executePointerOrderLoop(
                        scenarioClient,
                        3,
                    );
                    const directSamples = await executeDirectOrderLoop(
                        scenarioClient,
                        4,
                    );
                    const frames = await scenarioClient.evaluate<JsonValue>(
                        "window.__PAX_BENCH__.collectFrameStats(1800)",
                    );
                    return { pointerSamples, directSamples, frames };
                },
                { expectedMode: "perimeter_field" },
            );
        }

        const results = {
            generatedAt: new Date().toISOString(),
            browserPath,
            appUrl,
            ports: {
                appPort,
                cdpPort,
            },
            scenarios,
            analysis: summarizeScenarioCollection(scenarios),
        };

        mkdirSync(METRICS_DIR, { recursive: true });
        const outputPath = path.join(
            METRICS_DIR,
            "browser-gameplay-benchmark-latest.json",
        );
        writeFileSync(outputPath, JSON.stringify(results, null, 2), "utf8");
        console.log(JSON.stringify({ ok: true, outputPath, results }, null, 2));
        client.close();
    } finally {
        browser.kill();
        devServer.kill();
        await sleep(1000);
        try {
            rmSync(profileDir, { recursive: true, force: true });
        } catch {}
    }
}

await main();
