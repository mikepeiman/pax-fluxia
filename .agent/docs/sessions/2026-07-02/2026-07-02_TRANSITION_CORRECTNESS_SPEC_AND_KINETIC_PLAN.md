---
date created: 2026-07-02
last updated: 2026-07-02
last updated by: AI
relevant prior docs:
  - .agent/docs/game/territory/CONQUEST_ANIMATION_SPEC.md (user-authored intent — governs)
  - .agent/docs/game/territory/2026-07-02_POWER_VORONOI_TECHNICAL_GUIDE.md (independent technical
    guide, user-supplied; §E validates weight-interpolation transitions + color cross-fade for
    captures + the hidden-site popping clamp; §C gives CLOSED-FORM SB/MSR weight bounds for when
    constraints are unshelved; its "full recompute is trivial" assumption does NOT hold at our
    virtual-inflated site counts (1,929 sites → 17.6ms) — the bubble is the adaptation)
  - .agent/docs/game/territory/TERRITORY_TRANSITION_INVENTORY.md
  - .agent/docs/sessions/2026-06-16/2026-06-16_GEOMETRY_PIPELINE_MODEL_AND_FIX_PLAN.md (§ validated structural direction)
  - .agent/docs/sessions/2026-07-01/2026-07-01_POWERCORE_UNIFICATION_PLAN.md (P3 of the governing plan)
superseding docs:
---

# ⭐ Transition Correctness Spec + Kinetic Plan (P3, governing)

**User directive 2026-07-02:** transitions are the real hard problem; solve for ABSOLUTE
correctness. Constraints tuning is shelved. Breaking the running app is permitted.

## 0. Design history (user-authored 2026-07-02 — full version in CONQUEST_ANIMATION_SPEC.md)

The standing feel target: vector borders animating PRE→POST **like water flowing / rippling waves /
a rope being pulled**. The first mechanism tried (implant transition vertices on changed sections,
PRE|POST correspondence, lerp) **never worked reliably** — this spec's rejection of shape
correspondence is that lesson, made structural. A second concept (visual-diff the PRE|POST and
morph in image/field space, e.g. SDF interpolation) was never implemented and remains a documented
alternative. The metaball family AND all grid-based modes were invented *because* vector
transitions were hard — grid modes are the most reliable so far, but the goal remains **pure,
deterministic vector transitions** as the foundation for performance and a visual-FX suite. The
kinetic bubble morph below is aimed squarely at that goal: the diagram's own motion produces the
flowing-water frontier sweep; easing/propagation shaping along the front supplies the ripple
character; every frame is exact vector geometry.

**User 2026-07-02: kinetic-style transitions were TRIED BEFORE AND FAILED** (the half-built
virtualStars/extraSites seam is the residue), approved now for a second attempt because the idea
"makes clear sense." What this attempt has that the prior one lacked: PowerCore's single-source
edge graph (fills cannot drift), the frozen-outside identity diff (no global recompute, no global
jitter), the no-leak weight-bound argument (ramped sites provably cannot invade frozen cells), and
an offline T1–T7 test harness that runs without a browser. Known sharp edge carried in: corridor
CONTEST virtuals share duplicate siteIds (the 0319 dropped-frontier root cause) — kinetic code
keys sites by composite identity (id+owner+position), and a Stage-0 unique-id fix is a separate
gated task (it would change BOTH pipelines' output, likely for the better).

## 1. What "correct" means (testable acceptance criteria)

Derived from CONQUEST_ANIMATION_SPEC.md hard constraints + the identity model already on master.

- **T1 Endpoint exactness.** At progress 0 the displayed geometry equals the pre-capture snapshot
  S0 exactly; at progress 1 it equals the post-capture snapshot S1 exactly. Byte-comparable — no
  snap, pop, or residue at either end.
- **T2 Frame validity.** Every intermediate frame is a valid territory picture: full-plane
  partition, closed loops, no self-intersections, fills and borders derived from the SAME points
  (the spec's "fills derive from frontier truth" — PowerCore satisfies this by construction).
- **T3 Frozen outside.** Geometry not affected by the capture is byte-identical in every frame
  ("unchanged borders must not jitter" — frozen by identity, not by hope).
- **T4 Identity + recapture.** Transition keyed `tick:starId:prevOwner:newOwner` (existing
  `transitionIdentityKey`); simultaneous captures bundle per session key. A recapture mid-flight
  RETARGETS from the currently displayed intermediate state toward the new S1 (no restart, no jump,
  no stale ownership).
- **T5 Tick-bound timing.** Dispatch on tick boundary; complete within the configured
  `TERRITORY_TRANSITION_MS` ≤ tick interval.
- **T6 Determinism.** Same captures + same timing inputs → identical frames (hash-comparable).
- **T7 Budget.** Per-frame transition cost ≤ 2 ms on the acceptance map; per-capture setup ≤ one
  frame budget or deadline-bounded off-path (two-stage rule: truth immediate, decoration skippable).

## 2. Mechanism: kinetic bubble morph (site interpolation, not shape correspondence)

The 2026-06-16 analysis validated (with literature) that the correct conquest morph interpolates
**diagram inputs** (sites/weights), letting geometry move and treating topology changes as natural
flip events — NOT correspondence-matching two output geometries. Today's PVV4 planner is an
explicit stub matcher; DY4/OT is the deprecated non-reference path; six implementations coexist
across three runtimes. All of that retires.

Measured on `First Symmetry-6_April 17b` (172 stars → 1,929 sites with virtuals): full PowerCore
snapshot 41 ms, diagram alone 17.6 ms → naive full recompute per frame is NOT viable. Hence:

1. **Diff S0/S1 by identity.** Cells (by siteId) whose polygons are identical in S0 and S1 are
   UNCHANGED; everything else is the **bubble** (captured star's cell + affected neighbors +
   churned virtual cells). Typical bubble: tens of sites out of ~2,000.
2. **Freeze outside.** All SharedEdges/loops outside the bubble are the S1 objects, byte-stable
   for the whole transition (satisfies T3 exactly). The bubble's outer boundary is identical in
   S0 and S1 by construction.
3. **Kinetic interior.** Per frame, recompute a mini power diagram of the bubble's site set only,
   clipped to the bubble polygon. The site set is the UNION of S0 and S1 bubble sites, each with a
   weight ramp: sites present in both keep their weight; the captured star gets a ghost pair (old
   owner weight × (1−p), new owner weight × p — the `virtualStars`/`extraSites` idea, finished);
   appearing sites ramp ε→full; vanishing sites full→ε. ONE mechanism covers ownership handoff AND
   virtual-site churn AND all topology flips (cells appear/vanish/split as the diagram dictates —
   no matching heuristics, every frame valid).
4. **Presentation reads geometry.** The transition engine emits the current frame's SharedEdge
   graph / snapshot; skins just draw it. Transitions become a GEOMETRY-layer concern; per-family
   transition machinery (grid wave, OT modes, crossfade, stub planner) is superseded.
   (Lattice skins may still style the moving front — e.g. ember glow at changed edges — but the
   moving SHAPE comes from the kinetic geometry.)
5. **Fallback** if bubble re-solve exceeds budget on pathological captures: K keyframes of the
   same kinetic interior computed deadline-bounded, lerp between adjacent keyframes by edgeId
   (adjacent keyframes are near-identical in topology).

Recapture (T4): flip the ramp's target — new S1', new ghost pair seeded from the CURRENT p, same
bubble recomputed against S1'. Because state is (sites, weights, p), retargeting is trivial —
another payoff of interpolating inputs instead of shapes.

## 3. Execution plan

- **K1 — Kinetic core (pure TS, offline-tested).** In powerCore/: `diffSnapshotsToBubble(S0,S1)`
  (identity diff → bubble sites + frozen set + bubble polygon), `sampleKineticFrame(bubble, p)`
  (union-site weight ramps → mini diagram → bubble-interior graph stitched to frozen exterior).
  Tests: T1 byte-exactness at p∈{0,1}; T2 partition/closure/self-intersection invariants at
  sampled p (reuse the powerCore invariant helpers); T3 frozen-outside byte-stability; T6
  determinism; simultaneous-capture bundling; recapture retarget. Fixture maps + acceptance map.
  **Gate: all tests green; sampleKineticFrame ≤ 2 ms on acceptance-map captures.**
- **K2 — Engine integration.** Feed conquest events (existing session/identity plumbing) into the
  kinetic sampler behind the `power_core` geometry source; per-frame snapshot output through the
  existing RenderFamilyInput.geometry path. Two-stage rule enforced: S1 truth available
  immediately; if bubble setup misses its deadline, skip the morph for that capture (T7).
  **Gate: replay hash unchanged; bench rows (transition scenario) ≥ baseline; pending-display 0.**
- **K3 — See it.** Vector skin (minimal: fills + borders from the live snapshot — also the PV-look
  A/B vehicle P1c still needs) + lattice modes consuming the kinetic geometry.
  **Gate: USER visual sign-off on captures (the wave look, junction behavior, recapture).**
- **K4 — Retirement.** The six legacy transition implementations + transitions/ dir contents that
  the inventory marks live-but-superseded move to the museum branch (after K3 sign-off only).

## 3b. Completion plan (operational — added after K1/K2a/K2b landed, 2026-07-02)

Status: K1 core (`5e95f63a6`) + K2a endpoint extraction (`254e38421`) + K2b runtime with T4/T5
(`53f29625e`) are green offline. What remains is wiring, visuals, and retirement. USER CHECKPOINTS
are the moments the user looks at the screen; each comes with a diagnostics recipe.

### K2c — wire the runtime into the live loop (no visuals; game unchanged)
1. Recon the GameCanvas seams: ownership snapshot + conquestEvents + `transitionIdentityKey`
   session bundling (renderFamilyTransitionLifecycle) + the per-frame geometry call.
2. One `KineticTransitionRuntime` active when geometry source = `power_core`: commit on ownership
   change (session key; duration = resolveTerritoryTransitionDurationMs(tick); ripple origin =
   captured star). `RenderFamilyInput` gains optional `kineticFrame` — NO consumer yet, so zero
   behavior change in every mode.
3. **Diagnostics (built here, used at every later checkpoint):**
   - New logger category `transition` (default OFF; user toggles it in Settings → Developer →
     Logging). Lines: commit (key, ramp count, bubble/frozen sizes), settle, RETARGET, degeneracy
     retries, bounds escapes, per-frame cost p50/p95 every ~60 frames. No raw console.log.
   - Kinetic counters (frames sampled, cost, active key) added to
     `getBenchmarkTerritorySchedulerSnapshot()` so the bench harness sees them.
4. Gates (mine): replay hash unchanged · spot bench transition rows (both sources) ≥ baseline ·
   pending-display 0 · suites + check green. Per-frame cost target ≤2ms — adaptive ring depth is
   the lever if the 2.6ms K1 number doesn't drop on real captures (bubbles from single captures
   are smaller than the test's full-corridor churn).
   - OPTIONAL user smoke: enable the `transition` log category, play, confirm lifecycle lines
     appear on captures while visuals stay 100% unchanged (proves event flow before pixels move).

### K3a — Vector skin MVP · **USER CHECKPOINT 1 (first visible transitions)**
Minimal PowerCore Vector render mode: settled snapshot fills+borders; when a kineticFrame is
active, redraw only the moving bubble cells per frame; captured-cell ownership shown as a fill
crossfade driven by the handoff ramp's q (directional wipe = polish, later). Registered as a
selectable render mode.
**User instructions (the message will repeat these exactly):** reload → select the PowerCore
Vector mode → capture stars. Verify: (a) static map correct; (b) capture frontier SWEEPS
(water/ripple) with no pop at start or end; (c) untouched borders perfectly still; (d) recapture
mid-wave reverses smoothly; (e) no hitching. **Diagnostics involvement:** enable the `transition`
category; paste any WARN/ERROR lines (retries, escapes) + describe/screenshot anything visually
wrong, with the logged capture key so I can correlate.

### K3b — feel tuning · **USER CHECKPOINT 2 (the water/rope verdict)**
Expose in Settings → Territory → Transition: ripple span, easing, wipe style, (duration already
tick-bound). User tunes live and judges against the standing feel target. THIS is the vector-
transition sign-off gate.

### K3c — scrubber (built only if checkpoint 1/2 findings need it)
The runtime is pure + deterministic, so a dev HUD widget (NOT the settings panel — it pauses the
game) can freeze a capture and scrub p by slider, plus dump frames to `.agent-harness` for
offline analysis of anything the user flags.

### K4 — lattice modes + retirement · **USER CHECKPOINT 3**
Edges/Ember/Field consume the kinetic geometry (their fills/seams follow the moving cells; their
own wave planners bypass under `power_core`). User re-runs the checkpoint-1 script in EMBER /
EDGES / FIELD. After sign-off: the six legacy transition implementations move to the museum
branch (never before).

## 3c. IMPLEMENTER HANDBOOK (written for a lower-cost follow-on model — read fully before coding)

State as of `0700e81d7`: K1 core + K2a/K2b runtime are DONE and green (93 powerCore tests + 5
runtime tests). Corridor/disconnect virtuals are OFF by default (constraints shelved) — a capture
is now ~7 ramps at 0.30ms/frame, 9× under budget. What remains: K2c wiring, K3 visuals, K4.

### Ground rules (each one is a scar from this build — do not relearn them)
1. NEVER weaken a failing assertion to make a test pass. Investigate; if unresolved, stop and
   report. Every "impossible" failure in K1 was a real design fact.
2. Do not modify `sharedEdgeGraph.ts`, `sampleKineticFrame.ts`, `buildTransitionBubble.ts`
   internals unless a test forces it — the kinetic suite IS the contract. If the diagram library
   throws "twin is null" in a NEW call path, use the existing retry pattern; do not invent jitter.
3. The ONE allowed failing test is `TerritorySettingsBridge.test.ts > reads tunables from config
   and falls back safely` (pre-existing). Anything else red = your change broke it.
4. Bun only. Commit with explicit pathspec (`git commit -- <files>`), never `-a`/`add -A`. Gate
   EVERY commit on: `bunx vitest run src/lib/territory` (only the allowed failure) +
   `bun run check` (0 errors; 1 pre-existing GameThemeManager warning OK).
5. Do not change `PERIMETER_FIELD_GEOMETRY_SOURCE` default (0319) and do not re-enable
   corridor/disconnect defaults. All kinetic behavior stays behind `power_core`.
6. No raw console.log (AGENT.md §5.2) — use `$lib/utils/logger`.
7. Read `.agent/docs/game/territory/CONQUEST_ANIMATION_SPEC.md` (incl. Origin & Design History)
   and §0–§2 of this doc before coding.

### K2c — exact wiring instructions
- **Endpoint reuse:** `computePowerCoreEndpoint` (buildPowerCoreAuthoritySnapshot.ts) computes
  sites+cells; `buildPowerCoreAuthoritySnapshot` calls it. Restructure the power_core branch in
  `families/buildFamilyGeometry.ts` (buildPowerCoreRenderFamilyGeometry) so ONE endpoint
  computation feeds BOTH the snapshot assembly and the runtime commit — do not compute twice.
- **⚠ THE VERSION TRAP:** the live ownership snapshot's version is the STATIC string
  `'render-family-live'` (buildFamilyGeometry.ts:30). `KineticTransitionRuntime.commit()` dedupes
  by ownershipVersion — with the static string it would no-op forever. Key commits on a REAL
  change signal: the transition SESSION KEY (below) plus a stars-ownership fingerprint
  (`stars.map(s => s.id+':'+s.ownerId).join()` hashed). Do NOT ship 'render-family-live' into the
  runtime.
- **Identity/session:** `transitions/renderFamilyTransitionLifecycle.ts` — `transitionIdentityKey`
  (:16, `tick:starId:prevOwner:newOwner`) and `buildSessionKey` (:69). Use the session key as
  `transitionKey`; conquest events arrive on `ownership.conquestEvents` (`ConquestEvent` from
  @pax/common). Ripple origin = captured star's position (look up by `event.starId` in stars).
- **Duration (T5):** resolve via the existing tick-bound helper used by
  `fx/handlers/conquestStarOwnerTransition.ts` / `territoryTransitionHandler.ts`
  (`resolveTerritoryTransitionDurationMs`) — do not invent a constant.
- **Frame exposure:** add optional `kineticFrame?: KineticFrame` to `RenderFamilyInput`
  (families/RenderFamilyTypes.ts:51). GameCanvas: when source === 'power_core', call
  `runtime.sample(nowMs)` once per render frame and pass it through. NO family consumes it in
  K2c — zero visual change is the acceptance criterion.
- **Diagnostics:** add a `transition` category to `$lib/utils/logger` (categories object ~line 29,
  default false, style entry ~line 130 — copy the `renderer` pattern; it appears in the Logging
  settings panel automatically if the panel enumerates categories — verify). Log: commit (key,
  ramps, frozen/ring counts), settle, retarget, retry/escape warnings, cost p50/p95 every ~60
  samples. Add kinetic counters to `getBenchmarkTerritorySchedulerSnapshot` (GameCanvas ~:7294).
- **Gates:** suites+check; replay hash unchanged (`bun tools/debug/review-sim-replay-hash.ts`,
  expect `9f6dae73…9741910`); spot bench (`PAX_REVIEW_RUNS=8 PAX_REVIEW_SCENARIOS=transition
  PAX_REVIEW_MODES=cell_grid,phase_edges PAX_REVIEW_MAP_NAME="First Symmetry-6_April 17b"
  PAX_REVIEW_APP_PATH="/play?bench=1" bun tools/debug/review-release-gameplay-benchmark.ts` after
  `bun run build` in pax-fluxia/) — rows within noise of `.agent/docs/sessions/2026-07-01/artifacts/`
  aggregates; pendingAgeMax 0.

### K3a — Vector skin registration checklist
Follow how an existing mode registers, end to end (grep `grid_gradient` for the full list):
mode id in the territory mode contracts → `TerritoryArchitectureRouter.ts` (isRenderFamilySurface
list) → family class implementing the RenderFamily interface (`families/renderFamilyRegistry.ts`)
→ topbar chip (territoryModeShortcuts) → settings registry subsection (settingsRegistry
`territory_styles`). Drawing v1 (keep it dumb): one static PIXI.Graphics with all settled cells
(fill per ownerId color + stroke), redrawn only when the settled snapshot version changes; one
dynamic Graphics redrawn per frame from `kineticFrame.bubbleCells` when present. Ownership flips
at ramp q=0.5 in v1 (visible color pop mid-cell is ACCEPTED for v1); crossfade/wipe is v2, only
after the sweep itself looks right. HSLA fill/border tunables can reuse existing territory color
config helpers — do not build a new settings surface for v1.

### Checkpoints & who does what
After K2c gates pass → tell the user the OPTIONAL log-smoke line (enable `transition` category in
Settings → Developer → Logging; play; lifecycle lines appear; visuals unchanged). After K3a → send
the user the Checkpoint-1 script from §3b VERBATIM. Never claim visual correctness yourself —
the user's eyes are the gate (standing project rule).

## 4. What this kills (from the 2026-07-02 landscape brief)

OT/DY4 border transition (non-reference, regression-laden) · FrontierMorphFillMode ·
ActiveFrontFillMode · crossfade fallback · the stub PVV4 planner ("Phase 2" that never came) ·
per-family wave planning as geometry (grid wave becomes styling on kinetic geometry). The
`virtualStars` ownership-layer ghost concept is absorbed as the ramp input; `extraSites` seam
becomes the implementation point it was always meant to be.
