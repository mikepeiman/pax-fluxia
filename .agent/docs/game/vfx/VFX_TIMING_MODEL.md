# VFX Timing Model — Universal Reference

> **Canonical reference** for animation/VFX timing control architecture.
> Project-agnostic. Update whenever better patterns emerge.

---

## Single-Clock Axiom

**One clock for all in-game VFX: game time.** Wall time is reserved exclusively for non-game UI (menus, tooltips, cursor).

All animation durations are defined in game-ms. The speed multiplier scales everything coherently. At 2× speed, every animation runs twice as fast. At 0.5×, everything slows proportionally. No per-animation "which clock?" decisions.

> [!CAUTION]
> Never use `performance.now()` directly in renderers. Use `gameNowMs` (or `gameNowMs / 1000` for seconds). The managed FXClock handles pause, resume, and speed scaling internally.

### Why Not Two Clocks?

Wall time for VFX was removed because:
- Mixing clock domains was the **#1 animation bug source**
- It created **incoherent visual pacing** at non-1× speeds (fast travel → slow settle)
- Every animation required a "which clock?" toggle — **accidental complexity**
- The toggles were band-aids for a problem that shouldn't exist

---

## The 4-Mode Binding Model

Every animation timing parameter supports **four binding modes** that control how its value relates to system-level timing variables.

| # | Mode | Icon | Behavior | Stored State |
|---|------|------|----------|--------------|
| 1 | **Free** | — | Value set directly via slider | value only |
| 2 | **Pin to Reference** | 📌 | Value equals reference (ms→ref ms, mult→1.0) | mode + ratio |
| 3 | **Lock Ratio → Reference A** | 🔗 | value = ratio × refA; recalcs when refA changes | mode + ratio |
| 4 | **Lock Ratio → Reference B** | 🎚️ | value = ratio × refB; recalcs when refB changes | mode + ratio |

### Reference Variables

| Ref | What | Example |
|-----|------|---------|
| **Ref A** | Simulation tick duration | `BASE_TICK_MS` (1200ms) |
| **Ref B** | Global animation speed | `ANIMATION_SPEED_MS` (800ms) |

### Mode Semantics

- **Pin (📌)**: Absolute binding. "This animation lasts exactly one tick."
- **Lock Ratio (🔗/🎚️)**: Proportional binding. "This animation is 0.65× the tick."
- **Free**: No binding. Manual control. May drift relative to tick/speed.

### Multiplier vs Millisecond Values

| Unit | Pin value | Ratio denominator |
|------|-----------|-------------------|
| `ms` | `ref_ms` | `value / ref_ms` |
| `×` | `1.0` | `value / ref_ms` |

---

## Slider Control Architecture

### Data-Driven Definition

```typescript
interface AnimSliderDef {
    key: string;          // Config key (e.g., 'SETTLE_DURATION_MS')
    label: string;        // Display label
    type?: 'slider' | 'toggle';
    min?: number;
    max?: number;
    step?: number;
    unit?: string;        // 'ms', '×', '×tick'
    group: string;        // Visual grouping
    desc?: string;        // Description (for toggles)
}
```

### Reactive State Mirror

Game config objects are typically plain JS (not reactive). Sliders must use a reactive mirror:

```typescript
let values = $state(initFromConfig());
function setValue(key, val) {
    CONFIG[key] = val;                    // Update engine
    values = { ...values, [key]: val };   // Trigger UI
}
```

### Lock State Persistence

Lock modes and ratios persist to `localStorage` as JSON:
- `{prefix}-modes` → `Record<string, LockMode>`
- `{prefix}-ratios` → `Record<string, number | null>`

---

## Anti-Patterns

| ❌ Anti-Pattern | ✅ Correct |
|----------------|-----------|
| Hardcode timing to tick progress | Independent duration configs per animation |
| Use `performance.now()` in renderers | Use `gameNowMs` from managed clock |
| Create opaque timing formulas | Named config key for every delay/stagger/duration |
| Use wall clock for in-game VFX | Single game clock for everything |

---

## UI Layout Principles

- **Density**: Label, value, and lock icons on one row
- **Scannability**: Group related params with border-left accent
- **Active locks**: Visually distinct (glow/pill bg)
- **Typography**: Monospace values, ≥11px, brighter than labels

---

## Changelog

| Date | Change |
|------|--------|
| 2026-02-18 | Removed two-clock architecture. Single game clock axiom. |
| 2026-02-18 | Initial version. 4-mode model, reactive mirror pattern. |
