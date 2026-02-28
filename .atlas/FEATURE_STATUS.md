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
| B-94 | Conquest animation disjoint/jump — intermittent visual glitch | Fixed (2026-02-24) |
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
| F-56 | MP chat & lobby: lobby chat integrated into Main Menu, expandable to fullscreen; in-game chat panel (side in landscape, bottom in portrait) | High | Planned |
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
| F-76 | Arrow formation speed slider: control how fast conquest arrowhead ships reach target (tick-relative duration) | Medium | Planned |
| F-77 | Theme sub-modules: split themes into composable categories — Map Theme (star/Voronoi/halo visuals), Travel Theme (ship motion/curves/speed), Conquest Theme (animations/surge/settle), Static Theme (colors/sizes/scaling) — mix & match | High | Planned |
| F-78 | Mobile responsive main menu: remove overflow:hidden scroll blockers, clamp() responsive title, 480px/900px breakpoints, grid stacking | High | Done (2026-02-22) |
| F-79 | Mobile game UI: full-canvas layout, floating HUD, touch gestures, mini-leaderboard ribbon (pinnable L/R, shows rank/ships/damaged/production), controls ribbon, careful mobile typography | Critical | In Progress |
| F-80 | Fullscreen background: 6-layer system (CSS nebula gradients, animated drift, SVG starfield, AI nebula texture, PIXI procedural starfield, territory glow bleed) + hex grid fix | High | Done (2026-02-23) |
| F-81 | Mobile menu tab redesign: keep-mounted SP/MP tabs with `hidden` attr, CSS Grid desktop layout, shared-setup section | High | Done (2026-02-24) |
| F-82 | Background switcher: dropdown with thumbnails, reads `static/assets/`, localStorage persistence, floating picker button | Medium | Done (2026-02-24) |
| F-83 | Performance investigation: lag stutters ~1s intervals, needs profiling/triage | Critical | Open |
| F-84 | Responsive game UI: in-game layout adaptation for mobile/tablet viewports | Critical | Planned |
| F-85 | Map editor: visual editor for creating and editing game maps | High | Planned |
| F-86 | Territory halo overhaul: alpha clamp (0.6 max), linear tuning (500 ships/+0.5), configurable TERRITORY_LAYERS (1-12), TERRITORY_BLUR (GPU blur), stepped/linear mode selector | High | Done (2026-02-24) |
| F-87 | Density coloring hue fix: alternating +/- hue pattern → cumulative monotonic shift | Medium | Done (2026-02-24) |
| F-88 | Nebula game board background: replaced procedural starfield specks with faint menu nebula sprite (0.12 alpha, covers game world) | Medium | Done (2026-02-24) |
| F-89 | Pulsing corona ring: thicker glowing ring around star, pulse rate/size increases with ship count — heartbeat effect for powerful stars | Medium | Planned |
| F-90 | Gravitational lensing: PixiJS displacement filter warps nearby space around powerful stars, conveying mass/threat | Medium | Planned |
| F-91 | Particle aura: tiny fast-orbiting light motes (distinct from ship dots), count scales with ship power, player-colored | Medium | Planned |
| F-92 | Always-on MP lobby: every Main Menu visitor auto-joins a lobby; overflow auto-creates new lobbies. Lobby IS the Main Menu. No separate Create/Join flow | Critical | Planned |
| F-93 | Color palette picker: replace rainbow hue sliders with perceptual-distance palette (6-12 colors, adjustable anchor HSLA + count). Players pick, AI gets remainder | High | Planned |
| F-94 | Compact Main Menu controls: dual-thumb range slider for min/max links, compact label+slider widgets, space-efficient layout for mobile+desktop | High | Planned |
| F-95 | Double-tap empty space to pause/play (touch gesture) | Medium | Planned |
| F-96 | In-game floating settings gear icon: access UI options (leaderboard pin side, controls ribbon visibility) | Medium | Planned |
| F-97 | UI typography pass: better fonts, size/weight/spacing/padding/placement across all screens | High | Planned |

## Known Regressions
| ID | Description | Since |
|----|-------------|-------|
| B-84 | ALLOW_OPPOSING_ORDERS: deferred orders still create opposing flows on conquest even when flag is off | 2026-02-18 |
| B-85 | ~~Toggling USE_WALL_CLOCK_TRAVEL mid-game freezes traveling ships~~ | Resolved — wall-clock system removed (F-54) |
