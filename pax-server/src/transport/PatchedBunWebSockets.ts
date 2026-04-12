import "bun";
import express from "express";
import EventEmitter from "events";
import type { ServerWebSocket } from "bun";
import type { Application } from "express";
import {
    ClientState,
    CloseCode,
    Protocol,
    Transport,
    connectClientToRoom,
    debugAndPrintError,
    getBearerToken,
    getMessageBytes,
    logger,
    matchMaker,
    spliceOne,
} from "@colyseus/core";
import { debugMessage } from "@colyseus/core";

type BunSocket = ServerWebSocket<any>;

class WebSocketWrapper extends EventEmitter {
    constructor(public ws: BunSocket) {
        super();
    }
}

class WebSocketClient {
    public state = ClientState.JOINING;
    public id: string;
    public sessionId: string;
    public ref: WebSocketWrapper;
    private _enqueuedMessages: Uint8Array[] = [];
    private _afterNextPatchQueue: Array<[WebSocketClient, [Uint8Array]]> = [];

    constructor(id: string, ref: WebSocketWrapper) {
        this.id = this.sessionId = id;
        this.ref = ref;
    }

    sendBytes(type: number | string, bytes: Uint8Array, options?: { afterNextPatch?: boolean }) {
        debugMessage("send bytes(to %s): '%s' -> %j", this.sessionId, type, bytes);
        this.enqueueRaw(
            getMessageBytes.raw(Protocol.ROOM_DATA_BYTES, type, undefined, bytes),
            options,
        );
    }

    send(messageOrType: number | string, messageOrOptions?: unknown, options?: { afterNextPatch?: boolean }) {
        debugMessage("send(to %s): '%s' -> %j", this.sessionId, messageOrType, messageOrOptions);
        this.enqueueRaw(
            getMessageBytes.raw(Protocol.ROOM_DATA, messageOrType, messageOrOptions),
            options,
        );
    }

    enqueueRaw(data: Uint8Array, options?: { afterNextPatch?: boolean }) {
        if (options?.afterNextPatch) {
            this._afterNextPatchQueue.push([this, [data]]);
            return;
        }
        if (this.state === ClientState.JOINING) {
            this._enqueuedMessages.push(data);
            return;
        }
        this.raw(data);
    }

    raw(data: Uint8Array) {
        if (this.ref.ws.readyState !== WebSocket.OPEN) return;
        this.ref.ws.send(data);
    }

    error(code: number, message = "", cb?: () => void) {
        this.raw(getMessageBytes[Protocol.ERROR](code, message));
        if (cb) setTimeout(cb, 1);
    }

    get readyState() {
        return this.ref.ws.readyState;
    }

    leave(code?: number) {
        this.ref.ws.close(code);
    }

    close(code?: number) {
        logger.warn("DEPRECATION WARNING: use client.leave() instead of client.close()");
        this.leave(code);
    }

    toJSON() {
        return { sessionId: this.sessionId, readyState: this.readyState };
    }
}

export class PatchedBunWebSockets extends Transport {
    private clients: BunSocket[] = [];
    private clientWrappers = new WeakMap<BunSocket, WebSocketWrapper>();
    private _expressApp?: Application;
    private _router?: { handler: (req: Request) => Promise<Response> };
    private _server?: ReturnType<typeof Bun.serve>;

    constructor(private options: Record<string, unknown> = {}) {
        super();
    }

    getExpressApp(): Application {
        if (!this._expressApp) {
            this._expressApp = express();
        }
        return this._expressApp;
    }

    bindRouter(router: { handler: (req: Request) => Promise<Response> }) {
        this._router = router;
    }

    listen(port: number, hostname?: string, backlog?: number, listeningListener?: () => void) {
        const self = this;
        this._server = Bun.serve({
            port,
            hostname,
            async fetch(req, server) {
                const url = new URL(req.url);
                if (server.upgrade(req, {
                    data: {
                        pathname: url.pathname,
                        searchParams: url.searchParams,
                        headers: req.headers,
                        remoteAddress: server.requestIP(req)?.address || "unknown",
                    },
                })) {
                    return;
                }

                if (self._router) {
                    try {
                        const corsHeaders = {
                            ...matchMaker.controller.DEFAULT_CORS_HEADERS,
                            ...matchMaker.controller.getCorsHeaders(req.headers),
                        };
                        if (req.method === "OPTIONS") {
                            return new Response(null, { status: 204, headers: corsHeaders });
                        }
                        const response = await self._router.handler(req);
                        const headers = new Headers(response.headers);
                        Object.entries(corsHeaders).forEach(([key, value]) => {
                            if (!headers.has(key)) headers.set(key, value.toString());
                        });
                        return new Response(response.body, {
                            status: response.status,
                            statusText: response.statusText,
                            headers,
                        });
                    } catch (error) {
                        debugAndPrintError(error as Error);
                        const err = error as { code?: number; message?: string };
                        return new Response(JSON.stringify({
                            code: err.code,
                            error: err.message,
                        }), {
                            status: 500,
                            headers: { "Content-Type": "application/json" },
                        });
                    }
                }

                if (self._expressApp) {
                    console.warn("Express integration not yet implemented for PatchedBunWebSockets");
                }
                return new Response("Not Found", { status: 404 });
            },
            websocket: {
                ...this.options,
                async open(ws) {
                    await self.onConnection(ws);
                },
                message(ws, message) {
                    self.clientWrappers.get(ws)?.emit("message", message);
                },
                close(ws, code) {
                    spliceOne(self.clients, self.clients.indexOf(ws));
                    const clientWrapper = self.clientWrappers.get(ws);
                    if (clientWrapper) {
                        self.clientWrappers.delete(ws);
                        clientWrapper.emit("close", code);
                    }
                },
            },
        });
        listeningListener?.();
        return this;
    }

    shutdown() {
        this._server?.stop();
    }

    simulateLatency(milliseconds: number) {
        void milliseconds;
    }

    private async onConnection(rawClient: BunSocket) {
        const wrapper = new WebSocketWrapper(rawClient);
        this.clients.push(rawClient);
        this.clientWrappers.set(rawClient, wrapper);

        const pathname = String((rawClient.data as { pathname?: string }).pathname ?? "");
        const searchParams = (rawClient.data as { searchParams: URLSearchParams }).searchParams;
        const sessionId = searchParams.get("sessionId");
        const match = pathname.match(/^\/([a-zA-Z0-9_\-]+)\/([a-zA-Z0-9_\-]+)$/);
        const roomId = match?.[2];

        if (!sessionId && !roomId) {
            const timeout = setTimeout(() => rawClient.close(CloseCode.NORMAL_CLOSURE), 1000);
            wrapper.on("message", () => rawClient.send(new Uint8Array([Protocol.PING])));
            wrapper.on("close", () => clearTimeout(timeout));
            return;
        }

        const room = roomId ? matchMaker.getLocalRoomById(roomId) : undefined;
        const client = new WebSocketClient(sessionId ?? "", wrapper);
        const reconnectionToken = searchParams.get("reconnectionToken");
        const skipHandshake = searchParams.has("skipHandshake");

        try {
            const headers = (rawClient.data as { headers: Headers }).headers;
            const authHeader = headers.get("authorization") ?? "";
            await connectClientToRoom(room, client as never, {
                token: searchParams.get("_authToken") ?? getBearerToken(authHeader),
                headers,
                ip:
                    headers.get("x-real-ip")
                    ?? headers.get("x-forwarded-for")
                    ?? String((rawClient.data as { remoteAddress?: string }).remoteAddress ?? "unknown"),
            }, {
                reconnectionToken: reconnectionToken ?? undefined,
                skipHandshake,
            });
        } catch (error) {
            debugAndPrintError(error as Error);
            const err = error as { code: number; message: string };
            client.error(err.code, err.message, () => {
                rawClient.close(reconnectionToken ? CloseCode.MAY_TRY_RECONNECT : CloseCode.WITH_ERROR);
            });
        }
    }
}
