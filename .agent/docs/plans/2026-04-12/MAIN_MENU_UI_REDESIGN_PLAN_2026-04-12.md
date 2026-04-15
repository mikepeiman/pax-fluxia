# Main Menu UI Redesign Plan - 2026-04-12

## Purpose

This document owns all Main Menu UI redesign work and is intended as a standalone handoff for a parallel implementation agent.

This document covers only Main Menu UI structure and interaction design. It does **not** cover mapgen semantics, lane generation, ship pathing, conquest runtime behavior, territory correctness, or multiplayer backend behavior.

## Product Goal

Rebuild the Main Menu so it is authoritative, compact, standard in its interaction behavior, and aligned with the game-first UI principles already established for Pax Fluxia.

The menu should feel like a polished game setup surface, not a stack of experimental controls. It should keep one visible truth for each concept, minimize attention waste, and avoid developer-facing explanatory text.

## Hard Ownership Boundary

This UI workstream owns:

- [MainMenu.svelte](C:/Users/mikep/Desktop/WebDev/pax-fluxia/pax-fluxia/src/lib/components/ui/MainMenu.svelte)
- Main Menu panel structure and control grouping
- Player rows, player color control presentation, AI row presentation
- Anchor Hue control presentation as a knob
- Row-anchored HSL popovers
- Floating topbar composition and placement
- Removal of redundant or misleading menu surfaces
- Standard dismissal behavior for popovers

This UI workstream does **not** own:

- board fill map generation logic
- lane generation semantics
- ship travel logic
- conquest movement logic
- public-room backend behavior
- contested-lane midpoint-vstar semantics
- territory renderer correctness

## UI Design Rules

- A row that configures an entity must also own that entity's visible state.
- One concept gets one visible control surface.
- Fix broken indicators; do not hide them unless the concept itself is intentionally removed.
- No player-facing technical or subsystem text.
- Cyclic values use cyclic affordances; hue uses a knob/dial, not a linear slider.
- Utility controls belong to one explicit utility cluster, not stray viewport chrome.
- No status or helper rows unless they directly improve player decision-making.
- Popovers and overlays follow standard UI behavior: outside click and `Esc` dismiss them.
- Persistent HUD-like menu chrome should stay compact and keep attention on the setup choices, not on framing widgets.

## Post-Mortem Context For The Implementer

The prior Main Menu pass failed in a repeatable way:

- It centralized color control into a separate palette surface instead of making each player row authoritative.
- It removed broken indicators instead of fixing them in place.
- It added non-requested attention-wasting UI like `Selected` status rows and detached adjust controls.
- It optimized for small local edits instead of honoring the complete interaction model already specified by the user.
- It left stray utility chrome and split one concept across multiple surfaces.

The implementer should explicitly avoid repeating those failure modes.

## Target Layout

Three main panels remain:

- `Game & Map`
- `Players`
- `Multiplayer`

A thin floating topbar sits above the panel row and contains:

- background selector
- audio control
- settings gear

The topbar is the only utility/control chrome outside the three main panels.

## Lo-Fi Layout Mockup

```text
                 [ BG ] [ Audio knob ] [ Gear ]
        ------------------------------------------------

+---------------------------+ +-----------------------------------+ +---------------------------+
| GAME & MAP                | | PLAYERS                           | | MULTIPLAYER               |
| Random | Classic | Custom | | Anchor Hue: (knob)  221 deg       | | Create Lobby              |
| Stars / Links / Spacing   | |                                   | | Room ID / Join           |
| Board Fill / Lane Path    | | [P1 swatch] Mike   Human          | | Public Room card first   |
| Curve vs Prune / Margins  | | [P2 swatch] Normal [Strategy]     | | Auto-refresh list        |
| Preview / Reshuffle       | | [P3 swatch] Normal [Strategy]     | | Lobby / players / chat   |
| Start                     | | [P4 swatch] Normal [Strategy]     | |                           |
| Create Lobby              | | [P5 swatch] Normal [Strategy]     | |                           |
|                           | | [P6 swatch] Normal [Strategy]     | |                           |
|                           | |                                   | |                           |
|                           | | swatch click -> row-anchored HSL  | |                           |
|                           | | popover (Hue nudge / Sat / Light) | |                           |
+---------------------------+ +-----------------------------------+ +---------------------------+
```

## Decision-Complete UI Spec

### 1. Topbar

- Keep one compact floating topbar above the panel cluster.
- The topbar contains exactly:
  - background selector
  - audio control
  - settings gear
- Remove any remaining top-right viewport utility controls outside this cluster.
- The topbar should float relative to the menu cluster, not the full viewport corner.

### 2. Players Panel

- The Players panel becomes a row-authoritative editor.
- Remove the standalone palette card model.
- Remove the detached `Adjust color` button model.
- Remove any `Selected` summary/status row.
- Remove duplicate visible color indicators from AI rows and MP rows.

#### Player rows

- There is one row per active player.
- Every row begins with the authoritative color swatch for that player.
- Clicking the swatch opens that row's HSL popover.
- The active row highlight should come from row focus/interaction state, not from a separate summary surface.

#### P1 row

- swatch
- commander name field
- human role indication only if needed, and only in a subtle game-native way

#### P2+ rows

- swatch
- AI difficulty selector
- AI strategy selector when advanced AI mode is enabled

### 3. Anchor Hue

- `Anchor Hue` moves into the Players panel header.
- It is displayed as a knob/dial, not a slider.
- It sits inline with the Players panel controls.
- It controls the shared palette anchor for the active player rows.

### 4. HSL Popover

- The HSL control surface is attached to the clicked row/swatch.
- It contains:
  - hue nudge
  - saturation
  - lightness
- It dismisses on:
  - outside click
  - `Esc`
- It should feel like a normal popover, not a debug widget or detached modal.

### 5. Game & Map Panel

- Keep the three map tabs:
  - `Random`
  - `Classic`
  - `Custom`
- Tighten control spacing and grouping, but do not redesign mapgen semantics in this task.
- Group sliders and toggles so related map settings are visually clustered.

### 6. Multiplayer Panel

- Keep multiplayer room/lobby controls in their own panel.
- Do not duplicate player color indicators here.
- The panel may show player names and room state, but color should not become a second setup surface.

## Visual Direction

- Preserve the existing Pax Fluxia visual language rather than replacing it.
- Improve hierarchy, compactness, and intent.
- Keep the playfield/background visually present.
- Avoid dashboard-style equal-weight boxes and avoid extra helper chrome.
- Use the existing neon/sci-fi styling more deliberately and with tighter spacing discipline.

## Acceptance Criteria

- The Main Menu has exactly three main panels plus one compact floating topbar.
- The Players panel is the only visible player-color setup surface.
- Each player row owns its own color state visibly and interactively.
- Anchor Hue is presented as a knob.
- There is no `Selected` summary row.
- There is no detached `Adjust color` button.
- There are no duplicate visible AI-row or MP-row color indicators.
- Popovers dismiss on outside click and `Esc`.
- No player-facing technical subtext remains.
- The topbar no longer leaves stray utility controls in the viewport corner.

## Explicit Non-Goals

- Do not change map generation behavior here.
- Do not change lane generation behavior here.
- Do not change ship or conquest travel behavior here.
- Do not change public-room backend logic here.
- Do not change territory render-family logic here.
