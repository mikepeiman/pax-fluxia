import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
const METRICS_DIR = path.join(ROOT, ".agent-harness", "metrics");
const HOST = "127.0.0.1";
const DIAG_ROUTE = process.env.PAX_DIAG_ROUTE?.trim() || "/";
const DIAG_ACTION = process.env.PAX_DIAG_ACTION?.trim() || "openGameShell";
const DIAG_APP_URL = process.env.PAX_DIAG_APP_URL?.trim() || null;

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
    await waitForButtonByText(client, "^Start Game$", timeoutMs);
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
    if (action === "clickLandingPlay") {
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
        const startClick = await clickButtonByText(client, "^Start Game$");
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

async function main(): Promise<void> {
    await cleanupStaleHarnessBrowsers("pax-shell-diagnose-");
    const cdpPort = await findAvailablePort(9400);
    const appPort = DIAG_APP_URL ? null : await findAvailablePort(4300);
    const appUrl = DIAG_APP_URL ?? `http://${HOST}:${appPort}${DIAG_ROUTE}`;
    const browserPath = resolveBrowserPath();
    const profileDir = mkdtempSync(path.join(tmpdir(), "pax-shell-diagnose-"));
    const devServer =
        appPort == null
            ? null
            : Bun.spawn(
                  [
                      "cmd.exe",
                      "/c",
                      "bunx",
                      "vite",
                      "dev",
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
                        try {
                            const action = ${JSON.stringify(DIAG_ACTION)};
                            let actionResult = null;
                            if (action === "openGameShell") {
                                await window.__PAX_BENCH__.openGameShell();
                            } else if (action === "restartSinglePlayerGame") {
                                await window.__PAX_BENCH__.restartSinglePlayerGame();
                            } else if (action === "beginGameplay") {
                                await window.__PAX_BENCH__.restartSinglePlayerGame();
                                await window.__PAX_BENCH__.beginGameplay();
                            } else {
                                throw new Error("Unknown DIAG_ACTION: " + action);
                            }
                            await new Promise((resolve) => setTimeout(resolve, 1800));
                            return {
                                ok: true,
                                action,
                                actionResult,
                                frames: await window.__PAX_BENCH__.collectFrameStats(1200),
                                state: await window.__PAX_BENCH__.getStateSummary(),
                                bodyChildCount: document.body?.children.length ?? 0,
                                bodyText: document.body ? document.body.innerText.slice(0, 1000) : "",
                                bodyHtml: document.body ? document.body.innerHTML.slice(0, 2000) : "",
                            };
                        } catch (error) {
                            const typed = error;
                            return {
                                ok: false,
                                action,
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

        const notifications = client.getRecentNotifications([
            "Runtime.consoleAPICalled",
            "Runtime.exceptionThrown",
            "Log.entryAdded",
            "Network.loadingFailed",
        ]);

        const payload = {
            generatedAt: new Date().toISOString(),
            appUrl,
            result,
            notifications,
        };
        mkdirSync(METRICS_DIR, { recursive: true });
        const outputPath = path.join(
            METRICS_DIR,
            DIAG_ROUTE === "/__bench"
                ? `diagnose-${DIAG_ACTION}.json`
                : "diagnose-home-load.json",
        );
        writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf8");
        console.log(JSON.stringify({ ok: true, outputPath }, null, 2));
        client.close();
    } finally {
        browser.kill();
        devServer?.kill();
        await sleep(500);
        try {
            rmSync(profileDir, { recursive: true, force: true });
        } catch {}
    }
}

await main();
