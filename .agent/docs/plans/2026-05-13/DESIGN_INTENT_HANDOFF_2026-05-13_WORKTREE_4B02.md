# Design-Intent Handoff - In-Game UI - Worktree 4b02 - 2026-05-13

## Purpose

This document captures the intended UI/UX direction for the in-game HUD, settings surface, leaderboard, tactical widgets, theme controls, topbar, and quick-access tools.

It is intentionally design-only.

It does not describe code structure, file ownership, or implementation details.

Its job is to preserve:

- what the user actually wants
- what must not happen again
- the overall visual and interaction standard
- the specific behavioral and compositional requirements for each UI surface

## Status Of This Document

This is the design-intent source of truth for the current HUD redesign effort.

If implementation drifts from this document, the implementation is wrong.

## Core Mandate

The in-game UI must feel like one coherent, authored game interface, not a collection of unrelated widgets.

The entire visible surface is one responsibility:

- topbar
- settings/search/theme shell
- settings ribbon
- leaderboard
- gamespeed
- Star View
- quick-access icons
- their layout relationship to the playfield

No component should be "improved" in isolation if doing so damages consistency, readability, balance, or spatial logic elsewhere.

## Product Character

The interface should feel:

- premium
- calm
- controlled
- legible
- tactical
- game-native
- spatially disciplined

It should not feel:

- like an admin dashboard
- like a prototype stack of panels
- noisy
- cluttered
- over-labeled
- stylistically mixed
- improvised

The overall mood should be heroic sci-fi through restraint and precision, not through decorative excess.

## Non-Negotiable Design Principles

### 1. One System

All visible in-game UI surfaces must share:

- one shell language
- one typography system
- one icon language
- one spacing rhythm
- one docking model
- one hierarchy logic

### 2. Protect The Playfield

The map is the primary visual surface.

The HUD must support the playfield rather than compete with it.

This means:

- tighter silhouettes
- cleaner edges
- fewer redundant boxes
- fewer redundant labels
- lower visual noise
- clearer collapse behavior

### 3. Solve Clarity Spatially, Not Verbally

If grouping is weak, the answer is not to add more labels.

The interface should not need filler labels such as:

- `Actions`
- `Low-frequency`
- `Quick Tools`

If a region needs those labels to make sense, the grouping is wrong.

### 4. Consistency Beats Novelty

No local "creative flourish" is allowed to break the visual language of the surrounding HUD.

That includes:

- different font voices
- random border styles
- mixed icon families
- browser-default chrome
- mismatched button logic
- uneven density

### 5. Detail Matters

Spacing, balance, padding, alignment, and internal hierarchy are not optional polish items. They are the work.

The standard is detail-oriented quality design, not merely "functionally present."

## Explicit User Requirements

This section records the user's direct requirements and critiques as design requirements.

### Initial right-rail and settings requirements

The user wants:

- theme selection integrated into the top settings utility area so it reads as one widget or one command block
- the settings category launcher changed from a broad icon cluster into a vertical menu/ribbon
- leaderboard promoted in priority
- gamespeed and Star View positioned beneath leaderboard rather than above it
- stronger hierarchy in Star View
- redundant lower theme controls removed
- redundant lower menu toggle removed

### Leaderboard requirements

The user wants:

- a collapsible leaderboard
- collapsed state reduced to a topbar-height badge
- player info still present in collapsed state
- aligned columns in expanded state
- a small, clear dominant-metric toggle between active ships and total ships
- title and subtitle areas that do not overlap or visually collide
- active/damaged labels replaced or shortened using representative icons where appropriate

### Star View requirements

The user wants:

- a serious redesign rather than a small restyle
- more breathing room
- better internal layout and visual flow
- far fewer font voices
- no tiny debug-style text under control buttons
- no redundant owned-count badge
- an icon replacing the text `FIT`
- clear selected-star reflection when a star is clicked
- a surface that is visually balanced and clearly prioritized

The user explicitly rejected:

- cramped layout
- no-padding presentation
- white default-looking borders
- meaningless or unclear labels
- visually jammed metrics

### Quick-access requirements

The user wants:

- global icon buttons returned to the bottom-right area
- the bottom quick-access strip to visually match the right-column width family
- no visible `Quick Tools` label
- the concept understood as quick-access icons, not a verbose labeled toolbar

### Theme library requirements

The user wants:

- scroll instead of uncontrolled long-list growth
- newest-to-oldest ordering
- no text wrapping in theme rows
- ellipsis truncation for long names
- sub-category grouping removed or hidden for now
- a tighter, more compact presentation

### Settings ribbon requirements

The user wants:

- a collapsible ribbon instead of a generic icon menu
- horizontal compact and expanded states
- compact width around half the current visual footprint
- expanded width around fifty percent wider than compact, with labels visible
- vertical collapse into the topbar as a stub
- collapse behavior located alongside the leaderboard collapse logic in the overall shell

### Layout architecture requirements

The user wants:

- one master layout for the whole game view
- named grid areas as the right conceptual model
- controls able to dock left or right
- leaderboard column able to dock left or right as well

### Strong critiques that become hard requirements

The user explicitly rejected:

- multiple unrelated font voices on one small surface
- broken title/subtitle overlap
- unrelated actions living inside the theme cluster
- corrupted or sloppy icon treatment
- topbar treated as a sibling instead of part of the master layout
- missing or unclear settings collapse control
- extra labels added to compensate for weak composition

## General UI/UX Interpretation Of The Mandate

The intended interface is a command console, not a settings app.

The redesign should therefore privilege:

- hierarchy over quantity
- grouping by usage frequency
- visual silence between strong actions
- tighter shells with clearer purpose
- visible structural controls

The redesign should not privilege:

- stuffing more data into every card
- making every region equally loud
- decorative panel layering
- copy-heavy explanation
- unnecessary subpanels

## Spatial Architecture

## Master Layout Model

The full game view should be treated as one layout system with these conceptual regions:

- topbar
- playfield
- controls column
- leaderboard and tactical column
- bottom quick-access strip

The topbar is part of that layout, not an external overlay bolted on afterward.

## Docking Model

The interface must support:

- controls on left or right
- leaderboard/tactical column on left or right

This should feel intentional, not like mirrored leftovers.

Whichever side hosts a column should preserve:

- the same width logic
- the same edge treatment
- the same spacing cadence
- the same quick-access strip relationship

## Collapse Model

Collapse behavior must be obvious, visible, and structural.

Required collapsible surfaces:

- settings ribbon
- leaderboard

Required collapsed forms:

- settings collapses into a visible topbar stub
- leaderboard collapses into a topbar-height badge

The user should never have to guess how to reopen a collapsed region.

## Surface Intent By Cluster

## Topbar

The topbar is a structural spine.

Its job is to host:

- collapse/reopen affordances
- compact session or mode context
- compact summary state when needed

It should not feel like:

- a second independent dashboard
- a dumping ground for many unrelated buttons
- a verbose information strip

Topbar design rules:

- compact height
- clean horizontal flow
- no stacking caused by missing layout logic
- no unnecessary decorative labels
- no unrelated quick tools living here if they belong to bottom quick access instead

## Settings / Search / Theme Surface

This should feel like one utility shell.

Its job is to unify:

- search
- theme selection
- structural ribbon controls
- relevant import/export or management tools

The theme area must feel functionally coherent.

That means:

- theme selection and theme library belong together
- unrelated actions do not belong beside them
- `Load Map` does not belong in the theme cluster

The search/settings utility shell should read as:

- one purposeful command area
- not several unrelated toolbars stacked together

## Settings Ribbon

This is not just an icon strip.

It is a navigational ribbon with clear compact and expanded states.

Compact state should:

- be narrow
- be icon-led
- stay visually quiet

Expanded state should:

- reveal labels
- feel like a drawer extension of the compact state
- not look like a completely different component

Vertical collapse should:

- reduce the ribbon into a topbar stub
- preserve obvious reopen affordance
- remain spatially connected to the shell

## Leaderboard

The leaderboard is a tactical summary surface, not a decorative scoreboard.

Expanded state should feel:

- dense but readable
- aligned
- typographically controlled
- clean in header and subtitle areas

Collapsed state should feel:

- useful
- compact
- topbar-native
- instantly legible

Important leaderboard rules:

- one coherent header hierarchy
- no overlapping title/subtitle treatment
- columns align cleanly
- active vs total emphasis is clear and small
- long labels should be reduced through icon shorthand where sensible

## Gamespeed

Gamespeed should be visually compact and tightly controlled.

It belongs to the tactical family with Star View.

Its visual design should therefore match Star View in:

- shell treatment
- spacing rhythm
- control sizing
- icon/button logic

It should not carry debug microcopy or tiny secondary noise beneath the buttons.

## Star View

Star View is a tactical detail card and must be treated with the most care.

It should feel like:

- a focused tactical readout
- spacious enough to scan
- clearly centered on the selected star
- calm and intentional

It must not feel like:

- a cramped debug panel
- a raw data dump
- a default form control

Design rules for Star View:

- strong internal padding
- no default-looking white border
- clear header hierarchy
- clean separation between navigation controls and star identity
- selected star must be visually obvious
- no redundant badges
- no meaningless shorthand without context
- no extra prose labels invented to compensate for weak layout

Data semantics are out of scope for this design handoff, but the shell must clearly support:

- selected star identity
- type identity
- state summary
- tactical metrics
- navigation and fit controls

without collapsing into clutter.

## Quick-Access Icons

Quick-access icons should live in the bottom dock strip.

They should be:

- unlabeled on the surface
- visually consistent
- same container logic as the rest of the HUD buttons
- easy to scan

They should not:

- look corrupted
- use mixed glyph styles
- require a visible `Quick Tools`-style heading

## Theme Library

The theme library should feel compact and manageable.

Required behavior and presentation:

- scrollable
- newest first
- single-line rows
- truncation with ellipsis
- no visible sub-category clutter for now

It should feel like a practical list, not a sprawling content browser.

## Visual Language

## Typography

The user strongly objected to too many fonts on one surface.

The design intent should therefore be a strict and limited system.

Recommended default:

- one primary UI font for labels, headings, buttons, and general panel copy
- one secondary mono/data font for numbers, codes, timers, and compact tactical values

Hard rule:

- do not allow many competing font voices on the same surface

Typography goals:

- clean hierarchy
- strong readability
- consistent rhythm
- no accidental title collisions
- no tiny debug-feeling copy under main actions

## Iconography

All icons should belong to one family.

That family should feel:

- geometric
- technical
- clean
- slightly sharp
- consistent in stroke and container logic

Hard rules:

- no emoji
- no random text-glyph icons
- no mixed icon families on adjacent surfaces
- no corrupted-looking glyph treatment

The `FIT` action should become a proper icon control rather than a text button label.

## Color And Shell

The HUD should use a restrained, premium sci-fi palette.

General direction:

- dark, quiet base surfaces
- controlled cyan or cool highlight states
- controlled amber or warm emphasis states
- player colors used for player meaning, not generic chrome
- destructive actions clearly separated

Hard rules:

- no accidental white browser-default borders
- no one-off local shell treatments that clash with neighboring surfaces
- no random accent usage that breaks hierarchy

## Spacing And Balance

Spacing must communicate hierarchy.

That means:

- important actions get room
- related items cluster tightly
- unrelated items separate clearly
- internal card rhythm must be consistent

Hard rules:

- no jammed content
- no no-padding cards
- no forced density that harms readability
- no collapsing many typographic voices into a tiny region

## Copy And Labeling Rules

Copy should be sparse and useful.

Rules:

- no redundant region titles
- no labels invented to explain weak grouping
- no vague prose labels for tactical values
- no debug microcopy exposed to the player

Specific prohibited visible labels unless user later asks for them:

- `Actions`
- `Low-frequency`
- `Quick Tools`

`Quick access icons` is a conceptual term, not a visible heading by default.

## Interaction Rules

## Settings Collapse UX

The settings surface must have:

- one obvious collapse control
- one obvious reopen control
- a believable collapsed form in the topbar

The best pattern here is a structural handle or chevron model, not a hidden close affordance.

The collapsed stub should still visually belong to the settings system.

## Leaderboard Collapse UX

The leaderboard should:

- collapse cleanly into a topbar-height badge
- preserve useful player information
- reopen from an obvious control

The collapsed badge should look intentional, not like a broken remnant.

## Left/Right Docking UX

Docking should feel like a layout preference, not a hack.

Rules:

- dock switches must be easy to find
- mirrored layouts should retain equal polish
- no side should feel like the "real" layout while the other feels improvised

## Anti-Patterns To Avoid

These are design failures explicitly rejected by the user or clearly contrary to the mandate:

- treating the interface as disconnected widgets
- using many fonts in one small surface
- broken title/subtitle overlap
- adding extra labels to explain poor grouping
- unrelated functions grouped beside theme controls
- browser-default form or fieldset styling
- cluttered topbar
- ambiguous collapse behavior
- mixed icon systems
- visually corrupted quick-access icons
- cramped Star View layout
- no-padding tactical cards
- shells that fight the playfield instead of supporting it

## Out Of Scope For This Document

This handoff does not attempt to specify:

- combat math
- exact gameplay semantics
- authoritative meaning of tactical values
- internal data wiring

This is intentional.

The user explicitly redirected the work toward style, layout, composition, clarity, and consistency rather than combat-value design.

## Acceptance Criteria

The redesign should only be considered successful if, at a glance, the player can say:

- this all looks like one game
- the playfield is still primary
- the right or left control surfaces feel deliberate
- the topbar makes structural sense
- the settings ribbon is understandable in both compact and expanded forms
- the leaderboard is readable in both collapsed and expanded states
- the theme controls feel coherent and self-contained
- the bottom quick-access icons feel clean and useful without a heading
- Star View feels balanced, spacious, and selected-star-centered
- nothing looks like a default browser control or accidental leftover

## Questions Worth Confirming

These are the highest-value design questions still open:

1. In the collapsed leaderboard badge, should the featured player always be the local player, or should it show the current leader by default?
2. When the settings ribbon is vertically collapsed into the topbar, should the stub be icon-only, or icon plus a short label?
3. Should the controls column and leaderboard/tactical column be independently dockable by default, or usually mirrored as a pair unless the user explicitly splits them?
4. Should quick-access icons remain a fixed curated set, or do you eventually want them user-configurable?
5. On the visual tone axis, should the HUD lean more toward disciplined military instrumentation, or more toward sleek cosmic elegance?

## Closing Statement

The intended UI is not merely "cleaner."

It is:

- one authored system
- low-noise but high-confidence
- tactical without becoming technical clutter
- elegant without becoming decorative
- flexible without becoming incoherent

Any implementation that misses those qualities, even if it technically contains the requested features, is not meeting the design intent.
