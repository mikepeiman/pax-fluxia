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

## 2026-07-01

### Open
- [ ] **⭐ POWERCORE UNIFICATION (governing plan — USER-APPROVED 2026-07-01)** `[territory][direction]` —
  perfect a single PV core (PowerCore); grid-lattice looks (Edges/Ember/Phase) re-based as skins on
  it, NOT abandoned. Plan: [POWERCORE_UNIFICATION_PLAN](sessions/2026-07-01/2026-07-01_POWERCORE_UNIFICATION_PLAN.md).
  Supersedes recovery L3–L6. Absorbs tasks #4/#8/#10/#11 + settings remainder of #9.
  - [ ] P0: delete dead PRESENTATION_SMOOTHNESS_FIRST false-branches (keep instrument); gate: hash + pending 0.
  - [ ] P1: PowerCore correctness + adapter to ResolvedGeometrySnapshot; gate: invariant tests + USER visual sign-off.
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
