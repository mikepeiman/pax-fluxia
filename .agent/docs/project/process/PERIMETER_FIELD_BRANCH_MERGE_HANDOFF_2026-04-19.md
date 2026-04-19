# Perimeter Field Branch Merge Handoff (2026-04-19)

Status: active handoff for merging `codex/continue-metaball-perimeter-mode` into another branch
Audience: an agent who needs to transplant the useful perimeter-field work without importing unrelated worktree noise

## Purpose

This document is meant to maximize the odds that another agent can merge or cherry-pick the best perimeter-field work from this branch into another branch with minimal confusion.

This is deliberately split into:

- what I know for sure
- what the user explicitly confirmed in-app
- what I think is likely but not yet proven
- what still needs fresh verification after the latest diagnostics fixes

Do not treat this branch as globally clean. It contains useful perimeter-field commits on top of unrelated dirty files in the worktree.

## Hard Rule Before Continuing

Before touching any remaining bug or deficiency, read these first:

1. `.agent/docs/project/implementation-plans/2026-04-15/PERIMETER_FIELD_IMPLEMENTATION_PLAN_2026-04-15.md`
2. `.agent/docs/game/territory/PERIMETER_FIELD_MODE_SPEC.md`
3. `.agent/rules/plan-spec-status-first.md`
4. `.agent/docs/project/post-mortems/POST_MORTEM_2026-04-16_PERIMETER_FIELD_PLAN_SPEC_STATUS_DISCIPLINE.md`

The user explicitly forced this rule because earlier debugging repeatedly drifted into speculative or off-spec reasoning.

## Branch / Base / Scope

- Working branch at handoff time: `codex/continue-metaball-perimeter-mode`
- Merge-base with `origin/master`: `761ff174c87ffedf8860265d217443b877f5a4fc`
- Relevant perimeter-field commit chain on this branch:
  1. `af772d80` `feat(perimeter_field): add first-class transition plan types (Phase 1)`
  2. `2cf06fe8` `feat(perimeter_field): region identity cleanup (Phase 2)`
  3. `8a386cfa` `docs(perimeter_field): replace active plan contract`
  4. `8d8296fc` `feat(perimeter_field): switch power_voronoi to truth-driven plan path`
  5. `617fcd26` `feat(perimeter_field): restore inward-offset loop sampling`
  6. `9c2c5016` `feat(perimeter_field): keep vstars on reversed topology loops`
  7. `3540ef12` `feat(perimeter_field): restore geometry_0319 world clip`
  8. `f80a8471` `feat(perimeter_field): stop owner-wide changed-front fallback`
  9. `ffed700d` `feat(perimeter_field): add replay conquest diagnostics`
  10. `21a12125` `feat(perimeter_field): export exact diagnostic sample truth`

## Important Warning About Unrelated Worktree State

At handoff time, the worktree also contains unrelated modified or untracked files outside this perimeter-field slice. Do not sweep them into the merge by accident.

Unrelated dirty paths observed at handoff time:

- `common/resources/settings-live/current-settings.json`
- `pax-fluxia/src/lib/components/game/GameContainer.svelte`
- `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
- `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`
- `pax-fluxia/src/lib/components/ui/settings/TerritorySlaWidget.svelte`
- `pax-fluxia/src/lib/config/builtinThemes.ts`
- `pax-fluxia/src/lib/config/categoryThemes.ts`
- `pax-fluxia/src/lib/renderers/MetaballRenderer.ts`
- `pax-fluxia/src/lib/territory/families/metaball/MetaballFamily.ts`
- untracked `.obsidian/`
- untracked `pax-fluxia/docs/`
- untracked `pax-fluxia/src/lib/components/ui/settings/TerritorySurfaceStyleTuning.svelte`
- untracked `pax-fluxia/src/lib/config/builtin-themes/imported/`
- untracked `pax-fluxia/src/lib/config/themeRouting.test.ts`
- untracked `pax-fluxia/src/lib/config/themeRouting.ts`

If you are transplanting to another branch, prefer cherry-picking the listed perimeter-field commits rather than merging the whole worktree blindly.

## What I Know For Sure

### 1. The active plan/spec/governance docs were rewritten and matter

`8a386cfa` is not optional if the receiving branch still lacks the corrected operating contract. It updates:

- `.agent/AGENT.md`
- `.agent/docs/game/territory/PERIMETER_FIELD_MODE_SPEC.md`
- `.agent/docs/game/territory/TRANSITION_SNAPSHOT_RECORDER_SPEC.md`
- `.agent/docs/project/implementation-plans/2026-04-15/PERIMETER_FIELD_IMPLEMENTATION_PLAN_2026-04-15.md`
- `.agent/docs/project/post-mortems/POST_MORTEM_2026-04-16_PERIMETER_FIELD_PLAN_SPEC_STATUS_DISCIPLINE.md`
- `.agent/rules/plan-spec-status-first.md`

This is the branch's explicit correction for earlier process failure.

### 2. `8d8296fc` is the main architectural switch

This is the big feature commit. It moves `power_voronoi` onto the plan-driven perimeter-field path and touches these major areas:

- `GameCanvas.svelte`
- `PerimeterFieldFamily.ts`
- `buildPerimeterFieldScene.ts`
- `perimeterFieldPlanEngine.ts`
- `perimeterFieldGeometryLoops.ts`
- `buildPowerVoronoiFrontierTopology.ts`
- `buildFamilyGeometry.ts`
- settings/config wiring
- diagnostics/export scaffolding

If the target branch wants the corrected `power_voronoi` transition architecture at all, this is the core commit.

### 3. `9c2c5016` fixed a real missing-V assignment bug

This commit changed:

- `perimeterFieldGeometryLoops.ts`
- `perimeterFieldPlanEngine.ts`
- `buildPerimeterFieldScene.test.ts`

What I know for sure:

- valid `power_voronoi` regions could be dropped from V assignment if their loop orientation was negative
- the code was changed to accept nonzero-area owned loops rather than rejecting them by orientation sign
- after this, the user explicitly reported: `Ok all regions have vstars as they should.`

This is one of the highest-confidence bug-fix commits in the chain.

### 4. `f80a8471` fixed the whole-map multi-conquest fan-out

This commit changed:

- `perimeterFieldPlanEngine.ts`
- `buildPerimeterFieldScene.test.ts`

What I know for sure:

- the plan engine had an off-spec owner-wide fallback when seed-loop resolution failed
- that fallback could cause one conquest to affect many loops or effectively the whole map
- the user explicitly reported afterward: `The multiple-conquest chaos is rectified, thanks.`

This is also high confidence.

### 5. `21a12125` fixed a real diagnostics/export truth defect

This commit changed:

- `GameCanvas.svelte`
- `TransitionBundleSerializer.ts`
- `buildPerimeterFieldScene.ts`
- `perimeterFieldDiagnostics.ts`
- `buildPerimeterFieldScene.test.ts`

What I know for sure:

- before this commit, the diagnostic/export path was not guaranteed to show the exact live rendered V set
- it mixed derived debug/reference arrays (`staticSamples`, `targetStaticSamples`, `transitionSamples`) and displayed them as if they were the live current truth
- the renderer itself used `sceneInput.samples`, but the debug snapshot did not preserve that exact set separately
- after this commit, the debug snapshot carries `renderedSamples`, which is the exact `sceneInput.samples`
- export code now explicitly requests `prev`, `transition`, and `next` snapshot modes instead of defaulting through transition rendering

This was an actual off-spec diagnostic defect, not just a presentation nit.

### 6. The supplied debug bundle proved a capture/export defect

Using the user-provided files under:

- `C:/Users/mikep/Downloads/2026-04-16 debug A/`

I verified this:

- `2026-04-16-192013_meta.json` recorded a conquest where `star-10` changed from `ai-4` to `human-player`
- but both `prevGeometryFingerprint` and `nextGeometryFingerprint` already reflected post-conquest ownership
- `geometry_snapshot.json` likewise showed `previousGeometry.version == nextGeometry.version`

That means the exported bundle at that time was not a true PREV|NEXT capture pair. It was contaminated.

This is the strongest concrete reason to distrust any conclusions drawn from that old bundle before `21a12125`.

### 7. The "underlying geometry" bars are vector geometry already present in the diagnostic snapshot path

I verified in code that the overlay is drawn from geometry loops using vector path drawing, not from a raster postprocess. So the user's objection here was correct: these bars are not something that only appears after rasterization.

Important nuance:

- this does not prove where the bad geometry originates
- it only proves the bad bars were already present in the geometry data being visualized by the diagnostic overlay

## What The User Explicitly Confirmed In-App

These are not my guesses. These came from the user after trying live builds.

- After `9c2c5016`: all regions had V-stars again.
- After `f80a8471`: the multi-conquest whole-map chaos was rectified.
- After the earlier offset-sampling theory, the user explicitly rejected my claim that offset was the root cause of the observed regression.
- The user also correctly called out that the diagnostic path had become misleading / off-truth.

Treat those confirmations as higher-quality evidence than any unverified theory in this branch history.

## What Is Likely Useful But Not Fully Proven

### `617fcd26` `restore inward-offset loop sampling`

What it does:

- changes `perimeterFieldPlanEngine.ts`
- adds test coverage in `buildPerimeterFieldScene.test.ts`

Why I would still keep it:

- it restores older neighbor-based inward offset logic for loop sampling
- it is locally coherent and tested

Why I would not oversell it:

- I initially overclaimed this as a live regression root cause
- the user explicitly rejected that claim based on the live result
- therefore I cannot honestly say this commit solved the user's observed rendering problem

Recommendation:

- keep it if the target branch wants the same plan-engine sampler behavior as this branch
- do not describe it as a proven live-bug fix

### `3540ef12` `restore geometry_0319 world clip`

What it does:

- changes `Geometry_0319.ts`

Why it may still be useful:

- it restores world-bounds clipping instead of a site-local clip rectangle
- that is conceptually correct for world geometry generation

Why I would not oversell it:

- after this landed, the user still reported remaining bad bars / bad underlying geometry
- so this commit was not sufficient to eliminate the geometry defect that still mattered

Recommendation:

- likely worth keeping if the target branch still has the smaller clip bug
- do not claim it resolves the remaining bar/chord/closure issue

### `ffed700d` `add replay conquest diagnostics`

Why it matters:

- it adds replay conquest metadata, attacker/target highlighting, and conquest vectors in replay/snapshot flows

Why I would still verify it after merge:

- the user later reported snapshot mode still did not seem to function correctly
- part of that problem was later traced to `21a12125`
- so `ffed700d` is useful, but should be thought of as incomplete without `21a12125`

## What Is Still Unresolved Or Needs Fresh Verification

### 1. Remaining bad underlying geometry bars / closure artifacts

Status:

- unresolved
- still needs a clean post-`21a12125` diagnostic export and live inspection

What I know:

- the bars are in the vector geometry/overlay path
- they were not made up by rasterization
- restoring world clip did not obviously eliminate them

What I do not know:

- whether the remaining defect originates in `Geometry_0319.ts`, in how shell/region loops are constructed downstream, or in how the perimeter-field diagnostics choose which loops to display

### 2. Final transition quality

Status:

- not signed off
- still needs live visual verification after the diagnostics-truth fixes

What I know:

- the plan path is active
- owner-wide changed-front fallback is removed
- the debug/export path is now much closer to truth

What I do not know:

- whether the current mover/correspondence quality is visually acceptable in all conquest cases
- whether any remaining jump or mismatch is algorithmic versus diagnostic

### 3. Snapshot overlay correctness in live UI

Status:

- code improved
- not fully re-verified in-browser after `21a12125`

What I know:

- old bundles were contaminated
- current code now stores exact rendered samples and explicit snapshot modes

What I do not know:

- whether every snapshot mode is now visually correct in the running app across replay/live/paused combinations

### 4. Sample label coloring can still mislead humans

This is not the same as the old "artificial samples" defect, but it is still worth noting.

The diagnostic sample labels use role/accent coloring rather than owner color in some paths. That can make the visual interpretation less intuitive, especially when trying to reason about opposing sides of a moving frontier.

I did not fix that in this branch.

## Recommended Merge / Cherry-Pick Strategy

### If the target branch lacks all perimeter-field work from this branch

Cherry-pick in this order:

1. `af772d80`
2. `2cf06fe8`
3. `8a386cfa`
4. `8d8296fc`
5. `617fcd26`
6. `9c2c5016`
7. `3540ef12`
8. `f80a8471`
9. `ffed700d`
10. `21a12125`

Reason:

- `af772d80` and `2cf06fe8` are foundational prerequisites
- `8d8296fc` is the architectural switch
- the later commits are targeted corrections on top of that path

### If the target branch already has the main plan-path switch

Highest-value corrective cherry-picks are:

1. `9c2c5016`
2. `f80a8471`
3. `ffed700d`
4. `21a12125`

Then consider:

5. `617fcd26`
6. `3540ef12`

### Conflict Hotspots

Expect conflicts most likely in:

- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- `pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts`
- `pax-fluxia/src/lib/territory/families/perimeterField/perimeterFieldPlanEngine.ts`
- `pax-fluxia/src/lib/territory/devtools/TransitionBundleSerializer.ts`
- `pax-fluxia/src/lib/components/ui/settingsDefs.ts`
- `pax-fluxia/src/lib/config/game.config.ts`

Resolve with this priority:

1. keep the active plan/spec contract
2. keep the plan-driven `power_voronoi` path instead of any star-angle fallback
3. keep exact diagnostic truth (`renderedSamples`, explicit snapshot modes)
4. do not reintroduce owner-wide changed-front fallback
5. do not reintroduce orientation-sign rejection for owned loops

## Recommended Verification After Merge

### Automated

Run:

```powershell
bunx vitest run pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.test.ts pax-fluxia/src/lib/territory/families/buildPowerVoronoiFrontierTopology.test.ts pax-fluxia/src/lib/territory/devtools/TransitionBundleSerializer.test.ts pax-fluxia/src/lib/components/ui/settingsDefs.test.ts
```

This is the focused suite that stayed green on this branch.

### Manual

After merge, do a fresh live repro and export a new diagnostic bundle. Do not rely on the old 2026-04-16 bundle for final truth because it was captured before `21a12125`.

Specifically verify:

1. all owned regions receive V-stars
2. one conquest no longer causes whole-map multi-front transitions
3. paused snapshot overlay modes actually differ:
   - `prev`
   - `next`
   - `transition`
   - `compare`
4. replay/scrub highlights attacker, target, and conquest vector correctly
5. exported `prev` and `next` geometry are genuinely different when the conquest changes ownership
6. the remaining bad geometry bars, if still present, are captured in a fresh clean bundle

## My Best Raw Summary

If I had to tell another agent where the real value is:

- `8d8296fc` is the foundation
- `9c2c5016` and `f80a8471` are proven live-bug fixes
- `21a12125` is the key fix for diagnostic truth and for making future debugging trustworthy

If I had to tell another agent what not to overclaim:

- `617fcd26` may be a good sampler correction, but I do not have proof it solved the user's observed regression
- `3540ef12` may be correct clipping cleanup, but it did not settle the remaining bar issue
- the branch is not at "done" or "trusted" status for remaining geometry artifacts and overall transition quality

If I had to tell another agent the single biggest lesson:

- do not debug the remaining geometry defect from contaminated diagnostics
- merge `21a12125`, produce a fresh bundle, and reason from that

