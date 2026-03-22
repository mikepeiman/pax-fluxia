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
- non-canonical legacy styles continue to route through legacy renderers.

## Remaining to reach full cutover

1. Remove residual static/dynamic engine selector UX from Territory controls once no workflows depend on it.
2. Complete canonical-only style taxonomy in UI (separate legacy style section from clean style section).
3. Promote `TerritorySettingsBridge` as the single settings source for all territory render paths (legacy + clean), not only canonical clean bridge input.
4. Decommission obsolete engine-method compatibility fields after migration period:
   - `TERRITORY_ENGINE_MODE`
   - `TERRITORY_ENGINE_STATIC_METHOD`
   - `TERRITORY_ENGINE_DYNAMIC_METHOD`
5. Add focused tests for compatibility normalization:
   - legacy key combinations -> canonical mode IDs
   - architecture toggle dispatch behavior.

## Recommended next execution order

1. Split Territory controls into `Clean Runtime` and `Legacy Renderers` sections.
2. Remove static/dynamic controls from default path (keep behind advanced/debug section if needed).
3. Add compatibility tests for `TerritorySettingsBridge`.
4. Final migration commit: retire obsolete engine selectors from default UI surface.
