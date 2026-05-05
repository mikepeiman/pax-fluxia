# Worktree Handoff - PVV4 Transition Bets

## Inception Summary

- Date started: `2026-05-03`
- Worktree: `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia`
- Branch: `codex/render-infra/pvv4-transition-bets`
- Branch focus:
  - improve `PVV4` transition quality through small, controlled visual/performance bets
  - preserve the current steady-state geometry and overall look
  - avoid large rewrites or plan-purity cleanup that could destabilize a mode the user says is already close

### Initial User Prompt

> Look at the PVV4 rendering mode here. It is close to passable but transitions are neither fluid enough nor correct/consistent enough yet. The geometry and steady state looks fine.
>
> Look for documentation in the past 2 weeks related to planning and designing the "perfect" PV transition mode. You'll find some competing ideas; be clear on what the options are. Report when finished a full, deep analysis.

### User Reframe That Governs This Branch

> None of your findings matter. The only thing that matters is a good result - visually, and performance.
>
> As I said, this mode is close to acceptance. It is good. It is much less messed up than 50 prior attempts.
>
> Your pitfall & hazard is to mess it up in order to abide by some plan or concept.
>
> But don't. Look at what it is and accept the crucial truth that it is nearly good enough. What we need to improve are small details. Plan-purity is zero, not a priority at all. Any plan or concept is only valuable as far as it makes this work.
>
> Produce a plan that systematizes your "bets" or "experiments" based on what you think is going on, so that our work on this worktree/branch ... we do not simply proceed headlong down a path of increasingly messy additive edits and fixes. I want distinct approaches to improving/solving this mode.

### Current Process Instruction

> Ok let's proceed, branch it, commit and push regularly as per AGENT.md protocols. Keep documentation up to date.
>
> Importantly: as a worktree agent, you must begin immediately the handoff document for when we eventually conclude our work. Start with an Inception summary with the initial prompt and the stated focus of the branch. Update it with everything, very concretely and specifically, that you do, and why and what purpose it serves.

## Current Best Read

- The mode is already near acceptable according to the user.
- The correct working strategy is to preserve the current steady-state result and improve transition behavior through tightly isolated bets.
- The most likely remaining seams are:
  - time-profile shaping
  - changed-front isolation
  - correspondence stability in edge cases
  - local mid-motion anti-kink shaping
  - special handling for split/merge and birth/death edge cases

## Initial Experiment Order

1. Time-profile refinement
2. Motion-isolation tightening
3. Local path shaping / anti-kink pass
4. Correspondence stabilization
5. Special-case split / birth / death polish

## Live Action Log

### 2026-05-03 - Created branch-attached worktree state

- Action:
  - ran `git switch -c codex/render-infra/pvv4-transition-bets`
- Purpose:
  - attach the detached worktree to a named branch before implementation work, commits, and pushes
- Result:
  - the worktree is now attached to `codex/render-infra/pvv4-transition-bets`
- Validation:
  - branch creation succeeded in the local worktree

### 2026-05-03 - Read project execution rules and lane guidance

- Action:
  - read `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\AGENT.md`
  - read `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\MULTI_LANE_WORKTREE_GUIDE.md`
  - read `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\docs\agentic\AGENT-GUIDE_MCP_atlas-harness.md`
- Purpose:
  - align the branch with repo rules for documentation, worktree ownership, commit discipline, and tool usage
- Result:
  - this branch is being treated as a render-focused lane with explicit commit/push discipline and tracked docs
- Validation:
  - documents were successfully read and incorporated into the branch plan

### 2026-05-03 - Traced the actual PVV4 runtime hot path

- Action:
  - inspected:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\game\GameCanvas.svelte`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\integration\GameCanvasTerritoryBridge.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\runtime\TerritoryRuntimeCoordinator.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\TransitionLayerCoordinator.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\ActiveFrontTransition.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\SharedTransitionClock.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\runtime\TerritoryConfigNormalizer.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\runtime\TerritoryCompatibilityMatrix.ts`
- Purpose:
  - identify the real runtime that powers `power_voronoi_canonical`, so experiments target the live path instead of dead or legacy code
- Result:
  - current working assumption is that `power_voronoi_canonical` uses the newer runtime bridge path:
    - `GameCanvas.svelte`
    - `GameCanvasTerritoryBridge`
    - `TerritoryRuntimeCoordinator`
    - `TransitionLayerCoordinator`
    - `ActiveFrontTransition`
  - this narrowed the experiment seam to transition-local code rather than broader family/renderer systems
- Validation:
  - source tracing completed
  - runtime behavior still requires in-app visual verification once experiments begin

### 2026-05-03 - Investigated surfaced controls and config reachability

- Action:
  - inspected:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\ControlsSection-Territory.svelte`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\TerritoryTransitionTuning.svelte`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\integration\TerritorySettingsBridge.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\config\territory.config.ts`
- Purpose:
  - determine whether PVV4 transition quality could be improved through existing surfaced tuning or whether code-side experiment gates are required
- Result:
  - current read is that PVV4 does not expose the most relevant motion-shaping controls through the existing user-facing tuning panel
  - this supports using code-side isolated bets instead of trying to tune the mode through unrelated VS-transition sliders
- Validation:
  - config and UI paths were traced in source

### 2026-05-03 - Researched recent local planning documents for competing PV transition ideas

- Action:
  - reviewed recent repo docs and local docs from the last roughly two weeks, including PV transition planning and perimeter-field planning notes
- Purpose:
  - understand the available design ideas without treating any of them as binding if they do not help the live result
- Result:
  - distilled the competing ideas into a practical bet system:
    - timing
    - motion isolation
    - correspondence
    - local path shaping
    - special-case polish
- Validation:
  - documentation review completed
  - the user later explicitly deprioritized plan purity, so the branch uses those docs only as hypothesis inputs

### 2026-05-03 - Wrote the initial experiment plan

- Action:
  - created local session plan:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\docs\sessions\2026-05-03\2026-05-03_pvv4-transition-bets-plan.md`
  - created tracked daily queue:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\docs\plans\2026-05-03\FEATURE_AND_TASK_QUEUE_2026-05-03.md`
- Purpose:
  - turn the user's instruction into an ordered experiment protocol rather than uncontrolled additive tweaking
- Result:
  - established the initial five-approach experiment order now recorded in this handoff document
- Validation:
  - documents written successfully

### 2026-05-03 - Corrected documentation durability for tracked history

- Action:
  - checked ignore rules in:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.gitignore`
  - confirmed that any path named `sessions/` is gitignored
  - decided to make this tracked handoff document the canonical durable record for the branch
- Purpose:
  - avoid relying on a local-only ignored document for branch handoff and pushed history
- Result:
  - tracked docs will reference this handoff file, not the ignored session file, as the durable branch record
- Validation:
  - `git check-ignore` confirmed the ignore behavior

### 2026-05-03 - Added a dedicated worktree rule and started the tracked handoff

- Action:
  - created:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\rules\worktree-protocols.md`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\docs\project\process\worktree-handoffs\2026-05-03_pvv4-transition-bets_handoff.md`
- Purpose:
  - formalize the branch discipline the user requested
  - ensure every later code/doc/git action is logged with purpose and specifics
- Result:
  - this rule and handoff file become part of the branch's operating protocol
- Validation:
  - files were created successfully

### 2026-05-03 - Created and pushed the first branch checkpoint

- Action:
  - committed:
    - `b8e0c1ae0` - `Add PVV4 worktree protocol and handoff`
  - pushed:
    - `origin/codex/render-infra/pvv4-transition-bets`
- Purpose:
  - create a resumable remote checkpoint before any PVV4 behavior changes
  - ensure the branch now carries its own documented operating protocol and handoff log
- Result:
  - the branch now exists on the remote and is tracking `origin/codex/render-infra/pvv4-transition-bets`
- Validation:
  - `git push -u origin codex/render-infra/pvv4-transition-bets` succeeded

### 2026-05-03 - Recorded the first checkpoint inside tracked docs

- Action:
  - committed:
    - `18b6ef462` - `Record initial PVV4 branch checkpoint`
  - pushed the branch after the commit
- Purpose:
  - make the tracked handoff file self-describing by including the first branch checkpoint metadata
- Result:
  - the branch now contains both the initial setup checkpoint and the follow-up documentation checkpoint on `origin`
- Validation:
  - push completed successfully

### 2026-05-03 - Added a narrow PVV4 runtime-compatibility shim

- Action:
  - edited:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\geometry\registry.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\TransitionLayerCoordinator.ts`
- Purpose:
  - keep the existing PVV4 public ids stable while routing them into the geometry and active-front runtime paths that actually exist in source
  - avoid starting visual bets against ids that did not line up cleanly with the registered runtime paths
- Exact change:
  - mapped `canonical_power_voronoi` to the existing unified vector geometry mode in the geometry registry
  - treated `pv_frontline` as an alias for the topology/active-front transition path in the transition coordinator
- Result:
  - PVV4's public geometry/transition ids now resolve locally to the runtime seams that the branch intends to tune
  - this is a compatibility shim, not a public-surface rename
- Validation:
  - source diff reviewed
  - full runtime visual verification still requires app-level testing

### 2026-05-03 - Attempted build validation and isolated environment blockers

- Action:
  - ran:
    - `bun run build` in `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia`
    - `bunx vite build`
    - `bunx svelte-check --tsconfig ./tsconfig.json`
- Purpose:
  - verify the compatibility shim through the normal render-lane validation path before moving on to visible tuning bets
- Result:
  - validation is currently blocked by missing local install/generated state in this worktree, not by a demonstrated compile error from the shim itself
  - observed blockers:
    - `bun run build` could not find `vite`
    - `bunx vite build` could not resolve local `vite` / `@sveltejs/kit` packages from the worktree config path
    - `bunx svelte-check` could not read `.svelte-kit/tsconfig.json` and then failed to load missing local Svelte packages
- Validation:
  - there was no tracked lockfile drift left behind after the failed validation attempts
  - code changes remain limited to the two intended source files

### 2026-05-03 - Implemented Approach A bet 1: PVV4-only sample-time easing

- Action:
  - edited:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\TransitionLayerCoordinator.ts`
- Purpose:
  - test the smallest plausible fluidity improvement before touching correspondence, moving-span selection, or special-case logic
  - reduce the mechanical linear start/stop feel of PVV4 without changing endpoint parity or broadening the moving area
- Exact change:
  - added a PVV4-only sampled progress shaper:
    - clamp
    - `smoothstep`
    - a blended easing pass (`blend = 0.4`)
  - applied the shaped progress only when the selected public transition id is `pv_frontline`
  - left raw envelope timing and completion semantics unchanged
  - extended transition trace logging to include both raw `progress` and `sampledProgress`
- Result:
  - this is a narrowly scoped timing-profile bet on the active-front runtime path
  - no other transition family is intentionally changed by this bet
- Validation:
  - `bun run build` now gets through the touched transition file path and fails later on an unrelated missing file:
    - `src/lib/components/ui/TransitionDebugPanel.svelte`
  - `bun run check` reports a large set of pre-existing repo type issues unrelated to this bet
  - no reported validation error from `TransitionLayerCoordinator.ts` itself was surfaced by these runs

### 2026-05-03 - Created and pushed the Approach A bet 1 checkpoint

- Action:
  - committed:
    - `6ec515423` - `Ease PVV4 active-front sampling`
  - pushed the branch after the commit
- Purpose:
  - isolate the first real PVV4 motion bet as its own remote checkpoint before any second transition idea is attempted
- Result:
  - the branch now contains a dedicated timing-profile experiment commit on top of the runtime-compatibility shim
- Validation:
  - push completed successfully

### 2026-05-04 - Investigated home-route game shell import failure

- Action:
  - inspected:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\game\GameContainer.svelte`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\routes\+page.svelte`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\utils\homeRouteDiagnostics.ts`
  - checked for presence of:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\TransitionDebugPanel.svelte`
  - searched for all `TransitionDebugPanel` references under `src`
- Purpose:
  - explain the browser-reported `Failed to fetch dynamically imported module` error without guessing
  - determine whether the failure is in the dynamic import itself or in `GameContainer.svelte`'s dependency graph
- Result:
  - the dynamic import wrapper in `+page.svelte` is functioning as designed; it retries and records diagnostics around `import("$lib/components/game/GameContainer.svelte")`
  - the actual failure is downstream of that import: `GameContainer.svelte` imports `"$lib/components/ui/TransitionDebugPanel.svelte"` on line 23
  - that file does not exist in the current worktree
  - because Vite cannot resolve a direct dependency of `GameContainer.svelte`, the dev server cannot serve the compiled module, and the browser surfaces the generic fetch/import failure against `GameContainer.svelte`
  - the `homeRouteDiagnostics.ts` console entry is only the normalized logging layer for that thrown import error, not a second independent fault
- Validation:
  - `Test-Path` for `src/lib/components/ui/TransitionDebugPanel.svelte` returned `False`
  - repository search showed `TransitionDebugPanel` references only in `GameContainer.svelte`
  - repository listing of `src/lib/components/ui` showed `PerimeterFieldDiagnosticsPanel.svelte` exists, but `TransitionDebugPanel.svelte` does not

### 2026-05-04 - Removed orphan TransitionDebugPanel wiring from GameContainer

- Action:
  - edited:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\game\GameContainer.svelte`
  - validated current and historical context with:
    - `git blame` on the `GameContainer.svelte` import block
    - `git log --all --follow -- pax-fluxia/src/lib/components/ui/TransitionDebugPanel.svelte`
    - `git show master:pax-fluxia/src/lib/components/game/GameContainer.svelte`
- Purpose:
  - fix the repeated Vite import-analysis failure at the actual stale consumer instead of recreating a removed panel
  - explain why the same error keeps reappearing across multiple worktrees
- Exact change:
  - removed the direct `TransitionDebugPanel.svelte` import from `GameContainer.svelte`
  - removed the associated local visibility state, open handler, mount/unmount event wiring, and the conditional render block
  - updated the forced settings-section literal from `"debug"` to `"diagnostics"` so this older branch line points at the current diagnostics shell terminology
- Recurrence cause:
  - `TransitionDebugPanel.svelte` was deleted by commit `1864360cd6a46fd0cd6f52590616657f642427be` (`feat: add diagnostics settings shell for territory transitions`)
  - this branch still carried the older `GameContainer.svelte` import introduced on 2026-04-14, so it retained a consumer for a file that no longer existed
  - `master` later cleaned up the `GameContainer.svelte` side in commit `b6b7bdbb56aaa98a67fcd67ec6b09e4bbe5a8a73`, but older worktrees branched before that integration continue to inherit the stale import path
  - one separate branch later re-added `TransitionDebugPanel.svelte` on 2026-05-02, which masks the bug on that branch and makes the regression pattern look inconsistent across worktrees
  - broad repo build/check noise let this unresolved import hide until runtime in branches that did not have the re-added file
- Result:
  - the recurring missing-panel import path is removed from this worktree branch
  - the failure mode has advanced beyond `TransitionDebugPanel.svelte`; the next blocking build issue is unrelated and occurs later in `GameCanvas.svelte`
- Validation:
  - post-edit search found no remaining `TransitionDebugPanel`, `showTransitionDebugPanel`, or `pax-open-transition-debug-panel` references in `GameContainer.svelte`
  - `bun run build` no longer fails on `TransitionDebugPanel.svelte`
  - the current next build blocker is:
    - `src/lib/components/game/GameCanvas.svelte` importing missing export `readNormalizedTerritoryGeometryTunables` from `src/lib/territory/geometry/geometryTuning.ts`

### 2026-05-04 - Repaired geometryTuning export drift behind the next game-shell import failure

- Action:
  - edited:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\geometry\geometryTuning.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\compiler\powerVoronoiTerritoryGeometryGenerator.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\compiler\Geometry_0319.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\renderers\PowerVoronoiRenderer.ts`
  - inspected:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\game\GameCanvas.svelte`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\ControlsSection-Territory.svelte`
    - `git show master:pax-fluxia/src/lib/territory/geometry/geometryTuning.ts`
- Purpose:
  - fix the new browser error where `GameCanvas.svelte` imported `readNormalizedTerritoryGeometryTunables` from `geometryTuning.ts` but that export did not exist
  - proactively repair the rest of the local geometry-tuning contract drift so the next failure would not just move one symbol later
- Root cause:
  - this branch's `geometryTuning.ts` was on an older contract surface
  - current callers in this worktree expected:
    - `readNormalizedTerritoryGeometryTunables`
    - `TERRITORY_GEOMETRY_LIMITS`
    - normalized tunables carrying `msrStarBias`
    - normalized tunables carrying `cxContestPairSpacing`
  - the browser surfaced the fault as a `GameContainer.svelte` dynamic import failure because `GameCanvas.svelte` is in that transitive module graph; the actual failure was ESM link-time rejection of a missing named export from `geometryTuning.ts`
- Exact change:
  - `geometryTuning.ts`
    - exported `TERRITORY_GEOMETRY_LIMITS`
    - added `readNormalizedTerritoryGeometryTunables`
    - extended `TerritoryGeometryTunables` to include `msrStarBias` and `cxContestPairSpacing`
    - normalized those fields and added them to geometry cache-key parts
    - preserved existing branch defaults where possible rather than wholesale copying newer master defaults
  - `powerVoronoiTerritoryGeometryGenerator.ts`
    - extended `TerritoryGeneratorSettings` with optional `msrStarBias` and `cxContestPairSpacing`
    - added midpoint-pair spacing to the geometry fingerprint
    - threaded `cxContestPairSpacing` through the corridor virtual-site builder
  - `Geometry_0319.ts`
    - switched the contested midpoint-pair spacing argument from `starMargin` fallback to `cxContestPairSpacing ?? starMargin`
  - `PowerVoronoiRenderer.ts`
    - populated `msrStarBias` and `cxContestPairSpacing` on the direct renderer stage config so the non-family path does not stay behind the same contract
- Result:
  - the `geometryTuning.ts` export mismatch is repaired
  - current `GameCanvas` and territory settings callers now match the local geometry-tuning module surface
  - the contested midpoint-pair spacing config is no longer silently dropped on the compiler path touched here
- Validation:
  - `bun run build` now completes successfully end to end in `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia`
  - no new module-resolution or named-export failures were surfaced after this patch
  - remaining output from the build is warning-level only (large chunks, unused CSS selectors, static/dynamic import chunking notice), not a failing error

### 2026-05-04 - Restored bottom-right diagnostics icon shortcut wiring

- Action:
  - edited:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\game\GameContainer.svelte`
- Purpose:
  - restore the persistent bottom-right diagnostics shortcut that should open the Diagnostics section inside the Settings UI
  - keep the shortcut path stable on this older branch line instead of relying only on menu access or ruler-side effects
- Exact change:
  - added `openDiagnostics()` to:
    - request diagnostics controls open through `diagnosticsUi`
    - open the settings panel
    - force the settings section id to `"diagnostics"`
  - reused that helper inside the existing ruler toggle path
  - passed `onDiagnosticsClick={openDiagnostics}` into `TopBar` when in game view so the existing `diagnostics-fab` path in `TopBar.svelte` is active again
  - passed `diagnosticsActive` into `TopBar` so the icon highlights when the settings panel is open on the Diagnostics section
- Result:
  - the intended bottom-right diagnostics icon path is restored on this branch
  - the icon opens the Settings UI directly to the Diagnostics section instead of requiring a separate panel or stale event path
- Validation:
  - `bun run build` still completes successfully after this wiring change
  - `GameContainer.svelte` now contains:
    - `openDiagnostics()` at line 129
    - `onDiagnosticsClick` wiring at line 496
    - `diagnosticsActive` wiring at line 506

### 2026-05-04 - Reframed the branch around a UI-first PVV4 experiment surface

- Action:
  - reviewed the existing PVV4 bet plan and the current settings architecture in:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\settingsRegistry.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\GameSettingsPanel.svelte`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\ControlsSection-Territory.svelte`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\integration\TerritorySettingsBridge.ts`
- Purpose:
  - shift the branch from hidden code-only PVV4 experiments toward an in-game control surface the user can operate directly while evaluating transition quality
  - keep future PVV4 bets inspectable and reversible without piling more one-off edits into unrelated territory panels
- Result:
  - the branch now treats the in-game `PVV4 Transition` section as the canonical experiment surface for Phase 1 timing and motion-isolation bets
- Validation:
  - implementation plan was traced against the current settings/render/runtime ownership paths before code changes were made

### 2026-05-04 - Implemented the top-level PVV4 Transition settings section and Phase 1 tunables

- Action:
  - edited:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\settingsRegistry.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\settingsSearch.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\GameSettingsPanel.svelte`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\ControlsSection-PVV4Transition.svelte`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\settingsDefs.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\config\game.config.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\config\territory.config.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\contracts\TerritoryFrameInput.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\integration\TerritorySettingsBridge.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\runtime\TerritoryConfigNormalizer.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\TransitionLayerCoordinator.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\ActiveFrontTransition.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\integration\TerritorySettingsBridge.test.ts`
- Purpose:
  - expose the current PVV4 timing bet and the next motion-isolation bet directly in the in-game UI
  - keep the settings persistent through the normal panel/config path instead of inventing a branch-only side channel
  - bind each surfaced control to the specific runtime seam that consumes it
- Exact change:
  - added a new developer-tier top-level settings section id:
    - `pvv4_transition`
  - mounted a dedicated `ControlsSection-PVV4Transition.svelte` body in `GameSettingsPanel.svelte`
  - the new section now shows:
    - current render mode
    - geometry mode
    - fill transition mode
    - effective territory transition duration
    - `PVV4 active` badge when `TERRITORY_RENDER_MODE === "power_voronoi_canonical"`
    - `Switch to PVV4` action when inactive
    - `Reset PVV4 Controls` action that resets only the five new PVV4 experiment keys
  - added five new Phase 1 PVV4 config/tunable keys and persisted them through the existing panel path:
    - `PVV4_PROGRESS_PROFILE`
    - `PVV4_PROGRESS_BLEND`
    - `PVV4_STABLE_ANCHOR_EPS`
    - `PVV4_CHANGE_SPAN_EPS`
    - `PVV4_CHANGE_SPAN_PAD_POINTS`
  - updated settings search routing so `PVV4_*` controls land in the new top-level section instead of being buried under generic territory search results
  - kept the shared `TERRITORY_TRANSITION_MS` and `TERRITORY_TRANSITION_BIND_TO_TICK` controls mirrored in the new section for direct PVV4 evaluation
- Runtime effect:
  - `TransitionLayerCoordinator.ts`
    - the existing PVV4-only progress shaper is now driven by:
      - `PVV4_PROGRESS_PROFILE`
      - `PVV4_PROGRESS_BLEND`
    - supported profiles:
      - `linear`
      - `smoothstep`
      - `ease_in_out_quad`
      - `ease_in_out_cubic`
  - `ActiveFrontTransition.ts`
    - stable-anchor acceptance is now driven by `PVV4_STABLE_ANCHOR_EPS`
    - changed-span detection is now driven by `PVV4_CHANGE_SPAN_EPS`
    - the detected changed span can now be widened symmetrically by `PVV4_CHANGE_SPAN_PAD_POINTS` before next-topology active sections are marked
- Result:
  - the branch now has a concrete UI-first PVV4 experiment surface for Bet A and Bet B
  - non-PVV4 render families ignore these new keys
  - the current live defaults preserve the branch's existing behavior:
    - profile = `smoothstep`
    - blend = `0.4`
    - stable anchor epsilon = `2`
    - change span epsilon = `2`
    - change span pad = `0`
- What this should let the user see:
  - a new top-level `PVV4 Transition` settings section in developer tier
  - an inactive banner plus `Switch to PVV4` button when another territory mode is active
  - live Bet A timing controls that can change how the current PVV4 transition breathes mid-motion
  - Bet B planning controls that only change the next conquest's changed-front isolation
- Validation:
  - `bun run build` completes successfully end to end in:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia`
  - targeted test passes:
    - `bunx vitest run src/lib/territory/integration/TerritorySettingsBridge.test.ts`
  - build output still contains pre-existing warning-level Svelte unused-selector noise and chunk-size warnings, but no new fatal errors from this implementation

### 2026-05-04 - Current next step after the UI surface landed

- Action:
  - no further visual bet has been stacked yet beyond the previously landed PVV4 easing default
- Purpose:
  - keep the branch aligned with the user's request for isolated, inspectable bets
- Result:
  - the immediate next step is not more code churn
  - the immediate next step is a user visual read of:
    - the new `PVV4 Transition` section itself
    - the default `smoothstep` / `0.4` timing profile
    - `Stable Anchor Epsilon`
    - `Changed Span Epsilon`
    - `Changed Span Padding`
- Validation:
  - the code is ready for in-app verification
  - performance judgment still requires the user to exercise real conquest cases in the live game

### 2026-05-04 - Instrumented PVV4 active-front diagnostics for snapped-vs-transitioned conquests

- Action:
  - edited:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\ActiveFrontTransition.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\TransitionLayerCoordinator.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\runtime\TerritoryRuntimeCoordinator.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\integration\GameCanvasTerritoryBridge.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\game\GameCanvas.svelte`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\stores\territoryRenderStatusStore.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\ControlsSection-Diagnostics.svelte`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\TransitionDiagnosticsAdapters.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\TransitionDiagnosticsAdapters.test.ts`
- Purpose:
  - instrument the exact seam the user called out: which conquests actually receive planned active fronts and which ones visually snap because the plan is empty or unavailable
  - produce both in-game readouts and exported diagnostic package JSON/images from the same planner truth instead of relying on vague visual guesses or console-only traces
- Exact change:
  - `ActiveFrontTransition.ts`
    - added per-anchor-pair planning diagnostics
    - every anchor pair now records:
      - `prevPathCount`
      - `nextPathCount`
      - path point counts
      - section ids
      - chosen split mode or lack of one
      - raw and padded change spans
      - active section ids when planned
      - pair outcome
    - added plan-level summary/classification:
      - `animated_fronts`
      - `collapse_only`
      - `snap_no_fronts`
    - added pair-level skip reasons:
      - `skipped_topology_gap`
      - `skipped_unsupported_split_mode`
      - `skipped_no_change_span`
    - added `compactActiveFrontTransitionPlan()` for export-safe JSON payloads
  - `TransitionLayerCoordinator.ts`
    - now computes a typed live `activeFrontDebug` summary every frame
    - summary includes:
      - evaluation
      - selected path
      - transition-active status
      - topology availability
      - front count
      - collapse count
      - sampled progress
      - compact plan summary
  - `TerritoryRuntimeCoordinator.ts`
    - recorder captures on conquest now include:
      - `kind: "active_front_live_capture"`
      - live `activeFrontDebug`
      - compact active-front plan JSON
    - conquest log line now prints the active-front evaluation category
  - `GameCanvasTerritoryBridge.ts`
    - bridge update now returns the runtime output so the game canvas can surface live canonical diagnostics instead of treating the bridge as write-only
  - `GameCanvas.svelte`
    - canonical bridge output is now captured per frame
    - live transition diagnostic state exports now include canonical PVV4 active-front diagnostics even when the non-canonical screenshot recorder path is inactive
    - `setTerritoryRenderStatus()` now carries `activeFrontDiagnostics`
  - `ControlsSection-Diagnostics.svelte`
    - added a live `AF Eval` readout block in Settings -> Diagnostics
    - it now shows:
      - evaluation
      - path used
      - transition-active status
      - sampled progress
      - front/collapse counts
      - topology-availability booleans
      - stable-anchor / pair / skip-count summary when available
  - `TransitionDiagnosticsAdapters.ts`
    - added an `active_front_live_capture` export adapter
    - exported package JSON now preserves the compact active-front diagnostic payload
    - exported package images now get a visible active-front summary HUD panel overlaid onto the render frame
  - `TransitionDiagnosticsAdapters.test.ts`
    - removed stale dependency on missing `pvCanonical` module files
    - replaced the adapter test with local mock-based coverage for both:
      - `power_voronoi_canonical`
      - `active_front_live_capture`
- Result:
  - this branch can now tell the difference between:
    - conquests that actually animate with planned fronts
    - conquests that only collapse removed loops
    - conquests that snap because no active fronts were planned
    - conquests that never received a topology plan because required topology snapshots were unavailable
  - the diagnostic package path now carries the same planner truth that the live UI shows
  - the benchmark bridge / canvas diagnostic state can now expose canonical PVV4 active-front status instead of returning only the older render-family capture state
- What this should let the user see:
  - in `Settings -> Diagnostics`, a live PVV4 active-front summary while reproducing snapped conquests
  - in exported diagnostic packages, a summary panel on the render frame plus JSON for:
    - plan classification
    - stable-anchor counts
    - pair counts
    - skip counts
    - compact per-front / per-pair planner data
- Best current hypothesis:
  - the dominant snap cases are likely to land in one of two buckets:
    - `snap_no_fronts` because all candidate pairs are being skipped, most likely by `skipped_no_change_span`
    - `topology_unavailable` if the planner is not receiving the topology pair it expects on the conquest frame
  - this is now an evidence question instead of a guess; the next user run should tell us which bucket is actually dominant
- Validation:
  - `bun run build` completes successfully end to end in:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia`
  - targeted tests pass:
    - `bunx vitest run src/lib/territory/devtools/TransitionDiagnosticsAdapters.test.ts src/lib/territory/integration/TerritorySettingsBridge.test.ts`
  - the unrelated local settings file remains dirty and was not touched:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\common\resources\settings-live\current-settings.json`

## Current Files Most Likely To Matter

- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\game\GameCanvas.svelte`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\ControlsSection-Diagnostics.svelte`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\ControlsSection-PVV4Transition.svelte`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\settingsRegistry.ts`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\settingsDefs.ts`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\stores\territoryRenderStatusStore.ts`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\integration\GameCanvasTerritoryBridge.ts`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\integration\TerritorySettingsBridge.ts`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\runtime\TerritoryRuntimeCoordinator.ts`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\TransitionLayerCoordinator.ts`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\ActiveFrontTransition.ts`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\TransitionDiagnosticsAdapters.ts`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\TransitionDiagnosticsAdapters.test.ts`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\game\GameContainer.svelte`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\geometry\geometryTuning.ts`

## Current Risks

- The easiest failure mode is over-fixing a mode that the user already considers close.
- The new diagnostics are strong enough to tempt large planner rewrites; that remains the wrong move until real conquest runs show a dominant skip category.
- Source-level naming / path inconsistencies still exist in the territory stack; they should not become cleanup distractions unless a specific experiment proves they are on the hot path.
- Older worktrees or branches that predate the `GameContainer.svelte` cleanup but include the diagnostics-shell migration can still recur with the same stale import unless they absorb this fix or the later master integration.
- Older worktrees or branches that predate the local `geometryTuning.ts` contract update can likewise recur with the same missing-export failure unless they absorb this fix.
- `bun run build` is now green, but `bun run check` is still expected to be noisy with broader pre-existing type issues outside this focused fix path.

## Next Intended Step

- Run live conquest cases with the recorder enabled and read the new `AF Eval` diagnostics in-game.
- Export at least a few snapped and a few animated conquest bundles and compare their active-front classifications / skip counts.
- Only after that evidence is gathered, place the first repair bet on the dominant failure class instead of stacking speculative motion edits.

## Update: 2026-05-04 - Restore `Show Underlying Geometry` Control

- Trigger:
  - user reported that `Show Underlying Geometry` had been removed from the in-game diagnostics UI and explicitly asked for it to be put back
- Root cause:
  - the underlying runtime path was still intact:
    - `GameCanvas.svelte` still reads `GAME_CONFIG.PERIMETER_FIELD_DEBUG_SHOW_GEOMETRY`
    - perimeter-field tuning metadata still defines the setting
  - the regression was the UI surface:
    - `ControlsSection-Diagnostics.svelte` no longer rendered the checkbox even though `GameSettingsPanel.svelte` was already passing `updatePanel`
- Change made:
  - updated:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\ControlsSection-Diagnostics.svelte`
  - added:
    - `updatePanel` prop consumption
    - local `writeConfig()` helper using:
      - `GAME_CONFIG[...] = value`
      - `updatePanel(panelKey, value)`
      - `bumpTerritoryVisualConfig()`
  - restored the diagnostics checkbox:
    - label: `Show underlying geometry`
    - config key: `PERIMETER_FIELD_DEBUG_SHOW_GEOMETRY`
    - panel key: `perimeterFieldDebugShowGeometry`
  - added inline helper copy explaining:
    - cyan = current/base geometry
    - magenta = next-state geometry during scrub mode
- Purpose:
  - restore the exact missing control rather than inventing a new overlay path
  - ensure the toggle persists through the normal panel/local settings path
  - ensure geometry overlay changes repaint immediately even while paused
- Expected user-visible result:
  - `Settings -> Diagnostics` once again contains `Show underlying geometry`
  - turning it on should make perimeter-field debug geometry loops appear again
  - turning it off should remove those loops without needing a full reload

## Update: 2026-05-04 - Add Diagnostics UI Communication Rule

- Trigger:
  - user called out that prior diagnostics guidance was not actionable because it referred to internal labels and code concepts instead of concrete UI steps and deliverable artifacts
- Problem:
  - previous communication told the user to look at textual diagnostics like `AF Eval` without clearly stating:
    - where in the UI to find them
    - what interaction to perform
    - what exact data to send back
    - how that data would help the agent
- Change made:
  - updated:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\AGENT.md`
  - added:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\rules\diagnostics-ui-communication.md`
- Rule content added:
  - all user-assisted diagnostics asks must be UI-anchored
  - all such asks must include:
    - where to click
    - what to do
    - what the user should see
    - what to send back
    - what the agent will learn
  - exported artifacts are preferred over manual transcription when available
  - internal code-path language is not allowed as the primary instruction surface
- Purpose:
  - make future diagnostics requests usable in one pass
  - reduce ambiguity and user translation effort
  - force the agent to request the highest-value artifact the UI can already produce

## Update: 2026-05-04 - Fix PVV4 Geometry Toggle And Export Target

- Trigger:
  - user reported that `Show underlying geometry` appeared in Diagnostics but did not actually work
  - user also correctly called out that exported diagnostics polluting `Downloads` is not acceptable
- Root cause for the geometry toggle:
  - the restored checkbox wrote the correct setting key, but the actual draw path only consumed that key inside the perimeter-field debug overlay
  - PVV4 / canonical runtime modes had no geometry-overlay consumer for the same setting, so the toggle changed config and repainted without drawing anything visible
- Code changes:
  - updated:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\game\GameCanvas.svelte`
      - added `canonicalDebugGeometrySnapshot`
      - added `modeUsesCanonicalRuntimeGeometry()`
      - extended the existing underlying-geometry overlay path to draw canonical runtime geometry loops for:
        - `power_voronoi_canonical`
        - clean-bridge `territory_canonical`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\ControlsSection-Diagnostics.svelte`
      - updated the helper copy so the toggle is described as current-mode geometry rather than perimeter-field-only geometry
- Export target changes:
  - updated:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\TransitionBundleSerializer.ts`
      - added File System Access API folder export support
      - added IndexedDB persistence for the chosen export directory handle
      - preserved browser-download fallback when direct folder export is unsupported or unset
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\ControlsSection-Diagnostics.svelte`
      - added export target status readout
      - added `Choose Export Folder`
      - added `Use Browser Downloads`
- Process corrections:
  - updated:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\rules\diagnostics-ui-communication.md`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\AGENT.md`
  - added:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\docs\project\post-mortems\2026-05-04_diagnostics-toggle-and-artifact-ask.md`
  - new rule:
    - do not ask the user to "reproduce" a specific past event unless a replay/scrub surface already exists
    - prefer exported artifacts over manual panel readouts whenever the UI can provide them
- Validation:
  - `bun run build` passes end to end after these changes
- Expected user-visible result:
  - in PVV4, `Settings -> Diagnostics -> Show underlying geometry` should now draw cyan canonical geometry loops instead of doing nothing
  - in Diagnostics -> Exports, the user can choose a diagnostics folder once and future exports will write there directly instead of dumping into `Downloads`

## Update: 2026-05-04 - Human-Readable Diagnostic Capture Timestamps

- Trigger:
  - user asked that debug files stop using hard-to-read timestamp formatting and instead use human-readable capture times
- Change made:
  - updated:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\snapshotExport.ts`
      - added `formatLocalCaptureTimeFromIsoTimestamp()`
      - changed shared file prefix generation to use file-safe local capture time
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\TransitionBundleSerializer.ts`
      - package README now shows:
        - `Captured: hh:mm:ss---mmm`
        - `Captured ISO: ...`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\PerimeterFieldConquestPackage.ts`
      - contact sheet timestamp and README timestamp now use human-readable local capture time
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\ControlsSection-Diagnostics.svelte`
      - bundle list timestamps now show the same human-readable local capture time
- Timestamp format:
  - visible labels:
    - `hh:mm:ss---mmm`
  - filenames:
    - `hh-mm-ss---mmm`
  - reason:
    - Windows filenames cannot contain `:`, so the filename form preserves the same readable layout with safe separators
- Purpose:
  - make exported diagnostics readable at a glance in the filesystem and in package summaries
  - avoid forcing the user to mentally parse compact or machine-oriented timestamps
- Validation:
  - `bun run build` passes end to end after the shared formatter change

## Update: 2026-05-04 - Conquest Package Naming And Snap-Package Read

- Trigger:
  - user supplied a PVV4 transition diagnostic package and asked two things at once:
    - determine whether the capture was a real snap conquest
    - replace the vague package naming with an explicit conquest naming convention
- Diagnostic read from the supplied package:
  - inspected:
    - `C:\Users\mikep\Downloads\2026-05-04-134444_transition-diagnostic-package\debug\diagnostic.json`
    - companion render frames in the same package
  - findings:
    - classification: `snap_no_fronts`
    - candidate pairs: `34`
    - planned pairs: `0`
    - front count: `0`
    - active section count: `0`
    - topology-gap skips: `4`
    - unsupported-split skips: `13`
    - no-change-span skips: `17`
  - conclusion:
    - this package is not a bad-looking animation; it is a true no-front snap where the active-front planner evaluated the conquest and produced zero animated fronts
- Naming problem found:
  - bundle ids and visible labels were still built from:
    - `starId + previousOwner + newOwner`
  - examples of the old ambiguity:
    - Diagnostics bundle rows showed `★star old→new`
    - transition package ids used `_previousOwner_to_newOwner`
    - perimeter-field replay labels used `old -> new @ star`
  - this did not identify the conquering star and therefore did not answer the user’s actual question: who conquered whom
- Code changes:
  - added:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\conquestNaming.ts`
      - shared conquest label + filename helper
      - canonical display/file sentence:
        - `attackerStar(newOwner)_conquers_targetStar(previousOwner)`
      - file-safe fallback sanitization for exports
  - updated:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\TransitionSnapshotRecorder.ts`
      - bundle ids now use the explicit conquest sentence prefix instead of `_previousOwner_to_newOwner`
      - direct-export file prefixes now inherit the conquest sentence too
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\TransitionBundleSerializer.ts`
      - package manifest now includes `conquestLabel`
      - README conquest line now uses the explicit sentence
      - package and direct-download filenames now use the conquest sentence prefix
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\PerimeterFieldConquestPackage.ts`
      - conquest package README/contact sheet label now use the explicit sentence
      - conquest package zip and contact sheet filenames now use the conquest sentence prefix
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\ControlsSection-Diagnostics.svelte`
      - bundle list labels now use the explicit conquest sentence
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\game\GameCanvas.svelte`
      - perimeter-field replay history labels now use the explicit conquest sentence
- Attacker-metadata preservation changes:
  - reason:
    - the explicit naming rule depends on attacker star ids being preserved through conquest capture paths
  - updated:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\contracts\OwnershipContracts.ts`
      - added optional `attackerShipTransfers`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\integration\TerritoryFxBridge.ts`
      - now carries `attackerStarId`, `attackerStarIds`, and `attackerShipTransfers`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\game\GameCanvas.svelte`
      - render-family ownership snapshot capture now preserves attacker metadata
      - transition diagnostic conquest-event capture now falls back safely when only `attackerStarId` exists
- Important note about the user-supplied package:
  - the provided package predated this naming change and still lacked attacker-star fields in its exported manifest
  - after this patch, regenerated packages should carry the attacker metadata on more paths, making the explicit naming convention stable instead of best-effort
- Validation:
  - `bun run build` passes end to end after the naming + metadata changes
  - `bunx vitest run src/lib/territory/devtools/TransitionDiagnosticsAdapters.test.ts src/lib/territory/integration/TerritorySettingsBridge.test.ts` passes

## Update: 2026-05-04 - Fix Active-Front Section Overextension And Diagnostics Artifact Drift

- Trigger:
  - user supplied another diagnostic package:
    - `C:\Users\mikep\Downloads\15-28-02---366_transition-diagnostic-package\debug\diagnostic.json`
    - companion `topology.json`, `geometry_snapshot.json`, and rendered frames
  - user correctly called out that this was not a snap case; it was an `animated_fronts` case where the active front was not pinned correctly with change anchors
- Diagnostic read from the supplied package:
  - classification:
    - `animated_fronts`
  - planner summary:
    - `pairCount = 37`
    - `plannedPairCount = 1`
    - `stableAnchorCount = 30`
    - `skippedUnsupportedSplitCount = 16`
    - `skippedNoChangeSpanCount = 20`
  - key planned front:
    - `anchorStartId = -50,330.43`
    - `anchorEndId = 794.42,392.78`
    - `changeSpan = { base: "next", startIndex: 23, endIndex: 49 }`
    - `activeSectionIds = ["794.42,392.78->-50,330.43:ai-5|human-player"]`
  - important interpretation:
    - the planner did find a local changed subspan on the long `ai-5|human-player` chain
    - but both runtime sampling and exported frame overlays were still treating the whole overlapping section as the moving front
    - this is exactly why the user saw motion traveling farther than needed
- Root cause:
  - `ActiveFrontTransition.ts` already computes a `changeSpan`, but section sampling used a full-chain interpolation slice for any section whose span overlapped that interval
  - on a one-section chain, that effectively promoted a local changed subspan into a whole-section morph
  - `TransitionFrontierFrameRenderer.ts` had a second independent drift:
    - its highlighted active line was a naive `prev section -> next section` lerp
    - its endpoint labels were showing stable-anchor endpoints as `AF-start` / `AF-end`
    - so the artifact itself was overstating the moving front even before any runtime bug was considered
- Code changes:
  - updated:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\ActiveFrontTransition.ts`
      - added `sampleActiveFrontSectionGeometry()`
      - added sampled-path composition that keeps unchanged tails pinned to stable geometry while only the true changed span uses interpolated path points
      - added `clampChangeSpanToStableEndpoints()` so matched stable anchors do not remain inside the final moving interval
      - added `getActiveFrontChangeAnchors()` for diagnostics/exports
      - added `changeAnchors` to compact diagnostic output
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\TransitionFrontierFrameRenderer.ts`
      - active-section overlays now draw the same sampled section geometry used by runtime fill reconstruction
      - stable-anchor labels renamed to `SA*`
      - local change-anchor labels added as `AF*`
      - this removes the earlier artifact drift where the exported highlighted front could be broader than the actual sampled runtime front
  - added:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\ActiveFrontTransition.test.ts`
      - regression test covering a long single section with only a local changed span
      - asserts that near-identical tails stay pinned while the interior span morphs
- Purpose:
  - keep PVV4 fixes local and visual instead of rewriting the planner wholesale
  - make the runtime honor the planner's local changed span instead of letting overlap activate a whole section
  - make exported diagnostic artifacts trustworthy enough for the user to reason from visually
- Validation:
  - `bunx vitest run src/lib/territory/layers/transition/ActiveFrontTransition.test.ts src/lib/territory/devtools/TransitionDiagnosticsAdapters.test.ts` passes
  - `bun run build` passes end to end
- Expected user-visible result:
  - exported diagnostic frames for this class of `animated_fronts` case should no longer show the whole long frontier section behaving as one moving front
  - the highlighted active geometry should stay local to the true changed interval
  - stable anchor pair endpoints should read as `SA*`
  - the local pinned change anchors should read as `AF*`
- Why this matters for the branch:
  - this is still a small-bet fix in the user's requested style
  - it preserves the existing mode and narrows one concrete visible defect instead of chasing planner purity

## Update: 2026-05-04 - Preserve Conquest Context In Package-Internal Debug JSON Filenames

- Trigger:
  - user supplied another diagnostic package:
    - `C:\Users\mikep\Downloads\15-27-15---056_transition-diagnostic-package\debug\diagnostic.json`
    - companion `topology.json`, `geometry_snapshot.json`, and rendered frames
  - user correctly called out two things:
    - this is a dual-conquest event
    - the JSON files inside the package are still named generically, which loses conquest context when extracted or shared
- Diagnostic read from the supplied package:
  - classification:
    - `animated_fronts`
  - conquest events at the same simulation timestamp:
    - `star-26: ai-5 -> ai-4`
    - `star-27: ai-4 -> ai-3`
  - planner summary:
    - `plannedPairCount = 2`
    - `frontCount = 2`
    - `activeSectionCount = 17`
    - `skippedTopologyGapCount = 3`
    - `skippedUnsupportedSplitCount = 4`
    - `skippedNoChangeSpanCount = 22`
  - interpretation:
    - this package is a real two-front `animated_fronts` capture, not a snap
    - the package itself predates the latest local-span pinning fix, so its frames still reflect the older artifact style
- Root cause of the naming problem:
  - conquest-aware filenames had already been fixed for top-level package names and direct-download JSON exports
  - but `TransitionBundleSerializer.ts` was still hardcoding the package-internal extracted debug payload names as:
    - `debug/diagnostic.json`
    - `debug/topology.json`
    - `debug/geometry_snapshot.json`
  - that meant the extracted files lost both:
    - capture datetime context
    - conquest identity context
- Code changes:
  - updated:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\TransitionBundleSerializer.ts`
      - added `buildDiagnosticDebugFileNames(bundle)`
      - package-internal `debug/` JSON files now use the conquest-aware datetime prefix:
        - `{prefix}_diagnostic.json`
        - `{prefix}_topology.json`
        - `{prefix}_geometry_snapshot.json`
      - manifest now records these exact filenames under `debugFiles`
      - generated README now lists the prefixed debug filenames instead of the generic names
- Purpose:
  - keep extracted diagnostic JSON payloads self-describing when moved, compared, or shared outside the package directory
  - preserve the same conquest-aware naming rule across:
    - top-level package names
    - direct JSON exports
    - package-internal debug payloads
- Validation:
  - `bun run build` passes end to end
- Expected user-visible result:
  - newly exported diagnostic packages should no longer extract to generic debug filenames
  - instead, `debug/` should contain files like:
    - `15-27-15---056_<conquest-group>_diagnostic.json`
    - `15-27-15---056_<conquest-group>_topology.json`
    - `15-27-15---056_<conquest-group>_geometry_snapshot.json`
  - the user-supplied package still has the old internal names because it was exported before this patch

## Update: 2026-05-04 - Revert Local-Span Pinning Bet After Regression Report

- Trigger:
  - user reported that the previous local-span pinning experiment made visible behavior worse:
    - `Show underlying geometry` in PVV4 was only drawing a couple of partial outlines instead of the whole map
    - island/sole-star captures were again showing ghost-region flying/transforming behavior
    - some transitions were translating or transforming larger frontier sections than the user considered acceptable
  - user explicitly advised that it was likely best to revert the last transition change and rethink the problem-solution
- Root-cause read:
  - the transition regressions were on the local-span pinning experiment from:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\ActiveFrontTransition.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\TransitionFrontierFrameRenderer.ts`
  - the overlay regression was separate and isolated for follow-up:
    - canonical/PVV4 geometry was reusing the perimeter-field debug loop selector
    - that selector prefers `shellLoops` over `territoryRegions`
    - on canonical snapshots this can collapse the overlay down to only a few shell fragments instead of full region outlines
- Code changes:
  - reverted the local-span pinning experiment:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\ActiveFrontTransition.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\TransitionFrontierFrameRenderer.ts`
    - removed `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\ActiveFrontTransition.test.ts`
- Purpose:
  - get the branch back to the previously better visual baseline instead of continuing to stack regressions
  - preserve the diagnostics/naming/export improvements while backing out the failed motion experiment
  - separate the failed transition experiment from the unrelated overlay bug so each can be addressed cleanly
- Validation:
  - `bun run build` passes end to end
- Expected user-visible result:
  - PVV4 transitions should return to the pre-pin-bet behavior
  - the geometry overlay issue remains isolated as a separate follow-up fix

## Update: 2026-05-04 - Fix Canonical Underlying-Geometry Overlay Selection

- Trigger:
  - immediately after the transition revert, the separate geometry-overlay complaint still needed its own fix:
    - `Show underlying geometry` in PVV4 was drawing only 1-2 partial outlines
- Root cause:
  - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\game\GameCanvas.svelte`
  - canonical/PVV4 geometry had been routed through the same helper used by perimeter-field diagnostics:
    - `getPerimeterDebugLoops()`
  - that helper prefers `shellLoops`
  - canonical runtime snapshots can have shell-loop structure that is useful for shell diagnostics but not for “show me the full underlying territory geometry”
  - result:
    - the overlay could collapse to a few shell fragments instead of full region outlines
- Code changes:
  - updated:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\game\GameCanvas.svelte`
      - added mode-aware underlying-geometry loop selection
      - canonical modes now draw from `territoryRegions`
      - perimeter-field family modes still use shell-loop-oriented debug selection
- Purpose:
  - make `Show underlying geometry` in PVV4 actually useful for whole-map inspection
  - keep perimeter-field diagnostics unchanged while fixing the canonical/PVV4 path
- Validation:
  - `bun run build` passes end to end
- Expected user-visible result:
  - in `Settings -> Diagnostics`, turning on `Show underlying geometry` while PVV4 is active should now draw cyan region outlines across the whole map rather than just 1-2 partial shell fragments

## Update: 2026-05-04 - Add Explicit Loop Birth/Death Transition Targets For PVV4

- Trigger:
  - after reverting the failed local-span pinning bet, the branch still needed a deeper transition improvement rather than another narrow heuristic tweak
  - the current best read is that PVV4 has at least two different classes of transition problem:
    - frontier deformation cases, where active-front interpolation is the right primitive
    - loop lifecycle cases, where a region/sliver/island appears or disappears and forcing everything through front matching is brittle
  - user direction for this branch remained clear:
    - go deeper
    - make the render mode genuinely strong rather than stopping at baseline preservation
- Working thesis:
  - a single “perfect active front” path is not enough
  - PVV4 needs a separate local primitive for loop birth/death so island captures and sliver events do not depend entirely on stable-anchor pair planning
  - this is a better foundation for future VFX because it gives the mode explicit knowledge of where new territory is born and where old territory dies
- Code changes:
  - updated:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\ActiveFrontTransition.ts`
      - added new plan classification:
        - `loop_targets_only`
      - added new loop-growth target type:
        - `ExpandTarget`
      - `planActiveFrontTransition(...)` now computes:
        - `collapseTargets`
        - `expandTargets`
      - `buildActiveFrontPlanDiagnostics(...)` now reports:
        - `expandTargetCount`
        - `loop_targets_only`
      - `sampleActiveFrontTransition(...)` now:
        - rebuilds NEXT loops normally
        - but if a NEXT loop is an expand target and `t < 1`, it grows that loop outward from its local center instead of only appearing as a fully-formed final loop
        - still collapses disappearing PREV loops toward their local center
      - `planCollapseTargets(...)` now always tries to produce a local target:
        - conquest-center match first
        - centroid fallback second
      - added `planExpandTargets(...)`:
        - appearing loops are matched to conquest events by `newOwner`
        - conquest-center match first
        - same-owner collapse-center fallback or centroid fallback second
      - added helpers:
        - `resolveConquestCenter(...)`
        - `nearestCenterToPoint(...)`
        - `expandLoopFromPoint(...)`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\TransitionLayerCoordinator.ts`
      - runtime diagnostics now expose:
        - `loop_targets_only`
        - `expandTargetCount`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\ControlsSection-Diagnostics.svelte`
      - active-front diagnostics grid now shows:
        - `Grows`
        - `Grow Targets`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\TransitionDiagnosticsAdapters.ts`
      - exported overlay summary now includes grow-target counts
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\TransitionFrontierFrameRenderer.ts`
      - diagnostics overlay now draws grow-target geometry:
        - grow center marker
        - grow polyline preview
        - `＋ ownerId` label
  - added:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\ActiveFrontTransition.test.ts`
      - regression test for a no-front case with one disappearing loop and one appearing loop
      - asserts:
        - classification becomes `loop_targets_only`
        - `expandTargetCount === 1`
        - the expanding loop is collapsed to its center at `t = 0`
        - the final frame resolves cleanly to the NEXT loop at `t = 1`
- Purpose:
  - stop treating loop-lifecycle events as frontier-only problems
  - give PVV4 a second explicit motion primitive that is local, deterministic, and VFX-friendly
  - create a better base for later work on island capture polish, sliver behavior, and effect spawning around territory birth/death
- Validation:
  - `bunx vitest run src/lib/territory/layers/transition/ActiveFrontTransition.test.ts src/lib/territory/devtools/TransitionDiagnosticsAdapters.test.ts` passes
  - `bun run build` passes end to end
- Expected user-visible result:
  - some cases that previously had no usable active front should now classify as:
    - `loop_targets_only`
  - in those cases, the branch should animate local loop collapse/grow behavior instead of defaulting straight to a snap
  - diagnostics should now make that obvious in both:
    - `Settings -> Diagnostics`
    - exported frame overlays / package JSON
- Limits / open questions:
  - this does not solve the long-front local change-anchor problem that caused the earlier failed pinning bet
  - this is intentionally orthogonal:
    - frontier deformation still uses the active-front path
    - loop birth/death now has its own local path
  - next visual read should focus on whether island/sole-star captures look more grounded and less like ghost territory teleporting in/out

## Update: 2026-05-04 - Purge Whole-Loop Birth And Reground PVV4 On Minimal Frontier Transport

- Trigger:
  - user explicitly rejected the entire “new loop should grow from a local center” concept as invalid:
    - it never represents a real conquest
    - it reintroduced whole-region birthing / morphing
    - it violates the core change-anchor intent of minimal transport
  - user restated the governing rule:
    - no whole-region morphs or moves
    - isolate the minimum changed frontier span
    - keep change-anchor endpoints pinned
- State / trace:
  - the concrete source of the bad behavior was not abstract; it was the runtime sampler introduced in commit `e9f47b81a`
  - `ActiveFrontTransition.ts` had started doing this during NEXT-loop reconstruction:
    - look up `expandTargets`
    - replace a full NEXT loop with `expandLoopFromPoint(...)`
    - this synthesized a whole appearing region from a center before any anchored frontier justified it
  - the earlier frontier bug remained separate and still real:
    - `findChangeSpan(...)` computes a point-level changed interval
    - `buildSectionSpans(...)` used overlap to activate whole sections
    - runtime then replaced the whole overlapping section slice
    - that is where minimal transport was being violated even without the loop-birth path
- Code changes:
  - updated:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\ActiveFrontTransition.ts`
      - removed:
        - `ExpandTarget`
        - `expandTargets`
        - `expandTargetCount`
        - `loop_targets_only`
        - `planExpandTargets(...)`
        - `nearestCenterToPoint(...)`
        - `expandLoopFromPoint(...)`
      - kept disappearance-only whole-loop fallback:
        - `collapseTargets`
        - conquest-center first, centroid fallback second
      - reintroduced only the useful local-span work:
        - `clampChangeSpanToStableEndpoints(...)`
        - `sampleActiveFrontSectionGeometry(...)`
        - `getActiveFrontChangeAnchors(...)`
      - changed section sampling semantics:
        - section overlap no longer means whole-section replacement
        - each overlapping section now stores a local active interval derived from the global `changeSpan`
        - runtime starts from stable NEXT section geometry and swaps in interpolated points only for the interior moving interval
        - unchanged tails remain pinned
      - fail-safe split handling:
        - `1to2` / `2to1` pairs are now skipped instead of broad-animating
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\TransitionLayerCoordinator.ts`
      - removed grow-path runtime diagnostics
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\ControlsSection-Diagnostics.svelte`
      - removed:
        - `Grows`
        - `Grow Targets`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\TransitionDiagnosticsAdapters.ts`
      - removed grow counts from exported active-front overlay text
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\TransitionFrontierFrameRenderer.ts`
      - removed all grow-path overlay rendering
      - overlays now draw sampled active sections from the same helper used by runtime fill reconstruction
      - stable anchors are labeled `SA*`
      - local change anchors are labeled `AF*`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\ActiveFrontTransition.test.ts`
      - replaced the grow-path regression with two direct rules:
        - collapse-only disappearing region
        - pinned long single-section frontier
- Purpose:
  - remove the invalid concept entirely rather than trying to “tune” it
  - keep only admissible motion primitives:
    - anchored frontier transport
    - shrink-to-nothing for genuinely disappearing PREV-only loops
  - move the branch back onto the real problem:
    - point-level change spans must produce point-level local motion, not whole-section transport
- Validation:
  - `bunx vitest run src/lib/territory/layers/transition/ActiveFrontTransition.test.ts src/lib/territory/devtools/TransitionDiagnosticsAdapters.test.ts` passes
  - `bun run build` passes end to end
- Supersession note:
  - the previous section titled `Add Explicit Loop Birth/Death Transition Targets For PVV4` is now historical only
  - its whole-loop birth/grow thesis is explicitly rejected by the current branch state and by user direction

## Update: 2026-05-04 - Clarify Acceptance Hierarchy For PVV4 Transition Quality

- Trigger:
  - user explicitly clarified the evaluation priority for this branch:
    - snap-transition is preferable to grossly deformed transition
    - mildly distorted transition may or may not be preferable to snap, depending on the specific visual result
- Branch doctrine impact:
  - animation coverage is not a goal by itself
  - the branch should not broaden transport just to avoid a snap
  - any future PVV4 bet must be judged with this hierarchy:
    1. reject gross deformation even if it animates
    2. accept snap when the alternative is broad drift, ghost motion, or whole-section/region distortion
    3. only keep mild distortion if it is demonstrably better than the equivalent snap in the actual conquest case
- Practical consequence for upcoming work:
  - bias future fixes toward smaller-scope, fail-safe local transport
  - when an ambiguous split or change-anchor case cannot be bounded cleanly, prefer skip/snap rather than a broader animated guess
  - treat "more conquests animate" as a non-goal unless the added coverage preserves minimal transport

## Update: 2026-05-04 - Make Change Anchors The Runtime Transport Primitive

- Trigger:
  - user explicitly redirected the branch toward the key concept:
    - change anchors are the correct governing primitive
    - the goal is not broader animation coverage
    - the goal is minimal border transport inside the bounded changed frontier span
- State / diagnosis:
  - after the minimal-transport reset, the branch still had one important conceptual leak:
    - planning detected a point-level local `changeSpan`
    - runtime still built moving points from a whole-chain stable-anchor morph
    - then it only masked that broad morph down to the active section output
  - that meant the unchanged tails could remain visually static while the interior moving points were still being influenced by the full stable-anchor chain
  - this is exactly the wrong hierarchy:
    - stable anchors should bound the frontier chain
    - change anchors should bound the transport window inside it
    - the transport should be generated from the change-anchor window itself
- Code changes:
  - updated:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\ActiveFrontTransition.ts`
      - added `localChangeWindow` to each planned active front:
        - `nextAnchorStartIndex`
        - `nextAnchorEndIndex`
        - `prevStartParam`
        - `prevEndParam`
      - planning now constructs that window directly from the clamped local `changeSpan`
      - if the local anchor window cannot be constructed monotonically on the PREV path, the pair is skipped rather than broad-animated
      - removed the remaining whole-chain interpolation runtime for admissible `1 -> 1` pairs
      - runtime now:
        - starts from the stable NEXT path
        - samples the PREV polyline only between the projected local change anchors
        - interpolates only the interior points inside that local anchor window
      - exported compact diagnostics now include `changeAnchorWindow`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\ActiveFrontTransition.test.ts`
      - kept the pinned-tail regression
      - added a new regression where a noisy-but-stable prefix would previously drag the changed interior off its local corridor
      - the new regression asserts the changed points stay centered inside the local anchor window instead of being pulled by the full stable-anchor chain
- Purpose:
  - make change anchors the actual transport primitive instead of a post-hoc diagnostic description
  - ensure runtime behavior matches the branch doctrine:
    - local change window first
    - skip/snap if that local window cannot be built safely
    - never broaden transport just to keep animation coverage
- Validation:
  - `bunx vitest run pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.test.ts pax-fluxia/src/lib/territory/devtools/TransitionDiagnosticsAdapters.test.ts` passes
  - `bun run build` passes end to end
- Expected user-visible result:
  - long-front `animated_fronts` cases should now be less likely to have their interior points dragged by distant stable-tail geometry
  - `AF` markers still show the local window endpoints, but now they also correspond to the runtime interpolation window
  - if a case cannot support a safe local anchor window, the branch should prefer snap/skip over broad deformation

## Update: 2026-05-04 - Fix False Region Disappearances From Loop-Id Churn And Shorten Export Names

- Trigger:
  - user supplied package:
    - `19-07-58---665_unknown-star(ai-5)_conquers_star-14(human-player)_unknown-star(ai-3)_conquers_star-21(ai-4)`
  - user reported the visible disappearance of 4 of 6 regions and called out both:
    - incorrect change-anchor placement around 3-way junctions / split cases
    - overly long Windows-hostile package filenames
- Package diagnosis:
  - this package is a dual-conquest `animated_fronts` case, but the immediate catastrophic artifact was not only split skipping
  - exported diagnostics showed:
    - `frontCount = 2`
    - `collapseTargetCount = 4`
    - `skippedUnsupportedSplitCount = 15`
  - inspecting the compact topology revealed that those 4 collapse targets were false positives:
    - PREV loops like:
      - `ai-5:3`
      - `ai-3:4`
      - `ai-2:5`
      - `ai-1:6`
    - became NEXT loops like:
      - `ai-5:4`
      - `ai-3:5`
      - `ai-2:6`
      - `ai-1:7`
    - owner/component identity persisted, but raw loop ids changed
  - root cause:
    - `planCollapseTargets(...)` was deciding disappearance by `loop.id` membership only
    - that made stable regions look like disappearing PREV-only loops whenever topology recompaction renumbered loop ids
- Code changes:
  - updated:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\ActiveFrontTransition.ts`
      - replaced raw `nextLoopIds.has(loop.id)` disappearance logic
      - added semantic loop matching before collapse planning:
        - owner match
        - outer vs hole match
        - component-id match first pass
        - centroid / area fallback pass
      - only unmatched PREV loops are now eligible collapse targets
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\ActiveFrontTransition.test.ts`
      - added regression:
        - stable loop geometry with churned loop ids must not produce collapse targets
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\conquestNaming.ts`
      - changed export file-label construction to compact conquest codes:
        - `star-14 / human-player -> ai-5` becomes `s14_hp-a5`
      - file labels are now short `cq_*` strings instead of full sentence-style conquest labels
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\TransitionBundleSerializer.ts`
      - shortened transition package zip suffix to `_tdp.zip`
      - shortened compact debug json names to:
        - `_diag.json`
        - `_topo.json`
        - `_geo.json`
      - shortened direct JSON export names to the same compact suffixes
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\TransitionSnapshotRecorder.ts`
      - updated recorded file lists to match `_topo.json` / `_geo.json`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\PerimeterFieldConquestPackage.ts`
      - shortened perimeter-field package zip suffix to `_pfcp.zip`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\conquestNaming.test.ts`
      - added regression coverage for compact file-prefix generation
- Purpose:
  - stop unrelated stable regions from being collapsed purely because loop ids renumbered between PREV and NEXT
  - make exported package and debug filenames short enough for normal Windows unzip behavior
  - separate the immediate false-collapse bug from the still-open split/junction planner problem
- Validation:
  - `bunx vitest run pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.test.ts pax-fluxia/src/lib/territory/devtools/TransitionDiagnosticsAdapters.test.ts pax-fluxia/src/lib/territory/devtools/TransitionBundleSerializer.test.ts pax-fluxia/src/lib/territory/devtools/conquestNaming.test.ts` passes
  - `bun run build` passes
- Remaining problem explicitly not solved by this checkpoint:
  - the package still demonstrates that split handling remains insufficient:
    - `1:2` / `2:1` pairs are still skipped
    - 3-way junctions still need to be elevated into default change-anchor candidates for split planning
  - this checkpoint removes false collapse artifacts first so that split-planning work can be judged cleanly

## Update: 2026-05-04 - Reset Branch Motion To The Pre-Experiment PVV4 Baseline

- Trigger:
  - user concluded the branch motion state was worse than the starting point:
    - collapsing regions still visible
    - snap conquests still present
    - deformations still present
    - overall transition behavior worse than before the branch experiments
  - user approved a reset rather than another additive fix pass
- Diagnosis behind the reset:
  - the branch had accumulated multiple overlapping motion ideas:
    - local change-anchor window transport
    - strict minimal-transport gating
    - split suppression
    - semantic collapse fixes
  - some of those changes were useful in isolation, but the combined runtime state was no longer a clean improvement over baseline
  - the right next move was to restore the older motion behavior and keep only the tooling/export/diagnostic wins plus the clear false-collapse bug fix
- Code changes:
  - updated:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\ActiveFrontTransition.ts`
      - removed the local change-anchor-window runtime transport experiment
      - removed the sub-section active-window runtime behavior introduced after the earlier baseline
      - restored the older chain-based active-front interpolation model that was in place before the later motion experiments
      - restored `1to2` / `2to1` split interpolation behavior instead of force-skipping those pairs
      - preserved semantic collapse matching so stable loops are not treated as disappearing because of loop-id churn
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\ActiveFrontTransition.test.ts`
      - removed the experiment-specific local-window regressions
      - kept direct regressions for:
        - disappearance-only collapse
        - no false collapses when loop ids change but loop identity persists
- Purpose:
  - put the branch back onto a sane motion baseline
  - stop tuning on top of an already degraded behavioral stack
  - keep the later diagnostics and export infrastructure so future bets can be measured against that baseline instead of against a noisy half-state
- Validation:
  - `bunx vitest run pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.test.ts pax-fluxia/src/lib/territory/devtools/TransitionDiagnosticsAdapters.test.ts pax-fluxia/src/lib/territory/devtools/TransitionBundleSerializer.test.ts pax-fluxia/src/lib/territory/devtools/conquestNaming.test.ts` passes
  - `bun run build` passes
- Supersession note:
  - the earlier sections titled:
    - `Reset PVV4 To Minimal Frontier Transport And Purge Whole-Loop Birth`
    - `Make Change Anchors The Runtime Transport Primitive`
  - remain useful as historical investigation notes only
  - they do not describe the current runtime behavior after this reset checkpoint

## Update: 2026-05-04 - Replace Incremental Bet Framing With Explicit Recovery Plan

- Trigger:
  - after reset, user reported the branch still did not present a clearly improved transition state
  - user requested a plan to fix PVV4 with crystalline articulation of intent at every stage
- Scope change:
  - old scope:
    - iterate on narrow PVV4 motion bets and judge them visually
  - new scope:
    - rebuild the branch workflow around a staged recovery plan
    - first make evaluation and diagnostics trustworthy
    - only then re-enter motion changes
- New canonical planning document:
  - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\docs\plans\2026-05-04\PVV4_TRANSITION_RECOVERY_PLAN.md`
- Why this scope change is necessary:
  - the branch is no longer blocked only by one bad algorithm
  - it is blocked by ambiguity in:
    - what is actually wrong in each case
    - which checkpoint is actually better
    - whether the planner/runtime/diagnostics are telling the same story
  - continuing with ad hoc visual bets would produce more noise, not more truth
- Core strategic conclusions recorded in the recovery plan:
  - snap is preferable to gross deformation
  - whole-region movement is invalid
  - whole-region birth is invalid
  - 3-way junctions must become first-class structural anchor candidates
  - `1:2` / `2:1` cases must be solved explicitly or snapped cleanly
  - the first real implementation step is not "tune motion"
  - the first real implementation step is:
    - lock a canonical PVV4 casebook
    - make one diagnostic package fully explain one conquest with no ambiguity
- Immediate next branch step:
  - execute Stage 0 and Stage 1 of the recovery plan before touching transition behavior again

## Update: 2026-05-05 - Document Architecture Dialogue, Define Terms Precisely, And Record Region-ID Failure

- Trigger:
  - user shifted from transition tweaking to architecture and data-shape interrogation
  - user required:
    - lossless session documentation of the dialogue per `AGENT.md`
    - a distinct document for decisions, definitions, challenged concepts, and corrections
  - user then singled out one newly re-surfaced root problem:
    - live vector region IDs are still centroid-derived
    - user stated this had already been ruled out decisively weeks ago
- What was done:
  - created dated session docs:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\docs\sessions\2026-05-05\2026-05-05_Chat.md`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\docs\sessions\2026-05-05\2026-05-05_Session.md`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\docs\sessions\2026-05-05\2026-05-05_Takeaways.md`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\docs\sessions\2026-05-05\2026-05-05_Decisions-and-Definitions.md`
  - created today’s queue:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\docs\plans\2026-05-05\FEATURE_AND_TASK_QUEUE_2026-05-05.md`
  - corrected session-doc handling:
    - session docs under `.agent/docs/sessions/` are now intended to be tracked directly
    - the temporary duplicate tracked decisions/definitions artifact under `.agent/docs/plans/2026-05-05/` is removed
  - updated the long-lived decision record:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\docs\project\decisions\DECISIONS.md`
- Exact code-trace findings recorded in those docs:
  - vector geometry region IDs still come from centroid rounding:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\geometry\compiler_UnifiedVectorGeometry.ts`
  - geometry/topology versions still carry stale `pvv2:` fingerprint residue:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\compiler\powerVoronoiTerritoryGeometryGenerator.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\geometry\planners\GeometryFingerprint.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\compiler\buildFrontierTopology.ts`
  - recorder/export stack begins after raw frame-input normalization:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\TransitionSnapshotRecorder.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\TransitionBundleSerializer.ts`
- Why this was done:
  - preserve the architecture dialogue durably instead of letting it live only in thread context
  - convert the discussion into reusable branch memory
  - record the centroid-ID problem as a first-class architectural failure, not a casual observation
- Purpose for branch goal:
  - future PVV4 transition work cannot be trusted if region identity is coupled to centroid drift
  - future diagnostics work cannot be fully trusted while raw frame input and semantic identity are missing from exports
  - this checkpoint stabilizes memory and definitions before further transition work
- What was learned or changed:
  - the live system still violates prior region-identity direction by using centroid-based IDs
  - the `pvv2:` residue is naming/fingerprint drift, not proof that the legacy PVV2 runtime is executing
  - `bundle` vs `package`, `anchorKey` vs `change anchors`, and the exact meaning of active-front diagnostics are now explicitly defined in durable docs
- Validation:
  - documentation-only checkpoint
  - validation method:
    - direct code trace against the active worktree
    - confirmation against the exported `19-07-58---665` diagnostic files
  - not yet validated:
    - code removal of centroid-derived region IDs
    - removal of stale `pvv2:` version residue
    - recorder/export expansion to include raw frame input
- Next steps:
  1. remove centroid-derived region identity from the vector geometry compiler
  2. replace stale `pvv2:` fingerprint/version prefixes
  3. upgrade exported diagnostics to include:
     - raw frame input
     - full ownership snapshots
     - full transition snapshot
     - compact exports as secondary, not primary, truth

## Update: 2026-05-05 - Convert Dialogue Into Versioned Recovery Plan And Tighten Agent Rules

- Trigger:
  - user removed plan-mode constraints and explicitly required:
    - docs updated now
    - a real versioned plan doc in today's session folder
    - a dialogic response, not just silent planning
  - user also provided a long corrective architecture list covering:
    - `virtualStars`
    - `envelope`
    - diagnostics export gaps
    - `borderFrame`
    - `MSR` / `starWeight` / lane-pair semantics
    - shared runtime unification
    - `GameCanvas` truth ownership
    - centroid-based region identity
    - stale `pvv2:` residue
    - active-front diagnostic language and algorithm clarity
- What changed in docs/rules:
  - updated:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\AGENT.md`
      - added semantic-debt intercept rule
      - added no-anthropomorphizing-code communication rule
      - added context externalization / versioned session-plan rule
      - removed `canonical` as preferred dialogue term in favor of truthful semantics
      - updated territory pipeline wording so ownership no longer describes `virtualStars` as shared transition truth
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\docs\sessions\2026-05-05\2026-05-05_Chat.md`
      - appended the later user dialogue losslessly
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\docs\sessions\2026-05-05\2026-05-05_Session.md`
      - updated tasks, facts, and current architectural conclusions
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\docs\sessions\2026-05-05\2026-05-05_Takeaways.md`
      - updated technical lessons and next steps
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\docs\sessions\2026-05-05\2026-05-05_Decisions-and-Definitions.md`
      - added `envelope`, collapse rules, and shared-truth clarifications
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\docs\sessions\2026-05-05\2026-05-05_territory-runtime-recovery-plan_v1.md`
      - created as the first versioned recovery plan for the architecture reset
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\docs\plans\2026-05-05\FEATURE_AND_TASK_QUEUE_2026-05-05.md`
      - updated to point at the new plan and the shared-truth recovery sequence
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\docs\project\decisions\DECISIONS.md`
      - added durable branch-level decisions for:
        - whole-region birth invalidity and collapse legitimacy
        - shared truth pipeline across render modes
- Purpose:
  - convert the architecture critique into explicit, versioned branch memory
  - separate grouped semantic cleanup from the larger architecture and algorithm sprints
  - lock the new communication and architectural rules so future work cannot casually drift back into stale semantics
- Result:
  - this branch now has a versioned recovery plan instead of only ad hoc queue notes
  - the session docs now preserve the full later dialogue and the corrected design rules
  - the branch doctrine now explicitly includes:
    - no whole-region birth
    - collapse only on true final-region disappearance
    - per-star collapse as the default multi-star full-disappearance presentation
    - one shared ownership/geometry/transition truth pipeline for PV and field families
- Validation:
  - documentation-only checkpoint
  - no runtime code changed in this update

## Update: 2026-05-05 - Incorporate User Active-Front And DX Concepts Into Recovery Plan v2

- Trigger:
  - user supplied two contributory design concepts and explicitly said to treat them as part of the same work:
    - conquest-local changed-frontier bounding from star ownership and local border structure
    - DX as an explicit disconnect-zone construct rather than only a virtual-site heuristic
- Code-trace evaluation:
  - inspected:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\compiler\buildFrontierTopology.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\disconnect\buildDisconnectVirtualSites.ts`
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\corridor\buildCorridorVirtualSites.ts`
  - findings:
    - the live topology builder already has the correct coarse structural unit:
      - sections between structural vertices
      - structural vertices include:
        - `junction_3way`
        - `world_intersection`
        - `world_corner`
    - current weakness is not absence of sections
    - current weakness is absence of real per-section / per-point star influence attribution:
      - `buildFrontierTopology.ts` still uses `stubInfluence(...)`
    - current DX builder already evaluates same-owner pairs that are not lane-connected and uses midpoint-oriented reasoning
    - but DX is still implemented only as paired enemy virtual-site placement around the midpoint
    - there is not yet any explicit disconnect-zone geometry/model/rendering step
- Documentation/plan changes:
  - updated:
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\docs\sessions\2026-05-05\2026-05-05_Chat.md`
      - appended the user's new contributory concepts losslessly
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\docs\sessions\2026-05-05\2026-05-05_Session.md`
      - recorded the topology/DX code-trace findings and the new design inputs
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\docs\sessions\2026-05-05\2026-05-05_Takeaways.md`
      - added the foundational-section and explicit-DX-zone conclusions
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\docs\sessions\2026-05-05\2026-05-05_territory-runtime-recovery-plan_v2.md`
      - created a v2 plan that:
        - promotes foundational sections between 3-way/world-edge junctions into an explicit architectural truth
        - adds deterministic per-section/per-point star influence attribution to active-front planning
        - adds DX-zone construction as a later geometry/render-stage sprint
    - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\docs\plans\2026-05-05\FEATURE_AND_TASK_QUEUE_2026-05-05.md`
      - updated to point at the new v2 plan and the two new work items
- Purpose:
  - keep the user's new ideas inside the branch's structured plan, not as untracked chat intuition
  - make clear which parts already fit the codebase and which parts require new truth in the geometry/topology layer
- Result:
  - the branch now has a v2 recovery plan
  - active-front recovery is now explicitly tied to:
    - foundational sections
    - stable anchors
    - change anchors
    - conquest-local star influence
  - DX recovery is now explicitly tied to:
    - same-owner non-lane-connected pair detection
    - midpoint ownership test
    - explicit zone depth/width construction
    - mode-consistent fill/styling later
- Validation:
  - documentation + code-trace only
  - no runtime code changed in this update
