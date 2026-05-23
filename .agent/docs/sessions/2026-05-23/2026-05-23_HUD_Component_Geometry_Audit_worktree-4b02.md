# HUD Component Geometry Audit - Worktree 4b02 - 2026-05-23

## Purpose

The requested rounded gold-to-dark border treatment was not an isolated preference. It is part of the Aurelia Drift mockup language: rounded dark glass panels, thin warm metallic strokes, calm spacing, and a map-first command interface. The failure mode was implementing by local component/token tweaks instead of first mapping the whole screen against the supplied reference.

Correct process for the next UI pass:

1. Inventory every visible component.
2. Locate it mathematically inside the viewport.
3. Define what it does.
4. Compare the live geometry and visual treatment against the mockup.
5. Change the implementation only after the surface-level model is explicit.

## Coordinate System

Measured live game at a controlled desktop viewport of `1904 x 985`.

Coordinates use `x, y, w, h` in pixels. Percentages are relative to the measured viewport. `x=0` is the left edge, `y=0` is the top edge. “Right inset” and “bottom inset” are measured from the component’s far edge to the viewport edge.

## Global Layout

The screen is a three-column command HUD below a full-width topbar:

```text
y 0
┌──────────────────────────────────────────────────────────────────────────────┐
│ topbar: full width, 64px / 6.5vh                                            │
├──────────────────┬─────────────────────────────────────────────┬─────────────┤
│ settings rail    │ playfield / Pixi map                        │ tactical    │
│ 340px / 17.86vw  │ 1174px / 61.66vw                            │ 390px       │
│                  │                                             │ 20.48vw     │
└──────────────────┴─────────────────────────────────────────────┴─────────────┘
```

The playfield sits between the settings rail on the left and the tactical rail on the right. With settings open, the map is reduced to `61.66%` of viewport width. With settings closed, the map expands to `79.52%` and the tactical rail remains fixed at `390px`.

## Component Inventory

| Component | Selector | Location and Size | Function |
|---|---|---:|---|
| Master game layout grid | `.game-layout` | At the viewport origin. `x=0 y=0 w=1904 h=985`, `100% x 100%`. | Owns the global CSS grid: topbar above, settings/playfield/tactical below. |
| Topbar grid area | `.area-topbar` | Along the top edge, above all lower HUD regions. `x=0 y=0 w=1904 h=64`, `100vw x 6.5vh`. | Places the structural topbar across the whole screen. |
| Topbar surface | `.pf-hud-topbar` | Coincident with topbar grid area. Bottom edge is at `y=64`. | Contains brand/menu, local player summary, tick/speed/selection status, render mode chips, standings/settings controls. |
| Brand cluster | `.pf-hud-topbar__brand` | Near the upper-left corner, inset `14px` from left and `15px` from top. `250 x 34`. | Main menu button, brand mark, and `PAX FLUXIA` wordmark. |
| Local player summary badge | `.pf-hud-topbar__player-summary` | Right of brand cluster, left of central status. `x=406 y=11 w=221 h=42`. | Shows `You/Command`, active ships, total ships, and stars. |
| Match status group | `.pf-hud-topbar__status` | Centered horizontally in the topbar band. `x=769 y=7 w=356 h=49`. | Groups tick, speed, and selected-star context. |
| Central tick capsule | `.pf-hud-topbar__status-item:first-child` | Inside status group, leftmost status item. `x=769 y=7 w=132 h=49`. | Primary tick/turn readout. Should visually echo the mockup center command badge. |
| Topbar mode chips | `.pf-hud-topbar__modes` | Right of status group and left of action cluster. `x=1266 y=17 w=331 h=30`. | Territory render mode shortcuts. |
| Topbar action cluster | `.pf-hud-topbar__actions` | Near the upper-right edge, inset `14px` from right. `x=1739 y=14 w=151 h=36`. | Standings badge/toggle and settings close/reopen affordance. |
| Settings rail grid area | `.area-controls` | Below topbar against the left edge. `x=0 y=64 w=340 h=921`, `17.86vw x 93.5vh`. | Docked control/settings rail. |
| Settings ribbon shell | `.pf-settings-ribbon` | Coincident with settings rail. `x=0 y=64 w=340 h=921`. | Shell for search, import/export, theme library, icon ribbon, active settings section. |
| Settings search/action block | `.settings-header-tools` | Inside settings rail, inset `12px`. `x=12 y=76 w=316 h=786`. | Search settings plus JSON/MD import/export and clear-all actions. |
| Theme library panel | `.pf-theme-library` | Inside settings block, below search/actions. `x=23 y=231 w=294 h=301`. | Theme selector, save/update/export/import, and theme list. |
| Theme list viewport | `.pf-theme-library__list` | Inside theme panel, below theme actions. `x=34 y=376 w=272 h=145`. | Scrollable newest-first theme rows. |
| Active settings section panel | `.section-panel` | Not present in the measured no-section state. | Holds controls for a selected settings section. |
| Settings icon ribbon | `.icon-toolbar` | Starts near bottom of settings rail. `x=12 y=874 w=316 h=280`; bottom extends `169px` below viewport. | Section navigation icons. Current geometry is deficient because the ribbon overflows the visible rail instead of occupying a stable docked band. |
| Playfield grid area | `.area-canvas` | Between settings rail and tactical rail, below topbar. `x=340 y=64 w=1174 h=921`, `61.66vw x 93.5vh`. | Owns Pixi canvas and selected-star tray overlays. |
| Pixi game canvas | `canvas` | Coincident with playfield. `x=340 y=64 w=1174 h=921`. | Renders territories, stars, lanes, labels, and ship motion. |
| Tactical rail grid area | `.area-right` | Below topbar against the right edge. `x=1514 y=64 w=390 h=921`, `20.48vw x 93.5vh`. | Docked intelligence stack. |
| Player standings panel | `.pf-standings` | Top of tactical rail, inset `13px` left and `12px` right. `x=1527 y=76 w=365 h=386`. | Player rankings and active/total/stars/production/percent metrics. |
| Game speed panel | `.pf-game-speed` | Under standings. `x=1527 y=481 w=355 h=110`. | Pause and speed controls. |
| Star View panel | `.pf-selected-star-panel` | Under game speed. `x=1527 y=601 w=355 h=240`. | Selected-star inspection, or empty select-a-star prompt. |
| Tactical overview card | `.tactical-overview-card` | Under Star View, above quick access. `x=1527 y=781 w=365 h=118`. | Compact per-player tactical summary and tick context. |
| Quick-access dock | `.pf-quick-access-dock` | Bottom of tactical rail, inset `12px` right and `22px` bottom. `x=1527 y=911 w=365 h=52`. | Unlabeled global quick-access icon buttons. |
| Selected-star command tray | `.pf-selected-star-tray` | Not present because no star was selected during measurement. | Contextual selected-star actions; should appear over the lower playfield when a star is selected. |

## Reference-Derived Requirements Reinforced By This Audit

- Rounded corners and gold-to-dark borders are not optional chrome; they are part of the supplied Aurelia Drift style.
- The topbar should read as one disciplined command spine, not multiple unrelated widgets distributed across the row.
- Side rails should feel like framed instruments attached to the screen edge, not generic app panels.
- The settings rail must be a real ribbon: the icon navigation cannot overflow below the viewport and cannot be displaced by oversized utility content.
- The theme library is a first-class settings utility and must match the same shell grammar as standings, Star View, gamespeed, and quick access.
- The right rail stack is spatially coherent, but its internal type, row rhythm, and icon treatment still need to be judged against the mockups component by component.
- The playfield must remain the dominant surface; every persistent rail width must be justified against map readability.

## Immediate Deficiency List

- The settings icon ribbon begins at `y=874` and extends to `y=1154`, which means `169px` is outside the viewport. That is a broken ribbon layout.
- The settings search/action block consumes `786px` of vertical space before the icon ribbon has a stable home. This contradicts the mockup, where primary navigation remains persistently available.
- The topbar achieves the correct broad structure but not the same premium silhouette and ornamental restraint as the reference.
- The tactical rail uses acceptable positions and sizes, but its panel internals still require row-level alignment and visual grammar checks against the mockups.
- The map/canvas occupies only `61.66vw` with settings open. This is acceptable for an expanded settings state, but the default working state should preserve more map unless the user is actively editing settings.
