# Feature And Task Queue - 2026-04-20

- Make the bottom-right diagnostics panel follow normal overlay dismissal UX: toggle closed from the same icon, close on outside click, and close on `Escape`.
- Fix the in-game `End Game` action so surrender reliably surfaces the results overlay.
- Add a direct `Load Map` action to the main menu command band with a saved-map picker.
- Add a direct `Load Map` action to the in-game settings panel so maps can be restarted from settings.
- Verify whether a real custom map editor exists on this branch before wiring any main-menu entry; do not add a dead button.
