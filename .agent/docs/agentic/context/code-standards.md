# Code Standards — Deep Dive

## Semantic Naming Glossary

**Directive**: Code reads like a story about the game, not abstract CS.

| Game Concept | Preferred Terms | Avoid |
|--------------|-----------------|-------|
| Ships moving between stars | **transfer**, **transit** | flow, stream |
| Player command to move/attack | **order** | link, command, directive |
| Combat between forces | **battle**, **engagement** | combat (too generic), fight |
| Capturing a star | **conquest**, **capture** | takeover, seize |
| Star-to-star connection | **link**, **route** | connection, edge, path |
| Damaged ships healing | **repair** | heal, restore, fix |
| Ships escaping conquest | **scatter**, **retreat** | escape, flee, run |
| Ship generation | **production**, **produce** | spawn, create, generate |
| Game time unit | **tick** | turn, frame, cycle |
| Star ownership change | **setOwner**, **changeOwnership** | transfer (ambiguous) |

### Naming Patterns
- **Actions**: verb-first (`executeTransferOrders()`, `resolveBattle()`)
- **Queries**: `get`/`is`/`has` prefix (`getPlayerShipCount()`, `isUnderAttack()`)
- **Booleans**: `is`/`has`/`should` prefix
- **Config**: ALL_CAPS with units (`TRANSFER_RATE_PER_TICK`, `BATTLE_DAMAGE_PER_SHIP`)
- **Collections**: plural nouns (`transferOrders`, `battleParticipants`)
- **No version suffixes** (`V4`, `V3`) — Git handles versions

### Visual Layer Naming (Decision D-24)
Names describe what the visual **represents**, not the technique:
- `SHOW_STAR_POWER` not `SHOW_TERRITORY` (for per-star glow halos)
- `StarPowerRenderer` not `TerritoryRenderer` (halos = fleet strength, not ownership geometry)
- "Territory" is the concept; renderer names specify technique (Voronoi, Metaball)

### User Names Take Priority
When user provides terminology: adopt it immediately. Rename code to match user's mental model. Never argue for "technical accuracy" over user's preferred terms.

---

## File Size Rules

| Target | Lines |
|--------|-------|
| Ideal max | 300 |
| Hard max | 500 |
| Over 500 | MUST refactor before adding more code |

### How to Split
- Svelte: child components per section/panel. Parent orchestrates layout.
- TypeScript: split by domain responsibility, extract helpers/types/constants
- Use barrel exports (`index.ts`) for clean import paths
- Move shared game logic to `common/` package

---

## Logging API

All logging goes through the structured `log` utility (Visual Telemetry). **Never** use raw `console.log`.

### Client (`pax-fluxia`)
```typescript
import { log } from '$lib/utils/logger';

log.sys('Auth', 'Initializing...');
log.state('Auth', 'User logged in', user);
log.net('Room', 'Connected', roomId);
log.data('Sync', 'State updated', payload);
log.error('Auth', 'Login failed', err);
log.success('Auth', 'Login succeeded');
log.combat('Battle', 'Resolved', result);
log.input('Click', { starId });
```

### Server (`pax-server`)
```typescript
import { log } from '../utils/logger';

log.sys('GameRoom', 'Room created');
log.game('Tick', `Tick ${tick} processed`);
log.combat('Battle', 'Resolved', result);
log.net('Client', `Joined: ${sessionId}`);
```

Only exception: `logger.ts` files themselves may use `console.log`.

---

## Refactoring Rules

### Before Any Rename/Refactor
1. Run `bun tools/pax-find.ts --refs <name>` (or MCP `atlas-harness` tools) for ALL references
2. Fix ALL occurrences in one edit, not incrementally
3. After changes, re-run to confirm no stale references remain

### DRY Principles
- One source of truth for every value
- One code path for every behavior — parameterize, don't duplicate
- Derive, don't store — if computable from another value, compute it
- Store canonical format, convert at display boundary only

### No Special-Case Exceptions
If you're writing `if (key === "SPECIAL")` inside a generic loop, the data model is wrong. Fix the model, not the handler.
