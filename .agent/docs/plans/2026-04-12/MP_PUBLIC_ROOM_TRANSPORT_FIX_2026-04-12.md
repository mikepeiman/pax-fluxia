# MP Public Room Transport Fix - 2026-04-12

## Summary

The missing public room and recurring `seat reservation expired` failures were caused by a bug in the published Bun Colyseus transport, not by Pax room creation logic.

The server was successfully creating the persistent public room, but websocket room-connect requests were being rejected after reservation.

## Root Cause

Published package inspected:

- `node_modules/.bun/@colyseus+bun-websockets@0.17.7+18a04518d07c7376/node_modules/@colyseus/bun-websockets/build/BunWebSockets.mjs`

Problem behavior:

- transport stored websocket route as `pathname + search`
- room-id extraction regex ran against that combined string
- `?sessionId=...` prevented the room-id regex from matching
- `matchMaker.getLocalRoomById(roomId)` received `undefined`
- `connectClientToRoom()` failed with `seat reservation expired`

## Fix

Added a local transport:

- `pax-server/src/transport/PatchedBunWebSockets.ts`

The patched transport:

- parses room id from `pathname` only
- keeps `searchParams` separate
- uses `@colyseus/core` directly so transport and server share the same core singleton

Server entry points now use the patched transport:

- `pax-server/src/index.ts`
- `pax-server/src/prod.ts`

Room imports were aligned to `@colyseus/core`:

- `pax-server/src/rooms/GameRoom.ts`
- `pax-server/src/rooms/TestRoom.ts`

## Validation I Ran

### Compile

- `bunx tsc -p C:\Users\mikep\Desktop\WebDev\pax-fluxia\pax-server\tsconfig.json --noEmit --pretty false`
- result: passed

### Server startup

- killed stale listener on port `2567`
- started clean server on `2567`
- confirmed startup log:
  - `Pax Fluxia Server running on port 2567`
  - `Persistent public room ready: PJH0hb2-c`

### SDK proof

Using the real `@colyseus/sdk` from the client package:

1. `joinOrCreate("lobby")`
   - passed
2. received `rooms` listing
   - contained the persistent public room
3. `create("game_room", ...)`
   - passed
4. `joinById(publicRoom.roomId, ...)`
   - passed

Observed public-room metadata included:

- `isPublicAnchor: true`
- `publicRoomLabel: "Public Room"`
- `phase: "lobby"`

## Conclusion

As of this fix:

- persistent public room exists
- lobby join works
- room creation works
- joining the public room works
- the prior `seat reservation expired` failure is resolved for the tested local dev path on port `2567`
