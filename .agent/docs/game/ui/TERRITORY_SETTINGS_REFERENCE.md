# Territory Settings Reference

Updated: 2026-05-03

## IA Rules

- Territory mode selection lives in the topbar, not in Settings.
- `Phase Field`, `Phase Edges`, and `Ember Lattice` are separate mode-local settings sections.
- `Territory Topology` owns shared ownership and geometry-source rules.
- `Territory Styles` owns shared surface styling when no dedicated mode-local wrapper is active.
- `Frontier FX` owns cross-mode inward seam effects for frontier-enabled metaball-grid renderers.
- `Diagnostics` owns overlays, measurement helpers, recorder/export tools, and mode-status readouts.

## Current Top-Level Sections

- `Phase Field`
- `Phase Edges`
- `Ember Lattice`
- `Frontier FX`
- `Territory Topology`
- `Territory Styles`
- `Diagnostics`
- `Map Options & Tuning`

Notes:

- `Territory Styles` is intentionally hidden while `Phase Field`, `Phase Edges`, or `Ember Lattice` is active, because those mode-local sections surface their own relevant territory controls inline.
- `Frontier FX` is visible when the active render mode supports the shared frontier-distance seam path: currently `metaball_grid` and `metaball_grid_ember_lattice`.

## Phase Field

File surface:
- `C:\Users\mikep\Desktop\WebDev\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\TerritoryPhaseFieldSettings.svelte`
- `C:\Users\mikep\Desktop\WebDev\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\MetaballGridTuning.svelte`

### Surface

- `Territory fill`
  - `Saturation`
  - `Lightness`
  - `Alpha`
- `Territory border`
  - `Show border`
  - `Width`
  - `Saturation`
  - `Lightness`
  - `Alpha`
- live border-status note
  - `Territory edge - singular blended centerline`
  - `Territory edge - split cell strokes`
  - blocked-state explanations when borders are disabled

### Grid

- `Transition Spacing`
- `Pattern Spacing`
- `Grid Density`
- `Origin Mode`
- `Distribution`
- `Position Jitter`
- `Max Cells`
- `Cell Shape`
- `Cell Inset (px)`
- `Inward Offset`
- `Square Corner (px)`
- `Border Mode`
- `Singular blended territory border`
- `Frontier Highlight`
- `Border Chaikin Passes`
- `Shared Edge Smoothing`
- `Shared Edge Trim`

### Wave

- `Adjacency`
- `Propagation Shape`
- `Propagation Source`

### Flip

- `Flip Transition`
- `Flip Window`
- `Wave Easing`
- `FlipTime Jitter`

### Finish

- `Finish Fade Start`
- `Finish Fade End`
- `Size Collapse Start`
- `Size Collapse End`
- `Final Cell Size`
- `Frontier Fade Start`
- `Frontier Fade End`

### Perf

- painted / emittable / total cell counts
- requested / effective spacing
- requested / effective density
- last / EMA frame time
- plan-build timings
- frame counters
- cache mode / visible frame state

## Phase Edges

File surface:
- `C:\Users\mikep\Desktop\WebDev\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\MetaballGridTuning.svelte`
- `C:\Users\mikep\Desktop\WebDev\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\TerritorySurfaceStyleTuning.svelte`

Purpose:

- simpler edge-forward metaball-grid mode
- no contour/frontier comparison block
- shared grid, wave, flip, and inline style/border controls only

### Shared Surface Controls Inline In Phase Edges

These remain visible in the Phase Edges section because they define the mode's edge-forward read without Ember Lattice's contour-derived seam stack.

#### Fill

- `Territory fill`
  - `Saturation`
  - `Lightness`
  - `Alpha`
- `Cell Shape`
- `Cell Inset`
- `Square Corner`
- `Flush Boundary Fill`
- `Inward Offset`

#### Border

- `Territory border`
  - `Show border`
  - `Width`
  - `Saturation`
  - `Lightness`
  - `Alpha`
- `Border Mode`
- `Centered-blended borders`
- `Border Chaikin Passes`
- `Shared Edge Smoothing`
- `Shared Edge Trim`

### Wave / Flip / Perf

- `Adjacency`
- `Wave Geometry`
- `Wave Seeding`
- `Flip Transition`
- `Flip Window`
- `Wave Easing`
- `FlipTime Jitter`
- grid perf diagnostics

## Ember Lattice

File surface:
- `C:\Users\mikep\Desktop\WebDev\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\MetaballGridTuning.svelte`
- `C:\Users\mikep\Desktop\WebDev\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\TerritorySurfaceStyleTuning.svelte`
- `C:\Users\mikep\Desktop\WebDev\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\ControlsSection-FrontierFx.svelte`

Purpose:

- dense square-lattice territory renderer with contour-derived, blended frontiers
- branch-derived renderer separated from generic Phase Edges so both modes can evolve independently

### Frontier / Comparison Controls

- `Preset Rows`
- `Frontier Technique`
- `Phase Sampling`
- `Blur Passes`
- `Triangle Diagonal`
- `Frontier Chaikin`
- `Shader Softness`
- `Band Width`

### Shared Surface Controls Inline In Ember Lattice

These remain visible in Ember Lattice because they materially define the branch renderer's visible seam.

#### Fill

- `Territory fill`
  - `Saturation`
  - `Lightness`
  - `Alpha`
- `Cell Shape`
- `Cell Inset`
- `Square Corner`
- `Flush Boundary Fill`
- `Inward Offset`

#### Border

- `Territory border`
  - `Show border`
  - `Width`
  - `Saturation`
  - `Lightness`
  - `Alpha`
- `Border Mode`
- `Centered-blended borders`
- `Outer perimeter border`
- `Border Chaikin Passes`
- `Frontier Border Geometry`
- `Shared Edge Smoothing`
- `Junction Render`
- `Junction Gap Trim`
- `Junction Bubble Radius`

### Wave / Flip / Perf

- `Adjacency`
- `Wave Geometry`
- `Wave Seeding`
- `Flip Transition`
- `Flip Window`
- `Wave Easing`
- `FlipTime Jitter`
- frontier / border-geometry perf diagnostics

## Frontier FX

File surface:
- `C:\Users\mikep\Desktop\WebDev\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\ControlsSection-FrontierFx.svelte`

Purpose:
- fill-side inward seam effects driven by the shared frontier-distance field
- does not own topology
- does not own border geometry

Controls:
- `Mode`
- `Width`
- `Strength`
- `Softness`
- `Steps`
- `Pulse Speed`
- `Apply in steady state`
- `Apply during transition`

## Territory Topology

File surface:
- `C:\Users\mikep\Desktop\WebDev\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\TerritoryTopologyTuning.svelte`
- `C:\Users\mikep\Desktop\WebDev\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\TerritoryGeometrySourceTuning.svelte`
- runtime controls routed through `ControlsSection-Territory.svelte` with `view="modes"`

Belongs here:
- `Base Geometry Source`
- shared CX / DX / MSR / corridor / disconnect / min-margin rules
- ownership-geometry source selection
- territory engine / fill-transition / border-transition runtime controls

Does not belong here:
- topbar mode selection
- mode-local frontier-technique comparisons
- fill-side seam FX

## Territory Styles

File surface:
- `C:\Users\mikep\Desktop\WebDev\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\ControlsSection-Territory.svelte`
- `C:\Users\mikep\Desktop\WebDev\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\TerritorySurfaceStyleTuning.svelte`

Subsections:
- `Fill`
- `Border`
- `Finish`

Purpose:
- shared surface styling when no dedicated territory mode wrapper is active
- principally the base `metaball_grid` and non-phase territory families

## Diagnostics

Belongs here:
- `Show Hex Grid`
- `Star Inspector`
- `Rotate Map (Transpose)`
- measurements
- recorder / bundle controls
- export controls
- mode diagnostics

Does not belong here:
- regular map-layout tuning
- phase-field / phase-edges / ember-lattice styling
- topology ownership rules

## Regression Checklist

When territory settings regress, verify these first:

1. `Phase Field` still contains `Inward Offset` and the grid/border-path controls listed above.
2. `Phase Edges` remains the simpler edge-forward mode and does not silently absorb Ember-only contour/frontier controls.
3. `Ember Lattice` still exposes the frontier-technique comparison block.
4. `Frontier FX` still exists as its own top-level section.
5. `Territory Topology` still includes `Base Geometry Source`.
6. `Diagnostics` still contains `Show Hex Grid`, `Star Inspector`, and `Rotate Map (Transpose)`.
7. `Territory Styles` subsections remain `Fill`, `Border`, and `Finish`.
