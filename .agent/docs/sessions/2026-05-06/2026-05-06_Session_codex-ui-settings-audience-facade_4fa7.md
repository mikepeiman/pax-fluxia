# Session - 2026-05-06

## Audience facade implementation

- Continued the player/developer-split thread after the user rejected a global mode architecture.
- Locked the new framing:
  - one runtime
  - one codebase
  - shell exposure policy only
- Implemented a shared `audience` policy module with:
  - persisted advanced visibility
  - persisted internal-tool unlock
  - query-param compatibility for legacy diagnostics and benchmark entry points
- Reclassified settings sections by audience and applied that policy to:
  - settings visibility
  - in-game diagnostics affordances
  - landing-route startup diagnostics
  - benchmark bridge enablement
- Preserved player-facing product surfaces:
  - `MainMenu`
  - `/map-editor`
- Wired the main-menu command bar to the map editor and map-selection panel.
- Validation status:
  - `bunx vitest run src/lib/shell/audience.test.ts` passed
  - `bun run build` passed
  - `bun run check` still fails on broad pre-existing repo drift; touched-file output was limited to existing unused CSS selector warnings in `GameSettingsPanel.svelte`
