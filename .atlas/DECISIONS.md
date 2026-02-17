# Design Decisions

## 2026-02-17

### Animation Disjoint Fix (B-63)
**Decision**: Ships keep travel-phase visuals (alpha:1, scale:0.9) on arrival. Settle is immediate when `ARRIVAL_SPREAD=0` (new default). Old stagger behavior preserved as theme option when `ARRIVAL_SPREAD > 0`.

### GAME_CONFIG Auto-Persistence
**Decision**: Wrapped `GAME_CONFIG` in a Proxy that debounce-saves to localStorage (key: `pax-fluxia-game-config`) on every property write. Runtime fields (`_MAP_*`) excluded. This replaces the per-variable persistence approach in GameSettingsPanel.

### Leaderboard Init Fix (B-73)
**Decision**: Replaced `SharedEngine.tick()` (which returned early due to `isPaused=true`) with direct `SharedEngine.updatePlayerStats()` call. Same fix applied both server-side (GameRoom.ts) and client-side (gameStore.svelte.ts).

### Animation Controls Strategy
**Decision**: Build animation system around configurable phases: departure, travel, arrival/settle. Each phase has timing, easing, and arc controls exposed in `GAME_CONFIG` and accessible via GameSettingsPanel. Key new controls:
- `DEPART_MODE_STREAM`: steady-interval ship departure (tickDuration/shipCount)
- Arc intensity configurable per phase
- Convergence point as a configurable option
