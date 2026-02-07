# Engine Convergence Directive

## Status: APPROVED — Option C targeting Option A

## Problem: "Split Brain"
- Client has the *Game Design Truth* (features, math, feel)
- Shared Engine has the *Architectural Truth* (stateless, static, schema-ready)
- Risk: MP client predicts different values than server → desyncs, snapping, false cheat flags

## Strategy: "Interface-Driven Refactor"

### Step 1: Abstract Data Layer
- Create `IStar`, `IFleet`, `IGameState` interfaces in `@pax/common`
- Both client local classes AND server Schema classes implement these
- Add missing fields to Schema (e.g., `productionOverflow` to `StarSchema`)

### Step 2: Port Logic to Stateless Functions
- Take rich logic from client `GameEngine.ts`
- Rewrite as static functions in `@pax/common` accepting interfaces
- Example: `this.calculateProduction()` → `GameEngine.calculateProduction(star: IStar)`

### Step 3: Incremental Migration
- **Phase 1: Math Parity** — Production & Repair formulas (most desyncs)
- **Phase 2: Combat & Capture** — Conquest/retreat logic
- **Phase 3: Cleanup** — Strip logic from client engine, delegate to shared

## Constraints
- Server remains authoritative
- Logic remains stateless (pass state in, get mutation out)
- NEVER delete client features — add missing features to shared engine instead
- Do NOT use Option B (importing client engine on server kills Colyseus delta compression)
