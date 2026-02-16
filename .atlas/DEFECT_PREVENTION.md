# Defect Prevention Protocol

> Canonical process definitions for minimizing bugs, regressions, and wiring errors in AI-assisted development.

## 1. The Search-Before-Touch Rule

> [!CAUTION]
> **MANDATORY before any rename, refactor, or variable rewiring:**
> Search the ENTIRE codebase for every term being changed.

### Why
Most AI agent bugs stem from **incomplete awareness** — changing a variable in one file while missing references in 3 others. This is especially lethal with:
- Config variable names (e.g., `WOBBLE_AMP` hardcoded in one file, config-driven in another)
- Array references (e.g., `travelingShips` aliased in multiple scopes)
- Import/export chains
- Type interface fields

### How
Use the project's **`pax-find`** utility (see §3) instead of ad-hoc CLI commands:
```powershell
bun tools/pax-find.ts WOBBLE_AMP
bun tools/pax-find.ts travelingShips
bun tools/pax-find.ts --imports game.config
```

### Compliance Checklist
Before ANY rename/refactor commit:
- [ ] Searched for the old name across all source files
- [ ] Verified every hit is updated or intentionally unchanged
- [ ] Searched for the new name to confirm no collisions
- [ ] Checked import/export chains are intact

---

## 2. The Trace-Before-Build Rule

> [!IMPORTANT]
> Never assume wiring is correct. Trace the full data flow before coding.

### The Pipeline Trace Pattern
For any feature involving data flow (events → handlers → state → renderer):
1. **SOURCE**: Where is the data produced?
2. **TRANSPORT**: How does it reach the consumer?
3. **CONSUMPTION**: Where is it read/used?
4. **MUTATION**: Does anything replace/disconnect references?

### Example: The `travelingShips` Bug
- Ships were invisible after refactor
- Root cause: `ShipRenderer` replaced the array reference, disconnecting it from `VSM`
- A pipeline trace would have caught this in 2 minutes

---

## 3. The `pax-find` CLI Utility

A guaranteed-fast, zero-config codebase search tool at `tools/pax-find.ts`.

### Capabilities
| Command | Purpose |
|---------|---------|
| `bun tools/pax-find.ts <term>` | Find all references to a term |
| `bun tools/pax-find.ts --imports <module>` | Find all imports of a module |
| `bun tools/pax-find.ts --exports <file>` | List all exports from a file |
| `bun tools/pax-find.ts --refs <name>` | Find variable/function references with context |

### Why Not Just `grep`?
- PowerShell has encoding issues with `.svelte` files
- Multi-step `cd` + `grep` + `find` chains fail frequently
- No directory issues, no forgotten flags — single command, guaranteed result

---

## 4. The Reference Integrity Check

Before committing any change that modifies:
- **Interfaces/types**: Search for all implementors
- **Config keys**: Search for all readers AND writers
- **Function signatures**: Search for all callers
- **Array/object references**: Trace all aliases

### Anti-Pattern: Alias Disconnect
```typescript
// Frame 1: both point to same array
let local = obj.internalArray;   // ✅ alias

// Somewhere in render loop:
local = filtered;                // ❌ alias broken!

// Next tick: obj pushes to internalArray
// but local no longer sees it
```

**Fix**: Always re-read from canonical source, or mutate in-place.

---

## 5. The Hardcode Audit

> [!WARNING]
> Any magic number in source code is a latent bug.

When adding a config-driven value:
1. Define it in `GAME_CONFIG`
2. Search for **all existing hardcoded instances** of that value
3. Replace every one with the config reference
4. Verify with `pax-find`

### Example: `wobbleAmp`
- Config existed: `GAME_CONFIG.WOBBLE_AMP`
- Slider wrote to it correctly
- But `behaviors.ts` had `computeWobble(ship, travelProgress, 12)` — hardcoded!
- A hardcode audit would have caught this instantly

---

## 6. Error Classes & Prevention

| Error Class | Prevention Rule | Tool |
|-------------|----------------|------|
| Missing references | Search-Before-Touch | `pax-find` |
| Stale aliases | Pipeline Trace | Manual trace |
| Hardcoded values | Hardcode Audit | `pax-find <value>` |
| Disconnected wiring | Trace-Before-Build | Manual trace |
| Type mismatches | Interface search | `pax-find --refs` |
| Import gaps | Import chain check | `pax-find --imports` |
