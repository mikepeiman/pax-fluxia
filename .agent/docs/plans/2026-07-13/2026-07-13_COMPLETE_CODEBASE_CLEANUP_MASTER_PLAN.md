---
date: 2026-07-13
status: PLAN — staged, approval-gated; no stage executes without user go
author: opus-territory
sources:
  - 2026-07-08 architecture audit findings (MASTER_TASK_LIST.md:461-467 — no standalone doc exists)
  - 2026-07-04 RENDER_QUARANTINE_PLAN (keep-set confirmed; Stage A settings strip executed)
  - 2026-07-13 fresh verification sweeps (3 parallel agents; evidence below)
---

# Complete codebase cleanup — master plan

**Doctrine (user rules, binding):**
- **Consolidate before deleting.** Nothing is removed until its replacement is consolidated AND the user has verified success live. Quarantine = move, not delete.
- **Maximalism.** Each stage does the BEST version of its job, not the least disruptive. No "hiding-layer" fixes; remove root duplication.
- **Plan-first per stage.** Each stage below gets its own short execution plan + user approval before edits.
- **One commit per stage, push immediately, gates between.** Verification = tests + `bun run check` + replay-hash where presentation-only + user's eyes for anything visual.
- **Question whether it should exist.** Every file touched gets the existence challenge, not just a tidy-up.

## Verified current-state evidence (2026-07-13 sweeps)

### E1 — Duplication + layering (audit claims re-verified)
<!-- SWEEP-1 -->

### E2 — Legacy render-mode surface
<!-- SWEEP-2 -->

### E3 — God-file + temporary scaffolding
<!-- SWEEP-3 -->

## Stages (dependency-ordered)

### Stage 0 — Baseline freeze (no code changes)
Capture the safety net every later stage is judged against: full territory suite run recorded,
`bun run check` clean, replay hash captured on a fixture capture, current LOC inventory (from E3).
**Gate:** all green, numbers recorded in this doc. **Risk: none.**

### Stage 1 — Geometry kernel consolidation (consolidation FIRST, per doctrine)
Fold the duplicate primitive implementations (Chaikin ×~6, shoelace/area ×~6, plus point-in-ring /
segment-key/quantize copies found in E1) into ONE geometry kernel module under
`src/lib/territory/geometry/kernel/`. Every consumer imports the kernel; duplicates become
re-exports first (zero-behavior-change commit), then call sites migrate, then the re-exports drop.
**Gate:** territory suite + typecheck after EACH sub-step; replay hash unchanged (pure refactor).
**Risk: low-medium** (mechanical, but wide).

### Stage 2 — Layering repair (upward imports)
Invert the two audit-flagged upward dependencies:
- `geometry → families` (`buildPowerVoronoiFrontierTopology`) — move the topology builder down into
  geometry (it is geometry), families re-export during migration.
- `geometry → renderers` (`DISCONNECT_OWNER_ID`) — the constant belongs in a shared
  geometry-layer identity module (it already governs cell ownership semantics).
Plus any additional upward imports E1 finds. **Gate:** suite + check; no behavior change expected.
**Risk: low.**

### Stage 3 — Render quarantine, Stages B→D (A already executed 2026-07-04)
Execute the confirmed RENDER_QUARANTINE_PLAN remainder against the keep-set
(power_vector, grid_gradient, ember_lattice, phase_edges*, phase_field + PowerCore):
- **B — dispatch fallback:** remove quarantined `case`s from the GameCanvas render switch;
  `default` → power_vector so saved configs cannot crash.
- **C — quarantine files:** move legacy family dirs + legacy renderers (E2 inventory) to
  `src/lib/territory/_quarantine/`; tests move with code.
- **D — catalog/config:** strip quarantined ids from the render-mode catalog, config defaults, themes.
*Note: the 07-04 plan body lists phase_edges in both keep and quarantine lines — resolve with user
before B (memory + keep-set line say KEEP ember_lattice/phase_edges; the quarantine line appears stale).
**Gate per sub-stage:** build + replay hash + territory suite; after D, user confirms the topbar
selector shows exactly the keep-set and each kept mode renders. **Risk: medium** (wide but staged).

### Stage 4 — Temporary scaffolding retirement
- **END_SNAP_FIX_EVAL:** user judged `soft_pins` "closest yet / passable" — pending explicit winner
  confirmation, promote the winner to THE behavior and strip the 4-mode toggle + topbar chip + the
  losing branches (E3 lists every touch point).
- **Abandoned experiments:** orchestrator DY4OT, `layers/` (if E1/E3 confirm they still exist) —
  quarantine move, same rules as Stage 3C.
- Any TEMP/eval probes E3 surfaces.
**Gate:** suite + check + user visual pass on conquest end-snap after the toggle strip. **Risk: low.**

### Stage 5 — GameCanvas decomposition (the god-file; LAST because highest risk)
Thin the ~8k-LOC GameCanvas into a coordinator: extract (per E3's responsibility map) the render-family
lifecycle, geometry-build scheduling, and transition scheduling into dedicated modules with the
component retaining only wiring. One extraction per commit, suite + manual smoke between.
**Gate:** suite + check + user plays a full conquest cycle per extraction. **Risk: high — never batched.**

### Stage 6 — Docs/tests alignment + final audit
Update TERRITORY_ARCHITECTURE.md + geometry atlas to the post-cleanup reality; delete stale docs into
`_archive/`; re-run the E1-E3 sweeps and diff against this doc's evidence — the deltas ARE the
completion proof; record final LOC vs Stage 0 baseline.

## Sequencing rationale
Consolidation (1) precedes deletion (3,4) per doctrine. Layering (2) before quarantine (3) so moved
files don't carry broken imports. GameCanvas (5) last: every earlier stage shrinks its import surface,
making the decomposition smaller and safer. 0 and 6 bracket everything with measurement.
