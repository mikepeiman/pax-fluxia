# Always Expose Tuning Variables

## CRITICAL: Repeated instruction (2+ times as of 2026-02-13)

When implementing ANY new feature, mechanic, or visual effect:

1. **ALWAYS expose tuning variables** to the game config / settings UI
2. **NEVER hardcode** a value that could be tuned
3. If unsure whether something should be tunable — make it tunable

## Examples

Instead of:
```typescript
const settleDuration = 500; // hardcoded
```

Do:
```typescript
const settleDuration = GAME_CONFIG.CONQUEST_SETTLE_MS ?? 500;
```

And ensure the config value is exposed in the debug/tuning panel.

## Applies To
- Animation timings
- Visual parameters (radius, opacity, scale)
- Gameplay mechanics (rates, percentages, thresholds)
- ALL numeric constants that affect behavior or appearance
