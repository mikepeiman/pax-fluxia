# Feature And Task Queue - 2026-05-27

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
