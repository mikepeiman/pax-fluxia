# Feature And Task Queue - 2026-04-30

## Active
- Replace the current `metaball-grid` conquest render mode with a non-metaball architecture that keeps deterministic changed-region detection, smooth frontier-led conquest motion, border-following fills, and low-end WebGL safety.
- Keep the work grounded in the live render-family runtime, not a speculative whole-system rewrite.
- Maintain `.agent/AGENT.md` as the additive worktree handoff ledger for this sprint.

## Completed
- Loaded the governing worktree, territory-runtime, and documentation rules before planning.
- Traced the live integration seams in `RenderFamilyTypes.ts`, `buildRenderFamilyInput.ts`, `renderFamilyTransitionLifecycle.ts`, `territoryRenderModeCatalog.ts`, `MetaballGridFamily.ts`, `MetaballGridPhaseEdgesFamily.ts`, `metaballGridTypes.ts`, `planGridWave.ts`, `renderMetaballGridScene.ts`, and `PerimeterFieldFamily.ts`.
- Wrote the dated architecture spec at `.agent/docs/plans/2026-04-30/METABALL_GRID_REPLACEMENT_ARCHITECTURE_SPEC_2026-04-30.md`.
- Recorded the recommendation in `FEATURE_STATUS.md`, `DECISIONS.md`, today's session docs, and `.agent/AGENT.md`.
- Implemented an additive replacement mode, `metaball_grid_phase_field`, in the live render-family runtime.
- Wired the new mode through `territoryRenderModeCatalog.ts`, `GameCanvas.svelte`, `ControlsSection-Territory.svelte`, `ControlsSection-Diagnostics.svelte`, `MetaballGridTuning.svelte`, `inAppConquestBench.ts`, `game.config.ts`, and `metaballGridStats.ts`.
- Verified the new family and runtime wiring with installed workspace dependencies. `bun run check` still fails on pre-existing repo errors outside this sprint; the touched Svelte files only reported existing unused-selector warnings, and `bunx tsc --noEmit -p tsconfig.json` showed no hits for `MetaballGridPhaseFieldFamily.ts`.
- Fixed chained-conquest replay by removing the stable PRE-cache freeze for active phase-family transitions in `GameCanvas.svelte`.
- Removed the hidden phase-field propagation override so `Propagation Shape` is now a real runtime choice instead of a false UI surface.
- Added phase-field finish-tail controls and runtime support for PRE fade timing, cell-size collapse timing, final cell size, and frontier fade timing.
- Set the live tuning baseline to frontier propagation, territory-edge borders, frontier highlight on, and a 1px final cell-size collapse so the mode has a legible starter state without hard-locking those shared controls.
- Restored real border semantics in phase field by splitting frontier highlight into its own dedicated toggle and adding a real border overlay layer that honors shared border width/alpha/HSL and grid-border tuning.

## Next
- Run visual QA in-app against real conquest sessions, especially consecutive capture sessions and long chained frontiers.
- Tune the new finish-tail controls in live conquest footage and decide whether the current starter border baseline should become a stronger authored default.
- Tune the new phase-field border overlay in conquest and steady state, especially the distinction between `territory_edge`, `per_cell`, centered-blended borders, and the separate `Frontier Highlight` accent.
- Decide whether the prototype should replace `metaball_grid` outright after user verification, or remain as a separate comparison mode for another iteration.
- If the phase-field presentation is accepted, harden the composite path toward an owner/palette texture renderer and reduce the remaining vector fallback cost.
