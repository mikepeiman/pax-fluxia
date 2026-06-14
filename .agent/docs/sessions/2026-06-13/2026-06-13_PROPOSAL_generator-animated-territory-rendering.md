---
date created: 2026-06-13
last updated: 2026-06-13
last updated by: AI
relevant prior docs:
  - .agent/docs/sessions/2026-06-13/2026-06-13_RENDERING_CONSOLIDATION_9f22_dcc7_AUDIT.md
  - .codex/worktrees/dcc7 .agent/docs/sessions/2026-05-16/2026-05-16_pvv4-active-front-repair-plan.md
  - .agent/docs/game/territory/TERRITORY_ARCHITECTURE.md
superseding docs:
---

# Proposal (de novo): Generator-Animated Territory Rendering

A novel ownership → geometry → rendering architecture in which **transitions are a
property of the geometry generator, not an algorithm over polygons**. Written as the
Rendering Mode Master, grounded in the current pipeline, the dcc7 transition analysis, and
the live perf work.

Terms defined here (no undefined private terms):
- **Site**: a star acting as a generator input (position + weight + owner).
- **Claim** `c ∈ [0,1]`: a per-site scalar transition state. Steady state it is binary
  (the site fully belongs to its owner). During a conquest it ramps old-owner→new-owner.
- **Influence field** `F(p)`: a scalar/vector field over the world that, for every point,
  yields the dominant owner and a signed margin to the nearest competing owner.
- **Kernel**: the metric that turns sites into the field (power distance, additive-weighted,
  metaball/Gaussian sum, …). The kernel choice is what a "render family" really is.
- **Frontier / 3V / region**: as in the existing glossary (border line / ≥3-region meeting
  point / connected one-owner area).

---

## 1. The core thesis

Transitions are hard today because the pipeline computes geometry **A** (PRE) and geometry
**B** (POST) as two independent outputs, then must **match** them — which PRE edge becomes
which POST edge, which junction moved where — before it can animate. Matching two arbitrary
planar subdivisions is the correspondence problem, and it is the entire source of dcc7's
pain: change-anchor discovery, branch-exhaustive walks, moving-3V loss, `M:N` split cases,
silent repair paths, false collapses.

But the geometry is **not** arbitrary. It is *generated* from sites + weights + ownership by
a deterministic kernel. Two geometries that differ only because one star changed owner are
not "two arbitrary partitions" — they are **the same generator with one parameter changed.**

> **Thesis: interpolate the generator's inputs, then re-derive geometry. Do not correspond
> the outputs.** If the inputs move continuously, the generated partition moves continuously
> and stays valid at every instant — so there is nothing to match.

This is why your existing *field* modes (metaball / distance-field / phase-field) already
transition smoothly, while the *vector* modes (power-Voronoi polylines) struggle: the field
modes animate a field and re-threshold it; the vector modes animate polygons and must
correspond them. The proposal generalizes the field insight to give the **vector** modes the
same correct-by-construction transitions **without losing crisp exact borders at rest.**

---

## 2. The four layers, reframed

### 2.1 Ownership + Claim — the only animated state
- Steady: each star has an owner; all claims are binary.
- Conquest: instead of a hard flip at one tick, the conquered star gets a **claim ramp**
  `c(t)` old→new over the transition (duration + easing curve = tunable). Its *effective
  generator weight* blends between the two owners as `c` moves.
- This is the **only** thing that animates. Everything downstream is a pure function of the
  current claims. Multiple simultaneous conquests = multiple ramps; no special handling.

### 2.2 Influence field — pluggable kernel
- `F(p)` = dominant owner + signed margin to nearest competitor, computed from the sites.
- Kernel is pluggable; **power distance reproduces the exact power-Voronoi diagram** the
  project already uses, so this is not a new visual — it is the same geometry expressed as a
  field. Other kernels (metaball, additive-weighted) are just other families over one pipe.
- During a conquest only the contested site's effective weight changes, so the field changes
  **only locally** (near that site). Far field is bit-identical to rest.

### 2.3 Geometry — derived from the field, two representations, one source
- **At rest**: the field's argmax boundaries *are* the power-Voronoi edges → exact crisp
  **vector** polylines + junctions, computed event-driven (only when ownership changes —
  which the perf work already makes cheap). This preserves today's sharp borders exactly.
- **During a conquest**: because only the contested weight changed, only that cell's edges
  (and its immediate neighbors') move. **Recompute just those analytic edges at the
  interpolated weight each frame** — bounded local work. Every other border is untouched,
  i.e. *unchanged borders stay pixel-stable automatically.*
- Fills and borders come from the **one** field, so they are the same boundary by
  construction: no fill/border divergence, no gaps/overlaps, a valid planar partition at
  every `t`. **This is the "100% consistent vector borders, every time, every case"
  guarantee — structural, not enforced by post-hoc checks.**

### 2.4 Transition — collapses to interpolation
Everything dcc7 had to *compute* now *emerges* from the field:

| dcc7 had to solve | Here it emerges as |
|---|---|
| change-anchor discovery | the boundary of the locally-changed field region |
| moving 3V correspondence | the equidistant point relocating continuously |
| `1:M / M:1 / M:N` splits | a cell's argmax region splitting/merging on its own |
| region collapse/birth | a cell's area crossing zero (detected, then faded) |
| minimal border transport | a *free property* (only changed weights move edges) |
| "snap vs deform" defects | impossible — the field is always a valid partition |

Correctness knobs reduce to: claim curve, duration, easing. That is the whole transition
layer.

### 2.5 Presentation — every effect is field-driven
The field hands the GPU exactly the quantities good effects want: distance-to-border, owner
gradient, per-pixel claim/conquest progress. From one consistent geometry you can render:
- crisp vector strokes (borders) + Grid-Gradient dots (size ∝ distance) + metaball fills;
- border glow / softness / animated dashes; conquest wavefront pulse (highlight where claim
  is mid-ramp); gradient or textured fills; dissolve/displacement; heat by contested margin.
All as scalar shader params over the same field → **numerous tunable effects, one geometry.**

---

## 3. Why this is better (and honest about why)

- **Correctness is structural, not algorithmic.** Validity holds by construction, so "every
  case" is true because there is no case analysis to get wrong. dcc7's defect classes
  (false collapse, over-transport, wrong-path-at-junction) cannot occur.
- **Minimal transport for free.** Only changed weights move edges; the rest is literally
  unchanged. dcc7 worked hard to *approximate* this; here it is a theorem of the metric.
- **Splits / merges / moving junctions are automatic** — no `M:N` planner.
- **Perf-aligned, not perf-opposed.** Steady frames do **zero** geometry work (event-driven,
  per the live perf slices); only active conquests cost **bounded local** work. This is the
  same direction Slices 1–2 push.
- **Huge, tunable effect surface** — a rich field is the ideal shader driver.
- **Incremental + achievable** — it is a *generalization of modes that already work*
  (field families) plus the *power-diagram code that already exists*, slotted into the
  existing 4-layer model. Not a rewrite from zero.

Intellectual honesty — this **builds on** the field idea your phase-field/metaball modes
already embody. The novel synthesis is three specific moves: (1) use **one** field as the
single source for **both** fills **and** exact vector borders (crisp at rest via analytic
extraction); (2) replace output-correspondence with **claim interpolation + local analytic
re-derivation**; (3) make the **kernel pluggable** so all families unify on one pipeline.

### Honest hard parts (not hand-waved)
1. **Local analytic recompute** needs the power-diagram code to recompute affected cells at
   *interpolated* weights. Bounded, but new code. Fallback if it proves fiddly: extract
   borders from the field by marching-squares + **snap to the exact analytic geometry at
   t=0/1** so rest stays crisp; tradeoff is contour stability mid-transition.
2. **Topology-change instant** (a cell's area → 0, a region pinches) is the one genuinely
   discrete event. It is *detected* from the field (area crossing zero), localized, and
   resolved as a **presentation fade** — not a correctness failure, but it needs an explicit
   rule so the analytic edge-set membership change is clean.
3. **Claim→weight mapping** must be calibrated so the border sweeps the contested cell at a
   perceptually even rate (a tunable transfer curve).
4. **Cost of local recompute + field sampling** per active conquest — mitigated exactly by
   the perf track (event-driven geometry, off-frame compile, typed/worker paths).

---

## 4. Migration path (achievable, staged, each stage verifiable)

1. **Claim state** in the ownership layer: per-star `c(t)` ramp; steady = binary. No visual
   change yet (claims are binary except during a conquest window).
2. **Influence-field abstraction** with the power kernel; **parity-test** that at-rest argmax
   boundaries equal today's power-Voronoi geometry (reuse the kind of parity harness from the
   Slice-2 work).
3. **Single-cell local recompute** at interpolated weight; animate one conquest. Verify
   (a) only local edges move, (b) planar validity at sampled `t ∈ {0,.25,.5,.75,1}`.
4. **Generalize** to simultaneous claims; add the **topology-change fade** rule.
5. **Route one presentation family** first — Grid Gradient, which is already field-shaped —
   to consume the field + analytic borders. Visual sign-off in the UI.
6. **Make the kernel pluggable** → other families become kernel choices on the same pipe.
7. **Retire** the correspondence-based transition machinery once parity + visual sign-off
   hold. (Per protocol: nothing deleted until success is user-verified.)

A useful property: stages 1–3 can run **behind diagnostics** alongside the current transition
path (like dcc7's dual-trace idea), comparing the field-derived borders against the existing
output before anything switches.

---

## 5. Relationship to dcc7

dcc7's deep work is not wasted under this proposal — it is **repurposed**:
- The diagnostic package / overlays / TV traces / semantic conquest naming become the
  verification surface for stages 2–5 (compare field-derived vs analytic).
- The enriched geometry/topology contracts (region identity by owner + real-star membership)
  are exactly the identity needed to label field cells and detect the topology-change instant.
- The casebook becomes the golden-fixture set for the planar-validity assertions.

What changes: the **planner** (correspondence, anchors, sections, `M:N`) is **not needed** —
its job is done by the field. That is the point of the reframing.
