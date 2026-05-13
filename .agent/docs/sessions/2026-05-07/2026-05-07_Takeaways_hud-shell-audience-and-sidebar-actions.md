# Takeaways - 2026-05-07 - HUD Shell Audience And Sidebar Actions

## Lessons
- Shell policy belongs to the shell. If `GameContainer.svelte` is gating topbar buttons and sidebar menu items, then `GameSettingsPanel.svelte` should not own a separate private copy of audience state.
- When a user names a specific UI surface, treat that as hard specification. `Settings panel` and `right sidebar menu` are different products, not interchangeable containers.
- For this codebase, safer correction sometimes means hiding a wrong block behind `{#if false}` first, then cleaning dead code after the user confirms the restored surface direction.

## Risks Remaining
- The right-sidebar action cards may need a breakpoint adjustment if the sidebar is resized very narrow.
- `GameSettingsPanel.svelte` still has hidden fallback blocks and now-unused CSS that should be removed after confirmation.

## Verification Cues
- In game on desktop, look at the topbar first for `Dev/Public`, `Advanced`, and `Internal`.
- In game on desktop, look at the right sidebar menu below the leaderboard for grouped `Map`, `Game + Map`, and `Session` actions.
- In Settings, confirm those player action controls are gone.
