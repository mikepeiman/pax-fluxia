# AGENT.md — Pax Fluxia Master Context

> **Load this file at session start. It replaces all other rule/memory files.**
> For deep dives, see individual rules in `.agent/rules/`.
> For concurrent work across multiple agents or branches, load `.agent/workflows/repo-multi-agent-concurrency-protocol.md` before any git or file operations.

---

## 1. Project Technical Specifications

**Pax Fluxia** — real-time multiplayer galactic strategy game.
- **Client**: SvelteKit 5 + PixiJS 8 + TypeScript (`pax-fluxia/`)
- **Server**: Colyseus 0.15 + Bun (`pax-server/`)
- **Shared**: `@pax/common` monorepo package (`common/`)
- **Build**: Bun only. `bun install`, `bun run dev`, `bunx`. Never npm/npx/yarn.
- **Port**: Dev server on `localhost:1420` (Tauri).
- **Shell**: PowerShell on Windows. **Never use `&&` to chain commands.**
- **MCP Atlas-harness**: Read `.agent/AGENT-GUIDE_MCP_atlas-harness.md` at start of every session.
- **Live Settings**: `common/resources/settings-live/current-settings.json` — auto-saved from in-game control panel. **Always read this file** for current GAME_CONFIG values instead of guessing from defaults.

---

## 2. Agent Behavior — Non-Negotiable

### 2.1 Chat-First Response — Think Critically
- **Not auto-compliance, not auto-challenge** — think about each prompt carefully and respond thoughtfully.
- When the user proposes an approach, evaluate it: what's right, what's missing, what are the tradeoffs?
- Push back where warranted, agree where sound, surface things the user may not have considered.
**Every response starts with a text paragraph** containing:
- Any new insights, critical feedback, challenges, questions
- All tasks/instructions you currently remember
- Working assumptions about code state
- Memory gaps (if context truncated, say so)
- What you plan to do

### 2.2 Trust the User
- User observations ARE ground truth — they see the app, you don't.
- Never say "it may FEEL wrong but the math is correct."

### 2.3 Epistemic Humility
- Never declare something "fixed" without user verification or actual evidence.
- Use conditional language: "My working hypothesis is..." not "Found the root cause."
- **Absence of feedback ≠ confirmation.** Only explicit user statements count as verification.

### 2.4 Precision
- **User words are specifications** — parse as requirements, not symptoms.
- **Never move the goalposts** — fix the problem as stated.
- **No guessing** — always read the source definition before writing dependent code.
- **Finish the task** — complete current work before starting new items.

### 2.5 Completeness
- **Every definition must have a consumer** — adding a type, config key, or function without wiring it to its integration point is dead code and counts as incomplete work.
- **Trace the full path** — when creating something new (event, SoundType, config flag), follow the chain from definition → usage → trigger → UI.
- **Search ALL references before changing** — when removing, renaming, or commenting out any symbol, grep the ENTIRE codebase for ALL references and fix every hit BEFORE testing.
- **No orphans** — before marking work done, verify: "Who calls this? Where does this render? What fires this event?"

### 2.6 Spec-Validate Before Coding
Every time you have a direction/solution, check it against the user's exact words: "What is the user's intent, and what do their words mean?" Verify your idea satisfies the correct specifications — not your own restatement.

### 2.7 Document Everything
All ideas, fixes, bugs, roadmap items the user mentions → document immediately in:

| Type | Where |
|------|-------|
| Feature ideas / roadmap | `docs/project/features/FEATURE_IDEAS.md` |
| Feature status / bugs | `docs/project/features/FEATURE_STATUS.md` |
| Design decisions | `docs/project/decisions/DECISIONS.md` |
| Mechanics changes | `docs/game/design/MECHANICS.md` |

### 2.8 Session Memory
- **Session notes**: `.agent/WIP Work-In-Progress/SESSION_YYYY-MM-DD.md` — create at session start, append after every task
- **Chat log**: `.agent/WIP Work-In-Progress/CHAT_YYYY-MM-DD.md` — verbatim user prompts, timestamped

---

## 3. Code Standards

### 3.1 Logging
No raw `console.log`. Use Visual Telemetry:
```ts
import { log } from '$lib/utils/logger';
log.sys('Module', 'message');   log.state('Module', 'msg', data);
log.combat('Battle', 'msg');    log.error('Module', 'msg', err);
```

### 3.2 Naming
Code reads like a game story, not CS jargon.
| Concept | Use | Avoid |
|---------|-----|-------|
| Ships moving | transfer, transit | flow, stream |
| Player command | order | command, directive |
| Combat | battle, engagement | fight |
| Capture | conquest, capture | takeover |
| Connection | link, route | edge, path |
| Generation | production | spawn, create |
| Time unit | tick | turn, frame |
| Config keys | `ALL_CAPS_WITH_UNITS` | camelCase |

### 3.3 Terminology (D-70)
| Term | Definition |
|------|-----------|
| **Territory** | Connected same-owner stars and the space within their bounds |
| **Frontier** | Boundary geometry where two territories meet |
| **Front** | Contested section of frontier — an active battle zone |
| **Holding** | Sum total of a player's territories across the sector |
| **Sector** | The game map |

### 3.4 File Discipline
- 300 lines ideal, 500 hard max. Over 500 = refactor first.
- Game time only: `gameNowMs` (FXClock), never `performance.now()` in game code.
- Exhaustive cleanup: when renaming, grep ALL references, fix in one pass.

### 3.5 Slider Reactivity (Critical Pattern)
All UI sliders read from `panel.xxx` ($state), never `GAME_CONFIG.xxx`:
1. Add entry to `PANEL_CONFIG_MAP` in `settingsDefs.ts`
2. Template reads `panel.xxx`, writes via `updatePanel(key, value)`
3. `syncPanelFromConfig()` handles theme/import sync
4. **GAME_CONFIG is NOT reactive** — reading it in templates will not update

### 3.6 Never Remove User Controls
Every `GAME_CONFIG` property with a UI element is sacred. Never delete, simplify, or hardcode over any slider/toggle/dropdown without explicit user instruction. **User configurability IS the product.**

---

## 4. UI & Design

### 4.1 Layout Rules
- Flex for simple layouts, Grid for complex (3+ areas, named areas)
- `min-width: 0` on flex children
- Breakpoints: 900px (2→1 col), 480px (compact)
- Mobile: 44px touch targets, 20px slider thumbs

### 4.2 Dark Theme
All UI on dark backgrounds. High-contrast text. Glass panels: `rgba(20,20,30,0.8)` + `backdrop-filter: blur(8px)`.

---

## 5. Variable Rigour

| Gear | Scope | Doc Update |
|------|-------|-----------|
| **1: Hotfix** | <50 lines, bug fix | Post-hoc |
| **2: Feature** | New features, UI | Incremental (before code) |
| **3: Deep Work** | Architecture, systems | Atlas-first + approval |

Self-enforce: "Did I update the docs that changed?" If not, update before pushing.

---

## 6. Debugging Protocol

1. Accept user observations as ground truth
2. List ≥3 possible causes, rank by evidence
3. Trace data flow to the exact line
4. If "it used to work" → git archaeology FIRST (`git log -p --follow`)
5. Verify assumptions — read source defs, check official docs
6. Never claim fixed without evidence

---

## 7. Architecture Notes

### Shared Engine (UNIFIED — F-36, 2026-02-15)
`@pax/common` — canonical game logic, shared between client & server.
- Single `GameEngine.ts` in `common/src/engine/` (394L). No client duplicate.
- `calculateCombatV4` wraps `@pax/common` shared combat.
- `sessionId` is the authoritative player key.
- Client = presentation layer, server = authority.

### Territory Rendering Pipeline
**4-layer pipeline** (Ownership → Geometry → Transition → Presentation).

| Layer | Responsibility | Output Contract |
|-------|---------------|-----------------|
| **Ownership** | Who owns what; emits virtual stars for smooth conquest transitions | `OwnershipSnapshot` |
| **Geometry** | Shapes from ownership — regions, frontiers, shells, topology | `CanonicalGeometrySnapshot` |
| **Transition** | Animating between geometry states — interpolated fill/border frames | `TransitionSnapshot` |
| **Presentation** | Drawing to screen — PIXI.Graphics fills, strokes, containers | Rendered frame |

**Active entry point**: `compileVectorGeometry()` in `compiler_UnifiedVectorGeometry.ts`.
**DY4 Optimal Transport** is the canonical default border animation mode. Do NOT alter without user approval.
**Full spec**: `.agent/SPECIFICATIONS/TERRITORY_ARCHITECTURE.md`

### Known Gotchas
- Colyseus `Symbol.metadata` crash: use `defineTypes()` not `@type` decorators
- Bun + esbuild: decorators need special handling
- PowerShell: no `&&` chaining, run commands separately

---

## 8. Process Shortcuts

### Browser
**⛔ NEVER open a browser or use the browser subagent unless the user gives explicit permission.** Ask the user for screenshots, console errors, or visual verification instead.

### Git
Use `git ac "message"` alias for add+commit. Run commands separately, never chain with `&&`.

**⛔ NEVER push to `live` branch.** Only the user deploys to production.

**Commit working state FIRST.** When user says "commit" or "push," do it immediately before any additional work. Tweaks go in separate commits.

---

## 9. Repeated Agent Failures (Learn From These)

| Failure | Rule |
|---------|------|
| Declaring "fixed" without testing | ALWAYS say "please verify" |
| Forgetting prior instructions | Chat-first with full context inventory |
| Using console.log | Use `log.sys()` etc. |
| Guessing type signatures | Read the definition first |
| Removing user controls during refactor | Never remove without explicit instruction |
| Using npm instead of bun | Bun only |
| Chaining PowerShell with && | Run separately |
| Reading GAME_CONFIG in templates | Use panel.$state pattern |
| Ignoring user's exact words | User words are specifications |
| Setting timid slider ranges for new FX | **10X rule**: provide at least 10× the "reasonable" range |
| Interpreting silence as confirmation | Absence of feedback ≠ confirmation |
| Substituting own framing for user spec | Spec-validate before coding |
| Declaring assumptions as facts | Use conditional language; verify before concluding |

---

## 10. File Reference (Ontology E)

### Core Documents
| Need | Load |
|------|------|
| Full context | `.agent/agent.md` (this file) |
| Game mechanics (ground truth) | `docs/game/design/MECHANICS.md` |
| Master game spec | `docs/game/design/GAME_SPECIFICATION.md` |
| Feature status / bugs | `docs/project/features/FEATURE_STATUS.md` |
| Feature ideas / roadmap | `docs/project/features/FEATURE_IDEAS.md` |
| Design decisions | `docs/project/decisions/DECISIONS.md` |
| Territory architecture | `.agent/SPECIFICATIONS/TERRITORY_ARCHITECTURE.md` |
| Work history | `docs/project/WORK_HISTORY.md` |

### Session & Work-In-Progress
| Need | Load |
|------|------|
| Session notes (current) | `.agent/WIP Work-In-Progress/SESSION_YYYY-MM-DD.md` |
| Chat log (user prompts) | `.agent/WIP Work-In-Progress/CHAT_YYYY-MM-DD.md` |

### Deep Reference (on-demand)
| Need | Load |
|------|------|
| Active rules (detailed) | `.agent/rules/` |
| Tech stack | `docs/engineering/tech-stack/TECH_STACK.md` |
| Geometry consolidation | `docs/game/territory/geometry-atlas/GEOMETRY_CONSOLIDATION_ANALYSIS.md` |
| Archive | `docs/_archive/` |

---

## 11. Post-Mortem Process

After every significant agent failure, write a post-mortem to `docs/project/process/post-mortem_YYYY-MM-DD-<name>.md`.

**When to write:**
- Agent declares "done" but work was not actually done
- Same bug type recurs after being "fixed"
- Agent fails to follow explicit instruction
- User has to correct agent on something obvious

**Format:**
```
# Post-Mortem: [Date] — [Short Title]
## What Happened — factual description
## Root Cause — systemic, not surface-level
## Impact — user time, trust, code quality wasted
## Corrective Actions — rules created, standards changed
## Lessons — what to internalize
```
