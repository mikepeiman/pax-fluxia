---
date created: 2026-06-13
last updated: 2026-06-13
last updated by: AI
relevant prior docs:
  - .agent/docs/sessions/2026-06-13/2026-06-13_GRID_GRADIENT_PERF_EXECUTION_PLAN.md
  - .agent/docs/plans/2026-06-12/GRID_GRADIENT_PERFORMANCE_GEOMETRY_TOP10_PLAN_2026-06-12.md
superseding docs:
---

# Grid Gradient Perf — Completion Log + Remaining Refactors

## Landed (all gated green: check + tests + build; behavior-proven)

| Win | Target (from trace) | Risk control |
|---|---|---|
| Render-family config-source memoization | `getRenderFamilyModeConfigSource` ~602ms self | epoch parity with geometry cache |
| Numeric segment ids + per-region ring precompute | `buildDirectedSegmentKeys` ~21ms self + repeated ring scans | randomized parity test |
| `measurePerf` user-timing id/label scoping | `measurePerf` capture overhead | type-safe; behavior preserved |
| `applyIntervalRepairs` ref-index + metrics memo | `applyIntervalRepairs` ~60ms conquest | 9 min-star-margin tests |
| Shared chain walk (fills + frontier map) | duplicate `executeChainWalk` per compile | full territory suite |
| Ship particle tint write-skip | `set tint` / `Color._normalize` ~976ms self | renderer tests; same final tint |
| `countRoles` derive-once + active-cell scan | `countRoles` ~277ms full-grid scan/frame | counts identical; recordStats unchanged |
| Ship orbit cached trig (angle-addition) | `getOrbitSlot` ~1.67s self | exact; parity test (ndx/ndy == cos/sin(angle)) |

Conclusion: the **safe, high-confidence squeeze wins from the trace are exhausted.** No
visual/geometry truth changed anywhere; geometry changes are parity-proven identical.

## Investigated and intentionally NOT done (why)

- **`buildDistanceInputs` per-frame distance-field rebuild** — pure function of (plan,
  palette), so cacheable, BUT only ~2.7ms (a "nearby" consumer, not top-10) and on the
  graphics *fallback* path. Low yield, medium risk (stale-fill). Skipped.
- **`getOrbitSlot` micro-opts** (`Math.pow(2,n)`→shift, cumulative layer table) — the per-call
  cost is dominated by `Math.cos`/`Math.sin` (irreducible per ship/frame for slow orbit
  rotation). Micro wins only; skipped.

## Remaining BIG wins — designed refactors (need visual-verification loop)

### A. Ship orbit fast path — LANDED (see table above)
Implemented as an internal `getOrbitSlot` cache (no caller restructure needed): cached
base-angle trig (across frames) + per-frame per-layer ring-rotation trig, combined via the
angle-addition identity `cos(base+rot)=cos·cos−sin·sin`; direct-trig fallback when
`biasStrength > 0`. Exact, parity-tested. Still pending the user's in-game visual sign-off
on ship positions.

### B. Worker payload — conquest-time (~681ms, `GridGradientFamily.worker.onmessage`)
The worker structured-clones the whole `CachedGridGradientPlan`, dominated by
`classification.vstars` (one object per ~30k cells). vstars is still read on the MAIN thread
by `shaderField/gridGradientShaderFieldPacking.ts` and `gridGradientScene.ts`, so it cannot be
dropped from the wire until those consumers read typed arrays instead (MAJOR_FIX plan item 5,
only partially done). Refactor = convert shader packing + scene to typed-array reads, then
omit vstars from the worker response (+ transfer typed-array buffers). Real risk to the GG
core data path the user is currently happy with.

### C. Particle upload (~1.3s, `ParticleBuffer.update`)
Orbiting-ship positions change every frame (rotation), so the per-frame attribute upload is
largely irreducible without Pixi dirty-range support or splitting static vs traveling ships —
a larger restructure.

### Not player-facing
Diagnostics/layout-paint pressure (~1.7s) only occurs when a diagnostics panel is OPEN; closed
in normal play → no player cost. Not pursued.

## Recommendation
The safe + exact wins (including ship orbit A) are landed. Playtest the branch to confirm
visuals — especially ship positions — and feel the improvement. The remaining wins (B worker
`vstars` payload, C particle upload) are larger refactors that touch the Grid Gradient core
data path / particle pipeline and need an explicit greenlight + per-step visual verification.
Weigh them against the risk once the current state is confirmed solid.
