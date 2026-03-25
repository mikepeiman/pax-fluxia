# Territory Recovery Work Breakdown Package (16 Chunks)

## Summary
Break the territory recovery/completion effort into 16 zero-context-agent-safe chunks. Each chunk is small enough to execute and review independently, with explicit sequential/parallel rules, declarative intent, imperative steps, anti-goals, and done criteria.

Current repo fact that must be handled first:
- The repo is **not clean** right now.
- Repo-tracked dirty file: [DistanceFieldTerritoryRenderer.ts](/C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/DistanceFieldTerritoryRenderer.ts)
- Untracked notes exist:
  - [.agent/WIP Work-In-Progress/territory_recovery_phase1_note_2026-03-08.md](/C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/WIP%20Work-In-Progress/territory_recovery_phase1_note_2026-03-08.md)
  - [.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_phase1_note_2026-03-08.md](/C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/WIP%20Work-In-Progress/permanent-references/territory/territory_recovery_phase1_note_2026-03-08.md)

All chunks must follow these conventions:
- Source-of-truth docs for every chunk:
  - [IMPLEMENTATION_DIRECTIVE_v1.md](/C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/WIP%20Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v1.md)
  - [territory_liveness_and_settings_recovery_2026-03-08.md](/C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/WIP%20Work-In-Progress/permanent-references/territory/territory_liveness_and_settings_recovery_2026-03-08.md)
  - [territory_canonical_frontier_border_fill_plan_2026-03-08.md](/C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/WIP%20Work-In-Progress/permanent-references/territory/territory_canonical_frontier_border_fill_plan_2026-03-08.md)
- Before and after each chunk: update a short staged note in WIP and mirror it to permanent references.
- Commit every completed chunk.
- No silent divergence from the directive docs; record any intentional deviation.
- Legacy modes stay available.
- Fade Blend stays as a distinct selectable conquest mode.
- Canonical mode must never silently fall back to wrong geometry.

## Public Interfaces / Types to Add or Stabilize
- Internal runtime state:
  - `PublishedOwnerGridSnapshot`
  - canonical readiness state / mode
- Canonical frontier types:
  - `FrontierNode`
  - `FrontierEdge`
  - `FrontierGraph`
  - contour-local field frontier grouping metadata
- Conquest mode controls:
  - keep `Fade Blend`
  - add/finish `Boundary Morph`
- Border runtime modes:
  - preserve legacy engines
  - canonical mesh must use only frontier-graph geometry

## Chunk List

### Chunk 01: Clean Baseline and Recover From Aborted Local State
- Execution: Sequential, first
- Declarative:
  - The implementation must start from a known, intentional baseline. No chunk may be built on accidental local edits.
- Imperative:
  - Inspect `git status`.
  - Review the current uncommitted diff in [DistanceFieldTerritoryRenderer.ts](/C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/DistanceFieldTerritoryRenderer.ts).
  - Decide whether the dirty renderer edit is:
    - a valid partial Phase 1 recovery worth finishing, or
    - an aborted broken patch that should be discarded.
  - Keep the untracked phase-note files if useful; discard only if replaced by a better note in this chunk.
  - End with a clean or intentionally-updated baseline.
- Do not:
  - mix aborted local edits into later chunks without explicit validation.
- Done when:
  - the working tree is clean except for intentional chunk output.

### Chunk 02: Emergency Runtime Gate for Canonical Frontier Path
- Execution: Sequential, after Chunk 01
- Declarative:
  - Mesh borders must not consume partial canonical frontier data. Runtime must remain visually stable even if canonical code is incomplete.
- Imperative:
  - In [DistanceFieldTerritoryRenderer.ts](/C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/DistanceFieldTerritoryRenderer.ts), add an explicit internal canonical runtime mode gate:
    - `disabled`
    - `diagnostic`
    - `production`
  - Set it to `disabled` for recovery.
  - Ensure active mesh geometry uses stable published legacy polylines while canonical mode is disabled.
  - Keep canonical code paths compiled and available, but not visible.
- Do not:
  - remove canonical code,
  - expose canonical output as fallback during warmup.
- Done when:
  - mesh mode renders stable borders again using legacy-published geometry only.
- Commit message:
  - `Recover territory renderer to stable runtime by gating partial canonical border path`

### Chunk 03: Published Owner-Grid Snapshot Contract
- Execution: Sequential, after Chunk 02
- Declarative:
  - Stage 2B must consume only fully-published owner-grid snapshots, never an in-progress build job.
- Imperative:
  - Add a published owner-grid snapshot cache separate from `cachedVectorBuildJob`.
  - Populate it only after vector build completion.
  - Clear it on stale snapshot invalidation and global renderer reset.
  - Remove any Stage 2B read path that accesses `cachedVectorBuildJob.ownerGrid` directly.
- Do not:
  - treat `Int16Array.length > 0` as readiness.
- Done when:
  - there is no code path where incomplete owner-grid rows can feed field frontier extraction.
- Parallel-ready:
  - No

### Chunk 04: Working-State Verification and Recovery Commit
- Execution: Sequential, after Chunk 03
- Declarative:
  - The repo must be returned to a playable, non-broken state before deeper architecture work resumes.
- Imperative:
  - Verify:
    - no top-of-map border corruption,
    - no 1-frame correct flash followed by disorder,
    - mesh mode is stable,
    - legacy reference modes still function.
  - Run targeted checks and record the exact result in a staged note.
  - Commit the recovery state.
- Do not:
  - continue Phase 2+ work if Phase 1 recovery is not visually stable.
- Done when:
  - the current user-visible breakage is gone and documented.

### Chunk 05: Territory Settings Write-Path Inventory
- Execution: Parallel-ready after Chunk 04
- Declarative:
  - Every territory-related setting mutation path must be known before cleanup.
- Imperative:
  - Inventory all remaining territory-related direct writes to `GAME_CONFIG`.
  - Inventory all remaining territory-related uses of broad replay/manual sync.
  - Record findings by component/module:
    - controls sections,
    - theme/preset application,
    - reset/default flows,
    - import/export flows.
- Do not:
  - start broad editing before inventory is written down.
- Done when:
  - there is a concrete checklist of remaining violations.
- Parallel-ready:
  - Yes, can be split by UI subarea among agents.

### Chunk 06: Central Settings Bridge Completion
- Execution: Sequential, after Chunk 05
- Declarative:
  - The territory UI must mutate settings through one canonical path only.
- Imperative:
  - Finish the central bridge in:
    - [GameSettingsPanel.svelte](/C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte)
    - [settingsState.ts](/C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/components/ui/settingsState.ts)
    - [panelSync.ts](/C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/components/ui/panelSync.ts)
  - Ensure theme apply, preset apply, reset, and import all use the same config-patch bridge.
  - Remove remaining territory-specific manual replay code in the central panel layer.
- Do not:
  - leave dual mutation systems active.
- Done when:
  - the panel layer has a singular territory mutation path.

### Chunk 07: Territory Control Section Cleanup
- Execution: Parallel-ready after Chunk 06
- Declarative:
  - Control sections must be dumb UI over `panel.*`; they must not mutate runtime config directly.
- Imperative:
  - Update territory-related settings components to:
    - read from `panel.*`,
    - write via `setSetting`,
    - stop directly mutating `GAME_CONFIG`.
  - Remove territory-only legacy reactive exceptions where they bypass the central bridge.
- Do not:
  - change unrelated settings panels unless they block territory correctness.
- Done when:
  - territory control components no longer perform direct config writes.
- Parallel-ready:
  - Yes, by component/file, but only after Chunk 06 locks the central contract.

### Chunk 08: Liveness Telemetry and Development Guards
- Execution: Parallel-ready after Chunk 06
- Declarative:
  - Territory debugging must be able to distinguish state mutation, invalidation, publish, rebuild, and no-op behavior.
- Imperative:
  - Add lightweight diagnostics for:
    - `setSetting` / `setManySettings`
    - topology invalidation
    - geometry invalidation
    - visual invalidation
    - ownership snapshot publish
    - mesh rebuild
    - uniform-only style updates
  - Add dev-only guards for:
    - direct territory UI writes outside canonical API
    - schema keys missing panel sync coverage
- Do not:
  - spam logs in production paths.
- Done when:
  - a developer can trace a territory change end-to-end.
- Parallel-ready:
  - Yes, but only if one agent owns telemetry schema and naming.

### Chunk 09: Liveness Acceptance Pass
- Execution: Sequential, after Chunks 06–08
- Declarative:
  - The renderer and settings path must be trustworthy before canonical geometry work resumes.
- Imperative:
  - Validate:
    - live slider response,
    - conquest/tick-driven visual updates,
    - theme/preset apply,
    - reset/default flow,
    - import flow.
  - Commit only when liveness is confirmed.
- Do not:
  - start canonical frontier promotion while reactivity is still suspect.
- Done when:
  - Phase 2 acceptance criteria are met and documented.
- Commit message:
  - `Complete territory settings bridge and renderer liveness integration`

### Chunk 10: Legacy Reclassification and Runtime Isolation
- Execution: Parallel-ready after Chunk 09
- Declarative:
  - Lattice-derived centerline extraction is legacy-only and must be visibly isolated in code and routing.
- Imperative:
  - Reclassify the owner-grid centerline path as legacy in comments, names, and runtime usage.
  - Keep legacy modes selectable.
  - Ensure canonical runtime code never depends on the legacy extractor.
- Do not:
  - delete legacy engines,
  - rename files if that creates unnecessary merge churn without behavior gain.
- Done when:
  - there is no ambiguity in code about which path is canonical.
- Parallel-ready:
  - Yes, if limited to comments/names/routing and coordinated with Chunk 14.

### Chunk 11: Stage 2A Hardening (Lane Frontier Correctness)
- Execution: Sequential, after Chunk 09
- Declarative:
  - Lane frontier extraction must be mathematically sound, deterministic, and usable as one half of the canonical frontier graph.
- Imperative:
  - Review and harden [frontierGraph.ts](/C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/frontierGraph.ts):
    - stable IDs,
    - owner ordering,
    - exact/piecewise-exact root solving,
    - no unsafe pruning,
    - deterministic ordering.
  - Ensure lane frontier output is world-space and independent of owner-grid data.
- Do not:
  - degrade Stage 2A into a coarse scan shortcut.
- Done when:
  - lane frontier data is correct enough to serve canonical diagnostic mode.

### Chunk 12: Stage 2B Redesign (Contour-Local Field Frontier Extraction)
- Execution: Sequential, after Chunk 09
- Declarative:
  - Field frontier extraction must produce local contours, not pair-global garbage chains.
- Imperative:
  - Replace the current pair-global grouping logic in [frontierGraph.ts](/C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/frontierGraph.ts).
  - Derive field frontier connectivity from actual grid-neighbor topology.
  - Introduce contour-local identifiers / `sourceRef` values.
  - Ensure ordering is contour-local, not a global `sortKey` across the whole pair.
  - Make invalid/unpublished owner-grid data impossible to consume.
- Do not:
  - connect all same-pair points into one chain,
  - use `worldX + worldY * constant` as topology.
- Done when:
  - field frontiers form local, meaningful segments only.

### Chunk 13: Frontier Merge and Polyline Extraction Validity
- Execution: Sequential, after Chunks 11–12
- Declarative:
  - The merged `FrontierGraph` must preserve owner-pair identity and local topology across lane and field sources.
- Imperative:
  - Tighten merge rules for lane + field frontiers.
  - Ensure polyline extraction respects contour boundaries and owner-pair grouping.
  - Add canonical validity checks:
    - non-empty output,
    - no absurd out-of-bounds paths,
    - no giant pair-global stitched chains,
    - stable owner-pair grouping.
- Do not:
  - silently emit unusable frontier polylines.
- Done when:
  - canonical frontier polylines are topologically sane and testable.

### Chunk 14: Canonical Routing States and Diagnostic Mode
- Execution: Sequential, after Chunks 10–13
- Declarative:
  - Canonical runtime selection must be explicit and safe, never implicit.
- Imperative:
  - Replace the current legacy-preferred/canonical-fallback behavior with explicit routing:
    - `invalid canonical` -> legacy
    - `valid canonical diagnostic` -> optional canonical view
    - `valid canonical production` -> canonical active
  - Keep straight family as the only production-quality requirement.
  - Record which readiness checks must pass before switching from diagnostic to production.
- Do not:
  - expose canonical output automatically just because legacy is empty.
- Done when:
  - canonical output can be turned on deliberately and safely.
- Commit message:
  - `Promote canonical frontier mesh borders behind validity checks`

### Chunk 15: Canonical Fill Backfill
- Execution: Sequential, after Chunk 14
- Declarative:
  - In canonical mode, visible fill and visible border must share one geometry truth.
- Imperative:
  - Derive canonical visible fills from frontier geometry:
    - region polygons or equivalent bounded fill geometry
    - world-bounds clipping
  - Keep ownership RT for solver/interstitial/debug use, not visible-edge authority.
  - Validate no fill/border drift in canonical mode.
- Do not:
  - claim canonical completion while fill edges still come from a different visible truth.
- Done when:
  - fill and border are geometrically coincident in canonical mode.
- Commit message:
  - `Backfill canonical fills from frontier geometry`

### Chunk 16: Conquest Modes, Feature Validation, and Finalization
- Execution: Sequential, last
- Declarative:
  - The final V1 canonical pipeline must preserve Fade Blend, add Boundary Morph, and validate feature semantics against the canonical truth source.
- Imperative:
  - Keep `Fade Blend` as a distinct selectable mode with timing/easing controls.
  - Implement or complete `Boundary Morph` as a separate mode using stable frontier IDs and mesh correspondence.
  - Validate DX, corridors, and MSR on canonical borders/fills.
  - Run the full regression matrix:
    - legacy modes,
    - canonical borders,
    - canonical fills,
    - morph modes,
    - slider/theme/preset/reactivity,
    - zoom/reload/tick/conquest.
  - Finalize docs and feature-status notes.
- Do not:
  - merge morph behavior into Fade Blend,
  - skip DX/corridor/MSR revalidation.
- Done when:
  - canonical territory V1 is visually correct, reactive, and spec-complete.
- Commit messages:
  - `Add boundary morph mode while preserving fade blend`
  - `Validate DX corridors MSR on canonical pipeline and finalize docs`

## Test Cases and Scenarios

### Recovery / Stability
- Mesh borders do not appear only at the top of the map.
- No 1-frame correct flash followed by corruption.
- Legacy mesh/field/grid reference paths remain stable.

### Liveness
- Slider change updates territory immediately.
- Tick/conquest updates visuals without user interaction.
- Theme/preset/reset/import all keep panel and runtime synchronized.

### Canonical Borders
- Canonical borders do not depend on vector-grid or vector-straighten settings.
- Canonical mesh path does not consume lattice-derived centerlines.
- Straight-family borders are even-width and centered on the true interface.

### Canonical Fill Alignment
- No visible fill/border drift at gameplay zoom or close zoom.
- No drift during reload, zoom, slider change, or conquest transition.

### Morph
- Fade Blend remains working and selectable.
- Boundary Morph moves boundaries smoothly without unrelated popping.

### Feature Semantics
- DX persists after slider release.
- Corridors and MSR remain deterministic and affect canonical ownership correctly.

## Assumptions and Defaults
- The current broken baseline is the committed state after `10698ca`.
- Chunk 01 must normalize local repo state before any implementation resumes.
- Fast playable recovery is prioritized before canonical promotion.
- Legacy border engines stay in product as explicit references.
- Straight-family canonical borders are the only required production family in this pass.
- Canonical completion requires both:
  - trustworthy liveness/settings architecture,
  - shared geometry truth for visible fill and visible border.
