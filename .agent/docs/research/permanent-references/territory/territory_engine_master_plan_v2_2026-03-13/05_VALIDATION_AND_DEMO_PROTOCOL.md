# Validation And Demo Protocol

## Purpose

Territory work is not complete when it type-checks or builds. It is only complete when the live route is correct, the backend is known, the visual result matches the claim, and the evidence is saved for later review.

This protocol defines the minimum validation surface for any meaningful territory change.

## Mandatory Validation Surfaces

Every serious territory task must include the following:

1. **Repo truth inspection**
   - Verify the route, backend, and relevant settings in code.
   - Confirm whether the work is native or adapter-backed.
2. **Build/check validation**
   - Run the appropriate code checks.
   - Note any unrelated baseline warnings or failures.
3. **Browser validation**
   - Run the actual game in the browser.
   - Confirm the visible route and backend behavior.
4. **Saved screenshots**
   - Save screenshots for the exact state used to support the conclusion.
   - Do not rely on memory or console descriptions alone.

## Screenshot Storage

Store screenshots under:

- `.agent/WIP Work-In-Progress/screenshots/territory-engine/`

If a task predates this protocol, note the older screenshot location explicitly rather than moving files casually.

## Screenshot Naming

Use this pattern:

- `territory_<date>_<mode>_<route>_<map>_<step>.png`

Examples:

- `territory_2026-03-13_static_fg2_seed_graph_medium_before_fix.png`
- `territory_2026-03-13_dynamic_dy5_corridor_events_high_churn_route_truth.png`
- `territory_2026-03-13_hybrid_hy2_seed_delta_world_edge_after_fix.png`

## Required Route-Truth Checks

At minimum, the bundle expects recurring validation of these cases:

1. `FG2` in `static` mode
2. `DY5` in `dynamic` mode
3. `HY2` in `hybrid` mode
4. One proof case showing that a visible UI pairing such as `FG1 + DY5` is not a real live route if the dynamic plan anchors elsewhere
5. One backend comparison for each family that is demo-ready

## Benchmark Fixture Families

Validation should be repeated across a standard set of map scenarios:

- **Small**: low star count, easy to inspect by eye
- **Medium**: normal playfield for daily iteration
- **Large**: high star count, stress for geometry density
- **High-churn**: frequent ownership change and dynamic stress
- **Enclave**: encircled holdings and cutout-like render cases
- **World-edge stress**: holdings and frontiers that rely on perimeter closure

## Acceptance Metrics

A territory task should not be called complete unless it satisfies the relevant subset of these:

- No visible gaps in the ownership partition
- No visible border/fill mismatch in settled state
- Route truth matches runtime behavior
- Backend choice is identified and intentional
- Canonical artifacts are present or their absence is explicitly noted
- No stale artifact bleed between mode changes
- Build/check passes, or unrelated baseline issues are called out clearly
- Screenshots exist for the claimed improvement or regression proof

## Demo Script

Use this order unless a task requires something narrower:

1. Select the intended mode family: `static`, `dynamic`, or `hybrid`.
2. Select the intended route within that family.
3. Record the actual live route and backend.
4. Capture a baseline screenshot.
5. Trigger the behavior under test.
6. Capture the after-state screenshot.
7. Record whether the route truth and the visual result agree.

## Browser Tooling Guidance

Use the best tool for the layer:

- `atlas-harness` for repo, process, file, and git work
- browser automation or CDP tooling for screenshots and visual inspection
- in-browser trace/step tooling for artifact-level diagnosis

`atlas-harness` is helpful for orchestration, but it is not the primary screenshot or canvas-inspection tool today.

## Reporting Requirements

A useful validation note must state:

- branch or commit
- mode family
- actual route
- backend
- map/fixture type
- screenshot path(s)
- observed result
- whether the conclusion is a route-truth claim, a visual claim, or both

## Stop Rules

Do not claim any of the following without saved visual evidence:

- a border/fill mismatch is fixed
- a route combination is active
- a backend consumes canonical artifacts correctly
- an animation or morph issue is resolved

If screenshots are missing, say the claim is unverified.
