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

## CONFIRMED root cause (2026-06-23, DevTools profile + cold trace)
The freeze is the **first-time WebGL shader program LINK**, not any CPU pipeline stage:
- DevTools profile: `getProgramParameter` = **3,572.9 ms self-time (95.7 %)**, under
  `draw → _tick → GlEncoderSystem` (PIXI's GL program-link / `LINK_STATUS` check, which blocks
  until the driver finishes compiling + linking the program).
- The cold `[GEOMTRACE]` block confirms every CPU stage is tiny: `classMs=36.2 matMs=17.4
  distMs=8.7 waveMs=0.4 sceneMs=0 texPackMs=9 texUpMs=0 updateMs<2`, `planHit=true`.

**Why the link is so slow:** `gridGradientShaderFieldShaders.ts` `main()` invoked `shadeCell()`
1 + up-to-4 + up-to-4 times, gated by the `uNeighborMode` **uniform**. A uniform is not a
compile-time constant, so the compiler had to compile **all 9** inlined `shadeCell()` trees —
each heavy (2 texture reads, hash jitter, sin/cos drift, up to 2× `shadeCellSide` with the
3-variant `markMask`, `noiseMask`'s 3 sins, pulse, glow). The **default `neighborMode` is
`'eight'`** (`GridGradientFamily.ts:134` → number 2 → all 9), so the default path compiled the
most expensive variant. ANGLE/Windows links that ~3.5 s (varies 2-10 s by driver/thermal).

## Fix shipped: uniform-bounded neighbour loop (zero visual change)
`gridGradientShaderFieldShaders.ts` — replaced the 9 unrolled `shadeCell()` calls with a loop
over a `const vec2 kNeighborOffsets[9]` array, bounded by `neighborCount` *derived from the
`uNeighborMode` uniform* (1 / 5 / 9). Because the bound is not a compile-time constant the driver
**cannot unroll** the loop → `shadeCell()` is compiled **once**, not 9×, collapsing the program
size that dominates link time. Same cells, same accumulation order (center → 4-neighbour →
8-neighbour) → byte-identical output for every neighbour mode. Renderer untouched (`uNeighborMode`
still set as before). One file.

CONFIDENCE / RISK: correctness + zero-visual = high (mechanical equivalence). The *magnitude* of
the link reduction depends on the driver honouring the dynamic loop (WebGL2 / `#version 300 es`
ANGLE supports native dynamic loops and should not force-unroll) — **must be confirmed by a cold
GG trace** (link/freeze should drop sharply). If ANGLE force-unrolls anyway, escalate to: (a) drop
the default `neighborMode` `'eight'`→`'cross'` (visual sign-off), (b) shape/animation compile-time
variants inside `shadeCell`, or (c) KHR_parallel_shader_compile / off-frame warm.

USER ACTION: reload, switch cold into Grid Gradient, copy the `[GEOMTRACE]` block + confirm the
territory looks identical. The first-frame freeze should be gone or much smaller.

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
