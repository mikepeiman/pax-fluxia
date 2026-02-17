# Colyseus 4002 "Seat Reservation Expired" — Investigation Report

**Date**: 2026-02-14
**Status**: ✅ RESOLVED — dual `@colyseus/core` module instances from explicit WebSocketTransport import
**Environment**: Northflank (Docker, Node.js runtime)

---

## The Problem

When deploying to Northflank, creating a multiplayer room fails with error 4002 — `"seat reservation expired"`. The error occurs **~86-96ms** after the seat is reserved, far too fast for an actual timeout (default is 15 seconds). Local development with Bun works fine.

## Architecture

- **Server**: `pax-server` running `prod.ts` via Node.js + `tsx` in Docker
- **Client**: `pax-fluxia` (SvelteKit) with `@colyseus/sdk`
- **Transport**: `@colyseus/ws-transport` (ws library)
- **Hosting**: Northflank (reverse proxy → Docker container)

## The Connection Flow (traced through source code)

1. Client POST `/matchmake/create/game_room` → Colyseus matchmaker creates room
2. Matchmaker calls `room._reserveSeat(sessionId)` → stores in `room._reservedSeats[sessionId]`
3. Matchmaker returns `{ processId, roomId, sessionId }` to client
4. Client opens WebSocket to `wss://host/<processId>/<roomId>?sessionId=<sid>`
5. `ws` library receives HTTP upgrade, completes it, emits `connection` event
6. `onConnection(rawClient, req)` in `WebSocketTransport.mjs` fires
7. Parses `req.url` → extracts `roomId` and `sessionId`
8. Calls `matchMaker.getLocalRoomById(roomId)` → finds the room
9. Creates `new WebSocketClient(sessionId, rawClient)`
10. Calls `connectClientToRoom(room, client, authContext, connectionOptions)`
11. `connectClientToRoom` checks `room.hasReservedSeat(client.sessionId, connectionOptions.reconnectionToken)`
12. **This check fails → throws "seat reservation expired"**

## What Has Been Ruled Out

| Hypothesis | Status | Evidence |
|---|---|---|
| Runtime incompatibility (Bun) | ❌ Ruled out | Switched to Node.js, same error |
| Wrong URL / roomId / sessionId | ❌ Ruled out | Diagnostic logs show all values match |
| Room not found locally | ❌ Ruled out | `getLocalRoomById(roomId)` returns room (`roomFound=true`) |
| Seat not reserved | ❌ Ruled out | `seats=["nNsqjsMRd"]` confirms seat in `_reservedSeats` |
| `hasReservedSeat` returns false | ❌ Ruled out at upgrade time | Diagnostic at `upgrade` event shows `hasReservedSeat=true` |
| processId mismatch | ❌ Ruled out | URL processId matches `serverPid` |
| publicAddress redirect | ❌ Ruled out | `getDefaultPublicAddress()` returns `undefined` on non-Cloud |
| Package version mismatch | ❌ Didn't fix it | Updated `@colyseus/sdk` 0.17.26 → 0.17.33, error persists |
| Actual timeout | ❌ Ruled out | Error at 96ms, timeout is 15s |
| Express 5 incompatibility | ❓ Not fully ruled out | Colyseus router uses `@colyseus/better-call` with Web API Response |

## The Paradox (Key Finding)

Diagnostic log from latest deploy:

```
WS-Diag url=/QnRUkcpeK/aSJNGnax5?sessionId=nNsqjsMRd
  pid=QnRUkcpeK rid=aSJNGnax5 sid=nNsqjsMRd
  roomFound=true seats=["nNsqjsMRd"] hasReserved=true
  serverPid=QnRUkcpeK
```

**Everything checks out** — yet `connectClientToRoom` throws the error in the same millisecond. The diagnostic runs at the `upgrade` event (before ws completes the upgrade). The error fires in the `connection` event (after ws completes the upgrade). Something changes the state between these two events, OR the code path inside `onConnection` produces different results despite the same inputs.

## Changes Made During Investigation

| Change | File | Effect |
|---|---|---|
| Switched Docker runtime to Node.js | `Dockerfile` | No fix, but needed for ws-transport compatibility |
| Simplified `prod.ts` to mirror `index.ts` | `pax-server/src/prod.ts` | Removed custom httpServer, diagnostic listeners that crashed |
| Fixed deprecated `setSeatReservationTime` | `pax-server/src/rooms/GameRoom.ts` | Changed to `this.seatReservationTimeout = 30` |
| Updated SDK to 0.17.33 | `pax-fluxia/package.json` | No fix |
| Added semver `^` to server packages | `pax-server/package.json` | No fix |
| Added diagnostic `onConnection` wrapper | `pax-server/src/prod.ts` | Pending test results |

## Current Package Versions

| Package | Version |
|---|---|
| `colyseus` (meta) | 0.17.8 |
| `@colyseus/core` (local) | 0.17.29 |
| `@colyseus/core` (Docker) | **0.17.33** |
| `@colyseus/ws-transport` | 0.17.9 |
| `@colyseus/shared-types` | 0.17.5 |
| `@colyseus/sdk` (client) | 0.17.33 |
| `express` | ^5.0.0 |

## Unexplored Angles

1. **Express 5 + Colyseus router interaction** — `bindRouterToTransport` does `server.removeListener("request", expressApp)` then `server.prependListener("request", corsHandler)`. Express 5 behavioral differences could affect this.
2. **`@colyseus/better-call` routing** — Matchmaker HTTP routes use a custom router with Web API `Request`/`Response` objects. If the POST response is malformed, the client SDK could build a wrong WS connection.
3. **Double connection / race condition** — Something could consume the seat between `upgrade` and `connection` events (though only one WS-Diag log line appears per attempt).
4. **Local vs Docker version discrepancy** — Local `@colyseus/core` is 0.17.29, Docker resolves to 0.17.33. `connectClientToRoom` is confirmed identical, but `hasReservedSeat` in `Room.mjs` may differ between versions.

## Key Source Files

- **Server entry**: [`prod.ts`](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-server/src/prod.ts)
- **Room**: [`GameRoom.ts`](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-server/src/rooms/GameRoom.ts)
- **Client connection**: [`multiplayerStore.svelte.ts`](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/stores/multiplayerStore.svelte.ts)
- **Colyseus internals (traced)**:
  - `@colyseus/core/build/Transport.mjs` — `connectClientToRoom()`
  - `@colyseus/core/build/Room.mjs` — `hasReservedSeat()`, `_reservedSeats`
  - `@colyseus/core/build/MatchMaker.mjs` — `getLocalRoomById()`, `reserveSeatFor()`
  - `@colyseus/ws-transport/build/WebSocketTransport.mjs` — `onConnection()`
  - `@colyseus/core/build/router/index.mjs` — `bindRouterToTransport()`

## Latest Pending Diagnostic

A new `onConnection` wrapper was pushed that intercepts the `connection` event (same timing as the actual handler) and logs:
- `hasReserved` and `hasReservedWithToken` 
- `reconnectionToken` value
- Raw `seatDetail` tuple from `_reservedSeats[sessionId]`

This should reveal whether `hasReservedSeat` returns differently when called from the `connection` event vs the `upgrade` event.
