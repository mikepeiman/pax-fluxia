# Feature & Regression Tracker

**Last Updated**: 2026-02-08  
**Last Verified By**: User (partial — see Status column)

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | User-verified working |
| ❓ | Agent-implemented, not user-verified |
| ❌ | User-confirmed broken |

---

## Core Gameplay (C)

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| C-1 | Start Game | ✅ | Menu → Game transition |
| C-2 | Pause/Resume | ❓ | Orbit + traveling ship freeze added (`60395be`) |
| C-3 | Speed Control (1x-50x) | ✅ | |
| C-4 | Win/Lose Detection | ✅ | |
| C-5 | Replay / Return to Menu | ✅ | SP only. MP restart broken (see B-18) |

---

## Input / Controls (I)

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| I-1 | Click-to-Select Star | ✅ | |
| I-2 | Drag-to-Attack | ✅ | |
| I-3 | Click-Click Attack | ✅ | |
| I-4 | Right-Click Cancel | ✅ | |
| I-5 | Command Issue Speed | ❓ | Uses `pendingOrders` for optimistic UI |
| I-6 | Vector Arrow Display | ❓ | Uses `pendingOrders` for instant rendering |

---

## Combat Mechanics (M)

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| M-1 | Attrition (per-tick damage) | ❓ | V4 symmetric formula. UI sliders wired via `CombatConfigOverride` (`441010d`) |
| M-2 | Conquest (star capture) | ❓ | Per-player aggregation via `shipsByOwner` map (`43cd2fc`) |
| M-3 | Conquest Threshold | ✅ | User verified 2026-02-08 |
| M-4 | Retreat (directed) | ❓ | 35% capture rate. Needs user verification |
| M-5 | Scatter (escape routes) | ❓ | Uses star connections. Needs user verification |
| M-6 | Ship Transfer Rate | ✅ | Slider step changed to 1% (`441010d`) |
| M-7 | Repair (damaged → active) | ✅ | User verified 2026-02-08 |
| M-8 | Production (ship spawn) | ✅ | |
| M-9 | Order Persistence | ❓ | Orders persist until cancelled; `clearTarget` guard removed |
| M-10 | Order Cancel on 3rd-Party Conquest | ❓ | Chained orders also cancelled (`60395be`) |

---

## Visual / Animation (V)

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| V-1 | Ship Orbit (idle) | ✅ | |
| V-2 | Ship Transfer (flow along lanes) | ❓ | Unified lifecycle: orbit→depart→travel→arrive |
| V-3 | Tick Orb Pulse | ✅ | |
| V-4 | Star Glow / Selection | ✅ | |

---

## Control Panel Sliders (P)

| ID | Slider | Status | Notes |
|----|--------|--------|-------|
| P-1 | Transfer Rate | ✅ | Step=1%, min=1%. Writes `GAME_CONFIG.TRANSFER_RATE` (÷100) |
| P-2 | Aggressor Advantage | ❓ | Wired via `CombatConfigOverride` (`441010d`) |
| P-3 | Damage Per Ship | ❓ | Wired via `CombatConfigOverride` (`441010d`) |
| P-4 | Lethality | ❓ | Wired via `CombatConfigOverride` (`441010d`) |
| P-5 | Force Ratio Effect | ❓ | Wired via `CombatConfigOverride` (`441010d`) |
| P-6 | Conquest Threshold | ✅ | Reads directly from `GAME_CONFIG` in GameEngine |
| P-7 | Conquest Transfer % | ❓ | Reads from `GAME_CONFIG` |
| P-8 | Retreat Capture Rate | ❓ | Reads from `GAME_CONFIG` |
| P-9 | Scatter Capture Rate | ❓ | Reads from `GAME_CONFIG` |
| P-10 | Scatter Destroy Rate | ❓ | Reads from `GAME_CONFIG` |
| P-11 | Damaged Ship Effectiveness | ❓ | Reads from `GAME_CONFIG` |
| P-12 | Repair Rate | ❓ | Reads from `GAME_CONFIG` |
| P-13 | AI Attack Threshold | ❓ | Reads from `GAME_CONFIG` in `AI.ts` |
| P-14 | AI Desist Threshold | ❓ | Reads from `GAME_CONFIG` in `AI.ts` |
| P-15 | AI Random Aggression | ❓ | Reads from `GAME_CONFIG` in `AI.ts` |
| P-16 | AI Tactical Aggression | ❓ | Reads from `GAME_CONFIG` in `AI.ts` |
| P-17 | Arrow Length | ❓ | `ARROW_LENGTH_FRACTION` (10-100%), default 50% (`d38cdba`) |

---

## Open Bugs — SP (B)

| ID | Issue |
|----|-------|
| B-9 | Conquest ship bloom — captured ships appear from star center instead of transfer visual |

## Open Bugs — MP (B)

| ID | Issue |
|----|-------|
| B-23 | Play/pause outline not updating correctly (pending user verification) |
| B-26 | MP variables not wired: most exposed config variables have no effect in MP |
| B-27 | Star spacing not working in SP or MP — minimum spacing should be star diameter + 5 ship orbit layers + buffer |

## Resolved Bugs (B)

| ID | Issue | Resolution | Ref |
|----|-------|------------|-----|
| B-1 | Command input lag | `pendingOrders` optimistic UI | 2026-02-02 |
| B-2 | Vector arrow delay | Same fix as B-1 | 2026-02-02 |
| B-4 | Star selection sticking | Fixed | 2026-02-07 |
| B-5 | Multi-star conquest grouping | Per-player `shipsByOwner` map | `43cd2fc` |
| B-7 | Attack orders persist after 3rd-party conquest | Orders cancelled on conquest | `60395be` |
| B-10 | Pause doesn't freeze orbits | `animationTime` + `departTime` frozen | `60395be` |
| B-11 | Combat sliders disconnected | `CombatConfigOverride` parameter | `441010d` |
| B-8 | Attack travel animation on attacks | Only animate friendly transfers, not attacks | `d38cdba` |
| B-12 | Map lane minimum angle | 15° min angle filter in Phase 3 of `generateStarConnections` + server | `d38cdba` |
| B-16 | Lane passes under star | Phase 4: point-to-segment clearance filter (35px), client + server | re-fixed |
| B-26 | Star click targets wrong star on dense maps | `hitTestStar` finds nearest star, not first in array | `1fd62b6` |
| B-17 | Command arrows reach target | `ARROW_LENGTH_FRACTION` config + slider (default 50%) | `d38cdba` |
| B-13 | Spacebar doesn't work in MP | Routed spacebar through `activeGameStore` | `01a8b23` |
| B-19 | Arrows to non-connected stars | Added connection validation to drag-end | `01a8b23` |
| B-20 | Tick length regression | Split into Tick Interval + Animation Speed | `b8c406b` |
| B-21 | MP HUD wiring | startGame/hasStarted/leaderboard via activeGameStore | `b8c406b` |
| B-22 | MP no player colors | id/sessionId mismatch in getPlayerColor | `8a6eaab` |
| B-24 | Leaderboard highlights wrong player | Check sessionId for MP, removed :first-child | `8a6eaab` |
| B-25 | Game over screen empty in MP | MP history accumulation + unified ResultsModal | `a91f17d` |
| B-3 | Passthrough orders | Already implemented in GameCanvas + shared engine | `a91f17d` |
| B-6 | Transfer rate equilibrium | `Math.ceil` + `TRANSFER_RATE × star-type speed` | `e42320c` |
| B-14 | Combat logs empty in MP | Fed from server tickEvents | `8329f4a` |
| B-15 | Multi-star conquest aggregation | Already implemented in shared GameEngine | `a91f17d` |
| B-18 | Restart button broken in MP | Routed through activeGameStore | `a91f17d` |

---

## Planned Features — Implemented, Needs Verification (F)

| ID | Feature | Commit/Date |
|----|---------|-------------|
| F-1 | Audio System (Tone.js) | 2026-02-03 |
| F-2 | Star Distance Slider | 2026-02-03 |
| F-3 | Passthrough Orders (UI) | 2026-02-03 |
| F-4 | Combat Log: player owners | 2026-02-07 |
| F-5 | Chain Conquest Fix | 2026-02-07 |
| F-6 | Ship Transfer Animations | 2026-02-08 |
| F-7 | Conquer-Scatter Animations | 2026-02-08 |
| F-8 | Retreat Animations | 2026-02-08 |
| F-9 | Logging Levels (8 categories) | 2026-02-07 |
| F-10 | Combat Log: captured/escaped/destroyed | 2026-02-07 |
| F-11 | Combat Log: "You" filter | 2026-02-07 |
| F-12 | Damaged Ships Defense slider | 2026-02-07 |

## Planned Features — Not Started (R)

| ID | Feature | Priority |
|----|---------|----------|
| R-1 | AI: Frontline Forces | 🟢 |
| R-2 | AI: Match Opposing Forces | 🟢 |
| R-3 | AI: Evenly-Distributed | 🟢 |
| R-4 | AI: Backline-and-Pounce | 🟢 |
| R-5 | AI: Tactical Surround | 🟢 |
| R-6 | AI: Star Type Awareness | 🟢 |
| R-7 | AI: Pre-Conquest Retreat | 🟢 |
| R-8 | Conquest Stats Popup (pause + stats card) | 🟢 |
| R-9 | Slow-Mo Debug Mode | 🟢 |
| R-10 | Animation Style Toggle | 🟢 |
| R-11 | Ship Color Fade (mid-travel) | 🟢 |
| R-12 | Damaged Ship Overlapping Orbits | 🟢 |
| R-13 | Scrollwheel Zoom | 🟡 |
| R-14 | Performance Audit | 🟡 |
| R-15 | Multiplayer Deployment (get online for human playtesting) | 🔴 |
| V-3 | Territory Alpha Masks (Voronoi/gradient ownership overlays) | 🔴 |
| V-4 | Travel Animation Polish (elegant, smooth, satisfying feel) | 🔴 |
| R-16 | Percentage Directives | 🔵 |
| R-17 | Command Arrow Styles | 🔵 |
| R-18 | Custom Map Editor | 🔵 |
| R-19 | Imperative Animation Events (architectural) | 🔴 |
| R-20 | Star Upgrades (spend ships to upgrade) | 🔵 |
| R-21 | Star Hybrids / Multi-classing | 🔵 |
| R-22 | Spectator Mode (MP) | 🟡 |
| R-23 | Take Over AI Player (MP) | 🟡 |
| R-24 | Vote System for MP Settings | 🟡 |
| R-25 | Multiple Targets / Branching Orders | 🔵 |
| R-26 | Conditional Orders (trigger on conquest) | 🔵 |
| R-27 | Strategic Patterns (auto-behavior algorithms) | 🔵 |
| R-28 | Last-Stand Resistance Mode | 🟢 |
| R-29 | Captured Ship Activation Rate Slider | 🟢 |
| R-30 | Deferred Order Arrows Overlay Priority | 🟢 |
| R-31 | Tick Length Control Panel Slider | 🟢 |
| R-32 | End-Game Screen Enlargement + Better Charts | 🟡 |
| R-33 | Damaged Ships Never Destroyed (design rule) | 🟢 |
| R-34 | AST-Based Bidirectional Documentation | 🔵 |
| R-35 | Conquest Pause + Stats Card Popup | 🟢 |
| R-36 | Damaged Ship Visual Density Tiers (overlapping orbits) | 🟢 |
| R-37 | Full Engine Unification: server uses shared GameEngine for map generation | 🔴 |
| R-38 | Ship Orbit Density: limit to 5 layers, scale colors max 5000 ships, enlarge on overflow | 🔴 |
| R-39 | Power Density VFX: animations/effects for increasing fleet power at stars | 🔴 |
| R-40 | Leaderboard: emphasize TOTAL SHIPS first, then active/damaged fraction | 🟢 |
| R-41 | Surrender Modal: End Game (results) or Abandon (main menu) — replaces raw button | 🟢 |
| R-42 | Player Stats Console: bottom-up drawer replacing combat log, shows live dynamics | 🔴 |
| R-43 | SP/MP Full Parity: ONE GAME — eliminate all divergent UI, logic, and settings paths | 🔴 |
| R-44 | AI Difficulty Levels + Strategy/Posture Options (clearly specified behaviors) | 🔴 |
| R-45 | Star Spacing Formula: min = diameter + 5 orbits + adjustable buffer (e.g. 20px) | 🟢 |
| R-46 | Orbit Density Controls: exposed in-game variable for orbit layer/scale tuning | 🟢 |

---

## Session Log

| Date | Summary |
|------|---------|
| 2026-02-10 | Documented 9 new items from user: orbit density (R-38/R-39/R-46), leaderboard (R-40), surrender modal (R-41), player stats console (R-42), SP/MP parity (R-43), AI difficulty (R-44), star spacing (R-45/B-27), MP variable wiring (B-26). |
| 2026-02-09 | Unified game settings: MP lobby now has same settings as SP (stars/player, ships/star, spacing, links). Server `initStandardMap` reads from `RoomOptions`. Star count fix: adaptive spacing retry + adaptive hex radius. |
| 2026-02-08 | Batch 1 fixes: B-8 (no attack travel anim), B-12 (15° lane angle), B-16 (lane gaps around stars), B-17 (arrow length slider). |
| 2026-02-08 | Ship animation redesign: unified lifecycle (orbit→depart→travel→arrive). Scatter uses real connections. |
| 2026-02-08 | Combat slider wiring (`CombatConfigOverride`). Transfer rate slider step 5→1. MECHANICS.md canonical rewrite. Multi-star per-player aggregation. Pause freeze. Order cancel on conquest. |
| 2026-02-08 | Ship animation redesign: unified lifecycle (orbit→depart→travel→arrive). Scatter uses real connections. |
| 2026-02-07 | Star selection fix, combat log enhancements, My Battles filter, DAMAGED_SHIP_EFFECTIVENESS slider, logging levels, root README. |
| 2026-02-07 | Protocol audit, comprehensive game spec, dev history, doc-everything rule. |
| 2026-02-07 | Engine Convergence Phase 2. MP connection constraint fix. |
| 2026-02-07 | Colyseus multiplayer: star ownership via sessionId. |
| 2026-02-03 | Audio system, passthrough orders, star spacing slider. |
| 2026-02-02 | Scatter/escape connections fix. Competing orders fix. |
| 2026-02-02 | Right-click cancel, ship disappear fix, attack damage fix. |
| 2026-02-02 | Command lag fix via pendingOrders. Created tracker. |
| 2026-02-01 | V3.1 combat + individual ship animation. |
