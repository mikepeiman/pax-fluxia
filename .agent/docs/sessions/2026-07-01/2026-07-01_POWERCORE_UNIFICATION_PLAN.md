---
date created: 2026-07-01
last updated: 2026-07-01
last updated by: AI
relevant prior docs:
  - .agent/docs/sessions/2026-07-01/2026-07-01_TERRITORY_OVERNIGHT_INTEGRATION_REVIEW_SYNTHESIS_AND_RECOVERY_PLAN.md (L3–L6 superseded by this plan)
  - .agent/docs/sessions/2026-07-01/2026-07-01_TERRITORY_RECOVERY_L2_L3_DESIGN.md (L2 carried forward; L3 subsumed)
  - .agent/docs/game/design/2026-06-21 PowerCore build plan
superseding docs:
---

# ⭐ POWERCORE UNIFICATION PLAN (governing)

**User decision 2026-07-01:** perfect a single Power-Voronoi core — **PowerCore** — and rebuild the
territory stack on it. The grid-lattice aesthetics (**Phase Edges / Ember / Phase Field**) are NOT
abandoned: they are re-based as **skins** on the PV core. This plan supersedes recovery loops L3–L6.

**The four goals, in order:** correct geometry → correct transitions → buttery-smooth animation →
blazing-fast performance. Presentation only; the gameplay engine is untouched (replay hash
`9f6dae73…9741910` guards every phase).

## Why (evidence, one paragraph)

L1 baseline (32 rows, release, 2026-07-01, `f2fdf1c72`): the game renders at refresh (p50 8.3 ms,
tight tails) in PV / Perimeter / Metaball / Phase Field — and is structurally slow in the grid
families (Phase Edges p50 25 ms, Ember 33 ms **in every scenario**, not just captures; Grid
Gradient ~100 ms). Current geometry has known correctness bugs (junction walk). Per-capture cost
(~40 ms global geometry recompute + ~35 ms wave plan) is avoidable: the board is immutable in-game,
so a capture is a **local** change. Fix the root (correct + local + cheap), then skin it.

## Phases

### P0 — Clear the ground (small, immediate)
- Delete the dead `PRESENTATION_SMOOTHNESS_FIRST` false-branches in GameCanvas (8 gate sites:
  scheduler-background / message-channel / timeout / delay-timeout paths). Keep the
  pending-age / commit-lag / scheduleMode instrument — it is the acceptance measurement.
- Harness (already on `claude/territory-recovery`) becomes the permanent gate tooling.
- **Gate:** svelte-check + tests green; replay hash unchanged; pending-display 0; spot bench row
  matches baseline.

### P1 — PowerCore correctness (the foundation)
- Finish the PowerCore engine (`pax-fluxia/src/lib/territory/geometry/powerCore/` — shared-edge
  graph + angular-order loop walk already passes the 3-way junction; task #4).
- Adapter: PowerCore output → `ResolvedGeometrySnapshot` (the render-family input), so families
  can consume it unchanged during the bridge period.
- Correctness tests: junction walks, region closure, no self-intersection, full-plane coverage —
  on the 5 fixture maps + `First Symmetry-6_April 17b`.
- **Gate:** all invariant tests green + **user visual sign-off** on the static map (the gate; never
  self-declare geometry correct).

### P2 — Locality (the performance fix)
- Incremental capture updates in PowerCore: a capture changes ownership at one star → recolor that
  region + reclassify its incident edges (frontier vs interior); if weights shift the frontier,
  re-solve only the affected neighborhood. Never recompute the whole map for one capture.
- **Gate:** per-capture geometry update p95 ≤ 2 ms on the acceptance map; initial full build ≤
  100 ms (one-time at game start); replay hash unchanged.

### P3 — One transition system
- Exact capture identity: keyed by tick + star + prevOwner + newOwner; recapture-safe (the one
  design idea kept from the overnight branch).
- Two-stage presentation: **stage 1** — correct current ownership painted on the capture tick,
  always; **stage 2** — decoration (wave/flash/FX) built on a deadline-bounded task, late-joins the
  animation if slightly late, skipped entirely if very late. Stale ownership is never shown.
- **Gate:** pending-display 0 in all rows; capture-tick frame p95 ≤ 16.7 ms on hero skins; no
  repeated plan-build per capture; hash unchanged.

### P4 — Skins over the core (consolidation)
- **Hero skins on PowerCore geometry:**
  1. *Vector* — the crisp PV look (regions, smoothed frontiers). Nearest current: PVV4.
  2. *Lattice* — the Phase Edges / Ember / Phase Field aesthetic (dense cells, glowing seams,
     ember flicker), re-implemented as GPU presentation of region membership (region mask / SDF
     sampled by a cell shader — one draw), not per-cell CPU Graphics. Target: the current look at
     ≤ 8.3 ms, replacing today's 25–33 ms implementations.
- Per-skin **user visual sign-off** is the parity gate. No legacy family is removed before its
  replacement skin is signed off.
- After sign-off: legacy families retire to branch `museum/render-families-2026-07`; settings
  Render section lists skins only. (Grid Gradient's fate — re-skin or retire — is a user call at
  this point.)
- **Gate:** sign-off per skin; settings surface reflects skins only; no orphaned config keys.

### P5 — Polish + permanent guard
- Acceptance matrix shrinks to hero skins × (gameplay / transition / mode-switch / input-pressure),
  8 runs, percentiles + pending + hash. Target: p50 at refresh, p95 ≤ 16.7 ms, p99 ≤ 33 ms; any
  worse row has a named cause.
- Frontier FX and smooth-fill land inside the Lattice skin shader (subsumes tasks #10, #11).

## What this absorbs / kills
- **Absorbs:** task #4 (PowerCore) = P1–P2 · task #8 (60 fps floor) = P2+P5 · task #10 (smooth
  fill) + #11 (Frontier FX) = P4–P5 · remainder of #9 (settings normalize) = P4.
- **Kills:** recovery loops L3–L6 (superseded); the 8-family acceptance ritual; all
  scheduling-as-perf work (the overnight branch's approach and its descendants).

## Standing rules for this plan
1. Replay hash checked at every phase gate; any change = stop, report.
2. User visual sign-off gates geometry (P1) and each skin (P4) — screenshots + live check.
3. Work on `claude/territory-recovery` (rename in spirit: it is now the PowerCore integration
   lane); small reversible commits, explicit pathspec, push after each.
4. Capture-first: new findings/tasks go to MASTER_TASK_LIST the moment they surface.
5. No deletions before consolidation + user-verified success (museum branch first).
