# Svelte 5 Slider Reactivity Rule

## Problem Pattern

GAME_CONFIG is a plain JavaScript object — NOT Svelte 5 `$state`. Reading from it in templates does NOT trigger reactivity. Sliders that display `GAME_CONFIG` values will show stale data.

## Bad Pattern (Non-Reactive)
```typescript
function getAnimValue(key: string): number {
    return (GAME_CONFIG as any)[key]; // ❌ Not reactive
}
```

## Good Pattern (Reactive)
```typescript
// Mirror values in a $state object
let animValues = $state<Record<string, number>>({});

function getAnimValue(key: string): number {
    return animValues[key] ?? (GAME_CONFIG as any)[key]; // ✅ Reactive
}

function setAnimValue(key: string, val: number) {
    (GAME_CONFIG as any)[key] = val;     // Update engine
    animValues = { ...animValues, [key]: val }; // Trigger reactivity
}
```

## Rule
**Every slider that reads/writes GAME_CONFIG MUST use a `$state` mirror for its displayed value.** Always write to BOTH the config AND the reactive state. All programmatic value changes (lock/pin, recalculation) must also update the reactive mirror.
