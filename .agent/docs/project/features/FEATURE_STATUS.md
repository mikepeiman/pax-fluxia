# Feature & Regression Tracker

**Authority:** The long-lived tracker is this file under `.agent/docs/project/features/`. The clean daily execution queue lives in `.agent/docs/project/implementation-plans/YYYY-MM-DD/FEATURE_AND_TASK_QUEUE_YYYY-MM-DD.md`. Legacy stubs (`.atlas/FEATURE_STATUS.md`, `pax-fluxia/.atlas/FEATURE_STATUS.md`) redirect here.

**Main body last updated:** 2026-02-16  
**Last consolidated:** 2026-04-08 — Former parallel trackers **deduplicated** into **Supplement** (IDs MC- / RG- / TR- / FI-); verbatim appendices removed. Unique facts retained; long FG2 bullet list **referenced**, not duplicated.

**Last Verified By:** User (partial — see Status column)

---

## Active Queue â€” 2026-04-12

This is the current working queue distilled from the last two days of rendering, palette, map, and multiplayer discussions.

### Immediate / next

- Palette live-update parity: verify that territory fills are now invalidated and repaint correctly during live player-color changes.
- Main Menu follow-through: verify the new three-panel layout and unified player-color widget visually in-app.
- Public-room follow-through: verify the persistent public room appears first in the live room browser on the default dev stack.
- Dev workflow follow-through: verify the combined root `bun run dev` flow in normal use.

### Rendering / lane fidelity

- Ships should follow actual lane paths, including curved lanes.
- Order arrows should follow lane paths, including curved lanes.
- Curved-lane publication should avoid visible angular bends; if a lane is non-straight, the exposed path should read as curved.
- CX corridors spec update: apply corridor control not only to same-owner corridors, but also to competing-owner corridors using per-owner midpoint virtual stars so third-party regions do not intrude on the lane.

### Territory / metaball

- Metaball steady-state fill does not yet reliably match actual owned territory boundaries.
- Metaball conquest transition is still missing and needs a controlled in-game bakeoff of candidate approaches rather than one unexamined implementation.
- **metaball-grid mode (2026-04-17 → 2026-04-18, branch `claude/goofy-raman`)**: MG5..MG-BORDER v2 shipped (HSLA fill/border, 4 cell shapes with pointy-top honeycomb hex, polyline-joined territory borders with Chaikin smoothing, 6 easing curves, flip-time jitter). Known perf cliffs: (a) per-transition Power-Voronoi rebuild for PREV geometry dominates at dense spacing (45.8 % at 4 px in 2026-04-18 trace); (b) steady-state paint redundantly re-issues draw calls with no dirty-flag gate. 3-phase plan filed: `.agent/docs/plans/2026-04-18/METABALL_GRID_PERF_PLAN_2026-04-18.md`. Tuning handles for distribution modes / jitter / cell-count cap / render-backend are planned (Phase A) but not yet implemented.
- **metaball-grid replacement planning (2026-04-30)**: non-metaball replacement spec filed at `.agent/docs/plans/2026-04-30/METABALL_GRID_REPLACEMENT_ARCHITECTURE_SPEC_2026-04-30.md`. Recommendation: keep the deterministic grid/phase scheduling substrate, delete metaball presentation, prototype a conquest-local `PRE/POST` RenderTexture composite plus phase field, then harden toward an owner-texture or palette-texture production family.
- **phase-field settings shell repair (2026-04-30)**: `metaball_grid_phase_field` now has a dedicated top-level `Phase Field` settings section. The old generic `Territory Styles` panel is hidden for that mode, and the new section only exposes controls the runtime actually consumes. The prior border confusion was partly a UI-truth problem: phase field reused generic style surfaces that included dead controls and hid the real border gate (`Border Mode`). User verification still needed in-app.

### Map tooling

- Fixture map foundation exists, but still needs loader/validator polish and active use in renderer comparison.
- Full custom map editor remains a major planned feature and is increasingly important for reproducible territory/corridor/conquest testing.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | User-verified working |
| ❓ | Agent-implemented, not user-verified |
| ❌ | User-confirmed broken |

---

## Territory Rendering Pipeline (2026-03-07)

| ID | Item | Status | Notes |
|----|------|--------|-------|
| T-DF-1 | Canonical DF panel write path | ? | Territory UI writes now routed through `updatePanel` path (bridge-compatible), direct writes removed from territory controls. |
| T-DF-2 | DX transient revert instrumentation | ? | Added telemetry + diagnostics (`getDistanceFieldDxDiagnostics`) and rebuild trigger on relevant UI writes. |
| T-DF-3 | Straight-line border regularization | ? | Vector border extraction now linearizes boundary graph into piecewise straight world-space segments (round joins/caps + softness halo). |
| T-DF-4 | Border family framework | ? | `DF_BORDER_FAMILY` added (`straight`, `curved`, `segmented`); `curved`/`segmented` currently deterministic stubs falling back to straight. |
| T-DF-5 | User verification pending | ? | Visual acceptance still required for: border evenness at high zoom, DX persistence behavior, morph smoothness/perf tradeoff. |

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
| V-8 | Metaball blur targets | ❓ | `METABALL_BLUR_AFFECTS_BORDERS` toggle: default blur fill only; optional single-pass blur on fill + border strokes when GPU blur is on. |
| V-9 | Mapgen lane clearance + CX | ❓ | Delaunay prune and lane polylines use **`MAPGEN_LANE_MARGIN_PX`** only; **MSR** = territory boundaries; curved mode is necessity-only (no cosmetic bulge); live Map & Grid; CX via `buildCorridorVirtualSites`. **Queued:** cross-player **vstar near lane midpoint** per owner to block enemy territory overlap. |
| V-10 | Metaball same-owner overlap banding | ❓ | Influence is **summed per player** (`infGeom[p] += c`), so two stars of one owner **double** the field in overlap — can read as seams/artifacts vs a single smooth blob. **Fix:** moderate effort — e.g. take **per-cluster max** instead of sum for real stars, or normalize by local star count; needs visual QA so territory area does not shrink unexpectedly. |

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
| B-47 | ~~Animation speed slider does nothing~~ **FIXED**: FX handlers used FXClock `gameTime` for `departTime` but ShipRenderer used `performance.now()` — time domain mismatch caused instant ship arrivals regardless of animation speed setting. Fixed in `transferHandler.ts` and `conquestHandler.ts`. |
| B-48 | ~~Players all start on same star type~~ **FIXED**: Star types were assigned via deterministic cycling (`types[i % types.length]`) and positions weren't shuffled. Players in the same index-modulo group always got the same star type. Fixed with `Math.random()` type selection and position shuffling in both client `GameEngine.ts` and server `GameRoom.ts`. |
| B-49 | ~~Mobile close button cut off by top ribbon~~ **FIXED**: Ribbon z-500 covered close button z-210. Fixed by hiding ribbon when settings overlay is open (`{#if !showSettingsPanel}`). |
| B-50 | **Mobile slider +/- nudge buttons**: Sliders are too small for precise finger control on mobile. Need +/- buttons to nudge values by step size. |
| B-51 | **Mobile back button exits app**: Android back button immediately exits. Should close open menus/overlays first (settings → drawer → game). Needs `popstate`/`beforeunload` handling. |
| B-52 | **Exit confirmation modal**: No confirmation before leaving active game or closing app. Need modal: "Are you sure? You'll lose your current game." |
| B-53 | ~~Mobile bottom bar redundancy~~ **FIXED**: Restart/Audio/Quit buttons duplicated in FAB popup and bottom bar. Hidden action-buttons on mobile, added Restart to FAB popup, full-width start widget. |

## Future Refactors

| ID | Description |
|----|-------------|
| R-1 | **SliderRow component**: Refactor all sliders to use unified `SliderRow.svelte` component instead of `nudgeSliders.ts` DOM injection action. |
| R-139 | **Rename `calculateCombatV4`**: Replace with clean, functionally-semantic name (e.g. `calculateCombat`). No legacy version suffixes. Use `code_references` + `grep_search` for zero-orphan rename. |
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
| B-31 | ~~Attack surge activates on order, not on tick~~ **RESOLVED**: User confirmed 2026-02-16 no longer an issue. Combat starts the very next tick after order. |
| B-32 | Mid-surge order change teleports ships | Ships should complete current surge cycle ALWAYS before reorienting. "They should adjust their destinations but not their present locations, and smoothly animate back into orbit (complete the surge always) before reorienting to the new target" | OPEN |
| B-33 | Ships jump into attack surge before animation continues smoothly | Ramp-in not working visibly; initial frame snap | OPEN |
| B-34 | Conquest: victor ships wait entire tick to appear | Should appear within conquest tick, not next tick | OPEN |
| B-35 | AI passive in MP: no difficulty settings exposed, AI uses default (easy) config | Server needs AI difficulty from RoomOptions | OPEN |
| B-36 | MP quit/abandon buttons restart game instead of returning to main menu | Should route to main menu, not restart | OPEN |
| B-37 | ~~MP pause resets tick counter and animations~~ **FIXED**: `pausedElapsed` saves inter-tick progress on pause, `lastTickTime` offset restored on resume, `scheduleTick()` uses `setTimeout` for remaining time before switching to regular `setInterval`. | `4dd8c3f` |
| B-46 | **"Ship travel duration" slider does nothing** | Setting has no effect. Note: "travel duration" MULTIPLIER does work but only on Bezier mode (see B-51). Increase range to 10x for more variety | OPEN |
| B-47 | **"Arc intensity" slider does nothing** | Setting has no effect | OPEN |
| B-48 | **"Settle time" slider does nothing** | Setting has no visible effect | OPEN |
| B-49 | **"Arrival spread" makes ships invisible** | Increasing turns arrivals invisible; reduced to zero looks normal. Purpose unclear to user | OPEN |
| B-50 | **"Wobble amp" and "Depart jitter" unclear** | User unsure what they do or if they work | OPEN |
| B-51 | **Travel Duration only works on Bezier mode, not Lane** | All settings must be interoperable across travel modes. May need function updates to include variables | OPEN |
| B-52 | **Outline color in Ship Look does nothing useful** | Cannot change colors. Need HSLA controls modifying player primary color for accents | OPEN |
| B-53 | **No glow effect exists** | Ship glow was never implemented despite UI presence | OPEN |
| B-54 | **Star Radius never worked** | Slider has no visible effect | OPEN |
| B-55 | **Game ends before complete conquest** | Abrupt and unsatisfying. Convert to configurable win condition: `GAME_WIN_DETERMINANT` = [ships, stars, targets], `GAME_WIN_THRESHOLD` (default 95% ships). Show modal: View Results or Keep Playing (continues to full-map conquest). |
| B-56 | **Custom player colors not applied in MP** | `playerColors` wired through `GameEngine` (SP only). Server `GameRoom.ts` has its own hardcoded `PLAYER_COLORS` array at line 19, ignoring client hue selections. Part of broader unification gap: game init logic should import from `common/`. | OPEN |
| B-57 | **Intermittent: active ships drop to 0 too fast when counterattacking** | Scenario: 50 active + 500 damaged, counterattack causes active to hit 0 immediately. Possibly damage applied to activeShips pool exceeds actual active count in one tick. Hard to reproduce — awaiting exact numbers from user. Custom map editor will help reproduce. | OPEN |
| B-58 | ~~**Spider web connections after mapgen randomization**~~ **FIXED**: Shuffling positions broke star ID → coordinate mapping (connections referenced IDs that pointed to wrong spatial locations). Fix: shuffle owner indices instead of positions. | `4e408c1` |
| B-59 | **Stale ship counts visible briefly on MP restart** | Ending ship counts from prior game show in fresh game, reset after 1-2 ticks. VFX state not cleaned on restart. | OPEN |
| B-60 | **Initial tick delay at game start** | Spare tick or delay before action starts, most visible on restart/rejoin. | OPEN |
| B-61 | ~~**CombatDebugPanel TS errors (5)**~~ **FIXED**: Stale `travelDurationMs` slider (renamed to `travelDurationMult`), invalid `laneOffsetPx` panel key, `SHIP_TRAVEL_DURATION_MS` renamed to `TRAVEL_DURATION_MULT`. | `54683bf` |
| B-62 | ~~**Animation Speed slider has no effect**~~ **FIXED**: `ANIMATION_SPEED_MS` was only used for visual travel duration (too short to notice). Decoupled animation speed into dedicated `animationStore.svelte.ts` with `$state` + localStorage. `FXOrchestrator.setAnimationSpeed()` converts ms → FXClock speed multiplier. Tick rate (`BASE_TICK_MS`) and animation speed are now independent. | `5fcade4` |
| B-63 | **Convergence arrival pause & ship sizing** | Ships arrive at destination as small dots, pause statically, then settle into orbit. Two sub-issues: (1) size/scale not matching full ship size during arrival, (2) static gap between travel and settle animations needs blending variables | OPEN |
| B-64 | ~~**MP lobby `getAvailableRooms` not a function**~~ **FIXED**: `getAvailableRooms()` removed in Colyseus 0.17. Switched to built-in `LobbyRoom` per [official docs](https://docs.colyseus.io/room/built-in/lobby). Server defines `lobby` room, client joins via WebSocket and receives realtime `rooms`/`+`/`-` messages. | 2026-02-17 |
| B-65 | ~~**MP rooms not auto-fetched on reload**~~ **FIXED**: `gameMode` defaulted to 'sp' on reload, so lobby auto-join never triggered. Persisted `gameMode` to localStorage. | 2026-02-17 |
| B-66 | ~~**Can't join room from browser listing**~~ **FIXED**: Added `leaveLobby()` before `joinRoom()` to avoid Colyseus connection conflicts. | 2026-02-17 |
| B-67 | ~~**Joins in-progress game as player 7/6 (overflow)**~~ **FIXED**: `onJoin` always created new player at `players.size` regardless of phase. Rewrote to be phase-aware: lobby adds normally with capacity guard, playing phase routes to AI takeover. | 2026-02-17 |
| B-68 | ~~**No AI takeover for mid-game joins**~~ **FIXED**: Added AI takeover mechanic — joining an in-progress game finds an available AI slot, transfers star ownership (`ownerId`) to the new human session, replaces the AI player entry. Client modal shows AI players with color dots for selection. | 2026-02-17 |
| B-69 | ~~**Garbled unicode in MainMenu.svelte**~~ **FIXED**: UTF-8 box-drawing chars `─` rendered as mojibake `€â"€`. Replaced with ASCII dashes. | 2026-02-17 |
| B-70 | ~~**Click-to-join room card doesn't join**~~ **FIXED**: Lobby `'+'` handler used `room.roomId` (undefined in Colyseus LobbyRoom schema) instead of destructured `roomId` from `[roomId, room]` tuple. | 2026-02-17 |
| B-71 | ~~**AI name used on takeover**~~ **FIXED**: `onJoin` AI takeover fell back to `aiPlayer.name` when client name was empty. Now uses `Player X` fallback. | 2026-02-17 |
| B-72 | ~~**Tick delay at game start**~~ **FIXED**: Game started paused (`isPaused = true`) requiring manual resume. Changed to start ticking immediately. | 2026-02-17 |
| B-73 | **Leaderboard shows 0/0 at game start** — Player ship counts not tallied until first engine tick. Self-corrects after first tick (~1200ms). | OPEN |

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
| F-28 | Ship Density VFX: HSL-based color graduation for high ship counts. 4° hue shift ×3 tiers each direction, sat+lightness in opposing directions. No size changes. Replaces old white-wash hue-brighten. | 2026-02-14 |
| F-29 | Debug Ship Count Slider: 0-10k range bound to selected star's activeShips. Density VFX tab in debug panel with 4 config sliders (hue step, sat step, light step, max tiers). | 2026-02-14 |
| F-30 | AI Bug Fixes + Strategy System: fixed stuck-on-friendly target, anti-oscillation (minAttackTicks), 4 strategies (aggressive/opportunistic/expansionist/defensive) | 2026-02-14 |
| F-31 | Orbit-Ring Density Gradation: density tier based on ring position (inner=higher tier). Alternating ship darkening for contrast bead pattern. getOrbitSlot returns layer. | 2026-02-14 |
| F-32 | Ship Size/Spacing Decoupling: new SHIP_VISUAL_RADIUS (cosmetic circle radius) independent of SHIP_BASE_SIZE (orbit spacing). Slider in Ship Look panel. | 2026-02-14 |
| F-33 | Star Glow: radial gradient behind ships showing fleet power. Ship Appearance panel consolidating all ship visual controls. More vivid density defaults. | 2026-02-14 |
| F-34 | VFX Foundation (Phase A): FXClock (pausable game time), VisualStateManager (safe mutation API), FXRegistry (handler dispatch), FXOrchestrator. All 3 handlers migrated to V2. GameCanvas wired to orchestrator. | 2026-02-15 |
| F-35 | Renderer Extraction (Phase C): `RenderContext` interface, `containerFactory` (PIXI hierarchy + textures), `colorUtils` (HSL/density-tier), `StarRenderer` (stars/labels/icons/glow), `LaneRenderer` (connections/arrows/deferred), `ShipRenderer` (orbits/travel lifecycle/orb groups/attack surge/particle pool). All extracted to `pax-fluxia/src/lib/renderers/`. Zero new type errors. Wiring (Phase D) pending. | 2026-02-15 |
| F-36 | Engine Unification Refactor: Client `GameEngine` (1340 lines) replaced with `@pax/common` shared engine. AI migrated to `@pax/common`. `gameStore` uses local `GameRoomState` + `GameEngine.tick()`. Map generation randomized (star types + owner placement). 5 dead engine files deleted (~1,900 lines). svelte-check errors 7→1. | 2026-02-15 |
| F-37 | Lane Convergence Variables: `LANE_CONVERGENCE` (0-1, how tightly ships converge to lane) and `LANE_CONVERGENCE_POINT` (0-100, where convergence point sits along origin→dest). Sliders in GameSettingsPanel. Applied to transferHandler, conquestHandler, and strategies.ts. | 2026-02-17 |
| F-38 | MP Lobby Discoverability Fix: `fetchRooms()` switched from `client.http.get` to `getAvailableRooms('game_room')`. 5s auto-refresh polling with `startRoomPolling`/`stopRoomPolling`. | 2026-02-17 |
| F-39 | ~~Opposing Orders Flag~~ **OBSOLETE**: Deferred orders are core gameplay. A→B always cancels B→A (lane exclusivity). No toggle. | 2026-02-18 |

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
| R-14 | ~~Performance Audit~~ → see R-114 through R-118 | ✅ AUDITED 2026-02-15 |
| R-114 | **Spatial Culling: Ship Orbits**: Skip orbit physics + drawShip for off-screen stars. Still track spawn/despawn counts. Needs viewport.ts utility (getViewportBounds, isStarVisible) | 🔴 |
| R-115 | **Spatial Culling: Traveling Ships**: Run lifecycle (arrivals must happen) but skip drawShip when ship position off-screen | 🔴 |
| R-116 | **Spatial Culling: Stars/Labels/Glow**: Set graphics.visible=false for off-screen stars instead of redrawing every frame | 🔴 |
| R-117 | **In-Flight Map Optimization**: renderShips scans ALL travelingShips per star O(stars×ships) — pre-build Map\<starId, count\> in O(n) | 🔴 |
| R-118 | **starsById.get() Fix**: renderShips uses stars.find() for targetStar lookup — should use existing starsById Map | 🔴 |
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
| R-35 | Panel Reorganization: Separate "Ship Movement" (orbits + travel to friendly destinations) and "Combat & Conquest" (attack surge, conquest transfer, capture, scatter, retreat) into distinct control panel sections | 🟢 |
| R-27 | Strategic Patterns (auto-behavior algorithms) | 🔵 |
| R-28 | Tailwind CSS Migration (70-80% inline utility, CSS custom properties for JS interpolation) | 🟡 |
| R-29 | Last-Stand Resistance Mode | 🟢 |
| R-30 | Captured Ship Activation Rate Slider | 🟢 |
| R-31 | Deferred Order Arrows Overlay Priority | 🟢 |
| R-32 | **Public Room Browser** — list available rooms in MP tab, click-to-join with confirmation | 🟢 |
| R-33 | **Per-Player Settings** — color, AI strength/strategy, human handicaps/buffs in main menu | 🟢 |
| R-94 | Visual Style Packs (selectable animation & visual presets, gameplay feel variety) | 🔴 |
| R-133 | Tick Length Control Panel Slider | 🟢 |
| R-134 | End-Game Screen Enlargement + Better Charts | 🟡 |
| R-135 | Damaged Ships Never Destroyed (design rule — see MECHANICS §6) | 🟢 |
| R-34 | AST-Based Bidirectional Documentation | 🔵 |
| R-35 | Conquest Pause + Stats Card Popup | 🟢 |
| R-36 | Damaged Ship Visual Density Tiers (overlapping orbits) | 🟢 |
| R-37 | Full Engine Unification: server uses shared GameEngine for map generation | 🔴 |
| R-38 | **Main Menu Restructure** — always-visible room browser (no SP/MP tabs), unified layout | 🟢 |
| R-39 | **Standard Menu Items** — Gameplay Options, Settings (audio/video icons), Shop, Quit to Desktop | 🟢 |
| R-136 | Ship Orbit Density: limit to 5 layers, scale colors max 5000 ships, enlarge on overflow | 🔴 |
| R-137 | Power Density VFX: animations/effects for increasing fleet power at stars | 🔴 |
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
| R-81 | Ship Density Color Graduation: HSL-based auxiliary colors (3 per side, 4° hue shift each, sat/lightness in opposing directions) replacing white-wash for high ship counts | ✅ |
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
| R-110 | **Ship Power Density Visual**: HSL-based density tiers in drawShip + 4 config handles (DENSITY_HUE_STEP, DENSITY_SAT_STEP, DENSITY_LIGHT_STEP, DENSITY_TIERS) + debug slider 0-10k. *See also R-39.* | ✅ |
| R-111 | **Ship Travel Animation Handles**: More controls for flight behavior — spread in both dimensions, individual wobbles, smaller-group coherence | 🟢 |
| R-112 | **Slider Detent at Mid**: UI sliders should have a small notch/tag at midpoint that can be clicked to center the value | 🟡 |
| R-113 | **Animation Speed = Tick Duration Ratio**: Animation speed bound to tick duration. Control = how much of a tick duration it lasts (0-1, default 0.5) | 🟢 |
| R-119 | **Configurable Win Conditions**: `GAME_WIN_DETERMINANT` = [ships, stars, targets] (win by ship count, star count, or specified target ownership). `GAME_WIN_THRESHOLD` (default 95% ships). Modal: View Results or Keep Playing (continues to full-map conquest). Game option in pre-game settings. | 🔴 |
| R-120 | **Color Adjustment Toggle**: toggle between adjusting player colors independently vs locking current hue offset and adjusting all together | 🟢 |
| R-121 | **Color Merge on Star Capture** (idea: Kaya): When you capture a star, you merge colors with the defeated enemy — triggers effects: (1) spawns a new AI player of that merged color, (2) captured star becomes hybrid/mixed color. Evocative of Elemental thinking where each color is fundamentally distinct. | 🔵 |
| R-122 | **Custom Game Themes**: saveable/loadable theme presets (visual style, color palette, game settings) persisted to localStorage. Users can name, save, switch between themes. | 🟡 |
| R-123 | **Community Content Hub**: project directory for storing/sharing custom themes and maps. Three tiers: official maps (from dev), public user-contributed maps, and user themes. Infrastructure for future sharing/import/export of rich game config presets. | 🔵 |
| R-124 | **Spectator Mode on Mid-Game Join**: New players joining in-progress games enter as spectators (observers). Can choose to take over an AI player, or request takeover of a human player (with consent). UI shows "Spectating" player list. | 🔴 |
| R-125 | **Conquest Reactivation Delay**: Newly conquered stars have a cooldown before production/orders activate. Config: `CONQUEST_REACTIVATION_ENABLED` (bool), `CONQUEST_REACTIVATION_TICKS` (int, default 2-3). Adds strategic cost to conquest — prevents instant counter-attack from captured star. | 🟢 |
| R-126 | **Category Theme File Persistence**: Category theme save/load should write to project files (not only localStorage), immediately surfaced as options, persisting beyond reloads/localStorage wipes. Every panel needs reset-to-defaults (scoped to category). CategoryThemeBar already has save/load UI — investigate `categoryThemes.ts` storage backend. | 🔴 |
| R-127 | **MSR/CX/DX Geometry Model Alignment**: New geometry model should handle MSR, CX, DX constraints inherently, but these toggles/values still have effect in updated render modes. Architecture misalignment — investigate which legacy constraint toggles remain active when they shouldn't be. | 🔴 |
| R-128 | **Portal Stars**: In classic Pax Galaxia maps, numeric star types (`2`, `3`, etc.) are portal stars. All instances of the same numeric type are simultaneously occupied by whoever captures one — bridging graph-disconnected regions. Found in: Boxed, CrissCross, DSpokes, Frontline, Arena, Crazy. **Implemented on 2026-04-22 (partial first slice):** `classic-map-parser.ts` now parses numeric types → `starType='portal'` + `portalGroup`, the shared engine synchronizes ownership across the group on conquest, runtime/server/editor/export paths preserve `portalGroup`, and gameplay/editor/menu thumbnails now render portal stars distinctly. **Still open:** explicit portal-family UI in the main game, richer portal VFX, and broader gameplay design if portals need behavior beyond synchronized occupancy. Reference: "Boxed" (type-2 at x152/y53 ↔ x747/y56, type-3 at x748/y489 ↔ x155/y487). | ❓ |
| R-129 | **Settings Panel Reorganization**: Refactor settings panel groupings for more intuitive layout. Apply high-level thinking about which settings belong together and create best-appropriate, intuitive groupings. Current groups evolved organically — reorganize with UX intent. | 🔴 |
| R-130 | **Settings Files Modularization**: Refactor monolithic settings files (settingsDefs.ts, GameSettingsPanel.svelte) into sub-modules. Each panel group should be a properly modular import. Against engineering practices to maintain giant monolithic files. | 🔴 |

---

## Bugs — Feb 17-28 Session (B)

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
| B-96 | **Enclave double-coloring**: When enclaves are created through gameplay, their territory fills get double-colored (e.g. neutral grey becomes near-black). Hypothesis: overlapping fill polygons for the same owner are being composited, darkening the color. | Open |
| B-97 | **World boundary visual**: Disconnected straight line not aligned with border — the boundary lines are inside the actual border, not flush. Needs visual fix. | Open |
| B-98 | **Frontier junction juts & loop continuity**: End-chain junctions of frontier segments produce sharp corner juts and animation side-effects. Frontiers should be singular continuous loops — when they change, the transition should be smooth like a string/rope with mathematical best-fit and most-efficient displacement (optimal transport). This is the root cause of: small sharp corners, animation discontinuities on conquest, and border segments "jumping" between frames. User has described this specification repeatedly across multiple sessions. | Open (HIGH PRIORITY) |
| B-99 | **Pixi Rope thick border flash on conquest**: Rope texture height was `ropeWidth * 2`, doubling visual width vs slider value. Fixed to `ropeWidth`. | Fixed (2026-03-18) |
| R-131 | **Neutral territory transparency**: Toggle option for neutral territory to have color OR full transparency (no fill, showing background). Future roadmap: special territory types with shimmering VFX. | Fixed (2026-03-18) |
| B-100 | **Deferred orders only from own stars**: Drag-to-order only initiated from player-owned stars, preventing deferred order chains from non-owned stars. Fixed: drag now starts from any star, with non-owned stars automatically entering deferred order mode. | Fixed (2026-03-18) |
| B-101 | **Fill morph is crossfade, not shape morph**: Fills now use `FrontierLoopMorpher` — unified fill+border from same closed polygon points. Fill-border binding confirmed clean. Polygon rotation alignment added. Remaining: split into new data mode, restore FG2. | In Progress |
| B-102 | **Conquest animation: localized frontier update**: On conquest, only update territory/frontiers around the conquered star and its neighbors. Anchor points on contiguous frontiers beyond which geometry stays static. Between anchors: dense control vertices, lerped in order to new positions, with per-frame Chaikin smoothing. See D-78. | 🔴 HIGH |
| R-132 | **Frontier Resolution slider** (1-20px): Controls vertex spacing along territory polygon outlines. Lower = denser vertices = smoother morphing. Added as part of unified frontier pipeline (D-80). | Added (2026-03-18) |

## Known Regressions

| ID | Description | Since |
|----|-------------|-------|
| ~~B-84~~ | ~~ALLOW_OPPOSING_ORDERS~~ **OBSOLETE**: Deferred orders are core gameplay. Lane exclusivity (A→B cancels B→A) is the only behavior. | 2026-02-18 |
| B-85 | ~~Toggling USE_WALL_CLOCK_TRAVEL mid-game freezes traveling ships~~ | Resolved — wall-clock system removed (F-54) |
| B-103 | **Deferred orders create opposing flows on conquest**: When deferred orders activate after conquest, they can yield opposing move orders (A→B and B→A both active). Lane exclusivity enforcement does not trigger during deferred order activation. | 2026-03-27 |

---

## Planned Features — Feb 17-28 Session (F)

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| F-39 | Player color enforcement: min 30° hue difference | High | Done (SP + MP lobby) |
| F-40 | Player name enforcement: distinct names | High | Done (SP + MP lobby) |
| F-41 | Animation streaming mode (DEPART_STAGGER) | High | Done (2026-02-17) |
| F-42 | Per-phase arc controls (DEPART_ARC, ARRIVAL_ARC) | High | Partial — config + UI done, behaviors not wired |
| F-44 | Lane convergence point UX improvement | Medium | Planned |
| F-45 | GAME_CONFIG auto-persist via Proxy | High | Done (2026-02-17) |
| F-47 | Territory alpha overlay (Voronoi-based player control mask) | High | Planned |
| F-48 | Per-player VFX themes | High | Planned |
| F-49 | Arrowhead conquest animation | High | Done (2026-02-17) |
| F-50 | Split repair suppression | High | ❓ Implemented — `REPAIR_SUPPRESS_ATTACKER` (0.5) / `REPAIR_SUPPRESS_DEFENDER` (0.1), see `production.ts` |
| F-51 | Controls UI readability pass | High | Done (2026-02-18) |
| F-52 | Tick progress indicator | High | Planned |
| F-53 | Resizable controls drawer | Medium | Done (2026-02-18) |
| F-54 | Single-clock refactor | High | Done (2026-02-18) |
| F-55 | Multiplayer rejoin game | High | Planned |
| F-56 | MP chat & lobby | High | Planned |
| F-57 | Game notifications | Medium | Planned |
| F-58 | Game host wait timer | Medium | Planned |
| F-59 | Settings panel icon layout | Medium | Planned |
| F-60 | Two-column control panel layout | Medium | In Progress |
| F-61 | Drag-and-drop control panel reordering | Medium | Roadmap |
| F-62 | Game end overlay | High | Done (2026-02-19) |
| F-63 | Theme selector | Medium | Done (2026-02-19) |
| F-64 | Surrender-to-AI | High | Planned |
| F-65 | MP setup variables | High | Planned |
| F-66 | MP room disposal | Medium | Done (2026-02-19) |
| F-67 | In-game AI takeover | High | Planned |
| F-68 | Color conflict checking at init | High | Planned |
| F-69 | Main menu player identity widget | High | Planned |
| F-70 | Save & Load Maps | High | Done (2026-02-19) |
| F-71 | Restart modal | High | Done (2026-02-19) |
| F-72 | Composable conquest modes | High | Planned |
| F-73 | Save & load custom themes | Medium | Done (2026-02-19) |
| F-74 | Neutral stars in random maps | High | Planned |
| F-75 | Player color contrast check | High | Done (2026-02-19) |
| F-76 | Arrow formation speed slider | Medium | Planned |
| F-77 | Theme sub-modules | High | Planned |
| F-78 | Mobile responsive main menu | High | Done (2026-02-22) |
| F-79 | Mobile game UI | Critical | In Progress |
| F-80 | Fullscreen background | High | Done (2026-02-23) |
| F-81 | Mobile menu tab redesign | High | Done (2026-02-24) |
| F-82 | Background switcher | Medium | Done (2026-02-24) |
| F-83 | Performance investigation | Critical | Open |
| F-84 | Responsive game UI | Critical | Planned |
| F-85 | Map editor | High | Planned |
| F-86 | Territory halo overhaul | High | Done (2026-02-24) |
| F-87 | Density coloring hue fix | Medium | Done (2026-02-24) |
| F-88 | Nebula game board background | Medium | Done (2026-02-24) |
| F-89 | Pulsing corona ring | Medium | Planned |
| F-90 | Gravitational lensing | Medium | Planned |
| F-91 | Particle aura | Medium | Planned |
| F-92 | Always-on MP lobby | Critical | Planned |
| F-93 | Color palette picker | High | In Progress (2026-02-28) |
| F-94 | Compact Main Menu controls | High | Done (2026-02-28) |
| F-95 | Double-tap empty space to pause/play | Medium | Planned |
| F-96 | In-game floating settings gear icon | Medium | Planned |
| F-97 | UI typography pass | High | Done (2026-02-28) |

---

## Architecture (A)

> **Status: ALL DONE (F-36, verified 2026-03-27).** Single `GameEngine.ts` in `common/src/engine/` (394L). No client duplicate. `ORDER_CONFIG` deleted. `calculateCombatV4` wraps `@pax/common`.

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| A-1 | Engine Unification: Combat formula | ✅ | `calculateCombatV4` wraps `sharedCalculateCombat` from @pax/common |
| A-2 | Engine Unification: Transfer rate | ✅ | `ORDER_CONFIG` removed as dead code (2026-02-12) |
| A-3 | Engine Unification: Client combat delegation | ✅ | Client GameEngine.ts deleted; common is sole engine |
| A-4 | Engine Unification: Client tick delegation | ✅ | `gameStore` uses `GameEngine.tick()` from common |
| A-5 | Engine Unification: Map generation shared | ✅ | `@pax/common/mapgen` extracted (2026-02-14) |
| A-6 | Engine Unification: Config defaults sync | ✅ | `GAME_CONFIG` proxy auto-persists; overrides passed to engine |

---


---

## Supplement — merged trackers (2026-04-08)

Former parallel copies (`.atlas/FEATURE_STATUS.md`, `pax-fluxia/.atlas/FEATURE_STATUS.md`) are **deduplicated** here. IDs **MC-** = mobile client / shell, **RG-** = cross-cutting regressions, **TR-** = territory pipeline & rendering. Rows are **not** verbatim — combined duplicates; unique facts preserved.

### MC — Mobile & shell

| ID | Issue | Status | Date |
|----|-------|--------|------|
| MC-1 | Touch targets wrong after transpose (hit test vs render) | Fixed | 2026-03-01 |
| MC-2 | Full-map recenter ignores bottom UI | Fixed | 2026-03-01 |
| MC-3 | Territory lag on mobile (1–4 ticks before visual update) | Open | 2026-03-01 |
| MC-4 | Damaged orbit rings lerp on orientation shift | Open | 2026-03-01 |
| MC-5 | Map centering 0-origin asymmetric dead space | Fixed | 2026-03-02 |
| MC-6 | Pixel territory shows nothing on mobile | Fixed | 2026-03-02 |
| MC-7 | Lane territory oversized / wrong boundaries | Open | 2026-03-02 |
| MC-8 | Portrait wastes space — map gen doesn’t maximize viewport | Open | 2026-03-02 |
| MC-9 | All territory renderers invoked every frame | Fixed | 2026-03-03 |
| MC-10 | `app.resize is not a function` early PIXI init | Fixed | 2026-03-03 |
| MC-11 | Canvas resize feedback loop (localStorage/cache) | Shelved | 2026-03-15 |
| MC-12 | Deferred orders neutral-star case | Fixed | 2026-03-17 |
| MC-13 | hitTestStar log spam | Fixed | 2026-03-17 |
| MC-14 | MP combat intermittent (stale server suspected) | Intermittent | 2026-03-30 |
| MC-15 | Arrow appearance sliders missing from Map & Grid | Open | 2026-03-30 |
| MC-16 | Saved maps mixed into Classic list | Open | 2026-03-30 |
| MC-17 | Load Game: no file import | Open | 2026-03-30 |
| MC-18 | MP only random map in lobby | Open | 2026-03-30 |
| MC-19 | Restart incomplete / audio `NotSupportedError` | Open | 2026-03-30 |
| MC-20 | Lane arrowhead alpha ≠ shaft | Open | 2026-03-30 |
| MC-21 | Damaged ship size ignored shipSize sliders | Fixed | 2026-03-31 |
| MC-22 | Restart leaves territory fills when paused | Fixed | 2026-03-31 |
| MC-23 | Save Map saved full game state — split map vs game save | Fixed | 2026-03-31 |
| MC-24 | Load Game file import still missing in settings | Open | 2026-03-31 |
| MC-25 | AudioManager NotSupportedError spam | Fixed | 2026-03-31 |

### RG — Cross-cutting regressions

| ID | Issue | Status | Date |
|----|-------|--------|------|
| RG-1 | Territory rendering regressed during mobile layout | Active | 2026-03-02 |
| RG-2 | Audio conquest toggles not persisting | Active | 2026-03-02 |
| RG-3 | Segment-based transitions: massive movement / lag | Active | 2026-03-30 |

### TR — Territory pipeline, DY4 reference, DF (open / active)

| ID | Issue | Status | Date |
|----|-------|--------|------|
| TR-1 | DY4 ghost fill on conquest (overlapping prev+next) | Active | 2026-04-04 |
| TR-2 | DY4 snap vs animate (`prevMergedTerritories` null) | Active | 2026-04-04 |
| TR-3 | CLR flipping/rotating on conquest (`ActiveFrontFillMode` / topology path) | Active | 2026-04-04 |
| TR-4 | PVV2 DY4 Reference: fill/border misaligned vs clean pipeline | Active | 2026-04-04 |
| TR-5 | Territory gaps — shared Voronoi vertices modified per polygon | Open | 2026-03-03 |
| TR-6 | Corridor spacing <~45px fragments merge | Deferred | 2026-03-03 |
| TR-7 | Disconnect buffer distorts shapes | Open | 2026-03-03 |
| TR-8 | Vector borders async `extract.pixels` | Open | 2026-03-05 |
| TR-9 | Themes only localStorage | Open | 2026-03-06 |
| TR-10 | DF layer offset from starmap | Active | 2026-03-06 |
| TR-11 | PVV2 enclave overwritten by outer fill | Active | 2026-03-14 |
| TR-12 | Diagonal line artifacts (PIXI path) | Fixed | 2026-03-14 |
| TR-13 | Border/fill misalignment (single-path fix landed) | Fixed | 2026-03-17 |
| TR-14 | MSR default not 100 in themes | Open | 2026-03-14 |
| TR-15 | Theme export wrong name | Open | 2026-03-14 |
| TR-16 | Deferred orders regression | Fixed | 2026-03-30 |
| TR-17 | DY4 OT twisting (`alignPolygon` fix) | Fixed | 2026-03-17 |
| TR-18 | DY4 double-border after conquest | Active | 2026-03-18 |
| TR-19 | Rope border width changes during conquest | Active | 2026-03-18 |
| TR-20 | Graphics Morph unsatisfying | Active | 2026-03-18 |
| TR-21 | Transition modes duplicate VFX | Active | 2026-03-18 |
| TR-22 | Conquest timing slider persistence | Active | 2026-03-18 |
| TR-23 | Smoothing order inverted | Active | 2026-03-18 |
| TR-24 | Fills settle on second tick | Active | 2026-03-20 |
| TR-25 | Morph vertices teleport | Active | 2026-03-20 |
| TR-26 | Morph debug dots not drawn when paused | Active | 2026-03-20 |
| TR-27 | Double-filled enclaves (Geometry_0319) | Active | 2026-03-20 |
| TR-28 | 10× slow-mo ignores user timing | Active | 2026-03-20 |

### Planned features — batch F-120 — F-172 (from merged tracker)

| ID | Feature | Status | Priority | Date |
|----|---------|--------|----------|------|
| F-120 | Mobile CSS Grid layout | Done | High | 2026-03-01 |
| F-121 | Gear+hamburger in SpeedControls | Done | Medium | 2026-03-01 |
| F-122 | StatusBar replaces TopBar | Done | Medium | 2026-03-01 |
| F-123 | StatusBar stats / ships per tick | Done | Medium | 2026-03-01 |
| F-124 | StarNav cycling | Done | Medium | 2026-03-01 |
| F-125 | Player swatch in StatusBar | Done | Medium | 2026-03-01 |
| F-126 | Smooth camera transitions | Done | High | 2026-03-02 |
| F-127 | Stretch Map To Fit | Done | High | 2026-03-02 |
| F-128 | Main menu redesign | In Progress | Medium | 2026-03-02 |
| F-129 | Canvas debug infra | Done | Low | 2026-03-02 |
| F-130–F-132 | Audio persistence, per-sound files, audio themes | Done | Critical | 2026-03-02 |
| F-133 | New territory renderer idea | Idea | Medium | 2026-03-02 |
| F-104 | Contour renderer | Shelved | Medium | 2026-03-02 |
| F-134 | Restart+Quit sidebar | Done | High | 2026-03-02 |
| F-135 | Territory equalize angles (contour) | Shelved | Medium | 2026-03-02 |
| F-136 | Min shared-boundary length | Idea | Medium | 2026-03-02 |
| F-137 | Periphery coverage | In Progress | Medium | 2026-03-03 |
| F-138 | Modified Voronoi territories | In Progress | High | 2026-03-03 |
| F-138v2 | Power Voronoi V2 phase 2 | Phase 2 Done | High | 2026-03-03 |
| F-139 | Minimum star boundary margin | In Progress | High | 2026-03-03 |
| F-140 | Topographic renderer idea | Idea | Medium | 2026-03-03 |
| F-141 | Distinct conquest travel duration | Idea | Medium | 2026-03-03 |
| F-142 | Strength-blended borders | Done | High | 2026-03-03 |
| F-143 | Animated boundary modes | Testing | Medium | 2026-03-03 |
| F-144 | DF V1 shelved / V2 planned | Shelved/Planned | High | 2026-03-03 |
| F-145 | Built-in filesystem themes | In Progress | Medium | 2026-03-14 |
| F-146 | HSLA widget for territory colors | In Progress | Medium | 2026-03-14 |
| F-147 | Built-in filesystem maps | Done | Medium | 2026-03-14 |
| F-149 | Star System Appearance suite | Done | High | 2026-03-14 |
| F-150 | Classic map spacing factor | Done | Medium | 2026-03-14 |
| F-157 | Main menu map selection redesign | In Progress | High | 2026-03-15 |
| F-158–F-160 | Tutorial, controls guide, public lobby+chat | In Progress | mixed | 2026-03-15 |
| F-161 | Classic maps in MP | Done | Critical | 2026-03-15 |
| F-162 | Geometry Source dropdown | Planned | High | 2026-03-16 |
| F-163 | PVV3 geometry as modular engine | Planned | High | 2026-03-16 |
| F-164 | Remove Basic/Advanced/Developer settings gate | Queued | Medium | 2026-03-30 |
| F-165 | Beehiiv signup | Done | High | 2026-03-30 |
| F-166–F-167 | Arrow outline idea; star label element toggles | Idea/Queued | Medium | 2026-03-30 |
| F-168 | Main menu random preview + reshuffle | Done | High | 2026-03-31 |
| F-169 | PVV2 revival in modern master | Planned | High | 2026-03-30 |
| F-170 | DX equal split | Queued | Medium | 2026-03-30 |
| F-171 | Discord link on landing | Done | High | 2026-03-30 |
| F-172 | Random map gen UI enhancements | Done | High | 2026-03-31 |

### Feature ideas — territory / persistence (from merged tracker)

| ID | Idea | Priority | Date |
|----|------|----------|------|
| FI-1 | File persistence maps/themes/settings | High | 2026-03-05 |
| FI-2 | Border layers mode | Medium | 2026-03-06 |
| FI-3 | Default map load preference | High | 2026-03-06 |
| FI-4 | Audio in GAME_CONFIG + themes | High | 2026-03-07 |
| FI-5 | Power-weighted border colors | Medium | 2026-03-10 |
| FI-6 | Junction overlap blending | Medium | 2026-03-10 |
| FI-7 | MSR expansion (dynamic, gravity, etc.) | Medium | 2026-03-16 |
| FI-8 | Constraint cleanup CX/DX | High | 2026-03-16 |
| FI-9 | Player color badge in logs | Low | 2026-03-20 |

### Sub-repo UI snapshot (ex-`pax-fluxia/.atlas/FEATURE_STATUS`)

| Item | Status | Ref |
|------|--------|-----|
| Star Data Pill | Done | `7f4292b` |
| Star Label Color Mode | Done | `486e3c7` |
| Star Label Border Width | Done | `486e3c7` |
| Leash Line Toggle | Done | `7f4292b` |
| Main Menu V2 4-column / MP lobby / unified map selection / thumbnails / AI themes | Planned | design docs |

### FG2 / territory engine program notes (2026-03-12)

Long-form progress bullets lived in the old atlas file (FG2 half-edge, owner shells, trace inspector). **Not duplicated here.** See git history or session notes under `.agent/docs/project/sessions/`; code status summarized in `doc-review-architecture-docs.md` (2026-04-04).

**Also from that tracker (not expanded here):** PVV3 `borderGraphics` hidden-by-GameCanvas fix (2026-03-15); audio settings panel intermittent open on load (investigating, 2026-03-15); R-3 PVV3 interim frontiers — fills addressed via FG2 shells (`2f6234b`).

## Session Log

| Date | Summary |
|------|---------|
| 2026-05-01 | **Phase-field fill-path correction:** Reworked `metaball_grid_phase_field` so `Cell Shape`, `Cell Inset`, `Square Corner`, and `Inward Offset` now drive the actual visible PRE/POST fill presentation instead of only a conquest-mask intermediate. PRE and POST are rendered as cell-pattern territory layers clipped by resolved geometry, preserving the conquest composite while making the fill controls truthful. |
| 2026-04-30 | **Phase-field border overlay pass:** Fixed the remaining no-borders failure in `metaball_grid_phase_field` by restoring shared border semantics, adding a dedicated `Frontier Highlight` toggle, and painting a real border overlay layer that honors shared border width/alpha/HSL plus grid-border mode and shaping controls. |
| 2026-04-30 | **Phase-field follow-up pass:** Fixed chained-conquest replay by letting the stable PRE cache keep tracking presented truth during active phase-family transitions. Exposed real phase-field propagation-shape choice by removing the remaining hidden mode override. Added finish-tail tuning controls for PRE fade timing, cell-size collapse, final cell size, and frontier fade so the mode can settle into POST territory without a hard pop. Updated live starter values to use frontier propagation, territory-edge borders, and a 1px completion collapse baseline. |
| 2026-04-30 | **Metaball-grid replacement prototype landed:** Added additive render-family mode `metaball_grid_phase_field` that reuses the deterministic grid planner but swaps metaball presentation for conquest-local `PRE/POST` compositing plus frontier emphasis. Wired through `GameCanvas`, territory mode catalog, territory settings, diagnostics, benchmark mode selection, and shared config comments. Visual QA still pending. |
| 2026-04-08 | **FEATURE_STATUS reorganize:** Verbatim appendices removed; supplement tables **MC- / RG- / TR-** renumber parallel atlas bugs; F-120—F-172 + FI-* carry forward without row-for-row duplication of main **B-** list. |
| 2026-04-07 | **FEATURE_STATUS consolidation:** Single authority at `.agent/docs/project/features/FEATURE_STATUS.md`. Former `.atlas/` copies stubbed; `FEATURE_STATUS_atlas.md` → pointer. See `planning-docs-chronological-index.md` + `deep-audit-territory-phased-plan.md`. |
| 2026-02-15 | **Renderer Wiring (Phase D complete)**: Deleted inline rendering functions from `GameCanvas.svelte`, replaced with imported modules. `colorUtils` (-150 LOC), `StarRenderer` (-285 LOC), `LaneRenderer` (-366 LOC), `ShipRenderer` (-982 LOC), `containerFactory` (-80 LOC). **GameCanvas: 3020 → 1384 lines (-54%)**. Input layer stays inline (orchestrator code). D.6 skipped as design decision. |
| 2026-02-15 | **Renderer Extraction (Phase C)**: `RenderContext` interface, `containerFactory` (PIXI hierarchy + textures), `colorUtils` (HSL/density-tier), `StarRenderer` (stars/labels/icons/glow), `LaneRenderer` (connections/arrows/deferred), `ShipRenderer` (orbits/travel lifecycle/orb groups/attack surge/particle pool). All extracted to `pax-fluxia/src/lib/renderers/`. Zero new type errors. Wiring (Phase D) pending. |
| 2026-02-14 | **4002 FIX**: Resolved Colyseus "seat reservation expired" — root cause was dual `@colyseus/core` module instances from explicit WebSocketTransport import. Fix: let `Server.getDefaultTransport()` handle it. **Multiplayer now working online!** |
| 2026-02-14 | **Common core extraction**: `@pax/common/mapgen` module with `generateStarPositions()` + `generateConnections()`. Server `PaxRoom.initMap` wired. Client `GameEngine.initializeMap` wired. Red-team architecture review for renderer extraction. |
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
| 2026-02-16 | Ship stutter fix: arrival check used raw `travelDuration` without `travelDurationMult` — replaced with `result.done`. Panel reorg: split Ship Travel → Path & Easing + Surge & Orbs. Renamed Map Visuals → Map & Grid (basic tier). Added hex grid toggle, Star Inspector toggle. Removed always-visible StarsPanel. |
| 2026-02-16 | MP UX overhaul: Room browser fix (SDK 0.17 HTTP API), 3-option quit modal (stats/spectate/leave), server surrender handler + checkForWinner(), vote-based restart system, spectator banner. |
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

---
