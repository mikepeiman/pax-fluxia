# UI Layout Spatial Map

## CRITICAL: Before ANY UI placement change, consult this map

When the user uses positional language (left, right, top, bottom, sidebar, overlay, panel), you MUST:

1. **Read the layout file** (`+page.svelte`) to confirm current component positions
2. **Map the user's description** to an actual component using this reference
3. **State the mapping explicitly** before making changes

## Current Layout Reference (Pax Galaxia)

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
│  │  │(was logs)│                    │  │  CombatDebug     │  │
│  │  └──────────┘                   │  │  Panel (tuning/  │  │
│  │                                 │  │  controls)       │  │
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

## Component → Position Mapping

| Component | Position | CSS Class | User Might Say |
|---|---|---|---|
| StarsPanel | Top-left overlay | `.overlay-top-left` | "left panel", "star list", "where logs were" |
| SpeedControls | Bottom-left overlay | `.overlay-bottom-left` | "speed controls", "bottom left" |
| Leaderboard | Right sidebar (top) | `.section-commanders` | "leaderboard", "right top" |
| CombatDebugPanel | Right sidebar (bottom) | `.section-tuning` | "controls panel", "tuning", "right panel", "sliders" |
| GameCanvas | Center | `.area-canvas` | "game area", "map", "canvas" |

## Process for UI Placement Requests

1. Read this map
2. Read `+page.svelte` to confirm current state
3. Identify which component the user is referring to by description/function, NOT by similar names
4. State: "You're referring to [component] at [position]. I will place [new thing] at [position]."
5. Only then make the change

## UPDATE THIS MAP when layout changes are made!
