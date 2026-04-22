# Feature And Task Queue - 2026-04-22

## Provenance

### Primary Ledger

Current `master` day ledger for gameplay performance follow-up and map-editor stabilization work.

## Active Priorities

- Reduce late-game gameplay cost, especially `metaball_grid` transition planning.
- Stabilize custom map editor selection and paint workflows.
- Keep feature logging current for the planned non-layout custom-map setup flow.

## Completed Today

- Refreshed [C:\Users\mikep\Desktop\WebDev\pax-fluxia\.agent\AGENT.md](C:/Users/mikep/Desktop/WebDev/pax-fluxia/.agent/AGENT.md) context before work.
- Recorded current gameplay performance status and next-step proposals in:
  - [C:\Users\mikep\Desktop\WebDev\pax-fluxia\.agent\docs\plans\2026-04-22\GAMEPLAY_PERFORMANCE_STATUS_AND_NEXT_STEPS_2026-04-22.md](C:/Users/mikep/Desktop/WebDev/pax-fluxia/.agent/docs/plans/2026-04-22/GAMEPLAY_PERFORMANCE_STATUS_AND_NEXT_STEPS_2026-04-22.md)
- Fixed custom map editor interaction regressions:
  - tool-panel state no longer blocks board interaction
  - `Paint Fleets` can be used as a practical click / drag-through brush again
  - `Paint Fleets` and `Paint Ownership` now support explicit apply-to-selection actions
  - `Shift` additive star selection works again
  - bounding-box multi-select exists
- Reworked map-editor map categorization and load-modal actions:
  - introduced explicit map `category` metadata with `Classic | Custom | Test`
  - repository map coercion now keeps runtime built-ins as `Classic`, fixture maps as `Test`, and saved/editor maps as `Custom`
  - load modal filters now use map category instead of stale built-in/source buckets
  - added per-map favorites
  - added right-click context menu actions for map cards:
    - rename
    - export
    - duplicate
    - delete
  - rename/duplicate from `Classic` or `Test` now saves a `Custom` copy instead of mutating source maps

## Next Technical Steps

- Compare current `master` against the exact worktree commit window that felt faster to the user.
- Replace owner-wide `metaball_grid` patch scope with true changed-front envelope scoping.
- Persist steady classification caches by geometry identity.
- Workerize reduced transition plan build only after spatial scope is correct.
- Split static/native `metaball_grid` paint from dynamic transition paint.

## Logged Feature

- Added feature-idea tracking for a custom-map setup flow that preserves layout/connectivity while allowing SP/MP customization of player stars, ownership distribution, and starting ships.

## Artifacts

- [C:\Users\mikep\Desktop\WebDev\pax-fluxia\.agent\docs\plans\2026-04-22\GAMEPLAY_PERFORMANCE_STATUS_AND_NEXT_STEPS_2026-04-22.md](C:/Users/mikep/Desktop/WebDev/pax-fluxia/.agent/docs/plans/2026-04-22/GAMEPLAY_PERFORMANCE_STATUS_AND_NEXT_STEPS_2026-04-22.md)
- [C:\Users\mikep\Desktop\WebDev\pax-fluxia\.agent\docs\sessions\notes\SESSION_2026-04-22.md](C:/Users/mikep/Desktop/WebDev/pax-fluxia/.agent/docs/sessions/notes/SESSION_2026-04-22.md)
- [C:\Users\mikep\Desktop\WebDev\pax-fluxia\.agent\docs\sessions\chats\CHAT_2026-04-22.md](C:/Users/mikep/Desktop/WebDev/pax-fluxia/.agent/docs/sessions/chats/CHAT_2026-04-22.md)
