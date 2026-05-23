# Feature And Task Queue - 2026-05-23

## Active

- Review/merge corrective live HUD redesign work on `codex/ui-hud-development`.
- Follow-up candidate: map renderer/territory art pass to better match the Aurelia Drift reference richness. This corrective commit primarily fixes DOM HUD/settings surfaces.
- Follow-up candidate: package remaining Google-loaded default fonts locally if Steam/Tauri offline operation must not depend on network font URLs.

## Completed

- Loaded `.agent/AGENT.md`.
- Loaded `.agent/docs/agentic/AGENT-GUIDE_MCP_atlas-harness.md`.
- Loaded `game-studio:game-ui-frontend` skill guidance.
- Confirmed branch `codex/ui-hud-development`.
- Confirmed worktree was clean before starting.
- Created the implementation plan file for the full HUD redesign.
- Implemented the `pax-fluxia/src/lib/components/game-hud/` layer.
- Integrated live HUD panels into `GameContainer.svelte`.
- Added shared Aurelia Drift HUD tokens and `pax-fluxia/src/lib/styles/hud.css`.
- Removed `Load Map` from the settings/theme utility cluster.
- Added `ThemeLibraryPanel.svelte` and replaced the old utility theme manager inside the live settings panel.
- Removed Theme Library category labels; list now renders compact single-line rows with ellipsis and scroll.
- Removed the blank explanatory settings slab and converted no-section settings into a compact icon-ribbon command surface.
- Added dynamic settings-panel width behavior: compact for ribbon/theme utility, wider when a section is opened.
- Cleaned visible emoji/glyph usage in touched theme/settings surfaces.
- Wrote post-mortem for false completion and process failure.
- Added browser QA coverage for selected-star update, settings open/close, standings collapse/reopen, and 1920x1080/1600x900/1280x720 layout metrics.
- Created `.agent/docs/handoffs/2026-05-23_HUD_REDESIGN_HANDOFF_worktree-4b02.md`.
- Added an in-game typography token lab for brand/interface/label/copy/data HUD font roles.
- Packaged the supplied Pasti OTF under `pax-fluxia/static/fonts/pasti/` and verified it copies into the static build output.

## Validation Plan

- `bun run --cwd pax-fluxia build`: passed.
- `git diff --check`: passed.
- `bun run --cwd pax-fluxia check`: failed on existing baseline, latest count `329 errors and 820 warnings in 65 files`.
- Browser QA at 1280x720, 1600x900, and 1920x1080: passed for measured HUD overlap/state checks.
- Static/browser label checks: no visible `Quick Tools`, `Actions`, `Low-frequency`; no `Load Map` inside Theme cluster; no Theme Library category rows.
- Typography token QA: local browser test passed for opening settings, seeing Token Lab, selecting Pasti for Brand, status update, and reset to defaults.
