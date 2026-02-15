# Feature & Regression Tracker

**Last Updated**: 2026-02-14  
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
| C-6 | Game Over Screen | ❌ | No Game Over screen on full conquest in MP. Need modal: View Results or Keep Playing |

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
| V-5 | Facing Departure (orbit dance) | ❓ | Toggle in Animation Tuning, OFF by default. Sort+splice causes dance effect |
| V-6 | Orbit Bias Oscillation | ❓ | Min/Max/Freq controls. Oscillates bias strength per tick frequency |
| V-7 | Smooth Departure Easing | ❓ | easeInOutQuad replaces easeInCubic for smoother departure |

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
| P-18 | Facing Departure Toggle | ❓ | `FACING_DEPARTURE` checkbox in Animation Tuning |
| P-19 | Oscillate Bias Toggle | ❓ | `ORBIT_BIAS_OSCILLATE` checkbox + Min/Max/Freq sliders |
| P-20 | Global Production | ❓ | `BASE_PRODUCTION` slider (0-3) in Global Bonuses section |
| P-21 | Global Repair | ❓ | `REPAIR_RATE` slider (0-1) in Global Bonuses section |
| P-22 | Global Defense | ❓ | `AGGRESSOR_ADVANTAGE` slider (0.1-2) in Global Bonuses section |
| P-23 | Global Attack | ❓ | `DAMAGE_PER_SHIP` slider (0-0.5) in Global Bonuses section |

---

## Open Bugs — SP (B)

| ID | Issue |
|----|-------|
| B-9 | Conquest ships render as production bloom — new ships at conquered star spawn from center and spiral out over multiple ticks instead of appearing instantly. Root: `GameCanvas.svelte` lines 1412-1440 use identical spawn logic for production and conquest. Needs distinct conquest path. |
| B-24 | Erratic repair rates: user reports 200→120 damaged in single tick, rates varying 5-50%. Dataflow logging added to `applyRepair()` — console output shows star type, rate, typeMult, pinning, overflow. Investigate with StarInfoPanel + console. |
| B-25 | Lag when selecting enemy stars to issue deferred orders. **User reiterated 2026-02-14: "Make it so I can, zero lag like regular orders. Same functions."** Needs same zero-lag path as regular click-click orders. |
| B-26 | Game engine continues running after client dev server reloads (HMR). Console logs keep generating. `GameEngine.destroy()` may not be called on unmount. |
| B-27 | ~~Travel animation converge/flatten~~ **FIXED**: single-pass bezier arc from orbit to destination, no lane-start convergence. |
| B-28 | Active ships drop to zero on attack — disproportionate to weaker attacker. **Confirmed repeated**: AI with 70 ships attacks stronger player → instantly zeroed. Math shows ~14 damage/tick max — shouldn't happen. Suspect star-type defense multiplier, simultaneous transfer drain, or visual sync bug. Needs combat tick logging to isolate. |
| B-29 | ~~Pause/play freezes attack surge~~ **FIXED**: tickProgress now uses `BASE_TICK_MS` instead of `ANIMATION_SPEED_MS` — eliminates dead zone where `sin(π)=0`. |
| B-30 | Cancelling attack order snaps ships back to orbit instantly instead of easing back smoothly. **User added 2026-02-14**: mid-surge order change — ships should adjust destinations but NOT present locations. Complete the surge cycle always, then smoothly animate back to orbit before reorienting to new target. |
| B-38 | ~~Cannot chain click-click commands~~ **FIXED**: stale `dragStartX/Y` in `handlePointerDown` caused `movedSignificantly` to eat clicks. Reset drag state in all branches. User-confirmed working `d76af73`. |
| B-39 | ~~Intermittent star unresponsiveness~~ **FIXED**: stale drag state (`d76af73`). Residual intermittent issues may have been OS-level — Windows desktop apps (Perplexity Electron, Antigravity) suspected of causing pointer event interference. |
| B-40 | Controls Icon Menu not responding when DevTools drawer is open. Works again when DevTools closed. Likely z-index or focus/pointer-events issue with DevTools panel overlay. |
| B-41 | Deferred orders can be set in both directions between two stars (A→B and B→A). Same exclusivity rule as active orders should apply — flow can only go one direction at a time between any pair. |

## Open Bugs — MP (B)

| ID | Issue |
|----|-------|
| B-23 | Play/pause outline not updating correctly (pending user verification) |
| B-43 | **MP Restart kicks to SP menu**: Restart sends both players to SP main menu instead of staying in MP lobby. Server resets to `lobby` phase correctly but client shows wrong view |
| B-44 | **MP 2nd player order control broken**: Cannot cancel or redirect an order once set during pause |
| B-46 | **Room disposal should use 5min timer**: Rooms should stay alive for 5 minutes after last human leaves, allowing reconnection |

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
| B-27 | Conquest double-counting damaged ships | Damaged ships were counted in `defenderTotal * captureRate` AND again via `CONQUEST_DAMAGED_CAPTURE_RATE`, inflating captured ships by 300-400. Fixed by setting `result.shipsCaptured` inside each branch, removing redundant recalc. | 2026-02-12 |
| B-26 | MP variables not wired | Phase A config pipeline: `buildEngineConfig()` → `RoomOptions` → server `engineConfig` → `GameEngine.tick()` | 2026-02-10 |
| B-28 | Tone.js progressive lag | Tone.js removed entirely, AudioManager stubbed to no-ops | 2026-02-10 |
| B-18 | Restart button broken in MP | Routed through activeGameStore | `a91f17d` |
| B-29 | Multi-star conquest: victor ships only transfer from one star | ConquestEvent has single `attackerStarId`, need per-star proportional transfer | OPEN |
| B-30 | Deferred orders on enemy stars: clicking enemy star doesn't allow setting deferred orders | Need same zero-lag path as regular orders | OPEN |
| B-31 | Attack surge activates on order, not on tick | `isAttack` checks `star.targetId` (set on order), should only surge after first combat tick. **User 2026-02-14**: "when issuing order, ships jump into attack surge before animation continues smoothly" | OPEN |
| B-32 | Mid-surge order change teleports ships | Ships should complete current surge cycle ALWAYS before reorienting. "They should adjust their destinations but not their present locations, and smoothly animate back into orbit (complete the surge always) before reorienting to the new target" | OPEN |
| B-33 | Ships jump into attack surge before animation continues smoothly | Ramp-in not working visibly; initial frame snap | OPEN |
| B-34 | Conquest: victor ships wait entire tick to appear | Should appear within conquest tick, not next tick | OPEN |
| B-35 | AI passive in MP: no difficulty settings exposed, AI uses default (easy) config | Server needs AI difficulty from RoomOptions | OPEN |
| B-36 | MP quit/abandon buttons restart game instead of returning to main menu | Should route to main menu, not restart | OPEN |
| B-37 | MP pause resets tick counter and animations | Pause/resume loses tick progress, animations snap | OPEN |
| B-46 | **"Ship travel duration" slider does nothing** | Setting has no effect. Note: "travel duration" MULTIPLIER does work but only on Bezier mode (see B-51). Increase range to 10x for more variety | OPEN |
| B-47 | **"Arc intensity" slider does nothing** | Setting has no effect | OPEN |
| B-48 | **"Settle time" slider does nothing** | Setting has no visible effect | OPEN |
| B-49 | **"Arrival spread" makes ships invisible** | Increasing turns arrivals invisible; reduced to zero looks normal. Purpose unclear to user | OPEN |
| B-50 | **"Wobble amp" and "Depart jitter" unclear** | User unsure what they do or if they work | OPEN |
| B-51 | **Travel Duration only works on Bezier mode, not Lane** | All settings must be interoperable across travel modes. May need function updates to include variables | OPEN |
| B-52 | **Outline color in Ship Look does nothing useful** | Cannot change colors. Need HSLA controls modifying player primary color for accents | OPEN |
| B-53 | **No glow effect exists** | Ship glow was never implemented despite UI presence | OPEN |
| B-54 | **Star Radius never worked** | Slider has no visible effect | OPEN |
| B-55 | **Game ends before complete conquest** | Abrupt and unsatisfying. Should show modal offering View Results or Keep Playing | OPEN |
| B-56 | **Custom player colors not applied in MP** | `playerColors` wired through `GameEngine` (SP only). Server `GameRoom.ts` has its own hardcoded `PLAYER_COLORS` array at line 19, ignoring client hue selections. Part of broader unification gap: game init logic should import from `common/`. | OPEN |
| B-57 | **Intermittent: active ships drop to 0 too fast when counterattacking** | Scenario: 50 active + 500 damaged, counterattack causes active to hit 0 immediately. Possibly damage applied to activeShips pool exceeds actual active count in one tick. Hard to reproduce — awaiting exact numbers from user. Custom map editor will help reproduce. | OPEN |

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
| F-13 | Conquest Logging (per-player totals, ship disposition, UI toggle) | 2026-02-12 |
| F-14 | Combat Formula Logging (full step-by-step formula in console) | 2026-02-12 |
| F-15 | Dominant Victory Condition (99% ship ownership → game over) | 2026-02-12 |
| F-16 | Orb Travel UI Consolidation (paired sliders, orbit bias removed) | 2026-02-12 |
| F-17 | Settings Panel Full-Height Scroll Fix | 2026-02-12 |
| F-18 | Conquest Log Flat Format (no nested objects, PRE/POST per-player totals) | 2026-02-12 |
| F-19 | Attack Surge Animation (verified working) | 2026-02-12 |
| F-20 | Config Import/Export: JSON + MD export, JSON import with type validation, in Logging tab | 2026-02-12 |
| F-21 | Tauri Desktop Build: native .exe, .msi, .nsis installer (1400×900 default window) | 2026-02-12 |
| F-22 | Attack Surge Proportional to Force Disparity: log2-scaled, toggleable, cofactor slider | 2026-02-12 |
| F-23 | Conquest Ship Lerp: front-line ships travel to conquered star (magnetic/arc/straight modes) | 2026-02-12 |
| F-24 | Conquest Lerp Delay (200ms) + Slowmo Mode (4×/10× toggle, full framerate) | 2026-02-12 |
| F-25 | Attack Surge Pause-Safe Ramp: delta-based ramp progress, amplitude-based phase offset, no surge during pause | 2026-02-12 |
| F-26 | AI Three-Zone Attack Model: must-attack ratio (5:4), may-attack bounds (4:5), linear interpolation, stickiness-based retreat (0-1) | 2026-02-14 |
| F-27 | Conquest Threshold Slider: max raised from 20 to 50 | 2026-02-14 |

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
| R-15 | ~~Multiplayer Deployment~~ | ✅ RESOLVED 2026-02-14 — dual module instance fix |
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
| R-28 | Tailwind CSS Migration (70-80% inline utility, CSS custom properties for JS interpolation) | 🟡 |
| R-29 | Last-Stand Resistance Mode | 🟢 |
| R-30 | Captured Ship Activation Rate Slider | 🟢 |
| R-31 | Deferred Order Arrows Overlay Priority | 🟢 |
| R-32 | **Public Room Browser** — list available rooms in MP tab, click-to-join with confirmation | 🟢 |
| R-33 | **Per-Player Settings** — color, AI strength/strategy, human handicaps/buffs in main menu | 🟢 |
| R-94 | Visual Style Packs (selectable animation & visual presets, gameplay feel variety) | 🔴 |
| R-31 | Tick Length Control Panel Slider | 🟢 |
| R-32 | End-Game Screen Enlargement + Better Charts | 🟡 |
| R-33 | Damaged Ships Never Destroyed (design rule) | 🟢 |
| R-34 | AST-Based Bidirectional Documentation | 🔵 |
| R-35 | Conquest Pause + Stats Card Popup | 🟢 |
| R-36 | Damaged Ship Visual Density Tiers (overlapping orbits) | 🟢 |
| R-37 | Full Engine Unification: server uses shared GameEngine for map generation | 🔴 |
| R-38 | **Main Menu Restructure** — always-visible room browser (no SP/MP tabs), unified layout | 🟢 |
| R-39 | **Standard Menu Items** — Gameplay Options, Settings (audio/video icons), Shop, Quit to Desktop | 🟢 |
| R-38 | Ship Orbit Density: limit to 5 layers, scale colors max 5000 ships, enlarge on overflow | 🔴 |
| R-39 | Power Density VFX: animations/effects for increasing fleet power at stars | 🔴 |
| R-40 | Leaderboard: emphasize TOTAL SHIPS first, then active/damaged fraction | 🟢 |
| R-41 | Surrender Modal: End Game (results) or Abandon (main menu) — replaces raw button | 🟢 |
| R-42 | Player Stats Console: bottom-up drawer replacing combat log, shows live dynamics | 🔴 |
| R-43 | SP/MP Full Parity: ONE GAME — eliminate all divergent UI, logic, and settings paths | 🔴 |
| R-44 | AI Difficulty Levels + Strategy/Posture Options (clearly specified behaviors) | 🔴 |
| R-45 | Star Spacing Formula: min = diameter + 5 orbits + adjustable buffer (e.g. 20px) | 🟢 |
| R-46 | Orbit Density Controls: exposed in-game variable for orbit layer/scale tuning | 🟢 |
| R-47 | Per-Target Conquest Transfer Amount: player sets per-target override superseding global | 🟡 |
| R-48 | Scatter Visual Effects: scatter events need distinct visual presence — ships breaking away to escape routes | 🔴 |
| R-49 | Capture Animation: text enlarges + damaged ships animate conversion to friendly — creative VFX proportional to captured count | 🔴 |
| R-50 | Oscillation Period Slider: expose orbit bias oscillation period/frequency as a range slider in Animation Tuning | 🟢 |
| R-51 | Orb Travel Animation: ships merge into glowing orb during travel, fragment on arrival — orb brilliance proportional to ship count | 🟢 |
| R-52 | End Game Screen Redesign: fullscreen 900px modal, ambient glow, scoreboard, enlarged charts, shimmer button, premium VFX | 🟢 |
| R-53 | Gameboard Resize-to-Fit: hotkey/button to resize gameboard to fit available viewport space | 🔴 |
| R-54 | Orb Travel Tuning: full set of sliders for orb colors, gradients, glow, sizes — all persisted to localStorage | 🟡 |
| R-55 | Scatter/Retreat Animation Type: separate scatter/retreat from movement animations — distinct visual language for fleeing ships | 🔴 |
| R-56 | Scatter Escape-Capture Mechanic: when ships scatter, some may be captured by nearby enemy stars — escape routes determined by proximity | 🔴 |
| R-57 | Elimination Screen: show modal when player eliminated — Spectate or End Game options | 🟢 |
| R-58 | Nearside Departure/Arrival: ships depart from side facing target, arrive on nearside, outer-layer-first departure selection | 🟢 |
| R-59 | Orb Fragmentation Boundary: orbs break apart outside outermost orbit ring, ships fly directly to orbit slots with eased curve | 🟢 |
| R-60 | Time-based Arc Settle: ships orbit-snap via easeOutCubic over SETTLE_DURATION_MS (150ms default), never cross star center — polar interpolation | 🟢 |
| R-61 | Crisp Text at Zoom: all PIXI.Text rendered at 2x resolution for sharp text at any zoom level | 🟢 |
| R-62 | No-Cross-Star Constraint: ships always arc around star perimeter to reach orbit slot, never path through center | 🟢 |
| R-63 | Depart Mode Selector: dropdown for LIFO/FIFO/Nearside departure selection with panel persistence | 🟢 |
| R-64 | Settle Duration Slider: exposed SETTLE_DURATION_MS (30-500ms) in panel for tuning orbit snap speed | 🟢 |
| R-65 | Nearside Departure Fix: dot product now computed against orbit SLOT position (getOrbitSlot) instead of mid-settle ship.x/y | 🟢 |
| R-66 | Arrival Stagger: ships settle across tick×ARRIVAL_SPREAD (0-2x slider), spawn/repair/transfer all staggered | 🟢 |
| R-67 | Wobble Travel: sinusoidal perpendicular oscillation on travel paths, per-ship frequency/phase, fades at endpoints (0-40px slider) | 🟢 |
| R-68 | Settle Slider Extended: range expanded to 0-2000ms for full range from instant to slow drift | 🟢 |
| R-69 | Sprite Pool Ship Rendering: replaced per-ship Graphics.circle with batched sprite pool for O(1) draw calls | 🟢 |
| R-70 | FPS + Ship Count Overlay: real-time FPS, total visual ships, and sprite pool size displayed in monospace badge | 🟢 |
| R-71 | Spawn/Production Instant Settle: removed ARRIVAL_SPREAD stagger from spawned ships — only travel arrivals stagger | 🟢 |
| R-72 | Sharper Sprites: circle texture increased 16→64px with anti-aliased edge for crisp rendering at all scales | 🟢 |
| R-73 | Reset All Button: CombatDebugPanel has red-tinted reset button that clears localStorage and restores defaults | 🟢 |
| R-74 | Orbit Density Slider: controls ship spacing per ring (1.0-4.0x), higher = more spread out, fewer per ring | 🟢 |
| R-75 | ~~Attack Surge Slider~~ → moved to F-19 (verified working) | ✅ |
| R-76 | ParticleContainer Rendering: replaced Graphics.circle with ParticleContainer + Particle pool (24fps @ 30k ships) | 🟢 |
| R-77 | Player-Color Outlines: ring texture behind each ship shows raw player color, visible even when fill is white-blended | 🟢 |
| R-78 | Orb Travel Flash Fix: departing ships fade to full transparency before orb grouping, eliminating single-frame arc | 🟢 |
| R-79 | Stars Panel Sorting: group/sort by owner, ship count, or star name — dropdown in Stars panel header | 🟢 |
| R-80 | Bottom-Drawer Combat Log Panel: short bottom drawer (~6-8 lines), styled per-line combat/conquest events, full formula on one line, replaces old Combat Logs panel | 🔴 |
| R-81 | Ship Density Color Graduation: HSL-based auxiliary colors (3 per side of player hue) replacing white-wash for high ship counts | 🔴 |
| R-82 | Timing Section: rename Game Speed → TIMING, consolidate ATTACK_SURGE_RAMP_MS + CONQUEST_LERP_DELAY_MS sliders | 🟢 |
| R-83 | AI Pinning Strategy: intelligent pinning that ignores mere force ratio between two stars — sophisticated movement | 🔴 |
| R-84 | AI Multi-Source Attacks: lower AI considers single star ratio, smarter AI considers all available sources | 🔴 |
| R-85 | Conquest Visual Flair: border and background do several transitions — lightness, size, glow. Border should shine/pulse. Star icon should brighten + expand-contract like a single heartbeat | 🔴 |
| R-86 | Ship Travel Spread: ships currently travel as "vertical walls/slices" perpendicular to lane. Need more spread in both dimensions, individual wobbles with smaller-group coherence. See also R-111 | 🔴 |
| R-87 | Easing Curve Visual Editor: lightweight JS widget for standard easing parameters (cubic-bezier style) | 🔴 |
| R-88 | Attack Surge Tick-Sync: surge should only animate during actual combat ticks, not on order issuance | 🔴 |
| R-89 | Unified Game-Start Screen: SP & MP share same lobby/settings UI, eliminate divergent paths | 🔴 |
| R-90 | Per-AI Player Settings: select difficulty + strategy for each AI independently at game start | 🔴 |
| R-91 | AI Custom Personality Editor: create/save/load named AI profiles with tuned strategies/variables | 🔵 |
| R-92 | Game Sounds: tick sound, conquest sound, conquest-ships-arrival sound (lightweight, no Tone.js) | 🔴 |
| R-93 | Animation General Polish: conquest, transfer, and orbit-meshing visual improvements | 🔴 |
| R-95 | Lane Stationing: ships can be stationed in lanes between stars — changes travel timing & defense dynamics | 🔵 |
| R-96 | Satellites/Planets/Battle Stations: purchasable orbital structures that orbit stars | 🔵 |
| R-97 | Planetary/Star Shields: defensive shields protecting stars from attack | 🔵 |
| R-98 | Mines: deployable hazards in lanes or around stars | 🔵 |
| R-99 | Economy & Production System: resource economy to support purchasing structures, shields, and mines | 🔵 |
| R-100 | Ownership Inversion: Stars are currently a container for Ships. Future variation: Ships as containers for Stars, or more generally Locations/Roles — bidirectional ownership, increased complexity | 🔵 |
| R-101 | **Timing Panel Consolidation**: Tick interval, Animation speed, Travel duration, Settle time in ONE panel. Master slider adjusts all at once. Independent control via toggle. Numeric inputs showing ratio with tick duration (0-5, step 0.25) | 🔴 |
| R-102 | **HSLA Ship Accent Controls**: Controls that modify player primary color for outline/glow accents | 🟢 |
| R-103 | **Ship Glow Effect**: Actual glow rendering for ships | 🟢 |
| R-104 | **Lane-Star Blending**: Attach lane ends visually to stars for cleaner look | 🟢 |
| R-105 | **Victory Conditions System**: Pre-game setting category. Classic Mode = 100% conquest. Pax Fluxia offers variable thresholds by ship count, specific star/territory conditions | 🔴 |
| R-106 | **Rapid-Fire Sequential Departures**: Ship transfers as steady stream — single ships in rapid-fire sequence, randomly-eased arrivals | 🟢 |
| R-107 | **Arrival Centerline Targeting**: Arrivals head to lane centerpoint (not lane-star boundary intersection). Variable scatter-offset from centerline. Arc to orbit slot within same easing function | 🟢 |
| R-108 | **Travel Time Game Mode (1x-10x)**: Variable travel duration changes gameplay dynamics. Ships exist as fleets at intermediate points. Below 1x = cosmetic only. Above 1x = mechanical. Opposing fleets on same lane either pass or fight | 🔵 |
| R-109 | **Lane Combat (fleet interception)**: When travel time > 1x, opposing fleets on same lane fight en-route. Branch: pass unaffected OR fight each other | 🔵 |
| R-110 | **Ship Power Density Visual**: Visual indicator for increasing ship power density at a star. *User confirmed this is priority. See also R-39.* | 🔴 |
| R-111 | **Ship Travel Animation Handles**: More controls for flight behavior — spread in both dimensions, individual wobbles, smaller-group coherence | 🟢 |
| R-112 | **Slider Detent at Mid**: UI sliders should have a small notch/tag at midpoint that can be clicked to center the value | 🟡 |
| R-113 | **Animation Speed = Tick Duration Ratio**: Animation speed bound to tick duration. Control = how much of a tick duration it lasts (0-1, default 0.5) | 🟢 |

---

## Architecture (A)

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| A-1 | Engine Unification: Combat formula | ⬜ | Verify `calculateCombatV4` ≡ `calculateCombat`, unify |
| A-2 | Engine Unification: Transfer rate | ⬜ | Delete `ORDER_CONFIG`, single `EngineConfig.TRANSFER_RATE` |
| A-3 | Engine Unification: Client combat delegation | ⬜ | Client delegates to Common via state adapter |
| A-4 | Engine Unification: Client tick delegation | ⬜ | Client calls `GameEngine.tick()` like server |
| A-5 | Engine Unification: Map generation shared | ⬜ | Move hex grid to Common, server adopts it |
| A-6 | Engine Unification: Config defaults sync | ⬜ | `DEFAULT_ENGINE_CONFIG` matches user's tuned values |

---

## Session Log

| Date | Summary |
|------|---------|
| 2026-02-14 | **4002 FIX**: Resolved Colyseus "seat reservation expired" — root cause was dual `@colyseus/core` module instances from explicit WebSocketTransport import. Fix: let `Server.getDefaultTransport()` handle it. **Multiplayer now working online!** |
| 2026-02-14 | **Feedback batch**: 4 MP bugs (B-42 through B-45: room ID display, restart desync, 2P order control, host leave), 10 settings bugs (B-46 through B-55: broken sliders, missing glow, game end), 13 features (R-101 through R-113: timing panel, HSLA controls, victory conditions, travel time game mode, lane combat, ship density VFX). |
| 2026-02-13 | **Click input fixes**: B-38/B-39 fixed (stale drag state in `handlePointerDown`). Visual telemetry added to full click pipeline. CONTROLS.md created. B-40 logged (icon menu + devtools). R-100 documented (ownership inversion). Phase 3 FX refactor committed (travel behavior registry). |
| 2026-02-13 | **User feedback batch**: AI passive in MP (B-35), quit buttons wrong (B-36), pause resets tick (B-37), unified game-start (R-89), per-AI settings (R-90), AI personality editor (R-91), game sounds (R-92), animation polish (R-93). Conquest naked tick reiterated (B-34). Zombie code Phase D complete. |
| 2026-02-12 | **Engine unification planning**: Full architecture audit across 3 packages. Created `ENGINE_ARCHITECTURE_CURRENT.md` and `ENGINE_ARCHITECTURE_TARGET.md`. Updated `00_PHYSICAL_MAP.md` and `01_ASSET_INVENTORY.md` to current monorepo reality. Documented 6-phase unification plan in DECISIONS.md. |
| 2026-02-12 | Zombie code cleanup: removed `_conquestTravel`, `CONQUEST_TRAVEL_MODE`, `arcBulge`. Updated ~50 config defaults from backup. Confirmed `FACING_DEPART` is legitimate (attack surge facing factor). |
| 2026-02-13 | Northflank deployment: Dockerfile (bun multi-stage), prod.ts (Express + ws-transport single-port), env-aware SERVER_URL. Controls panel reorganized (7→9 sections: Travel, Conquest, Ship Look). |
| 2026-02-12 | Conquest ship timing fix: separated conquest transfer ships from `inFlightToStar` counter (cosmetic-only). Immediate spawn at conquered star. `CONQUEST_TRAVEL_SPEED` inverted (>1=faster). `VISUAL_COUNT_DELAY` iced (removed). Transfer Rate duplication found: `EngineConfig.TRANSFER_RATE` vs `ORDER_CONFIG.TRANSFER_RATE` — documented in DECISIONS.md. |
| 2026-02-12 | Attack surge fixes: pause-safe ramp (delta-based), tick-boundary continuous phase (amplitude axis), no surge during pause. Removed slowmo, CLEAR_ORDER_ON_CAPTURE dead code, added ATTACK_SURGE_RAMP_MS config. Conquest damaged ship split fixed. |
| 2026-02-12 | Combat formula logging (full 5-step breakdown), dominant victory (99% ships), orb panel consolidation (paired sliders, orbit bias removed), settings panel scroll fix (flex-based full-height). |
| 2026-02-10 | Batch 3: Performance fixes — statsHistory cap (500), starsById cache (was 4x new Map/frame), damaged ship static mode. |
| 2026-02-10 | Batch 2: Surrender modal fix (+page.svelte was calling returnToMenu directly), STATIC_ORBITS toggle (performance), leaderboard total ships row, log toggles UI, Stars Panel CSS Grid, repairedThisTick on Star model, ship visuals reverted to circles+white+border. |
| 2026-02-10 | Phase 1: R-45/B-27 physics star spacing, R-40 leaderboard, R-41 surrender modal. B-28 Tone.js lag fix (throttling). SP/MP parity audit completed. |
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
