import {
    existsSync,
    mkdtempSync,
    mkdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { validateTransitionDiagnosticBundleForBenchmark } from "./transition-diagnostic-benchmark-validation";

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

interface TraceCategoryBucket {
    name: string;
    totalMs: number;
    maxMs: number;
    count: number;
}

interface SavedMapSummary {
    name: string;
    starCount: number;
    laneCount: number;
    runtimeConnectionCount: number;
    builtIn: boolean;
}

const ROOT = path.resolve(import.meta.dir, "..", "..");
const CLIENT_DIR = path.join(ROOT, "pax-fluxia");
const METRICS_DIR = path.join(ROOT, ".agent-harness", "metrics");
const TRACE_DIR = path.join(METRICS_DIR, "browser-traces");
const SCREENSHOT_DIR = path.join(METRICS_DIR, "browser-screenshots");
const HOST = "127.0.0.1";
const CONQUEST_DIAGNOSTIC_MAP = JSON.parse(
    existsSync(
        path.join(
            ROOT,
            "common",
            "resources",
            "fixture-maps",
            "metaball_conquest_lane_push.json",
        ),
    )
        ? readFileSync(
              path.join(
                  ROOT,
                  "common",
                  "resources",
                  "fixture-maps",
                  "metaball_conquest_lane_push.json",
              ),
              "utf8",
          )
        : "{}",
) as Record<string, JsonValue>;
const WRITE_TRACE_ARTIFACTS = /^(1|true|yes)$/i.test(
    process.env.PAX_WRITE_TRACE ?? "",
);
const CAPTURE_TRACE = !/^(0|false|no)$/i.test(
    process.env.PAX_BENCH_CAPTURE_TRACE ?? "",
);
const CAPTURE_CPU = !/^(0|false|no)$/i.test(
    process.env.PAX_BENCH_CAPTURE_CPU ?? "",
);
const BENCH_MAP_NAME = process.env.PAX_BENCH_MAP_NAME?.trim() || "";
const BENCH_TERRITORY_MODE = process.env.PAX_BENCH_TERRITORY_MODE?.trim() || "";
const INCLUDE_LEGACY_SCENARIOS = /^(1|true|yes)$/i.test(
    process.env.PAX_BENCH_INCLUDE_LEGACY ?? "",
);
const SELECTED_SCENARIOS = new Set(
    (process.env.PAX_BENCH_ONLY ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
);
const MAIN_MENU_FRAME_MS = resolvePositiveMs(
    process.env.PAX_BENCH_MAIN_MENU_FRAME_MS,
    2200,
);
const LOAD_FRAME_MS = resolvePositiveMs(
    process.env.PAX_BENCH_LOAD_FRAME_MS,
    1600,
);
const GAMEPLAY_FRAME_MS = resolvePositiveMs(
    process.env.PAX_BENCH_GAMEPLAY_FRAME_MS,
    2600,
);
const ORDERS_FRAME_MS = resolvePositiveMs(
    process.env.PAX_BENCH_ORDERS_FRAME_MS,
    1800,
);
const FRAME_WARMUP_MS = resolvePositiveMs(
    process.env.PAX_BENCH_FRAME_WARMUP_MS,
    250,
);
const DEFAULT_SCENARIO_TIMEOUT_MS = resolvePositiveMs(
    process.env.PAX_BENCH_TIMEOUT_MS,
    90_000,
);
const BUN_EXECUTABLE = process.execPath;
const TERRITORY_MODE_ALIASES: Readonly<Record<string, string>> = {
    metaball_grid_phase_field: "phase_field",
    metaball_grid_phase_edges: "phase_edges",
    metaball_grid_ember_lattice: "ember_lattice",
    metaball_grid: "cell_grid",
};

function normalizeBenchmarkTerritoryModeId(mode: string): string {
    return TERRITORY_MODE_ALIASES[mode] ?? mode;
}

const DEFAULT_TERRITORY_SCENARIO_SPECS = [
    { scenarioKey: "metaball", mode: "cell_grid" },
    { scenarioKey: "distanceField", mode: "distance_field" },
    { scenarioKey: "vsPvv3", mode: "vs_pvv3" },
    { scenarioKey: "pixel", mode: "pixel" },
    ...(INCLUDE_LEGACY_SCENARIOS
        ? [{ scenarioKey: "perimeter", mode: "perimeter_field" }]
        : []),
] as const;
const TERRITORY_SCENARIO_SPECS = BENCH_TERRITORY_MODE
    ? [
          {
              scenarioKey: sanitizeLabelForPath(BENCH_TERRITORY_MODE),
              mode: normalizeBenchmarkTerritoryModeId(BENCH_TERRITORY_MODE),
          },
      ]
    : DEFAULT_TERRITORY_SCENARIO_SPECS;
let activeScenarioScreenshotDir: string | null = null;

function shouldRunScenario(name: string): boolean {
    return SELECTED_SCENARIOS.size === 0 || SELECTED_SCENARIOS.has(name);
}

function buildScenarioPrepStatements(
    mode: string,
    mapName: string | null,
    beginGameplay = false,
): string {
    const mapLiteral = mapName ? JSON.stringify(mapName) : "null";
    const modeLiteral = JSON.stringify(mode);
    return `
        window.__PAX_BENCH__.resetPerfCapture();
        const mapName = ${mapLiteral};
        if (mapName) {
            const loaded = await window.__PAX_BENCH__.loadSavedMapByName(mapName);
            if (!loaded) {
                throw new Error("Could not find saved map: " + mapName);
            }
        } else {
            await window.__PAX_BENCH__.restartSinglePlayerGame();
        }
        const modePrep = await window.__PAX_BENCH__.ensureTerritoryMode(${modeLiteral});
        const gameplayPrep = ${
            beginGameplay
                ? `await window.__PAX_BENCH__.beginGameplay(6000, 1); if (!gameplayPrep?.started) { throw new Error("Gameplay did not start for mode ${mode}: " + JSON.stringify(gameplayPrep)); }`
                : "null"
        };
    `;
}

function normalizeSavedMapSummary(
    value: Record<string, JsonValue>,
): SavedMapSummary {
    return {
        name: String(value.name ?? "unnamed"),
        starCount: Number(value.starCount ?? 0),
        laneCount: Number(value.laneCount ?? 0),
        runtimeConnectionCount: Number(value.runtimeConnectionCount ?? 0),
        builtIn: Boolean(value.builtIn),
    };
}

function resolveBenchmarkMap(
    savedMaps: SavedMapSummary[],
): {
    requestedMapName: string | null;
    resolvedMapName: string | null;
    starCount: number | null;
    laneCount: number | null;
    runtimeConnectionCount: number | null;
    builtIn: boolean | null;
    selectionReason: string;
} {
    if (BENCH_MAP_NAME) {
        const requested = savedMaps.find((map) => map.name === BENCH_MAP_NAME);
        if (!requested) {
            throw new Error(
                `Requested benchmark map "${BENCH_MAP_NAME}" was not found in saved maps.`,
            );
        }
        return {
            requestedMapName: BENCH_MAP_NAME,
            resolvedMapName: requested.name,
            starCount: requested.starCount,
            laneCount: requested.laneCount,
            runtimeConnectionCount: requested.runtimeConnectionCount,
            builtIn: requested.builtIn,
            selectionReason: "requested_saved_map",
        };
    }

    const exactLegacyBaseline =
        savedMaps.find(
            (map) =>
                map.starCount === 172 &&
                map.laneCount === 214 &&
                map.runtimeConnectionCount === 428,
        ) ?? null;
    if (exactLegacyBaseline) {
        return {
            requestedMapName: null,
            resolvedMapName: exactLegacyBaseline.name,
            starCount: exactLegacyBaseline.starCount,
            laneCount: exactLegacyBaseline.laneCount,
            runtimeConnectionCount: exactLegacyBaseline.runtimeConnectionCount,
            builtIn: exactLegacyBaseline.builtIn,
            selectionReason: "auto_exact_172x214x428",
        };
    }

    const fallback = savedMaps[0] ?? null;
    if (!fallback) {
        return {
            requestedMapName: null,
            resolvedMapName: null,
            starCount: null,
            laneCount: null,
            runtimeConnectionCount: null,
            builtIn: null,
            selectionReason: "restart_single_player_fallback",
        };
    }

    return {
        requestedMapName: null,
        resolvedMapName: fallback.name,
        starCount: fallback.starCount,
        laneCount: fallback.laneCount,
        runtimeConnectionCount: fallback.runtimeConnectionCount,
        builtIn: fallback.builtIn,
        selectionReason: "auto_largest_saved_map",
    };
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cleanupStaleHarnessBrowsers(
    profilePrefix: string,
): Promise<void> {
    const escapedPrefix = profilePrefix.replace(/'/g, "''");
    const command = `
        Get-CimInstance Win32_Process |
        Where-Object {
            $_.CommandLine -like '*${escapedPrefix}*' -and
            ($_.Name -ieq 'chrome.exe' -or $_.Name -ieq 'msedge.exe')
        } |
        ForEach-Object {
            try {
                Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop
            } catch {}
        }
    `;
    const cleanup = Bun.spawn(
        ["powershell.exe", "-NoProfile", "-Command", command],
        {
            stdout: "ignore",
            stderr: "ignore",
        },
    );
    await cleanup.exited;
}

async function killProcessTree(pid: number | undefined | null): Promise<void> {
    if (!pid) return;
    const killer = Bun.spawn(
        ["taskkill.exe", "/PID", String(pid), "/T", "/F"],
        {
            stdout: "ignore",
            stderr: "ignore",
        },
    );
    await killer.exited;
}

async function cleanupStaleHarnessDevServer(port: number): Promise<void> {
    const escapedClientDir = CLIENT_DIR.replace(/'/g, "''");
    const command = `
        Get-CimInstance Win32_Process |
        Where-Object {
            $_.CommandLine -like '*vite*dev*--host ${HOST}*--port ${port}*' -and
            $_.CommandLine -like '*${escapedClientDir}*' -and
            ($_.Name -ieq 'node.exe' -or $_.Name -ieq 'bun.exe' -or $_.Name -ieq 'cmd.exe')
        } |
        ForEach-Object {
            try {
                Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop
            } catch {}
        }
    `;
    const cleanup = Bun.spawn(
        ["powershell.exe", "-NoProfile", "-Command", command],
        {
            stdout: "ignore",
            stderr: "ignore",
        },
    );
    await cleanup.exited;
}

function round(value: number, digits = 3): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function resolvePositiveMs(
    value: string | undefined,
    fallbackMs: number,
): number {
    const parsed = Number(value ?? "");
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackMs;
}

function resolveScenarioTimeoutMs(
    minimumExpectedMs: number,
    extraBufferMs = 30_000,
): number {
    return Math.max(
        DEFAULT_SCENARIO_TIMEOUT_MS,
        minimumExpectedMs + extraBufferMs,
    );
}

function sanitizeLabelForPath(label: string): string {
    return label.replace(/[^a-z0-9_-]+/gi, "-").replace(/-+/g, "-");
}

function sanitizeTimestampForPath(isoTimestamp: string): string {
    return isoTimestamp.replace(/[:.]/g, "-");
}

async function captureScreenshotBase64(client: CdpClient): Promise<string | null> {
    try {
        const result = await client.send("Page.captureScreenshot", {
            format: "png",
            fromSurface: true,
        });
        return typeof result.data === "string" ? result.data : null;
    } catch {
        return null;
    }
}

function writeScenarioScreenshotArtifact(
    screenshotBase64: string | null,
    label: string,
): string | null {
    if (!screenshotBase64 || !activeScenarioScreenshotDir) {
        return null;
    }
    mkdirSync(activeScenarioScreenshotDir, { recursive: true });
    const screenshotPath = path.join(
        activeScenarioScreenshotDir,
        `${sanitizeLabelForPath(label)}.png`,
    );
    writeFileSync(screenshotPath, Buffer.from(screenshotBase64, "base64"));
    return screenshotPath;
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
    for (let port = startPort; port < startPort + 200; port++) {
        const isFree = await new Promise<boolean>((resolve) => {
            const server = net.createServer();
            server.once("error", () => resolve(false));
            server.listen(port, HOST, () => {
                server.close(() => resolve(true));
            });
        });
        if (isFree) return port;
    }
    return await new Promise<number>((resolve, reject) => {
        const server = net.createServer();
        server.once("error", reject);
        server.listen(0, HOST, () => {
            const address = server.address();
            const port =
                typeof address === "object" && address ? address.port : null;
            server.close(() => {
                if (port == null) {
                    reject(
                        new Error(
                            `Could not allocate an ephemeral port after exhausting the range starting at ${startPort}.`,
                        ),
                    );
                    return;
                }
                resolve(port);
            });
        });
    });
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

const FOCUS_MEASURE_PATTERNS = [
    "game.renderFrame.ownership.",
    "game.renderFrame.geometry.",
    "game.renderFrame.fg2DataPipeline.",
    "game.renderFrame.renderFamilyInput.",
    "game.renderFrame.territory.",
    "game.renderFrame.territory.present.",
    "territory.geometry0319.",
    "territory.constraintAlign.",
    "game.renderFrame.connections",
    "game.renderFrame.pixel.",
    "game.renderFrame.orderArrows",
    "game.renderFrame.interactionOverlay",
    "game.renderFrame.stars",
    "game.renderFrame.ships",
    "game.renderFrame.selectionOverlay",
    "game.input.clientRect.refresh",
    "game.input.dragPreview.present",
    "game.input.visualAcknowledgment.present",
    "game.input.orderQueue.flush",
    "game.input.orderImmediate",
    "territory.metaballRenderer",
    "territory.metaballFamily",
    "territory.perimeterFieldFamily",
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

function summarizeLongAnimationFrames(snapshot: any): Record<string, JsonValue> {
    const longFrames = (snapshot?.events ?? []).filter(
        (event: any) => event.name === "browser.longAnimationFrame",
    );
    const durations = longFrames
        .map((event: any) => Number(event.detail?.durationMs ?? 0))
        .filter((value: number) => Number.isFinite(value) && value >= 0);
    const blockingDurations = longFrames
        .map((event: any) => Number(event.detail?.blockingDurationMs ?? 0))
        .filter((value: number) => Number.isFinite(value) && value >= 0);
    const topScripts = new Map<
        string,
        { count: number; totalMs: number; maxMs: number }
    >();
    for (const event of longFrames) {
        const scriptUrl = String(event.detail?.topScriptUrl ?? "unknown");
        const durationMs = Number(event.detail?.durationMs ?? 0);
        const bucket = topScripts.get(scriptUrl) ?? {
            count: 0,
            totalMs: 0,
            maxMs: 0,
        };
        bucket.count += 1;
        bucket.totalMs += durationMs;
        bucket.maxMs = Math.max(bucket.maxMs, durationMs);
        topScripts.set(scriptUrl, bucket);
    }
    return {
        count: longFrames.length,
        duration: summarizeNumericSamples(durations),
        blockingDuration: summarizeNumericSamples(blockingDurations),
        topScripts: [...topScripts.entries()]
            .map(([scriptUrl, bucket]) => ({
                scriptUrl,
                count: bucket.count,
                totalMs: round(bucket.totalMs),
                maxMs: round(bucket.maxMs),
            }))
            .sort((a, b) => Number(b.totalMs ?? 0) - Number(a.totalMs ?? 0))
            .slice(0, 10),
    };
}

function resolveEventWindow(
    event: Record<string, any>,
): { startAtMs: number; endAtMs: number; durationMs: number } {
    const detail = (event?.detail as Record<string, JsonValue> | undefined) ?? {};
    const startAtMs = Number(detail.startTimeMs ?? event?.atMs ?? 0);
    const durationMs = Number(detail.durationMs ?? 0);
    const endAtMs = Number(detail.endTimeMs ?? startAtMs + Math.max(0, durationMs));
    return {
        startAtMs,
        endAtMs,
        durationMs,
    };
}

function eventOverlapsFrameWindow(
    event: Record<string, any>,
    frameStartAtMs: number,
    frameEndAtMs: number,
): boolean {
    const window = resolveEventWindow(event);
    return window.endAtMs >= frameStartAtMs && window.startAtMs <= frameEndAtMs;
}

function summarizeFrameSpikeDiagnostics(
    snapshot: any,
    frames: Record<string, any> | null | undefined,
): Record<string, JsonValue> | null {
    const slowFrames = Array.isArray(frames?.slowFrames) ? frames.slowFrames : [];
    if (slowFrames.length === 0) {
        return null;
    }
    const focusEvents = (snapshot?.events ?? []).filter((event: Record<string, any>) => {
        const name = String(event?.name ?? "");
        return (
            name.startsWith("game.renderFrame.") ||
            name.startsWith("territory.") ||
            name.startsWith("browser.long") ||
            name.startsWith("input.")
        );
    });
    const spikes = slowFrames.map((frame: Record<string, any>) => {
        const frameStartAtMs = Number(frame.startAtMs ?? 0);
        const frameEndAtMs = Number(frame.endAtMs ?? frameStartAtMs);
        const overlappingEvents = focusEvents.filter((event: Record<string, any>) =>
            eventOverlapsFrameWindow(event, frameStartAtMs, frameEndAtMs),
        );
        const overlappingMeasures = overlappingEvents
            .filter(
                (event: Record<string, any>) => event?.detail?.kind === "measure",
            )
            .map((event: Record<string, any>) => {
                const window = resolveEventWindow(event);
                return {
                    name: String(event?.name ?? "unknown"),
                    durationMs: round(window.durationMs),
                    startAtMs: round(window.startAtMs),
                    endAtMs: round(window.endAtMs),
                };
            })
            .sort((a, b) => Number(b.durationMs ?? 0) - Number(a.durationMs ?? 0))
            .slice(0, 8);
        const overlappingBrowserEvents = overlappingEvents
            .filter(
                (event: Record<string, any>) => event?.detail?.kind !== "measure",
            )
            .map((event: Record<string, any>) => {
                const window = resolveEventWindow(event);
                return {
                    name: String(event?.name ?? "unknown"),
                    durationMs: round(window.durationMs),
                    startAtMs: round(window.startAtMs),
                    endAtMs: round(window.endAtMs),
                };
            })
            .sort((a, b) => Number(b.durationMs ?? 0) - Number(a.durationMs ?? 0))
            .slice(0, 6);
        const measuredWorkMs = round(
            overlappingMeasures.reduce(
                (sum, event) => sum + Number(event.durationMs ?? 0),
                0,
            ),
        );
        const frameMs = round(Number(frame.frameMs ?? 0));
        const unattributedGapMs = round(
            Math.max(0, frameMs - measuredWorkMs),
        );
        return {
            index: Number(frame.index ?? 0),
            frameMs,
            startAtMs: round(frameStartAtMs),
            endAtMs: round(frameEndAtMs),
            measuredWorkMs,
            unattributedGapMs,
            attribution:
                measuredWorkMs > 0
                    ? "measured"
                    : overlappingBrowserEvents.length > 0
                        ? "browser"
                        : "unattributed",
            overlappingMeasures,
            overlappingBrowserEvents,
        };
    });
    const unattributedGaps = spikes.map((spike) =>
        Number(spike.unattributedGapMs ?? 0),
    );
    const fullyUnattributedSpikes = spikes.filter(
        (spike) => String(spike.attribution ?? "") === "unattributed",
    );

    return {
        frameBudgetMs: round(Number(frames?.frameBudgetMs ?? 0)),
        overBudgetCount: Number(frames?.overBudgetCount ?? 0),
        over20MsCount: Number(frames?.over20MsCount ?? 0),
        over33MsCount: Number(frames?.over33MsCount ?? 0),
        maxUnattributedGapMs: round(
            unattributedGaps.length > 0 ? Math.max(...unattributedGaps) : 0,
        ),
        avgUnattributedGapMs: round(
            unattributedGaps.length > 0
                ? unattributedGaps.reduce((sum, value) => sum + value, 0) /
                      unattributedGaps.length
                : 0,
        ),
        fullyUnattributedSpikeCount: fullyUnattributedSpikes.length,
        spikes,
    };
}

function summarizePerfEventGroups(
    snapshot: any,
    prefixes: readonly string[],
): Array<Record<string, JsonValue>> {
    const groups = new Map<
        string,
        { count: number; firstAtMs: number; lastAtMs: number }
    >();
    for (const event of snapshot?.events ?? []) {
        const name = String(event.name ?? "unknown");
        const prefix = prefixes.find((candidate) => name.startsWith(candidate));
        if (!prefix) continue;
        const bucket = groups.get(name) ?? {
            count: 0,
            firstAtMs: Number(event.atMs ?? 0),
            lastAtMs: Number(event.atMs ?? 0),
        };
        bucket.count += 1;
        bucket.firstAtMs = Math.min(bucket.firstAtMs, Number(event.atMs ?? 0));
        bucket.lastAtMs = Math.max(bucket.lastAtMs, Number(event.atMs ?? 0));
        groups.set(name, bucket);
    }
    return [...groups.entries()]
        .map(([name, bucket]) => ({
            name,
            count: bucket.count,
            firstAtMs: round(bucket.firstAtMs),
            lastAtMs: round(bucket.lastAtMs),
            spanMs: round(bucket.lastAtMs - bucket.firstAtMs),
        }))
        .sort((a, b) => Number(b.count ?? 0) - Number(a.count ?? 0))
        .slice(0, 40);
}

function summarizeTerritorySchedulerSnapshot(
    scheduler: Record<string, JsonValue> | null,
): Record<string, JsonValue> | null {
    if (!scheduler) return null;
    const runtimeBridgeDiagnostics = toJsonRecord(
        scheduler.runtimeBridgeDiagnostics,
    );
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
            yieldCount: Number(scheduler.territoryPresentationYieldCount ?? 0),
            forcedCount: Number(
                scheduler.territoryPresentationForcedCount ?? 0,
            ),
            lastYieldAtMs: round(
                Number(scheduler.territoryPresentationLastYieldAtMs ?? 0),
            ),
            lastYieldAgeMs: round(
                Number(scheduler.territoryPresentationLastYieldAgeMs ?? 0),
            ),
            lastYieldRequestId:
                scheduler.territoryPresentationLastYieldRequestId ?? null,
            lastYieldReason:
                scheduler.territoryPresentationLastYieldReason ?? null,
            scheduleMode:
                scheduler.territoryPresentationLastScheduleMode ?? null,
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
            requestSeq: Number(scheduler.orderMutationRequestSeq ?? 0),
            lastQueuedAtMs: round(
                Number(scheduler.lastOrderMutationQueuedAtMs ?? 0),
            ),
            lastQueueDelayMs: round(
                Number(scheduler.lastOrderMutationQueueDelayMs ?? 0),
            ),
            lastQueueScheduleAtMs: round(
                Number(scheduler.lastOrderQueueScheduleAtMs ?? 0),
            ),
            lastQueueFlushStartedAtMs: round(
                Number(scheduler.lastOrderQueueFlushStartedAtMs ?? 0),
            ),
            lastQueueFlushFinishedAtMs: round(
                Number(scheduler.lastOrderQueueFlushFinishedAtMs ?? 0),
            ),
            lastQueueFlushMutationCount: Number(
                scheduler.lastOrderQueueFlushMutationCount ?? 0,
            ),
            lastQueueFlushKinds: Array.isArray(
                scheduler.lastOrderQueueFlushKinds,
            )
                ? scheduler.lastOrderQueueFlushKinds
                : [],
            lastQueueFlushRequestIds: Array.isArray(
                scheduler.lastOrderQueueFlushRequestIds,
            )
                ? scheduler.lastOrderQueueFlushRequestIds
                : [],
            scheduleMode: scheduler.lastOrderQueueScheduleMode ?? null,
            inputPriorityUntilMs: round(
                Number(scheduler.territoryInputPriorityUntilMs ?? 0),
            ),
        },
        interactions: {
            pendingVisualAcknowledgmentCount: Number(
                scheduler.pendingInteractionVisualAcknowledgmentCount ?? 0,
            ),
            pendingVisualAcknowledgments: Array.isArray(
                scheduler.pendingInteractionVisualAcknowledgments,
            )
                ? scheduler.pendingInteractionVisualAcknowledgments
                : [],
            lastLocalAcknowledgment: scheduler.lastInteractionLocalAcknowledgment ?? null,
            lastVisualAcknowledgment: scheduler.lastInteractionVisualAcknowledgment ?? null,
        },
        transitionDiagnostics: {
            captureState:
                (scheduler.transitionDiagnosticCaptureState as JsonValue) ?? null,
            runtimeBridge: summarizeRuntimeBridgeDiagnostics(
                runtimeBridgeDiagnostics,
            ),
        },
        transitionReliability: summarizeTransitionReliability(
            runtimeBridgeDiagnostics,
        ),
    };
}

function toJsonRecord(value: JsonValue | undefined): Record<string, JsonValue> | null {
    if (value === null || value === undefined) return null;
    if (typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, JsonValue>;
}

function stringOrNull(value: JsonValue | undefined): string | null {
    return typeof value === "string" && value.length > 0 ? value : null;
}

function summarizeRuntimeBridgeDiagnostics(
    diagnostics: Record<string, JsonValue> | null,
): Record<string, JsonValue> | null {
    if (!diagnostics) return null;
    return {
        startedAtMs: round(Number(diagnostics.startedAtMs ?? 0)),
        finishedAtMs: round(Number(diagnostics.finishedAtMs ?? 0)),
        durationMs: round(Number(diagnostics.durationMs ?? 0)),
        transitionFallbackReason: stringOrNull(
            diagnostics.transitionFallbackReason,
        ),
        messages: Array.isArray(diagnostics.messages)
            ? diagnostics.messages.slice(0, 12)
            : [],
        modeDiagnosticsKind: stringOrNull(diagnostics.modeDiagnosticsKind),
        modeDiagnosticsPlanId: stringOrNull(diagnostics.modeDiagnosticsPlanId),
        modeDiagnosticsBundleId: stringOrNull(
            diagnostics.modeDiagnosticsBundleId,
        ),
    };
}

function summarizeTransitionReliability(
    diagnostics: Record<string, JsonValue> | null,
): Record<string, JsonValue> {
    const fallbackReason = stringOrNull(
        diagnostics?.transitionFallbackReason,
    );
    const messages = Array.isArray(diagnostics?.messages)
        ? diagnostics.messages
        : [];
    return {
        hasRuntimeDiagnostics: diagnostics !== null,
        hasFallback: fallbackReason !== null,
        fallbackReason,
        runtimeDurationMs: diagnostics
            ? round(Number(diagnostics.durationMs ?? 0))
            : null,
        modeDiagnosticsKind: diagnostics
            ? stringOrNull(diagnostics.modeDiagnosticsKind)
            : null,
        modeDiagnosticsPlanId: diagnostics
            ? stringOrNull(diagnostics.modeDiagnosticsPlanId)
            : null,
        modeDiagnosticsBundleId: diagnostics
            ? stringOrNull(diagnostics.modeDiagnosticsBundleId)
            : null,
        messageCount: messages.length,
        messages: messages.slice(0, 8),
    };
}

function summarizeFocusMeasures(
    measures: Array<Record<string, JsonValue>>,
): Array<Record<string, JsonValue>> {
    return measures
        .filter((entry) =>
            FOCUS_MEASURE_PATTERNS.some((pattern) =>
                String(entry.name ?? "").startsWith(pattern),
            ),
        )
        .slice(0, 30);
}

function summarizeShipDiagnostics(
    snapshot: any,
): Record<string, JsonValue> | null {
    const orbitalDetail =
        snapshot?.measures?.["game.renderFrame.ships.orbitals"]?.detail ?? null;
    const travelDetail =
        snapshot?.measures?.["game.renderFrame.ships.travel"]?.detail ?? null;
    if (!orbitalDetail && !travelDetail) {
        return null;
    }
    return {
        visualPolicy: String(
            travelDetail?.visualPolicy ??
                orbitalDetail?.visualPolicy ??
                travelDetail?.lodLevel ??
                orbitalDetail?.lodLevel ??
                "unknown",
        ),
        maxOrbitVisualsPerStar: Number(
            orbitalDetail?.maxOrbitVisualsPerStar ??
                travelDetail?.maxOrbitVisualsPerStar ??
                0,
        ),
        maxDamagedVisualsPerStar: Number(
            orbitalDetail?.maxDamagedVisualsPerStar ??
                travelDetail?.maxDamagedVisualsPerStar ??
                0,
        ),
        totalActiveOrbitShips: Number(
            orbitalDetail?.totalActiveOrbitShips ?? 0,
        ),
        totalTravelingShips: Number(
            orbitalDetail?.totalTravelingShips ??
                travelDetail?.totalTravelingShips ??
                0,
        ),
        totalDamagedShips: Number(orbitalDetail?.totalDamagedShips ?? 0),
        baseOrbitVisuals: Number(orbitalDetail?.baseOrbitVisuals ?? 0),
        baseDamagedVisuals: Number(orbitalDetail?.baseDamagedVisuals ?? 0),
        totalPotentialVisuals: Number(
            orbitalDetail?.totalPotentialVisuals ??
                orbitalDetail?.totalVisualPressure ??
                0,
        ),
        renderedOrbitVisuals: Number(
            orbitalDetail?.renderedOrbitVisuals ?? 0,
        ),
        renderedDamagedVisuals: Number(
            orbitalDetail?.renderedDamagedVisuals ?? 0,
        ),
        renderedTravelVisuals: Number(
            travelDetail?.renderedTravelVisuals ?? 0,
        ),
        groupedTravelShips: Number(travelDetail?.groupedTravelShips ?? 0),
        travelOrbGroupCount: Number(travelDetail?.travelOrbGroupCount ?? 0),
        usedParticles: Number(travelDetail?.usedParticles ?? 0),
        totalRenderedVisuals: Number(travelDetail?.totalRenderedVisuals ?? 0),
        outlineOn: Boolean(
            orbitalDetail?.outlineOn ?? orbitalDetail?.effectiveOutlineOn,
        ),
        glowOn: Boolean(
            orbitalDetail?.glowOn ?? orbitalDetail?.effectiveGlowOn,
        ),
    };
}

function summarizePerfSnapshot(
    snapshot: any,
    frames: Record<string, any> | null | undefined,
): Record<string, JsonValue> {
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
        focusMeasures: summarizeFocusMeasures(measures),
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
        pipelineEvents: summarizePerfEventGroups(snapshot, [
            "game.map.",
            "game.snapshot.",
            "territory.",
            "game.renderFrame.",
        ]),
        interactionEvents: summarizePerfEventGroups(snapshot, ["input."]),
        browserEvents: summarizePerfEventGroups(snapshot, ["browser."]),
        shipDiagnostics: summarizeShipDiagnostics(snapshot),
        frameSpikeDiagnostics: summarizeFrameSpikeDiagnostics(snapshot, frames),
        longTasks: summarizeLongTasks(snapshot),
        longAnimationFrames: summarizeLongAnimationFrames(snapshot),
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

const CPU_HOTSPOT_PATTERNS = [
    "bufferSubData",
    "packAttributes",
    "buildLine",
    "collectRenderablesSimple",
    "generateProgram",
    "updateBuffer",
    "triangulate",
    "pointInPolygon",
    "buildGridWave",
    "resolveOwnerAt",
    "buildGridClassification",
    "collectRenderables",
    "renderFrame",
] as const;

function summarizeFocusCpuHotspots(
    cpuHotspots: readonly CpuHotspot[],
): CpuHotspot[] {
    return cpuHotspots.filter((hotspot) =>
        CPU_HOTSPOT_PATTERNS.some((pattern) =>
            hotspot.label.toLowerCase().includes(pattern.toLowerCase()),
        ),
    );
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
    options?: {
        includeInvalid?: boolean;
    },
): Record<string, JsonValue> | null {
    const values = (sampleSet?.samples ?? [])
        .filter(
            (sample: any) =>
                options?.includeInvalid === true
                || sample?.benchmarkValid !== false,
        )
        .map((sample: any) => Number(sample?.[metricKey]))
        .filter((value: number) => Number.isFinite(value) && value >= 0);
    return summarizeNumericSamples(values);
}

function summarizeSampleIntegrity(
    sampleSet: any,
): Record<string, JsonValue> | null {
    const samples = Array.isArray(sampleSet?.samples) ? sampleSet.samples : [];
    if (samples.length === 0) return null;
    const invalidReasonCounts = new Map<string, number>();
    let validCount = 0;
    for (const sample of samples) {
        if (sample?.benchmarkValid === false) {
            const reasons = Array.isArray(sample?.benchmarkInvalidReasons)
                ? sample.benchmarkInvalidReasons
                : ["unknown_invalid_sample"];
            for (const reason of reasons) {
                const key =
                    typeof reason === "string" && reason.length > 0
                        ? reason
                        : "unknown_invalid_sample";
                invalidReasonCounts.set(
                    key,
                    (invalidReasonCounts.get(key) ?? 0) + 1,
                );
            }
            continue;
        }
        validCount += 1;
    }
    return {
        totalCount: samples.length,
        validCount,
        invalidCount: samples.length - validCount,
        invalidReasons: [...invalidReasonCounts.entries()]
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .map(([reason, count]) => ({ reason, count })),
    };
}

function getEventRecord(
    eventResult: Record<string, JsonValue> | null | undefined,
): Record<string, JsonValue> | null {
    const event = eventResult?.event;
    if (!event || typeof event !== "object" || Array.isArray(event)) return null;
    return event as Record<string, JsonValue>;
}

function getEventDeltaMs(
    eventResult: Record<string, JsonValue> | null | undefined,
    startedAt: number,
): number | null {
    const event = getEventRecord(eventResult);
    if (!event) return null;
    return round(Number(event.atMs ?? startedAt) - startedAt);
}

function getEventDetailValue(
    eventResult: Record<string, JsonValue> | null | undefined,
    key: string,
): JsonValue {
    const event = getEventRecord(eventResult);
    if (!event) return null;
    const detail =
        typeof event.detail === "object" && !Array.isArray(event.detail)
            ? (event.detail as Record<string, JsonValue>)
            : null;
    return detail?.[key] ?? event[key] ?? null;
}

function getEventDetailNumber(
    eventResult: Record<string, JsonValue> | null | undefined,
    key: string,
): number | null {
    const value = Number(getEventDetailValue(eventResult, key));
    return Number.isFinite(value) ? value : null;
}

function getEventDispatchLeadMs(
    eventResult: Record<string, JsonValue> | null | undefined,
    startedAt: number,
): number | null {
    const eventTimeStampMs = getEventDetailNumber(
        eventResult,
        "eventTimeStampMs",
    );
    if (eventTimeStampMs != null) {
        return round(eventTimeStampMs - startedAt);
    }
    const event = getEventRecord(eventResult);
    const queueDelayMs = getEventDetailNumber(eventResult, "queueDelayMs");
    if (!event || queueDelayMs == null) return null;
    return round(Number(event.atMs ?? startedAt) - queueDelayMs - startedAt);
}

function getEventQueueDelayMetricMs(
    eventResult: Record<string, JsonValue> | null | undefined,
): number | null {
    return getEventDetailNumber(eventResult, "queueDelayMs");
}

function subtractMetricMs(
    laterMs: number | null,
    earlierMs: number | null,
): number | null {
    if (!Number.isFinite(laterMs) || !Number.isFinite(earlierMs)) return null;
    return round(Number(laterMs) - Number(earlierMs));
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
        pointerSampleIntegrity: summarizeSampleIntegrity(
            actionResult?.pointerSamples,
        ),
        directSampleIntegrity: summarizeSampleIntegrity(
            actionResult?.directSamples,
        ),
        pointerIssueCommit: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "issueCommitMs",
        ),
        pointerSourcePointerDownHandled: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "sourcePointerDownHandledMs",
        ),
        pointerSourcePointerDownDispatchLead: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "sourcePointerDownDispatchLeadMs",
        ),
        pointerSourcePointerDownQueueDelay: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "sourcePointerDownQueueDelayMs",
        ),
        pointerSourcePointerUpHandled: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "sourcePointerUpHandledMs",
        ),
        pointerIssueLocalAcknowledgment: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "issueLocalAcknowledgmentMs",
        ),
        pointerIssueLocalAcknowledgmentAfterTargetClick: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "issueLocalAcknowledgmentAfterTargetClickMs",
        ),
        pointerIssueVisualAcknowledgment: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "issueVisualAcknowledgmentMs",
        ),
        pointerIssueVisualAcknowledgmentAfterTargetClick: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "issueVisualAcknowledgmentAfterTargetClickMs",
        ),
        pointerSourceSelect: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "sourceSelectMs",
        ),
        pointerIssueAfterTargetClick: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "issueAfterTargetClickMs",
        ),
        pointerTargetPointerDownHandled: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "targetPointerDownHandledMs",
        ),
        pointerTargetPointerDownDispatchLead: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "targetPointerDownDispatchLeadMs",
        ),
        pointerTargetPointerDownQueueDelay: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "targetPointerDownQueueDelayMs",
        ),
        pointerTargetPointerUpHandled: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "targetPointerUpHandledMs",
        ),
        pointerIssueHandledToLocalAcknowledgmentAfterTargetClick: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "issueHandledToLocalAcknowledgmentAfterTargetClickMs",
        ),
        pointerIssueHandledToVisualAcknowledgmentAfterTargetClick: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "issueHandledToVisualAcknowledgmentAfterTargetClickMs",
        ),
        pointerIssueHandledToCommitAfterTargetClick: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "issueHandledToCommitAfterTargetClickMs",
        ),
        pointerIssueQueueFlush: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "issueQueueFlushMs",
        ),
        pointerIssueQueueFlushAfterTargetClick: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "issueQueueFlushAfterTargetClickMs",
        ),
        pointerIssueOrderPathEvent: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "issueOrderPathEventMs",
        ),
        pointerIssueOrderPathEventAfterTargetClick: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "issueOrderPathEventAfterTargetClickMs",
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
        pointerCancelPointerDownHandled: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "cancelPointerDownHandledMs",
        ),
        pointerCancelPointerDownDispatchLead: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "cancelPointerDownDispatchLeadMs",
        ),
        pointerCancelPointerDownQueueDelay: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "cancelPointerDownQueueDelayMs",
        ),
        pointerCancelPointerUpHandled: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "cancelPointerUpHandledMs",
        ),
        pointerCancelContextMenuHandled: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "cancelRightclickHandledMs",
        ),
        pointerCancelContextMenuDispatchLead: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "cancelRightclickDispatchLeadMs",
        ),
        pointerCancelContextMenuQueueDelay: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "cancelRightclickQueueDelayMs",
        ),
        pointerCancelLocalAcknowledgment: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "cancelLocalAcknowledgmentMs",
        ),
        pointerCancelHandledToLocalAcknowledgment: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "cancelHandledToLocalAcknowledgmentMs",
        ),
        pointerCancelHandledToVisualAcknowledgment: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "cancelHandledToVisualAcknowledgmentMs",
        ),
        pointerCancelHandledToCommit: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "cancelHandledToCommitMs",
        ),
        pointerCancelVisualAcknowledgment: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "cancelVisualAcknowledgmentMs",
        ),
        pointerCancelOrderPathEvent: summarizeSampleMetric(
            actionResult?.pointerSamples,
            "cancelOrderPathEventMs",
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
        pointerIssueLocalToVisualGapMs:
            Number.isFinite(
                Number(
                    summarizeSampleMetric(
                        actionResult?.pointerSamples,
                        "issueVisualAcknowledgmentAfterTargetClickMs",
                    )?.avgMs ?? Number.NaN,
                ),
            ) &&
            Number.isFinite(
                Number(
                    summarizeSampleMetric(
                        actionResult?.pointerSamples,
                        "issueLocalAcknowledgmentAfterTargetClickMs",
                    )?.avgMs ?? Number.NaN,
                ),
            )
                ? round(
                      Number(
                          summarizeSampleMetric(
                              actionResult?.pointerSamples,
                              "issueVisualAcknowledgmentAfterTargetClickMs",
                          )?.avgMs ?? 0,
                      ) -
                          Number(
                              summarizeSampleMetric(
                                  actionResult?.pointerSamples,
                                  "issueLocalAcknowledgmentAfterTargetClickMs",
                              )?.avgMs ?? 0,
                          ),
                  )
                : null,
        pointerCancelLocalToVisualGapMs:
            Number.isFinite(
                Number(
                    summarizeSampleMetric(
                        actionResult?.pointerSamples,
                        "cancelVisualAcknowledgmentMs",
                    )?.avgMs ?? Number.NaN,
                ),
            ) &&
            Number.isFinite(
                Number(
                    summarizeSampleMetric(
                        actionResult?.pointerSamples,
                        "cancelLocalAcknowledgmentMs",
                    )?.avgMs ?? Number.NaN,
                ),
            )
                ? round(
                      Number(
                          summarizeSampleMetric(
                              actionResult?.pointerSamples,
                              "cancelVisualAcknowledgmentMs",
                          )?.avgMs ?? 0,
                      ) -
                          Number(
                              summarizeSampleMetric(
                                  actionResult?.pointerSamples,
                                  "cancelLocalAcknowledgmentMs",
                              )?.avgMs ?? 0,
                          ),
                  )
                : null,
    };
}

function summarizeFramePacing(
    frames: Record<string, any> | null | undefined,
    perf: Record<string, any> | null | undefined,
): Record<string, JsonValue> | null {
    if (!frames) return null;
    const frameCount = Number(frames.frameCount ?? 0);
    if (!Number.isFinite(frameCount) || frameCount <= 0) return null;

    const avgFrameMs = Number(frames.avgFrameMs ?? 0);
    const p95FrameMs = Number(frames.p95FrameMs ?? 0);
    const maxFrameMs = Number(frames.maxFrameMs ?? 0);
    const observedFps = Number(frames.observedFps ?? 0);
    const over20MsCount = Number(frames.over20MsCount ?? 0);
    const over33MsCount = Number(frames.over33MsCount ?? 0);
    const cadenceBuckets = frames.cadenceBuckets ?? null;
    const renderLineItems = Array.isArray(perf?.renderLineItems)
        ? perf?.renderLineItems
        : [];
    const renderMaxMs = renderLineItems.reduce(
        (max: number, item: Record<string, any>) =>
            Math.max(max, Number(item.maxMs ?? 0)),
        0,
    );
    const renderAvgSumMs = renderLineItems.reduce(
        (sum: number, item: Record<string, any>) =>
            sum + Number(item.avgMs ?? 0),
        0,
    );
    const longTaskCount = Number(perf?.longTasks?.count ?? 0);
    const longAnimationFrameCount = Number(perf?.longAnimationFrames?.count ?? 0);

    let classification = "nominal";
    const reasons: string[] = [];
    if (p95FrameMs > 33 || avgFrameMs > 25 || over33MsCount > 0) {
        if (renderMaxMs > Math.max(12, p95FrameMs * 0.5)) {
            if (renderAvgSumMs < Math.max(8, avgFrameMs * 0.33)) {
                classification = "render_spike_or_unattributed_pacing";
                reasons.push("isolated_render_spike_but_average_render_work_low");
            } else {
                classification = "render_bound";
                reasons.push("render_measure_near_frame_interval");
            }
        } else if (longTaskCount > 0 || longAnimationFrameCount > 0) {
            classification = "browser_main_thread_bound";
            reasons.push("browser_long_task_or_long_animation_frame");
        } else {
            classification = "frame_pacing_or_unattributed";
            reasons.push("slow_frame_intervals_without_matching_render_measures");
        }
    } else if (over20MsCount > 0) {
        classification = "minor_frame_jitter";
        reasons.push("some_frames_over_20ms");
    }

    if (observedFps > 0 && observedFps < 45 && renderMaxMs <= 8) {
        classification = "frame_pacing_or_unattributed";
        if (!reasons.includes("low_observed_fps_with_low_render_cost")) {
            reasons.push("low_observed_fps_with_low_render_cost");
        }
    }

    return {
        classification,
        reasons,
        observedFps: round(observedFps),
        avgFrameMs: round(avgFrameMs),
        p95FrameMs: round(p95FrameMs),
        maxFrameMs: round(maxFrameMs),
        renderMaxMs: round(renderMaxMs),
        renderAvgSumMs: round(renderAvgSumMs),
        longTaskCount,
        longAnimationFrameCount,
        cadenceBuckets,
    };
}

function countTransitionFallbacks(
    summaryEntries: Array<Record<string, any>>,
): {
    fallbackScenarios: Array<Record<string, JsonValue>>;
    fallbackReasonCounts: Array<Record<string, JsonValue>>;
} {
    const reasonCounts = new Map<string, number>();
    const fallbackScenarios = summaryEntries.flatMap((entry) => {
        const transitionReliability =
            entry.territoryScheduler?.transitionReliability ?? null;
        const fallbackReason =
            typeof transitionReliability?.fallbackReason === "string" &&
            transitionReliability.fallbackReason.length > 0
                ? transitionReliability.fallbackReason
                : null;
        if (!fallbackReason) return [];
        reasonCounts.set(
            fallbackReason,
            (reasonCounts.get(fallbackReason) ?? 0) + 1,
        );
        return [
            {
                name: String(entry.name ?? "unknown"),
                requestedMode:
                    typeof entry.requestedMode === "string"
                        ? entry.requestedMode
                        : null,
                fallbackReason,
            },
        ];
    });
    const fallbackReasonCounts = [...reasonCounts.entries()]
        .map(([reason, count]) => ({ reason, count }))
        .sort((left, right) => Number(right.count) - Number(left.count));
    return {
        fallbackScenarios,
        fallbackReasonCounts,
    };
}

function summarizeScenarioCollection(
    scenarios: Record<string, any>,
): Record<string, JsonValue> {
    const summaryEntries = Object.entries(scenarios).map(([name, scenario]) => ({
        name,
        ok: scenario?.ok ?? null,
        failureReason: scenario?.failureReason ?? null,
        requestedMode: scenario?.requestedMode ?? null,
        elapsedMs: round(Number(scenario?.elapsedMs ?? 0)),
        frames: scenario?.actionResult?.frames ?? null,
        longTasks: scenario?.perf?.longTasks ?? null,
        longAnimationFrames: scenario?.perf?.longAnimationFrames ?? null,
        frameSpikeDiagnostics: scenario?.perf?.frameSpikeDiagnostics ?? null,
        frameMeasures: scenario?.perf?.frameMeasures ?? [],
        framePacing: summarizeFramePacing(
            scenario?.actionResult?.frames,
            scenario?.perf,
        ),
        focusMeasures: scenario?.perf?.focusMeasures ?? [],
        highlightMeasures: scenario?.perf?.highlightMeasures ?? [],
        inputLatency: scenario?.perf?.inputLatency ?? null,
        shipDiagnostics: scenario?.perf?.shipDiagnostics ?? null,
        renderLineItems: scenario?.perf?.renderLineItems ?? [],
        orderLoopPerf: scenario?.actionResult?.orderLoopPerf ?? null,
        interactionEvents: scenario?.perf?.interactionEvents ?? [],
        pipelineEvents: scenario?.perf?.pipelineEvents ?? [],
        browserEvents: scenario?.perf?.browserEvents ?? [],
        orderLatency: summarizeOrderPathGap(scenario?.actionResult),
        cpuHotspots: scenario?.cpuHotspots ?? [],
        cpuFocusHotspots: scenario?.cpuFocusHotspots ?? [],
        territoryScheduler: scenario?.territoryScheduler ?? null,
        traceMainThread: scenario?.trace?.mainThreadTopByTotalMs ?? [],
        traceCategories: scenario?.trace?.mainThreadCategoriesTopByTotalMs ?? [],
        traceFocusBuckets: scenario?.traceFocusBuckets ?? [],
        devtoolsMetricsDelta: scenario?.devtoolsMetricsDelta ?? null,
        screenshotPath: scenario?.screenshotPath ?? null,
        perfEventTail: scenario?.perfEventTail ?? [],
    }));
    const failedScenarios = summaryEntries
        .filter((entry) => entry.ok === false)
        .map((entry) => ({
            name: entry.name,
            failureReason: entry.failureReason,
        }));
    const transitionFallbacks = countTransitionFallbacks(summaryEntries);
    return {
        scenarios: summaryEntries,
        failedScenarioCount: failedScenarios.length,
        failedScenarios,
        transitionFallbackScenarioCount:
            transitionFallbacks.fallbackScenarios.length,
        transitionFallbackScenarios: transitionFallbacks.fallbackScenarios,
        transitionFallbackReasonCounts:
            transitionFallbacks.fallbackReasonCounts,
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

function classifyTraceCategory(bucket: TraceDurationBucket): string {
    const joined = `${bucket.cat} ${bucket.name}`.toLowerCase();
    if (
        joined.includes("layout") ||
        joined.includes("prepaint") ||
        joined.includes("paint") ||
        joined.includes("layer") ||
        joined.includes("composite") ||
        joined.includes("hittest")
    ) {
        return "layout_paint_composite";
    }
    if (
        joined.includes("gc") ||
        joined.includes("scavenger") ||
        joined.includes("garbage")
    ) {
        return "gc";
    }
    if (
        joined.includes("eventdispatch") ||
        joined.includes("runmicrotasks") ||
        joined.includes("runtask") ||
        joined.includes("functioncall") ||
        joined.includes("fireanimationframe") ||
        joined.includes("evaluate")
    ) {
        return "script_events";
    }
    if (joined.includes("user_timing") || joined.includes("measure")) {
        return "user_timing";
    }
    if (joined.includes("loading") || joined.includes("resource")) {
        return "loading";
    }
    return "other";
}

function summarizeTraceCategories(
    buckets: readonly TraceDurationBucket[],
): TraceCategoryBucket[] {
    const categories = new Map<string, TraceCategoryBucket>();
    for (const bucket of buckets) {
        const name = classifyTraceCategory(bucket);
        const entry = categories.get(name) ?? {
            name,
            totalMs: 0,
            maxMs: 0,
            count: 0,
        };
        entry.totalMs += Number(bucket.totalMs ?? 0);
        entry.maxMs = Math.max(entry.maxMs, Number(bucket.maxMs ?? 0));
        entry.count += Number(bucket.count ?? 0);
        categories.set(name, entry);
    }
    return [...categories.values()]
        .map((entry) => ({
            ...entry,
            totalMs: round(entry.totalMs),
            maxMs: round(entry.maxMs),
        }))
        .sort((a, b) => b.totalMs - a.totalMs);
}

function summarizeTrace(traceEvents: readonly any[]): Record<string, JsonValue> {
    const summary = summarizeTraceBuckets(traceEvents);
    return {
        eventCount: traceEvents.length,
        mainThreadCount: summary.mainThread.length,
        topByTotalMs: summary.all,
        mainThreadTopByTotalMs: summary.mainThread,
        categoriesTopByTotalMs: summarizeTraceCategories(summary.all),
        mainThreadCategoriesTopByTotalMs: summarizeTraceCategories(
            summary.mainThread,
        ),
        largestSlices: summary.largestSlices,
    };
}

function emptyTraceSummary(): Record<string, JsonValue> {
    return {
        eventCount: 0,
        mainThreadCount: 0,
        topByTotalMs: [],
        mainThreadTopByTotalMs: [],
        categoriesTopByTotalMs: [],
        mainThreadCategoriesTopByTotalMs: [],
        largestSlices: [],
    };
}

const TRACE_FOCUS_NAMES = [
    "RunTask",
    "FunctionCall",
    "EventDispatch",
    "FireAnimationFrame",
    "Layout",
    "Paint",
    "PrePaint",
    "UpdateLayer",
    "CompositeLayers",
    "RasterTask",
    "ParseHTML",
    "UpdateCounters",
] as const;

function summarizeFocusTraceBuckets(
    buckets: readonly Record<string, JsonValue>[],
): Record<string, JsonValue>[] {
    return buckets.filter((bucket) =>
        TRACE_FOCUS_NAMES.some(
            (name) => String(bucket.name ?? "").toLowerCase() === name.toLowerCase(),
        ),
    );
}

function collectDevtoolsMetricValues(
    metricsPayload: any,
): Map<string, number> {
    const values = new Map<string, number>();
    for (const metric of metricsPayload?.metrics ?? []) {
        values.set(String(metric.name), Number(metric.value ?? 0));
    }
    return values;
}

async function collectTraceDuring<T>(
    client: CdpClient,
    action: () => Promise<T>,
): Promise<{
    actionResult: T;
    traceSummary: Record<string, JsonValue>;
    rawTraceEvents: any[];
}> {
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
            "blink",
            "loading",
            "v8.execute",
            "disabled-by-default-v8.gc",
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
            rawTraceEvents: traceEvents,
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
        "Timestamp",
        "AudioHandlers",
        "Documents",
        "TaskDuration",
        "ScriptDuration",
        "LayoutDuration",
        "RecalcStyleDuration",
        "DevToolsCommandDuration",
        "ProcessTime",
        "TaskOtherDuration",
        "JSHeapUsedSize",
        "JSHeapTotalSize",
        "Nodes",
        "JSEventListeners",
        "Frames",
        "DomContentLoaded",
        "NavigationStart",
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

function summarizeDevtoolsMetricDelta(
    beforePayload: any,
    afterPayload: any,
): Record<string, JsonValue> {
    const deltaNames = [
        "TaskDuration",
        "ScriptDuration",
        "LayoutDuration",
        "RecalcStyleDuration",
        "DevToolsCommandDuration",
        "ProcessTime",
        "TaskOtherDuration",
        "LayoutCount",
        "RecalcStyleCount",
        "Documents",
        "Nodes",
        "JSEventListeners",
        "Frames",
        "AudioHandlers",
        "JSHeapUsedSize",
        "JSHeapTotalSize",
    ];
    const before = collectDevtoolsMetricValues(beforePayload);
    const after = collectDevtoolsMetricValues(afterPayload);
    return Object.fromEntries(
        deltaNames.map((name) => [
            name,
            round((after.get(name) ?? 0) - (before.get(name) ?? 0)),
        ]),
    );
}

async function collectBrowserRuntimeStats(client: CdpClient): Promise<Record<string, JsonValue>> {
    return await client.evaluate<Record<string, JsonValue>>(`
        (() => {
            const paints = performance.getEntriesByType("paint").map((entry) => ({
                name: entry.name,
                startTimeMs: Number(entry.startTime.toFixed(3)),
                durationMs: Number(entry.duration.toFixed(3)),
            }));
            const resources = performance
                .getEntriesByType("resource")
                .slice(-20)
                .map((entry) => ({
                    name: entry.name.split("/").slice(-1)[0],
                    initiatorType: entry.initiatorType,
                    durationMs: Number(entry.duration.toFixed(3)),
                    transferSize: "transferSize" in entry ? entry.transferSize : 0,
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
            const perfState = window.__PAX_BENCH__.snapshotPerfCapture();
            const browserEventCounts = (perfState?.events ?? []).reduce((acc, event) => {
                const name = String(event?.name ?? "");
                if (!name.startsWith("browser.")) return acc;
                acc[name] = (acc[name] ?? 0) + 1;
                return acc;
            }, {});
            return {
                paints,
                resources,
                navigation: navSummary,
                memory,
                browserEventCounts,
            };
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

async function dispatchMouseMove(
    client: CdpClient,
    x: number,
    y: number,
): Promise<void> {
    await client.send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: round(x),
        y: round(y),
        button: "none",
        buttons: 0,
    });
}

async function resolveLiveStarClientPoint(
    client: CdpClient,
    starId: string,
    fallbackX: number,
    fallbackY: number,
): Promise<{
    clientX: number;
    clientY: number;
    hitStarId: string | null;
    hitMatches: boolean | null;
}> {
    const point = await client.evaluate<Record<string, JsonValue> | null>(
        `window.__PAX_BENCH__.getStarClientPoint(${JSON.stringify(starId)})`,
    );
    const clientX = Number(point?.clientX ?? fallbackX);
    const clientY = Number(point?.clientY ?? fallbackY);
    const hitStarId =
        point?.hitStarId == null ? null : String(point.hitStarId);
    const hitMatches =
        typeof point?.hitMatches === "boolean" ? point.hitMatches : null;
    return {
        clientX: Number.isFinite(clientX) ? clientX : fallbackX,
        clientY: Number.isFinite(clientY) ? clientY : fallbackY,
        hitStarId,
        hitMatches,
    };
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

async function waitForAnyPerfEvent(
    client: CdpClient,
    sinceIndex: number,
    candidates: Array<{
        name: string;
        detailMatchers?: Record<string, JsonValue>;
    }>,
    timeoutMs = 3000,
): Promise<Record<string, JsonValue>> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        for (const candidate of candidates) {
            const result = await waitForPerfEvent(
                client,
                sinceIndex,
                candidate.name,
                candidate.detailMatchers ?? {},
                1,
            );
            if (result.event) {
                return {
                    matched: true,
                    event: result.event,
                    matchedName: candidate.name,
                };
            }
        }
        await sleep(8);
    }
    return { matched: false, event: null, matchedName: null };
}

async function runHoverSweepStressLoop(
    client: CdpClient,
    path: Record<string, JsonValue>,
    stopSignal: { stopped: boolean },
): Promise<void> {
    const sourceX = Number(path.sourceClientX ?? 0);
    const sourceY = Number(path.sourceClientY ?? 0);
    const targetX = Number(path.targetClientX ?? 0);
    const targetY = Number(path.targetClientY ?? 0);
    const midX = (sourceX + targetX) * 0.5;
    const midY = (sourceY + targetY) * 0.5;
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const length = Math.max(1, Math.hypot(dx, dy));
    const ux = dx / length;
    const uy = dy / length;
    const nx = -uy;
    const ny = ux;
    const inset = Math.min(90, Math.max(28, length * 0.18));
    const offset = Math.min(120, Math.max(56, length * 0.22));
    const points = [
        {
            x: sourceX + ux * inset + nx * offset,
            y: sourceY + uy * inset + ny * offset,
        },
        {
            x: midX + nx * (offset * 0.75),
            y: midY + ny * (offset * 0.75),
        },
        {
            x: targetX - ux * inset + nx * offset,
            y: targetY - uy * inset + ny * offset,
        },
        {
            x: targetX - ux * inset - nx * offset,
            y: targetY - uy * inset - ny * offset,
        },
        {
            x: midX - nx * (offset * 0.75),
            y: midY - ny * (offset * 0.75),
        },
        {
            x: sourceX + ux * inset - nx * offset,
            y: sourceY + uy * inset - ny * offset,
        },
    ];
    let index = 0;
    while (!stopSignal.stopped) {
        const point = points[index % points.length] ?? points[0];
        await dispatchMouseMove(client, point.x, point.y);
        index += 1;
        await sleep(12);
    }
}

async function executePointerOrderLoop(
    client: CdpClient,
    iterations: number,
    options?: {
        hoverStress?: boolean;
    },
): Promise<JsonValue> {
    const samples: Array<Record<string, JsonValue>> = [];
    for (let i = 0; i < iterations; i += 1) {
        await client.evaluate<void>(
            "window.__PAX_BENCH__.resetInteractionState()",
        );
        const path = await client.evaluate<any>(
            "window.__PAX_BENCH__.getOrderPointerPath()",
        );
        if (!path) {
            samples.push({ ok: false, reason: "missing-order-path" });
            await sleep(80);
            continue;
        }
        const sourcePoint = await resolveLiveStarClientPoint(
            client,
            String(path.sourceId),
            Number(path.sourceClientX ?? 0),
            Number(path.sourceClientY ?? 0),
        );
        if (sourcePoint.hitMatches === false) {
            samples.push({
                ok: false,
                reason: "source-hit-miss",
                sourceId: path.sourceId ?? null,
                targetId: path.targetId ?? null,
                expectedHitStarId: path.sourceId ?? null,
                actualHitStarId: sourcePoint.hitStarId,
                clientX: sourcePoint.clientX,
                clientY: sourcePoint.clientY,
            });
            await sleep(80);
            continue;
        }
        const initialTargetPoint = await resolveLiveStarClientPoint(
            client,
            String(path.targetId),
            Number(path.targetClientX ?? 0),
            Number(path.targetClientY ?? 0),
        );
        if (initialTargetPoint.hitMatches === false) {
            samples.push({
                ok: false,
                reason: "target-hit-miss",
                sourceId: path.sourceId ?? null,
                targetId: path.targetId ?? null,
                expectedHitStarId: path.targetId ?? null,
                actualHitStarId: initialTargetPoint.hitStarId,
                clientX: initialTargetPoint.clientX,
                clientY: initialTargetPoint.clientY,
            });
            await sleep(80);
            continue;
        }
        const issueStartedAt = await client.evaluate<number>("performance.now()");
        const issueEventStartIndex = await client.evaluate<number>(
            "window.__PAX_BENCH__.getPerfEventCursor()",
        );
        const stressSignal = { stopped: false };
        let stressLoop: Promise<void> | null = null;
        await dispatchMouseClick(
            client,
            sourcePoint.clientX,
            sourcePoint.clientY,
        );
        const sourcePointerDownHandled = await waitForPerfEvent(
            client,
            issueEventStartIndex,
            "input.pointerdown.handled",
            { button: 0 },
            800,
        );
        const sourcePointerUpHandled = await waitForPerfEvent(
            client,
            issueEventStartIndex,
            "input.pointerup.handled",
            { button: 0 },
            800,
        );
        const sourceSelectLocalAcknowledgment = await waitForPerfEvent(
            client,
            issueEventStartIndex,
            "input.interaction.localAcknowledgment",
            {
                kind: "select",
                targetId: String(path.sourceId),
            },
            800,
        );
        const sourceSelectEvent = await waitForPerfEvent(
            client,
            issueEventStartIndex,
            "input.orderPath.select",
            {
                targetId: String(path.sourceId),
            },
            1500,
        );
        await sleep(24);
        const targetPoint = await resolveLiveStarClientPoint(
            client,
            String(path.targetId),
            Number(path.targetClientX ?? 0),
            Number(path.targetClientY ?? 0),
        );
        if (targetPoint.hitMatches === false) {
            await client.evaluate<void>(
                "window.__PAX_BENCH__.resetInteractionState()",
            );
            samples.push({
                ok: false,
                reason: "target-hit-miss-after-select",
                sourceId: path.sourceId ?? null,
                targetId: path.targetId ?? null,
                expectedHitStarId: path.targetId ?? null,
                actualHitStarId: targetPoint.hitStarId,
                clientX: targetPoint.clientX,
                clientY: targetPoint.clientY,
            });
            await sleep(80);
            continue;
        }
        if (options?.hoverStress === true) {
            stressLoop = runHoverSweepStressLoop(
                client,
                {
                    ...path,
                    sourceClientX: sourcePoint.clientX,
                    sourceClientY: sourcePoint.clientY,
                    targetClientX: targetPoint.clientX,
                    targetClientY: targetPoint.clientY,
                },
                stressSignal,
            );
            await sleep(48);
            stressSignal.stopped = true;
            await stressLoop;
            stressLoop = null;
        }
        const targetClickStartedAt = await client.evaluate<number>(
            "performance.now()",
        );
        const targetClickEventStartIndex = await client.evaluate<number>(
            "window.__PAX_BENCH__.getPerfEventCursor()",
        );
        await dispatchMouseClick(
            client,
            targetPoint.clientX,
            targetPoint.clientY,
        );
        const targetPointerDownHandled = await waitForPerfEvent(
            client,
            targetClickEventStartIndex,
            "input.pointerdown.handled",
            { button: 0 },
            800,
        );
        const targetPointerUpHandled = await waitForPerfEvent(
            client,
            targetClickEventStartIndex,
            "input.pointerup.handled",
            { button: 0 },
            800,
        );
        const issueLocalAcknowledgment = await waitForAnyPerfEvent(
            client,
            issueEventStartIndex,
            [
                {
                    name: "input.interaction.localAcknowledgment",
                    detailMatchers: {
                        kind: "issue",
                        sourceId: String(path.sourceId),
                        targetId: String(path.targetId),
                    },
                },
                {
                    name: "input.interaction.localAcknowledgment",
                    detailMatchers: {
                        kind: "defer",
                        sourceId: String(path.sourceId),
                        targetId: String(path.targetId),
                    },
                },
            ],
            800,
        );
        const issueVisualAcknowledgment = await waitForAnyPerfEvent(
            client,
            issueEventStartIndex,
            [
                {
                    name: "input.interaction.visualAcknowledgment",
                    detailMatchers: {
                        kind: "issue",
                        sourceId: String(path.sourceId),
                        targetId: String(path.targetId),
                    },
                },
                {
                    name: "input.interaction.visualAcknowledgment",
                    detailMatchers: {
                        kind: "defer",
                        sourceId: String(path.sourceId),
                        targetId: String(path.targetId),
                    },
                },
            ],
            800,
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
            {},
            1200,
        );
        const issuePerfEvent = await waitForPerfEvent(
            client,
            issueEventStartIndex,
            "game.order.issued",
            {
                from: `Star ${String(path.sourceId)}`,
                to: `Star ${String(path.targetId)}`,
            },
            2000,
        );
        const issueOrderPathEvent = await waitForAnyPerfEvent(
            client,
            issueEventStartIndex,
            [
                {
                    name: "input.orderPath.issue",
                    detailMatchers: {
                        sourceId: String(path.sourceId),
                        targetId: String(path.targetId),
                    },
                },
                {
                    name: "input.orderPath.defer",
                    detailMatchers: {
                        sourceId: String(path.sourceId),
                        targetId: String(path.targetId),
                    },
                },
            ],
            1200,
        );
        const cancelStartedAt = await client.evaluate<number>("performance.now()");
        const cancelEventStartIndex = await client.evaluate<number>(
            "window.__PAX_BENCH__.getPerfEventCursor()",
        );
        const cancelPoint = await resolveLiveStarClientPoint(
            client,
            String(path.sourceId),
            Number(path.sourceClientX ?? 0),
            Number(path.sourceClientY ?? 0),
        );
        await dispatchMouseClick(
            client,
            cancelPoint.clientX,
            cancelPoint.clientY,
            "right",
        );
        const cancelPointerDownHandled = await waitForPerfEvent(
            client,
            cancelEventStartIndex,
            "input.pointerdown.handled",
            { button: 2 },
            800,
        );
        const cancelPointerUpHandled = await waitForPerfEvent(
            client,
            cancelEventStartIndex,
            "input.pointerup.handled",
            { button: 2 },
            800,
        );
        const cancelRightclickHandled = await waitForPerfEvent(
            client,
            cancelEventStartIndex,
            "input.rightclick.handled",
            { button: 2 },
            800,
        );
        const cancelLocalAcknowledgment = await waitForPerfEvent(
            client,
            cancelEventStartIndex,
            "input.interaction.localAcknowledgment",
            {
                kind: "cancel",
                sourceId: String(path.sourceId),
            },
            800,
        );
        const cancelVisualAcknowledgment = await waitForPerfEvent(
            client,
            cancelEventStartIndex,
            "input.interaction.visualAcknowledgment",
            {
                kind: "cancel",
                sourceId: String(path.sourceId),
            },
            800,
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
            {},
            1200,
        );
        const cancelPerfEvent = await waitForPerfEvent(
            client,
            cancelEventStartIndex,
            "game.order.cancelled",
            {
                from: `Star ${String(path.sourceId)}`,
            },
            2000,
        );
        const cancelOrderPathEvent = await waitForAnyPerfEvent(
            client,
            cancelEventStartIndex,
            [
                {
                    name: "input.orderPath.cancel",
                    detailMatchers: {
                        sourceId: String(path.sourceId),
                    },
                },
                {
                    name: "input.orderPath.defer_cancel",
                    detailMatchers: {
                        targetId: String(path.sourceId),
                    },
                },
            ],
            1200,
        );
        stressSignal.stopped = true;
        if (stressLoop) {
            await stressLoop;
        }
        const sourceSelectLocalAcknowledgmentMs = getEventDeltaMs(
            sourceSelectLocalAcknowledgment,
            issueStartedAt,
        );
        const sourcePointerDownHandledMs = getEventDeltaMs(
            sourcePointerDownHandled,
            issueStartedAt,
        );
        const sourcePointerDownDispatchLeadMs = getEventDispatchLeadMs(
            sourcePointerDownHandled,
            issueStartedAt,
        );
        const sourcePointerDownQueueDelayMs = getEventQueueDelayMetricMs(
            sourcePointerDownHandled,
        );
        const sourcePointerUpHandledMs = getEventDeltaMs(
            sourcePointerUpHandled,
            issueStartedAt,
        );
        const sourceSelectMs = sourceSelectEvent.event
            ? round(
                  Number(
                      (sourceSelectEvent.event as Record<string, JsonValue>)
                          .atMs ?? issueStartedAt,
                  ) - issueStartedAt,
              )
            : null;
        const targetPointerDownHandledMs = getEventDeltaMs(
            targetPointerDownHandled,
            targetClickStartedAt,
        );
        const targetPointerDownDispatchLeadMs = getEventDispatchLeadMs(
            targetPointerDownHandled,
            targetClickStartedAt,
        );
        const targetPointerDownQueueDelayMs = getEventQueueDelayMetricMs(
            targetPointerDownHandled,
        );
        const targetPointerUpHandledMs = getEventDeltaMs(
            targetPointerUpHandled,
            targetClickStartedAt,
        );
        const issueLocalAcknowledgmentMs = getEventDeltaMs(issueLocalAcknowledgment, issueStartedAt);
        const issueLocalAcknowledgmentAfterTargetClickMs = getEventDeltaMs(
            issueLocalAcknowledgment,
            targetClickStartedAt,
        );
        const issueVisualAcknowledgmentMs = getEventDeltaMs(issueVisualAcknowledgment, issueStartedAt);
        const issueVisualAcknowledgmentAfterTargetClickMs = getEventDeltaMs(
            issueVisualAcknowledgment,
            targetClickStartedAt,
        );
        const issueHandledToLocalAcknowledgmentAfterTargetClickMs = subtractMetricMs(
            issueLocalAcknowledgmentAfterTargetClickMs,
            targetPointerUpHandledMs,
        );
        const issueHandledToVisualAcknowledgmentAfterTargetClickMs = subtractMetricMs(
            issueVisualAcknowledgmentAfterTargetClickMs,
            targetPointerUpHandledMs,
        );
        const issueCommitMs = round(
            Number(issueApplied.observedAtMs ?? issueStartedAt) -
                issueStartedAt,
        );
        const issueAfterTargetClickMs = round(
            Number(issueApplied.observedAtMs ?? targetClickStartedAt) -
                targetClickStartedAt,
        );
        const issueHandledToCommitAfterTargetClickMs = subtractMetricMs(
            issueAfterTargetClickMs,
            targetPointerUpHandledMs,
        );
        const cancelCommitMs = round(
            Number(cancelApplied.observedAtMs ?? cancelStartedAt) -
                cancelStartedAt,
        );
        const cancelPointerDownHandledMs = getEventDeltaMs(
            cancelPointerDownHandled,
            cancelStartedAt,
        );
        const cancelPointerDownDispatchLeadMs = getEventDispatchLeadMs(
            cancelPointerDownHandled,
            cancelStartedAt,
        );
        const cancelPointerDownQueueDelayMs = getEventQueueDelayMetricMs(
            cancelPointerDownHandled,
        );
        const cancelPointerUpHandledMs = getEventDeltaMs(
            cancelPointerUpHandled,
            cancelStartedAt,
        );
        const cancelRightclickHandledMs = getEventDeltaMs(
            cancelRightclickHandled,
            cancelStartedAt,
        );
        const cancelRightclickDispatchLeadMs = getEventDispatchLeadMs(
            cancelRightclickHandled,
            cancelStartedAt,
        );
        const cancelRightclickQueueDelayMs = getEventQueueDelayMetricMs(
            cancelRightclickHandled,
        );
        const issueQueueFlushMs = issueQueueFlush.event
            ? round(
                  Number(
                      (issueQueueFlush.event as Record<string, JsonValue>).atMs
                      ?? issueStartedAt,
                  ) - issueStartedAt,
              )
            : null;
        const issueQueueFlushAfterTargetClickMs = issueQueueFlush.event
            ? round(
                  Number(
                      (issueQueueFlush.event as Record<string, JsonValue>).atMs
                      ?? targetClickStartedAt,
                  ) - targetClickStartedAt,
              )
            : null;
        const issuePerfEventMs = issuePerfEvent.event
            ? round(
                  Number(
                      (issuePerfEvent.event as Record<string, JsonValue>).atMs
                      ?? issueStartedAt,
                  ) - issueStartedAt,
              )
            : null;
        const issuePerfEventAfterTargetClickMs = issuePerfEvent.event
            ? round(
                  Number(
                      (issuePerfEvent.event as Record<string, JsonValue>).atMs
                      ?? targetClickStartedAt,
                  ) - targetClickStartedAt,
              )
            : null;
        const issueOrderPathEventMs = issueOrderPathEvent.event
            ? round(
                  Number(
                      (
                          issueOrderPathEvent.event as Record<
                              string,
                              JsonValue
                          >
                      ).atMs ?? issueStartedAt,
                  ) - issueStartedAt,
              )
            : null;
        const issueOrderPathEventAfterTargetClickMs = issueOrderPathEvent.event
            ? round(
                  Number(
                      (
                          issueOrderPathEvent.event as Record<
                              string,
                              JsonValue
                          >
                      ).atMs ?? targetClickStartedAt,
                  ) - targetClickStartedAt,
              )
            : null;
        const issueAcknowledgmentKind = getEventDetailValue(issueLocalAcknowledgment, "kind");
        const issueAcknowledgmentPath = getEventDetailValue(issueLocalAcknowledgment, "path");
        const issueRequestId = getEventDetailValue(issueLocalAcknowledgment, "requestId");
        const issueVisualAcknowledgmentReason = getEventDetailValue(
            issueVisualAcknowledgment,
            "reason",
        );
        const cancelLocalAcknowledgmentMs = getEventDeltaMs(cancelLocalAcknowledgment, cancelStartedAt);
        const cancelHandledToLocalAcknowledgmentMs = subtractMetricMs(
            cancelLocalAcknowledgmentMs,
            cancelPointerDownHandledMs,
        );
        const cancelVisualAcknowledgmentMs = getEventDeltaMs(
            cancelVisualAcknowledgment,
            cancelStartedAt,
        );
        const cancelHandledToVisualAcknowledgmentMs = subtractMetricMs(
            cancelVisualAcknowledgmentMs,
            cancelPointerDownHandledMs,
        );
        const cancelQueueFlushMs = cancelQueueFlush.event
            ? round(
                  Number(
                      (cancelQueueFlush.event as Record<string, JsonValue>)
                          .atMs ?? cancelStartedAt,
                  ) - cancelStartedAt,
              )
            : null;
        const cancelPerfEventMs = cancelPerfEvent.event
            ? round(
                  Number(
                      (cancelPerfEvent.event as Record<string, JsonValue>).atMs
                      ?? cancelStartedAt,
                  ) - cancelStartedAt,
              )
            : null;
        const cancelHandledToCommitMs = subtractMetricMs(
            cancelCommitMs,
            cancelPointerDownHandledMs,
        );
        const cancelOrderPathEventMs = cancelOrderPathEvent.event
            ? round(
                  Number(
                      (
                          cancelOrderPathEvent.event as Record<
                              string,
                              JsonValue
                          >
                      ).atMs ?? cancelStartedAt,
                  ) - cancelStartedAt,
              )
            : null;
        const cancelOrderPathEventName =
            cancelOrderPathEvent.matchedName ?? null;
        const cancelAcknowledgmentPath = getEventDetailValue(cancelLocalAcknowledgment, "path");
        const cancelRequestId = getEventDetailValue(
            cancelLocalAcknowledgment,
            "requestId",
        );
        const cancelVisualAcknowledgmentReason = getEventDetailValue(
            cancelVisualAcknowledgment,
            "reason",
        );
        const benchmarkInvalidReasons: string[] = [];
        if (!sourceSelectLocalAcknowledgment.event) {
            benchmarkInvalidReasons.push(
                "missing_source_select_local_acknowledgment",
            );
        }
        if (!sourceSelectEvent.event) {
            benchmarkInvalidReasons.push("missing_source_select");
        }
        if (!(issueApplied.matched ?? false)) {
            benchmarkInvalidReasons.push("missing_issue_commit");
        }
        if (!(cancelApplied.matched ?? false)) {
            benchmarkInvalidReasons.push("missing_cancel_commit");
        }
        if (
            issueOrderPathEvent.matchedName !== "input.orderPath.issue"
            && issueOrderPathEvent.matchedName !== "input.orderPath.defer"
        ) {
            benchmarkInvalidReasons.push("unexpected_issue_order_path_event");
        }
        if (
            cancelOrderPathEvent.matchedName != null
            && cancelOrderPathEvent.matchedName !== "input.orderPath.cancel"
            && cancelOrderPathEvent.matchedName !== "input.orderPath.defer_cancel"
        ) {
            benchmarkInvalidReasons.push("unexpected_cancel_order_path_event");
        }
        for (const [metricName, metricValue] of Object.entries({
            issueLocalAcknowledgmentAfterTargetClickMs,
            issueVisualAcknowledgmentAfterTargetClickMs,
            issueAfterTargetClickMs,
            issueQueueFlushAfterTargetClickMs,
            issuePerfEventAfterTargetClickMs,
            issueOrderPathEventAfterTargetClickMs,
        })) {
            if (typeof metricValue === "number" && metricValue < 0) {
                benchmarkInvalidReasons.push(`negative_${metricName}`);
            }
        }
        if (
            options?.hoverStress === true
            && benchmarkInvalidReasons.some((reason) =>
                reason.startsWith("negative_"),
            )
        ) {
            benchmarkInvalidReasons.unshift("stress_pretriggered_issue");
        }
        samples.push({
            ok: true,
            sourceId: path.sourceId ?? null,
            targetId: path.targetId ?? null,
            sourcePointerDownHandledMs,
            sourcePointerDownDispatchLeadMs,
            sourcePointerDownQueueDelayMs,
            sourcePointerUpHandledMs,
            sourceSelectLocalAcknowledgmentMs,
            sourceSelectMs,
            targetPointerDownHandledMs,
            targetPointerDownDispatchLeadMs,
            targetPointerDownQueueDelayMs,
            targetPointerUpHandledMs,
            issueLocalAcknowledgmentMs,
            issueLocalAcknowledgmentAfterTargetClickMs,
            issueVisualAcknowledgmentMs,
            issueVisualAcknowledgmentAfterTargetClickMs,
            issueHandledToLocalAcknowledgmentAfterTargetClickMs,
            issueHandledToVisualAcknowledgmentAfterTargetClickMs,
            issueCommitMs,
            issueAfterTargetClickMs,
            issueHandledToCommitAfterTargetClickMs,
            cancelPointerDownHandledMs,
            cancelPointerDownDispatchLeadMs,
            cancelPointerDownQueueDelayMs,
            cancelPointerUpHandledMs,
            cancelRightclickHandledMs,
            cancelRightclickDispatchLeadMs,
            cancelRightclickQueueDelayMs,
            cancelCommitMs,
            issueQueueFlushMs,
            issueQueueFlushAfterTargetClickMs,
            issuePerfEventMs,
            issuePerfEventAfterTargetClickMs,
            issueOrderPathEventMs,
            issueOrderPathEventAfterTargetClickMs,
            issueOrderPathEventName:
                issueOrderPathEvent.matchedName ?? null,
            issueAcknowledgmentKind,
            issueAcknowledgmentPath,
            issueRequestId,
            issueVisualAcknowledgmentReason,
            issueMatched: issueApplied.matched ?? false,
            cancelMatched: cancelApplied.matched ?? false,
            cancelLocalAcknowledgmentMs,
            cancelHandledToLocalAcknowledgmentMs,
            cancelVisualAcknowledgmentMs,
            cancelHandledToVisualAcknowledgmentMs,
            cancelQueueFlushMs,
            cancelPerfEventMs,
            cancelHandledToCommitMs,
            cancelOrderPathEventMs,
            cancelOrderPathEventName,
            cancelAcknowledgmentPath,
            cancelRequestId,
            cancelVisualAcknowledgmentReason,
            issueStatus: issueApplied.status ?? null,
            cancelStatus: cancelApplied.status ?? null,
            benchmarkValid: benchmarkInvalidReasons.length === 0,
            benchmarkInvalidReasons,
            perfEventTail: await client.evaluate<Array<Record<string, JsonValue>>>(
                `window.__PAX_BENCH__.getPerfEventsSince(${issueEventStartIndex}, 80)`,
            ),
            stressMode: options?.hoverStress === true ? "hover_sweep" : null,
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
            1500,
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
            1500,
        );
        const benchmarkInvalidReasons: string[] = [];
        if (!issueAccepted) {
            benchmarkInvalidReasons.push("issue_not_accepted");
        }
        if (!(issueApplied.matched ?? false)) {
            benchmarkInvalidReasons.push("missing_issue_commit");
        }
        if (!(cancelApplied.matched ?? false)) {
            benchmarkInvalidReasons.push("missing_cancel_commit");
        }

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
            benchmarkValid: benchmarkInvalidReasons.length === 0,
            benchmarkInvalidReasons,
        });
        await sleep(80);
    }
    return { samples };
}

async function collectFrameStatsWithFreshPerfWindow(
    client: CdpClient,
    durationMs: number,
    warmupMs: number,
): Promise<{
    frames: JsonValue;
    orderLoopPerf: Record<string, JsonValue>;
}> {
    const orderLoopSnapshot = await client.evaluate<any>(
        "window.__PAX_BENCH__.snapshotPerfCapture()",
    );
    const orderLoopPerf = summarizePerfSnapshot(orderLoopSnapshot, null);
    await client.evaluate<void>("window.__PAX_BENCH__.resetPerfCapture()");
    const frames = await client.evaluate<JsonValue>(
        `window.__PAX_BENCH__.collectFrameStats(${durationMs}, ${warmupMs})`,
    );
    return { frames, orderLoopPerf };
}

async function captureTransitionDiagnosticScenario(
    client: CdpClient,
    mode: string,
    _mapName: string | null,
): Promise<JsonValue> {
    const canvasApiSummaryExpression = `(() => {
        const canvas = window.__PAX_GAME_CANVAS__ ?? null;
        const scheduler =
            canvas?.getBenchmarkTerritorySchedulerSnapshot?.() ?? null;
        return {
            hasCanvas: Boolean(canvas),
            keys: canvas
                ? Object.keys(canvas)
                      .filter((key) => !key.startsWith("$$"))
                      .sort()
                : [],
            getTransitionDiagnosticCaptureStateType: canvas
                ? typeof canvas.getTransitionDiagnosticCaptureState
                : "missing",
            resetTransitionDiagnosticCaptureType: canvas
                ? typeof canvas.resetTransitionDiagnosticCapture
                : "missing",
            getBenchmarkTerritorySchedulerSnapshotType: canvas
                ? typeof canvas.getBenchmarkTerritorySchedulerSnapshot
                : "missing",
            directCaptureState:
                canvas?.getTransitionDiagnosticCaptureState?.() ?? null,
            schedulerCaptureState:
                scheduler?.transitionDiagnosticCaptureState ?? null,
        };
    })()`;
    const modeLiteral = JSON.stringify(mode);
    const conquestMapLiteral = JSON.stringify(CONQUEST_DIAGNOSTIC_MAP);
    const prepScript = `
        (async () => {
            window.__PAX_BENCH__.resetPerfCapture();
            const loadedMap =
                await window.__PAX_BENCH__.loadMapDefinition(${conquestMapLiteral});
            if (!loadedMap) {
                throw new Error("Could not load conquest diagnostic fixture map");
            }
            const modePrep = await window.__PAX_BENCH__.ensureTerritoryMode(${modeLiteral});
            const gameplayPrep = await window.__PAX_BENCH__.beginGameplay(6000, 1);
            if (!gameplayPrep?.started) {
                throw new Error(
                    "Conquest diagnostic gameplay did not start: " +
                        JSON.stringify(gameplayPrep),
                );
            }
            await window.__PAX_BENCH__.clearTransitionRecorderBundles();
            await window.__PAX_BENCH__.setTransitionRecorderEnabled(true);
            await new Promise((resolve) => setTimeout(resolve, 600));
            return {
                modePrep,
                gameplayPrep,
                recorder: await window.__PAX_BENCH__.getTransitionRecorderSummary(),
                captureStateBeforePrepOrder:
                    await window.__PAX_BENCH__.getTransitionDiagnosticCaptureState(),
                canvasApiBeforePrepOrder: ${canvasApiSummaryExpression},
                stateBeforePrepOrder: await window.__PAX_BENCH__.getStateSummary(),
                sampleOrder:
                    await window.__PAX_BENCH__.prepareConquestDiagnosticOrder(),
            };
        })()
    `;
    const prep = await client.evaluate<Record<string, JsonValue>>(prepScript);
    const sampleOrder = prep.sampleOrder as Record<string, JsonValue> | null;
    if (!sampleOrder?.sourceId || !sampleOrder?.targetId) {
        await client.evaluate(
            "window.__PAX_BENCH__.setTransitionRecorderEnabled(false)",
        );
        return {
            ok: false,
            reason: "missing_conquest_order",
            prep,
        };
    }

    const issued = await client.evaluate<boolean>(
        `window.__PAX_BENCH__.issueOrderDirect(${JSON.stringify(String(sampleOrder.sourceId))}, ${JSON.stringify(String(sampleOrder.targetId))}, true)`,
    );
    if (!issued) {
        await client.evaluate(
            "window.__PAX_BENCH__.setTransitionRecorderEnabled(false)",
        );
        return {
            ok: false,
            reason: "issue_order_rejected",
            prep,
            sampleOrder,
        };
    }
    const bundleWait = await client.evaluate<Record<string, JsonValue>>(
        "window.__PAX_BENCH__.waitForTransitionBundle(0, 25000)",
    );
    const sourceIdLiteral = JSON.stringify(String(sampleOrder.sourceId));
    const targetIdLiteral = JSON.stringify(String(sampleOrder.targetId));
    const starTimeline = await client.evaluate<Array<Record<string, JsonValue>>>(
        `
            (async () => {
                const samples = [];
                for (let index = 0; index < 10; index += 1) {
                    samples.push({
                        sampleIndex: index,
                        state: await window.__PAX_BENCH__.getStateSummary(),
                        source: await window.__PAX_BENCH__.getStarState(${sourceIdLiteral}),
                        target: await window.__PAX_BENCH__.getStarState(${targetIdLiteral}),
                        sourceOrder: await window.__PAX_BENCH__.getOrderStatus(${sourceIdLiteral}),
                        recorder: await window.__PAX_BENCH__.getTransitionRecorderSummary(),
                        captureState:
                            await window.__PAX_BENCH__.getTransitionDiagnosticCaptureState(),
                    });
                    await new Promise((resolve) => setTimeout(resolve, 250));
                }
                return samples;
            })()
        `,
    );
    const stateAfterIssue = await client.evaluate<Record<string, JsonValue>>(
        "window.__PAX_BENCH__.getStateSummary()",
    );
    const captureStateAfterIssue =
        await client.evaluate<Record<string, JsonValue> | null>(
            "window.__PAX_BENCH__.getTransitionDiagnosticCaptureState()",
        );
    const canvasApiAfterIssue = await client.evaluate<Record<string, JsonValue>>(
        canvasApiSummaryExpression,
    );
    const recorderSummary = await client.evaluate<Record<string, JsonValue>>(
        "window.__PAX_BENCH__.getTransitionRecorderSummary()",
    );
    const captureStateAfterWait =
        await client.evaluate<Record<string, JsonValue> | null>(
            "window.__PAX_BENCH__.getTransitionDiagnosticCaptureState()",
        );
    const canvasApiAfterWait = await client.evaluate<Record<string, JsonValue>>(
        canvasApiSummaryExpression,
    );
    const diagnosticBundle =
        await client.evaluate<Record<string, JsonValue> | null>(
            "window.__PAX_BENCH__.getLatestTransitionDiagnosticBundle()",
        );
    const diagnosticValidation =
        validateTransitionDiagnosticBundleForBenchmark(diagnosticBundle);
    await client.evaluate("window.__PAX_BENCH__.setTransitionRecorderEnabled(false)");
    return {
        ok: Boolean(bundleWait.matched) && diagnosticValidation.ok,
        reason: !bundleWait.matched
            ? "transition_bundle_not_matched"
            : diagnosticValidation.ok
              ? undefined
              : "transition_diagnostic_validation_failed",
        issued,
        sampleOrder,
        bundleWait,
        starTimeline,
        stateAfterIssue,
        captureStateAfterIssue,
        canvasApiAfterIssue,
        recorderSummary,
        captureStateAfterWait,
        canvasApiAfterWait,
        diagnosticBundle,
        diagnosticValidation: diagnosticValidation as unknown as JsonValue,
        diagnosticStepSummary: Array.isArray(diagnosticBundle?.steps)
            ? (diagnosticBundle?.steps as Array<Record<string, JsonValue>>).map(
                  (step) => ({
                      stepId: step.stepId ?? null,
                      stage: step.stage ?? null,
                      title: step.title ?? null,
                      checks: Array.isArray(step.checks) ? step.checks.length : 0,
                      failIfTriggered: Array.isArray(step.failIf)
                          ? step.failIf.filter(
                                (entry: Record<string, JsonValue>) =>
                                    entry.triggered === true,
                            ).length
                          : 0,
                  }),
              )
            : [],
    };
}

async function captureConquestAnimationScenario(
    client: CdpClient,
    mode: string,
    _mapName: string | null,
): Promise<JsonValue> {
    const canvasApiSummaryExpression = `(() => {
        const canvas = window.__PAX_GAME_CANVAS__ ?? null;
        const scheduler =
            canvas?.getBenchmarkTerritorySchedulerSnapshot?.() ?? null;
        return {
            hasCanvas: Boolean(canvas),
            keys: canvas
                ? Object.keys(canvas)
                      .filter((key) => !key.startsWith("$$"))
                      .sort()
                : [],
            getTransitionDiagnosticCaptureStateType: canvas
                ? typeof canvas.getTransitionDiagnosticCaptureState
                : "missing",
            resetTransitionDiagnosticCaptureType: canvas
                ? typeof canvas.resetTransitionDiagnosticCapture
                : "missing",
            getBenchmarkTerritorySchedulerSnapshotType: canvas
                ? typeof canvas.getBenchmarkTerritorySchedulerSnapshot
                : "missing",
            directCaptureState:
                canvas?.getTransitionDiagnosticCaptureState?.() ?? null,
            schedulerCaptureState:
                scheduler?.transitionDiagnosticCaptureState ?? null,
        };
    })()`;
    const modeLiteral = JSON.stringify(mode);
    const conquestMapLiteral = JSON.stringify(CONQUEST_DIAGNOSTIC_MAP);
    const prepScript = `
        (async () => {
            window.__PAX_BENCH__.resetPerfCapture();
            const loadedMap =
                await window.__PAX_BENCH__.loadMapDefinition(${conquestMapLiteral});
            if (!loadedMap) {
                throw new Error("Could not load conquest animation fixture map");
            }
            const modePrep = await window.__PAX_BENCH__.ensureTerritoryMode(${modeLiteral});
            const gameplayPrep = await window.__PAX_BENCH__.beginGameplay(6000, 1);
            if (!gameplayPrep?.started) {
                throw new Error(
                    "Conquest animation gameplay did not start: " +
                        JSON.stringify(gameplayPrep),
                );
            }
            await window.__PAX_BENCH__.clearTransitionRecorderBundles();
            await window.__PAX_BENCH__.setTransitionRecorderEnabled(false);
            await new Promise((resolve) => setTimeout(resolve, 600));
            return {
                modePrep,
                gameplayPrep,
                recorder: await window.__PAX_BENCH__.getTransitionRecorderSummary(),
                captureStateBeforePrepOrder:
                    await window.__PAX_BENCH__.getTransitionDiagnosticCaptureState(),
                canvasApiBeforePrepOrder: ${canvasApiSummaryExpression},
                stateBeforePrepOrder: await window.__PAX_BENCH__.getStateSummary(),
                sampleOrder:
                    await window.__PAX_BENCH__.prepareConquestDiagnosticOrder(),
            };
        })()
    `;
    const prep = await client.evaluate<Record<string, JsonValue>>(prepScript);
    const sampleOrder = prep.sampleOrder as Record<string, JsonValue> | null;
    if (!sampleOrder?.sourceId || !sampleOrder?.targetId) {
        return {
            ok: false,
            reason: "missing_conquest_order",
            prep,
        };
    }

    const sourceId = String(sampleOrder.sourceId);
    const targetId = String(sampleOrder.targetId);
    const sourceIdLiteral = JSON.stringify(sourceId);
    const targetIdLiteral = JSON.stringify(targetId);
    const issued = await client.evaluate<boolean>(
        `window.__PAX_BENCH__.issueOrderDirect(${sourceIdLiteral}, ${targetIdLiteral}, true)`,
    );
    if (!issued) {
        return {
            ok: false,
            reason: "issue_order_rejected",
            prep,
            sampleOrder,
        };
    }

    const frames = await client.evaluate<JsonValue>(
        `window.__PAX_BENCH__.collectFrameStats(${GAMEPLAY_FRAME_MS}, 0)`,
    );
    const stateAfterFrames = await client.evaluate<Record<string, JsonValue>>(
        "window.__PAX_BENCH__.getStateSummary()",
    );
    const sourceAfterFrames =
        await client.evaluate<Record<string, JsonValue> | null>(
            `window.__PAX_BENCH__.getStarState(${sourceIdLiteral})`,
        );
    const targetAfterFrames =
        await client.evaluate<Record<string, JsonValue> | null>(
            `window.__PAX_BENCH__.getStarState(${targetIdLiteral})`,
        );
    const orderAfterFrames =
        await client.evaluate<Record<string, JsonValue> | null>(
            `window.__PAX_BENCH__.getOrderStatus(${sourceIdLiteral})`,
        );
    const captureStateAfterFrames =
        await client.evaluate<Record<string, JsonValue> | null>(
            "window.__PAX_BENCH__.getTransitionDiagnosticCaptureState()",
        );
    const canvasApiAfterFrames = await client.evaluate<Record<string, JsonValue>>(
        canvasApiSummaryExpression,
    );
    const recorderSummary = await client.evaluate<Record<string, JsonValue>>(
        "window.__PAX_BENCH__.getTransitionRecorderSummary()",
    );
    const timeline = await client.evaluate<Array<Record<string, JsonValue>>>(
        `
            (async () => {
                const samples = [];
                for (let index = 0; index < 8; index += 1) {
                    samples.push({
                        sampleIndex: index,
                        state: await window.__PAX_BENCH__.getStateSummary(),
                        source: await window.__PAX_BENCH__.getStarState(${sourceIdLiteral}),
                        target: await window.__PAX_BENCH__.getStarState(${targetIdLiteral}),
                        sourceOrder: await window.__PAX_BENCH__.getOrderStatus(${sourceIdLiteral}),
                        captureState:
                            await window.__PAX_BENCH__.getTransitionDiagnosticCaptureState(),
                    });
                    await new Promise((resolve) => setTimeout(resolve, 150));
                }
                return samples;
            })()
        `,
    );
    return {
        ok: true,
        issued,
        sampleOrder,
        prep,
        frames,
        stateAfterFrames,
        sourceAfterFrames,
        targetAfterFrames,
        orderAfterFrames,
        captureStateAfterFrames,
        canvasApiAfterFrames,
        recorderSummary,
        timeline,
    };
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
    const timeoutMs = options?.timeoutMs ?? DEFAULT_SCENARIO_TIMEOUT_MS;
    console.log(JSON.stringify({ stage: "scenario_start", label }));
    if (CAPTURE_CPU) {
        await client.send("Profiler.enable");
        await client.send("Profiler.setSamplingInterval", { interval: 1000 });
        await client.send("Profiler.start");
    }
    const devtoolsMetricsBefore = await client.send("Performance.getMetrics");
    const scenarioStartedAt = Date.now();
    const scenarioEventCursor = await client.evaluate<number>(
        "window.__PAX_BENCH__.getPerfEventCursor()",
    );
    const runAction = async (): Promise<JsonValue> =>
        await Promise.race([
            (typeof action === "string"
                ? client.evaluate<JsonValue>(action)
                : action(client)),
            sleep(timeoutMs).then(() => {
                throw new Error(`Scenario timed out after ${timeoutMs}ms: ${label}`);
            }),
        ]);
    const traced = CAPTURE_TRACE
        ? await collectTraceDuring(client, runAction)
        : {
              actionResult: await runAction(),
              traceSummary: emptyTraceSummary(),
              rawTraceEvents: [] as any[],
          };
    const modeWait =
        options?.expectedMode == null
            ? null
            : await client.evaluate<Record<string, JsonValue>>(
                  `window.__PAX_BENCH__.waitForRenderMode(${JSON.stringify(options.expectedMode)}, 6000)`,
              );
    const profileResult = CAPTURE_CPU
        ? await client.send("Profiler.stop")
        : null;
    const snapshot = await client.evaluate<any>(
        "window.__PAX_BENCH__.snapshotPerfCapture()",
    );
    const stateSummary = await client.evaluate<any>(
        "window.__PAX_BENCH__.getStateSummary()",
    );
    const logFlags = await client.evaluate<Record<string, JsonValue>>(
        "window.__PAX_BENCH__.getLogFlags()",
    );
    const territoryScheduler = await client.evaluate<Record<string, JsonValue> | null>(
        "window.__PAX_BENCH__.getTerritorySchedulerSnapshot()",
    );
    const browserRuntime = await collectBrowserRuntimeStats(client);
    const devtoolsMetricsAfter = await client.send("Performance.getMetrics");
    const cpuHotspots = profileResult?.profile
        ? summarizeCpuProfile(profileResult.profile)
        : [];
    const screenshotBase64 = await captureScreenshotBase64(client);
    const screenshotPath = writeScenarioScreenshotArtifact(
        screenshotBase64,
        label,
    );
    const perfEventTailStartIndex =
        Number(snapshot?.events?.length ?? 0) < scenarioEventCursor
            ? 0
            : scenarioEventCursor;
    const perfEventTail = await client.evaluate<Array<Record<string, JsonValue>>>(
        `window.__PAX_BENCH__.getPerfEventsSince(${perfEventTailStartIndex}, 240)`,
    );
    if (
        options?.expectedMode &&
        (modeWait?.matches !== true ||
            stateSummary.renderMode !== options.expectedMode)
    ) {
        throw new Error(
            `Scenario ${label} expected renderMode=${options.expectedMode} but saw ${String(stateSummary.renderMode)} after ${String(modeWait?.attempts ?? 0)} attempts`,
        );
    }

    const actionResultRecord =
        typeof traced.actionResult === "object" &&
        traced.actionResult !== null &&
        !Array.isArray(traced.actionResult)
            ? (traced.actionResult as Record<string, JsonValue>)
            : null;
    const actionFailed = actionResultRecord?.ok === false;
    const result = {
        ok: !actionFailed,
        failureReason: actionFailed
            ? String(actionResultRecord?.reason ?? "action_result_failed")
            : null,
        label,
        startedAt: new Date(scenarioStartedAt).toISOString(),
        elapsedMs: Date.now() - scenarioStartedAt,
        actionResult: traced.actionResult,
        stateSummary,
        modeWait,
        requestedMode: options?.expectedMode ?? null,
        perf: summarizePerfSnapshot(
            snapshot,
            (traced.actionResult as Record<string, JsonValue> | null | undefined)
                ?.frames as Record<string, any> | null | undefined,
        ),
        trace: traced.traceSummary,
        traceFocusBuckets: summarizeFocusTraceBuckets(
            (traced.traceSummary.mainThreadTopByTotalMs ?? []) as Record<
                string,
                JsonValue
            >[],
        ),
        perfEventTail,
        logFlags,
        territoryScheduler: summarizeTerritorySchedulerSnapshot(
            territoryScheduler,
        ),
        browserRuntime,
        devtoolsMetrics: summarizeDevtoolsMetrics(devtoolsMetricsAfter),
        devtoolsMetricsDelta: summarizeDevtoolsMetricDelta(
            devtoolsMetricsBefore,
            devtoolsMetricsAfter,
        ),
        cpuHotspots,
        cpuFocusHotspots: summarizeFocusCpuHotspots(cpuHotspots),
        networkFailures: summarizeNetworkFailures(client),
        screenshotPath,
    };
    if (WRITE_TRACE_ARTIFACTS && CAPTURE_TRACE) {
        mkdirSync(TRACE_DIR, { recursive: true });
        const tracePath = path.join(
            TRACE_DIR,
            `${sanitizeLabelForPath(label)}.trace.json`,
        );
        writeFileSync(
            tracePath,
            JSON.stringify(
                {
                    label,
                    generatedAt: new Date().toISOString(),
                    traceEvents: traced.rawTraceEvents,
                },
                null,
                2,
            ),
            "utf8",
        );
        Object.assign(result, { traceArtifactPath: tracePath });
    }
    console.log(JSON.stringify({ stage: "scenario_done", label }));
    return result;
}

async function main(): Promise<void> {
    await cleanupStaleHarnessBrowsers("pax-bench-browser-");
    const appPort = await findAvailablePort(4173);
    const cdpPort = await findAvailablePort(9223);
    const appRootUrl = `http://${HOST}:${appPort}/`;
    const appUrl = `${appRootUrl}__bench`;
    const browserPath = resolveBrowserPath();
    const profileDir = mkdtempSync(path.join(tmpdir(), "pax-bench-browser-"));
    const devServer = Bun.spawn(
        [BUN_EXECUTABLE, "x", "vite", "dev", "--host", HOST, "--port", String(appPort)],
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
                bench.setPerfUserTimingEnabled(false);
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
        activeScenarioScreenshotDir = path.join(
            SCREENSHOT_DIR,
            sanitizeTimestampForPath(new Date().toISOString()),
        );

        const savedMapWait = await client.evaluate<Record<string, JsonValue>>(
            "window.__PAX_BENCH__.waitForSavedMaps(1, 8000)",
        );
        const savedMaps = (
            await client.evaluate<Array<Record<string, JsonValue>>>(
                "window.__PAX_BENCH__.listSavedMaps()",
            )
        ).map(normalizeSavedMapSummary);
        const benchmarkTarget = resolveBenchmarkMap(savedMaps);
        console.log(
            JSON.stringify({
                stage: "benchmark_target",
                savedMapWait,
                benchmarkTarget,
            }),
        );

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
                            frames: await window.__PAX_BENCH__.collectFrameStats(${MAIN_MENU_FRAME_MS}, ${FRAME_WARMUP_MS}),
                        };
                    })()
                `,
                {
                    timeoutMs: resolveScenarioTimeoutMs(
                        MAIN_MENU_FRAME_MS + FRAME_WARMUP_MS,
                    ),
                },
            );
        }
        for (const spec of TERRITORY_SCENARIO_SPECS) {
            const loadScenarioName = `${spec.scenarioKey}Load`;
            if (shouldRunScenario(loadScenarioName)) {
                scenarios[loadScenarioName] = await profileScenario(
                    client,
                    loadScenarioName,
                    `
                        (async () => {
                            ${buildScenarioPrepStatements(spec.mode, benchmarkTarget.resolvedMapName)}
                            return {
                                modePrep,
                                state: await window.__PAX_BENCH__.getStateSummary(),
                                frames: await window.__PAX_BENCH__.collectFrameStats(${LOAD_FRAME_MS}, ${FRAME_WARMUP_MS}),
                            };
                        })()
                    `,
                    {
                        expectedMode: spec.mode,
                        timeoutMs: resolveScenarioTimeoutMs(
                            LOAD_FRAME_MS + FRAME_WARMUP_MS,
                        ),
                    },
                );
            }

            const gameplayScenarioName = `${spec.scenarioKey}Gameplay`;
            if (shouldRunScenario(gameplayScenarioName)) {
                const gameplayPrepResult =
                    await client.evaluate<Record<string, JsonValue>>(
                        `
                            (async () => {
                                ${buildScenarioPrepStatements(spec.mode, benchmarkTarget.resolvedMapName, true)}
                                await new Promise((resolve) => setTimeout(resolve, 1200));
                                return {
                                    modePrep,
                                    gameplayPrep,
                                    preProfileState:
                                        await window.__PAX_BENCH__.getStateSummary(),
                                };
                            })()
                        `,
                    );
                scenarios[gameplayScenarioName] = await profileScenario(
                    client,
                    gameplayScenarioName,
                    async (scenarioClient) => {
                        const frames = await scenarioClient.evaluate<JsonValue>(
                            `
                                (async () => {
                                    window.__PAX_BENCH__.resetPerfCapture();
                                    return await window.__PAX_BENCH__.collectFrameStats(${GAMEPLAY_FRAME_MS}, ${FRAME_WARMUP_MS});
                                })()
                            `,
                        );
                        return {
                            ...gameplayPrepResult,
                            frames,
                        };
                    },
                    {
                        expectedMode: spec.mode,
                        timeoutMs: resolveScenarioTimeoutMs(
                            GAMEPLAY_FRAME_MS + FRAME_WARMUP_MS,
                            60_000,
                        ),
                    },
                );
            }

            const conquestDiagnosticScenarioName = `${spec.scenarioKey}ConquestDiagnostic`;
            if (shouldRunScenario(conquestDiagnosticScenarioName)) {
                scenarios[conquestDiagnosticScenarioName] = await profileScenario(
                    client,
                    conquestDiagnosticScenarioName,
                    async (scenarioClient) =>
                        await captureTransitionDiagnosticScenario(
                            scenarioClient,
                            spec.mode,
                            benchmarkTarget.resolvedMapName,
                        ),
                    {
                        expectedMode: spec.mode,
                        timeoutMs: 40_000,
                    },
                );
            }

            const conquestAnimationScenarioName = `${spec.scenarioKey}ConquestAnimation`;
            if (shouldRunScenario(conquestAnimationScenarioName)) {
                scenarios[conquestAnimationScenarioName] = await profileScenario(
                    client,
                    conquestAnimationScenarioName,
                    async (scenarioClient) =>
                        await captureConquestAnimationScenario(
                            scenarioClient,
                            spec.mode,
                            benchmarkTarget.resolvedMapName,
                        ),
                    {
                        expectedMode: spec.mode,
                        timeoutMs: resolveScenarioTimeoutMs(
                            GAMEPLAY_FRAME_MS,
                            40_000,
                        ),
                    },
                );
            }

            const ordersScenarioName = `${spec.scenarioKey}Orders`;
            if (shouldRunScenario(ordersScenarioName)) {
                scenarios[ordersScenarioName] = await profileScenario(
                    client,
                    ordersScenarioName,
                    async (scenarioClient) => {
                        await scenarioClient.evaluate(`
                            (async () => {
                                ${buildScenarioPrepStatements(spec.mode, benchmarkTarget.resolvedMapName, true)}
                                await new Promise((resolve) => setTimeout(resolve, 1200));
                                return { modePrep, gameplayPrep };
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
                        const frameWindow = await collectFrameStatsWithFreshPerfWindow(
                            scenarioClient,
                            ORDERS_FRAME_MS,
                            FRAME_WARMUP_MS,
                        );
                        return { pointerSamples, directSamples, ...frameWindow };
                    },
                    {
                        expectedMode: spec.mode,
                        timeoutMs: resolveScenarioTimeoutMs(
                            ORDERS_FRAME_MS + FRAME_WARMUP_MS,
                        ),
                    },
                );
            }

            const stressScenarioName = `${spec.scenarioKey}OrdersStress`;
            if (shouldRunScenario(stressScenarioName)) {
                scenarios[stressScenarioName] = await profileScenario(
                    client,
                    stressScenarioName,
                    async (scenarioClient) => {
                        await scenarioClient.evaluate(`
                            (async () => {
                                ${buildScenarioPrepStatements(spec.mode, benchmarkTarget.resolvedMapName, true)}
                                await new Promise((resolve) => setTimeout(resolve, 1200));
                                return { modePrep, gameplayPrep };
                            })()
                        `);
                        const pointerSamples = await executePointerOrderLoop(
                            scenarioClient,
                            3,
                            { hoverStress: true },
                        );
                        const directSamples = await executeDirectOrderLoop(
                            scenarioClient,
                            4,
                        );
                        const frameWindow = await collectFrameStatsWithFreshPerfWindow(
                            scenarioClient,
                            ORDERS_FRAME_MS,
                            FRAME_WARMUP_MS,
                        );
                        return { pointerSamples, directSamples, ...frameWindow };
                    },
                    {
                        expectedMode: spec.mode,
                        timeoutMs: resolveScenarioTimeoutMs(
                            ORDERS_FRAME_MS + FRAME_WARMUP_MS,
                        ),
                    },
                );
            }
        }

        const analysis = summarizeScenarioCollection(scenarios);
        const overallOk = Number(analysis.failedScenarioCount ?? 0) === 0;
        const results = {
            generatedAt: new Date().toISOString(),
            browserPath,
            appUrl,
            captureConfig: {
                trace: CAPTURE_TRACE,
                cpu: CAPTURE_CPU,
                traceArtifacts: WRITE_TRACE_ARTIFACTS,
                frameWarmupMs: FRAME_WARMUP_MS,
                mainMenuFrameMs: MAIN_MENU_FRAME_MS,
                loadFrameMs: LOAD_FRAME_MS,
                gameplayFrameMs: GAMEPLAY_FRAME_MS,
                ordersFrameMs: ORDERS_FRAME_MS,
            },
            savedMapWait,
            benchmarkTarget,
            savedMaps,
            ports: {
                appPort,
                cdpPort,
            },
            scenarioScreenshotDir: activeScenarioScreenshotDir,
            scenarios,
            analysis,
        };

        mkdirSync(METRICS_DIR, { recursive: true });
        const outputPath = path.join(
            METRICS_DIR,
            "browser-gameplay-benchmark-latest.json",
        );
        const timestampedOutputPath = path.join(
            METRICS_DIR,
            `browser-gameplay-benchmark-${sanitizeTimestampForPath(results.generatedAt)}.json`,
        );
        const serializedResults = JSON.stringify(results, null, 2);
        writeFileSync(outputPath, serializedResults, "utf8");
        writeFileSync(timestampedOutputPath, serializedResults, "utf8");
        console.log(
            JSON.stringify(
                {
                    ok: overallOk,
                    outputPath,
                    timestampedOutputPath,
                    results,
                },
                null,
                2,
            ),
        );
        if (!overallOk) {
            process.exitCode = 1;
        }
        client.close();
    } finally {
        activeScenarioScreenshotDir = null;
        browser.kill();
        devServer.kill();
        await Promise.allSettled([
            browser.exited,
            devServer.exited,
            killProcessTree(browser.pid),
            killProcessTree(devServer.pid),
        ]);
        await cleanupStaleHarnessDevServer(appPort);
        await sleep(1000);
        try {
            rmSync(profileDir, { recursive: true, force: true });
        } catch {}
    }
}

await main();
