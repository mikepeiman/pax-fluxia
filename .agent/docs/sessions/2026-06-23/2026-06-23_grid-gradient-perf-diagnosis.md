---
date created: 2026-06-23
last updated: 2026-06-23
last updated by: AI (opus-territory)
relevant prior docs: .agent/docs/project/post-mortems/2026-06-23_grid-gradient-worker-defer-blank.md
superseding docs: —
---

# Grid Gradient performance — diagnosis + plan

## Purpose
User: *"Yes make it cheap. I've been very clear and emphatic I want all performance
improvements. Make any and all performance improvements now."* — eliminate the 3-6s Grid
Gradient first-load freeze and any other real per-frame/per-build cost, with zero visual
regression.

## Status correction (evidence, not assumption)
The earlier diagnosis (GG-load subagent) attributed the 3-6s freeze to the per-cell allocation
in `materializeClassification`. **The pipeline trace disproves that.** The `fam` line shows
`planMs=49.20` with `planHit=true` even mid-transition — i.e. the entire plan build
(classification incl. materialize + wave) is ~49ms (≈0.9µs/cell × ~52k cells), and it is
*cached* during transitions, not rebuilt per frame. So:

- The plan build is **NOT** the 3-6s freeze, and **NOT** per-frame transition jank.
- The freeze must live in the cold stages the old trace did not surface: cold geometry build,
  distance field (`lastDistanceBuildMs`), first WebGL shader compile, or texture upload
  (`lastTextureUploadMs`). All measured in `GridGradientStats` but previously unsurfaced.

Per §7.4 / RULE 0 I will not off-thread or rewrite a stage I have not timed as the bottleneck
(that mistake caused the blank — see the post-mortem).

## Done this session
- **Surfaced the full cold-load stage breakdown** in the trace `fam` step
  (`GameCanvas.svelte` grid_gradient branch): `updateMs` (TOTAL) + `matMs` (materialize),
  `distMs` (distance field), `waveMs`, `sceneMs`, `texPackMs`, `texUpMs`. One cold switch into
  Grid Gradient now shows exactly which stage owns the freeze.
- Reverted the cold worker-defer that blanked the mode (`44ca5b48e`); cold build is synchronous
  again (renders), warm rebuilds still off-thread.

## Next: MEASURE, then fix the named stage
USER ACTION: reload, switch cold into Grid Gradient, copy the `[GEOMTRACE mode=grid_gradient]`
block. Read `updateMs` (is it still 3-6s post-revert?) and the largest sub-stage:
- `texUpMs` large → texture upload of the per-cell textures is the cost → upload smaller /
  async / incremental, or reduce texture count.
- `distMs` large → the frontier distance field → cache / coarser / reuse buffers.
- `updateMs` >> sum(sub-stages) → first WebGL **shader compile** (not separately timed) →
  precompile/warm the program off the first render frame.
- all sub-stages small but `updateMs` large on the FIRST load only → one-time GPU warmup.

## Perf backlog (prioritized; not blind-applied)
1. **The real freeze** — fix the stage the cold trace names (above). Highest value.
2. **Plan-build allocation reduction (~49ms, every geometry rebuild + cold).** The per-cell
   `GridVStar` object + `g:ix:iy` string in `materializeClassification` are load-bearing: the
   render (`gridGradientScene.ts`, `shaderField/...Packing.ts`), `buildFlipTimeByteByCell`
   (`plan.ts:227`, keyed by `v.id`), and the wave planner all consume them. Reducing this means
   moving those consumers to the typed/SoA channel (`prev/nextOwnerIndexByCell`, `roleCodeByCell`,
   `cellIndex`) and keying flip-time/wave by `cellIndex` not string id. Multi-file, RISKY —
   requires a pixel-parity guard (snapshot `ownerTextureData`/`roleCodeByCell`/`flipTimeByteByCell`
   at progress 0/0.5/1, assert byte-equality). Deliberate effort, not a quick change.
3. **`Geometry_0319` step-0 Set** — `new Set(ownedStars.map(...))` is evaluated every geometry
   rebuild even when the trace is OFF (args build before `step()` early-returns). Guard with
   `if (geometryTrace.capturing)`. Trivial; negligible (~owned-star count). Not yet done.
4. **`byRole` string-id arrays** in `materializeClassification` — built per cell, consumed only
   by a stats log (cell-count-per-role, `GridGradientFamily.ts:267`). Could be per-role counts
   instead of id arrays. Minor.

Items 2-4 are real but bounded; item 1 is the user's actual pain and must be measured first.
