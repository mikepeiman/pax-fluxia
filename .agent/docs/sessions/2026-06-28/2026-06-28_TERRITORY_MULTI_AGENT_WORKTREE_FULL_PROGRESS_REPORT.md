# Territory Multi-Agent Worktree Full Progress Report

Generated: 2026-06-28 14:13:17 -04:00  
Branch: `codex/territory-overnight-integration`  
Worktree: `C:\Users\mikep\.codex\worktrees\territory-overnight-integration\pax-fluxia`  
Current pushed head when written: `56e0ce76d test(geometry): tighten resolved geometry oracle`

Naming note:

- Some exact branch and commit names include older source-code terms such as `oracle`.
- In plain English, those are automatic geometry checkers.
- Exact Git names are left unchanged so the history remains searchable.

## 1. Scope Of This Report

This report covers the multi-agent, multi-worktree territory effort from the planning and audit phase through the latest integration-branch work.

It includes:

- successes;
- failed or rejected attempts;
- tested hypotheses;
- research and audits performed;
- benchmark evidence;
- current uncommitted work;
- architecture concerns raised by follow-up questions;
- open questions and recommended next steps.

It uses user-facing mode names where relevant. Code names are included only when needed to locate the implementation.

## 2. Starting Mandate

The original goal was not a narrow bug fix. It was an overnight branch campaign to improve:

- geometry consistency;
- exact deterministic constraints;
- reliable and correct transitions;
- multiple transition modes;
- performance during normal gameplay and during transitions;
- reversible git history across worktrees and branches.

The operating model was:

- work boldly in worktrees and branches;
- commit meaningful checkpoints;
- push useful branch commits;
- keep defaults safe;
- preserve candidate work even when not default-ready;
- use local docs, git history, Graphify, benchmarks, and adversarial review before making broad claims.

## 3. Research And Audit Inputs

### 3.1 Session Docs Read Or Used

- `2026-06-17_TERRITORY_MODE_AUDIT_AND_UNIFIED_ARCHITECTURE.md`
- `2026-06-17_TERRITORY_SOLUTION_CANDIDATES_AND_RECOMMENDATION.md`
- `2026-06-25_TERRITORY_OVERNIGHT_BRANCH_CAMPAIGN_PHASE_TWO.md`
- `.agent/intra-agent-coordination.md`
- `2026-06-27_TERRITORY_OVERNIGHT_INTEGRATION_PROGRESS.md`
- older session history surfaced by doc search, especially territory transition and runtime recovery docs from late April and early May.

### 3.2 Main Findings From Prior Docs

1. Geometry truth should live in a shared geometry layer, not be rediscovered independently by render modes.
2. Provenance means every border segment should know which two owners it separates.
3. Grid-style wave animations can look good, but historically lost provenance because they rasterized ownership again.
4. Several named modes are presentations over geometry, not separate geometry truths.
5. Distance Field was corrected as not having a shipped reliable transition.
6. "Metaball Grid" had already been renamed/reframed as Cell Grid/Phase Field/Phase Edges/Ember-like presentations; Grid Gradient is separate.
7. Prior attempts failed when transitions were optimized before static geometry was proven.
8. The branch campaign should prefer invariant checkers, fixtures, and benchmark harnesses because they accelerate every later change.

### 3.3 Codebase Discovery

Graphify was used for code-structure discovery, then source was read directly. Key areas inspected:

- `ResolvedGeometrySnapshot`
- `FrontierTopology`
- `buildPowerVoronoi0319AuthoritySnapshot`
- `resolveConstraintAlignedTerritoryGeometry`
- `resolvedGeometryOracle`
- `frontierTopologyOracle`
- `GridGradientFamily`
- Grid Gradient worker transport
- `GameCanvas.svelte`
- benchmark scripts under `tools/debug`
- `renderFamilyGeometryCacheKey`
- `gameStore`, `activeGameStore`, and `multiplayerStore`

### 3.4 Web Research

No external web research was completed during the latest implementation stretch. The work so far was grounded in local docs, source, git history, benchmark artifacts, and subagent audits.

## 4. Worktree And Branch Integration

### 4.1 Integrated Branches And Worktrees

The integration branch reconciled or absorbed work from:

- `codex/preset-rows-frontier-recipes`
- `master`
- `codex/territory-geometry-authority`
- `codex/grid-gradient-worker-provenance`
- `codex/pv-frontline-transition-diagnostics`
- `codex/geometry-invariant-oracle`
- `codex/grid-gradient-worker-parity-guard`
- `codex/pv-frontline-transition-correctness`
- `codex/topology-stable-identity`
- `codex/pv-frontline-angular-chain-walk`
- `codex/grid-gradient-cold-load-performance-worker-f`

### 4.2 Safety Actions

- Created a backup checkpoint branch before broad merge reconciliation:
  - `codex/territory-overnight-integration-before-branch-reconcile-20260627-1614`
- Used normal merge commits.
- Avoided destructive reset or history rewrite.
- Pushed integration branch checkpoints.

### 4.3 Conflict Handling

- Kept the stricter frontier border-structure checker when merging geometry invariant work.
- Kept both PV frontline planner test groups when merging transition-correctness work.

## 5. Major Implemented Areas

### 5.1 Grid Gradient Worker Topology Transport

What changed:

- Reliable topology can now cross the Grid Gradient worker boundary.
- Transport includes vertices, sections, loops, indexes, diagnostics, and reliability flags.
- Minimal or unreliable worker payloads now inflate as explicitly unreliable rather than pretending to be reliable.

Why it matters:

- Grid Gradient can no longer silently strip topology and still claim it is reliable.
- This makes future provenance-aware wave planning possible.

Validation:

- Grid Gradient worker transport tests passed.
- Broader territory tests passed at the time of the slice.

### 5.2 Runtime Transition Duration Uses Actual Game Speed

What changed:

- Runtime transition settings now receive the effective tick duration.
- Transitions use game-speed-adjusted timing instead of assuming the base tick duration.

User-facing meaning:

- At different game speeds, transition timing should better match actual gameplay pacing.

### 5.3 Geometry Fingerprint Coverage

What changed:

- Geometry fingerprints now include star position, star radius, lane constraint/path data, world bounds, star-core guard radius, frontier resolution, boundary padding, and boundary epsilon.

Why it matters:

- Geometry cache identity is less likely to reuse stale geometry after meaningful spatial changes.

### 5.4 Exact Same-Star Recapture Transition Identity

What changed:

- Territory FX transitions are keyed by exact conquest identity:
  - tick;
  - conquered star;
  - previous owner;
  - new owner.

Why it matters:

- A finished capture of one star no longer accidentally retires a newer recapture of the same star.

Validation:

- Transition lifecycle tests passed.
- Full territory test suites passed in that slice.

### 5.5 Frontier Topology Oracle Strengthening

What changed:

- Loops now verify section coverage by owner.
- Owner-world sections must appear in the expected owner loop.
- Owner-owner sections must appear on both owner sides.
- Loops reject invalid `world` ownership, near-zero reconstructed area, stale area, duplicate physical sections, and self-intersection.

Plain English:

- The code now has stronger checks that territory borders actually form valid regions and are not duplicated or crossed.

### 5.6 Grid Gradient Owner-Grid Cache Bound

What changed:

- Replaced unbounded Grid Gradient owner-grid caches with small fixed-size caches that discard the least recently used entry when full.
- Added diagnostics for cache entries, maximum entries, estimated bytes, and evictions.

Why it matters:

- Reduces risk of memory growth during long play or repeated plan generation.

### 5.7 Power-Core Candidate Geometry Audit Mode

What changed:

- Added `power_core_candidate` as a real geometry mode id and registry option.
- It does not replace the live default.
- It audits 0319 cell geometry using pure shared-edge construction.
- It reports cell count, loop count, shared/world edges, owner area agreement, duplicate source site ids, and a stable internal ID for the candidate border structure.

Plain English:

- This is a candidate checker for a cleaner future geometry authority. It helps compare a stricter geometry construction path against current geometry without switching the default.

Validation:

- Fixture tests passed.
- Generated two-owner and virtual-corridor coverage passed.

### 5.8 Resolved Geometry Snapshot Oracle

What changed:

- Added checks for:
  - duplicate region IDs;
  - duplicate frontier IDs;
  - duplicate world-border IDs;
  - duplicate physical border chains;
  - self-intersecting regions;
  - duplicate region anchors;
  - missing anchor stars;
  - owner mismatch between anchor and region;
  - anchor stars outside their region;
  - owned stars not contained in exactly one region.

Later tightened:

- Duplicate physical frontier chains are now detected even if owner-pair metadata differs.
- `sharedFrontierMap` must match `frontierPolylines` exactly enough to catch:
  - missing entries;
  - dangling entries;
  - wrong bucket keys;
  - owner metadata drift;
  - geometry drift.

Plain English:

- Geometry snapshots now self-audit before renderers or transitions try to use bad geometry.

Validation:

- `resolvedGeometryOracle.test.ts`: 8 tests passed.
- Geometry folder tests: 69 tests passed.
- Full check/build/Graphify passed for the committed slice.

### 5.9 Transition Reliability Gating

What changed:

- Transition planning is gated on geometry reliability:
  - border-structure reliability;
  - identity reliability;
  - closure reliability;
  - automatic resolved-geometry checker result.
- Added named fallback reasons instead of silent fallback.

Plain English:

- If geometry is unsafe, the transition system should say why and fall back deterministically instead of trying to animate broken shapes.

### 5.10 Benchmark Fallback Reporting

What changed:

- Benchmarks now report transition fallback status and reasons.
- Text summaries use plain status lines and avoid misleading wording.

Current result:

- Latest Grid Gradient conquest animation reports:
  - `transitionFallbacks scenarios=0 reasons=none`

Plain English:

- The benchmark can now tell whether the intended transition path was used or whether the system silently bailed out.

### 5.11 Render-Family Geometry Cache Correctness

What changed:

- The render-family geometry cache no longer relies only on stable array references.
- It now compares:
  - a spatial topology signature;
  - a star ownership signature;
  - visual/config fingerprint.

Root cause found:

- A pure ownership transition could compare old geometry with unresolved lane routing against new geometry with normalized lane routing.
- That meant a conquest looked like it had a lane-routing geometry change when it should have been owner-only.

Validation:

- Added tests for in-place lane topology mutation and in-place owner mutation.
- Both now cause deterministic cache misses.

### 5.12 Conquest Flash Overlay Optimization

What changed:

- Moved conquest flash pulse rendering out of base star graphics.
- The flash pulse now uses its own small overlay object and normally changes alpha only.

User-facing meaning:

- The visible flash on a conquered star still appears, but it should not force expensive redrawing of the base star shape every animation frame.

Benchmark evidence:

- Flash overlay shape was redrawn once and reused.
- Remaining base star redraws were mostly owner-color transition changes.

### 5.13 Frame-Cadence Instrumentation

What changed:

- Added `game.frameLoop.interval` to measure frame spacing.
- Added Pixi ticker and Pixi render probes.
- Added full frame-loop probes for FX, render frame, and camera.
- Updated benchmark summaries so frame interval evidence is not mistaken for render CPU work.

Plain English:

- We can now tell the difference between "the app spent 30ms drawing" and "the browser waited 30ms before giving us the next frame."

### 5.14 Pixi Render Probe Instrumentation

What changed:

- Benchmarks can measure Pixi stage render and ticker cadence.
- Probes are inactive unless perf capture is enabled.

Finding:

- Pixi stage render was not the missing 35-50ms cost.
- In one run, Pixi stage render averaged about `1.013ms`, while the whole render frame averaged about `2.421ms`.

### 5.15 Uncommitted Map-Layout Revision Experiment

Current status:

- Not committed at report time.
- Dirty files:
  - `GameCanvas.svelte`
  - `activeGameStore.svelte.ts`
  - `gameStore.svelte.ts`
  - `renderFamilyGeometryCacheKey.ts`
  - `renderFamilyGeometryCacheKey.test.ts`

What it means:

- A "map-layout revision" is a number that changes when the physical star/lane layout changes.
- The current source-code name is `spatialTopologyRevision`.
- Physical layout includes:
  - star positions;
  - star radii;
  - lane endpoints;
  - lane distances;
  - lane path metadata, if present;
  - saved/generated lane path points, if present.

Important correction:

- "Lane path points" are not a player-facing feature and not a roadmap feature being introduced here.
- The source type has an optional field named `laneWaypoints`.
- In plain English, that field means optional internal/saved points along a normal star-to-star lane, used when map generation or map import has already produced a bent lane path.
- If those points are absent, there are no extra lane path points to scan.

Why it exists:

- If that number has not changed, the renderer can reuse the previous map-shape summary instead of rebuilding that summary from all star/lane layout data every render frame.
- Ownership is still checked separately, so conquests still invalidate territory.

Architecture concern raised:

- The uncommitted patch exposes this revision only for local game state.
- For online-room state, the code currently returns `undefined`, which keeps the older full scan.
- This is correct for safety but not architecturally clean.
- The renderer should not care whether data came from a local game or online room. It should receive one unified state shape and one unified "map/lane layout changed" signal.

Focused validation already passed:

- Cache-key tests: 9 passed.
- Territory family plus lane sync tests: 185 passed.
- `bun run check`: 0 errors, 1 existing warning.
- Fresh Grid Gradient conquest benchmark passed.

Not yet completed:

- applying identical lane results should leave the revision unchanged;
- multiplayer/online-room revision source;
- full build after this uncommitted experiment;
- Graphify rebuild after this uncommitted experiment;
- commit.

## 6. Modes And Scenarios Actually Benchmarked

### 6.1 User-Facing Modes Tested

Most browser benchmark work in this sprint focused on **Grid Gradient**.

Scenarios tested:

- **Grid Gradient Gameplay**
- **Grid Gradient Conquest Animation**
- **Grid Gradient Conquest Diagnostic**

Important limitation:

- The 35ms frame-cadence finding has not been proven across all territory modes.
- It is currently strongest for Grid Gradient benchmark scenarios.

### 6.2 Diagnostic Scenario Caveat

**Grid Gradient Conquest Diagnostic** is not representative of normal play.

Reason:

- It runs an intentionally expensive recorder to capture and validate transition frames.
- It measured transition diagnostic sync costs around `18-21ms` in some runs.
- Ordinary animation benchmarks should keep the recorder disabled.

## 7. Performance Evidence

### 7.1 Latest Grid Gradient Conquest Animation Benchmark

Generated: 2026-06-28T15:21:00.769Z  
Scenario: `grid_gradientConquestAnimation`  
User-facing mode: **Grid Gradient**  
Result: passed  
Transition fallback: none

Frame evidence:

- frames: `count=98 avg=26.701ms p95=33.4ms max=50ms`
- dominant frame interval: `35ms`, 55 frames, 56.1 percent
- long tasks: `0`

Render work evidence:

- full frame render work: `avg=2.596ms max=13.6ms`
- Pixi stage render: `avg=0.939ms max=3.1ms`
- Grid Gradient territory render: `avg=0.497ms max=10.1ms`
- ships render: `avg=1.416ms max=5.1ms`

Cache evidence:

- geometry key cache: `hits=669 misses=2`

Plain English conclusion:

- The app usually did not spend 35ms drawing.
- The browser often delivered frames about 35ms apart anyway.
- This suggests the remaining smoothness issue is probably frame delivery, browser/compositor behavior, GPU/headless behavior, or scheduling outside the measured render sections.

### 7.2 Earlier Grid Gradient Gameplay Benchmark

Evidence from progress log:

- Before async conquest presentation queue change:
  - `avg=39.215ms`
  - `p95=50.1ms`
  - `max=100.1ms`
- After async conquest presentation queue change:
  - `avg=38.162ms`
  - `p95=50ms`
  - `max=50.1ms`

Plain English conclusion:

- Moving conquest-heavy territory work out of the active render call stack cut the worst observed max frame from about 100ms to about 50ms in that run.
- It did not solve the broader frame-cadence issue.

## 8. Failed Or Rejected Attempts

### 8.1 Pixi Ticker Unification

Hypothesis:

- Driving the main game update loop from Pixi's ticker might remove duplicate scheduling and improve frame cadence.

Attempt:

- Changed the main `GameCanvas` update to run from Pixi ticker at normal priority before Pixi render.

Result:

- Functional benchmark still passed.
- Performance got worse.

Measured regression:

- frame average worsened from `28.754ms` to `31.545ms`;
- app-loop interval worsened from `28.709ms` to `31.033ms`;
- Pixi ticker interval worsened from `28.649ms p95=34.5ms` to `31.014ms p95=38.9ms`.

Decision:

- Rejected.
- Code change was not kept.
- Result was documented in commit `92a915fe6`.

### 8.2 Grid Gradient Worker Defer Blank Frame From Earlier Coordination History

Finding from coordination board:

- A prior cold worker-defer attempt blanked Grid Gradient mode.
- It was reverted before this integration sprint.

Lesson carried forward:

- Do not off-thread or defer a stage until measurement proves that stage is the bottleneck.

### 8.3 Frame Cadence Not Solved

What failed:

- Multiple optimizations reduced measured render work but did not make frame delivery consistently 60fps.

What was ruled out as primary cause so far:

- normal Grid Gradient render work;
- Pixi stage render time;
- conquest flash base redraw;
- transition fallback;
- long JavaScript tasks in the latest animation benchmark.

What remains unproven:

- whether headless Chrome flags, GPU/compositor behavior, monitor/timer cadence, Pixi render-target settings, or benchmark environment are causing or amplifying the 35ms cadence.

### 8.4 Architecture Mismatch In Local vs Online State

Failure or concern:

- The uncommitted revision experiment treats local game state and online-room state differently.

Why this is a problem:

- Geometry/rendering should not care whether the state came from a local game or an online room.
- The distinction belongs at the adapter boundary, not in `GameCanvas` or render cache behavior.

Current safe fallback:

- Online-room state still uses exact data scanning rather than a trusted revision.

Next correct fix:

- expose one shared "map layout changed" signal through `activeGameStore` for both state sources.

## 9. Tested Hypotheses

### 9.1 Geometry Reliability Hypothesis

Hypothesis:

- Many transition failures come from untrusted or inconsistent geometry rather than from the visual transition effect itself.

Evidence:

- Added topology and resolved-geometry oracles.
- Added reliability gates before transition planning.
- Added benchmark transition fallback reporting.

Finding:

- This was a productive direction. It created durable checks and clearer failure reporting.

### 9.2 Grid Gradient Topology Transport Hypothesis

Hypothesis:

- Grid Gradient worker transport was losing reliable topology/provenance.

Evidence:

- Worker transport previously inflated minimal topology as reliable.
- New tests verify reliable topology transport and unreliable fallback.

Finding:

- Confirmed and improved.

### 9.3 Cache Staleness Hypothesis

Hypothesis:

- Render-family geometry cache could reuse stale keys when arrays stayed stable but lane or owner data mutated in place.

Evidence:

- Tests added for in-place lane mutation and owner mutation.
- Root cause found around lane routing normalization versus owner-only conquests.

Finding:

- Confirmed and fixed in committed code.

### 9.4 Flash Redraw Hypothesis

Hypothesis:

- Conquest flash animation was forcing expensive base star redraws.

Evidence:

- Flash was moved to overlay.
- Benchmark showed overlay shape redrawn once and alpha updated many times.

Finding:

- Partly confirmed: flash redraw cost was reduced.
- It did not solve frame cadence.

### 9.5 Pixi Render Cost Hypothesis

Hypothesis:

- Pixi render was the missing 35-50ms cost.

Evidence:

- Pixi stage render probes showed about `1ms` average in relevant runs.

Finding:

- Mostly disproven for the measured Grid Gradient conquest animation scenario.

### 9.6 Scheduling Loop Hypothesis

Hypothesis:

- Combining game updates into Pixi's ticker would improve timing.

Evidence:

- Tested directly.

Finding:

- Disproven for the tested scenario. It worsened timing.

### 9.7 Browser/Compositor Delivery Hypothesis

Hypothesis:

- The remaining frame gap is outside normal game render work.

Evidence:

- Render work is low while frame intervals stay around 35ms.
- Latest benchmark had no long tasks.
- Slow-frame attribution remains mostly unattributed after accounting for measured render sections.

Finding:

- Plausible and currently the strongest hypothesis.
- Not yet proven with browser trace/GPU/compositor evidence.

## 10. Multi-Agent Work

### 10.1 Main Integration Agent

Did:

- reconciled branches;
- merged candidate work into integration;
- implemented geometry and benchmark changes;
- ran validation;
- documented progress;
- committed and pushed checkpoints.

### 10.2 Explorer: Geometry Cache Invalidation

Finding:

- The optional `spatialTopologyRevision` fast path is directionally useful.
- Current single-player-only revision is incomplete as architecture.
- Recommended next refinements:
  - leave the revision unchanged when lane data is applied but unchanged;
  - create online-room revision support;
  - keep ownership invalidation separate from spatial topology invalidation.

### 10.3 Explorer: Frame Scheduling

Finding:

- Measured render work is not enough to explain 35ms frame intervals.
- Pixi ticker unification should stay rejected.
- Next experiments should inspect browser/compositor delivery and Chrome/Pixi settings.

Recommended exact experiments:

- trace-enabled benchmark;
- benchmark without `--disable-gpu`;
- Pixi diagnostic toggles for `antialias:false` and `resolution:1`.

### 10.4 Attempted Third Explorer

Attempt:

- Tried to spawn a third explorer for Power Voronoi / geometry compute cost.

Result:

- Failed because agent thread limit was reached.

Impact:

- Power Voronoi cost audit remains less covered than geometry reliability and frame scheduling.

## 11. Validation Summary

Commands repeatedly passed across the campaign:

- `bun x vitest run src/lib/territory`
- `bun x vitest run src/lib/territory/geometry`
- `bun x vitest run src/lib/territory/families`
- `bun run check`
- `bun run build`
- `bun run agentic:graphify:build`
- focused benchmark builds for `benchmark-browser-gameplay.ts` and summary scripts
- fresh browser gameplay benchmarks for Grid Gradient scenarios

Known recurring warnings:

- `GameThemeManager.svelte`: unused CSS selector `.game-theme-manager--menu .theme-chip-name`
- unused external `Room` import in `multiplayerStore.svelte.ts`
- static/dynamic `gameStore` import warning
- large chunk warnings after production build

## 12. Commit History Highlights

Key commits in the integration branch:

- `56e0ce76d` - tightened the resolved-geometry checker.
- `92a915fe6` - recorded rejected Pixi ticker scheduling result.
- `921d20bfb` - instrumented Pixi frame delivery.
- `7196259d0` - separated frame cadence from render work.
- `e2e600b05` - guarded transition diagnostics against non-owner geometry drift.
- `6fa2717af` - made render-family geometry cache exact.
- `51680e781` - reported transition diagnostic bundles.
- `e33ba4e1e` - moved conquest flash off base redraws.
- `946e1bee7` - exposed browser cadence diagnostics.
- `5291f9db3` - recorded integration reconciliation.
- `d2ac9d771` - kept conquest geometry off render frame.
- `8b1b3be90` - cached render-family geometry keys.
- `4a54330a0` and `90655fc3a` - surfaced transition fallback reliability.
- `7c5d71851` and `eff5b28b0` - preserved geometry-checker and border-structure reliability across Grid Gradient and transition gating.
- `63187f40e`, `af13a89be`, `3d9c5bd11`, `9721283d9`, `6cab45ce8` - power-core candidate and geometry-checker coverage.

## 13. Current Dirty Worktree At Report Time

Uncommitted files:

- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- `pax-fluxia/src/lib/stores/activeGameStore.svelte.ts`
- `pax-fluxia/src/lib/stores/gameStore.svelte.ts`
- `pax-fluxia/src/lib/territory/families/renderFamilyGeometryCacheKey.test.ts`
- `pax-fluxia/src/lib/territory/families/renderFamilyGeometryCacheKey.ts`

These contain the map-layout-revision experiment. They are intentionally not committed with this report.

Reason:

- The user requested a full report commit.
- The code experiment is promising but still needs refinement and full final validation.

## 14. Architecture Concerns Raised By Follow-Up Questions

### 14.1 Local Game vs Online Room Should Not Diverge In Rendering

Observation:

- The uncommitted patch exposes a map-layout revision for local games only.

Hypothesis:

- This reveals an architecture deviation: render cache behavior should not depend on local-vs-online source.

Corrective direction:

- `activeGameStore` should expose one unified state contract:
  - stars;
  - lanes;
  - ownership;
  - tick;
  - map/lane layout revision or fingerprint.

Renderer rule:

- `GameCanvas` should consume the unified contract and not branch on local vs online.

### 14.2 "Full Scan Path" Definition

Meaning:

- The cache scans current star and lane data to build a map-shape signature.

It reads:

- star IDs;
- star positions;
- star radii;
- lane endpoints;
- lane distances;
- lane path kind;
- lane constraint status;
- optional saved/generated lane path points.

Clarification:

- The source-code field for those optional path points is `laneWaypoints`.
- That is internal map/lane geometry data, not a player-facing gameplay concept.
- Most of the time the important lane data is simply "which two stars this lane connects."

Why safe:

- Ownership changes from conquests are checked separately every time.
- This scan is only a defensive check for map-layout data, such as star position/radius or lane endpoints, if setup/import/rebuild code changes that data without replacing the arrays.
- During normal gameplay, the expected territory-changing event is ownership changing.

Why slower:

- It repeats work on every cache-key build.

Faster alternative:

- A trusted revision number says "map/lane layout has not changed", allowing reuse of the prior spatial signature.

Risk of faster alternative:

- If a code path changes the map layout but does not update the revision, stale geometry can be reused.

## 15. Open Questions

1. Should online-room state receive a server-provided map/lane revision, or should the client compute one once per room sync?
2. Should the map-layout revision be maintained in `activeGameStore`, a lower shared state adapter, or common runtime state?
3. Is the 35ms frame cadence visible in real foreground Chrome, or only in headless benchmark Chrome?
4. How much does `--disable-gpu` distort Pixi/WebGL frame delivery in the benchmark?
5. Do other modes besides Grid Gradient show the same cadence pattern under matched conquest animation scenarios?
6. Should Power Core remain only an audit candidate, or should it become a selectable authority path after more fixtures?
7. Which transition modes are candidates for default promotion after geometry reliability gates improve?
8. What should the user-facing behavior be for topology changes that cannot be animated exactly: snap, short crossfade, or mode-specific fallback?

## 16. Recommended Next Steps

### 16.1 Finish Current Uncommitted Cache-Revision Work

1. Add no-op tests:
   - applying identical lane results should leave the map-layout revision unchanged.
   - changing saved/generated lane path points, lane path status, or lane endpoints should advance the map-layout revision.
2. Add online-room revision path or explicitly defer it with a documented architecture note.
3. Run:
   - focused cache tests;
   - relevant store tests if present;
   - `bun run check`;
   - `bun run build`;
   - `bun run agentic:graphify:build`.
4. Commit as a separate implementation commit.

### 16.2 Run Frame Delivery Experiments

1. Baseline trace-off Grid Gradient conquest animation.
2. Trace-on Grid Gradient conquest animation.
3. Add benchmark toggle to run Chrome without `--disable-gpu`.
4. Compare:
   - frame cadence;
   - Pixi ticker cadence;
   - Pixi stage render;
   - browser long tasks;
   - compositor/timeline trace if available.

### 16.3 Broaden Mode Matrix

Run matched benchmark scenarios for:

- Grid Gradient;
- Phase Edges;
- Phase Field;
- Ember or Cell Grid presentation if currently selectable;
- Perimeter Field / Metaball Perimeter if stable enough;
- PV Frontline if runtime path is active.

Goal:

- Determine whether frame cadence is a Grid Gradient issue, a GameCanvas issue, a benchmark/browser issue, or a broader render-loop issue.

### 16.4 Continue Geometry Reliability Work

Prioritize:

- topology-to-region consistency;
- owner/star containment;
- duplicate physical frontier detection across more geometry sources;
- deterministic IDs under input reorder;
- power-core generated fixture expansion.

### 16.5 Keep Reports Separate From Code Experiments

This report is committed separately on purpose. It should remain easy to cherry-pick or read even if the current cache-revision experiment changes direction.

## 17. Bottom Line

Durable progress was made in geometry reliability, transition diagnostics, benchmark visibility, Grid Gradient topology transport, cache correctness, and render instrumentation.

The biggest solved class is not "visual polish"; it is making geometry and transition failures observable and testable.

The biggest unsolved class is frame cadence: Grid Gradient conquest animation often receives frames around 35ms apart even when measured render work is low. The next work should prove whether that is browser/compositor/headless behavior, Pixi presentation behavior, or a still-unmeasured scheduling problem.

The current uncommitted map-layout-revision experiment is architecturally incomplete until the local-game and online-room state paths expose one unified render-facing revision signal.
