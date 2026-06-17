---
date created: 2026-06-17
last updated: 2026-06-17
last updated by: AI
type: solution formulation — candidates + recommendation (pending user GOAL CHECK)
inputs: PVV2/PVV3/PVV4 doc corpus (user-provided), 8dce88c known-good reference, dcc7 history,
  live-vs-pvv4 audit, verified code recon + 11-agent candidate workflow (verify→5 candidates→judge→adversary)
companion: 2026-06-17_TERRITORY_ARCHITECTURE_CONSOLIDATED.md, 2026-06-17_GEOMETRY_OPERATIONAL_SPEC.md
---

# Territory Solution — Candidates + Recommendation

## The decisive reframing (verified)
- **A proven-good state exists and is recoverable:** commit `8dce88c` (live at the `PRISM-ui-design`
  worktree — but marked *prunable*, so it must be stabilized/captured). Smooth fills **pinned at 3-way
  junctions and map edges**, working conquest morph with **fill/border locked together**.
- **"FG1 Adaptive Field" was a MISNOMER.** The good fills were NOT from a field/hybrid. They came purely
  from: power diagram → `extractSharedEdges` → `mergeSameOwnerCells` (greedy edge-chaining) → **identical
  Chaikin smoothing on fills AND borders** (the B-42 fix). **Junction/edge pinning is EMERGENT** from
  power-diagram distance-equilibria (no pinning parameter to mis-tune); fills can't diverge from borders
  because both chain the *same* solver edge coordinates. → strongly validates "basic PV is easy."
- **The working morph was POLYLINE-level**, not shell-level: `buildLerpedPolylines` (ownerPairKey +
  centroid match, with an orientation flip-fix), **rebuilding fills from the interpolated shared polylines
  each frame.** Star-margin (SB) was a **site WEIGHT** (pre-solve), no post-fill rewrite.
- **The topology-correspondence-first method never succeeded** (dcc7, ~104 commits; 2026-06-02:
  do-not-merge / objective-not-achieved). Its real value is diagnostics/instrumentation.
- **live-vs-pvv4 audit:** current PVV4 looked no better than live because differentiating constraints
  were *disabled* and **CX/DX moved from solve-time helper sites (proven) to post-fill rewrites
  (not equivalent)**; SB became a post-fill rewrite instead of a site weight.

## The 5 process candidates (ranked by fit to the constraints)
1. **Excavate-and-revive (PSF-EXC)** — recover 8dce88c surface + morph into the modular pipeline. *strong.*
2. **Clean minimal basic-PV core (on geometryCore/736a)** — cleanest long-term (shared curves ⇒ border/fill
   can't diverge), but bets on UNPROVEN code (post-solve constraints, greedy walk) + an off-lane port. *viable; north-star, wrong starting point.*
3. **Finish topology-correspondence-first active-front** — the most-invested, never-succeeded method;
   contradicts "start simple / don't canonize unproven." *weak — harvest its diagnostics only.*
4. **Evidence-first: locked casebook + numeric static diagnostics + minimal-border-transport, honest SNAP
   when unprovable** — the discipline the 50-attempt history lacked. *strong — the right HEDGE.*
5. **Ship 8dce88c-HY2 geometry + polyline morph, topology-first as later casebook-gated opt-in** — anchored
   entirely to the eyes-confirmed state; most faithful to what actually worked. ***BEST.***

## RECOMMENDATION
**Primary = #5 merged with #1**, with the adversary's corrections folded in. **Hedge = #4** stood up FIRST
as the shared acceptance oracle + correspondence fallback.

Core of the primary:
- **Static surface first.** Reproduce the proven steady state: power diagram, shared-edge chaining,
  identical Chaikin on fills+borders, enclave holes. Constraints **pre-solve** (CX/DX = virtual sites,
  **SB = site weight**, CL emergent), keeping master's post-solve clamp only as a *labeled fallback knob*.
- **Hard-stop Visual Gate A:** static fills must match the 8dce88c reference (sharp 3-way junctions,
  flush map edges, border exactly on fill boundary, correct enclaves) — **user sign-off before ANY
  transition work.** This hard stop is the structural cure for the 50-attempt failure pattern (everyone
  optimized the ambiguous transition before proving static correctness).
- **Then the transition**, re-aimed at the genuinely-missing piece (see adversary correction #2).

## Adversary corrections (these materially improve the plan — folded in)
1. **Reuse, don't reinvent the morph.** The polyline morph already exists on master in **three evolved
   copies** — `layers/transition/interpolatePolylines.ts` `matchPolylinesByKey` (registry-wired),
   `renderers/geometry/borderTransition.ts` `matchPolylines` (endpoint-aware — *better* than 8dce88c's
   pure centroid), and a **star-ID-overlap matcher** (≈ the "discontiguous-island fix" the plan thought
   needed authoring). Porting from 8dce88c would reinvent existing, more-evolved code (the exact
   complexity-bias to avoid). 8dce88c becomes the *reference for the fill-rebuild step only*.
2. **The real missing mechanism is per-frame FILL reconstruction from the interpolated shared polylines.**
   All three master morphs interpolate *borders only*; none rebuilds fills. That — not the matcher — is
   what 8dce88c had and master lacks. Make it the explicit, tested deliverable of the transition phase.
3. **`rope_morph` pre-mortem.** A registry-wired border-transition mode `rope_morph` exists but its
   `sample()` is an **unfinished passthrough stub** (returns next frontiers verbatim, never touches fills)
   — a prior abandoned attempt at this exact idea. **Find out why it was abandoned before repeating it.**
4. **Stabilize the oracle FIRST.** The 8dce88c worktree (PRISM-ui-design) is *prunable*; capture reference
   screenshots in-repo / `git worktree repair` before the whole acceptance gate hinges on it.
5. **Do NOT excavate a third assembler.** The user is mid-flight reconciling two assemblers (Phase 2).
   First test whether fixing the confirmed `constructFillsFromFrontierChain` junction-walk (angular-ordered
   walk) makes the **existing** master assembler match 8dce88c at Gate A. Excavate the monolith only if
   that fails. Keep the work inside the in-progress reconciliation, not orthogonal to it.
6. **Tighten the star-ID matcher** — its greedy best-overlap-first is the same greedy family as the
   failing junction walk; add a discontiguous-island casebook case before trusting it; route failures to
   honest SNAP.
7. **Answer the GOAL CHECK before any code** (below) — it gates the whole plan.

## Competing hypotheses (resolved only by building + looking)
- **H1:** the remembered-good look was fully caused by the power-diagram + shared-edge + identical-Chaikin
  mechanism (not a specific settings combo). Gate A decides; if it misses, do a *settings* excavation
  before blaming the mechanism.
- **H2:** SB as pre-solve site-weight is sufficient on today's maps — vs needing per-star clamping against
  world-edge/enemy distance. A/B on the same map; keep the post-solve clamp as a labeled fallback.
- **H3 (biggest):** centroid/ownerPair + star-ID matching is good enough — vs correspondence breaks on
  discontiguous/island conquests. If it breaks, fall to hedge #4's section-transport + SNAP, **not** the
  topology-first planner. (Note: master already moved past *pure* centroid to endpoint-aware + star-ID.)
- **H4:** greedy 2dp edge-chaining holds at game zoom — vs needing the angular-ordered walk (same family
  as the failing junction bug). Test at real zoom in Gate A; don't "improve" speculatively.
- **H5 (product):** a faithful recovery satisfies the *goal*, not just the look — vs being judged "just the
  old thing" lacking the newer semantics. → the GOAL CHECK.

## Sequencing (corrected)
0. Baseline the consolidation lane suite (record the 2 known failures). Stand up a fixed-seed scenario.
1. **Stabilize + capture the 8dce88c visual oracle** (screenshots in-repo; repair the worktree).
2. Build the casebook + numeric static diagnostic (fill==border, junction/edge pinning) — hedge #4, early.
3. **Try the cheap fix first:** does fixing the junction-walk (angular walk) make the *existing* assembler
   match 8dce88c? If yes, no excavation needed. If no → excavate the 8dce88c static surface into one
   self-contained PIXI-free module (SB as site weight; no post-fill rewrite).
4. **VISUAL GATE A (hard stop):** static matches reference → explicit user sign-off.
5. Visual Gate B (constraints): CX encloses corridors, DX separates; A/B SB site-weight vs post-clamp (H2).
6. Snapshot plumbing (pre-solve shared-edge/polyline snapshot; no behavior change).
7. **Transition = REUSE the existing matchers + FINISH the fill-rebuild-from-morphed-polylines** (the real
   gap); investigate/repurpose `rope_morph`; add the star-ID discontiguous fix.
8. **VISUAL GATE C (ship gate):** casebook conquests morph smoothly, fill/border locked; per-frame
   no-gap/overlap assert; any unprovable case → honest SNAP, recorded. User sign-off only.
9. Ship behind the render-family flag (no deletions). Topology-first (#3) only as per-case opt-in later.

## Decision points for the user (GOAL CHECK first)
1. **GOAL CHECK (gates everything):** Is a faithful recovery of the 8dce88c look-and-feel an acceptable
   PRODUCT to ship and build on — or do you require the newer semantics (explicit CL, topology-correct
   transitions) before it counts as done? (Baseline-to-build-on vs end-state.)
2. **Centroid/identity matching:** accept the existing endpoint-aware + star-ID matcher as the interim
   morph behind a swappable interface — or is correspondence-by-identity a hard requirement from the start?
3. **SB placement:** pre-solve site-weight first (proven), post-solve clamp as labeled fallback — agreed?
4. **CL:** emergent for v1, explicit only if a contested lane visibly fills wrong — or explicit in v1?
5. **SNAP tolerance:** honest instant SNAP (or sub-200ms crossfade) for genuine topology-change conquests
   that can't be proven gap/overlap-free — acceptable, vs smooth-everywhere (which led to silent tearing)?
