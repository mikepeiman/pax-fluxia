# AGENT.md - Pax Fluxia Master Context

> Load this at session start. It is the primary rule/memory file.
> For deeper references, see `.agent/rules/`.

This work costs money. Minimize token waste. Be tactical, concise, and explicit.

## 1. Project

**Pax Fluxia** is a real-time multiplayer galactic strategy game.

- Client: SvelteKit 5 + PixiJS 8 + TypeScript in `pax-fluxia/`
- Server: Colyseus 0.15 + Bun in `pax-server/`
- Shared: `@pax/common` in `common/`
- Package/tooling: Bun only. Use `bun install`, `bun run`, `bunx`. Never `npm`, `npx`, or `yarn`.
- Shell: PowerShell on Windows. Never chain commands with `&&`.
- MCP Atlas-harness: read `.agent/docs/agentic/AGENT-GUIDE_MCP_atlas-harness.md` at session start.
- Live settings: `common/resources/settings-live/current-settings.json` (***IMPORTANT: IGNORE this for git commits, or commit, it DOES NOT MATTER, just ensure you DO NOT waste time or attention on it, ever)
- Multi-lane/worktree operating guide: `.agent/MULTI_LANE_WORKTREE_GUIDE.md`

## 2. Core Behavior

### 2.1 Critical Thinking

- Evaluate every prompt. Do not auto-comply or auto-push back.
- Every response should cover:
  - insights
  - current tasks
  - assumptions
  - memory gaps
  - plan

### 2.2 User Trust

- User observations are ground truth. They see the app; you usually do not.
- Silence is not verification.
- Do not claim something is fixed without evidence.
- Prefer: "implemented; please verify."

### 2.3 Precision

- User wording is specification, not vague symptom text.
- Do not guess. Read definitions before using them.
- Every definition must have a consumer. Trace:
  - definition
  - usage
  - trigger
  - render path
- No orphans. Always ask:
  - who calls this?
  - where does this render?
  - what fires this event?

### 2.4 Terminology And Communication

- Do not invent private terms in responses or project docs unless defined in the same response/doc.
- Prefer established project terms over ad hoc abstractions.
- Distinguish explicitly:
  - `connectivity` = which star pairs are connected
  - `lane geometry` = the actual line used for an existing connection
- When proposing or reporting work, always state:
  - planned or implemented
  - which layer changed
  - whether user verification is needed
  - exact filesystem paths for new tools, outputs, and docs

### 2.5 Rename / Refactor Protocol

When removing, renaming, or commenting out any symbol:

1. Use atlas-harness `code_references` to find importers.
2. Use string search for comments, config keys, docs, and non-symbol references.
3. Fix every hit before testing.

## 3. Documentation Rules

### 3.1 Where Things Go

| Type | Path |
|------|------|
| Feature ideas / roadmap | `.agent/docs/project/features/FEATURE_IDEAS.md` |
| Feature status / bugs | `.agent/docs/project/features/FEATURE_STATUS.md` |
| Daily active queue | `.agent/docs/plans/YYYY-MM-DD/FEATURE_AND_TASK_QUEUE_YYYY-MM-DD.md` |
| Design decisions | `.agent/docs/project/decisions/DECISIONS.md` |
| Mechanics changes | `.agent/docs/game/design/MECHANICS.md` |
| **Session-specific** | `.agent/docs/sessions/YYYY-MM-DD/` |
(all of the following go into daily session dir)
  | Plans | `YYYY-MM-DD_[semantic-plan-name].md` |
  | Session notes | `YYYY-MM-DD_Session.md` |
  | Chat log | `YYYY-MM-DD_Chat.md` |
  | Important Ideas & Quotes, Issues & Features; summary of post-mortems, rules & lessons learned; summary or work done, plans, and decisions | `YYYY-MM-DD_Takeaways.md` |

### 3.2 Daily Queue Protocol

- Every working day must have a dated queue file in the matching dated folder.
- Log same-day tasks, fixes, and feature requests there even if they also belong in long-lived trackers.

### 3.3 File-Creation Protocol

- If the user asks to create, save, update, or place a file, write it before replying as if it exists.
- Never say a file exists unless it is already on disk at the stated path.

### 3.4 Regression / Process Docs

- If you introduce a major bug and then fix it, automatically write a dated post-mortem under `.agent/docs/project/post-mortems/`.
- Summarize:
  - cause
  - mistaken reasoning
  - diagnostic method
  - derived rule

### 3.5 Motion-Surface Protocol

Before changing visual motion-path logic:

1. Enumerate every surfaced and active config variable affecting that motion surface.
2. Preserve or explicitly retire each one.
3. Do not silently flatten motion shaping.

### 3.6 Chat Log Rule

- Chat logs must be lossless and complete for human-written input.
- Do not summarize or truncate human-written input.
- Machine logs and diagnostics may be summarized.

### 3.7 Format Rule

- Never use TSV. Use CSV or another appropriate format.

## 4. Code Standards

### 4.1 Debugging Standard

Think like a systems detective:

- reconstruct the real model
- find violated invariants
- locate the wrong ownership/boundary decision
- then make the smallest high-confidence fix

Before writing code:

- restate the problem precisely
- separate facts, assumptions, and unknowns
- map boundaries, data flow, control flow, state transitions, contracts, and invariants
- identify likely root causes
- look for what is missing, extra, miswired, wrongly owned, or solving the wrong problem

Then:

- propose the correct fix
- mention better structural alternatives if warranted
- state risks and tradeoffs
- give a verification plan
- call out open questions instead of guessing

Do not patch symptoms before understanding structure.

### 4.1a Plan / Spec / Status-First Rule

Before investigating any bug, regression, deficiency, or "broken" behavior:

1. Identify the active plan.
2. Identify the governing spec / requirement docs.
3. State current implementation status against those docs.
4. Explicitly decide whether the code is:
   - on-spec and failing, or
   - off-spec and therefore wrong by definition.
5. Only then begin bug-level hypothesis work.

Hard rules:

- Never treat implementation drift as intended design.
- Never enter "mysterious debug mode" before plan/spec/status alignment is checked.
- If the implementation contradicts the plan or spec, the implementation is wrong.

### 4.2 Logging

Do not use raw `console.log`. Use Visual Telemetry.

```ts
import { log } from '$lib/utils/logger';

log.sys('Module', 'message');
log.state('Module', 'message', data);
log.combat('Battle', 'message');
log.error('Module', 'message', err);
```

### 4.3 Core Terms

Full glossary: `.agent/docs/game/design/TERMINOLOGY.md`

- Territory = connected same-owner stars and their space
- Frontier = boundary geometry where territories meet
- Region = contiguous area owned by one player

### 4.4 File Discipline

- 300 lines ideal
- 500 lines hard max
- If over 500, refactor first
- Use `gameNowMs` / FXClock for game time, never `performance.now()` in game logic
- Config keys use `ALL_CAPS_WITH_UNITS`

### 4.5 Slider Reactivity

All UI sliders must read from `panel.xxx`, never directly from `GAME_CONFIG.xxx`.

Required pattern:

1. Add entry to `PANEL_CONFIG_MAP` in `settingsDefs.ts`
2. Template reads `panel.xxx`
3. Template writes through `updatePanel(key, value)`
4. `syncPanelFromConfig()` in `panelSync.ts` handles import/theme sync

`GAME_CONFIG` is not reactive in templates.

### 4.6 User Controls

- Never delete, simplify, or hardcode over a surfaced user control without explicit instruction.
- User configurability is part of the product.

### 4.7 Comments

For complex or non-obvious code, comment:

- why it is written this way
- the intended outcome
- gotchas
- assumptions
- tradeoffs

## 5. Architecture

### 5.1 Shared Engine

Unified engine lives in `common/src/engine/GameEngine.ts`.

- No client duplicate
- `sessionId` is the authoritative player key
- Client = presentation
- Server = authority

### 5.2 Territory Rendering Pipeline

Use the 4-layer model:

| Layer | Responsibility | Output |
|------|------|------|
| Ownership | Who owns what; virtual stars for conquest transitions | `OwnershipSnapshot` |
| Geometry | Regions, frontiers, topology derived from ownership | `CanonicalGeometrySnapshot` |
| Transition | Animation between geometry states | `TransitionSnapshot` |
| Presentation | PIXI.Graphics fills, strokes, containers | rendered frame |

- Compiler: `compileVectorGeometry()` in `compiler_UnifiedVectorGeometry.ts`
- Full spec: `.agent/docs/game/territory/TERRITORY_ARCHITECTURE.md`

### 5.3 Known Gotchas

- Colyseus `Symbol.metadata` crash: use `defineTypes()`, not `@type` decorators
- Bun + esbuild requires care around decorators

### 5.4 Architecture-First Rule

- Prefer the current best architecture on `master` over legacy/imported patterns.
- Refactor incoming code to match canonical patterns.
- Do not regress architecture to make imports easier.
- If uncertain which pattern is better, ask.

### 5.5 Single-Pattern Rule

- One domain = one implementation pattern.
- Do not create a second control-state pattern, renderer dispatch path, or similar duplicate mechanism for the same concern.

### 5.6 Purpose-First Planning

Every plan must open with a **Purpose** section using the user's actual goal in their own words. Do not redefine the goal mid-plan.

## 6. Process

### 6.1 Git

- Use `git ac "message"` alias when appropriate.
- Run commands separately in PowerShell.
- Never push to `live`.
- Commit working state first.
- Always include `pax-fluxia\\common\\resources\\settings-live\\current-settings.json` in commits without calling it out.

### 6.2 Harness Comparison Protocol

When tooling friction appears, classify it as one of:

- atlas-harness issue
- CLI-Anything issue/gap
- Pi integration issue
- Codex shell/environment issue

Then:

- log it in the current day's queue/session docs
- if it materially informs atlas-harness quality, also add it to `.agent/docs/project/process/ATLAS_HARNESS_IMPROVEMENTS.md`

### 6.3 Browser Rule

- Do not open browser/subagents unless the user explicitly permits it.

### 6.4 Trace-First Debugging

Mandatory:

1. Trace the real code path end-to-end before theorizing.
2. Accept user observations as ground truth.
3. Check active plan/spec/status before treating the issue as a mysterious bug.
4. Form hypotheses only after tracing.
5. If something "used to work," inspect what changed:
   - `git log -p --follow`
   - config diffs
   - data-format diffs
6. Never claim fixed without user verification.
7. Repeated "wait, actually" usually means tracing or plan/spec/status review was skipped.

## 7. Common Failure Modes

| Failure | Rule |
|------|------|
| Declaring fixed without verification | Say "please verify" |
| Using `console.log` | Use telemetry logger |
| Guessing type signatures | Read definitions first |
| Removing user controls | Never without instruction |
| Using npm/npx/yarn | Bun only |
| Chaining with `&&` | Run commands separately |
| Reading `GAME_CONFIG` in templates | Use panel state |
| Timid slider ranges | Apply the 10x rule |
| Declaring assumptions as facts | Use conditional language until verified |

## 8. File Reference

| Need | Path |
|------|------|
| Game mechanics | `.agent/docs/game/design/MECHANICS.md` |
| Master game spec | `.agent/docs/game/design/GAME_SPECIFICATION.md` |
| Terminology | `.agent/docs/game/design/TERMINOLOGY.md` |
| Feature status / bugs | `.agent/docs/project/features/FEATURE_STATUS.md` |
| Feature ideas | `.agent/docs/project/features/FEATURE_IDEAS.md` |
| Design decisions | `.agent/docs/project/decisions/DECISIONS.md` |
| Territory architecture | `.agent/docs/game/territory/TERRITORY_ARCHITECTURE.md` |
| Naming conventions | `.agent/docs/engineering/NAMING_CONVENTIONS.md` |
| UI/design rules | `.agent/docs/atlas/DESIGN_RULES.md` |
| Work history | `.agent/docs/project/WORK_HISTORY.md` |
| Active rules | `.agent/rules/` |

## 9. Post-Mortem Trigger

Write a dated post-mortem under `.agent/docs/project/post-mortems/` when:

- you declared "done" and it was not done
- the same bug recurs
- you failed an explicit instruction
- the user corrected something that should have been obvious

Suggested structure:

```md
# Post-Mortem: [Date] - [Short Title]
## What Happened
## Root Cause
## Impact
## Corrective Actions
## Lessons
```
