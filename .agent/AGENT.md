# Pax Galaxia / Pax Fluxia — Agent Context

> **Load this file first.** It contains the distilled rules, conventions, and project knowledge.
> For deeper dives on any topic, see the `context/` directory.

---

## 1. Project Identity

**Pax Galaxia**: Real-time 4X space strategy game (faithful recreation of 2007 indie game).
**Pax Fluxia**: Future evolution with new mechanics (roadmap only — not active dev).

| Layer | Technology |
|-------|-----------|
| Runtime/PM | **Bun** (never npm/npx/yarn) |
| Frontend | SvelteKit (Svelte 5 with Runes) |
| Rendering | PixiJS (WebGL canvas) |
| Game Engine | Custom stateless tick processor |
| Multiplayer | Colyseus |
| Monorepo | `common/` · `pax-fluxia/` · `pax-server/` |

```
common/          # @pax/common — authoritative GameEngine (stateless, deterministic)
pax-fluxia/      # Client (Svelte + Vite) — THE VIEW
pax-server/      # Server (Node + Colyseus) — THE TRUTH
```

Git: `master` (dev) · `live` (production) · Alias: `git ac "message"` · Push after every commit.

---

## 2. Variable Rigour

Choose a gear based on task scope. Explicitly state your gear at session start.

| Gear | When | Atlas Update | Pre-flight |
|------|------|-------------|------------|
| **Gear 1: Hotfix** | Bug fixes, config tweaks, < 50 lines changed | Post-hoc (agent updates docs after code) | Grep for references only |
| **Gear 2: Feature** | New features, UI work, refactors | Incremental (update relevant Atlas section before code) | Full: check naming, file sizes, references |
| **Gear 3: Deep Work** | Architecture changes, new systems, engine work | Atlas-first (update architecture doc, get approval, then code) | Full + design review with user |

> **Self-enforcement**: Until CI/CD hooks exist, state your gear explicitly. At commit time, verify: "Did I update the docs that changed?" If not, update them before pushing.

---

## 3. Hard Rules (Non-Negotiable)

### Behavioral
- **User words are specifications** — parse as requirements, not symptoms to diagnose
- **Never move the goalposts** — fix the problem as stated; don't redefine it
- **Epistemic honesty** — use conditional language ("likely", "suggests") until verified
- **Ask about visuals** — don't guess what animations/effects look like from code alone
- **Task queue discipline** — document incoming requests, finish current task first

### Code
- **No `console.log`** — use `log.sys()`, `log.state()`, `log.net()`, etc. from the logger utility
- **Bun only** — `bun install`, `bun run dev`, `bun add`, `bunx` (never npm/npx)
- **Game time only** — all animation/VFX timing uses `gameNowMs` (FXClock), never `performance.now()` or `Date.now()` in game code
- **Exhaustive reference cleanup** — when renaming anything, grep ALL references and fix in one pass

### Documentation
- **Session documents** — save `SESSION_YYYY-MM-DD.md` in `.agent/WIP Work-In-Progress/` every session
- **Clickable code refs** — every completion report includes `[function](file:///path#L123-L145)` links
- **Atlas self-enforcement** — at commit time, verify docs reflect code changes

---

## 4. Code Standards

### Naming (Semantic, Domain-First)
Code reads like a story about the game, not abstract CS:

| Concept | Use | Avoid |
|---------|-----|-------|
| Ships moving | **transfer**, **transit** | flow, stream |
| Player command | **order** | link, command |
| Combat | **battle**, **engagement** | combat, fight |
| Capturing a star | **conquest** | takeover, seize |
| Ship generation | **production** | spawn, create |
| Star connection | **link**, **route** | edge, path |

Patterns: verb-first actions (`executeTransferOrders`), `is`/`has` booleans, `ALL_CAPS` config with units.

### File Size
| Target | Lines |
|--------|-------|
| Ideal max | 300 |
| Hard max | 500 |
| Over 500 | MUST refactor before adding code |

Split Svelte into child components. Split TS by domain responsibility. Use barrel exports.

### DRY
- One source of truth for every value
- One code path for every behavior — parameterize, don't duplicate
- Store canonical format, convert at display boundary (e.g., decimals → percentages in UI only)
- No special-case `if (key === "SPECIAL")` inside generic loops — fix the data model

### Logging
```typescript
// Client: import { log } from '$lib/utils/logger';
log.sys('Auth', 'Initializing...');
log.state('Auth', 'User logged in', user);
log.combat('Battle', 'Resolved', result);

// Server: import { log } from '../utils/logger';
log.game('Tick', `Tick ${tick} processed`);
```

---

## 5. Design Principles

### Tunability (Repeated instruction — 3+ times)
- **Every numeric constant** → `GAME_CONFIG` with slider in settings panel
- **Never hardcode** a value that could be tuned
- **Persist** all config values to localStorage
- Anti-pattern: `const settleDuration = 500;` → Correct: `GAME_CONFIG.CONQUEST_SETTLE_MS ?? 500`

### Backwards-Compatible Effects
- **Never delete** an existing animation/effect — keep it as a selectable mode
- **Add new implementations alongside** with a config toggle
- Build a library of animation variants that can be mixed and matched
- Exception: dead code that was never functional can be cleaned up per user request

### Scaffold-First
- Build UI controls before backing logic is implemented
- Having the UI in place makes it obvious what's "not wired yet" vs "not designed yet"

### Animation Architecture
- **Animations are event-driven, not diff-based** — the engine emits typed events (`reinforce`, `conquest`, `scatter`); never reverse-engineer actions from state changes
- **Attack ≠ Transfer** — attacks are remote engagement (ships STAY, surge/pulse), transfers are physical travel
- **Settle ships appear at full scale** — never small→large bloom (D-16, hard constraint)
- **Scoped fixes only** — never modify shared rendering functions for a single code path

---

## 6. Debugging Protocol

### Trust the User
- The user has direct visual access. You do not. Accept observations as ground truth.
- "It looks wrong" → investigate. Never "it may FEEL wrong but the math is correct."

### Investigation Method
1. **Multiple hypotheses** — list ≥3 possible causes, rank by evidence, test most likely first
2. **Trace data, not names** — find the exact line producing the visual, follow the data flow backward
3. **Broad forensics** — bugs may be old; use `git log -p --follow` not just last commit
4. **Fresh start bias** — if fixing requires understanding 3+ interlocking systems, the architecture is probably wrong; redesign

### Verification
- Verify assumptions with `search_web` if knowledge is >1 month old
- Read official docs before implementing library integrations
- Run `bun tools/pax-find.ts --refs <name>` before any rename/refactor
- After fixes, re-verify no stale references remain

### Language
- ✅ "The most likely cause appears to be…" / "My working hypothesis is…"
- ❌ "Found the root cause" / "This IS the issue" (until verified)
- After a failed fix: "My previous hypothesis was wrong. Let me re-examine…"

---

## 7. Game Domain

### The #1 Rule: Attack ≠ Transfer

| Action | Ships Move? | Visual | Mechanic |
|--------|-----------|--------|----------|
| **Attack** | NO — ships STAY | Surge/recede pulse | Remote engagement, damage across lane |
| **Transfer** | YES — ships travel | Sprites along lane | Reinforcement to friendly star |

### Timing Sources (6 systems, all separate)

| System | Source | Config Key |
|--------|--------|-----------|
| Attack Surge | `tickProgress` | `ATTACK_SURGE_*` |
| Surge ramp-in | `gameNowMs` | `ATTACK_SURGE_RAMP_MS` |
| Ship Transfer | `gameNowMs` | `effectiveTickMs` |
| Orbit | frame-based `orbitTime` | none |
| Settle | `gameNowMs` | `SETTLE_DURATION_MS` |
| Conquest flash | `gameNowMs` | — |

### Orders
- Orders persist until explicitly cancelled. Zero ships does NOT auto-cancel.
- **Opposing orders** = same-player loop (A→B + B→A). Cross-player mutual combat is ALWAYS allowed.
- `ALLOW_OPPOSING_ORDERS` is client-only. When false, issuing A→B cancels B→A (same owner only).

### Scope Rule
- **Pax Galaxia** = what we build NOW (core mechanics, combat, AI, star types)
- **Pax Fluxia** = roadmap ONLY (star upgrades, conditional orders, spectator mode)
- Never conflate roadmap features with core gameplay work

---

## 8. UI/UX

### Layout System
- **CSS Grid with named areas** is the default for all layouts
- Flex is acceptable for trivial single-axis layouts (row of buttons)
- Every flex child: `min-width: 0` to prevent intrinsic overflow
- Every child: `max-width: 100%; box-sizing: border-box`

### Responsive Breakpoints
- **900px**: 2-col → 1-col. Tabs for section switching.
- **480px**: Compact spacing, smaller fonts, stacked forms.
- **44px minimum** touch target on mobile, 20px slider thumb.
- No goalpost moving — if a design breaks at a size, fix the design at that size.

### Dark Theme
- Always set explicit `background-color` and `color` on form elements
- Standard: bg `rgba(0,0,0,0.6)` or `#1a1a2e`, text `#e0e0e0`, borders `rgba(255,255,255,0.1)`
- No `clip-path` on mobile. No pseudo-element z-index layering over positioned children.

### Svelte 5 Reactivity
- `GAME_CONFIG` is a plain object — NOT `$state`. Sliders must use a `$state` mirror for display values.
- Write to BOTH `GAME_CONFIG[key]` (engine) AND the reactive mirror (UI).

---

## 9. Architecture

### Shared Engine (Unified Pattern)
- `@pax/common` = THE BRAIN — stateless, deterministic `GameEngine`
- `GameEngine.tick(state)` — pure function, state injected, never held
- SP: client runs engine directly. MP: server runs engine → Colyseus patches → client reconciles
- Anti-pattern: if `pax-fluxia/src/lib/engine/GameEngine.ts` has combat/production logic that differs from `@pax/common`, engines have **diverged** — fix immediately

### Engine Convergence Status
- Phase 1 (Math Parity): ✅ Complete
- Phase 2 (Combat & Capture): ✅ Complete
- Phase 3 (Cleanup — strip client duplication): ⬜ Pending

### Colyseus Gotcha
Never explicitly import `WebSocketTransport` from `@colyseus/ws-transport`. Let `Server` create transport internally. Bun's content-addressable `node_modules` can create two `@colyseus/core` instances → "seat reservation expired" (4002).

### Theme System
- Themes live in `builtinThemes.ts` (shipped presets) and `themes.ts` (save/load/export)
- When user updates a theme: version it (v2, v3), never overwrite the original
- Check `common/resources/settings-themes/*.json` for user's actual active settings

---

## 10. Workflow

### Git
- Commit after every code/doc change: `git ac "message"` then `git push origin master`
- Branch only for risky experiments (`feat/`, `fix/`, `refactor/`). Merge & delete promptly.

### Task Discipline
- When user reports new items mid-task: document in session notes, acknowledge, continue current work
- After completing a task: check session queue + FEATURE_STATUS.md, suggest next item with context

### Session Documents
Save to `.agent/WIP Work-In-Progress/SESSION_YYYY-MM-DD.md` every session:
- Session focus, bug fixes (with IDs), features implemented, docs changed, open items deferred, key files modified

### Completion Reports
Include clickable code refs: `[functionName](file:///absolute/path#L123-L145) — description`

### Settings Reference
- Code defaults: `pax-fluxia/src/lib/config/game.config.ts`
- Saved themes: `common/resources/settings-themes/*.json`
- Runtime: localStorage. Always check saved themes before assuming defaults.

---

## 11. Known Failure Patterns

These are instructions that have been given multiple times. Extra attention required.

| Pattern | Fix |
|---------|-----|
| Deleting animations to replace them | ALWAYS keep old as selectable mode |
| Claiming certainty before verification | Use conditional language |
| Ignoring user's visual observations | Trust the user — they can see the app |
| Hardcoding magic numbers | Every number → GAME_CONFIG + slider |
| Partial reference cleanup on rename | Grep ALL references, fix in one pass |
| Modifying shared functions for one code path | Scope fix to specific lifecycle phase |

---

## Deep Dive Reference

For detailed guidance on any topic, load the corresponding file from `.agent/context/`:

| File | Topics |
|------|--------|
| `code-standards.md` | Naming glossary, file size rules, logging API, DRY patterns, refactoring |
| `debugging.md` | Investigation methodology, user trust, forensics, deep thinking protocol |
| `game-design.md` | GDD, animation rules, game time, orders, tunability, specs compliance |
| `ui-patterns.md` | Layout spatial map, dark theme, responsive design, Svelte 5 reactivity |
| `architecture.md` | Shared engine details, convergence plan, Colyseus, schemas |
| `workflow.md` | Git workflow, task discipline, session docs, theme versioning |
| `tech-gotchas.md` | Colyseus module resolution, PowerShell syntax, Bun quirks |
