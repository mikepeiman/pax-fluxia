# Mobile UI Issues — 2026-03-01

**Source**: User screenshots from phone (portrait + landscape in-game, portrait main menu)

---

## Issue 1: Landscape Game Speed Widget Overflow

**Severity**: High  
**Where**: In-game view, landscape orientation  
**Problem**: Speed control buttons are breaking out of the game speed widget to the right side. On desktop, buttons are contained within the widget. On mobile landscape, they overflow.  
**Fix**: Ensure all speed buttons stay contained within the game speed widget container. Use `overflow: hidden` or flex-wrap layout clamped to widget width.

## Issue 2: Portrait Map Not Rotated

**Severity**: High  
**Where**: In-game view, portrait orientation  
**Problem**: The map is rendered in landscape orientation within a portrait viewport. This wastes ~60% of the screen height as empty space above/below the map.  
**Required Behavior**: Map should always fit viewport by matching **longest side to longest side**:
- Landscape viewport → landscape map (current behavior)
- Portrait viewport → rotate/reflow map so the map's long axis matches the phone's long axis
- The game UI/HUD adapts to orientation, but the map itself always fills the viewport optimally.

## Issue 3: Main Menu Mobile Layout

**Severity**: High  
**Where**: Pre-game menu, portrait orientation  
**Problem**: Wasted space at top with large "PAX FLUXIA" title and subtitle. Start button requires scrolling to reach.  
**Required Changes**:
- Eliminate standalone title header; incorporate it into the menu panel itself in a compact, classy way
- Tighten all layout: widgets, typography, spacing
- "Start" button must be prominent and visible without scrolling
- Design to fit above the fold on mobile
