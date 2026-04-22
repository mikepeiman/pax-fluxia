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
- Added map-family metadata and editing:
  - saved maps now carry `familyId` / `familyName`
  - first saved copies of loaded maps inherit the original map as their family root
  - map metadata editing now exposes:
    - map type
    - family
    - categories
  - load modal now supports:
    - composable `Favorites`, `Map Type`, `Categories`, and `Family` filters
    - family visibility in map preview metadata
- Implemented the first portal-star slice for classic maps:
  - numeric classic map types now parse as `portal` stars with `portalGroup`
  - shared engine conquest now synchronizes ownership across all stars in the same portal group
  - portal groups are preserved through runtime map loading, server state, exports, and editor state
  - custom map editor now supports portal placement and portal-group assignment
  - gameplay stars, shared thumbnails, and main-menu map cards now render portals distinctly
  - targeted tests now cover:
    - `Boxed.txt` / `DSpokes.txt` numeric portal parsing
    - synchronized portal-group conquest behavior

## Next Technical Steps

- Compare current `master` against the exact worktree commit window that felt faster to the user.
- Replace owner-wide `metaball_grid` patch scope with true changed-front envelope scoping.
- Persist steady classification caches by geometry identity.
- Workerize reduced transition plan build only after spatial scope is correct.
- Split static/native `metaball_grid` paint from dynamic transition paint.
- Portal follow-up:
  - verify classic portal maps live in gameplay (`Boxed`, `DSpokes`, `CrissCross`, `Frontline`, `Arena`, `Crazy`)
  - add stronger main-game portal identity for up to 12 groups:
    - consistent group labels
    - higher-contrast family styling
    - animated blackhole / nebula VFX
  - decide whether gameplay needs any portal behavior beyond synchronized occupancy
  - add portal-group editing affordances to metadata/previews where helpful

## Logged Feature

- Added feature-idea tracking for a custom-map setup flow that preserves layout/connectivity while allowing SP/MP customization of player stars, ownership distribution, and starting ships.

## Artifacts

- [C:\Users\mikep\Desktop\WebDev\pax-fluxia\.agent\docs\plans\2026-04-22\GAMEPLAY_PERFORMANCE_STATUS_AND_NEXT_STEPS_2026-04-22.md](C:/Users/mikep/Desktop/WebDev/pax-fluxia/.agent/docs/plans/2026-04-22/GAMEPLAY_PERFORMANCE_STATUS_AND_NEXT_STEPS_2026-04-22.md)
- [C:\Users\mikep\Desktop\WebDev\pax-fluxia\.agent\docs\sessions\notes\SESSION_2026-04-22.md](C:/Users/mikep/Desktop/WebDev/pax-fluxia/.agent/docs/sessions/notes/SESSION_2026-04-22.md)
- [C:\Users\mikep\Desktop\WebDev\pax-fluxia\.agent\docs\sessions\chats\CHAT_2026-04-22.md](C:/Users/mikep/Desktop/WebDev/pax-fluxia/.agent/docs/sessions/chats/CHAT_2026-04-22.md)
