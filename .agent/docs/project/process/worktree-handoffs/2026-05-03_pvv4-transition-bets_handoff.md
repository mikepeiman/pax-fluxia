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
