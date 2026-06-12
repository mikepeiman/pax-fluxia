# Feature And Task Queue - 2026-05-13

## Active

- Refresh the in-game UI code guide so it reflects the current HUD shell, token layer, icon system, docking model, and current component ownership.
- Implement and validate the experimental `grid_gradient` territory render-family mode in worktree `9f22`.
- Await user visual review of the implemented HUD redesign pass.
- If accepted for master intake, prepare a deliberate merge strategy around the large HUD shell files and the updated handoff.

## Completed

- Audited the live HUD/layout/theme/leaderboard files and updated code anchors for manual editing.
- Wrote a new current-state code guide at `.agent/docs/sessions/2026-05-13/2026-05-13_UI_CODE_GUIDE_worktree-4b02.md`.
- Logged the documentation refresh in the session/chat/handoff trail for this worktree.
- Authored a reusable new-agent prompt for implementing a territory rendering mode at `.agent/docs/sessions/2026-05-13/2026-05-13_RENDER_MODE_AGENT_PROMPT.md`.
- Added the `Grid Gradient` render-family mode, settings UI, diagnostics, router coverage, tests, and territory architecture docs for worktree `9f22`.
- Re-audited the full source delta for the worktree and rewrote `.agent/docs/plans/2026-05-13/HANDOFF_2026-05-13_WORKTREE_4B02_TO_MASTER.md` as an actual merge aid.
- Wrote a required post-mortem at `.agent/docs/project/post-mortems/2026-05-13_inadequate-merge-handoff.md`.
- Wrote `.agent/docs/plans/2026-05-13/DESIGN_INTENT_HANDOFF_2026-05-13_WORKTREE_4B02.md` as a code-free UI/UX design brief capturing the user's stated intent, non-negotiables, anti-patterns, and open design questions.
- Wrote `.agent/docs/plans/2026-05-13/UI_DESIGN_INSTRUCTIONS_CONCISE_2026-05-13_WORKTREE_4B02.md` with only the concrete Pax Fluxia HUD design instructions.
- Implemented the HUD redesign pass across the topbar, master game grid, settings/ribbon docking, right tactical rail, Star View, quick-access icons, and selected-star command tray.
- Removed stale hidden duplicate quick-access/global-action markup from `GameContainer.svelte`.
- Verified `bun run --cwd pax-fluxia build` passes after the implementation and cleanup.

## Next Useful Follow-Ups

- Add a shorter task cookbook for common manual edits such as "move a rail", "change an icon", or "restyle the leaderboard".
- Refresh the guide again after the next structural HUD pass so the line anchors stay accurate.
- In the app UI, verify `Grid Gradient` at real match scale for readability, border dot taste, and performance on dense maps.

## Additional Completed Task

- Refreshed the worktree handoff so there is one current branch-level document for the audience shell and sidebar UX line.
- Recorded the consolidated branch state in `.agent/docs/plans/2026-05-13/HANDOFF_2026-05-13_AUDIENCE_SHELL_AND_SIDEBAR_UX.md`.
- Logged the handoff refresh in the matching 2026-05-13 session, chat, and takeaways docs.
