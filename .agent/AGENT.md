# AGENT.md - Pax Fluxia Master Context

> Load this at session start. It is the primary rule/memory file.
> For deeper references, see `.agent/rules/`.

This work costs money. Minimize token waste. Be tactical, concise, and explicit.

RULE: Prompts are part of the engineering; they must be captured losslessly as part of project documentation, with every chat exchange.

IDENTITY & STANDARDS: You must be responsible for tasks such that, upon review of your work, your work could NEVER be judged as failure of end-to-end ownership, verification discipline, and reporting integrity.

## ⭐ RULE 0 — SEARCH THE WHOLE PROJECT FIRST. ALWAYS.

Before you conclude ANYTHING about where a name, value, variable, selector, token, label, config key, component, or behavior lives or comes from — **grep the entire repository for it. Every time. No exceptions.** Never guess the element, the file, the source, or which CSS rule wins a cascade. Search is essentially free and 100% authoritative; guessing wastes whole turns and produces false "done" claims.

- "Why does the UI look like X?" → grep the literal on-screen text AND the relevant class/selector across all of `src`. Find EVERY matching rule, then determine the cascade/specificity winner from evidence — never assume the nearest/first rule wins.
- "Is feature Y wired?" → trace the FULL chain (data source → consumer → renderer) by search. If you edited array A, confirm the renderer actually iterates A before claiming the feature appears.
- Enumerate ALL locations before claiming completeness. A single match is rarely the whole story.
- NEVER report something added/fixed/working until search (or the user) confirms the real mechanism.

This is the #1 historical failure mode on this project. Internalize it.

## ⭐ RULE 0.1 — DESIGN BY PROTOCOL, NOT INSTINCT.

Before any UI/design change, run the design-question protocol in `.codex/skills/design-protocol/SKILL.md` (the `design-protocol` skill). Do not edit on instinct; do not claim you need a screenshot to design — THINK. The protocol catches duplicated labels/values, boxes-in-boxes, and nested scrolls before they ship.

## ⭐ RULE 0.2 — BIAS TO LESS CODE.

When a defect can be fixed by REMOVING the redundant root (duplicate markup, parallel data structure, dead branch) or by ADDING a compensating layer (override, flag, wrapper) — default to REMOVING. Collapse parallel structures to a single source of truth; don't keep two in sync. Edit-count efficiency ≠ code-size efficiency: prefer the fix that leaves less code even if it's more edits. (Never delete an actual user-facing control without instruction.)

## ⭐ RULE 0.25 — DESIGN = SYSTEM. FIX THE SOURCE, NOT THE INSTANCE.

For any UI/design work, read `.agent/rules/design-agent.md` FIRST. Core rule: a
design system means a defect is fixed ONCE at the source (token / variant /
component / global element rule) so EVERY instance changes together. Never patch
one call site. When you fix one thing, fix the underlying component or token, then
verify across all instances. "Consistent with an ugly system" is not acceptable —
fix the system to be good.

## ⭐ RULE 0.3 — QUESTION WHETHER IT SHOULD EXIST. EXISTING ≠ CORRECT.

Never assume that something already in the code/design/architecture SHOULD be there. Look with fresh eyes and ask "should this exist at all?" first — for every element, card, section, control, abstraction, and description. AI agents reify the existing (treat what's there as intentional and load-bearing) and preserve/route-around cruft instead of deleting it; that bias is wrong by default. A card wrapping a single control, a toggle that controls nothing, prose under a heading, a whole section the user didn't ask for — all suspect, all removable. "A previous agent added it" is not a reason to keep it. (This licenses removing cruft/wrappers/noise/dead options — NOT deleting real user-facing controls without instruction; when unsure which, search and ask.)

## 1. Project

**Pax Fluxia** is a real-time multiplayer galactic strategy game.

- Client: SvelteKit 5 + PixiJS 8 + TypeScript in `pax-fluxia/`
- Server: Colyseus 0.15 + Bun in `pax-server/`
- Shared: `@pax/common` in `common/`
- Package/tooling: Bun only. Use `bun install`, `bun run`, `bunx`. Never `npm`, `npx`, or `yarn`.
- Shell: PowerShell on Windows. Never chain commands with `&&`.
- MCP Atlas-harness: read `.agent/docs/agentic/AGENT-GUIDE_MCP_atlas-harness.md` at session start.
- Live settings: `common/resources/settings-live/current-settings.json` (***IMPORTANT: IGNORE this for git commits, or commit, it DOES NOT MATTER, just ensure you DO NOT waste time or attention on it, ever)
- **Intra-agent coordination (READ AT SESSION START):** all agents share `master` in one root. Before editing files, read and claim on the board `.agent/intra-agent-coordination.md` (protocol: `.agent/2026-06-21_intra-agent-coordination-proposal.md`). This prevents two agents editing the same files at once.
- Multi-lane/worktree operating guide: `.agent/MULTI_LANE_WORKTREE_GUIDE.md` (RETIRED — superseded by the single-master coordination board above)
- **Logging panel**: there is a custom telemetry logger (`$lib/utils/logger`: `log.sys/state/data/net/error/success/combat/conquest/input/repair/canvas/renderer`) gated per-category by `logFlags` (persisted to `localStorage['pax_logFlags']`, exposed on `window.logFlags`) and surfaced as a **full UI panel of toggleable log categories** (the Logging debug controls) so the user can hide console noise. Most categories default **OFF**; only `error` and `canvas` default **ON**. Consequences (see §5.2): never use raw `console.log`; never tell the user to enable flags via console commands. For a diagnostic the user must SEE, either log on a default-ON channel (`canvas`) or instruct them to enable that category in the Logging UI panel — and confirm the channel actually emits by default before saying "paste the log line."

## 2. Core Behavior

### 2.0 Communication

The user interacts with the app through UI. A tuning surface is UI, not code. When changing behavior, describe what changed in the UI and what the user should look for precisely.

Do not use prohibited terminology called out by the user.

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

### 2.2a Forward-Fix Rule

When the user reports that a new feature does not show, regresses visually, or behaves incorrectly:

- Do not broadly revert or throw away unverified implementation work as the default response.
- Treat the report as a request to diagnose and continue developing the feature forward.
- First identify the exact code path that is failing, including the UI control, config value, dispatch path, runtime path, and render primitive involved.
- Make targeted fixes that preserve the intended feature direction and user-visible progress.
- If a risky subpath must be disabled temporarily, keep the feature path intact, document the disabled subpath, and state what remains to complete.
- Revert only when the user explicitly asks for a revert, when a change is unsafe/destructive, or when a tiny last-change revert is the clearly smallest targeted fix. State the reason before doing it.
- Never replace a broken new implementation with an older untested path and present that as progress.

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

Rule: Do not use decorative rhetoric in technical planning. Prefer precise claims, explicit uncertainty, minimal metaphor, and no repeated punchline fragments. Every sentence should either define, constrain, compare, correct, or advance the design.

Epistemic humility and accuracy: false certainty and false uncertainty are both equally degrading to clear understanding and communication, and antithetical to engineering and problem-solving.

### 2.5 Rename / Refactor Protocol

When removing, renaming, or commenting out any symbol:

1. Use atlas-harness `code_references` to find importers.
2. Use string search for comments, config keys, docs, and non-symbol references.
3. Fix every hit before testing.

## 3. Documentation Rules

### RULE:
> Create all new files with date leading the filename. eg `2026-05-18_some-semantic-title.md`
> This does NOT mean "make a new file for every task"! The correct files to create are a finite set specified in the section `(all of the following go into daily session dir)`. 
> If making meaningful revisions to a document as part of a dialogue with human, do not overwrite prior versions of file; save new version with a `V#` version appended to the filename.
> Use a frontmatter section in all docs. Create new docs with it; add it to docs you touch.
```text
---
date created:
last updated:
last updated by: [AI / human]
relevant prior docs:
superseding docs:
---
```

### 3.1 Where Things Go

| Type                    | Path                                            |
| ----------------------- | ----------------------------------------------- |
| Feature ideas / roadmap | `.agent/docs/project/features/FEATURE_IDEAS.md` |
| Design decisions        | `.agent/docs/project/decisions/DECISIONS.md`    |
| Mechanics changes       | `.agent/docs/game/design/MECHANICS.md`          |
| **Session-specific**    | `.agent/docs/sessions/YYYY-MM-DD/`              |
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

- If you introduce a bug and then fix it, automatically write a dated post-mortem under `.agent/docs/project/post-mortems/`.
- Summarize:
  - cause
  - mistaken reasoning
  - diagnostic method
  - derived rule

### 3.5 Chat Log Rule

- Chat logs must be lossless and complete for human-written input.
- Do not summarize or truncate human-written input.
- Machine logs and diagnostics may be summarized.

### 3.6 Format Rule

- Never use TSV. Use CSV or another appropriate format.

## 4. UI And UX

### 4.1 Product Surface Principle

- UI is the user's product surface. Treat visible controls, labels, disabled states, and diagnostics as product behavior, not decoration.
- A setting intended for tuning must be represented by a coherent UI surface or by diagnostics if it is not player-facing.
- Never present a code-only knob as though it is a usable tuning surface.
- After UI work, report the exact UI path, expected visual/behavioral result, and anything still requiring user verification.

### 4.2 Control Integrity

- Every active visible control must have a real consumer in the active runtime path and must be able to affect what the user is currently configuring.
- Do not expose a player-facing control that stores state but cannot affect the current mode, shape, backend, feature state, or workflow.
- Shape-, mode-, backend-, role-, and state-specific controls must be visibly scoped, disabled when inactive, or moved into the relevant scoped section.
- If a control is future work, diagnostic-only, or currently unimplemented, do not present it as an active player-facing control.
- Before adding or modifying a control, trace: visible label, panel key, config key, write path, read path, runtime consumer, active/inactive conditions, diagnostics, and expected user-visible effect.
- If a control appears to do nothing, treat that as a defect until proven otherwise.

### 4.3 Slider Reactivity

All UI sliders must read from `panel.xxx`, never directly from `GAME_CONFIG.xxx`.

Required pattern:

1. Add entry to `PANEL_CONFIG_MAP` in `settingsDefs.ts`
2. Template reads `panel.xxx`
3. Template writes through `updatePanel(key, value)`
4. `syncPanelFromConfig()` in `panelSync.ts` handles import/theme sync

`GAME_CONFIG` is not reactive in templates.

### 4.4 Existing User Controls

- Never delete, simplify, or hardcode over a surfaced user control without explicit instruction.
- User configurability is part of the product.
- Before removing, hiding, renaming, disabling, or making irrelevant any visible control, inventory the control, its config key, its runtime consumer, and its diagnostic/product status.
- Preserve product controls unless the user explicitly retires them.
- Diagnostic-only controls must move to diagnostics, not silently disappear.

### 4.5 Motion-Surface Protocol

Before changing visual motion-path logic:

1. Enumerate every surfaced and active config variable affecting that motion surface.
2. Preserve or explicitly retire each one.
3. Do not silently flatten motion shaping.

## 5. Code Standards

### 5.1 Debugging Standard

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

### 5.1a Plan / Spec / Status-First Rule

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

### 5.2 Logging

Do not use raw `console.log`. Use Visual Telemetry.

Runtime log toggles must be surfaced through the existing Logging debug controls. Do not tell the user to enable project log flags by running console commands; console filters are acceptable only for filtering visible log output after the UI logging switch is enabled.

Diagnostic traces must be idle-quiet. A trace toggle must not emit frame-by-frame logs while the relevant event is absent or paused; emit on event start/end, gate changes, coarse progress steps, or explicit state changes.

Narrow diagnostic toggles must not mutate broad log-channel toggles. If a mode-specific trace needs independent output, add a scoped telemetry method instead of turning on a noisy category such as renderer.

```ts
import { log } from '$lib/utils/logger';

log.sys('Module', 'message');
log.state('Module', 'message', data);
log.combat('Battle', 'message');
log.error('Module', 'message', err);
```

### 5.3 Core Terms

Full glossary: `.agent/docs/game/design/TERMINOLOGY.md`

- Territory = connected same-owner stars and their space
- Frontier = boundary geometry where territories meet
- Region = contiguous area owned by one player

### 5.4 File Discipline

- 300 lines ideal
- 500 lines hard max
- If over 500, refactor first
- Use `gameNowMs` / FXClock for game time, never `performance.now()` in game logic
- Config keys use `ALL_CAPS_WITH_UNITS`

### 5.5 Comments

For complex or non-obvious code, comment:

- why it is written this way
- the intended outcome
- gotchas
- assumptions
- tradeoffs

### 5.6 Svelte component conventions

Components mix Svelte 4 (`export let`) and Svelte 5 runes (`$props`/`$state`/`$derived`/`$effect`) — match the style of the file you are editing. When a component uses runes, type props by **annotating the destructure**, never by passing a generic to `$props()`. The annotation form is the one used everywhere in the codebase; match it for consistency.

- ✅ `let { onPlay }: { onPlay: () => void } = $props();`
- ❌ `let { onPlay } = $props<{ onPlay: () => void }>();`

## 6. Architecture

### 6.1 Shared Engine

Unified engine lives in `common/src/engine/GameEngine.ts`.

- No client duplicate
- `sessionId` is the authoritative player key
- Client = presentation
- Server = authority

### 6.2 Territory Rendering Pipeline

Use the 4-layer model:

| Layer        | Responsibility                                        | Output                     |
| ------------ | ----------------------------------------------------- | -------------------------- |
| Ownership    | Who owns what; virtual stars for conquest transitions | `OwnershipSnapshot`        |
| Geometry     | Regions, frontiers, topology derived from ownership   | `ResolvedGeometrySnapshot` |
| Transition   | Animation between geometry states                     | `TransitionSnapshot`       |
| Presentation | PIXI.Graphics fills, strokes, containers              | rendered frame             |

- Compiler: `compileVectorGeometry()` in `compiler_UnifiedVectorGeometry.ts`
- Full spec: `.agent/docs/game/territory/TERRITORY_ARCHITECTURE.md`

### 6.3 Known Gotchas

- Colyseus `Symbol.metadata` crash: use `defineTypes()`, not `@type` decorators
- Bun + esbuild requires care around decorators

### 6.4 Architecture-First Rule

- Prefer the current best architecture on `master` over legacy/imported patterns.
- Refactor incoming code to match current project patterns.
- Do not regress architecture to make imports easier.
- If uncertain which pattern is better, ask.

### 6.5 Single-Pattern Rule

- One domain = one implementation pattern.
- Do not create a second control-state pattern, renderer dispatch path, or similar duplicate mechanism for the same concern.

### 6.6 Purpose-First Planning

Every plan must open with a **Purpose** section using the user's actual goal in their own words. Do not redefine the goal mid-plan.

## 7. Process

### 7.1 Git

- **Always push to `origin/master` after committing.** Every commit goes to the remote — never leave local-only commits sitting unpushed. (Still never push to `live`.)
- **Commit by explicit pathspec — the git index is SHARED across agents.** Use `git commit -- <your exact paths>`. `git add -A`, `git add <dir>`, `git commit -a`, and the add-all `git ac` alias can sweep another agent's in-flight work into your commit — do not use them in this single-root tree. Full rationale: `.agent/intra-agent-coordination.md`.
- Run commands separately in PowerShell.
- Commit working state first.
- Always include `pax-fluxia\\common\\resources\\settings-live\\current-settings.json` in commits without calling it out.
- Documentation changes are also fully qualified for commits.
- Commit every time a task is completed that anything in filesystem changed (then push — see first bullet).

### 7.2 Harness Comparison Protocol

When tooling friction appears, classify it as one of:

- atlas-harness issue
- CLI-Anything issue/gap
- Pi integration issue
- Codex shell/environment issue

Then:

- log it in the current day's queue/session docs
- if it materially informs atlas-harness quality, also add it to `.agent/docs/project/process/ATLAS_HARNESS_IMPROVEMENTS.md`

### 7.3 Browser Rule

- Do not open browser/subagents unless the user explicitly permits it.

### 7.4 Trace-First Debugging

Trace the real code path end-to-end, and form hypotheses only AFTER tracing — never theorize first. Preconditions: plan/spec/status alignment (§5.1a) and user observations as ground truth (§2.2).

- If something "used to work," inspect what changed before anything else: `git log -p --follow`, config diffs, data-format diffs.
- Repeated "wait, actually" reversals usually mean tracing or plan/spec/status review was skipped — stop and re-trace.

## 8. Common Failure Modes

| Failure                              | Rule                                    |
| ------------------------------------ | --------------------------------------- |
| Declaring fixed without verification | Say "please verify"                     |
| Using `console.log`                  | Use telemetry logger                    |
| Guessing type signatures             | Read definitions first                  |
| `$props<T>()` generic prop typing    | Annotate the destructure (§5.6)         |
| Removing user controls               | Never without instruction               |
| Using npm/npx/yarn                   | Bun only                                |
| Chaining with `&&`                   | Run commands separately                 |
| Reading `GAME_CONFIG` in templates   | Use panel state                         |
| Active no-op UI control              | Scope, disable, hide, or implement it  |
| Timid slider ranges                  | Apply the 10x rule                      |
| Declaring assumptions as facts       | Use conditional language until verified |

## 9. File Reference

| Need                   | Path                                                   |
| ---------------------- | ------------------------------------------------------ |
| Game mechanics         | `.agent/docs/game/design/MECHANICS.md`                 |
| Master game spec       | `.agent/docs/game/design/GAME_SPECIFICATION.md`        |
| Terminology            | `.agent/docs/game/design/TERMINOLOGY.md`               |
| Feature status / bugs  | `.agent/docs/project/features/FEATURE_STATUS.md`       |
| Feature ideas          | `.agent/docs/project/features/FEATURE_IDEAS.md`        |
| Design decisions       | `.agent/docs/project/decisions/DECISIONS.md`           |
| Territory architecture | `.agent/docs/game/territory/TERRITORY_ARCHITECTURE.md` |
| Naming conventions     | `.agent/docs/engineering/NAMING_CONVENTIONS.md`        |
| UI/design rules        | `.agent/docs/atlas/DESIGN_RULES.md`                    |
| Work history           | `.agent/docs/project/WORK_HISTORY.md`                  |
| Active rules           | `.agent/rules/`                                        |

## 10. Post-Mortem Trigger

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
