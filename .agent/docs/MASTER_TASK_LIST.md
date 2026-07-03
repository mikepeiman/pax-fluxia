---
date created: 2026-07-01
last updated: 2026-07-01
last updated by: AI
relevant prior docs:
  - .agent/AGENT.md (RULE 0.5 governs this file)
superseding docs:
---

# ⭐ MASTER TASK LIST

> **This is the ONE master task list for the project (AGENT.md RULE 0.5).**
> **Purpose: prevent forgetting and loss of tasks.** Log every task, fix, idea, and instruction here
> **the moment it becomes known — BEFORE it is implemented.** Capture first; implement later. A task
> you might not touch for weeks still gets logged the instant it surfaces (even mid-other-work). This
> is a forward-looking backlog, NOT a retrospective changelog. Don't scatter task lists across ad-hoc
> docs; daily session queues (`.agent/docs/sessions/YYYY-MM-DD/`) may hold same-day detail, but the
> durable cross-day task-of-record lives here.

**Workflow**
1. **Capture immediately.** When a task/fix/idea/instruction appears — a user request, a bug you
   notice, a follow-up you realize, a "we should later…" — add it FIRST, before starting work, under
   today's `## YYYY-MM-DD` → `### Open` as `- [ ]` with a one-line title, an area tag `[area]`, and
   any link. Do this even in the middle of another task; capturing beats remembering.
2. **Then** work it. On completion, flip to `- [x]` and add the commit hash — secondary bookkeeping;
   never delete history. The capture is the point, not the checkmark.
3. Newest date on top. Missing today's heading? Create it.

---

## 2026-07-02

### Open
- [ ] **⭐ TRANSITIONS — kinetic bubble morph (P3, USER-DIRECTED FOCUS)** `[territory][transitions]` —
  governing spec: [TRANSITION_CORRECTNESS_SPEC_AND_KINETIC_PLAN](sessions/2026-07-02/2026-07-02_TRANSITION_CORRECTNESS_SPEC_AND_KINETIC_PLAN.md).
  Acceptance T1–T7 (endpoint exactness, frame validity, frozen-outside, identity+recapture
  retarget, tick-bound, determinism, ≤2ms/frame). Mechanism: diff S0/S1 by identity → freeze
  outside → kinetic mini-diagram of bubble sites with union weight ramps (ghost pair for the
  captured star; ε-ramps for appearing/vanishing virtuals) → presentation just draws geometry.
  Measured: full snapshot 41ms / diagram 17.6ms @1,929 sites → full-recompute per frame ruled out.
  - [x] K1 DONE 2026-07-02 (`5e95f63a6`): buildTransitionBubble + sampleKineticFrame, 15-test
    T-criteria suite green (93/93 powerCore total). Hard-won design facts baked into code comments:
    co-located ghost pairs are a binary switch (ownership flip = presentation WIPE, not geometry);
    weight alone can't model absence in open space; a site may lie OUTSIDE its own weighted cell
    (containment mapping invalid → cells carry sourceSiteIndex); mid-morph space contested between
    two ramping sites needs an inner FLEX ring layer rendered live (static substitution → holes);
    library degeneracies escape via deterministic sub-quantum jitter on ramped sites only.
    CAVEATS → K2: per-frame 2.6ms vs 2ms target (ring is 193 of 297 mini sites — adaptive depth is
    the lever); T4 recapture retarget is engine-level, lands in K2.
  - [x] K2a+K2b DONE 2026-07-02 (`254e38421`, `53f29625e`): endpoint extraction + KineticTransitionRuntime
    (T4 retarget continuous <5%, T5 tick-bound; 5 tests). Virtuals-off default (`0700e81d7`) collapsed
    capture cost to 7 ramps / 0.30ms per frame (budget RESOLVED, was 2.6ms).
  - [x] K2c DONE 2026-07-02 (`160461d9d` plumbing + `748f12d82` drive): logger `transition` category;
    optional RenderFamilyInput.kineticFrame + endpoint collector (no re-compute); kineticRuntimeBridge
    singleton driven from GameCanvas (commit on ownership-fp change via collector — dodges the
    render-family-live trap; per-frame sample; bench counters; reset on destroy). Gates: check 0 err;
    territory 393/394 (pre-existing only) + 5 bridge tests; replay hash unchanged. Bench confirm pending
    (default 0319 path gains only one early-returning call/frame). DEVIATION: kineticFrame sampled +
    exposed but NOT threaded into the 7 family inputs (no consumer in K2c; K3a wires the Vector skin).
  - [ ] K3a: Vector skin v1 (registration checklist in §3c) → USER CHECKPOINT 1 (script in §3b).
  - [ ] K3b: feel tunables → USER CHECKPOINT 2 = vector-transition sign-off.
  - [ ] K4: lattice modes consume kinetic geometry → USER CHECKPOINT 3; then museum-branch retirement.

### Done (2026-07-02)
- [x] **Settings panel crash (blocked P1c sign-off)** `[settings][bug]` — `sec.id` null deref in the
  sectionContent snippet (Svelte 5 teardown race: snippet deriveds re-evaluate before the
  activePanel guard unmounts). All sec derefs in the panel now null-tolerant. `599362560`.

## 2026-07-01

### Open
- [ ] **⭐ POWERCORE UNIFICATION (governing plan — USER-APPROVED 2026-07-01)** `[territory][direction]` —
  perfect a single PV core (PowerCore); grid-lattice looks (Edges/Ember/Phase) re-based as skins on
  it, NOT abandoned. Plan: [POWERCORE_UNIFICATION_PLAN](sessions/2026-07-01/2026-07-01_POWERCORE_UNIFICATION_PLAN.md).
  Supersedes recovery L3–L6. Absorbs tasks #4/#8/#10/#11 + settings remainder of #9.
  - [x] P0 DONE 2026-07-01 (`08b475e87` on `claude/territory-recovery`): −519/+27 in GameCanvas;
    flag + 4 dead scheduling paths + yield/cadence cluster + 17 orphan consts deleted; instrument
    kept. Gate green: check 0 errors; tests match master; hash unchanged; spot bench == baseline;
    pending 0.
  - [ ] P1: PowerCore correctness + adapter to ResolvedGeometrySnapshot; gate: invariant tests + USER visual sign-off.
    - [x] P1a DONE 2026-07-01 (`b8e4dab87..a48181a76`, verified independently: 33/33 tests, check 0
      errors, scope respected): adapter buildPowerCellsFromSites; owner-from-half-edge left-cell tags
      (O(N²) walk deleted; pinned vs old answer); smoothSharedEdges Chaikin w/ pinned junctions;
      2-fixture invariant suite (closure, no self-intersect, edge-use parity, shuffle determinism).
      KNOWN LIMIT: negative-area hole cycles skipped → enclave maps would break the edge-use
      invariant (Phase-1 limitation, carried to P1b).
    - [x] P1b DONE 2026-07-02 (`39c42c322..b52fe8a0f`, done inline after the delegated agent stalled
      with zero commits): Stage-0 extracted + shared byte-identically; buildPowerCoreAuthoritySnapshot
      (regions with identity from the walk, deterministic junction-terminated frontier chaining,
      topology, shells); 'power_core' registered on the existing PERIMETER_FIELD_GEOMETRY_SOURCE key
      (default UNCHANGED = 0319); 5-fixture A/B parity suite. powerCore 76/76; check 0 errors.
    - [ ] **FINDING (REFINED 2026-07-02 after user challenge — original framing overstated):**
      `[territory][geometry][bug]` — 0319 drops the **contested-lane midpoint frontier**: corridor
      CONTEST virtuals share one siteId (`corridor_A_B`), and `extractSharedEdges` (generator :591)
      dedups edge sides BY siteId → the second owner's side never records → frontier dropped at the
      extraction stage. Cell-level diff proved both pipelines see IDENTICAL cells; loss is purely
      0319 extraction. Visual severity: a thin lane-corridor seam without a border — largely
      invisible in lattice modes (user correctly saw no gross violations); the px figures were
      sliver-perimeter totals, not hole sizes. Still a real defect: it is exactly the frontier the
      CX-contest feature exists to draw. PowerCore == oracle on all 5 fixtures. Pinned in
      powerCoreParity.test.ts.
    - [ ] **FIELD-mode rounding option** `[territory][render]` — user: 0319's rounding (from its
      post-hoc constraint-resolution smoothing) shows in FIELD and is preferable as an option.
      PowerCore has junction-pinned Chaikin (smoothSharedEdges) — expose/raise passes so PowerCore
      matches or exceeds 0319's rounding as a tunable.
    - [ ] **Constraints — SHELVED by user 2026-07-02 "until further notice."** `[territory][geometry]`
      Do not work constraints (MSR/CX/DX tuning, invariant specs) until the user re-opens them.
      WHEN UNSHELVED, start from the user-supplied technical guide
      (game/territory/2026-07-02_POWER_VORONOI_TECHNICAL_GUIDE.md §C): SB/MSR has a CLOSED FORM —
      inscribed radius r_i = min_j (d_ij² + w_i − w_j)/(2d_ij); guarantee via weight floor
      w_i − w_j ≥ 2ρ·d_ij − d_ij²; hidden-site guard w_j − w_i ≤ d_ij². No iteration, no post-hoc
      repair. Also there: CX capsule-union tradeoffs, CL Delaunay-adjacency, DX union-find,
      area-targeted weights (Aurenhammer–Hoffmann–Aronov), and a contested-band "who is winning"
      readout (band width ∝ |d₁ − d/2|) worth stealing for gameplay legibility.
      CORRECTION on record: constraints tuning was NEVER the source of fill/border divergence
      (documented cause: greedy junction walk + per-polygon vertex edits). Focus order set by user:
      (1) absolute geometry correctness (PV/PowerCore — largely done), (2) **absolute correctness
      of TRANSITIONS — the real hard problem** (= P3, now elevated).
    - [ ] P1c: A/B on acceptance map `First Symmetry-6_April 17b` + USER visual sign-off (the gate).
      To view PowerCore live: settings key `PERIMETER_FIELD_GEOMETRY_SOURCE` = `power_core`
      (0319 remains default until sign-off).
      REFINED 2026-07-02 (user caught it): the toggle reaches ONLY the render-family seam —
      live in Ember/Edges/Phase Field/Grid Gradient/Cell Grid (RenderFamilyInput.geometry).
      **PVV4-runtime is a THIRD separate assembler** (TerritoryEngineController→TerritoryCompiler
      metric/frontier/region stages — does NOT consume the shared power diagram at all), so PVV4
      showed no change. PV-look A/B therefore = build the **Vector skin** (render PowerCore's
      snapshot directly: crisp fills+borders, selectable mode) rather than wiring the toggle into
      the legacy PVV4 engine. This starts P4's Vector skin early; PVV4 retires against it later.
    - [ ] Vector skin (PowerCore-native PV look) `[territory][render]` — minimal presentation of
      ResolvedGeometrySnapshot (region fills + frontier/world borders, HSLA + width tunables),
      registered as a selectable mode for A/B vs PVV4. IN PROGRESS 2026-07-02.
  - [ ] P2: local/incremental capture updates; gate: per-capture geometry p95 ≤ 2ms.
  - [ ] P3: one transition system (exact identity; two-stage; never stale); gate: pending 0, capture-tick p95 ≤ 16.7ms.
  - [ ] P4: skins (Vector + Lattice via region-mask/SDF shader); per-skin USER sign-off; legacy → museum branch.
  - [ ] P5: hero-skin acceptance matrix + Frontier FX/smooth-fill inside Lattice skin.
- [ ] **Territory overnight-integration RECOVERY / merge-in** `[territory][perf]` — start from
  latest master; two-stage presentation (immediate correct ownership; deadline-bounded fancy
  transition; skip if late). Plan + full evidence:
  [recovery plan](sessions/2026-07-01/2026-07-01_TERRITORY_OVERNIGHT_INTEGRATION_REVIEW_SYNTHESIS_AND_RECOVERY_PLAN.md).
  IN PROGRESS (started 2026-07-01). NOTE: do NOT merge `codex/territory-overnight-integration` wholesale.
  Working branch: `claude/territory-recovery` (worktree `.claude/worktrees/territory-recovery`).
  - [x] L1 DONE 2026-07-01: branch `claude/territory-recovery`; harness ported (`0d019ca0a`);
    replay hash == review reference `9f6dae73…9741910` (rules intact); review-worktree aggregates
    preserved (`d3349cbb5`); full 32-row baseline captured + distilled (`f2fdf1c72`).
    Baseline verdict: pending-display 0 everywhere; PV/perimeter/metaball/phase_field at refresh;
    cell_grid transition p95 25ms; phase_edges p50 25ms + ember p50 33ms in ALL scenarios
    (structural); grid_gradient p50 ~100ms (unusable).
  - [ ] L2: remove delayed/stale display. REFINED 2026-07-01: `d2ac9d771a`/`4c847ca20` are NOT on
    master — but master carries the OLDER flag-gated machinery they extended
    (`PRESENTATION_SMOOTHNESS_FIRST = true` hardcoded at GameCanvas.svelte:314 since `d4b57a7ca`
    2026-04-28; 8 gate sites; dead `false` branches = scheduler-background / message-channel /
    timeout / delay-timeout paths). L2 = delete the dead delayed-display branches + the flag
    (bias-to-less-code; the overnight effort proved the hazard by re-enabling them), KEEP the
    pending-age/commit-lag/scheduleMode instrument. Gate unchanged: pending 0/budget, hash
    unchanged, non-blank screenshots.
  - [ ] L3: split Phase Edges / Ember / Phase Field transition setup off the visible path.
  - [ ] L4: mode-switch acceptance (pending-display 0/budget all modes).
  - [ ] L5: Power Voronoi runtime mode-switch p95 open check (unproven; may be noise).
  - [ ] L6: keep-set cherry-pick (exact transition identity; plain Cell-Grid fill/border split; geometry tests).
- [ ] **Frontier FX — smooth-fill integration** `[territory][render]` (task #11) — FX is a per-cell
  field baked into jagged quad fills (`fx.ts` + `CellGridFamily.ts:2839` / `CellGridPhaseEdgesFamily.ts:4294`);
  it must follow the LINEAR phase-sampled smooth frontier so glow blends with border/fill. Deep
  render-integration; **gated on live visual verification** (user runs dev server). Deferred by user
  on 2026-07-01 in favor of the tranche processing.
- [ ] **Gameplay buttery-smooth: 60fps floor / 144 ideal** `[perf]` (task #8) — now informed by the
  recovery plan (stale-display removal + Phase/Ember transition-cost split are prerequisites).
- [ ] **Geometry correctness — new engine from first principles** `[territory][geometry]` (task #4, in progress) — PowerCore engine; see memory `powercore-geometry-engine`.
- [ ] **Smooth cell-fill edges to match borders (EDGES/EMBER/FIELD)** `[territory][render]` (task #10) — FIELD raster family still not smooth per memory `smooth-fill-needs-linear-phase-sampling`.

### Done (2026-07-01)
- [x] **Colyseus matchmaking 404** `[net]` — `/matchmake/joinOrCreate/lobby` hit the SvelteKit
  origin `[::1]:1420`; broadened loopback detection (localhost/127.0.0.1/::1/[::1]) so `SERVER_URL`
  uses the `:2567` dev server. Commit `b45da330c`. (Needs page reload; Colyseus must run on :2567.)
- [x] **Preserve territory overnight-integration review tranche** `[docs]` — 28 review docs copied
  verbatim into `.agent/docs/sessions/2026-06-29/`; synthesized into the recovery plan above.
- [x] **Establish MASTER_TASK_LIST + AGENT.md RULE 0.5** `[process]`.
- [x] **README full rewrite** `[docs]` — grounded in real mechanics; removed the "V4 Symmetric
  Damage Model" cruft, stale `.atlas/`/`server/` paths, and wrong clone URL (`pax-galaxia-redux`
  → `pax-fluxia`). Foregrounds the living-frontier territory rendering (render families +
  4-layer pipeline), the tuning/theme surface, star types + portal stars, the shared deterministic
  engine, and a real roadmap. Combat correctly described as remote symmetric attrition (ships hold;
  only reinforcements move) — the exact point the old README got backwards.

### Done (settings overhaul — 2026-06-30 → 2026-07-01)
- [x] Settings surface audit doc `[settings]` — `.agent/docs/game/design/2026-06-29_SETTINGS_SURFACE_AUDIT.md`.
- [x] TIER-A cleanup: Preset Rows killed, dead `{#if false}`, dead gates, ghost key `c5b94d637`.
- [x] Render-mode unification: one **Render** section with per-mode subsection chips + live-mode
  default/highlight; phase_field double-source killed; metaball folded in `1f0f6dfa4` `d14f58925` `1b9b4c456`.
- [x] Render Mode selector → topbar `d940b3359`; search 1.5s glow + coverage `3a5f03b6d`.
- [x] Ships (12 chips) + Audio (3 chips) subsection division `7f0e8339a` `40fd17652`.
- [x] `ORBIT_DENSITY` de-inverted → "Ship Spacing" `e8a42c6d7`; `ARROW_LENGTH_FRACTION`→`ARROW_LENGTH`
  moved to Visuals (+79 theme presets) `7574f7827`; `AGGRESSOR_ADVANTAGE` kept in Battle; End Settle
  wired; inert "Cell Grid Enabled" removed `ad139f5e7`.
- [x] Cross-category sweep (dead components, single-item chips, CategoryThemeBar) `22a3b7687` `28661c120`.
- [x] Dirty-tree resolved + `.claude/worktrees` gitignored `881179e03`.

### Deferred / needs user decision (from settings audit)
- [ ] Same-key conflict resolutions were applied; larger over-long splits beyond Ships/Audio (e.g.
  Diagnostics mode-diagnostics ~330 read-only lines) — assess if further division wanted `[settings]`.
