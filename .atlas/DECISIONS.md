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
- **Rationale**: Current takeover dialog shows stale/wrong metadata. Spectator mode provides accurate live-state information before committing to a player
