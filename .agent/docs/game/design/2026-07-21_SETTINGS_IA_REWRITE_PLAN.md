---
date created: 2026-07-21
author: opus-ui-cutover
status: active plan (Phase A in progress)
---

# Settings IA Rewrite — Plan & Architecture

## Mandate (user, 2026-07-21)
Rewrite the **entire Settings information architecture** — not the detail fixes. The whole
surface below the top categories is a mess: semantics, subsection groupings, duplicate
controls, control labels/descriptions. The 8 top-level **categories** (`settingsTaxonomy.ts`)
are *soft-locked* — decent, likely kept, but reviewable. **Everything else is rework.**

## Root diagnosis — THREE parallel structures that should be ONE
1. `settingsRegistry.ts` — the 17 **sections** + some **subsections** (data).
2. `settingMetadata.ts` — `SCOPE_LABEL_META`, a **hand-authored `label→{key,description}` map**
   per scope, used to build the **search index**. Decoupled from what's rendered → drifts.
3. `ControlsSection-*.svelte` (+ `CellGridTuning` / `TerritorySurfaceStyleTuning` /
   `GridGradientTuning`) — the **actual rendered controls**, with subsection grouping encoded as
   component-internal `{#if}`/`showModule()` logic and labels/descriptions hand-written inline.

Every named defect is drift between these three:
- search text ≠ visible text (`settingMetadata` "Geometry Smooth Passes" vs rendered "Border
  Rounding (Chaikin passes)" for `VORONOI_BORDER_SMOOTH`);
- "Chaikin" → 6 results (raw config-key substring matching + a duplicate label entry);
- duplicate controls (same key rendered by two components / two views);
- controls appearing in two subsections / inconsistent groupings (grouping is per-component code,
  not data);
- search-result highlight animation misses (`data-setting-config-key` placement inconsistent;
  hand-rolled rows lack it).

## Target architecture — one control-level registry ([[settings-are-data-not-dom]])
A single declarative registry where **each control is data**:
`{ configKey, panelKey, label, description, category, section, subsection, controlType,
range/options, default, tier/audience, invalidationDomain, gatingId?, component? }`.
Then:
- **Panel renders by projecting the registry** (group by section → subsection; a small renderer
  handles the common row types; genuinely bespoke controls declare a `component` but STILL carry
  registry metadata for home/label/description/search).
- **Search index derives from the registry** (label + description only — no raw-key noise, no
  parallel map). `settingMetadata`'s hand map is deleted.
- **Infotips read description from the registry** (styled, 50 ms open delay).
- **`data-setting-config-key` placed once on the outer row by the shared renderer** → the
  highlight animation works everywhere by construction.
- **Totality test**: every user-facing `GAME_CONFIG` key appears **exactly once** in the
  registry, in exactly one subsection (no dup, no orphan). This makes the defect class impossible.

## Current IA map (verified from `settingsTaxonomy.ts` + `settingsRegistry.ts`)
| Category (soft-locked) | Sections | Subsections |
|---|---|---|
| Gameplay | players, match_flow(*Timing*), combat_tuning, economy, travel_orders, conquest | — |
| Fleet & Stars | fleet_star_visuals | star-scale, ship-size, halos, orbit, star-shape, ownership-ring, labels, arrows, damaged, interaction, density, glow (12) |
| Territory & Render | territory_tuning(*Topology*), territory_styles(*Render*), frontier_fx, transition | territory_styles = one chip per render mode (catalog-derived) |
| Map & Effects | map_options, effects | map_options: background, map-layout, labels-inspector, connections |
| Audio | audio | master, event-sounds, conquest |
| Interface | (none — themes/appearance/stats/hotkeys render as utility drawers) | — |
| Typography | (none — TypographyTokenPanel drawer) | — |
| Developer | diagnostics, logging, ai | diagnostics: overlays, measurements, recorder, exports, debug-tools, mode-diagnostics |

Note the seams: Territory splits into 4 sections + an internal Modes/Tuning/Styles/Transition
"view" system inside `ControlsSection-Territory` — a prime candidate for reconciliation.

## Phased plan
- **A — INVENTORY** *(in progress, 4 agents)*: extract every control → master control list
  (key, label, description, type, range, current home, gating, duplicates, hand-rolled, oddities).
- **B — DESIGN new IA**: propose subsection groupings + dedup resolutions + label/description
  rewrites + a top-category review → **USER SIGN-OFF** (groupings are the user's call).
- **C — BUILD** registry + projection renderer + totality test (no UI change; parity first).
- **D — MIGRATE** section by section (render from registry; delete hand-rolled duplicates as each
  lands).
- **E — DERIVE** search + infotips from the registry; delete `settingMetadata`'s parallel map;
  highlight fix falls out.
- **F — POLISH**: neutral slider restyle (no glow/shadow), 50 ms infotip, remove #2 dead knobs,
  resolve #3 dups (now trivial registry placements).

## Decisions already folded in
- **#2 dead knobs** (`FRONTIER_RESOLUTION`, `CHAIKIN_BOUNDARY_EPS`): **remove** (user 2026-07-21).
- **#3 duplicate controls**: resolved in Phase B/D as registry placement (user: fold into IA pass).
- **#1 topology-breaks-transitions** real bug: FIXED `806587a66` (separate track).

## Open design questions (fill after inventory, for Phase B sign-off)
- Territory: keep 4 sections (Topology / Render / Frontier FX / Transition) or restructure? The
  internal Modes/Tuning/Styles/Transition view system overlaps them.
- Per-render-mode style subsections vs a flatter style taxonomy.
- Duplicate homes: which subsection owns Front Shape, Border Rounding, the CELL_GRID_* controls.
- Interface/Typography currently have zero sections (drawers only) — bring under the registry?
