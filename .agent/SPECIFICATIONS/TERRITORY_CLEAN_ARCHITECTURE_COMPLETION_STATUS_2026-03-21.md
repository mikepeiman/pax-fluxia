# Territory Clean Architecture Completion Status (2026-03-21)

Branch: `codex/territory-clean-arch`  
Worktree: `C:\Users\mikep\Desktop\WebDev\PRISM-territory-clean-arch`

## Completed in this pass

1. Added master architecture routing toggle (`clean` | `legacy`) and wired it from UI to canonical render dispatch.
2. Normalized canonical mode wiring through one settings bridge:
   - canonical bridge now reads mode selection + tunables from `TerritorySettingsBridge`.
   - legacy config keys are translated into semantic clean-architecture mode IDs.
3. Added explicit clean-architecture config selectors:
   - `TERRITORY_FILL_TRANSITION_MODE`
   - `TERRITORY_BORDER_TRANSITION_MODE`
   - `TERRITORY_STYLE_MODE`
4. Updated territory controls for clearer, behavior-explicit naming and constrained canonical transition options.
5. Updated rename ledger with current canonical mapping and integration notes.
6. Added focused compatibility tests:
   - `TerritorySettingsBridge` legacy-key normalization -> canonical mode IDs.
   - canonical architecture route resolution (`clean` vs `legacy`) for dispatch behavior.
7. Routed canonical dispatch through `TerritoryArchitectureRouter` and made legacy canonical fallback consume bridge-driven transition tunables.
8. Split Territory style taxonomy into explicit `Clean Style` and `Legacy Style` sections in UI.
9. Removed deprecated static/dynamic selector keys from active panel-to-config sync mappings.

## Current architecture state

The code now supports safe side-by-side execution:

- Default boot path is now clean canonical with Geometry0319:
  - `TERRITORY_RENDER_MODE = territory_canonical`
  - `TERRITORY_ARCHITECTURE_PATH = clean`
  - `TERRITORY_GEOMETRY_MODE = new_frontiers_0319`
  - `TERRITORY_ENGINE_METHOD = new_frontiers_0319`
- `Style = Canonical Layered Runtime` + `Architecture = Clean Architecture`:
  uses `GameCanvasBridge` -> `TerritoryRuntimeCoordinator` (4-layer path).
- `Style = Canonical Layered Runtime` + `Architecture = Legacy Architecture`:
  uses legacy canonical controller/renderer path.
- Canonical route selection is now centralized in
  `integration/TerritoryArchitectureRouter.ts`.
- Legacy canonical fallback transition timing is now sourced from
  `TerritorySettingsBridge` tunables instead of hardcoded duration values.
- non-canonical legacy styles continue to route through legacy renderers.
- Territory controls now separate `Clean Style` from `Legacy Style` to reduce
  mode ambiguity.

## Remaining to reach hard deprecation cleanup

1. Remove deprecated config keys from `game.config.ts` and builtin theme JSONs
   once external workflows no longer rely on them:
   - `TERRITORY_ENGINE_MODE`
   - `TERRITORY_ENGINE_STATIC_METHOD`
   - `TERRITORY_ENGINE_DYNAMIC_METHOD`
2. Add one integration-level runtime test around canonical render dispatch in
   `GameCanvas.svelte` (optional hardening; not required for functional cutover).

## Recommended next execution order

1. Decide cutoff date for removing deprecated engine selector keys from config/themes.
2. Run one manual QA sweep across Territory controls for clean-vs-legacy route expectations.
3. Merge branch and keep legacy-key read compatibility for one migration window.
