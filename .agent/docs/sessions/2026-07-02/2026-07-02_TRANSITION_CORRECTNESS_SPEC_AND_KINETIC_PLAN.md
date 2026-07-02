---
date created: 2026-07-02
last updated: 2026-07-02
last updated by: AI
relevant prior docs:
  - .agent/docs/game/territory/CONQUEST_ANIMATION_SPEC.md (user-authored intent — governs)
  - .agent/docs/game/territory/TERRITORY_TRANSITION_INVENTORY.md
  - .agent/docs/sessions/2026-06-16/2026-06-16_GEOMETRY_PIPELINE_MODEL_AND_FIX_PLAN.md (§ validated structural direction)
  - .agent/docs/sessions/2026-07-01/2026-07-01_POWERCORE_UNIFICATION_PLAN.md (P3 of the governing plan)
superseding docs:
---

# ⭐ Transition Correctness Spec + Kinetic Plan (P3, governing)

**User directive 2026-07-02:** transitions are the real hard problem; solve for ABSOLUTE
correctness. Constraints tuning is shelved. Breaking the running app is permitted.

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

## 4. What this kills (from the 2026-07-02 landscape brief)

OT/DY4 border transition (non-reference, regression-laden) · FrontierMorphFillMode ·
ActiveFrontFillMode · crossfade fallback · the stub PVV4 planner ("Phase 2" that never came) ·
per-family wave planning as geometry (grid wave becomes styling on kinetic geometry). The
`virtualStars` ownership-layer ghost concept is absorbed as the ramp input; `extraSites` seam
becomes the implementation point it was always meant to be.
