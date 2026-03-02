# Architecture Decisions

## 2026-02-17

### D-10: Join Confirmation Modal z-index
- **Issue**: B-74 — confirm overlay had `z-index: 200`, behind `menu-fullscreen` at `z-index: 9999`
- **Decision**: Bumped to `z-index: 10000`
- **Rationale**: Modal must render above the menu that spawns it

### D-11: Player Color Enforcement Strategy
- **Decision**: Min 30° hue gap enforced in two places:
  1. **SP/client**: `enforceHueSpacing()` in `MainMenu.svelte` before `applyConfig()`
  2. **MP/server**: `hexToHue` + shift logic in `GameRoom.onJoin()` lobby path
- **Gap**: Takeover path (L203-255) was missed → B-77

### D-12: Streaming Departure Mode
- **Decision**: `DEPART_STAGGER` boolean — when true, ships depart at evenly-spaced intervals (`effectiveTickMs / shipsToMove * shipIndex`) instead of random jitter
- **Rationale**: Creates steady stream visual rather than chaotic burst

### D-13: Per-Phase Arc Intensity (Partial)
- **Decision**: Added `DEPART_ARC_INTENSITY` and `ARRIVAL_ARC_INTENSITY` to config, PhaseContext, and UI
- **Gap**: Values exist but behaviors.ts doesn't read them yet → B-78

### D-14: Spectator-First Takeover (Planned)
- **Decision**: R-124 — players joining in-progress games should enter as spectators first, observe the game, then click a player to take over

### D-15: Per-Player VFX Themes (Planned)
- **Decision**: F-48 — every player MUST be able to have their own VFX/animation theme settings (UX/GX) without affecting other players in multiplayer
- **Rationale**: VFX settings are currently global via `GAME_CONFIG` + localStorage. In MP, each client already has its own local `GAME_CONFIG`, so settings are inherently per-client. Need to verify this holds true and no VFX settings leak through the server state
- **Rationale**: Current takeover dialog shows stale/wrong metadata. Spectator mode provides accurate live-state information before committing to a player

### D-16: Settle Animation — NO Tiny Dots
- **Decision**: Ships arriving into orbit MUST appear at full orbit scale (`0.8`) and full alpha (`1.0`) immediately. **Never** start at small scale/low alpha and bloom up.
- **Rationale**: The "tiny dots that bloom" effect (scale 0.3→0.8, alpha 0.5→1.0) was universally disliked. Reverted twice (2026-02-17). This is a hard constraint.
- **Code**: `ShipRenderer.ts` settle block — `ship.scale = 0.8; ship.alpha = 1.0;` (both during and after settle)

### D-17: All Animation Timing Uses FXClock Game Time
- **Decision**: Zero `performance.now()` in renderers or FX handlers. All timestamps use `state.gameNowMs` (renderers) or `ctx.gameTime` (handlers), both sourced from `FXClock`.
- **Rationale**: Wall-clock timing caused 3 bug classes: animations ignoring pause, persisting across game restart, and ignoring speed settings. FXClock (already in `clock.ts`) is pause-aware, speed-scaled, and resets on new game.
- **Code**: `FXClock.tick()` called per-frame from `GameCanvas.svelte`; `gameNowMs` field on both `ShipRenderState` and `StarRenderState`

### D-18: No Opaque Animation Timing — Everything Must Be Tunable
- **Decision**: Every animation delay, stagger, and duration MUST be exposed as a `GAME_CONFIG` slider or at minimum documented with its formula. No hidden timing math that the user can't inspect or tune.
- **Lesson**: `ARRIVAL_SPREAD` stagger formula used `destShips.length / (destShips.length+1) * staggerWindow`, silently creating 2000ms+ delays at stars with 100+ ships. The fix was trivial (use batch index instead), but the bug persisted across dozens of iterations because the formula was opaque. **If `settleStartTime` had been exposed with a slider or set to 0 on conquest, the user could have diagnosed this in seconds.**
- **Anti-pattern**: Never write an integral animation function that is opaque, unexposed, and unspecified. When the user insists on tunability, that means ALL timing parameters, not just the ones that seem important.

### D-20: Opposing Orders — Client-Only Game Rule
- **Decision**: `ALLOW_OPPOSING_ORDERS` is a client-only boolean (not syncd to server). When `false` (default), issuing A→B cancels any existing B→A order. When `true`, both coexist.
- **Rationale**: Order management is handled entirely in `GameCanvas.addPendingOrder()` (client-side `pendingOrders` Set). No server logic needed — the server just processes whatever orders arrive. Exposed in both pre-game MainMenu and in-game GameSettingsPanel "Rules" section.

### D-19: Engulf Ring — Perfect Circle Distribution
- **Decision**: Arriving conquest ships distribute their `settleStartAngle` evenly around 2π using batch index, not clustered at arrival direction.
- **Rationale**: All ships from the same source star arrive at the same angle, creating a gap. Even distribution creates a perfect engulf ring.

## 2026-02-18

### D-21: Orders Immediate, Attacks Tick-Gated
- **Decision**: Orders (player drag A→B) take effect immediately on the client. Attack surge animation waits for the next tick boundary to begin rendering.
- **Mechanism**: `starsInCombat` set is populated from `CombatEvent` at tick boundary. Surge only renders when `starsInCombat.has(star.id)` — i.e., when the tick has confirmed this star is in combat.

### D-23: Orb Modes Are Full Visual Packages
- **Decision**: An orb mode controls the ENTIRE travel visual — both the orb draw style AND whether individual ships are visible during travel. "Orb Mode 1" specifically preserves the ships+orbs combo (individual ships visible alongside orb power effects at destination). When B-90 is fixed (proper one-orb-per-transfer), Mode 1 must re-enable the dual-render behavior.
- **Key**: Selecting an orb mode is a single UI choice that configures multiple rendering behaviors, not just the orb shape.

## 2026-02-24

### D-24: Visual Layer Semantic Naming — Star Power vs Territory
- **Decision**: Rename `TerritoryRenderer` → `StarPowerRenderer`, `SHOW_TERRITORY` → `SHOW_STAR_POWER`. Per-star radial halos represent fleet strength/power, not ownership geometry.
- **Rationale**: "Territory" describes ownership boundaries (Voronoi cells, metaball fields). Per-star halos that scale with ship count are "star power" — a visual indicator of strength radiating from individual stars. Naming must describe what the visual *represents*, not the rendering technique.
- **Rule**: Added to `.agent/memory/semantic-naming.md` (Visual Layer Naming section)

## 2026-03-01

### D-25: Consumption-Layer Transpose for Map Orientation
- **Decision**: Star coordinate transposition (x↔y for portrait/landscape) must happen at the point of consumption (rendering, territory worker, world-bounds), NOT in the data layer (toGameState). A shared `mapTranspose` flag provides `x(star)`/`y(star)` utilities.
- **Rationale**: `toGameState()` only runs at tick time. Mutating star objects or swapping in toGameState creates stale-coordinate windows between ticks where rendering, territory, and view scaling use non-transposed values.

### D-26: Topbar Renamed to "StatusBar"
- **Decision**: The top UI bar is now called "StatusBar" (or "statusbar"). It displays game info only — no controls live here.

### D-27: StatusBar Design — CSS Grid + Minified Leaderboard
- **Decision**: StatusBar uses CSS Grid layout containing a minified leaderboard display and player-color swatch.

### D-28: Star Cycling Navigation Widget
- **Decision**: A `< [⊕] >` widget cycles through the player's owned stars. `<` and `>` cycle prev/next. `[⊕]` recenters full-map view. Zoom level for star focus is user-controllable (slider). This widget is a standalone component.

### D-29: Player-Color Swatch in StatusBar
- **Decision**: Two-part swatch — outer shape uses player's territory color+pattern, inner inset shape uses player's primary color fill.

### D-30: Settings + Hamburger Combined in Speed Widget
- **Decision**: Gear icon (settings) and hamburger icon merge into a single small widget within the game speed control area, freeing the statusbar for info display only.

### D-31: Mobile Layout uses CSS Grid
- **Decision**: Mobile game layouts refactor from current approach to CSS Grid for proper spacing, UI avoidance, and responsive behavior.

## 2026-03-02

### D-32: Map Transpose Must Match Physical Device Rotation (F-107)
- **Decision**: When the device rotates counter-clockwise (portrait → landscape), the map must rotate to match. A star at top-right in portrait should appear at top-left in landscape. Implemented via 90° CCW rotation transform: `displayX = star.y`, `displayY = mapWidth - star.x`.
- **Rationale**: The player's spatial memory of star positions must be preserved across orientation changes. A simple x↔y swap without axis flip keeps stars in the same quadrant, which feels like a layout shift rather than a rotation.
- **Critical**: The axis flip must use `GAME_WIDTH` (pre-transpose narrow dimension, ~900), NOT `GAME_HEIGHT` (~1600). Using the wrong dimension caused a 700px vertical offset regression (2026-03-02).
