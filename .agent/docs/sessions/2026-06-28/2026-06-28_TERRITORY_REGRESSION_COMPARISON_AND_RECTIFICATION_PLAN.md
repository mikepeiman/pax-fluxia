# Territory Regression Comparison and Rectification Plan

Timestamp: 2026-06-28T17:37:53-04:00

This report answers the current failure report: the overnight territory/rendering branch feels worse in the actual game. The user's live observation is ground truth. Automated browser numbers are useful only when they explain the real game.

## Branches Compared

- Current overnight branch: `codex/territory-overnight-integration`
- Current overnight commit: `ae471a6c2 perf(territory): split cell grid fills from borders`
- Current `master`: `79d278dba fix(territory): revert frontier technique default back to 'control' (the matching look)`
- Original branch base: `3ddd95386f09933094038d213f16c3b99591f0e6`
- Merge base between current branch and `master`: `3ddd95386f09933094038d213f16c3b99591f0e6`

Comparison worktrees created for evidence:

- `C:\Users\mikep\.codex\worktrees\territory-compare-master-20260628`
- `C:\Users\mikep\.codex\worktrees\territory-compare-base-20260628`

Both comparison worktrees were created detached and non-destructively.

## Plain-English Summary

The overnight branch should not be integrated as a whole.

The clearest failure is not subtle: the branch is missing several newer `master` fixes that directly affect what the player sees. Those fixes cover the settings-menu resize snap, Cell Grid spacing controls, smooth fill sampling, and the default frontier look. In addition, the branch contains a very large stack of changes across the core game canvas, territory geometry, transition handling, rendering modes, and the benchmark harness. That stack is too broad to trust after the reported visible regression.

Some individual work may still be worth keeping, especially exact transition identity and some performance instrumentation. But each keeper needs to be reapplied one at a time on top of current `master`, with a visible playtest after every step.

## Observed Facts

1. The current branch is behind `master` for visible fixes.

   `master` has these commits that are not in the overnight branch:

   - `829ca9268 fix(canvas): keep correct aspect during resize so menu transition has no snap`
   - `7566068a3 feat(settings): unify cell-grid spacing to ONE resolution setting per mode`
   - `f96bb7771 fix(territory): smooth fill actually renders smooth — shader-band samples LINEAR not nearest`
   - `79d278dba fix(territory): revert frontier technique default back to 'control' (the matching look)`

   These are user-facing. They affect what you see in the settings menu, Cell Grid/Phase Field controls, and the Edges/Ember frontier appearance.

2. The overnight branch kept the older frontier default.

   Current branch and original base:

   - `TERRITORY_FRONTIER_TECHNIQUE: 'shader_frontier_band'`
   - `TERRITORY_FRONTIER_PHASE_SAMPLING: 'nearest'`

   Current `master`:

   - `TERRITORY_FRONTIER_TECHNIQUE: 'control'`
   - `TERRITORY_FRONTIER_PHASE_SAMPLING: 'linear'`

   Plain English: `master` changed the default so the territory fill meets the border in the way the user confirmed looked right. The overnight branch does not have that fix.

3. The overnight branch changed a large part of the highest-risk surface.

   Against the original base, the branch changes at least:

   - `GameCanvas.svelte`
   - Cell Grid rendering
   - Grid Gradient rendering
   - territory transition coordination
   - territory geometry generation
   - worker messages
   - benchmark tooling
   - many geometry and transition tests

   This is not a small patch. It is a broad experimental stack.

4. Automated checks passed, but that does not prove the game feels good.

   `bun run check` passed on current branch, `master`, and original base with the same pre-existing warning about an unused CSS selector in `GameThemeManager.svelte`.

   Passing type/build checks only proves the code compiles. It does not prove smoothness, visual correctness, or transition quality.

5. The selected in-app browser tab was not running the game when inspected.

   The in-app browser connector reported `This site can't be reached` for `http://localhost:5173/`, with `ERR_CONNECTION_REFUSED`.

   This means I could not inspect the live jank in that tab at report time. This is a limitation of this report, not evidence that the jank is absent.

## Benchmark Findings

Definition: in this report, "benchmark" means an automated browser run that loads the game, triggers a scenario, and records frame intervals. It is a measurement tool, not the final truth.

1. Main menu idle is not the failure.

   Current branch and original base both showed stable main-menu idle timing in the benchmark:

   - current branch: average frame gap `8.334 ms`, max `11.4 ms`
   - original base: average frame gap `8.334 ms`, max `11.4 ms`

   This points away from "the page cannot idle smoothly" and toward gameplay, transitions, mode settings, or missing `master` visual fixes.

2. A forced Ember gameplay benchmark is not a valid cross-version comparison.

   - current branch failed before useful gameplay data with a `MenuThemeRail`/Svelte runtime error
   - original base failed before useful gameplay data with Svelte `effect_orphan`
   - `master` produced numbers for one Ember run, but the setup path differs enough that it is not a clean comparison

   Plain English: that forced-mode test path is not reliable enough to decide whether Ember is better or worse across these revisions.

3. The Distance Field benchmark conflicts with the user's live report.

   Automated `Distance Field` conquest run:

   - original base: average frame gap `19.674 ms`, many `33 ms` gaps
   - current `master`: average frame gap `19.974 ms`, many `33 ms` gaps
   - overnight branch: average frame gap `8.36 ms`, no `20 ms` or `33 ms` gaps

   If these numbers were the only evidence, they would suggest a real improvement. They are not the only evidence. The user reports the real game is worse, and the branch also changed benchmark tooling and game instrumentation. Therefore the correct conclusion is: this benchmark does not explain the live regression and cannot be used to defend the branch.

4. Some previous "wins" measured small or narrow cases.

   Example from earlier branch work: a Cell Grid conquest benchmark on a small test scene reported good timing after splitting fill work from border work. That does not prove all real maps, all modes, or visible transitions improved.

## Likely Causes of the Visible Regression

These are separated by confidence.

### High Confidence

1. Missing `master` visual fixes are part of the problem.

   The branch lacks fixes that directly affect player-visible territory appearance and resize behavior. This alone can make the branch look worse than current `master`.

2. The overnight branch is too broad to accept without isolating changes.

   The branch changes too many core systems at once. When the app feels worse, a huge combined diff makes it hard to know which change caused what. The correct recovery is not to debug the whole stack in place. The correct recovery is to start from current `master` and reintroduce only proven improvements.

3. Some benchmark comparisons are not trustworthy enough.

   Some scenarios failed before gameplay. Some scenario names changed because old internal names are now aliases. Some automated results conflict with the user's live observation. Therefore these benchmarks are diagnostic hints, not proof.

### Medium Confidence

1. The Cell Grid fill/border split may be a real performance improvement, but it must be retested on top of current `master`.

   It may help draw speed, but it also changes visible presentation paths. It should not be carried forward unless it passes side-by-side visual playtests.

2. Exact transition identity may be worth keeping.

   Plain English: a conquest animation should be tied to the exact conquest event, not just "this star changed." That reduces the chance that a newer recapture is mistaken for an older capture. This is a correctness improvement if verified on top of `master`.

3. Some board-layout caching may be safe, but it is lower priority than visible fixes.

   The physical board does not change during a game. Any cache based on that fact must be simple, exact, and not distract from frame smoothness or transition correctness.

### Low Confidence / Do Not Carry Automatically

1. The large geometry-audit/testing additions.

   They may contain useful ideas, but they did not produce visible improvement. They should be parked unless a specific bug needs them.

2. Worker-message and geometry-transport changes.

   These are complex. They should not move forward unless they fix a reproduced user-facing problem.

3. Any default-setting changes not already confirmed in `master`.

   Defaults are user-facing. The branch should inherit `master` defaults first, then change defaults only after direct visual approval.

## What May Be Worth Keeping

Candidate keepers, only after reapplying to current `master` one at a time:

1. Exact transition identity.

   User-facing meaning: conquest animations should not end early or get confused when the same star is captured again.

2. GPU-enabled benchmark default.

   User-facing meaning: browser tests should run closer to how a real browser renders the game.

3. Small, proven draw-cost reductions.

   Example: Cell Grid fill/border split, but only if side-by-side playtesting shows the same or better look and smoother motion.

4. Simple physical-board identity.

   User-facing meaning: since the board shape does not change mid-game, the renderer should not repeatedly re-check that shape during play. But this should be a small optimization, not a new architecture layer.

## What Should Be Removed or Parked

1. The current integration branch as a whole.

   It is not earned. The visible app is worse.

2. Any code that exists only to handle mid-game physical board changes.

   Current project rule: the physical board is immutable once a game starts. Star ownership changes; the board shape does not.

3. Any benchmark result that cannot be reproduced with the same ruler on `master` and the recovery branch.

   If the measurement setup changed, the number is not enough.

4. Any change that does not answer: "Is this necessary or beneficial at all?"

   If the answer is not clearly yes, do not carry it forward.

## Rectification Plan

### Phase 0: Freeze the Failed Integration Branch

- Keep `codex/territory-overnight-integration` as evidence.
- Do not keep stacking fixes on this branch.
- Do not merge it into `master`.

### Phase 1: Start a Clean Recovery Branch from Current Master

- Create a new branch from `79d278dba`.
- Suggested branch: `codex/territory-regression-recovery`.
- This ensures the recovery starts with the known visible fixes from `master`.

### Phase 2: Establish a Real Baseline

Run and record:

- a real dev-server playtest in the visible browser
- screenshots for the main territory modes
- at least one conquest transition per important mode
- automated benchmarks only after confirming the benchmark is measuring the same thing

Important labels to verify in the app:

- `PVV4`
- `Perimeter`
- `Metaball`
- `Grid`
- `Edges`
- `Ember`
- `Field`
- `Grad`

For each mode, record:

- does the territory match the expected look?
- does conquest animation start correctly?
- does it finish correctly?
- does it avoid flicker, snap, or early disappearance?
- does the game feel as smooth as `master` or better?

### Phase 3: Reapply Candidate Keepers One at a Time

Each candidate gets its own small commit.

Order:

1. benchmark GPU default, if still needed
2. exact transition identity
3. simple physical-board identity, only if it is tiny and proven
4. Cell Grid fill/border split, only behind direct visual comparison

After each commit:

- run `bun run check`
- run the relevant browser benchmark
- manually compare the visible game against `master`
- if it looks worse, stop and revert that candidate on the recovery branch

### Phase 4: Reject the Large Stack Unless Proven Necessary

Do not carry these automatically:

- broad geometry rewrites
- worker-message expansions
- large new test-only geometry systems
- frontier preset experiments
- settings UI changes not already accepted on `master`

They can be revisited only when tied to a specific reproduced problem.

### Phase 5: Integration Rule

The recovery branch is allowed to move forward only if it is:

- visually no worse than `master`
- at least as smooth as `master` in live play
- better in at least one measured or visibly confirmed area
- free of new mode/default surprises
- composed of small commits that can be reverted independently

## Immediate Recommendation

Do not rescue the overnight branch by merging `master` into it and continuing. That keeps too much untrusted work alive.

Instead:

1. leave the overnight branch untouched as evidence;
2. branch fresh from current `master`;
3. reapply only the smallest candidate improvements;
4. stop at the first visible regression;
5. keep only changes that prove they help the actual game.

This is the fastest path back to a trustworthy game and the only reasonable way to recover value from the overnight work without dragging the regression forward.
