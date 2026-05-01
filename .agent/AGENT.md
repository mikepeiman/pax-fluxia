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

### 2.1a Multi-Level Intent

- Always reason at three levels before making a design or implementation decision:
  - project objective
  - feature objective
  - current player-visible moment
- Lower-level technical choices must strengthen the higher-level player-visible objective, not merely simplify implementation.
- If a technical shortcut constrains a core choice in the key user moment, do not silently hardcode it as if it were product design.
- In that situation, either:
  - expose it as a real, understandable UX choice, or
  - make it a deliberate opinionated default and remove any false suggestion that the user can or should control it.
- Never let prototype safety defaults masquerade as finished product decisions.
- When a mode has materially different live controls from the shared family shell, give it its own truthful settings surface instead of reusing a misleading generic one.

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

### 4.6a Control Coherence

- Visible controls are promises. Do not surface a control whose interaction paths disagree about whether it is live.
- If a control is inactive in the current mode, either:
  - hide it, or
  - render it as explicit read-only status.
- Do not leave a control visibly interactive while only some of its input paths actually work.
- Auxiliary affordances count as part of the control:
  - nudge buttons
  - keyboard input
  - drag/track input
  - focus/hover states
- Shared input helpers must respect `disabled` state unless there is an explicit product decision not to.

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

## 10. Active Worktree Handoff

### 2026-04-30 - Metaball-Grid Replacement Planning

- Lane: `render-family/metaballGrid` (planning/docs only for this pass)
- User task: produce an implementation-ready non-metaball replacement plan for the existing `metaball-grid` conquest render mode, and keep one additive handoff ledger here for later merge work.
- Scope this pass: docs only. No runtime files under `pax-fluxia/src/` were edited.

#### Pass Log

1. Pass 1 - Loaded the governing repo rules and the user's external brief. Confirmed the live territory architecture is a mixed system: pipeline runtime, partial render-family runtime, and direct legacy renderers. Confirmed the existing `metaball_grid` and `perimeter_field` families already rely on `PREV/NEXT` geometry seams and that `RenderFamilyInput.prevGeometry` is the current upstream truth handoff contract.
2. Pass 2 - Traced the exact implementation seams the replacement must target: `pax-fluxia/src/lib/territory/families/RenderFamilyTypes.ts`, `pax-fluxia/src/lib/territory/families/buildRenderFamilyInput.ts`, `pax-fluxia/src/lib/territory/transitions/renderFamilyTransitionLifecycle.ts`, `pax-fluxia/src/lib/territory/ui/territoryRenderModeCatalog.ts`, `pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridFamily.ts`, `MetaballGridPhaseEdgesFamily.ts`, `metaballGridTypes.ts`, `planGridWave.ts`, `renderMetaballGridScene.ts`, and `pax-fluxia/src/lib/territory/families/perimeterField/PerimeterFieldFamily.ts`.
3. Pass 3 - Wrote the dated replacement architecture spec and supporting project docs. The recommendation is to preserve the current grid/phase scheduling value while deleting metaball presentation entirely: prototype with local `PRE/POST` RenderTexture compositing plus a conquest phase field, then harden toward an owner-texture or palette-texture production family behind the existing render-family contract.
4. Pass 4 - Ran an integrity pass on the written docs, including `git diff --check`, artifact presence checks, and a small ASCII punctuation cleanup in the new spec so the handoff stays stable on Windows tooling.

#### Artifacts

- Queue: `.agent/docs/plans/2026-04-30/FEATURE_AND_TASK_QUEUE_2026-04-30.md`
- Main spec: `.agent/docs/plans/2026-04-30/METABALL_GRID_REPLACEMENT_ARCHITECTURE_SPEC_2026-04-30.md`
- Session note: `.agent/docs/sessions/2026-04-30/2026-04-30_Session.md`
- Takeaways: `.agent/docs/sessions/2026-04-30/2026-04-30_Takeaways.md`
- Chat log: `.agent/docs/sessions/2026-04-30/2026-04-30_Chat.md`

#### Merge Note

- This pass is merge-safe and append-only in `.agent/**`.
- The only shared long-lived docs touched are `.agent/AGENT.md`, `.agent/docs/project/features/FEATURE_STATUS.md`, and `.agent/docs/project/decisions/DECISIONS.md`.
- No `GameCanvas`, config, family runtime, or settings-panel code was changed in this pass.
- `.agent/docs/sessions/` is gitignored by the repo-level `sessions/` rule in `.gitignore`. Treat the tracked handoff sources for this pass as `.agent/AGENT.md`, `.agent/docs/plans/2026-04-30/`, `FEATURE_STATUS.md`, and `DECISIONS.md`; the dated session files are local-only supporting notes.

### 2026-04-30 - Metaball-Grid Replacement Implementation

- Lane: `render-family/metaballGridPhaseField`
- User task: proceed from the approved replacement spec into a full runtime implementation, continuously and autonomously.
- Scope this pass: add a new non-metaball render-family mode that reuses the existing deterministic grid/phase planner but replaces cell-cloud presentation with geometry-based phase reveal and frontier emphasis.

#### Pass Log

1. Pass 1 - Re-traced the live runtime seams before editing: `GameCanvas.svelte` mode dispatch and family mount/unmount flow, `territoryRenderModeCatalog.ts`, `territory.config.ts`, `game.config.ts`, `settingsDefs.ts`, `ControlsSection-Territory.svelte`, `ControlsSection-Diagnostics.svelte`, `MetaballGridTuning.svelte`, `RenderFamilyTypes.ts`, `buildRenderFamilyInput.ts`, `buildFamilyGeometry.ts`, and the existing `metaballGrid` family/types/runtime helpers.
2. Pass 2 - Locked the first implementation shape: new mode id `metaball_grid_phase_field`; preserve the current grid classification + wave planning substrate; render NEXT geometry as the steady base; render PRE ownership only through phase-scheduled grid cells; add a frontier-emphasis pass rather than reintroducing metaball field blending.
3. Pass 3 - First source-edit wave will touch: `GameCanvas.svelte`, `territoryRenderModeCatalog.ts`, `territory.config.ts`, `game.config.ts`, `settingsDefs.ts`, `ControlsSection-Territory.svelte`, `ControlsSection-Diagnostics.svelte`, `MetaballGridTuning.svelte`, and a new family file under `src/lib/territory/families/metaballGrid/`.
4. Pass 4 - Landed the additive mode wiring. Runtime edits: imported and registered `MetaballGridPhaseFieldFamily`; added phase-field config-source overlay builder; added `metaball_grid_phase_field` geometry gating, mount/unmount handling, transition diagnostic snapshot support, render-family dispatch, and benchmark-family selection in `GameCanvas.svelte`. UI edits: added the new mode to `territoryRenderModeCatalog.ts`, generalized the Metaball Grid settings card copy for three family variants, exposed phase-field semantics in diagnostics, and locked wave-geometry selection in `MetaballGridTuning.svelte` for both phase-based variants while leaving shared grid/border styling live for phase field.
5. Pass 5 - Extended local perf tooling to include the new mode in `inAppConquestBench.ts`, then ran verification. `bun install` was required because this worktree had no dependencies installed. `bun run check` still fails on many pre-existing repo errors unrelated to this sprint, including existing `GameCanvas.svelte`, `game.config.ts`, and route/store issues. Filtered diagnostics showed no new Svelte errors in the touched settings files, only the repo's pre-existing unused-selector warnings. `bunx tsc --noEmit -p pax-fluxia/tsconfig.json` produced no hits for `MetaballGridPhaseFieldFamily.ts`; the only touched-file TypeScript errors in that pass were pre-existing `FrameStats` cast issues in `src/lib/perf/inAppConquestBench.ts`.
6. Pass 6 - Closed the handoff loop. Added the landed-prototype entry to `.agent/docs/project/features/FEATURE_STATUS.md`, reran `git diff --check` (clean except LF->CRLF normalization warnings on touched files), and recorded the final merge guidance here. Browser-based visual QA was not run because this lane did not have explicit browser permission; treat the implementation as code-complete but still awaiting in-app visual verification.
7. Pass 7 - Re-ran a targeted `bun run check` filter over `GameCanvas.svelte`, the touched settings surfaces, and `inAppConquestBench.ts` after the final handoff edits. Result stayed consistent with the earlier baseline: existing `GameCanvas.svelte` transition-mode typing errors remain, the touched settings files only emit existing unused-selector warnings, and `inAppConquestBench.ts` still reports the pre-existing `FrameStats` cast errors at lines 143 and 189. No new phase-field-specific checker failures surfaced in that targeted rerun.

#### Merge Note

- This implementation lane is intentionally additive: new mode + new family, not an in-place rewrite of `metaball_grid`.
- Shared conflict surfaces for the merge agent are now `GameCanvas.svelte`, `territoryRenderModeCatalog.ts`, the territory settings UI files, `inAppConquestBench.ts`, and config/status comments in `game.config.ts` plus `metaballGridStats.ts`.
- Existing docs/plans from the earlier planning pass remain the governing spec for intent; this section tracks concrete runtime integration as it lands.
- No new config namespace was added in this pass. The prototype deliberately reuses existing `METABALL_GRID_*` and shared surface tunables so the merge stays additive and low-conflict.
- Tracked handoff docs for the merge are `.agent/AGENT.md`, `.agent/docs/plans/2026-04-30/FEATURE_AND_TASK_QUEUE_2026-04-30.md`, `.agent/docs/project/decisions/DECISIONS.md`, and `.agent/docs/project/features/FEATURE_STATUS.md`. The `.agent/docs/sessions/2026-04-30/` notes remain local-only because `sessions/` is gitignored.
- The current worktree also contains untracked additive artifacts that are part of this sprint: `.agent/docs/plans/2026-04-30/` and `pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridPhaseFieldFamily.ts`. Include both when merging this lane.

### 2026-04-30 - Diagnostics Shell Stale Import Cleanup

- Lane: `ui/diagnostics-shell-drift`
- User task: resolve the Vite import-analysis failure for `$lib/components/ui/TransitionDebugPanel.svelte` and document the exact drift so the merge agent can reason about it later.
- Scope this pass: `pax-fluxia/src/lib/components/game/GameContainer.svelte` only.

#### Pass Log

1. Pass 1 - Traced the failure against plan/spec/status instead of restoring files blindly. `TransitionDebugPanel.svelte` was not missing by accident in `HEAD`; it was explicitly deleted in commit `1864360c` (`feat: add diagnostics settings shell for territory transitions`) when diagnostics moved into the settings-shell flow.
2. Pass 2 - Verified that the current source tree had no surviving producer for the old floating-panel event path. The only remaining references to `TransitionDebugPanel` and `pax-open-transition-debug-panel` were stale consumer code inside `GameContainer.svelte`.
3. Pass 3 - Removed the dead consumer path from `GameContainer.svelte`: deleted the missing component import, deleted the orphaned `showTransitionDebugPanel` state and `openTransitionDebugPanel()` helper, removed the legacy window event listener/removal for `pax-open-transition-debug-panel`, and removed the now-invalid `{#if showTransitionDebugPanel}` mount block.
4. Pass 4 - Fixed the second piece of refactor drift exposed by the checker: `GameContainer.svelte` still tried to force-open the legacy `"debug"` settings section even though `settingsRegistry.ts` now canonicalizes that destination as `"diagnostics"`. Updated the local force-open state and call site to `"diagnostics"` so ruler/diagnostics shortcuts still open the correct developer section in `GameSettingsPanel`.
5. Pass 5 - Verified the repair with targeted checks. A source-tree search returned no remaining `TransitionDebugPanel` or `pax-open-transition-debug-panel` references, and a filtered `bun run check` no longer reported `GameContainer.svelte` or the deleted panel symbol. Broader baseline checker failures elsewhere in the repo still exist and were not part of this pass.

#### Merge Note

- This is a drift-cleanup pass, not a feature add. The correct merge target is the refactored diagnostics-shell architecture in `HEAD`, not resurrection of `TransitionDebugPanel.svelte`.
- Shared conflict surface for this pass is `pax-fluxia/src/lib/components/game/GameContainer.svelte` only.

### 2026-04-30 - Phase-Field UX Guidance Post-Mortem

- Lane: `docs/post-mortem/phase-field-ux-guidance`
- User task: create a post-mortem for the erroneous guidance that told the user to adjust `Derived Geometry Input`, and evaluate the failure as an end-to-end DX/UX ownership problem.
- Scope this pass: docs only. No runtime or settings UI files changed.

#### Pass Log

1. Pass 1 - Re-read the exact shipped territory wording before writing the post-mortem. Confirmed that `Derived Geometry Input` lives in `ControlsSection-Territory.svelte` and is implemented by `TerritoryGeometrySourceTuning.svelte` as a selector for upstream geometry compilers (`power_voronoi_0319` vs `canonical_vector`), not a phase-field-specific visual outcome control.
2. Pass 2 - Classified the failure correctly: this was not just a bad sentence in chat. It was an end-to-end product failure where I explained the feature from the implementation graph instead of from the human experience of using it. The problem affects both DX and UX because it leaks architecture into the primary tuning story.
3. Pass 3 - Wrote a dated project post-mortem at `.agent/docs/project/post-mortems/2026-04-30_phase-field-internal-control-surfaced-as-user-guidance.md`. The doc records cause, mistaken reasoning, developer/player impact, and the derived rule that internal pipeline selectors must not be presented as primary feature UX.
4. Pass 4 - Added a concise generalized-principles addendum to the post-mortem so the lesson survives beyond this single control. The distilled rules now state the broader end-to-end standard: UX is the delivery boundary, defaults are part of the feature, source-of-truth switches must stay separate from appearance tuning, and implementation-language controls are diagnostics unless explicitly proven otherwise.

#### Merge Note

- This is a documentation/process pass only.
- The tracked merge artifacts for this pass are `.agent/AGENT.md` and `.agent/docs/project/post-mortems/2026-04-30_phase-field-internal-control-surfaced-as-user-guidance.md`.
- No code behavior changed. The post-mortem is intended to guide the follow-up UI correction work, not claim that correction is already implemented.

### 2026-04-30 - Territory And Diagnostics Source-Control Dedup Audit

- Lane: `ui/settings/territory-diagnostics-dedup`
- User task: audit the in-game `Territory` and `Diagnostics` settings sections for duplicated geometry-source controls, report the duplication, and remove the named `geometry source` / `source constraints` subsections entirely.
- Scope this pass: settings UI only. Runtime render logic was not changed.

#### Pass Log

1. Pass 1 - Audited the active Territory surface and confirmed two writable duplication paths inside `ControlsSection-Territory.svelte`: a standalone `Derived Geometry Input` card that mounted `TerritoryGeometrySourceTuning.svelte`, and a second inline mount of the same component under the Metaball Grid family card. Both duplicated shared topology controls already present in the Territory panel (`Minimum Star Margin`, CX lane-pair controls, corridor controls, DX controls).
2. Pass 2 - Traced the Diagnostics duplication path. `ControlsSection-Diagnostics.svelte` mounts `PerimeterFieldDiagnosticsPanel.svelte`, which in turn mounted the full `PerimeterFieldTuning.svelte` editor. Inside that editor, the `Source` module contained a second duplicated writable surface for `Base Geometry Source` plus the `Source Constraints` stack, re-exposing the same shared topology controls from Territory tuning.
3. Pass 3 - Removed the duplicate subsections entirely. Deleted the standalone `Derived Geometry Input` card from `ControlsSection-Territory.svelte`, removed the inline `TerritoryGeometrySourceTuning` mount from the Metaball Grid card, removed the `source` module from `PerimeterFieldTuning.svelte`, deleted the now-orphaned `TerritoryGeometrySourceTuning.svelte` component, and removed the stale `Derived Geometry Input` label metadata entry from `settingMetadata.ts`.
4. Pass 4 - Added a small copy clarification in the Perimeter Field card that shared topology tuning owns the upstream MSR/CX/DX inputs. Also added a guard in `PerimeterFieldTuning.svelte` so saved panel state with the old `source` module key resets back to `all` instead of leaving the module view blank.
5. Pass 5 - Verified the cleanup with a source-tree sweep. No remaining live references to `TerritoryGeometrySourceTuning`, `Derived Geometry Input`, `Base Geometry Source`, `Source Constraints`, `Source MSR`, `Source CX*`, or `Source DX*` remain under `pax-fluxia/src/lib/components/ui/settings/`. Filtered `bun run check` only reported existing unused-selector warnings in the touched Svelte files; no new import or symbol-resolution failures surfaced for this pass.

#### Merge Note

- Functional conflict surfaces for this pass are `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`, `pax-fluxia/src/lib/components/ui/settings/PerimeterFieldTuning.svelte`, and `pax-fluxia/src/lib/components/ui/settings/settingMetadata.ts`.
- `pax-fluxia/src/lib/components/ui/settings/TerritoryGeometrySourceTuning.svelte` was intentionally deleted because it became orphaned after the duplicate mounts were removed.
- `ControlsSection-Diagnostics.svelte` and `PerimeterFieldDiagnosticsPanel.svelte` were part of the audit path but did not require direct edits; Diagnostics now inherits the deduped Perimeter Field editor automatically through the shared `PerimeterFieldTuning.svelte` component.

### 2026-04-30 - Borders Subsection Wiring And Utility Audit

- Lane: `ui/settings/borders-subsection-audit`
- User task: evaluate the Territory-panel `Borders` subsection toggle and its content end-to-end, determine whether it has any current or future utility, and trace where it was originally used before judging it.
- Scope this pass: audit and documentation only. No runtime or settings code changed.

#### Pass Log

1. Pass 1 - Traced the live Territory settings shell first instead of assuming the user meant a hidden control. The `Borders` chip is still actively mounted in `ControlsSection-Territory.svelte` for most modes via `rendererModules()`, and it still opens a `Border Transition` card with four writable controls: `Transition Easing`, `Resample Points`, `Frontier Resolution`, and `Back Overshoot`.
2. Pass 2 - Traced those four controls through config and runtime consumers. `BORDER_TRANS_EASING`, `BORDER_TRANS_RESAMPLE_N`, and `BORDER_TRANS_OVERSHOOT` still write through `debouncedConfigUpdate()` and remain defined in `settingsDefs.ts`, `settingMetadata.ts`, and `GAME_CONFIG`, but the modern clean/canonical runtime does not read them. `TerritoryRenderer.ts` hardcodes lerp behavior and only still honors `DEBUG_DY4_DISABLE_BORDER_TRANSITION` as a kill-switch. `planBorderTransition()` and the clean border-transition registry still exist under `src/lib/territory/layers/transition/`, but there are no active call sites for that planner in the current source tree.
3. Pass 3 - Traced the modern render entrypoints to determine whether the clean architecture could still reach border-transition modes through runtime selection. It currently cannot in any meaningful way. `GameCanvas.svelte` forces `borderTransitionMode: "off"` in the transition-diagnostic selection path, the canonical-power-voronoi bridge path, and the transition snapshot playback path. Outside of config normalization, devtools recording, and compatibility warnings, `selection.borderTransitionMode` is currently inert.
4. Pass 4 - Traced the remaining legacy consumers. The old PVV2 weighted renderer in `PowerVoronoiRenderer.ts` still reads `TERRITORY_BORDER_TRANSITION`, `BORDER_TRANS_EASING`, `BORDER_TRANS_RESAMPLE_N`, and `BORDER_TRANS_OVERSHOOT`, but only meaningfully uses those tunables when `TERRITORY_BORDER_TRANSITION === "pixi_mesh_rope"` and border transitions are not debug-disabled. There is no surviving current UI selector that lets a user choose that legacy border-transition mode, so the Borders card now exposes tuning for a path that is effectively unreachable through normal UI. `PowerVoronoiRenderer_DY4.ts` still honors only the debug disable flag, not the easing/resample/overshoot trio.
5. Pass 5 - Classified `Frontier Resolution` separately from the rest of the Borders card. It is not dead globally. It still feeds live geometry/compiler paths (`geometryTuning.ts`, `Geometry_0319.ts`, fingerprinting, and legacy PVV2 unified-polygon handling). The problem is taxonomy: `Frontier Resolution` is a geometry/topology control that survived inside a now-misleading `Borders` card.
6. Pass 6 - Inspected origin/history before evaluating utility. The Borders surface made sense in older commits such as `747027c6` and `9fd620c9`, where `Border Transition` was a first-class selector alongside style and fill transition, with explicit options like `smooth_morph`, `pressure_wave`, `pixi_mesh_rope`, and later `optimal_transport`. The current code kept the tuning card after the selector and its live runtime wiring were effectively retired, which is why the user is correctly experiencing the subsection as dead.

#### Merge Note

- This pass changed documentation only. No settings or runtime files were modified.
- Current classification for merge/review:
  - `Borders` subsection toggle/card: UI-visible but mostly orphaned.
  - `Transition Easing`, `Resample Points`, `Back Overshoot`: legacy-only tuning for an effectively unreachable PVV2 rope-morph path.
  - `Frontier Resolution`: still live, but misfiled under Borders rather than geometry/topology.
  - Clean-architecture border-transition planner/registry: scaffold remains, but it has no active planner call sites in current runtime dispatch.

### 2026-04-30 - Remove Dead Borders Subsection From Territory Settings

- Lane: `ui/settings/remove-dead-borders-subsection`
- User task: remove the dead `Borders` subsection from the in-game Territory settings after the audit established that it is not a valid current UX surface.
- Scope this pass: Territory settings UI and label metadata only. Legacy runtime/config keys were not deleted in this pass.

#### Pass Log

1. Pass 1 - Removed the `border-transition` renderer-module identity from `ControlsSection-Territory.svelte` and deleted the module chip registration. This removes the `Borders` toggle itself from the Territory tuning shell instead of merely hiding its card body.
2. Pass 2 - Deleted the full `Border Transition` card from `ControlsSection-Territory.svelte`. Removed its three dead legacy-only controls (`Transition Easing`, `Resample Points`, `Back Overshoot`) together with the misfiled `Frontier Resolution` slider that had been stranded inside that card.
3. Pass 3 - Rehomed `Frontier Resolution` into the live `Topology Rules` card under `Territory Tuning`, because the audit showed that this control still feeds active geometry/compiler paths and should remain user-facing. The moved control now writes through `queueTopologySliderUpdate()` with topology-owned copy instead of sitting under the removed Borders UX.
4. Pass 4 - Cleaned nearby surface copy so the UI no longer references a removed concept. Updated the Power Voronoi 0427 note to say that mode uses its own built-in border behavior instead of mentioning disabled `border-transition` paths.
5. Pass 5 - Removed stale label metadata for the deleted controls from `settingMetadata.ts` so `Transition Easing`, `Resample Points`, and `Back Overshoot` no longer linger as Territory-panel labels after the subsection was removed.
6. Pass 6 - Verified the removal with a source sweep. There are no remaining `border-transition`, `Transition Easing`, `Resample Points`, or `Back Overshoot` references in the active Territory settings file or its label metadata. `Frontier Resolution` still exists as a live Territory control, now under topology.

#### Merge Note

- Functional conflict surfaces for this pass are `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte` and `pax-fluxia/src/lib/components/ui/settings/settingMetadata.ts`.
- This pass intentionally removes only the user-facing Borders subsection. It does **not** delete the legacy config keys or legacy renderer consumers yet, because the prior audit confirmed they still exist in dormant/legacy code paths outside the current UI.
- Validation: `git diff --check` reported only LF→CRLF warnings on touched files, no whitespace errors. Full `bun run check` still fails on broad repo baseline issues unrelated to this pass; no new checker failures were observed in the touched Territory settings files.

### 2026-04-30 - Remove Redundant Metaball Grid Enabled Switch

- Lane: `ui/settings/remove-metaball-grid-enabled-switch`
- User task: remove the redundant `Metaball Grid Enabled` control, whose UX duplicated the render-mode selector and created a hidden second source of truth for whether the metaball-grid families would render.
- Scope this pass: settings UI, settings plumbing, and metaball-grid family gating. This pass intentionally makes render-mode selection authoritative for metaball-grid family visibility.

#### Pass Log

1. Pass 1 - Traced the surface before deleting it. Confirmed that `Metaball Grid Enabled` lived in `MetaballGridTuning.svelte`, had label metadata in `settingMetadata.ts`, settings-sync presence in `settingsDefs.ts`, theme-carried config presence in `categoryThemes.ts`, and live runtime consumers in the base `MetaballGridFamily`, `MetaballGridPhaseEdgesFamily`, and `MetaballGridPhaseFieldFamily`.
2. Pass 2 - Removed the user-facing toggle row and explanatory copy from `MetaballGridTuning.svelte`. This deletes the redundant control from the in-game settings surface instead of merely hiding it.
3. Pass 3 - Removed the corresponding user-surface plumbing: deleted the `Metaball Grid Enabled` label entry from `settingMetadata.ts`, removed `METABALL_GRID_ENABLED` from `settingsDefs.ts`, and removed it from the metaball-grid category-theme key list in `categoryThemes.ts`.
4. Pass 4 - Removed the hidden runtime gate from the three metaball-grid family variants. Deleted `METABALL_GRID_ENABLED` from the tunable key lists in `MetaballGridFamily.ts`, `MetaballGridPhaseEdgesFamily.ts`, and `MetaballGridPhaseFieldFamily.ts`, and removed the per-frame short-circuit blocks that hid the family when the flag was false. After this pass, selecting a metaball-grid family mode is the only authority for whether that family renders.
5. Pass 5 - Removed the now-dead config-default/type declarations from `metaballGrid/config.ts` and `game.config.ts`, and cleaned the remaining test fixtures in `MetaballGridFamily.test.ts` so search no longer suggests the switch is still part of active behavior.
6. Pass 6 - Fixed the only follow-on cleanup regression from this pass: `MetaballGridPhaseFieldFamily.ts` still needed its local `readTunableBoolean()` helper for `METABALL_GRID_BORDER_BLEND`, so the helper was restored after the `METABALL_GRID_ENABLED` gate itself was removed.
7. Pass 7 - Verified the removal with a source sweep. There are no remaining `METABALL_GRID_ENABLED`, `Metaball Grid Enabled`, or `metaballGridEnabled` references under `pax-fluxia/src/`. `git diff --check` reported only LF→CRLF warnings on touched files, no whitespace errors. Full `bun run check` still fails on broad repo baseline issues unrelated to this pass.

#### Merge Note

- Functional conflict surfaces for this pass are `pax-fluxia/src/lib/components/ui/settings/MetaballGridTuning.svelte`, `pax-fluxia/src/lib/components/ui/settings/settingMetadata.ts`, `pax-fluxia/src/lib/components/ui/settingsDefs.ts`, `pax-fluxia/src/lib/config/categoryThemes.ts`, `pax-fluxia/src/lib/config/game.config.ts`, `pax-fluxia/src/lib/territory/families/metaballGrid/config.ts`, `pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridFamily.ts`, `pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridPhaseEdgesFamily.ts`, `pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridPhaseFieldFamily.ts`, and `pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridFamily.test.ts`.
- End-state of this pass: metaball-grid visibility is no longer double-gated by both render mode and a separate enabled switch. The UI and runtime now treat render-mode selection as the single source of truth.

### 2026-04-30 - Phase Field Conquest Composite And UX Copy Correction

- Lane: `territory/metaball-grid-phase-field-conquest-fix`
- User task: continue the interrupted Phase Field tuning work and fix three concrete conquest-transition defects the user observed in-game:
  1. winner fill reading as alpha-blended over loser instead of replacing it,
  2. loser border traces remaining under the winner fill,
  3. blocky transition chunks popping away instead of resolving cleanly into POST-state territory.
- Scope this pass: phase-field compositor behavior plus the in-game copy for how the mode is explained. No broader territory-mode refactor was attempted in this pass.

#### Pass Log

1. Pass 1 - Re-traced the full `MetaballGridPhaseFieldFamily.ts` transition path instead of guessing. Confirmed the previous implementation rendered full PRE geometry, then masked full POST geometry over it, then painted an additional frontier overlay that could still blend PRE/POST border hues. That structure directly matched the user-reported symptoms.
2. Pass 2 - Changed the phase-field composite ownership model. The family now treats POST geometry as the conquest-time base truth and uses the mask texture for PRE-side cells instead of NEXT-side cells. Concretely: the family now renders full NEXT geometry underneath, then masks PRE geometry on top only where the transition scene still says PRE should survive. This means winner fill follows the front instead of reading as a general winner-over-loser overlay.
3. Pass 3 - Mirrored that same ownership correction in the vector fallback path. The fallback renderer now draws NEXT geometry as the base and paints only PRE-side cells as the temporary overlay. This keeps software fallback semantics aligned with the render-texture path instead of leaving the two paths behaviorally different.
4. Pass 4 - Removed loser-hue mixing from the active frontier accent in phase field. The frontier accent now derives from the winner side only, with the optional `borderBlend` toggle reinterpreted for this mode as a lighter winner-side frontier highlight rather than a 50/50 loser/winner hue mix. This addresses the lingering loser-border read under the winning fill.
5. Pass 5 - Corrected the mode’s user-facing copy in `MetaballGridTuning.svelte`. Replaced the internal-language lock note with plain outcome language (`always advances from the contested border`), removed the dead disabled `Wave Geometry` selector for locked modes, and replaced it with a read-only `Transition Path` presentation. Also updated the border-blend label/description for phase field so the control text matches the new winner-side frontier-highlight behavior.
6. Pass 6 - Removed the stale `METABALL_GRID_ENABLED` tunable key from the phase-field family’s tunable list while touching the file, keeping this family aligned with the earlier pass that deleted the redundant enabled switch from the active UI/runtime lane.
7. Pass 7 - Ran targeted validation. `git diff --check` on the touched files reported only the existing LF→CRLF warnings and no whitespace errors. Filtered `bun run check` did not surface new phase-field-family checker errors; the only repeated touched-file hit remained the existing `MetaballGridTuning.svelte` style warning at the `<style>` block. Browser visual verification still remains required because the user’s observations are visual and this lane did not include an actual in-app playtest run.

#### Merge Note

- Functional conflict surfaces for this pass are `pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridPhaseFieldFamily.ts` and `pax-fluxia/src/lib/components/ui/settings/MetaballGridTuning.svelte`.
- `MetaballGridPhaseFieldFamily.ts` is still an untracked file in this worktree lane, so merge handling must treat this pass as changes on a newly-added renderer-family file rather than a modification to an already-tracked one.
- Intended behavioral delta for reviewers:
  - conquest-time base truth is now POST geometry, not PRE geometry,
  - PRE survives only as a temporary masked overlay ahead of the front,
  - frontier accent is winner-side only,
  - locked transition-path UX is now described in outcome language rather than renderer-internal language.
- This pass is implemented but not visually claimed as fixed until human in-app verification confirms the three reported artifacts are actually gone.

### 2026-04-30 - Multi-Level Intent Rule And Propagation-Shape Exposure

- Lane: `territory/phase-visual-choice-exposure`
- User task: codify a durable agent-thinking rule that keeps implementation aligned to the real objective of conquest visuals, then expose real user-facing propagation-shape choices for the relevant territory modes instead of treating that decision as an internal lock.
- Scope this pass: master-agent rule update, territory settings UX, diagnostics copy, and mode-catalog wording. Runtime geometry support already existed and did not need a deeper refactor for this specific unlock.

#### Pass Log

1. Pass 1 - Re-checked the governing materials before editing. The architecture spec intentionally recommended `pre_to_post_frontier` as the safest first prototype default, while the post-mortem already established that UX is the real delivery boundary. I treated this pass as a product-direction correction rather than a low-level bug fix.
2. Pass 2 - Added a new durable thinking rule to the master guidance near the top of this file: `2.1a Multi-Level Intent`. The rule requires agents to reason at the project, feature, and player-visible-moment levels before hardcoding a design choice, and forbids letting prototype safety defaults masquerade as finished product design.
3. Pass 3 - Unlocked propagation shape as a real user-facing visual choice in `MetaballGridTuning.svelte`. Replaced the old locked/disabled `Wave Geometry` presentation with an always-live `Propagation Shape` control and outcome-based option labels:
   - `Captured border`
   - `Grid flood`
   - `Distance band`
   - `Captured-star burst`
4. Pass 4 - Rewrote the surrounding guidance so the control now speaks in player-visible motion language instead of planner terminology. Updated the phase-mode notes to frame the modes as `edge-forward conquest` vs `fill-first conquest`, and rewrote the propagation-shape descriptions in terms of how the takeover reads on screen.
5. Pass 5 - Made the dependent seeding surface honest. `Wave Seeding` became `Propagation Source`, and it now disables itself with explanatory copy when `Captured border` is selected, because the frontier-derived path does not use a separate seed choice.
6. Pass 6 - Updated related surfaces so the rest of the app does not still imply the old lock. Adjusted diagnostics notes in `ControlsSection-Diagnostics.svelte` and the mode descriptions in `territoryRenderModeCatalog.ts` so they describe `pre_to_post_frontier` as the default starting point rather than a locked invariant.
7. Pass 7 - Verified the touched lane. `git diff --check` on the touched files reported only existing LF→CRLF warnings and no whitespace errors. Filtered `bun run check` still only surfaced the repeated pre-existing `MetaballGridTuning.svelte` style warning at the `<style>` block; no new propagation-shape unlock failure surfaced in the touched settings or diagnostics files.

#### Merge Note

- Functional conflict surfaces for this pass are `.agent/AGENT.md`, `pax-fluxia/src/lib/components/ui/settings/MetaballGridTuning.svelte`, `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte`, and `pax-fluxia/src/lib/territory/ui/territoryRenderModeCatalog.ts`.
- Product intent after this pass:
  - propagation shape is a real visual-design choice, not a hidden implementation lock,
  - phase modes keep their authored visual identities through defaults and copy, not through a disabled control,
  - dependent controls must be truthful about when they matter.
- In-game verification still needed:
  - confirm the propagation-shape selector is visible and live in the phase modes,
  - confirm `Propagation Source` disables only for `Captured border`,
  - compare how the conquest moment reads under `Captured border`, `Grid flood`, `Distance band`, and `Captured-star burst`.

### 2026-04-30 - Phase Field Replay Fix, Starter Borders, And Finish-Tail Controls

- Lane: `territory/phase-field-replay-and-finish-tuning`
- User task: fix replayed old conquests when a new conquest starts mid-transition, answer the border-default question responsibly, and expose real multi-axis finish controls so the phase-field mode can settle cleanly into POST territory instead of popping at completion.
- Scope this pass: phase-field runtime lifecycle, phase-field completion behavior, settings UX, diagnostics copy, and current live starter values for this tuning session.

#### Pass Log

1. Pass 1 - Traced the replay bug through the active render-family lifecycle instead of assuming it lived in the phase-field renderer. Confirmed the problem sat in `GameCanvas.svelte`: the stable render-family PRE cache was frozen during active phase-family transitions, so conquest B could capture a PRE frame from before conquest A finished and visually replay A inside B.
2. Pass 2 - Fixed that lifecycle bug at the cache boundary. Removed `freezeDuringActiveTransition: true` from the phase-edges and phase-field stable-frame sync calls so the stable authoritative geometry keeps tracking the actually presented POST truth while a conquest is in flight. This means a new conquest now diffs against what the player just saw instead of a stale pre-transition frame.
3. Pass 3 - Re-audited the “real choice” work and found a deeper false-choice bug: the phase-field mode config source was still hard-overriding `METABALL_GRID_WAVE_GEOMETRY`, which meant the newly exposed `Propagation Shape` selector was not fully real in runtime. Removed the phase-field wave-geometry override from `metaballGrid/config.ts` and cleaned the tuning fallback path so phase-field propagation shape is now actually driven by the user-facing control.
4. Pass 4 - Chose completion-tail axes based on visible outcome rather than renderer internals. The added controls are:
   - `Finish Fade Start`
   - `Finish Fade End`
   - `Size Collapse Start`
   - `Size Collapse End`
   - `Final Cell Size`
   - `Frontier Fade Start`
   - `Frontier Fade End`
   All are normalized to overall conquest time except final cell size, which is in px.
5. Pass 5 - Implemented those controls end-to-end. Added new phase-field completion keys to config/defaults, settings sync, and label metadata; added a Phase Field-only finish-tail block inside `MetaballGridTuning.svelte`; and wired the renderer so PRE-mask alpha, transition-cell size, and frontier-accent alpha all now resolve through the new finish-tail envelopes.
6. Pass 6 - Changed the actual completion behavior, not just the UI. The PRE mask now fades out over a configurable tail window, the transition cells can shrink toward a configurable final size (down to 1px), and the winner-side frontier accent can fade on its own timing window. This directly targets the user-reported completion jank by revealing the smooth POST territory underneath instead of letting large grid chunks simply disappear at the end.
7. Pass 7 - Handled the border-default question pragmatically. I did **not** reintroduce a mode-level hard override for shared border controls, because that would have turned `Border Mode` and `Centered frontier highlight` back into fake choices. Instead, I updated the tracked live starter values in `common/resources/settings-live/current-settings.json` for this tuning lane so phase-field currently starts from `territory_edge` borders, frontier highlight on, and `pre_to_post_frontier` propagation without lying about user control.
8. Pass 8 - Updated diagnostics copy so the in-app explanation matches the new reality: propagation shape is truly user-driven, borders are part of the recommended starter rather than a hidden mode lock, and the new finish-tail controls live under the `Flip` module.

#### Merge Note

- Functional conflict surfaces for this pass are `pax-fluxia/src/lib/components/game/GameCanvas.svelte`, `pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridPhaseFieldFamily.ts`, `pax-fluxia/src/lib/territory/families/metaballGrid/config.ts`, `pax-fluxia/src/lib/components/ui/settings/MetaballGridTuning.svelte`, `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte`, `pax-fluxia/src/lib/components/ui/settings/settingMetadata.ts`, `pax-fluxia/src/lib/components/ui/settingsDefs.ts`, `pax-fluxia/src/lib/config/game.config.ts`, and `common/resources/settings-live/current-settings.json`.
- Critical behavioral deltas for merge/review:
  - mid-transition conquest chaining should no longer replay earlier completed conquests,
  - phase-field propagation shape is no longer silently locked by mode config,
  - phase-field completion can now be tuned across fade timing, size-collapse timing, final cell size, and frontier-tail timing,
  - current live starter values now surface borders and captured-border propagation so the mode is immediately visible for tuning.
- Validation still required in-app:
  - conquest B should not replay conquest A when B starts one tick later,
  - phase-field should visibly start with borders in the current live settings state,
  - finish-tail controls should visibly affect end-of-conquest settling,
  - shrinking to `1px` plus a late fade should feel like a clean dissolve into POST territory rather than a chunk pop.

### 2026-04-30 - Phase Field Border Overlay And Frontier-Highlight Split

- Lane: `territory/phase-field-border-overlay`
- User task: fix the remaining phase-field border failure now that fill/finish tuning is in good shape. The mode still showed no actual borders in practice, despite exposing border controls in UI.
- Scope this pass: phase-field renderer border output, phase-field settings semantics, shared config plumbing, and tracked handoff updates.

#### Pass Log

1. Pass 1 - Audited the border path end-to-end before editing. Confirmed the user-facing problem was real: `MetaballGridPhaseFieldFamily.ts` read some border-related tunables and reused border color math for the frontier accent, but it never read `METABALL_BORDER_WIDTH`, never honored `METABALL_BORDER_ENABLED`, and never executed any border-stroke draw pass at all.
2. Pass 2 - Identified a second UX failure intertwined with the rendering bug. The phase-field UI had repurposed shared `Centered-blended borders` semantics into `Centered frontier highlight`, which meant the mode no longer had a truthful border-blend control even before the missing-stroke bug was fixed.
3. Pass 3 - Restored the shared control contract. In `MetaballGridTuning.svelte`, `METABALL_GRID_BORDER_BLEND` now goes back to meaning actual centered/blended ownership borders for all metaball-grid variants. Phase field receives a dedicated `Frontier Highlight` toggle instead of hijacking the shared border toggle.
4. Pass 4 - Added the missing phase-field config plumbing for that split. Introduced `METABALL_GRID_PHASE_FIELD_FRONTIER_HIGHLIGHT` in `game.config.ts`, `metaballGrid/config.ts`, `settingsDefs.ts`, `settingMetadata.ts`, `categoryThemes.ts`, and the current live settings file so the new toggle is a real persisted control instead of a local UI-only switch.
5. Pass 5 - Implemented a real border overlay layer inside `MetaballGridPhaseFieldFamily.ts`. The family now reads `METABALL_BORDER_ENABLED` and `METABALL_BORDER_WIDTH`, builds a border scene from the same live grid-classification truth as the other metaball-grid families, and paints an explicit stroke layer on top of the phase-field composite.
6. Pass 6 - Wired the overlay to the existing tuning model instead of inventing a second border system. `Border Mode`, `Centered-blended borders`, `Border Chaikin Passes`, `Shared Edge Smoothing`, `Shared Edge Trim`, and the shared territory border SLA controls now all affect phase field in runtime. The border layer uses the current classified ownership state so it can follow the active front rather than sitting dead beneath the conquest.
7. Pass 7 - Kept the conquest rim as its own authored effect. The winner-side frontier accent is still available, but now through the dedicated `Frontier Highlight` toggle plus the existing `Frontier Fade Start/End` tail controls, instead of being conflated with border blending.
8. Pass 8 - Ran targeted verification. `git diff --check` remained clean except for existing LF→CRLF warnings. A filtered `svelte-check` pass on touched files showed only the long-standing pre-existing `game.config.ts` `TERRITORY_FILL_TRANSITION_MODE` mismatch plus existing `MetaballGridTuning.svelte` CSS warnings; no new phase-field-family or settings-surface error surfaced from this border pass. In-app visual QA is still required to validate the final look.

#### Merge Note

- Functional conflict surfaces for this pass are `pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridPhaseFieldFamily.ts`, `pax-fluxia/src/lib/components/ui/settings/MetaballGridTuning.svelte`, `pax-fluxia/src/lib/components/ui/settings/settingMetadata.ts`, `pax-fluxia/src/lib/components/ui/settingsDefs.ts`, `pax-fluxia/src/lib/config/categoryThemes.ts`, `pax-fluxia/src/lib/config/game.config.ts`, `pax-fluxia/src/lib/territory/families/metaball/config.ts`, `pax-fluxia/src/lib/territory/families/metaballGrid/config.ts`, and `common/resources/settings-live/current-settings.json`.
- Critical behavioral delta for merge/review:
  - phase field now has a real border overlay layer,
  - shared border controls mean borders again,
  - frontier highlight is a separate phase-field-only choice,
  - border width/alpha/HSL and grid-border shaping knobs are now live in this mode instead of being dead UI.
- In-app verification still needed:
  - confirm borders are now visibly present in steady state and during conquest,
  - confirm `territory_edge` vs `per_cell` reads distinctly in phase field,
  - confirm `Centered-blended borders` now affects border behavior rather than frontier highlight,
  - confirm `Frontier Highlight` plus `Frontier Fade Start/End` behaves as a separate conquest-local accent.

### 2026-04-30 - Territory Styles/Topology Split And Canonical Phase-Field Borders

- Lane: `territory/styles-topology-split-and-canonical-borders`
- User task: remove the duplicate Territory top-level sections by separating topology into its own panel and leaving the rest as a pure Territory Styles surface, then debug why phase-field still did not show borders despite the earlier border pass.
- Scope this pass: settings-shell structure, Territory styles copy truthfulness, phase-mode default cleanup, and the phase-field `territory_edge + centered-blended` runtime path.

#### Pass Log

1. Pass 1 - Audited the top-level Territory shell instead of assuming the duplication was just naming drift. Confirmed the problem was structural: `GameSettingsPanel.svelte` mounted both `territory_tuning` and `territory_styles`, but `ControlsSection-Territory.svelte` still rendered nearly the same renderer/style body in both cases because the styles shell did not actually exclude the topology content path strongly enough.
2. Pass 2 - Split topology into its own mounted component. Added `TerritoryTopologyTuning.svelte`, moved the topology-only controls and compile-status behavior there, wired `territory_tuning` in `GameSettingsPanel.svelte` to that dedicated component, and relabeled the section in `settingsRegistry.ts` to `Territory Topology`.
3. Pass 3 - Reduced `ControlsSection-Territory.svelte` to a real styles shell for the `territory_styles` section. Removed the old embedded topology module logic from that component so the remaining surface is explicitly `Territory Styles`.
4. Pass 4 - Cleaned the styles copy to match the new ownership boundaries. The Metaball Grid styles card no longer claims topology ownership; it now points users to `Territory Topology` for corridor/disconnect/star-margin/frontier-resolution work and keeps this panel focused on appearance and transition feel.
5. Pass 5 - Re-traced the phase-field border failure after the earlier overlay pass and found the deeper semantic issue: default phase-field borders used `territory_edge + centered-blended`, but that path still depended on the grid-derived shared-edge builder. That made the default border look fragile or absent even though the control plumbing existed.
6. Pass 6 - Switched the default phase-field `territory_edge + centered-blended` path to canonical geometry borders. `MetaballGridPhaseFieldFamily.ts` now draws `frontierPolylines` and `worldBorderPolylines` from the canonical geometry snapshot when the mode is using the canonical centered-blended territory-edge case, while the old grid-owned border scene remains available for explicit grid-border looks (`per_cell` or non-blended territory-edge fallback).
7. Pass 7 - Made the control semantics truthful after that runtime change. In `MetaballGridTuning.svelte`, the shared edge-shaping controls now explain when they do and do not apply: canonical phase-field territory-edge borders ignore the grid-owned Chaikin/smoothing/trim path unless the user explicitly falls back to the non-canonical edge mode.
8. Pass 8 - Restored the missing `METABALL_GRID_WAVE_GEOMETRY` keys in the phase-mode defaults objects after removing the hard override earlier in the sprint. This keeps `phase_edges` and shared family code type-safe without reintroducing the old false-choice runtime lock, because `GameCanvas.svelte` now merges mode defaults before live `GAME_CONFIG`.

#### Merge Note

- Functional conflict surfaces for this pass are `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`, `pax-fluxia/src/lib/components/ui/settings/settingsRegistry.ts`, `pax-fluxia/src/lib/components/ui/settings/TerritoryTopologyTuning.svelte`, `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`, `pax-fluxia/src/lib/components/ui/settings/MetaballGridTuning.svelte`, `pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridPhaseFieldFamily.ts`, and `pax-fluxia/src/lib/territory/families/metaballGrid/config.ts`.
- Critical behavioral deltas for merge/review:
  - `Territory Topology` is now its own top-level settings panel,
  - `Territory Styles` is now a style-only shell instead of a duplicate topology surface,
  - phase-field default centered-blended territory-edge borders now follow canonical territory frontiers rather than the grid-owned fallback edge builder,
  - grid edge-shaping controls are now explicitly fallback-only in canonical phase-field border mode,
  - restoring phase-mode default keys did not re-lock `Propagation Shape`, because live config still overrides the defaults in `GameCanvas.svelte`.
- Validation completed:
  - `git diff --check` returned only existing LF→CRLF warnings on touched files,
  - filtered `bun run check` no longer reports the introduced phase-mode default-property errors; touched territory files only surfaced existing unused-selector warnings plus unrelated repo-baseline errors elsewhere.
- In-app verification still needed:
  - confirm the top-level Territory UI now reads as `Territory Modes & Transition`, `Territory Topology`, and `Territory Styles` with no duplicate topology body,
  - confirm phase-field borders are now visible by default in `territory_edge + centered-blended`,
  - compare the new canonical border default against the explicit grid-owned fallback look by toggling centered-blended off or using `per_cell`.

### 2026-04-30 - Dedicated Phase Field Settings Section

- Lane: `territory/phase-field-settings-surface`
- User task: create a new top-level settings section for `metaball_grid_phase_field`, expose only controls that are true and active, and clean up duplicate/redundant/dead UI in that mode path.
- Scope this pass: settings registry, top-level settings shell visibility behavior, phase-field mode surface composition, and tracked handoff updates.

#### Pass Log

1. Pass 1 - Re-audited the phase-field UI path instead of assuming the problem was only naming/copy. Confirmed the mode still reused the generic `Territory Styles` shell, which mixed active phase-field controls with dead generic surface controls (`METABALL_FILL_ENABLED`, `METABALL_BLUR`, `METABALL_BLUR_AFFECTS_BORDERS`, and shared `METABALL_CHAIKIN_PASSES`) and obscured the real border gate behind a different module.
2. Pass 2 - Re-audited the settings shell itself. Confirmed `GameSettingsPanel.svelte` still rendered `orderedOpenSections` directly from saved `sectionOrder`, so a section could stay mounted after it was supposed to be hidden by mode/tier context.
3. Pass 3 - Added a new top-level section id, `territory_phase_field`, in `settingsRegistry.ts`. Positioned it alongside the other Territory sections so the mode has its own first-class entry instead of hiding inside the shared styles shell.
4. Pass 4 - Made the settings shell mode-aware in `GameSettingsPanel.svelte`. `Phase Field` now appears only when the active territory render mode is `metaball_grid_phase_field`, `Territory Styles` is hidden while that mode is active, and `orderedOpenSections` now filters through the currently visible section set instead of blindly rendering stale saved state.
5. Pass 5 - Added first-reveal auto-open for the new `Phase Field` section so the panel is discoverable the moment the user switches into the mode, rather than requiring them to guess a new icon appeared in the toolbar.
6. Pass 6 - Built `TerritoryPhaseFieldSettings.svelte` as a dedicated truthful mode surface. It exposes:
   - fill SLA
   - border SLA
   - a live border-state readout that explains why borders are or are not drawing
   - the existing active `MetaballGridTuning` stack for shape, propagation, finish, and perf
7. Pass 7 - Intentionally omitted dead or misleading phase-field controls from that new surface:
   - the generic fill enable toggle
   - GPU blur
   - blur-affects-borders
   - shared `METABALL_CHAIKIN_PASSES`
   These were left available only in the older generic shell for other modes that still use that component, rather than being presented as if phase field consumed them.
8. Pass 8 - Removed phase field from the generic metaball-grid styles card in `ControlsSection-Territory.svelte` so the mode no longer duplicates itself through `Territory Styles`.
9. Pass 9 - Ran targeted verification. `git diff --check` remained clean except for existing LF→CRLF warnings. Filtered `bun run check` showed no new type errors from `TerritoryPhaseFieldSettings.svelte`; touched files only surfaced the old repo-baseline `GameSettingsPanel.svelte` typing failures plus existing unused-selector warnings in older shells.

#### Merge Note

- Functional conflict surfaces for this pass are `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`, `pax-fluxia/src/lib/components/ui/settings/settingsRegistry.ts`, `pax-fluxia/src/lib/components/ui/settings/TerritoryPhaseFieldSettings.svelte`, and `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`.
- Critical behavioral deltas for merge/review:
  - `metaball_grid_phase_field` now has a dedicated top-level settings section,
  - `Territory Styles` no longer appears while phase field is active,
  - hidden sections no longer keep rendering just because they were previously open,
  - the phase-field mode path now surfaces only controls the runtime actually consumes,
  - the panel itself now explains border readiness in user-facing terms instead of forcing reconstruction from internal config.
- In-app verification still needed:
  - confirm the `Phase Field` section appears and auto-opens when the mode becomes active,
  - confirm `Territory Styles` disappears while phase field is active,
  - confirm the border-state readout matches actual on-map results for `off`, `per_cell`, and `territory_edge` cases,
  - confirm the new panel feels sufficient without the removed generic/dead controls.

### 2026-05-01 - Remove `canonical` Jargon From Settings Copy

- Lane: `territory/phase-field-copy-truth`
- User task: stop adding commentary-heavy prose to controls sections, remove the user-facing word `canonical`, and answer directly what that wording was supposed to mean.

#### Pass Log

1. Pass 1 - Audited the settings UI path and confirmed the real issue: `canonical` in the phase-field panel was not carrying a stable product meaning. It was internal-sounding filler over a simple distinction the UI should have stated directly.
2. Pass 2 - Reduced the phase-field top-level panel in `TerritoryPhaseFieldSettings.svelte` so it reads more like a control surface and less like a narrated explainer. Removed the extra descriptive paragraphs I had added around the section, the surface card, and the tuning stack.
3. Pass 3 - Removed the user-facing `canonical` wording from the phase-field border-state summary and replaced it with direct language:
   - smooth territory outline
   - grid cell edges
4. Pass 4 - Renamed the local `MetaballGridTuning.svelte` helper from `usesCanonicalTerritoryEdgeBorders()` to `usesGeometryFrontierBorders()` and replaced the related UI copy so the control descriptions now say what actually changes on screen.
5. Pass 5 - Verified that the remaining `canonical` hits under `src/lib/components/ui/settings` are internal mode ids and logic branches such as `power_voronoi_canonical`, not the player-facing copy that triggered this correction.

#### Merge Note

- Functional conflict surfaces for this pass are `pax-fluxia/src/lib/components/ui/settings/TerritoryPhaseFieldSettings.svelte` and `pax-fluxia/src/lib/components/ui/settings/MetaballGridTuning.svelte`.
- Critical behavioral delta for merge/review:
  - no runtime change,
  - settings copy now states the real distinction directly: smooth territory outline vs grid cell edges,
  - the added commentary text in the dedicated phase-field panel has been removed.

### 2026-05-01 - Fix Phase-Field Shape Slider Truthfulness

- Lane: `territory/phase-field-shape-slider-coherence`
- User task: fix the defective `Shape` subsection sliders (`Border Chaikin Passes`, `Shared Edge Smoothing`, `Shared Edge Trim`) and post-mortem why the sliders were dead while `+/-` nudges still worked.

#### Pass Log

1. Pass 1 - Traced the defect from the reported symptom instead of assuming a browser/CSS range issue. Confirmed the three sliders in `MetaballGridTuning.svelte` were explicitly disabled by mode/path gating while still being rendered as normal live controls.
2. Pass 2 - Traced the separate `+/-` path through `use:nudgeSliders` in `GameSettingsPanel.svelte` and confirmed the shared `nudgeSliders.ts` helper injected active buttons beside every range input without respecting `input.disabled`.
3. Pass 3 - Wrote the process post-mortem in `.agent/docs/project/post-mortems/2026-05-01_phase-field-shape-sliders-disabled-but-nudges-live.md` and added a durable `Control Coherence` rule to this file.
4. Pass 4 - Fixed the shared helper: `nudgeSliders.ts` now mirrors the real `disabled` state onto injected buttons, blocks click handling when the source range is disabled, and observes `disabled` attribute changes so the wrapper stays truthful as mode state changes.
5. Pass 5 - Fixed the phase-field shape UI itself in `MetaballGridTuning.svelte`: the three grid-edge shaping controls are no longer surfaced as dead sliders when the active border path does not use them. They render only when the current border path can actually consume them.
6. Pass 6 - Reduced the remaining fallback-state copy to one direct line: `Grid-edge shaping appears when Centered-blended borders is Off.`
7. Pass 7 - Added disabled-state styling for the injected nudge buttons in `GameSettingsPanel.svelte` so the shared control chrome now visually matches interaction truth.

#### Merge Note

- Functional conflict surfaces for this pass are `pax-fluxia/src/lib/components/ui/settings/nudgeSliders.ts`, `pax-fluxia/src/lib/components/ui/settings/MetaballGridTuning.svelte`, and `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`.
- Critical behavioral deltas for merge/review:
  - disabled range inputs no longer have live `+/-` buttons beside them,
  - phase-field grid-edge shaping controls are only rendered when the active border path actually uses them,
  - the previous split-brain interaction state is removed instead of merely restyled.
