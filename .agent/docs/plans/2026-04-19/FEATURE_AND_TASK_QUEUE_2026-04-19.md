# Feature And Task Queue - 2026-04-19

- Audit metaball-grid renderer mode together with shared territory-geometry tunables (MSR, CX, CP, DX): explain actual code-path behavior, identify dead/partial wiring, and document improvements before grid mode becomes the default.
- Restore missing worktree metaball-grid planner controls on master: `METABALL_GRID_DISTRIBUTION`, `METABALL_GRID_POSITION_JITTER`, and `METABALL_GRID_MAX_CELLS`.
- Restore metaball-grid perf/observability surface on master so tuning exposes requested/effective spacing, total/emittable/painted cells, and frame/update cost.
- Decide and then implement explicit `MSR` semantics if the desired behavior is star/lane clearance rather than the current multi-purpose site-weight scalar.
- Implement explicit lane-margin fallback semantics: `MAPGEN_LANE_MARGIN_ENABLED` now chooses between dedicated lane clearance and `MODIFIED_VORONOI_STAR_MARGIN`, with shared helpers reused by map preview, live lane rebuild, theme apply, and diagnostics readouts.
- Execute the metaball-grid restoration on master without regressing newer family behavior: keep master's inward-offset/live family fixes, add missing distribution/jitter/max-cells planner inputs, restore the perf readout surface, and gate square-only blended-edge drawing so non-square distributions do not fake a square topology.
- Remove visible config-key chips from the settings UI and keep config key + description in hover tooltips only, per original spec.

