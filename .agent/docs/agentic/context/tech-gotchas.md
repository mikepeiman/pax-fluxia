# Technical Gotchas — Deep Dive

Specific technical traps encountered in this project. Reference when working in the relevant area.

---

## Colyseus Module Resolution (Bun/Docker)

**Problem**: Bun's content-addressable `node_modules` can resolve `@colyseus/core` as two separate module instances when `@colyseus/ws-transport` is explicitly imported.

**Symptom**: "seat reservation expired" (4002) errors. Rooms are created in one `matchMaker` singleton's map but looked up in another.

**Fix**: Never explicitly import `WebSocketTransport`. Let `Server` create transport internally:
```typescript
// ✅ CORRECT
import { Server } from "colyseus";
const gameServer = new Server({
    express: (app) => { /* middleware */ },
});

// ❌ WRONG — causes dual module instances
import { WebSocketTransport } from "@colyseus/ws-transport";
```

**Confirmed**: 2026-02-14, Northflank Docker deployment.

---

## Colyseus Schema Decorators (tsx/esbuild)

**Problem**: `@type()` decorators are not handled consistently between tsx/esbuild and the Colyseus library.

**Fix**: Use `defineTypes()` calls instead of `@type` decorators:
```typescript
// ✅ CORRECT
class StarSchema extends Schema {
    ownerId: string = "";
    ships: number = 0;
}
defineTypes(StarSchema, { ownerId: "string", ships: "number" });

// ❌ AVOID — decorator handling varies by build tool
class StarSchema extends Schema {
    @type("string") ownerId: string = "";
    @type("number") ships: number = 0;
}
```

---

## PowerShell Syntax

**No chaining operators**: PowerShell does not support `&&` or `||` for command chaining.

```powershell
# ❌ WRONG — PowerShell doesn't support &&
cd foo && npm run build

# ✅ CORRECT — separate commands or use semicolons
Set-Location foo; npm run build
# Or just run as separate commands
```

**No `cd` commands in tool calls**: Always use the `Cwd` parameter on `run_command` instead.

---

## Bun Quirks

### Package Manager Exclusivity
Never mix `npm`, `npx`, or `yarn` with Bun:

| Wrong | Correct |
|-------|---------|
| `npm install` | `bun install` |
| `npm run build` | `bun run build` |
| `npx tsc` | `bunx tsc` |

Mixing causes `node_modules` structure mismatches and phantom resolution bugs.

### Bun + Node Runtime
Server runs on Node.js (for Colyseus compatibility), but Bun is the package manager. This means:
- `bun install` to manage deps
- `node` (or `tsx`) to run the server
- `bun run dev` to start the Vite dev server (client)

---

## GAME_CONFIG Reactivity (Svelte 5)

**Problem**: `GAME_CONFIG` is a plain JavaScript object. Svelte 5's `$state` rune does NOT make it reactive. Sliders showing GAME_CONFIG values will display stale data.

**Fix**: Always use a `$state` mirror alongside GAME_CONFIG:
```typescript
let animValues = $state<Record<string, number>>({});

function setAnimValue(key: string, val: number) {
    (GAME_CONFIG as any)[key] = val;               // Engine
    animValues = { ...animValues, [key]: val };     // Reactivity
}
```

All programmatic changes (lock/pin, recalculation, theme load) must update BOTH sources.

---

## CSS `clip-path` on Mobile

`clip-path` can cause overflow issues on mobile browsers. Remove on mobile breakpoints. Use real backgrounds or SVG masks instead.

---

## Pseudo-element z-index Limitation

`::before` and `::after` pseudo-elements with `z-index` CANNOT layer above positioned children. Use real DOM elements or background properties instead.
