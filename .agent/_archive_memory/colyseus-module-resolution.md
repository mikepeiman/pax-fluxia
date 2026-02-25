# Colyseus Module Resolution — Bun/Docker

## CRITICAL: Never explicitly import @colyseus/ws-transport in server entry points

When using bun as the package manager (even if Node.js is the runtime), **do NOT** explicitly import `WebSocketTransport` from `@colyseus/ws-transport`.

### Why

Bun's content-addressable `node_modules` can resolve `@colyseus/core` as **two separate module instances**:
1. One for your server code (via `colyseus` meta-package)
2. One for `@colyseus/ws-transport`'s dependency

Each instance gets its own `matchMaker` singleton with its own `rooms` map. Rooms are created in one map but looked up in the other → "seat reservation expired" (4002).

### Correct Pattern

```typescript
// ✅ DO THIS — let Server create transport internally
import { Server } from "colyseus";
const gameServer = new Server({
    express: (app) => { /* your middleware */ },
});

// ❌ NEVER DO THIS
import { WebSocketTransport } from "@colyseus/ws-transport";
const gameServer = new Server({
    transport: new WebSocketTransport({}),
});
```

### Resolution Date
2026-02-14 — Confirmed fix for Northflank Docker deployment.
