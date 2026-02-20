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
| B-86 | No attacker attrition: attacking ships not destroyed proportional to received damage × Lethality | Investigating |
| B-87 | Conquest settlement ring has a gap — should form a perfect circle | Fixed (2026-02-18) |
| B-88 | Conquest ships fly to star AS a ring instead of arrow/wedge formation | Fixed (2026-02-18) |
| B-89 | Attack surge timing hiccup — ships teleport into surge position on new tick before easing back | Fixed (2026-02-18) |
| B-90 | Orb travel glitching — too many orbs spawned, need one per travel_duration with tick-bind toggle | Open |
| B-91 | Game-wide subtle animation hiccup — possibly related to tick boundary timing | Fixed (2026-02-18) |
| B-92 | Player orders randomly cancelled / opposing orders not enforced | Fixed (2026-02-18, refined) |
| B-93 | Deferred order chains not preserved — cannot reproduce, may be fixed by B-92 | Monitoring |
| B-94 | Conquest animation disjoint/jump — intermittent visual glitch | Open |
| B-95 | Leaderboard production stat always shows 0 in SP — not computed in updatePlayerStats | Fixed (2026-02-19) |

## Planned Features
| ID | Feature | Status |
|----|---------|--------|
| F-60 | Two-column control panel layout (timing panel in second column) | In Progress |
| F-61 | Drag-and-drop control panel reordering library | Roadmap |
| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| F-39 | Player color enforcement: min 30° hue difference | High | Done (SP + MP lobby) |
| F-40 | Player name enforcement: distinct names | High | Done (SP + MP lobby) |
| F-41 | Animation streaming mode (DEPART_STAGGER) | High | Done (2026-02-17) |
| F-42 | Per-phase arc controls (DEPART_ARC, ARRIVAL_ARC) | High | Partial — config + UI done, behaviors not wired |
| F-44 | Lane convergence point UX improvement | Medium | Planned |
| F-45 | GAME_CONFIG auto-persist via Proxy | High | Done (2026-02-17) |
| R-124 | Spectator-first takeover: join as spectator, observe game, click player to take over | High | Planned |
| F-47 | Territory alpha overlay (Voronoi-based player control mask) | High | Planned (today) |
| F-48 | Per-player VFX themes: each player has own visual/GX settings without affecting others in MP | High | Planned |
| F-49 | Arrowhead conquest animation: wedge formation → lane travel → engulf → spiral settle w/ full tuning UI | High | Done (2026-02-17) |
| F-50 | Split repair suppression: independent attacker (default 50%) and defender (default 90%) sliders for pinning tactics | High | Planned |
| F-51 | Controls UI readability pass: brighter/larger fonts, denser layout, improved scannability | High | Done (2026-02-18) |
| F-52 | Tick progress indicator independent of Animation Speed — only uses game tick duration | High | Planned (today) |
| F-53 | Resizable controls drawer + drag-to-resize handle (280-600px, persisted) | Medium | Done (2026-02-18) |
| F-54 | Single-clock refactor: remove wall-time system, all VFX use game clock | High | Done (2026-02-18) |
| F-55 | Multiplayer rejoin game: reconnect to in-progress game after disconnect | High | Planned (today) |
| F-56 | Server chat & lobby chat: in-game and pre-game text communication | High | Planned (today) |
| F-57 | Game notifications: email/app/SMS alerts when someone creates a game | Medium | Planned |
| F-58 | Game host wait timer: host sets duration to wait before starting, allowing players to join | Medium | Planned |
| F-59 | Settings panel: icons beside sliders on right, larger+brighter icons, 2-per-row at wide width | Medium | Planned |
| F-62 | Game end overlay: keep map visible under results modal, allow closing modal to see ended game | High | Done (2026-02-19) |
| F-63 | Theme selector: improve display/discoverability in UI | Medium | Done (2026-02-19) |
| F-64 | Surrender-to-AI: on surrender, transfer ships to new AI, player stays as spectator | High | Planned |
| F-65 | MP setup variables: wire all game settings (map, difficulty, AI config) to MP room creation — currently only # players works | High | Planned |
| F-66 | MP room disposal: creator can dispose room only if unoccupied | Medium | Done (2026-02-19) |
| F-67 | In-game AI takeover: join existing room mid-game, take over AI player, require player name | High | Planned |
| F-68 | Color conflict checking at init: enforce perceptual distance (CIEDE2000 ΔE≥30 or min 30° hue) between all players | High | Planned |
| F-69 | Main menu player identity widget: consolidate name + color into single widget above AI selections, persist to localStorage | High | Planned |
| F-70 | Save & Load Maps: save maps (including randomly-generated) to user local collection in localStorage | High | Done (2026-02-19) |
| F-71 | Restart modal: prompt reuse map or generate new + same starting positions or new (default: reuse same map setup) | High | Done (2026-02-19) |
| F-72 | Composable conquest modes: TRAVEL_MODE × CLAIM_MODE — mix any travel animation with any claim animation | High | Planned |
| F-73 | Save & load custom themes: user can save current theme config to named presets and load from in-game settings | Medium | Done (2026-02-19) |
| F-74 | Neutral stars in random maps: toggle neutral stars, players get 1 starting star, all players start on same star type (star type = menu option) | High | Planned |
| F-75 | Player color contrast check: ensure min luminance vs dark background, auto-lighten dark colors, glow outline for ship visibility | High | Done (2026-02-19) |

## Known Regressions
| ID | Description | Since |
|----|-------------|-------|
| B-84 | ALLOW_OPPOSING_ORDERS: deferred orders still create opposing flows on conquest even when flag is off | 2026-02-18 |
| B-85 | ~~Toggling USE_WALL_CLOCK_TRAVEL mid-game freezes traveling ships~~ | Resolved — wall-clock system removed (F-54) |
