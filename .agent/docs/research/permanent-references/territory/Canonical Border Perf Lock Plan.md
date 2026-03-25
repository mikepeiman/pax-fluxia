# Canonical Border Perf Lock Plan

## Summary
Preserve the current improved `Mesh (Clean) + Canonical Frontier: Production` visual result, and fix the hangs by removing production-time CPU lattice rebuilding and expensive validation. This plan is intentionally a perf/stability lock, not the full frontier-topology rewrite from the earlier directives.

The implementer must keep the current improved canonical shape as the baseline. Do not redesign Stage 2A/2B geometry in this change. Do not change fills, shaders, or UI controls in this change.

## Implementation Changes
1. **Lock production canonical to RT-derived frontier only**
   - In [DistanceFieldTerritoryRenderer.ts](C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/DistanceFieldTerritoryRenderer.ts), change `produceCanonicalBorderSource(...)` so `canonicalRuntimeMode === 'production'` never enters the CPU owner-grid build path.
   - If ownership RT readback succeeds, build canonical from RT-derived `OwnerGridInfo` exactly as today.
   - If ownership RT readback fails in production, return `currentPublished ?? lastValidPublished ?? legacyCurrentPublished`, and emit one explicit fallback diagnostic.
   - Do not create or step `cachedCanonicalBuildJob` in production mode. That code path becomes diagnostic-only.

2. **Make mode switches reuse canonical instead of rebuilding**
   - Keep canonical publish keyed only by ownership/topology truth and ownership-control inputs.
   - Switching between border engines or canonical runtime modes must not invalidate canonical source geometry for the same `ownershipSnapshotId`.
   - Width, alpha, softness, brighten, and other visual-only settings may rebuild mesh geometry or uniforms, but must not trigger canonical source rebuild.
   - Entering Production mode should immediately reuse `cachedCanonicalCurrentPublished` or `cachedCanonicalLastValidPublished` if the classification key matches.

3. **Split validation into production and diagnostic**
   - In [frontierGraph.ts](C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/frontierGraph.ts), add an internal validation mode parameter to the canonical build path, with exact behavior:
   - `production`: validate only non-empty output, finite coordinates, owner ordering, world-bounds containment, and oversized-chain thresholds.
   - `diagnostic`: keep the current expensive drift checks and smoothing-collapse guards.
   - In production, do not call the full bidirectional point-to-polyline drift routines.
   - Production must still preserve the same current smoothed output shape; only the expensive guard path changes.

4. **Make fallback and rebuild diagnostics decision-complete**
   - Extend internal published/diagnostic state with exact source subtype values:
     - `canonical_rt_frontier`
     - `canonical_cpu_fallback`
     - `legacy_grid`
   - Production mode must never publish `canonical_cpu_fallback`.
   - Add one-shot diagnostics with exact reasons:
     - `PRODUCTION_RT_UNAVAILABLE_REUSE_LAST_VALID`
     - `PRODUCTION_RT_UNAVAILABLE_LEGACY_FALLBACK`
     - `MODE_SWITCH_REUSED_CANONICAL`
     - `TOPOLOGY_REBUILD`
   - Keep logs fingerprinted so they do not spam every frame.

5. **Remove the current hang source from the production hot path**
   - Ensure no production frame can spend time in `stepVectorBorderBuildJob(...)`.
   - Ensure `computeBorderBuildBudgetMs(...)` is irrelevant for production canonical because no chunked CPU canonical build is allowed there.
   - Keep the CPU fallback builder only for diagnostic mode or legacy mode, unchanged apart from logging labels.

6. **Preserve current visual output**
   - Do not change `computeLaneFrontiers(...)`, `extractFieldFrontiersFromOwnerGrid(...)`, mesh shader behavior, or family fitting logic in this change.
   - Do not retune smoothing constants in this change.
   - The goal is to keep the currently improved borders and make them fast/stable.

## Internal Interfaces
- Add an internal `CanonicalValidationMode = 'production' | 'diagnostic'`.
- Add `sourceSubtype` to internal published source state and perf/diagnostic payloads.
- No user-facing config changes.
- No new settings panel controls.

## Test Plan
1. **Steady-state production**
   - Load `test-dx-1`.
   - Set `Border Engine = Mesh (Clean)` and `Canonical Frontier = Production`.
   - After the first published canonical snapshot, Chrome Performance must show no meaningful time in `stepVectorBorderBuildJob(...)`.
   - `sourceKind` must remain `canonical`, and fallback logs must not repeat.

2. **Mode-switch stability**
   - Switch repeatedly between `Legacy Field`, `Legacy Grid`, and `Mesh (Clean) + Production`.
   - Returning to Production for the same `ownershipSnapshotId` must reuse canonical instead of rebuilding.
   - No long main-thread stall and no processing hang.

3. **Visual preservation**
   - Compare Production borders before and after the perf change on the same camera position.
   - Border shape must remain materially the same as the current improved result.
   - No regression to coarse legacy staircase borders.

4. **Diagnostic isolation**
   - In `diagnostic`, CPU fallback and heavy validation may still run.
   - In `production`, if RT is unavailable, logs must show explicit reuse/fallback reason instead of silently building CPU canonical.

5. **Acceptance thresholds**
   - Production steady-state border pipeline p95 `<= 2 ms/frame`.
   - No single production border task `> 50 ms` after first canonical publish for a stable snapshot.
   - No `stepVectorBorderBuildJob(...)` samples in Production flame charts except `0 ms` incidental call absence.

## Assumptions and Defaults
- Keep the current improved canonical render as the visual baseline.
- Legacy fallback is allowed only as an explicitly logged last resort when no canonical snapshot exists; it must not republish itself as canonical.
- This plan does not attempt full spec completion for authoritative lane-topology merge or canonical fill alignment.
- The next plan, after this one is green, should be the true spec-compliance pass: lane-authoritative FrontierGraph topology and canonical fill/backfill.
