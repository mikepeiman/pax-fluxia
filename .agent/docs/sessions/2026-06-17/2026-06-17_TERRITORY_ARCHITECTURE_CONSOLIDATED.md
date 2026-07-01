---
date created: 2026-06-17
last updated: 2026-06-17
last updated by: AI
type: consolidated architecture reference (current best understanding — NOT a permanence claim)
status: consolidates render-family plan (2026-04-08) + v7 recovery plan + canonical-frontier/border-fill
  plan + F-138 ground-truth + dcc7 transition design + verified current-state trace + Fresh PV core read
supersedes for the architecture picture: scattered prior docs; reconcile with prior governing doc
  .agent/docs/game/territory/TERRITORY_RENDER_SYSTEM_CURRENT.md
companion: 2026-06-17_GEOMETRY_OPERATIONAL_SPEC.md (granular 21-step geometry pipeline)
---

# Territory Rendering & Geometry — Consolidated Architecture

> Term caution: this is the **current consolidated** picture, the best correct/complete understanding
> as of 2026-06-17 — not a frozen authority. Update as evidence changes.

Sources mined (verified): render-family plan `plans/2026-04-08/{territory-rendering-overview,
TERRITORY_RENDER_FAMILY_UNIFIED_PLAN}.md`; v7 `sessions/2026-05-05/...recovery-plan_v7.md`;
canonical-frontier/border-fill `_archive/territory-recovery-2026-03-08/*` +
`_archive/diagnostics/border-fill-mismatch/*`; F-138 `_archive/F-138-ModifiedVoronoi/*`; dcc7 transition
design (user feedback, 2026-06); verified current-state trace (`2026-06-16_GEOMETRY_ENGINE_DECISION...`);
Fresh PV core `geometryCore/` (736a).

---

## 1. Two-tier Render Family model (supersedes the universal 4-stage pipeline)

The universal **4-layer linear pipeline** (Ownership → Geometry → Transition → Presentation) was
**retired as a universal contract** (decision 2026-04-08): it fits only the *vector-polygon → polyline
morph → draw* paradigm and is structurally incompatible with GPU distance fields, metaball grids, and
shader-native transitions.

- **Tier 1 (shared, runtime-level):** the **OwnershipSnapshot** (single source of truth), the
  **runtime transition clock** (families receive `activeTransition.progress`), and **VFX** emitted from
  ownership diffs.
- **Tier 2 (per active family):** a `RenderFamily` owns its **geometry + transition + presentation**
  internally and returns a `PIXI.Container`. Interface (normative): `update(RenderFamilyInput) →
  RenderFamilyOutput`, `dispose()`, `tunableKeys`.
- The old 4-layer stack survives **only as VectorPolygonFamily's internal implementation**.
- **Sacrosanct:** ownership as shared truth; `FrontierTopologyContracts` as a *library* (not a mandatory
  global stage); PIXI only at the edge.

---

## 2. THE key reconciliation — shared vector geometry vs field-native geometry

"A family owns its geometry" does **NOT** mean every family invents its own geometry. Split families by
paradigm:

- **Vector-presentation families** — Perimeter, Metaball, Grid, Edges, Ember, Field, Grad, and PVV.
  These should **all consume ONE shared vector geometry** (regions + frontier curves + topology) and
  differ **only in presentation** (how they paint/animate it). *This is the "one generator across render
  modes" the user expects — and it is correct, for the vector families.*
- **Field-native family** — DistanceField (GPU Dijkstra). Genuinely owns its own geometry; the 4-stage
  does not apply. (Strongest track record per the audit; must stay family-internal.)

**⇒ Tier-1 "shared" therefore includes ONE shared vector-geometry core feeding all vector families.**

### Current reality is the bug (verified trace)
Today the vector families do **NOT** share one geometry:
- **PVV4** (`power_voronoi`, steady) runs the **legacy** `generateVoronoiTerritoryGeometry`
  (`PowerVoronoiRenderer.ts:1320`) — a *different generator*. ← dominant cause of PVV4 diverging.
- **The 7 families** run `computeGeometry0319` + `buildPowerVoronoi0319AuthoritySnapshot` and **share one
  cached snapshot** (`GameCanvas.svelte:2810`) → they are *geometrically identical*; differences among
  them are paint, not geometry.
- **unified_vector / power_voronoi_mode** run `computeGeometry0319` + `compileVectorGeometry` (a *second
  assembler*, no constraint alignment) with a *different config source*.
- **3 config sources** (`GAME_CONFIG` vs `input.tunables` vs engine `stageConfig`) → different sites →
  different diagrams.

**Fix:** converge ALL vector families onto ONE shared geometry core; route PVV4 through it; retire the
second assembler + duplicate configs.

---

## 3. The shared vector geometry core (the IDEAL) = Fresh PV shell + v7 constraint model

**Shell** (Fresh PV core `geometryCore/` — architecture validated correct): `sites → power diagram →
edge ledger (each border once, both owners) → shared-curve graph → constraints → smoothing → region
loops (referencing the shared curves) → snapshot`. Granular 21 steps: see the operational-spec companion.

**The decisive invariant:** region fills reference the **same curve objects** that draw the borders
(`PvRegionLoop.curveRefs`) ⇒ **border/fill cannot diverge, and neither can two families.** This realizes
F-138's *"Idea 3: Unified Boundary Edge Graph"* (single-source-of-truth edges) — the documented fix for
the gap/mismatch class the user is seeing.

**Fresh PV's two defects to fix on adoption** (read directly): (A) `buildRegionLoops.walkSingleLoop`
uses a **greedy** walk, not angular-order → junction errors; (B) `loopId` is **centroid-based** → use the
`starIds` set it already computes.

---

## 4. The constraints (current terms) — placement (pre- vs post-PV) is an OPEN, untested question

Baseline principle (v7): *plain power-Voronoi is already most of the answer; keep the majority of the
border exactly as plain PV produces it; apply constraints only where needed.* Five controls, in **two
phases**:

| Constraint | Phase | Operation |
|---|---|---|
| **starWeight** | PRE-solve (input) | base site weight per star. *This is the control currently mislabeled `starMargin`.* NOT MSR. |
| **CX** (same-owner corridor) | **PRE-solve** | place helper sites along same-owner lanes so the owner's territory stays connected along the lane. |
| **LP** (contested lane pair) | **PRE-solve** | place paired helper sites on opposite sides of a contested (two-owner) lane so the two owners meet mid-lane and no third owner intrudes. |
| **DX** (disconnect) | POST-solve | for non-laned same-owner pairs whose midpoint is still self-owned, **subtract** a disconnect shape (depth/halfWidth factors) so no misleading corridor. |
| **MSR** (min star range) | POST-solve | a keep-out **circle** per star; where a border enters it, **rewrite** the section as entry → outside-apex → exit curve. KEEP-OUT rule, distinct from starWeight. |

**Pipeline order (v7):** `starWeight + CX + LP → PV solve → merge → DX subtract → MSR rewrite →
topology/sections → transition → presentation`.

**Two candidate placements — both UNTESTED; neither is correct or erroneous.** No territory approach has
succeeded yet, so these are hypotheses to build and compare, not settled truth:
- **(A) baked into the PV solve** — CX/CL as pre-solve helper sites (and SB possibly via site weight) so
  the diagram itself produces the corridor / mid-lane meeting and most of the border stays exactly
  plain-PV. (The v7 leaning.)
- **(B) post-PV** — compute plain PV, then edit the shared-curve graph to apply the constraints directly
  (exact SB push, DX subtraction, etc.). (The Fresh PV leaning — it currently applies all four post-solve.)
The likely answer is **per-constraint** and must be found by implementing both and judging visually.

**Current terms (supersede prior):** **CX** corridor extension · **CL** contested lane (was LP) · **SB**
star buffer (was MSR) · **DX** disconnected-region exclusion; plus border smoothing + junction treatment.
`starWeight` is a plain-PV site-weight input, not one of the four. (The table above still uses the old
LP/MSR labels pending a full terms pass.)

---

## 5. Border/fill single-source-of-truth — the invariant that kills the user's bug

Borders and fills MUST derive from **one** frontier geometry, so they cannot drift. Documented causes of
the mismatch the user keeps hitting, each with its fix:
1. **Per-polygon independent vertex edits** break the Voronoi tiling guarantee (F-138 ground truth: the
   Voronoi tiles perfectly; *the pipeline's own modifications open the gaps*). Fix = shared-edge/curve
   graph: both sides of a border are one object, moved once. (Fresh PV does this.)
2. **Dual rendering**: a diagnostic/native stage (`executeFG2StageRender`) drawing borders *on top of*
   the canvas renderer → two different geometries on screen. Fix = gate/disable the duplicate stage.
3. **PIXI v8 fill()-vs-stroke() triangulation drift (bug B-42)**: identical vertices triangulated
   slightly differently for fill vs stroke. Fix (if it persists after vertex alignment) = collapse to a
   single `graphics.poly(v).fill().stroke()`.

**Enforce planarity as an invariant, not a vibe:** at `t ∈ {0, 0.5, 1}` assert the frontier is a valid
planar partition — no self-intersection, every region closed, every shared edge single-sourced. This is
the gate that turns "correct in every case" from aspiration into something testable.

---

## 6. The transition model (topology-correspondence-first) — VectorPolygonFamily only

The currently-implemented planner is **coordinate-anchor-first**, which is the **root flaw**. The
**correct** method is **topology-correspondence-first**.

**The 7 nuanced issues (current planner):** (1) identity by coordinate-key, not topology (EPS misused for
identity when its only valid job is classification *after* identity); (2) lost moving 3-way junctions
(same junction that *moved* gets dropped → borders tear at the hardest points); (3) non-exhaustive branch
walk (first sorted section at a junction → wrong path at a 3V); (4) anchor pair treated as a complete plan
(skips PRE→POST *section* matching); (5) cardinality too narrow (only 1:1/1:2/2:1; real conquests need
1:M/M:1/M:N); (6) TVs sampled before correspondence exists; (7) silent repair converts unproven
correspondence into animation (a visual lie).

**The fix (endorsed):** region correspondence (owner + real-star membership) → topology correspondence
**by identity** → EPS only now to **classify** moved/unmoved → seed from real changes →
**branch-exhaustive** outward walk to find Change Anchors → active-front components → PRE↔POST **section**
matching (1:1 / 1:M / M:1 / M:N) → TVs **last** → replace exactly the planned sections → if unprovable,
**freeze with a named defect, never repair.**

**Better ideas (endorsed):**
- **Region-identity key = sorted incident region IDs** (owner + real-star-membership hash), not
  owner/color — survives motion AND disambiguates two different `{A,B,C}` junctions.
- **Prove planarity as an invariant** (see §5) — the mechanism that makes "every case" enforceable.
- **"Snap beats deformation" as a measured per-component bound** (max TV travel vs section length, or
  Fréchet vs naïve) → exceed it ⇒ snap *that component*, not the whole frame.
- **Do not ship a third pattern.** Master already has `pvFrontline/` (planner/sampler/contracts); dcc7's
  `ActiveFrontTransition` is a parallel, more-rigorous attempt at the same job. **Fold dcc7's
  correspondence-first planner into master's `pvFrontline` contract** (AGENT.md §5.5) — the real
  reconciliation, above any file merge.

**Locked terms:** PRE/POST; region (one connected body, one owner); **frontier section** (one stored
border piece between two topology vertices — *exists once*, not duplicated per owner); topology vertex;
**3V** (≥3 regions meet); stable/shared topology vertex (same ID + kind + within-EPS in PRE & POST);
**Change Anchor** (first diverging coordinate from each end — NOT a junction concept); chain; **active
front** (the moving portion); **TV** (sampled point that moves PRE→POST); owner-pair key; section
influence.

**Diagnostics freeze doctrine:** there is **no valid "snap class"** in the target design. An
unclassifiable boundary is a *defect*; diagnostics mode **freezes** on it and labels how the engine
currently understands regions/boundaries — it never fakes an animation.

**Non-negotiable (vector family):** unchanged borders must not jitter; conquest = smooth morph (not
crossfade/teleport); **frontiers MOVE, they don't appear/disappear**; one active front per conquest,
bounded by change anchors.

---

## 7. Current reality & known degradations (verified)

- 2 generators + 2 assemblers + 3 configs + caching asymmetry (§2).
- My **Phase-A** change (angular-order junction walk, `597305b46`) is on **every** `computeGeometry0319`
  family path; it shifts loop selection at ≥3-way junctions → changed real-map regions/borders, unverified
  visually → plausibly part of the "worse on some maps" the user reported. Candidate revert.
- Phase-1 (region-identity shared module, `874cdae36`) is shape-neutral and aligned with the target.

---

## 8. Decision status & the path

- **Fresh PV = the right SHELL** (user-provisional). To become the shared vector geometry core it must:
  (a) **realign constraints to v7** (CX/LP pre-solve helper sites; MSR entry→apex→exit; starWeight≠MSR);
  (b) fix its 2 defects (angular walk; star-set loopId); (c) be the ONE geometry for all vector families;
  (d) route PVV4 through it (retire legacy generator + 2nd assembler + duplicate configs);
  (e) enforce the planarity invariant (§5).
- **Transitions:** fold dcc7's correspondence-first planner into `pvFrontline` (§6) — *after* geometry is
  one source of truth (its prerequisites: stable real-star region identity + single shared frontier).
- **DistanceField** stays a separate field-native family.

## 9. Open questions
1. Revert Phase-A to baseline before core-first work? (recommend yes)
2. Confirm v7 constraint placement (CX/LP pre-solve) is still the intended design vs Fresh PV's post-solve
   — this is the biggest geometry-correctness fork.
3. Exact PVV4 → shared-core routing (engine already does it for `new_frontiers_0319`; plain
   `power_voronoi` omits `precomputedGeometry`).
4. Is `TERRITORY_RENDER_SYSTEM_CURRENT.md` still authoritative, or does this doc supersede it?
5. DistanceField: revive as a first-class family now, or after the vector core is unified?
