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

### D-19: Engulf Ring — Perfect Circle Distribution
- **Decision**: Arriving conquest ships distribute their `settleStartAngle` evenly around 2π using batch index, not clustered at arrival direction.
- **Rationale**: All ships from the same source star arrive at the same angle, creating a gap. Even distribution creates a perfect engulf ring.
