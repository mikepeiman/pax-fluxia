# Active Settings Reference

## CRITICAL: Always check the user's actual settings, not code defaults

When debugging, reasoning about game behavior, or changing default values:

1. **Check saved themes first**: `common/resources/settings-themes/` contains the user's saved theme JSON files
2. **Most recent theme = likely active settings**: Sort by filename date, read the latest one
3. **Code defaults ≠ user's values**: `game.config.ts` defaults may differ significantly from what the user actually runs with
4. **When in doubt, ask**: If a behavior doesn't match expectations, check if the user is running non-default settings before speculating about bugs

## Canonical Locations

| What | Where |
|------|-------|
| Code defaults | `pax-fluxia/src/lib/config/game.config.ts` (GAME_CONFIG object) |
| Saved themes | `common/resources/settings-themes/*.json` |
| Runtime values | `localStorage` (browser, key: `pax-settings-*`) |

## When to check

- Before changing any default value
- When debugging animation/timing issues
- When the user reports unexpected behavior
- When reasoning about game balance or tuning
