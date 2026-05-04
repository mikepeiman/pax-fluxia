# Feature And Task Queue - 2026-04-27

- [x] Review `pv_transition_plan_with_full_pipeline_diagnostics_v2.md` against the current PV / `perimeter_field` implementation and write a session report with a reuse-vs-rewrite recommendation.
- Artifact: `.agent/docs/sessions/2026-04-27/2026-04-27_PV_TRANSITION_PLAN_REVIEW.md`
- [x] Implement `power_voronoi_canonical` as a clean-runtime parallel mode with fixed `canonical_power_voronoi + pv_frontline + border off`, paired PRE/POST PV geometry capture, mode-local diagnostics, and generic export-adapter routing.
- Verification: `bunx vitest run src/lib/territory/devtools/TransitionDiagnosticsAdapters.test.ts src/lib/territory/devtools/TransitionBundleSerializer.test.ts src/lib/territory/pvCanonical/planner.test.ts src/lib/territory/layers/transition/TransitionLayerCoordinator.test.ts src/lib/territory/runtime/TerritoryRuntimeCoordinator.test.ts src/lib/territory/integration/TerritoryArchitectureRouter.test.ts src/lib/territory/integration/TerritorySettingsBridge.test.ts`

