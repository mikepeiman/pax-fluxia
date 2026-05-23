# Feature And Task Queue - 2026-05-23

## Active

- Review/merge the completed live HUD redesign on `codex/ui-hud-development`.
- Decide whether a follow-up should complete extraction into a dedicated `HudShell.svelte`.

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
- Added browser QA coverage for selected-star update, settings open/close, standings collapse/reopen, and 1920x1080/1600x900/1280x720 layout metrics.
- Created `.agent/docs/handoffs/2026-05-23_HUD_REDESIGN_HANDOFF_worktree-4b02.md`.

## Validation Plan

- `bun run --cwd pax-fluxia build`: passed.
- `bun run --cwd pax-fluxia check`: failed on existing baseline, latest count `329 errors and 842 warnings in 66 files`.
- Browser QA at 1280x720, 1600x900, and 1920x1080: passed for measured HUD overlap/state checks.
- Static label checks: no visible `Quick Tools`, `Actions`, `Low-frequency`, or `Load Map` inside Theme cluster.
