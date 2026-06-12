# Concise UI Design Instructions - Pax Fluxia In-Game HUD - 2026-05-13

## Purpose

Capture only the user's concrete UI design instructions for Pax Fluxia's in-game HUD. This is the short version. It excludes general design theory and code references.

## Overall Direction

- Treat the entire in-game HUD as one coherent command surface, not separate widgets.
- The map/playfield remains primary; HUD panels must support it without visual clutter.
- The style should be premium, legible, tactical, and game-native.
- Use one consistent typography system, one icon language, one shell grammar, and one spacing rhythm.
- Do not add labels to compensate for weak grouping.

## Layout

- The game view should be governed by one master layout model.
- Topbar belongs inside the game layout, not as a separate sibling overlay.
- Use named layout regions conceptually: topbar, playfield, controls/settings ribbon, leaderboard/tactical column, quick-access strip.
- Controls/settings may dock left or right.
- Leaderboard/tactical column may dock left or right.
- Docked layouts must feel equally intentional on either side.

## Topbar

- Topbar is a compact structural spine.
- It should host collapse/reopen controls and compact status/context only.
- It must not become a dumping ground for global buttons.
- Settings collapse and leaderboard collapse controls should be visible and understandable from the topbar area.

## Settings Ribbon

- Replace the settings icon grid/menu with a collapsible ribbon.
- Horizontal compact state should be about half the current width.
- Expanded state should be about 50% wider than compact and show labels.
- The ribbon must also vertically collapse into a topbar stub.
- The collapse/reopen control must be obvious; no hidden close behavior.

## Theme Controls

- Theme selection belongs in the top settings utility area as part of one coherent widget/block.
- Remove redundant lower theme widgets.
- Do not place unrelated controls in the theme cluster.
- `Load Map` does not belong near theme controls.
- Theme Library must scroll, order newest to oldest, use single-line rows, truncate long names with ellipsis, and hide sub-category grouping for now.

## Leaderboard

- Leaderboard should be the primary right/side-column anchor.
- It must collapse to a topbar-height badge with player info.
- Expanded leaderboard needs clean aligned columns.
- Add or preserve a small active-ships vs total-ships emphasis toggle.
- Fix title/subtitle overlap and any superimposed text.
- Replace long `active / damaged` wording with compact representative icons where appropriate.

## Gamespeed

- Gamespeed belongs with the tactical widgets beneath the leaderboard.
- Remove tiny debug-like text beneath buttons.
- Its typography, buttons, and spacing must match Star View and the rest of the HUD.

## Star View

- Star View needs a serious layout redesign, not a minor restyle.
- It should expand slightly if needed, but free space by removing clutter.
- It must reflect the clicked/selected star.
- Show star type visually with a type icon.
- Show active and damaged ships clearly.
- Replace `FIT` text with an icon: rectangle/frame with crosshairs.
- Remove PID/debug text and redundant owned-count badges.
- No default-looking white square borders, no no-padding containers, no jammed metric blocks.
- Avoid unclear labels such as `outgoing`, `incoming`, `1/3`, `0.33x`, or prose like `Holding without incoming pressure` unless the meaning is visually and semantically obvious.

## Quick-Access Icons

- Global icon buttons go back to the bottom-right or bottom-docked strip.
- Their strip should match the leaderboard/right-column width family.
- Do not show a `Quick Tools` label.
- Treat them as quick-access icons with clean consistent icon treatment.
- Do not use corrupted glyphs, emoji, or mixed icon styles.

## Explicitly Rejected

- `Actions`, `Low-frequency`, and `Quick Tools` as visible section labels.
- Multiple competing fonts in a small HUD surface.
- Broken title/subtitle layout.
- Unrelated actions grouped into theme controls.
- Topbar stacking or layout caused by missing parent layout.
- Any UI surface that looks like a raw/default browser form control.
