---
trigger: always_on
description: DY4 Optimal Transport is the sacrosanct default — do not break it
---

# DY4 Sacrosanct Rule

## CRITICAL: DY4 Optimal Transport is the canonical default border animation mode

DY4 produces the most unique and attractive border animations in the game. It is **sacrosanct** — do not modify, break, or change its behavior without explicit user approval.

## Configuration Chain

| Setting | Value |
|---------|-------|
| `TERRITORY_ENGINE_MODE` | `'dynamic'` |
| `TERRITORY_ENGINE_DYNAMIC_METHOD` | `'dy4_optimal_transport'` |
| `TERRITORY_ENGINE_STATIC_METHOD` | `'fg1_adaptive_field'` |
| Adapter | `legacy_pvv2` → `PowerVoronoiRenderer` |
| Direct toggle | `TERRITORY_POWER_VORONOI: true` |

## Rules

1. **Never change DY4 defaults** in `registry.ts` or `game.config.ts` without user approval
2. **Never modify `PowerVoronoiRenderer.ts`** in ways that could alter DY4 visual output without verification
3. **Before any territory refactor**, verify DY4 renders correctly both before and after
4. **If a change could affect rendering**, test by starting a game and watching border animations during conquest
5. **When in doubt, ask** — DY4 is the user's primary visual experience

## References

- `.atlas/DECISIONS.md` → D-77
- `registry.ts` → SACROSANCT comment block
- `game.config.ts` → SACROSANCT comment
