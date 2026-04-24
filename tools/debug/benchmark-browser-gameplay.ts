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

    private constructor(socket: WebSocket) {
        this.socket = socket;
        socket.addEventListener("message", (event) => {
            const message = JSON.parse(String(event.data)) as CdpMessage;
            if (!message.id) {
                this.notifications.push(message);
                if (this.notifications.length > 200) {
                    this.notifications.splice(0, this.notifications.length - 200);
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
                "territory.metaballFamily.",
                "territory.perimeterFieldFamily.",
                "territory.metaballRenderer.",
            ].some((prefix) => entry.name.startsWith(prefix)),
        ),
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
        await dispatchMouseClick(
            client,
            Number(path.sourceClientX),
            Number(path.sourceClientY),
        );
        await sleep(24);
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
        const cancelStartedAt = await client.evaluate<number>("performance.now()");
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
        samples.push({
            ok: true,
            sourceId: path.sourceId ?? null,
            targetId: path.targetId ?? null,
            issueCommitMs: round(
                Number(issueApplied.observedAtMs ?? issueStartedAt) -
                    issueStartedAt,
            ),
            cancelCommitMs: round(
                Number(cancelApplied.observedAtMs ?? cancelStartedAt) -
                    cancelStartedAt,
            ),
            issueMatched: issueApplied.matched ?? false,
            cancelMatched: cancelApplied.matched ?? false,
            issueStatus: issueApplied.status ?? null,
            cancelStatus: cancelApplied.status ?? null,
        });
        await sleep(120);
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
    const actionResult = await Promise.race([
        (typeof action === "string"
            ? client.evaluate<JsonValue>(action)
            : action(client)),
        sleep(timeoutMs).then(() => {
            throw new Error(`Scenario timed out after ${timeoutMs}ms: ${label}`);
        }),
    ]);
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
        actionResult,
        stateSummary,
        modeWait,
        requestedMode: options?.expectedMode ?? null,
        perf: summarizePerfSnapshot(snapshot),
        territoryScheduler,
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
                    const frames = await scenarioClient.evaluate<JsonValue>(
                        "window.__PAX_BENCH__.collectFrameStats(1800)",
                    );
                    return { pointerSamples, frames };
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
                    const frames = await scenarioClient.evaluate<JsonValue>(
                        "window.__PAX_BENCH__.collectFrameStats(1800)",
                    );
                    return { pointerSamples, frames };
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
