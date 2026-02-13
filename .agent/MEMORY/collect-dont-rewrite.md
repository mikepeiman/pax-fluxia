# Collect, Don't Rewrite — Animation Effects Policy

## CRITICAL: Repeated instruction (3+ times as of 2026-02-13)

When implementing new visual effects or animations:

1. **NEVER delete existing animation code** to replace it with new code
2. **ALWAYS keep the existing implementation** as a selectable option
3. **Add the new implementation alongside** with a config/setting toggle
4. Build a library of animation variants that can be mixed and matched

## Applies To
- Conquest animations
- Transfer animations
- Ship spawning effects
- Any visual/animation behavior

## Pattern
```typescript
// game.config.ts
CONQUEST_ANIMATION_MODE: 'immediate' | 'surge' | 'travel'

// In rendering code
if (mode === 'immediate') { /* ... */ }
else if (mode === 'surge') { /* ... */ }
```

## Violation History
- 2026-02-13: Deleted conquest travel animation and replaced with immediate spawn, instead of keeping both as options
