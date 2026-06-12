---
date created: 2026-06-12
last updated: 2026-06-12
last updated by: AI
relevant prior docs:
  - .agent/docs/sessions/2026-06-12/2026-06-12_worktree-consolidation-plan.md
  - .agent/docs/sessions/2026-06-12/2026-06-12_consolidation-audit-scratchpad.md
  - .agent/docs/game/territory/TERRITORY_RENDER_SYSTEM_CURRENT.md
superseding docs:
---

# 2026-06-12 — Worktree Census (Phase 1 deliverable)

First-pass audit of the seven user-prioritized worktrees plus a cursory pass on all branches. Content audits performed by read-only subagents; mechanical data verified directly via git. Merge order at the end is a PROPOSAL pending user decision.

## Priority worktree summaries

### 9f22 — codex/grid-gradient-territory-mode (43 ahead / 16 behind; clean; fresh today)

- **What:** New render family `grid_gradient` — fills territory with grid-sampled marks shrinking from centers toward frontiers. Full family implementation in `territory/families/gridGradient/` (33 files): worker-backed plan caching, GPU shader-field backend + CPU fallback, 28-29 tunables wired into settings UI (`GridGradientTuning.svelte`), registered through `territoryRenderModeCatalog` + `TerritoryArchitectureRouter` as a render-family route.
- **Status:** Feature-complete and tested (focused Vitest suites pass; `bun run build` passes on branch). Remaining known issue is conquest frame jank from SHARED geometry costs (`computeGeometry0319` on main thread, ~130ms frames) — not grid-gradient-specific. Two 2026-06-12 perf plan docs propose the fix (worker-backed geometry compile + frame budget).
- **Preserve:** `GRID_GRADIENT_MODE_2026-05-13.md` (visual contract), both 2026-06-12 perf plans, worktree handoffs, 7 post-mortems.
- **Merge:** Medium. ~3-5 manual points in GameCanvas (family registration/orchestration) + isolated config/settings merges. Family directory itself is conflict-free (new).

### 4b02 — codex/ui-hud-development (now 36 ahead / 21 behind; user committed during audit)

- **What:** Three additions. (1) `lib/components/game-hud/` (17 files) — the LIVE production HUD, bound to real game state, mounted in GameContainer, replacing HUD-package (deleted, 26 files) and parts of flat `ui/hud/`. (2) `lib/design-system/` (21 files) — Pax theme tokens + 15 primitives + Tailwind variants; consolidation foundation consumed by game-hud AND ~10 migrated settings sections. (3) `lib/aurelia-hud/` (25 files) — imported "Aurelia Drift" HUD as a DEMO-ONLY package (fake data, `/dev/aurelia-hud` route, not bound to game state) — effectively a 4th HUD codebase kept as reference.
- **Status:** Production HUD + design-system migration well advanced; remaining: more settings sections to migrate, fonts self-hosting, aurelia-hud binding decision.
- **Preserve:** `DESIGN_INTENT_HANDOFF_2026-05-13_WORKTREE_4B02.md`, `HUD_REDESIGN_IMPLEMENTATION_PLAN_2026-05-23.md`, `2026-05-23_HUD_REDESIGN_HANDOFF` (909 lines), theme system plan, geometry audit.
- **Merge:** High conflict but concentrated: GameContainer (~1959 lines changed) and GameSettingsPanel (~2052) are full rewrites vs master; 10 settings sections migrated to design-system primitives. Mostly disjoint from territory branches outside those two choke points. Post-merge cleanup candidate: master's `pax-fluxia-hud/` package becomes orphaned.

### dcc7 — codex/render-infra/pvv4-transition-bets (104 ahead / 82 behind; 34 UNCOMMITTED; last commit 2026-05-28)

- **What:** PVV4 = topology-first ACTIVE-FRONT TRANSITION strategy over existing `Geometry_0319` (not a new geometry generator). Adds semantic identity to topology contracts (`topologyKey` on Vertex/Section/RegionLoop + six topology indexes + owner colors + anchor/contributing star IDs), conquest naming, ownership event threading (conquest truth from engine events instead of frame diffs), extensive transition diagnostics (bundle serializer, overlays, TV tracing), island-collapse/moving-3V test cases.
- **Status:** Did NOT reach the working vector border transition. Its own 2026-06-02 assessment doc says the planner still relies on coordinate-stable anchors with limited split/merge (1:1, 1:2, 2:1), not the topology-first design. Branch currently fails `bun run check` (113 errors). Substantive contract/compiler work (+223 lines in `compiler_UnifiedVectorGeometry.ts`, topologyKey fields) sits UNCOMMITTED.
- **Preserve verbatim (the "deepest reasoning"):**
  - `.agent/docs/sessions/2026-05-16/2026-05-16_topological-change-process-deepening.md` (42KB — problem decomposition in plain terms)
  - `.agent/docs/sessions/2026-05-16/2026-05-16_pvv4-active-front-repair-plan.md` (26KB — blueprint with pseudocode for the topology-first rewrite)
  - `.agent/docs/sessions/2026-06-02/2026-06-02_pvv4_branch_assessment.md` (salvage guide: 8 slices)
- **Merge:** Do NOT merge wholesale. Staged port per its own assessment: docs → contract enrichment (low conflict, additive) → conquest naming → ownership event threading → diagnostics (needs import fixes) → tests; then REWRITE the planner from the 2026-05-16 design rather than porting `ActiveFrontTransition.ts` as-is. Uncommitted AGENT.md edit = formatting + one PVV4-scope discipline rule (user to keep/drop).

### 736a — codex/2026-05-06-phase-field-history-salvage (41 ahead / 36 behind; clean; last commit 2026-05-27)

- **What:** "Fresh PV geometry core" — a from-scratch modular Power-Voronoi geometry engine in `territory/geometryCore/` (~16K lines, 130 files): power diagram → edge ledger → shared-curve graph → region loops → shared smoothing, plus FOUR modular constraint families applied in sequence: SM (star margin), LP (lane-pair gate), CX (corridor), DX (disconnect seam) — each policy-gated and artifact-tracked. Adapter to `ResolvedGeometrySnapshot`, runtime mode `FreshPvGeometryCoreMode`, constraint controls UI, 254 tests passing. This IS a candidate geometry generator.
- **Status:** Honest, well-documented incompleteness: transition fragment-ancestry is stubbed (`stubInfluence`, blocks transition correspondence), no visual-parity validation vs existing PV, not selectable from the normal UI. Branch did rigorous self-audits (false-selectability post-mortem).
- **Preserve:** 4 critical docs — phase-field salvage handoff (2026-05-06), `2026-05-21_fresh-pv-geometry-core-rewrite-plan.md` (the spec), `2026-05-23_fresh-pv-plan-failure-reflection.md` (integrity guardrails), `HANDOFF_2026-05-23_PV_GEOMETRY_CORE.md` (current state).
- **Merge:** Medium conflicts (GameCanvas, game.config, settingsDefs, buildFamilyGeometry). Recommend whole-branch merge, keeping the mode non-default and badged as proof-phase. Also carries a dev Colyseus URL fix (multiplayerServerUrl resolver + tests).
- **Tension to resolve later (Phase 4/5):** master's 0319 path finalized its own geometry constraints (master commit `edfa07b4c`, 2026-05-27) — two constraint implementations for one concern will coexist until the geometry evaluation decides.

### db53 — detached @ 6ec60edf8 (0 unique commits; 23 UNCOMMITTED files = entire value)

- **What (from diffs):** Render-family input contract sprint addressing the 2026-05-13 fill/border pixelation + conquest-stutter post-mortem: `RenderFamilyInputContract` (map-space vs presentation-space provenance + version tracking), `RenderFamilyTransitionPrelude` (prewarm plans before transitions fire), worker-thread planning for both `MetaballGridPhaseEdgesFamily` (+182) and `MetaballGridPhaseFieldFamily` (+476), new `territoryRenderFamilyBridge.ts` + two substantial untracked test files (12KB + 16KB), stage-ladder presentation localization.
- **Status:** ~40-50% complete; coherent design, interrupted mid-integration — bridge payload built in GameCanvas but not wired into family construction; worker type defs possibly missing; master has since stripped telemetry from `buildRenderFamilyInput.ts` (incompatibility).
- **RISK:** This work exists ONLY as an uncommitted working tree on a detached HEAD. One wrong checkout destroys it. **Action proposed: snapshot to a rescue branch immediately (non-destructive).**
- **Verdict:** Salvage-worthy architecture (contract/prelude/worker planning aligns with family-migration direction); est. 3-5h integration after the family-heavy merges land.

### f76c — codex/render-infra/territory-semantic-audit (0 ahead; FULLY MERGED)

- Semantic rename (canonical → resolved, pvCanonical → pvFrontline), GameCanvas render-family disposal lifecycle fix, DistanceField cache split. Verified surviving in current master (mode file, pvFrontline folder, `disposeAllRenderFamilies()` present). Nothing to merge; worktree retireable (user decision, not now).

### c6dd — codex/2026-04-30-phase-edges-catchup (2 ahead / 54 behind)

- Earlier phase-edges work was merged (as Ember Lattice reconcile). The 2 remaining commits are genuinely unmerged and load-bearing:
  - `794abd8cc` "Normalize retired territory runtime mode ids" — mode-ID normalization + backward-compat mapping for renamed fill-transition modes (+ `TerritoryConfigNormalizer.test.ts`, 31 cases). Implements exactly the rename direction in TERRITORY_RENDER_SYSTEM_CURRENT.md §10; without it old saved settings can map to wrong modes.
  - `5644c4504` — runtime handoff docs.
- **Verdict: cherry-pick both.** Low conflict; post-pick run the two test files.

## Proposed merge order (PENDING USER APPROVAL)

| Step | Action | Rationale |
|------|--------|-----------|
| 0a | **Rescue db53**: create branch (e.g. `rescue/db53-render-family-contract`) + commit the 23 files as-is | Unprotected work; non-destructive; blocks nothing |
| 0b | **Protect dcc7 uncommitted**: commit the 34 files on its own branch (contract enrichment is substantive) | Same risk class |
| 1 | Cherry-pick c6dd's `794abd8cc` + `5644c4504` | Small, load-bearing, low conflict |
| 2 | Merge 9f22 (grid gradient) | Fresh, self-contained family, medium GameCanvas conflicts |
| 3 | Merge 4b02 (game-hud + design-system + aurelia-hud demo) | Big but UI-surface-concentrated; settles GameContainer/GameSettingsPanel before territory-heavy merges reuse them |
| 4 | Merge 736a (Fresh PV core) whole, mode non-default | Geometry candidate preserved with history |
| 5 | dcc7 staged port: docs → contracts → naming → ownership events → diagnostics → tests; planner rewrite later from the 2026-05-16 blueprint | Branch fails typecheck; wholesale merge rejected by its own assessment |
| 6 | Integrate db53 rescue branch (contract/prelude/worker) | Builds on post-merge family state |
| — | f76c: nothing to merge | Already in master |

Per-merge gate (every step): `bun run build` + `bun run check` in pax-fluxia + user visual verification in the UI of the affected mode(s).

## Cursory pass — remaining branches (not in this wave unless user adds)

- **Likely future-wave candidates:** claude/goofy-raman (33 ahead, 2026-05-06), codex/phase-field-msr-boundary-fixes (28 ahead), codex/background-mode-system (10 ahead), codex/rebuild-master-from-186cbf03 (11 ahead), codex/continue-metaball-perimeter-mode (11 ahead), codex/ui-main-menu (6 ahead, April).
- **Small remainders worth a later look:** perimeter-field-metaball (7), salvage-sinking-bug (6), feat/star-data-prod (5), perimeter-field-audit (4), 1455-custom-map-editor (3), worktree-separation-architecture (1+3), metaball-grid-transition-edge-shaping (2), metaball-radical-opt (2), audience-facade (2), viewport-background-edge-fix (1).
- **Fully merged (0 ahead):** territory-semantic-audit, frontier-fx-doc-reconcile, ember-lattice-reconcile, goofy-raman-integration, map-editor-1de4-integration, master-pre-perf-merge, perimeter-11a1-integration, territory-clean-arch, ui-settings-audience-facade-integration, worktree-4b02-docs-merge, antigravity-pvv3-smoothing, dev, feat/landing-page-redesign, feat/wire-up-modified-voronoi. Archive/prune candidates AFTER consolidation succeeds — no deletions now.
- **Historical (Feb-Mar, 400-1900 behind):** live, feat/pax-fluxia-ui-design, codex/territory-active, antigravity/pvv3-fg2-integration, entire/checkpoints/v1.

## Open questions for the user

1. **db53 + dcc7 uncommitted protection (step 0):** OK to create rescue branches and commit as-is? (Non-destructive; preserves exact state.)
2. **Merge order:** approve/adjust the table above? In particular 9f22-before-4b02 or reverse.
3. **aurelia-hud:** keep as demo/reference package, or plan to bind it to real state? (game-hud is currently the live HUD.)
4. **dcc7 AGENT.md uncommitted edit** (adds a PVV4-scope discipline rule): keep or drop?
5. **Second wave:** which of goofy-raman / msr-boundary-fixes / background-mode-system / rebuild-from-186cbf03 / ui-main-menu join the merge set?
