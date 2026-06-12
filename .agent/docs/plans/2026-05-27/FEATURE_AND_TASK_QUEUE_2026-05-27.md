# Feature And Task Queue - 2026-05-27

## Active

### Grid Gradient fill transitions

Purpose: make Grid Gradient conquest fills visibly transition through the mode's point-grid presentation, not snap from pre-conquest to post-conquest state while diagnostics report progress.

Current status:

- Removed the Grid Gradient-specific post-owner transition gate added in the previous pass; it was not proven by live behavior and could suppress transition input.
- Added `GRID_GRADIENT_DEBUG_TRANSITIONS` and corrected `Grid Gradient transition trace` placement to the Logging section. Enabling it also enables renderer logs internally.
- Added structured renderer logs with prefix `[GG_TRANSITION]` behind each major transition gate and rendering handoff.
- Kept `ownershipSnapshotHasPreviousConquestOwners(...)` to protect previous-frame cache use.
- Added visible diagnostics for transition cell mix counts, shader-side transition counts, event/session counts, transition age/duration, and shader uniform progress.

Findings:

- The earlier pending-preview explanation is not accepted as root cause because the user verified there was still zero visible transition.
- The active diagnostic question is now: where does transition truth stop being consumed? Possible gates are lifecycle, scheduler/queue, previous-frame selection, render-family input, plan/classification, shader texture packing, shader uniform update, or shader visual consumption.
- Live logs are now required for the next diagnosis. They should be collected by enabling `Grid Gradient transition trace` in the Logging section and filtering output for `[GG_TRANSITION]`.

Validation:

- `bun test src/lib/territory/transitions/renderFamilyPreviousFrame.test.ts src/lib/territory/families/gridGradient/GridGradientFamily.test.ts src/lib/territory/families/gridGradient/gridGradientShaderFieldPacking.test.ts`
- `bun run build` in `pax-fluxia/`

Immediate correction:

- Fixed a Grid Gradient diagnostic crash in `GameCanvas.svelte` where logging attempted `geometry.regions.length` / `geometry.frontiers.length` on optional fields before the family update/render path ran.
- Diagnostics now report `null` for those optional counts when absent, preserving rendering.
- Fixed Grid Gradient transition trace spam by moving GameCanvas, family, and shader trace logs through a shared transition-activity dedupe helper. Idle/no-transition frames are dropped, and repeated paused frames should not emit new lines.

Next step:

- User should enable `Grid Gradient transition trace` in the Logging section, filter `[GG_TRANSITION]`, trigger one conquest, and copy logs from `transition_lifecycle.after_build` through `family.update.exit`.
- Use those logs to identify the first stage where expected transition data becomes absent or inconsistent.

---


## Active Task: HUD Refinement And Iconography

Purpose: address the user's specific critique that the current HUD work is messy, under-padded, typographically hard to read, inconsistent in button/border styling, and not following the attached QTD/Pax icon plan.

Completed in this pass:

- Added semantic HUD icons based on `C:/Users/mikep/Downloads/pax_qtd_icon_registry.md`.
- Replaced obvious legacy icon names in live HUD/settings surfaces with semantic names.
- Increased panel padding, row height, button height, Star View metric spacing, standings spacing, and bottom-command spacing.
- Reworked `/dev/ui-test` Overlay Legend into a padded rounded panel with consistent gold-gradient control rows.
- Removed visible emoji/glyph labels from the updated settings and legacy topbar/floating-control paths.
- Passed `git diff --check` and `bun run --cwd pax-fluxia build`.
- Reran `bun run --cwd pax-fluxia check`; it remains blocked at the existing repository baseline of `329 errors and 819 warnings in 64 files`.

Follow-up tasks:

- Run live game browser QA through a real local-game start sequence, not direct `/play` URL only.
- Continue replacing non-live or post-game legacy emoji surfaces if they become visible in the live HUD path.
- Decide whether `GameHudFloatingActions.svelte` can be deleted as unused or should be refit to the new HUD system before any future use.
- Continue visual comparison against Aurelia Drift references after the broader map/playfield art catches up.
