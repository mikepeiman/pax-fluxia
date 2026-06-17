---
date created: 2026-06-17
status: foundation committed (model + mapping); consumer migration pending
owner: settings UI
---

# Settings Navigation Consolidation — single source of truth

## Problem (the redundancy to eliminate)
Today the settings nav is described by SEVERAL parallel structures:
- `SETTINGS_SECTIONS` (settingsRegistry.ts) — 19 content sections (id/icon/label/color/tier/audience/scope).
- `SETTINGS_TOOLS` (GameSettingsPanel.svelte) — 11 rail items with their own id/icon/label/color, partially overlapping sections.
- `SECTION_TOOL_BY_ID` — reverse tool↔section map.
- `COMPAT_SECTION_ID_ALIASES` — legacy id aliases.
- (adjacent) `settingsDefs.ts` `PANEL_CONFIG_MAP` — per-control persistence.

The rail renders `SETTINGS_TOOLS`, NOT `SETTINGS_SECTIONS`, which is why adding a
section was invisible until a tool pointed at it. Two id systems, duplicated
label/color/icon, and many sections unreachable from the rail.

## Target (approved: full single-source-of-truth, rail = categories + chips)
One grouping model — `settingsTaxonomy.ts` `SETTINGS_CATEGORIES` (committed) —
defines the 7 categories and which sections belong to each. The rail shows the 7
category icons; selecting one shows its sections as top sub-nav chips; one scroll
surface below. Section CONTENT stays in `SETTINGS_SECTIONS`.

### Category → section mapping (the ontology we keep)
- **Gameplay** — players, match_flow, combat_tuning, economy, travel_orders, conquest
- **Fleet & Stars** — fleet_star_visuals
- **Territory & Render** — render, territory_tuning, territory_styles, territory_phase_field, territory_phase_edges, territory_ember_lattice, frontier_fx
- **Map & Effects** — map_options, effects
- **Audio** — audio
- **Interface** — Themes, Appearance, Stats, Hotkeys (bespoke utility drawers — see step 2)
- **Developer** — diagnostics, logging, ai

Utilities (Themes/Appearance/Stats/Hotkeys/Help) render hand-assembled drawers,
not plain sections; Actions (Restart/Quit) are not settings. Both render as a
compact cluster after the category icons (or, step 2, fold the utility drawers
into Interface as section-like panels).

## Staged migration (each stage ships green + user-verifiable)
1. **Model (DONE).** `settingsTaxonomy.ts` with `SETTINGS_CATEGORIES` + `CATEGORY_BY_SECTION`.
2. **Unify utility drawers as panels.** Give Themes/Appearance/Stats/Hotkeys section-like ids so they live inside the taxonomy instead of bespoke `activeToolId` branches.
3. **Rail → categories.** Replace the `SETTINGS_TOOLS` render with `SETTINGS_CATEGORIES`; category click selects category; its sections render as the existing sub-nav chips; chip click drives the existing section dispatch. Actions (Restart/Quit) become a small action cluster.
4. **Collapse state machine.** Replace `activeToolId`/`SECTION_TOOL_BY_ID` with `activeCategoryId` + `activeSectionId`; migrate persistence keys (keep back-compat read of the old keys once).
5. **Delete the dead structures.** Remove `SETTINGS_TOOLS`, `SettingsToolId`, `SECTION_TOOL_BY_ID`, and `COMPAT_SECTION_ID_ALIASES` once nothing reads them. Update the two external consumers (`GameContainer`, `SettingsRibbon`) — they only use `SettingsSectionId` + `forceOpenSection`, which survive.
6. **Verify.** `bun run check` each stage; user confirms rail + chips + each panel + restart/quit + topbar force-open still work (cannot be self-verified headlessly).

## Why staged, not big-bang
Steps 3–4 rewrite the panel's core navigation state machine, and runtime behavior
(rail clicks, drawers, persistence, topbar force-open) cannot be verified
headlessly here — only by the user in-game. Each stage is kept small enough to
confirm before the next, so a regression can't hide behind a green typecheck.
