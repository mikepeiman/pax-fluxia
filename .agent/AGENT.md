# AGENT.md — Pax Fluxia Master Context

> **Load this file at session start. It replaces all other rule/memory files.**
> For deep dives, see `.agent/rules/`. For concurrent multi-agent work, load `.agent/workflows/repo-multi-agent-concurrency-protocol.md`.

---

***NOTE TO AGENT: This work costs money. You cost money based on token usage. Strategize, be tactical, advise and dialogue with your human to minimize token usage.***

## 1. Project

**Pax Fluxia** — real-time multiplayer galactic strategy game.
- **Client**: SvelteKit 5 + PixiJS 8 + TypeScript (`pax-fluxia/`)
- **Server**: Colyseus 0.15 + Bun (`pax-server/`)
- **Shared**: `@pax/common` monorepo package (`common/`)
- **Build**: Bun only. `bun install`, `bun run dev`, `bunx`. Never npm/npx/yarn.
- **Shell**: PowerShell on Windows. **Never use `&&` to chain commands.**
- **MCP Atlas-harness**: Read `.agent/AGENT-GUIDE_MCP_atlas-harness.md` at start of every session.
- **Live Settings**: `common/resources/settings-live/current-settings.json` — read when current GAME_CONFIG values are needed.

---

## 2. Agent Behavior — Non-Negotiable

### 2.1 Think Critically
- Not auto-compliance, not auto-challenge — evaluate each prompt. Push back where warranted, agree where sound.
- **Every response** opens with: insights, current tasks, assumptions, memory gaps, plan.

### 2.2 Trust the User
- User observations ARE ground truth — they see the app, you don't.
- **Absence of feedback ≠ confirmation.** Only explicit user statements count as verification.
- Never declare something "fixed" without evidence. Say "please verify."

### 2.3 Precision & Completeness
- **User words are specifications** — parse as requirements, not symptoms.
- **No guessing** — read the source definition before writing dependent code.
- **Every definition must have a consumer** — trace from definition → usage → trigger → UI.
- **No orphans** — verify: "Who calls this? Where does this render? What fires this event?"

### 2.4 Rename/Refactor Protocol
When removing, renaming, or commenting out any symbol:
1. Use `code_references` (atlas-harness) to find all importers of the symbol.
2. Use `grep_search` for string-level references (comments, config keys, docs).
3. Fix every hit BEFORE testing. One pass, zero orphans.

### 2.5 Document Everything
| Type | Where |
|------|-------|
| Feature ideas / roadmap | `docs/project/features/FEATURE_IDEAS.md` |
| Feature status / bugs | `docs/project/features/FEATURE_STATUS.md` |
| Design decisions | `docs/project/decisions/DECISIONS.md` |
| Mechanics changes | `docs/game/design/MECHANICS.md` |
| Implementation Plans* | `docs/project/implementation-plans/` | * Every plan you come up with should be documented here, within a folder named with the date. Every plan on a given day is memorialized here.
### 2.6 Session Memory
- **Session notes**: `.agent/docs/project/sessions/notes/SESSION_YYYY-MM-DD.md`
- **Chat log**: `.agent/docs/project/sessions/chats/CHAT_YYYY-MM-DD.md`
- **Chat log**: `.agent/WIP Work-In-Progress/CHAT_YYYY-MM-DD.md`

---

## 3. Code Standards

### 3.1 Logging
No raw `console.log`. Use Visual Telemetry:
```ts
import { log } from '$lib/utils/logger';
log.sys('Module', 'message');   log.state('Module', 'msg', data);
log.combat('Battle', 'msg');    log.error('Module', 'msg', err);
```

### 3.2 Terminology
Core terms (full glossary: `docs/game/design/TERMINOLOGY.md`):
- **Territory** = connected same-owner stars and their space
- **Frontier** = boundary geometry where territories meet
- **Region** = contiguous area owned by one player
### 3.3 File Discipline
- 300 lines ideal, 500 hard max. Over 500 = refactor first.
- Game time only: `gameNowMs` (FXClock), never `performance.now()` in game code.
- Config keys: `ALL_CAPS_WITH_UNITS`.

### 3.4 Slider Reactivity (Critical Pattern)
All UI sliders read from `panel.xxx` ($state), never `GAME_CONFIG.xxx`:
1. Add entry to `PANEL_CONFIG_MAP` in `settingsDefs.ts`
2. Template reads `panel.xxx`, writes via `updatePanel(key, value)`
3. `syncPanelFromConfig()` in `panelSync.ts` handles theme/import sync
4. **GAME_CONFIG is NOT reactive** — reading it in templates will not update

### 3.5 Never Remove User Controls
Every `GAME_CONFIG` property with a UI element is sacred. Never delete, simplify, or hardcode over any slider/toggle/dropdown without explicit user instruction. **User configurability IS the product.**

### 3.6 Commenting Code for Future Self
When you write code that is complex, tricky, or otherwise non-obvious, add comments to explain:
- Why you wrote it that way
- What you were trying to accomplish
- Any gotchas or things to watch out for
- Any assumptions you made
- Any trade-offs you made   
---

## 4. Architecture

### Shared Engine (UNIFIED — F-36)
`@pax/common` — single `GameEngine.ts` in `common/src/engine/`. No client duplicate. `sessionId` is the authoritative player key. Client = presentation, server = authority.

### Territory Rendering Pipeline
**4-layer pipeline**: Ownership → Geometry → Transition → Presentation.

| Layer | Responsibility | Output |
|-------|---------------|--------|
| **Ownership** | Who owns what; virtual stars for conquest transitions | `OwnershipSnapshot` |
| **Geometry** | Shapes from ownership — regions, frontiers, topology | `CanonicalGeometrySnapshot` |
| **Transition** | Animating between geometry states | `TransitionSnapshot` |
| **Presentation** | PIXI.Graphics fills, strokes, containers | Rendered frame |

**Compiler**: `compileVectorGeometry()` in `compiler_UnifiedVectorGeometry.ts`.
**Full spec**: `docs/game/territory/TERRITORY_ARCHITECTURE.md`

### Gotchas
- Colyseus `Symbol.metadata` crash: use `defineTypes()` not `@type` decorators
- Bun + esbuild: decorators need special handling

### Architecture-First Rule
When any conflict, refactor, or new work touches a domain: always prefer **master's current best architecture** over legacy patterns. Also always THINK WITH INIATIVE about the patterns in the codebase and how to improve them. Never regress to accommodate imported code — refactor incoming code to match the canonical pattern. If uncertain which is better, ask.

### Single-Pattern Enforcement
One domain = one implementation pattern. Never introduce a second implementation for the same concern (e.g., two different UI control state patterns, two renderer dispatch mechanisms). If a merge or feature would create a duplicate pattern, refactor to the best existing pattern first.

### Purpose-First Planning
**Every plan MUST open with a Purpose section** stating the user's exact goal in their own words. All subsequent work is measured against this stated purpose. If at any point the agent's actions diverge from the purpose — reframing failure as success, deprioritizing the goal, or substituting a different objective — the agent has failed. The purpose is not the agent's to redefine.

---

## 5. Process

### Git
Use `git ac "message"` alias. Run commands separately, never `&&`.
**⛔ NEVER push to `live` branch.** Commit working state FIRST.

### Browser
**⛔ NEVER open browser/subagent unless user gives explicit permission.**

### Debugging — TRACE FIRST, ALWAYS
**⚠️ MANDATORY: Do NOT speculate about causes before tracing the actual code path.**
1. **TRACE FIRST**: Read the actual code path end-to-end. Follow data from input to output. Gather objective facts.
2. Accept user observations as ground truth — they see the running app, you do not.
3. Only AFTER tracing, form hypotheses ranked by evidence from the trace.
4. If "it used to work" → trace what changed: `git log -p --follow`, diff configs, diff data formats.
5. Never claim fixed without user verification.
6. **Do NOT speculate → dismiss → re-speculate** in internal reasoning. Each "wait, actually" is a sign you skipped step 1.

---

## 6. Repeated Failures

| Failure | Rule |
|---------|------|
| Declaring "fixed" without testing | Say "please verify" |
| Using console.log | Use `log.sys()` etc. |
| Guessing type signatures | Read the definition first |
| Removing user controls | Never without instruction |
| Using npm/npx/yarn | Bun only |
| Chaining with && | Run separately |
| Reading GAME_CONFIG in templates | Use panel.$state pattern |
| Setting timid slider ranges | **10X rule**: 10× the "reasonable" range |
| Declaring assumptions as facts | Conditional language; verify first |

---

## 7. File Reference (Ontology E)

| Need | Load |
|------|------|
| Game mechanics (ground truth) | `docs/game/design/MECHANICS.md` |
| Master game spec | `docs/game/design/GAME_SPECIFICATION.md` |
| Terminology & jargon | `docs/game/design/TERMINOLOGY.md` |
| Feature status / bugs | `docs/project/features/FEATURE_STATUS.md` |
| Feature ideas | `docs/project/features/FEATURE_IDEAS.md` |
| Design decisions | `docs/project/decisions/DECISIONS.md` |
| Territory architecture | `docs/game/territory/TERRITORY_ARCHITECTURE.md` |
| Naming conventions | `docs/engineering/NAMING_CONVENTIONS.md` |
| UI/Design rules | `docs/atlas/DESIGN_RULES.md` |
| Work history | `docs/project/WORK_HISTORY.md` |
| Active rules | `.agent/rules/` |

---

## 8. Post-Mortem Process

Write to `docs/project/process/post-mortem_YYYY-MM-DD-<name>.md` when: agent declares "done" but didn't, same bug recurs, agent fails explicit instruction, or user corrects something obvious.

```
# Post-Mortem: [Date] — [Short Title]
## What Happened — factual
## Root Cause — systemic
## Impact — time/trust/quality
## Corrective Actions — rules/standards changed
## Lessons — internalize
```
