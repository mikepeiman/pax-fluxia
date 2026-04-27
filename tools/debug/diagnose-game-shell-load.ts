import { Buffer } from "node:buffer";
import {
    closeSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    openSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { spawn as spawnChildProcess } from "node:child_process";
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

const ROOT = path.resolve(import.meta.dir, "..", "..");
const CLIENT_DIR = path.join(ROOT, "pax-fluxia");
const LOGS_DIR = path.join(ROOT, ".agent-harness", "logs");
const METRICS_DIR = path.join(ROOT, ".agent-harness", "metrics");
const HOST = "127.0.0.1";
const BUN_EXECUTABLE = process.execPath;
const DIAG_ROUTE = process.env.PAX_DIAG_ROUTE?.trim() || "/";
const DIAG_APP_URL = process.env.PAX_DIAG_APP_URL?.trim() || null;
const DIAG_TERRITORY_MODE =
    process.env.PAX_DIAG_TERRITORY_MODE?.trim() || null;
const DIAG_MAP_NAME = process.env.PAX_DIAG_MAP_NAME?.trim() || null;
const DEFAULT_DIAG_ACTION =
    DIAG_ROUTE === "/__bench" ? "openGameShell" : "clickLandingPlay";
const DIAG_ACTION = process.env.PAX_DIAG_ACTION?.trim() || DEFAULT_DIAG_ACTION;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function readTextTail(filePath: string, maxChars = 10_000): string | null {
    if (!existsSync(filePath)) return null;
    try {
        const content = readFileSync(filePath, "utf8");
        return content.slice(Math.max(0, content.length - maxChars));
    } catch (error) {
        return `Could not read log tail: ${error instanceof Error ? error.message : String(error)}`;
    }
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

function resolveBrowserPath(): string {
    const candidates = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ];
    const match = candidates.find((candidate) => existsSync(candidate));
    if (!match) {
        throw new Error("Could not find Edge or Chrome for CDP diagnostic run.");
    }
    return match;
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
            const response = await fetch(entryUrl);
            const html = await response.text();
            if (html.length > 0) return;
        } catch {}
        await sleep(250);
    }
    throw new Error("Timed out waiting for the Vite/SvelteKit client graph to become ready.");
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
                if (this.notifications.length > 400) {
                    this.notifications.splice(0, this.notifications.length - 400);
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
        const exception = result.exceptionDetails as
            | { text?: string; exception?: { description?: string } }
            | undefined;
        if (exception) {
            throw new Error(
                `Runtime.evaluate failed: ${exception.exception?.description ?? exception.text ?? "unknown"}`,
            );
        }
        return (result.result as { value?: T } | undefined)?.value as T;
    }

    getRecentNotifications(methods?: readonly string[]): CdpMessage[] {
        if (!methods || methods.length === 0) return [...this.notifications];
        return this.notifications.filter((message) =>
            methods.includes(String(message.method ?? "")),
        );
    }

    close(): void {
        this.socket.close();
    }
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
    throw new Error("Timed out waiting for window.__PAX_BENCH__.");
}

async function waitForDocumentReady(client: CdpClient, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const readyState = await client.evaluate<string>("document.readyState");
            if (readyState === "interactive" || readyState === "complete") return;
        } catch {}
        await sleep(250);
    }
    throw new Error("Timed out waiting for document ready state.");
}

async function waitForSelector(
    client: CdpClient,
    selector: string,
    timeoutMs: number,
): Promise<void> {
    const encodedSelector = JSON.stringify(selector);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const present = await client.evaluate<boolean>(
                `Boolean(document.querySelector(${encodedSelector}))`,
            );
            if (present) return;
        } catch {}
        await sleep(150);
    }
    throw new Error(`Timed out waiting for selector ${selector}`);
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

async function captureDomSummary(
    client: CdpClient,
): Promise<Record<string, JsonValue>> {
    return await client.evaluate<Record<string, JsonValue>>(
        `(() => ({
            readyState: document.readyState,
            href: window.location.href,
            title: document.title,
            bodyChildCount: document.body?.children.length ?? 0,
            bodyText: document.body ? document.body.innerText.slice(0, 1500) : "",
            bodyHtml: document.body ? document.body.innerHTML.slice(0, 5000) : "",
            appHtml: document.querySelector("#app")?.innerHTML?.slice(0, 5000) ?? "",
            gameShellDiag: window.__PAX_GAME_SHELL_DIAG__ ?? null,
            homeRouteDiagLog: window.__PAX_HOME_ROUTE_DIAG_LOG__ ?? null,
        }))()`,
    );
}

async function waitForHomeRouteStable(
    client: CdpClient,
    timeoutMs: number,
): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const state = await client.evaluate<{
                hasFatal500: boolean;
                hasPlayCta: boolean;
                homeRouteReady: boolean;
            }>(`(() => ({
                hasFatal500:
                    document.body?.innerText?.includes("500") &&
                    document.body?.innerText?.includes("Internal Error"),
                hasPlayCta: Boolean(
                    document.querySelector("button.btn--primary.btn--lg.btn--pulse") ||
                    Array.from(document.querySelectorAll("button")).some(
                        (button) => /play now/i.test(button.textContent ?? ""),
                    ),
                ),
                homeRouteReady: Boolean(window.__PAX_HOME_ROUTE_READY__),
            }))()`);
            if (state.hasPlayCta && state.homeRouteReady) return;
            if (state.hasFatal500) {
                await client.send("Page.reload", { ignoreCache: true });
                await waitForDocumentReady(client, 20_000);
            }
        } catch {}
        await sleep(500);
    }
    throw new Error("Timed out waiting for the landing page to stabilize.");
}

async function waitForGameShellInteractionSettle(
    client: CdpClient,
    timeoutMs: number,
): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const state = await client.evaluate<{
                showGame: boolean;
                isGameShellLoading: boolean;
                gameShellErrorMessage: string | null;
                hasGameContainerComponent: boolean;
            } | null>("window.__PAX_GAME_SHELL_DIAG__ ?? null");
            if (
                state &&
                (state.showGame ||
                    state.gameShellErrorMessage !== null ||
                    (!state.isGameShellLoading && state.hasGameContainerComponent))
            ) {
                return;
            }
        } catch {}
        await sleep(150);
    }
    throw new Error("Timed out waiting for the game shell interaction to settle.");
}

async function clickElement(
    client: CdpClient,
    selector: string,
): Promise<Record<string, JsonValue>> {
    const encodedSelector = JSON.stringify(selector);
    return await client.evaluate<Record<string, JsonValue>>(
        `(() => {
            const element = document.querySelector(${encodedSelector});
            if (!(element instanceof HTMLElement)) {
                return { ok: false, reason: "missing", selector: ${encodedSelector} };
            }
            const rect = element.getBoundingClientRect();
            element.click();
            return {
                ok: true,
                selector: ${encodedSelector},
                tagName: element.tagName,
                text: element.innerText ?? "",
                rect: {
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                },
            };
        })()`,
    );
}

async function clickButtonByText(
    client: CdpClient,
    buttonTextPattern: string,
): Promise<Record<string, JsonValue>> {
    const encodedPattern = JSON.stringify(buttonTextPattern);
    return await client.evaluate<Record<string, JsonValue>>(
        `(() => {
            const matcher = new RegExp(${encodedPattern}, "i");
            const element = Array.from(document.querySelectorAll("button")).find(
                (candidate) =>
                    candidate instanceof HTMLElement &&
                    matcher.test(candidate.innerText ?? candidate.textContent ?? ""),
            );
            if (!(element instanceof HTMLElement)) {
                return { ok: false, reason: "missing", buttonTextPattern: ${encodedPattern} };
            }
            const rect = element.getBoundingClientRect();
            element.click();
            return {
                ok: true,
                buttonTextPattern: ${encodedPattern},
                tagName: element.tagName,
                text: element.innerText ?? "",
                className: element.className ?? "",
                rect: {
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                },
            };
        })()`,
    );
}

async function waitForButtonByText(
    client: CdpClient,
    buttonTextPattern: string,
    timeoutMs: number,
): Promise<void> {
    const encodedPattern = JSON.stringify(buttonTextPattern);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const present = await client.evaluate<boolean>(
                `(() => {
                    const matcher = new RegExp(${encodedPattern}, "i");
                    return Array.from(document.querySelectorAll("button")).some(
                        (candidate) =>
                            candidate instanceof HTMLElement &&
                            matcher.test(candidate.innerText ?? candidate.textContent ?? ""),
                    );
                })()`,
            );
            if (present) return;
        } catch {}
        await sleep(150);
    }
    throw new Error(`Timed out waiting for button text ${buttonTextPattern}`);
}

async function waitForSinglePlayerMenuReady(
    client: CdpClient,
    timeoutMs: number,
): Promise<void> {
    await waitForButtonByText(
        client,
        "^(?:▶\\s*)?Start(?:\\s+Game)?$",
        timeoutMs,
    );
}

async function waitForGameplayViewReady(
    client: CdpClient,
    timeoutMs: number,
): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const state = await client.evaluate<{
                hasGameCanvas: boolean;
                hasPixiCanvas: boolean;
                hasCanvasArea: boolean;
            }>(`(() => ({
                hasGameCanvas: Boolean(document.querySelector(".game-canvas")),
                hasPixiCanvas: Boolean(document.querySelector(".game-canvas canvas")),
                hasCanvasArea: Boolean(document.querySelector(".area-canvas")),
            }))()`);
            if (state.hasGameCanvas && state.hasCanvasArea) {
                return;
            }
        } catch {}
        await sleep(150);
    }
    throw new Error("Timed out waiting for gameplay view to mount.");
}

async function runNormalRouteAction(
    client: CdpClient,
    action: string,
): Promise<Record<string, JsonValue>> {
    if (action === "openGameShell" || action === "clickLandingPlay") {
        await waitForHomeRouteStable(client, 45_000);
        const click = await clickElement(client, "button.btn--primary.btn--lg.btn--pulse");
        await waitForGameShellInteractionSettle(client, 45_000);
        const dom = await captureDomSummary(client);
        const screenshotBase64 = await captureScreenshotBase64(client);
        return {
            ok: true,
            action,
            click,
            ...dom,
            screenshotBase64,
        };
    }

    if (action === "captureHome") {
        const dom = await captureDomSummary(client);
        const screenshotBase64 = await captureScreenshotBase64(client);
        return {
            ok: true,
            action,
            ...dom,
            screenshotBase64,
        };
    }

    if (
        action === "clickLandingPlayAndStartGame" ||
        action === "clickLandingPlayAndStartSinglePlayer"
    ) {
        await waitForHomeRouteStable(client, 45_000);
        const landingClick = await clickElement(
            client,
            "button.btn--primary.btn--lg.btn--pulse",
        );
        await waitForGameShellInteractionSettle(client, 45_000);
        await waitForSinglePlayerMenuReady(client, 45_000);
        const startClick = await clickButtonByText(
            client,
            "^(?:▶\\s*)?Start(?:\\s+Game)?$",
        );
        await waitForGameplayViewReady(client, 45_000);
        await sleep(1_800);
        const dom = await captureDomSummary(client);
        const screenshotBase64 = await captureScreenshotBase64(client);
        return {
            ok: true,
            action,
            landingClick,
            startClick,
            ...dom,
            screenshotBase64,
        };
    }

    throw new Error(`Unknown normal-route DIAG_ACTION: ${action}`);
}

function writeScreenshotArtifact(
    screenshotBase64: string | null,
    outputPath: string,
): string | null {
    if (!screenshotBase64) return null;
    const screenshotPath = outputPath.replace(/\.json$/i, ".png");
    writeFileSync(screenshotPath, Buffer.from(screenshotBase64, "base64"));
    return screenshotPath;
}

function buildDiagOutputPath(): string {
    const territorySuffix = DIAG_TERRITORY_MODE
        ? `-${DIAG_TERRITORY_MODE.replace(/[^a-z0-9_-]+/gi, "-")}`
        : "";
    const mapSuffix = DIAG_MAP_NAME
        ? `-${DIAG_MAP_NAME.replace(/[^a-z0-9_-]+/gi, "-")}`
        : "";
    return path.join(
        METRICS_DIR,
        DIAG_ROUTE === "/__bench"
            ? `diagnose-${DIAG_ACTION}${territorySuffix}${mapSuffix}.json`
            : "diagnose-home-load.json",
    );
}

async function main(): Promise<void> {
    await cleanupStaleHarnessBrowsers("pax-shell-diagnose-");
    const cdpPort = await findAvailablePort(9400);
    const appPort = DIAG_APP_URL ? null : await findAvailablePort(4300);
    const appUrl = DIAG_APP_URL ?? `http://${HOST}:${appPort}${DIAG_ROUTE}`;
    const browserPath = resolveBrowserPath();
    const profileDir = mkdtempSync(path.join(tmpdir(), "pax-shell-diagnose-"));
    mkdirSync(LOGS_DIR, { recursive: true });
    const devServerStdoutPath = path.join(
        LOGS_DIR,
        "diagnose-game-shell-load-vite.out.log",
    );
    const devServerStderrPath = path.join(
        LOGS_DIR,
        "diagnose-game-shell-load-vite.err.log",
    );
    const devServerStdoutFd =
        appPort == null ? null : openSync(devServerStdoutPath, "w");
    const devServerStderrFd =
        appPort == null ? null : openSync(devServerStderrPath, "w");
    if (appPort != null) {
        writeFileSync(devServerStdoutPath, "", "utf8");
        writeFileSync(devServerStderrPath, "", "utf8");
    }
    const devServer =
        appPort == null
            ? null
            : spawnChildProcess(
                  BUN_EXECUTABLE,
                  [
                      "x",
                      "vite",
                      "dev",
                      "--host",
                      HOST,
                      "--port",
                      String(appPort),
                  ],
                  {
                      cwd: CLIENT_DIR,
                      env: {
                          ...process.env,
                          PAX_BENCH_NO_HMR: "1",
                          PAX_BENCH_STANDALONE: "1",
                      },
                      stdio: [
                          "ignore",
                          devServerStdoutFd ?? "ignore",
                          devServerStderrFd ?? "ignore",
                      ],
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
        await waitForDevAppReady(appUrl, 60_000);
        const targets = await waitForJson<any[]>(
            `http://${HOST}:${cdpPort}/json/list`,
            30_000,
        );
        const pageTarget = targets.find((target) => target.type === "page");
        if (!pageTarget?.webSocketDebuggerUrl) {
            throw new Error("Could not locate browser page target for CDP diagnostic run.");
        }
        const client = await CdpClient.connect(pageTarget.webSocketDebuggerUrl);
        await client.send("Page.enable");
        await client.send("Runtime.enable");
        await client.send("Log.enable");
        await client.send("Network.enable");
        await client.send("Page.navigate", { url: appUrl });
        await waitForDocumentReady(client, 45_000);
        await sleep(2200);

        let result: Record<string, JsonValue>;
        if (DIAG_ROUTE === "/__bench") {
            await waitForBenchBridge(client, 45_000);
            result = await client.evaluate<Record<string, JsonValue>>(
                `
                    (async () => {
                        const action = ${JSON.stringify(DIAG_ACTION)};
                        const territoryMode = ${JSON.stringify(DIAG_TERRITORY_MODE)};
                        const mapName = ${JSON.stringify(DIAG_MAP_NAME)};
                        try {
                            let actionResult = null;
                            let modePrep = null;
                            const prepareSinglePlayerGame = async () => {
                                if (mapName) {
                                    const loaded =
                                        await window.__PAX_BENCH__.loadSavedMapByName(
                                            mapName,
                                        );
                                    if (!loaded) {
                                        throw new Error(
                                            "Could not find saved map: " + mapName,
                                        );
                                    }
                                    return;
                                }
                                await window.__PAX_BENCH__.restartSinglePlayerGame();
                            };
                            if (territoryMode) {
                                modePrep =
                                    await window.__PAX_BENCH__.ensureTerritoryMode(
                                        territoryMode,
                                    );
                            }
                            if (action === "openGameShell") {
                                await window.__PAX_BENCH__.openGameShell();
                            } else if (action === "restartSinglePlayerGame") {
                                await prepareSinglePlayerGame();
                            } else if (action === "beginGameplay") {
                                await prepareSinglePlayerGame();
                                await window.__PAX_BENCH__.beginGameplay();
                            } else if (action === "beginGameplayAndSampleStartupFill") {
                                await prepareSinglePlayerGame();
                                await window.__PAX_BENCH__.beginGameplay();
                                const startupSamples = [];
                                for (let i = 0; i < 16; i += 1) {
                                    await new Promise((resolve) => setTimeout(resolve, 250));
                                    startupSamples.push({
                                        sampleIndex: i,
                                        state: await window.__PAX_BENCH__.getStateSummary(),
                                        territory: await window.__PAX_BENCH__.getTerritorySchedulerSnapshot(),
                                    });
                                }
                                actionResult = { startupSamples };
                            } else if (action === "beginGameplayAndIssueSampleOrder") {
                                await prepareSinglePlayerGame();
                                await window.__PAX_BENCH__.beginGameplay();
                                await new Promise((resolve) => setTimeout(resolve, 1200));
                                actionResult =
                                    await window.__PAX_BENCH__.issueSampleOrder();
                                await new Promise((resolve) => setTimeout(resolve, 1000));
                            } else if (
                                action ===
                                "beginGameplayIssueSampleOrderAndSampleShipMotion"
                            ) {
                                await prepareSinglePlayerGame();
                                await window.__PAX_BENCH__.beginGameplay();
                                await new Promise((resolve) => setTimeout(resolve, 1200));
                                window.__PAX_BENCH__.resetPerfCapture();
                                window.__PAX_BENCH__.enablePerfCapture();
                                const perfCursor =
                                    window.__PAX_BENCH__.getPerfEventCursor();
                                const issuedOrder =
                                    await window.__PAX_BENCH__.issueSampleOrder();
                                const shipMotionSamples = [];
                                for (let i = 0; i < 96; i += 1) {
                                    await new Promise((resolve) =>
                                        requestAnimationFrame(() => resolve()),
                                    );
                                    const territory =
                                        await window.__PAX_BENCH__.getTerritorySchedulerSnapshot();
                                    const firstTravelingShip =
                                        Array.isArray(
                                            territory?.travelingShipsSnapshot,
                                        ) &&
                                        territory.travelingShipsSnapshot.length > 0
                                            ? territory.travelingShipsSnapshot[0]
                                            : null;
                                    shipMotionSamples.push({
                                        sampleIndex: i,
                                        currentTick: territory?.currentTick ?? null,
                                        tickProgress: territory?.tickProgress ?? null,
                                        fxGameNowMs: territory?.fxGameNowMs ?? null,
                                        effectiveTickMs:
                                            territory?.effectiveTickMs ?? null,
                                        travelingShipCount:
                                            territory?.travelingShipCount ?? 0,
                                        totalVisualShips:
                                            territory?.totalVisualShips ?? 0,
                                        lastShipRenderCostMs:
                                            territory?.lastShipRenderCostMs ?? null,
                                        lastShipRenderPresentedAtMs:
                                            territory?.lastShipRenderPresentedAtMs ??
                                            null,
                                        shipRenderDeferralActive:
                                            territory?.shipRenderDeferralActive ??
                                            false,
                                        deferredShipRenderReason:
                                            territory?.deferredShipRenderReason ??
                                            "",
                                        shipRenderCadenceSkipCount:
                                            territory?.shipRenderCadenceSkipCount ??
                                            0,
                                        shipRenderYieldRescueCount:
                                            territory?.shipRenderYieldRescueCount ??
                                            0,
                                        lastShipRenderContext:
                                            territory?.lastShipRenderContext ?? "",
                                        lastShipRenderReason:
                                            territory?.lastShipRenderReason ?? "",
                                        browserInputPending:
                                            territory?.browserInputPending ?? false,
                                        renderFrameInputYieldCount:
                                            territory?.renderFrameInputYieldCount ??
                                            0,
                                        lastRenderFrameInputYieldStage:
                                            territory?.lastRenderFrameInputYieldStage ??
                                            "",
                                        lastRenderFrameInputYieldReason:
                                            territory?.lastRenderFrameInputYieldReason ??
                                            "",
                                        pendingInteractionVisualAckCount:
                                            territory?.pendingInteractionVisualAckCount ??
                                            0,
                                        queuedOrderMutations:
                                            territory?.queuedOrderMutations ?? 0,
                                        firstTravelingShip,
                                    });
                                }
                                const perfEvents =
                                    window.__PAX_BENCH__
                                        .getPerfEventsSince(perfCursor, 400)
                                        .filter((event) => {
                                            const name = String(
                                                event?.name ?? "",
                                            );
                                            return (
                                                name ===
                                                    "game.renderFrame.inputYield" ||
                                                name === "game.ships.defer.start" ||
                                                name === "game.ships.defer.stop"
                                            );
                                        });
                                window.__PAX_BENCH__.disablePerfCapture();
                                actionResult = {
                                    issuedOrder,
                                    shipMotionSamples,
                                    perfEvents,
                                };
                            } else {
                                throw new Error("Unknown DIAG_ACTION: " + action);
                            }
                            await new Promise((resolve) => setTimeout(resolve, 1800));
                            return {
                                ok: true,
                                action,
                                territoryMode,
                                mapName,
                                modePrep,
                                actionResult,
                                frames: await window.__PAX_BENCH__.collectFrameStats(1200),
                                state: await window.__PAX_BENCH__.getStateSummary(),
                                bodyChildCount: document.body?.children.length ?? 0,
                                bodyText: document.body ? document.body.innerText.slice(0, 1000) : "",
                                bodyHtml: document.body ? document.body.innerHTML.slice(0, 2000) : "",
                                screenshotBase64: null,
                            };
                        } catch (error) {
                            const typed = error;
                            return {
                                ok: false,
                                action,
                                territoryMode,
                                mapName,
                                name: typed?.name ?? null,
                                message: typed?.message ?? String(typed),
                                stack: typed?.stack ?? null,
                                cause: typed?.cause ?? null,
                                readyState: document.readyState,
                                href: window.location.href,
                                bodyChildCount: document.body?.children.length ?? 0,
                                bodyText: document.body ? document.body.innerText.slice(0, 1000) : "",
                                bodyHtml: document.body ? document.body.innerHTML.slice(0, 2000) : "",
                            };
                        }
                    })()
                `,
            );
        } else {
            result = await runNormalRouteAction(client, DIAG_ACTION);
        }

        const benchScreenshotBase64 =
            DIAG_ROUTE === "/__bench"
                ? await captureScreenshotBase64(client)
                : null;
        if (benchScreenshotBase64) {
            result = {
                ...result,
                screenshotBase64: benchScreenshotBase64,
            };
        }

        const notifications = client.getRecentNotifications([
            "Runtime.consoleAPICalled",
            "Runtime.exceptionThrown",
            "Log.entryAdded",
            "Network.loadingFailed",
        ]);
        mkdirSync(METRICS_DIR, { recursive: true });
        const outputPath = buildDiagOutputPath();
        const screenshotBase64 =
            typeof result.screenshotBase64 === "string"
                ? result.screenshotBase64
                : null;
        const screenshotPath = writeScreenshotArtifact(
            screenshotBase64,
            outputPath,
        );
        if (screenshotPath) {
            result = {
                ...result,
                screenshotPath,
                screenshotBase64ByteLength: screenshotBase64?.length ?? 0,
                screenshotBase64: undefined,
            };
        }
        const payload = {
            generatedAt: new Date().toISOString(),
            appUrl,
            diagRoute: DIAG_ROUTE,
            diagAction: DIAG_ACTION,
            result,
            notifications,
            devServerLogs:
                appPort == null
                    ? null
                    : {
                          stdoutPath: devServerStdoutPath,
                          stderrPath: devServerStderrPath,
                          stdoutTail: readTextTail(devServerStdoutPath),
                          stderrTail: readTextTail(devServerStderrPath),
                      },
        };
        writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf8");
        console.log(JSON.stringify({ ok: true, outputPath }, null, 2));
        client.close();
    } finally {
        browser.kill();
        devServer?.kill();
        await Promise.allSettled([
            browser.exited,
            killProcessTree(browser.pid),
            devServer
                ? new Promise<void>((resolve) => {
                      devServer.once("exit", () => resolve());
                      setTimeout(resolve, 1000);
                  })
                : Promise.resolve(),
            killProcessTree(devServer?.pid),
        ]);
        if (appPort != null) {
            await cleanupStaleHarnessDevServer(appPort);
        }
        await sleep(500);
        if (devServerStdoutFd != null) {
            closeSync(devServerStdoutFd);
        }
        if (devServerStderrFd != null) {
            closeSync(devServerStderrFd);
        }
        try {
            rmSync(profileDir, { recursive: true, force: true });
        } catch {}
    }
}

await main();
