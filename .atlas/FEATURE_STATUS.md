# Feature Status

## Active Bugs
| ID | Description | Status |
|----|-------------|--------|
| B-74 | Click-to-join room — z-index fix | Fixed (2026-02-17) |
| B-75 | Room ID badge obscured by Top Bar (z-index/CSS) | Open |
| B-76 | Leaderboard shows 0/0 at game start in SP | Fixed (2026-02-17) |
| B-77 | Name/color enforcement missing for takeover path | Fixed (2026-02-17) |
| B-78 | Per-phase arc values (DEPART_ARC, ARRIVAL_ARC) not wired into behaviors | Open |
| B-79 | Convergence point effect too subtle to see | Fixed (2026-02-17) |
| B-83 | Arrival disjoint/rewind — ships jump back near destination | Investigating |

## Planned Features
| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| F-39 | Player color enforcement: min 30° hue difference | High | Done (SP + MP lobby) |
| F-40 | Player name enforcement: distinct names | High | Done (SP + MP lobby) |
| F-41 | Animation streaming mode (DEPART_STAGGER) | High | Done (2026-02-17) |
| F-42 | Per-phase arc controls (DEPART_ARC, ARRIVAL_ARC) | High | Partial — config + UI done, behaviors not wired |
| F-44 | Lane convergence point UX improvement | Medium | Planned |
| F-45 | GAME_CONFIG auto-persist via Proxy | High | Done (2026-02-17) |
| R-124 | Spectator-first takeover: join as spectator, observe game, click player to take over | High | Planned |
| F-47 | Territory alpha overlay | Low | Planned |
| F-48 | Per-player VFX themes: each player has own visual/GX settings without affecting others in MP | High | Planned |
| F-49 | Arrowhead conquest animation: wedge formation → lane travel → engulf → spiral settle w/ full tuning UI | High | Done (2026-02-17) |
| F-50 | Split repair suppression: independent attacker (default 50%) and defender (default 90%) sliders for pinning tactics | High | Planned |
| F-51 | Controls UI readability pass: brighter/larger fonts, denser layout, improved scannability | High | Planned (today) |
| F-52 | Tick progress indicator independent of Animation Speed — only uses game tick duration | High | Planned (today) |
| F-53 | Resizable controls drawer + side-by-side control layout when width permits | Medium | Planned |
| F-54 | Single-clock refactor: remove wall-time system, all VFX use game clock | High | Done (2026-02-18) |

## Known Regressions
| ID | Description | Since |
|----|-------------|-------|
| B-84 | ALLOW_OPPOSING_ORDERS: deferred orders still create opposing flows on conquest even when flag is off | 2026-02-18 |
| B-85 | ~~Toggling USE_WALL_CLOCK_TRAVEL mid-game freezes traveling ships~~ | Resolved — wall-clock system removed (F-54) |
