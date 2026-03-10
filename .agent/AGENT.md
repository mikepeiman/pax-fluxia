# AGENT.md — Pax Fluxia Master Context

> **Load this file at session start. It replaces all other rule/memory files.**
> For deep dives, see `.agent/context/` (if created) or the individual rules in `.agent/rules/`.

---

## 1. Project Technical Specifications

**Pax Fluxia** — real-time multiplayer galactic strategy game.
- **Client**: SvelteKit 5 + PixiJS 8 + TypeScript (`pax-fluxia/`)
- **Server**: Colyseus 0.15 + Bun (`pax-server/`)
- **Shared**: `@pax/common` monorepo package (`common/`)
- **Build**: Bun only. `bun install`, `bun run dev`, `bunx`. Never npm/npx/yarn.
- **Port**: Dev server on `localhost:1420` (Tauri). 
- **Shell**: PowerShell on Windows. **Never use `&&` to chain commands.**

---

## 2. Agent Behavior — Non-Negotiable

### 2.1 Chat-First Response -  Think Critically
- **Not auto-compliance, not auto-challenge** — think about each prompt carefully and respond thoughtfully
- When the user proposes an approach, evaluate it: what's right, what's missing, what are the tradeoffs?
- Push back where warranted, agree where sound, and surface things the user may not have considered
**Every response starts with a text paragraph** containing:
- any new insights or ideas you have, critical feedback, challenges, questions, or other thoughts
- All tasks/instructions you currently remember
- Working assumptions about code state
- Memory gaps (if context truncated, say so)
- What you plan to do

### 2.2 Trust the User
- User observations ARE ground truth — they see the app, you don't
- Never say "it may FEEL wrong but the math is correct"

### 2.2.1 Epistemic Humility
- Never declare something "fixed" without user verification or actual evidence
- Use conditional language: "My working hypothesis is…" not "Found the root cause"


### 2.3 Precision
- **User words are specifications** — parse as requirements, not symptoms
- **Never move the goalposts** — fix the problem as stated
- **No guessing** — always read the source definition before writing dependent code
- **Finish the task** — complete current work before starting new items

### 2.4 Completeness
- **Every definition must have a consumer** — adding a type, config key, or function without wiring it to its integration point is dead code and counts as incomplete work
- **Trace the full path** — when creating something new (event, SoundType, config flag), follow the chain from definition → usage → trigger → UI
- **Search ALL references before changing** — when removing, renaming, or commenting out any symbol (variable, property, function), grep the ENTIRE codebase for ALL references and fix every hit BEFORE testing
- **No orphans** — before marking work done, verify: "Who calls this? Where does this render? What fires this event?"


### 2.5 Document Everything
All ideas, fixes, bugs, roadmap items the user mentions → document immediately in:
| Type | Where |
|------|-------|
| Feature ideas / roadmap | `.atlas/FEATURE_STATUS.md` → Planned Features |
| Bug reports | `.atlas/FEATURE_STATUS.md` → Known Regressions |
| Design decisions | `.atlas/DECISIONS.md` |
| Mechanics changes | `.atlas/MECHANICS.md` |

### 2.6 Session Memory
- **Session notes**: `.agent/WIP Work-In-Progress/SESSION_YYYY-MM-DD.md` — create at session start, append after every task
- **Chat log**: `.agent/WIP Work-In-Progress/CHAT_YYYY-MM-DD.md` — verbatim user prompts, timestamped
- **Post-mortems**: `.atlas/post-mortems/YYYY-MM-DD-<name>.md` — after significant failures

### 2.7 Model Selection
| Task | Model |
|------|-------|
| Docs, formatting, lookups, config | 🟢 Flash |
| Bug fixes, features, UI, refactors | 🟡 Sonnet |
| Architecture, engine, 3+ system changes | 🔴 Opus |

Default = Thinking mode. Flag model switches at response start.

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

### 3.3 File Discipline
- 300 lines ideal, 500 hard max. Over 500 = refactor first.
- Game time only: `gameNowMs` (FXClock), never `performance.now()` in game code.
- Exhaustive cleanup: when renaming, grep ALL references, fix in one pass.

### 3.4 Slider Reactivity (Critical Pattern)
All UI sliders read from `panel.xxx` ($state), never `GAME_CONFIG.xxx`:
1. Add entry to `PANEL_CONFIG_MAP` in `settingsDefs.ts`
2. Template reads `panel.xxx`, writes via `updatePanel(key, value)`
3. `syncPanelFromConfig()` handles theme/import sync
4. **GAME_CONFIG is NOT reactive** — reading it in templates will not update

### 3.5 Never Remove User Controls
Every `GAME_CONFIG` property with a UI element is sacred. Never delete, simplify, or hardcode over any slider/toggle/dropdown without explicit user instruction. **User configurability IS the product.**

---

## 4. UI & Design

### 4.1 Layout Rules
- Flex for simple layouts, Grid for complex (3+ areas, named areas)
- `min-width: 0` on flex children
- Breakpoints: 900px (2→1 col), 480px (compact)
- Mobile: 44px touch targets, 20px slider thumbs
- Clip-path: remove on mobile (overflow bugs)

### 4.2 Responsive Mobile
- Portrait/landscape: map dimensions match viewport aspect ratio
- Landscape mobile: top/bottom bars → sidebars
- `env(safe-area-inset-bottom)` doesn't work on Android — use fixed offsets
- Always test with Android system nav bar (~48px)

### 4.3 Dark Theme
All UI on dark backgrounds. High-contrast text. Glass panels: `rgba(20,20,30,0.8)` + `backdrop-filter: blur(8px)`.

---

## 5. Variable Rigour

| Gear | Scope | Atlas Update |
|------|-------|-------------|
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

### Shared Engine
`@pax/common` — canonical game logic, shared between client & server.
- `schema()` function pattern for Colyseus serialization
- `sessionId` is the authoritative player key
- Client = presentation layer, server = authority

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

**⛔ NEVER push to `live` branch.** Only the user deploys to production. Hard rule, always on.

**Commit working state FIRST.** When user says "commit" or "push," do it immediately before any additional work. Tweaks go in separate commits.

### Pre-Code Checklist (Gear 2+)
1. New files? → Update physical map
2. New exports/types? → Update inventory
3. Data flow changes? → Update I/O docs
4. New events? → Update event docs

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
| Setting timid slider ranges for new FX | **10X rule**: provide at least 10× the "reasonable" range. You can't debug what you can't see. |
| Interpreting silence as confirmation | **Absence of feedback ≠ confirmation.** Only explicit user statements count as verification. Never claim "confirmed" or "verified" without a direct user statement. |

---

## 10. File Reference

### Core Documents
| Need | Load |
|------|------|
| Full context | `.agent/AGENT.md` (this file) |
| Feature status / bugs | `.atlas/FEATURE_STATUS.md` |
| Feature ideas / roadmap | `.agent/WIP Work-In-Progress/FEATURE_IDEAS.md` |
| Design decisions | `.atlas/DECISIONS.md` |
| Game mechanics | `.atlas/MECHANICS.md` |
| Design rules (CSS/layout) | `.atlas/DESIGN_RULES.md` |

### Session & Work-In-Progress
| Need | Load |
|------|------|
| Session notes (current) | `.agent/WIP Work-In-Progress/SESSION_YYYY-MM-DD.md` |
| Chat log (user prompts) | `.agent/WIP Work-In-Progress/CHAT_YYYY-MM-DD.md` |
| UI work queue | `.agent/WIP Work-In-Progress/UI/YYYY-MM-DD.md` |
| Post-mortems | `.atlas/post-mortems/YYYY-MM-DD-<name>.md` |

### Deep Reference (on-demand)
| Need | Load |
|------|------|
| Active rules (detailed) | `.agent/rules/` |
| Skills (on-demand) | `.agent/.skills/` |
| Archives (reference only) | `.agent/_archive_rules/`, `.agent/_archive_memory/` |

---

## 11. Post-Mortem Process

After every significant agent failure, write a post-mortem to `.atlas/post-mortems/post-mortem_YYYY-MM-DD-<semantic-name>.md`.

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
