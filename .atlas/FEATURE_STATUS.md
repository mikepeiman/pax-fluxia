# Feature Status

## Active Bugs
| ID | Description | Status |
|----|-------------|--------|
| B-74 | Click-to-join room doesn't work (modal chain exists but join fails at runtime) | Open |
| B-75 | Room ID badge obscured by Top Bar (z-index/CSS) | Open |
| B-76 | Leaderboard shows 0/0 at game start in SP | Fixed (2026-02-17) |

## Planned Features
| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| F-39 | Player color enforcement: min 30° hue difference between players | High | Planned |
| F-40 | Player name enforcement: distinct names | High | Planned |
| F-41 | Animation streaming mode: ships depart at steady intervals (tickDuration / shipsToTransfer) | High | Planned |
| F-42 | Animation arc controls: configurable arcs at different points in travel path | High | Planned |
| F-43 | Animation timing controls from different points in animation (departure, travel, arrival) | High | Planned |
| F-44 | Lane convergence point UX improvement — make effect more visible/dramatic | Medium | Planned |
| F-45 | GAME_CONFIG auto-persist via Proxy | High | Done (2026-02-17) |
| F-46 | Spectator mode (R-124) — join as observer, take over AI/player | Low | Planned |
| F-47 | Territory alpha overlay | Low | Planned |

## Known Regressions
| ID | Description | Since |
|----|-------------|-------|
| B-74 | Click-to-join room (was supposedly fixed in B-70 but still broken) | 2026-02-17 |
