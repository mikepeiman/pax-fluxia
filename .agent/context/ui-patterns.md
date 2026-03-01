# UI Patterns — Deep Dive

## Layout Spatial Map

Before ANY UI placement change, consult this map and read `+page.svelte` to confirm current state.

```
┌─────────────────────────────────────────────────────────────┐
│  GAME LAYOUT (CSS Grid: area-canvas + area-right)           │
│                                                             │
│  ┌─────────────────────────────────┐  ┌──────────────────┐  │
│  │  AREA-CANVAS (main game area)   │  │  AREA-RIGHT      │  │
│  │                                 │  │  (right sidebar)  │  │
│  │  ┌──────────┐                   │  │                  │  │
│  │  │TOP-LEFT  │  ← overlay        │  │  Leaderboard     │  │
│  │  │StarsPanel│    (floating)      │  │                  │  │
│  │  └──────────┘                   │  │  CombatDebug     │  │
│  │                                 │  │  Panel (tuning)  │  │
│  │         GameCanvas              │  │                  │  │
│  │                                 │  │                  │  │
│  │  ┌──────────────┐               │  │                  │  │
│  │  │BOTTOM-LEFT   │ ← overlay     │  │                  │  │
│  │  │SpeedControls │   (floating)   │  │                  │  │
│  │  │Action Buttons│               │  │                  │  │
│  │  └──────────────┘               │  │                  │  │
│  └─────────────────────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Component → Position Mapping

| Component | Position | CSS Class | User Might Say |
|-----------|----------|-----------|----------------|
| StarsPanel | Top-left overlay | `.overlay-top-left` | "left panel", "star list" |
| SpeedControls | Bottom-left overlay | `.overlay-bottom-left` | "speed controls", "bottom left" |
| Leaderboard | Right sidebar top | `.section-commanders` | "leaderboard", "right top" |
| CombatDebugPanel | Right sidebar bottom | `.section-tuning` | "controls", "tuning", "sliders" |
| GameCanvas | Center | `.area-canvas` | "game area", "map", "canvas" |

### Process for UI Placement Requests
1. Read this map
2. Read `+page.svelte` to confirm current state
3. Identify which component by description/function, NOT by similar names
4. State the mapping explicitly before making changes
5. **UPDATE THIS MAP when layout changes are made**

---

## CSS Layout Rules

### Default: CSS Grid with Named Areas
```css
.layout {
    display: grid;
    grid-template-columns: 200px 1fr 300px;
    grid-template-areas:
        "sidebar main aside"
        "footer  footer footer";
}
.sidebar { grid-area: sidebar; }
```

- Grid with named areas is the default for ALL layouts
- Flex is acceptable for trivial single-axis layouts (a row of buttons)
- Never use unnamed column/row placement (`grid-column: 1`)

### Responsive Breakpoints
```css
@media (max-width: 900px) {
    /* 2-col → 1-col, tabs for section switching */
}
@media (max-width: 480px) {
    /* Compact spacing, smaller fonts, stacked forms */
}
```

### Flex Rules (When Used)
- `min-width: 0` on all flex children (prevents intrinsic overflow)
- Every child: `max-width: 100%; box-sizing: border-box`

### Mobile
- **44px minimum** touch target
- **20px** slider thumb
- Remove `clip-path` (causes overflow)
- No pseudo-element z-index layering over positioned children

### "No Goalpost Moving" Axiom
If a design breaks at a given size, **fix the design at that size**.
- DO: Shrink fonts, stack columns, wrap items, compress padding
- DO NOT: Remove features, change breakpoints, declare "not supported"

---

## Dark Theme Contrast

### Mandatory
- Always set explicit `background-color` and `color` on form elements (never default browser styles)
- Standard values:
  - Background: `var(--color-bg-secondary)` / `rgba(0,0,0,0.6)` / `#1a1a2e`
  - Text: `var(--color-text-primary)` / `#e0e0e0`
  - Borders: `rgba(255,255,255,0.1)` / `var(--color-border)`
- Test all interactive elements visually after styling

---

## Svelte 5 Reactivity Pattern

`GAME_CONFIG` is a plain JavaScript object — NOT Svelte 5 `$state`. Reading from it in templates does NOT trigger reactivity.

### Correct Pattern
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

**Rule**: Every slider that reads/writes GAME_CONFIG MUST use a `$state` mirror. All programmatic changes (lock/pin, recalculation) must also update the mirror.

## Responsive Design Protocol

When adapting UI between orientations or breakpoints, follow this protocol rather than applying CSS patches:

1. **Budget the constraint axis first** — landscape = height is scarce (use horizontal space), portrait = width is scarce (use vertical space). Count pixel budget before writing any CSS.
2. **Reflow, don't just reposition** — if elements are stacked vertically, ask: should they be side-by-side in landscape? If side-by-side, should they stack in portrait?
3. **Eliminate, don't just hide** — if a label doesn't fit, use an icon. Don't `display:none` and call it redesigned.
4. **One-screen rule for overlays** — fullscreen overlays must fit ALL content without scrolling. Compact (smaller fonts, tighter gaps) rather than adding scroll.
5. **Test the dimension you changed** — mentally walk through what happens to EVERY element in the constrained dimension before committing.

**Anti-patterns**: Applying `!important` overrides to force desktop layouts into mobile, hiding text without replacing with icons, keeping vertical stacks in landscape when horizontal space is available.
