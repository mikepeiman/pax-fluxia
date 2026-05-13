# Takeaways - 2026-05-07 - Sidebar Menu UX Redesign

## Lessons
- The user-specified surface matters as much as the feature itself. Moving the right feature to the wrong panel is still a failure.
- Player-facing theme management cannot surface internal routing/debug vocabulary.
- In a narrow strategy-game sidebar, stacked action rows are safer than equal-weight card grids.

## Decisions
- Keep `Map / Game + Map / Session` in the always-open right sidebar.
- Keep audience toggles in the topbar.
- Keep theme import/export available, but present them with standard menu UX.

## Follow-Up
- If the user wants another pass, the next refinement is to expand save/load drawers inline from the specific action row rather than in a shared block below the stack.
