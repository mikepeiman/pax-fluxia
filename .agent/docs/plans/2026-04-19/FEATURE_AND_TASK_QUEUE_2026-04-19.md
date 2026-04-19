# Feature And Task Queue - 2026-04-19

- Audit metaball-grid renderer mode together with shared territory-geometry tunables (MSR, CX, CP, DX): explain actual code-path behavior, identify dead/partial wiring, and document improvements before grid mode becomes the default.
- Restore missing worktree metaball-grid planner controls on master: `METABALL_GRID_DISTRIBUTION`, `METABALL_GRID_POSITION_JITTER`, and `METABALL_GRID_MAX_CELLS`.
- Restore metaball-grid perf/observability surface on master so tuning exposes requested/effective spacing, total/emittable/painted cells, and frame/update cost.
- Decide and then implement explicit `MSR` semantics if the desired behavior is star/lane clearance rather than the current multi-purpose site-weight scalar.
- Implement explicit lane-margin fallback semantics: `MAPGEN_LANE_MARGIN_ENABLED` now chooses between dedicated lane clearance and `MODIFIED_VORONOI_STAR_MARGIN`, with shared helpers reused by map preview, live lane rebuild, theme apply, and diagnostics readouts.
- Execute the metaball-grid restoration on master without regressing newer family behavior: keep master's inward-offset/live family fixes, add missing distribution/jitter/max-cells planner inputs, restore the perf readout surface, and gate square-only blended-edge drawing so non-square distributions do not fake a square topology.
- Remove visible config-key chips from the settings UI and keep config key + description in hover tooltips only, per original spec.
- Expand settings hover metadata so each tooltip shows both `panel:` and `config:` identifiers, not just the config key.

## Additional Historical Branch Thread

### Goofy-Raman Metaball-Grid Phase A/C Record

Source branch: `claude/goofy-raman`.

Completed in that branch thread:

- Acronym correction recorded in the decisions ledger as the canonical `CX / CP / DX / MSR` record.
- `TerritoryGeometrySourceTuning` plus explanatory preamble surfaced in the Metaball Grid settings card.
- Phase A delivered:
  - dirty-flag paint gate
  - plan-parameter invalidation on classification-tunable edits
  - three new tunables: distribution, position jitter, max cells
  - live perf readouts via `metaballGridStats`
- Phase C delivered:
  - PREV geometry capture lifted into `GameCanvas`
  - new `RenderFamilyInput.prevGeometry`
  - `PerimeterFieldFamily` and `MetaballGridFamily` consume upstream PREV geometry and invalidate plans on PREV/NEXT geometry reference change

Historical queued next items from that branch:

- [ ] MG-PERF-PHASE-B - two-layer RenderTexture caching
- [ ] MG-MSR-LANE-FILTER - explicit lane-proximity MSR semantics in lane generation
- [ ] MG-CP-SHORT-LANE-AUDIT - verify CP suppression threshold on short lanes
- [ ] MG-DEFAULTS-REVISIT - revisit default enablement for corridor and disconnect helpers
- [ ] MG-MOAT-AUDIT - reassess the moat-fill fallback after MSR lane filtering exists
- [ ] MG-PERF-PHASE-D - splat-and-threshold or JFA-based territory field
- [ ] MG7 / MG8 / MG9 - acceptance tests, perf bench default profile, paused debug overlay
- [ ] TUNABLE-PLAN-INVALIDATION-WAVE - invalidate the wave plan when adjacency / wave-geometry / wave-seeding change mid-transition

