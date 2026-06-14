---
date created: 2026-06-13
last updated: 2026-06-13
last updated by: AI
relevant prior docs:
  - .codex/worktrees/9f22 .agent/docs/plans/2026-06-12/GRID_GRADIENT_PERFORMANCE_GEOMETRY_TOP10_PLAN_2026-06-12.md
  - .codex/worktrees/9f22 .agent/docs/plans/2026-06-12/GRID_GRADIENT_PERFORMANCE_MAJOR_FIX_PLAN_2026-06-12.md
  - .codex/worktrees/9f22 .agent/docs/project/handoffs/2026-06-12_GRID_GRADIENT_WORKTREE_9f22_HANDOFF.md
  - .codex/worktrees/dcc7 .agent/docs/plans/2026-05-04/PVV4_TRANSITION_RECOVERY_PLAN.md
  - .codex/worktrees/dcc7 .agent/docs/sessions/2026-05-16/2026-05-16_pvv4-active-front-repair-plan.md
  - .codex/worktrees/dcc7 .agent/docs/sessions/2026-06-02/2026-06-02_pvv4_branch_assessment.md
  - .agent/docs/sessions/2026-06-12/2026-06-12_worktree-consolidation-plan.md
superseding docs:
---

# Rendering Consolidation Audit — Worktrees 9f22 (Grid Gradient) & dcc7 (PVV4 Transition)

Role: Rendering Mode Master. Strict-mode reporting: facts, inferences, and suspected
defects are marked separately. No "canonical" usage.

## 0. Scope & Method

Two worktrees in the rendering/geometry domain were audited against `master`
(`82a559ef0`):

- **9f22** — `codex/grid-gradient-territory-mode` @ `cd1fe4b25`. Task: verify the claim
  it was "fully merged"; bring documentation into the dated session directory; report on
  its performance audit + opinion.
- **dcc7** — `codex/render-infra/pvv4-transition-bets` @ `2a805fc45`. Task: reconcile on a
  branch then merge to master; bring in docs; identify the nuanced issues in the
  ownership→geometry→transition logic blocking 100% consistent vector-border transitions.

Method: git ancestry + content diffs (not assumptions), direct reads of the primary
worktree docs, one subagent to map master's baseline transition contract and the dcc7
merge-conflict surface.

---

## 1. Worktree 9f22 — Merge Verification (FACT)

**Verdict: NOT merged. The "fully merged" claim is false in both directions.**

Evidence:

| Check | Result |
|---|---|
| Is `cd1fe4b25` an ancestor of `master`? | **No** |
| Grid-gradient feature files present in `master`? | **None** (`GridGradientFamily.ts`, `gridGradientPlan.worker.ts`, `GridGradientTuning.svelte`, shader-field dir — all absent from master) |
| Commits on 9f22 not in master | **44** |
| Merge-base | `26988be38` (2026-05-13) |
| Master commits since base (9f22 is behind) | **16** |

The 9f22 diff vs master also shows 9f22 *deleting* master's entire `HUD-package/` — this is
not a real deletion; it is divergence (9f22 branched before the HUD package landed on
master and never pulled it). 9f22 is **16 commits behind / 44 ahead**.

The worktree's own handoff (`2026-06-12_GRID_GRADIENT_WORKTREE_9f22_HANDOFF.md`) never
claims "merged." It states: *Status: Active production-candidate mode, performance-gated*
and *"Performance jank remains too high."* So the "fully merged" report an agent gave is
contradicted by git **and** by the worktree's own documentation.

Inference: the agent likely conflated "work committed in the worktree" with "merged to
master," or merged in the wrong mental direction. No grid-gradient code path exists in
master today.

---

## 2. Worktree 9f22 — Performance Audit: Content Summary (FACT)

Two dated plans (2026-06-12) plus a handoff. Both are high-quality, evidence-driven
(Chrome Performance bottom-up traces, total vs self time, whole-record vs selected red
frame). Hard constraint throughout: **major improvements only, no visual-quality
compromise** (no spacing increase, no sampling reduction, no feature disabling, no change
to ownership/geometry truth).

### 2a. MAJOR_FIX plan — the first bottleneck (largely implemented on 9f22)
Conquest jank was dominated by CPU plan/classification, not shader drawing:
`buildGridGradientPlan ~347ms`, `buildGridClassification ~318ms`, `resolveOwnerAt ~302ms
self` inside a single ~448ms frame. ~30k cells classified via point-in-polygon against PREV
and NEXT geometry, synchronously, on the render thread. Fix (status: implemented in the
branch): move plan builds to a Web Worker (mirroring the existing Metaball-Grid worker),
typed-array raster scanline classifier for non-jittered grids (point classifier retained
for jittered), steady owner-grid caching + PREV/NEXT diff, shader packing fed from typed
arrays. Live verification still pending.

### 2b. GEOMETRY_TOP10 plan — the bottleneck after workerization (planned)
With plan/classification off-thread, the residual ~130ms red frame is now geometry/frontier
compile. Top consumers: `computeGeometry0319 ~83ms`, `applyIntervalRepairs ~60ms`,
repair-validator closure ~55ms, `constructFillsFromFrontierChain ~44ms (37.8ms self)`,
`ringContainsPolyline ~26ms`, `buildDirectedSegmentKeys ~22ms (21.1ms self, string-heavy)`.
Whole-record steady-state then exposes a *second* problem: ship rendering dominates
(`renderShips ~8.6s` over a 20s capture; `getOrbitSlot 1.67s self`; particle `set tint`
~976ms self), plus `measurePerf 2997ms self` (instrumentation distorting the measurement),
worker structured-clone payload `~681ms`, and `getRenderFamilyModeConfigSource ~602ms self`
(config-object spread on a hot path).

Six tracks (A frame/instrumentation hygiene, B ship steady-state, C worker payload &
diagnostics, D config-source caching, E geometry-spike removal, F browser layout/paint),
with a 10-item execution order and acceptance criteria.

---

## 3. 9f22 Performance Audit — Assessment & Better Ideas (OPINION)

**Overall: strong, endorse it.** The profiling literacy is good (separates parent-envelope
rows from real self-time; whole-record vs red-frame). The prescriptions are the correct
class of fix (off-thread, typed/transferable, cache-by-signature, numeric ids over strings)
and the no-visual-regression discipline plus parity tests are exactly right.

Where I would reframe or push harder:

1. **Reframe the #1 lever: geometry should be event-driven, not frame-driven.** The plan
   treats "make compile faster / move it off-thread." The deeper question is *why
   `computeGeometry0319` runs at all on a steady frame.* Power-Voronoi geometry only changes
   on ownership/site/weight change. If geometry recompute is gated to a
   geometry-version/site-signature change and otherwise returns the committed result, most
   of the ~83ms simply never runs on steady frames. The plan has this as item #10
   (`computePowerDiagramIntegrated` cache by site signature) and Track E — it belongs
   *first*, framed as "geometry is recomputed on change, presentation runs every frame."
   Workerization then covers only the genuine recompute spikes (conquests).

2. **Prioritize the cheap, high-yield, low-risk wins before the worker rewrite.** By
   (yield × confidence ÷ risk): (a) memoize `getRenderFamilyModeConfigSource()`
   (~602ms self, trivial, zero visual risk); (b) numeric point/segment ids replacing
   `buildDirectedSegmentKeys` strings (~21ms self per compile + large GC relief, local
   change); (c) geometry-version gating (#1 above). These three are bankable before
   touching the worker/raster classifier (which carries parity risk).

3. **`constructFillsFromFrontierChain` (37.8ms self) is the real geometry hot spot, not the
   compiler envelope.** The plan's "share one chain-walk output across fills + frontier map
   + validation" is correct and should be elevated — it removes duplicate work rather than
   moving it. Combine with #1: cache the chain-walk result by frontier signature for the
   whole frame.

4. **Instrumentation overhead is a genuine, often-missed trap.** `measurePerf` at 2997ms
   self means the profiler is materially changing what it measures. Default to a monotonic
   counter aggregator; gate `performance.mark/measure` + random-id user-timing strictly
   behind an explicit capture flag. Endorsed and worth doing early so later traces are
   trustworthy.

5. **Ship steady-state is correctly the next dominator.** Orbit-slot precompute, tint-skip,
   and particle-pool-delta-hide are right. One addition: this is the pattern that benefits
   most from a single batched/instanced particle buffer with bulk attribute upload and a
   dirty range, rather than per-ship per-layer particle writes. Within PixiJS
   ParticleContainer their dirty-range approach is the pragmatic version.

6. **Raster scanline classifier = highest risk; keep it last and behind parity tests.** The
   tie-break order (same-owner collapse → anchor-distance → smaller-area → non-neutral) is
   subtle and must match the point classifier exactly at sample points or it is a
   readability regression. The branch already keeps jittered grids on the point path —
   correct.

Net: the audit needs no major correction; it needs **re-ordering toward event-driven
geometry + the three cheap wins first**, then workerize the residual conquest spike, then
the ship pass, with the raster classifier gated last.

---

## 4. Worktree dcc7 — The Ownership→Geometry→Transition Problem (FACT + ANALYSIS)

dcc7 is the deepest work in the rendering domain: a multi-week campaign (the **PVV4
recovery plan** 2026-05-04, **23 versioned transition-diagnosis docs**, a **strict-mode
contract**, a **casebook + playtest protocol**, the **active-front repair plan** 2026-05-16,
and a **branch self-assessment** 2026-06-02). The "new/improved geometry and transition
algo/contract/idea" the task refers to **is the topology-correspondence-first active-front
transition method** in the 2026-05-16 repair plan.

### 4a. The goal restated (user's words)
100% consistent vector-border transitions, every time, in every case. Operationally
(PVV4 recovery plan "branch law"): unchanged borders stay still; changed borders move only
inside the smallest justified interval; 3-way junctions are first-class structural anchors;
splits planned explicitly; **snap is better than gross deformation** when a safe local
transition cannot be justified.

### 4b. The contract / mental model
A conquest is a transformation of the **shared frontier graph**, not independent polygon
morphs. Fills are rebuilt from interpolated frontier geometry every frame (one clock, one
plan) to preserve the planar-partition invariant. Terms: PRE/POST states; Region (owner +
real-star membership); 3V (≥3 regions meet); **Change Anchor** (an *unmoving* PRE|POST
matching coordinate that bounds the moving front); Active Front (changed border between
Change Anchors); Moving 3V (a topology-matched junction whose coordinate moved — a shared
internal constraint, *not* an anchor); Transition Vertex / TV (sampled point on a planned
section, generated *last*).

### 4c. The nuanced issues blocking 100% consistency (the core finding)

The current implemented planner (`ActiveFrontTransition.ts`) is **coordinate-anchor-first**.
Its failure modes, in dependency order:

1. **Identity-by-coordinate, not by topology (root cause).** `findStableAnchors` matches
   vertices whose *coordinate-key* exists in both PRE and POST within EPS. This conflates
   "didn't move" with "is the same feature." Any junction that *is the same* but *moved*
   gets a different key and is lost. EPS is being used for *identity* when its only valid
   role is *classification after identity is established.*

2. **Lost moving 3V.** Direct consequence of #1. A 3-owner meeting point that exists in
   both PRE and POST but shifted is dropped instead of carried as a shared internal
   constraint → adjacent sections tear or snap independently → inconsistent borders at
   exactly the structurally hardest points.

3. **Non-exhaustive branch walk.** `buildChainsBetweenAnchors` sorts candidates at a branch
   and takes the first. At a 3V/branch this can take the wrong path and miss a required
   Change Anchor → the "wrong path at a junction" bug → motion leaks past where change
   actually stops.

4. **Anchor pair treated as a complete plan.** A pair of Change Anchors only bounds the
   front; inside it, PRE sections still must be matched to POST sections. Skipping this
   produces TVs that cross the map or animate only part of the visible front.

5. **Cardinality too narrow.** Only `1:1`, `1:2`, `2:1` handled. Real conquests produce
   `1:M`, `M:1`, `M:N`. Unhandled cases fall to repair paths or whole-path interpolation.

6. **TVs generated before section correspondence exists.** Sampling points before the
   PRE→POST section map is known permits rotations, broad redraw, and missed local motion.

7. **Silent repair paths.** Repair for missing PRE/POST fronts can convert an *unproven*
   correspondence into an animation — a "visual lie." Branch law says snap instead.

8. **Region ownership of motion not enforced.** A border belongs to a region; an
   ownership-static region's border must not be consumed by a neighbor's transition. Without
   region correspondence first, false collapses of unrelated regions occur.

### 4d. The proposed fix (the "idea" worth keeping)
Replace coordinate-anchor-first with **correspondence-first**, in order: (1) region
correspondence by owner + real-star membership; (2) topology correspondence for 3Vs / world
contacts / sections by *identity* (incident region set), before coordinates; (3) EPS only
now, to classify matched features as moved/unmoved; (4) seed the changed frontier from
actual changes (conquered stars, appeared/disappeared regions, moved sections/3Vs); (5)
**branch-exhaustive** outward walk from each seed until true PRE|POST coordinate matches are
found → those are the Change Anchors; (6) build Active-Front Components bounded by anchors;
(7) match PRE↔POST sections inside each component (`1:1/1:M/M:1/M:N`), carrying moving 3Vs as
shared constraints; (8) generate TVs from the section plan; (9) rebuild loops by replacing
*exactly* the planned sections; (10) if correspondence can't be proven, emit a named
planner defect and **freeze** — never invent a repair.

---

## 5. dcc7 — Assessment & Better Ideas (OPINION)

**The diagnosis is correct and the correspondence-first method is the right architecture.**
It is the most rigorous treatment of territory transitions in the project. The single most
important insight — *identity before coordinates; EPS classifies, it does not identify* —
is correct and is the crux of "100% consistency." Endorse the direction.

Additions / sharper framing:

1. **Make region+topology identity stable and collision-proof.** The method needs an
   identity key that survives repeated owner-triples on one map (open question #3 in the
   assessment). Recommend: composite key = sorted incident **region IDs** (region ID =
   owner + sorted real-star-membership hash), not owner colors/labels. Real-star membership
   is the invariant that survives geometry motion. This also answers "how to distinguish two
   different 3-way junctions both owned by {A,B,C}" — their incident *regions* differ even
   when owners repeat.

2. **Treat it as graph correspondence, and prove planarity is preserved.** The frontier is a
   planar graph; PRE→POST is a graph edit. A correctness check stronger than playtest: after
   building section plans, assert the interpolated frontier at t∈{0,0.5,1} is a valid planar
   partition (no self-intersections, every region closed, shared edges single-sourced). This
   converts "looks right" into an invariant the runtime can gate on — and *is* the mechanism
   that makes "every case" enforceable rather than aspirational.

3. **"Snap is better than gross deformation" should be a measured gate, not a vibe.** Define
   an explicit transport-cost / distortion bound per component (e.g. max TV travel relative
   to local section length, or a Hausdorff/Fréchet bound between planned and naive
   interpolation). If a component exceeds the bound or fails the planarity assert → snap that
   component (not the whole frame). This gives per-component graceful degradation and makes
   the success metric objective.

4. **Reconcile with master's existing `pvFrontline/` — do not add a third pattern.** Master
   already shipped a Power-Voronoi frontline transition (`pvFrontline/planner.ts`,
   `sampler.ts`, `contracts.ts`) on the `pv_frontline` path: OT-style polyline interpolation
   over identity-matched sections classified static/drifted/born/dying. dcc7's
   `ActiveFrontTransition` is a *parallel, more rigorous* attempt at the same job. AGENT.md
   §5.5 (one domain = one pattern) means we must **converge these**, not ship both. The
   highest-leverage move is to fold dcc7's correspondence-first planner + moving-3V +
   branch-exhaustive anchors **into** master's `pvFrontline` contract, reusing master's
   sampler where it already works. This is the real reconciliation question, above any file
   merge.

5. **The casebook is the right success instrument; wire it to CI.** dcc7's locked casebook +
   diagnosis packages are the correct way to make "every case" testable. Convert the casebook
   into golden fixtures over the new planar-partition assert so regressions are caught
   automatically rather than by replay.

6. **Diagnostics are genuinely the salvageable crown jewel.** The transition-package
   serializer, semantic conquest naming, single-source legend + overlays, conquest
   origin→target arrows, and TV traces are reusable regardless of which planner wins, and
   they are what make this domain debuggable. Port these first.

---

## 6. dcc7 — Merge Readiness (FACT) & Recommended Approach

**The branch is not merge-ready as a wholesale merge.** This is the branch's *own* verdict
(2026-06-02 self-assessment: "Do not merge this branch wholesale"), independently confirmed:

- `bun run check` on the branch: **113 errors, 807 warnings, 69 files** (missing MSR config
  defaults; transition mode-ID type errors; a diagnostics import to a missing
  `../pvCanonical/contracts`; `FrontierVertex` field drift; GameCanvas nullable/snapshot
  errors).
- **82 commits behind master**, 109 ahead. ~8 genuine conflict hotspots — dominated by
  `GameCanvas.svelte` (both sides massively edited) and the geometry/compiler/transition
  core (`Geometry_0319.ts`, `powerVoronoiTerritoryGeometryGenerator.ts`,
  `compiler_UnifiedVectorGeometry.ts`, `minStarMargin.ts`, `TransitionLayerCoordinator.ts`).
- **Protocol violation:** dcc7 renames catalog modes to `power_voronoi_canonical` /
  `territory_canonical`. Master uses `*_runtime`. Must resolve in master's favor.
- The implemented planner is **not the final method** (still coordinate-anchor-first).
- Direct `console.log/info` diagnostics; dirty `settings-live`; untracked `test-results/`.

Reassuring facts:
- dcc7 touches **`common/src` and `pax-server/src` not at all** — 100% `pax-fluxia/src`.
- dcc7 **deletes zero files** vs the merge-base; the ~70 `D` entries in `master..dcc7` are
  master-side additions dcc7 predates. A correct 3-way merge keeps master's work
  (`pvFrontline/`, HUD package, etc.).

**Recommended approach (matches the branch's own salvage plan and AGENT.md §5.4
architecture-first):** create the reconcile branch from current `master`, then **port in
narrow, compile-green slices** — do NOT `git merge` the branch wholesale (that imports 113
type errors and a planner flagged as non-final):

- Slice 0 (now, zero code risk): bring ALL dcc7 + 9f22 **docs** into master's dated dirs.
- Slice 1: semantic conquest naming + flat diagnostic package shape (+ tests).
- Slice 2: shared active-front legend, overlays, conquest origin→target arrows.
- Slice 3: ownership event threading (`authoritativeConquests`) — reconcile with master
  `common` types.
- Slice 4: geometry/topology contract enrichment (region IDs, anchorStarIds, topology
  indexes) — strip console logs.
- Slice 5: transition snapshot + TV trace diagnostics.
- Slice 6: the planner — **fold correspondence-first into master's `pvFrontline`**, not a
  wholesale `ActiveFrontTransition.ts` copy. (Multi-session; the real engineering.)
- Slice 7: PVV4 UI controls, after runtime fields exist on master.

Each slice ends green (`bun run check` + targeted tests) before the next.

---

## 7. Cross-Cutting Finding: 9f22 and dcc7 Collide on the Geometry Core (OPINION)

These are framed as two distinct issues, but they **converge on the same files**:
`Geometry_0319.ts`, `minStarMargin.ts`, `powerVoronoiTerritoryGeometryGenerator.ts`,
`resolveConstraintAlignedTerritoryGeometry.ts`, `compiler_UnifiedVectorGeometry.ts`,
`TransitionLayerCoordinator.ts`. 9f22 wants these *faster*; dcc7 wants these to carry
*richer contracts* (region IDs, topology indexes). If both land, they must be reconciled
**together** on the geometry core, or the second merge will thrash the first. Recommend
sequencing: dcc7 contract enrichment (Slice 4) and 9f22 geometry perf land in one
coordinated pass on these files, because the perf work (numeric segment ids, shared
chain-walk, event-driven recompute) and the contract work touch the same functions.

---

## 8. Status & Next Actions

- [x] 9f22 merge claim verified — NOT merged (§1).
- [x] 9f22 perf audit summarized + assessed (§2–3).
- [x] dcc7 transition contract + nuanced issues identified (§4) + assessed (§5).
- [x] dcc7 merge readiness established — not wholesale-mergeable (§6).
- [ ] Migrate worktree docs into master dated dirs (Slice 0) — pending go-ahead.
- [ ] dcc7 reconcile branch — pending decision on approach (wholesale-fix vs slice-salvage).
- [ ] 9f22 code disposition — pending decision (docs-only vs also consolidate the feature).

Decisions required from user are tracked in the session doc.
