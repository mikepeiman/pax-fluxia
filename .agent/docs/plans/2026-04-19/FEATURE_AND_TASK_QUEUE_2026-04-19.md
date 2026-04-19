# Feature And Task Queue - 2026-04-19

- Audit metaball-grid renderer mode together with shared territory-geometry tunables (MSR, CX, CP, DX): explain actual code-path behavior, identify dead/partial wiring, and document improvements before grid mode becomes the default.
- Restore missing worktree metaball-grid planner controls on master: `METABALL_GRID_DISTRIBUTION`, `METABALL_GRID_POSITION_JITTER`, and `METABALL_GRID_MAX_CELLS`.
- Restore metaball-grid perf/observability surface on master so tuning exposes requested/effective spacing, total/emittable/painted cells, and frame/update cost.
- Decide and then implement explicit `MSR` semantics if the desired behavior is star/lane clearance rather than the current multi-purpose site-weight scalar.

