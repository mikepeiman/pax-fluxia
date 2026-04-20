# Theme Import Audit - 2026-04-16

Imported all 71 JSON files from C:\Users\mikep\Downloads\Pax Themes into src/lib/config/builtin-themes/imported/<family>/ and updated the built-in loader to scan those folders recursively.

## Organization

### Imported family counts
- agnostic: 21
- contour: 1
- distance-field: 3
- engine: 11
- graph: 9
- metaball: 8
- perimeter-field: 2
- pixel: 1
- voronoi-lineage: 15

### Wiring status counts
- agnostic: 21
- legacy-fallback: 41
- needs-editing: 4
- wired: 5

## Runtime notes

- GameCanvas.svelte still supports legacy boolean fallback when TERRITORY_RENDER_MODE is missing. The shared themeRouting utility now mirrors that exact order and is used both for runtime resolution and audit/grouping.
- TerritoryArchitectureRouter.ts only routes territory_canonical through the canonical path today. Every imported explicit mode in this pack still lands on the legacy-style renderer route, so the render refactors did not orphan these themes.
- Registered render-family adapters currently exist for metaball and perimeter_field. That matters for selector presentation and family-gated controls, but not for saved-theme playback because the explicit imported modes in this pack still have dispatch coverage.
- The only actual correctness breaks in the imported pack are transition-mode coercions under the current coerceVsTransitionModeForRenderMode() rules.
- Generic or duplicate imported names such as Custom are disambiguated at load time with timestamp suffixes so theme selection remains deterministic.

## Works As-Is

These themes save an explicit modern render mode and reproduce cleanly with current routing and transition rules.

### engine (4)
- demo_mar30 [pax-theme-demo_mar30-2026-03-30T21-42-19.json]: render mode territory_engine. Uses explicit TERRITORY_RENDER_MODE 'territory_engine' with current routing.
- Flow-Ships_mar30 [pax-theme-Flow-Ships_mar30-2026-03-30T21-44-37.json]: render mode territory_engine. Uses explicit TERRITORY_RENDER_MODE 'territory_engine' with current routing.
- March_18 [pax-theme-March_18-2026-03-18T19-08-15.json]: render mode territory_engine. Uses explicit TERRITORY_RENDER_MODE 'territory_engine' with current routing.
- new_arch_march16 [pax-theme-new_arch_march16-2026-03-17T03-34-11.json]: render mode territory_engine. Uses explicit TERRITORY_RENDER_MODE 'territory_engine' with current routing.

### metaball (1)
- metaball_haze [pax-theme-metaball_haze-2026-04-14T00-10-40.json]: render mode metaball. Uses explicit TERRITORY_RENDER_MODE 'metaball' with current routing.

## Needs Editing

These themes load, but they will not reproduce exactly as saved because the current render-mode transition rules coerce VS_TRANSITION_MODE.

### metaball (2)
- apr_09_metaball [pax-theme-apr_09_metaball-2026-04-09T23-58-09.json]: render mode metaball. Saved VS_TRANSITION_MODE 'no_loser' is coerced to 'metaball_lane_push' for render mode 'metaball'.
- apr_13_metaballs_bladerunner [pax-theme-apr_13_metaballs_bladerunner-2026-04-13T23-59-26.json]: render mode metaball. Saved VS_TRANSITION_MODE 'no_loser' is coerced to 'metaball_lane_push' for render mode 'metaball'.

### perimeter-field (2)
- apr_15_metaball [pax-theme-apr_15_metaball-2026-04-16T16-40-14.json]: render mode perimeter_field. Saved VS_TRANSITION_MODE 'metaball_lane_push' is coerced to 'no_loser' for render mode 'perimeter_field'.
- metaball_perimeter_apr_14 [pax-theme-metaball_perimeter_apr_14-2026-04-15T00-38-40.json]: render mode perimeter_field. Saved VS_TRANSITION_MODE 'metaball_lane_push' is coerced to 'no_loser' for render mode 'perimeter_field'.

## Legacy-Fallback Compatible

These themes still wire up correctly today, but only because GameCanvas falls back to legacy boolean flags when TERRITORY_RENDER_MODE is absent. They should be migrated to explicit TERRITORY_RENDER_MODE if you want them to be robust against future cleanup.

### contour (1)
- water-v1 [pax-theme-water-v1-2026-03-06T03-34-05.json]: render mode contour. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.

### distance-field (3)
- DF_classic_mar29B [pax-theme-DF_classic_mar29B-2026-03-30T00-18-35.json]: render mode distance_field. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- DistanceField_classic_tight_mar29 [pax-theme-DistanceField_classic_tight_mar29-2026-03-30T00-12-08.json]: render mode distance_field. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- distancefield-Mar6 [pax-theme-distancefield-Mar6-2026-03-06T16-40-53.json]: render mode distance_field. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.

### engine (7)
- classic_1 [pax-theme-classic_1-2026-03-14T22-15-15.json]: render mode territory_engine. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- classic_2 [pax-theme-classic_2-2026-03-15T00-16-11.json]: render mode territory_engine. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- classic_3 [pax-theme-classic_3-2026-03-15T00-32-15.json]: render mode territory_engine. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- Clean_mode_2026-03-14 [pax-theme-Clean_mode_2026-03-14-2026-03-14T19-18-20.json]: render mode territory_engine. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- Clean_mode_2026-03-14 [pax-theme-Clean_mode_2026-03-14-2026-03-14T19-18-23.json]: render mode territory_engine. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- FINALLY_2026-03-13 [pax-theme-FINALLY_2026-03-13-2026-03-14T01-45-14.json]: render mode territory_engine. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- FINALLY_2026-03-13 [pax-theme-FINALLY_2026-03-13-2026-03-14T19-18-25.json]: render mode territory_engine. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.

### graph (9)
- 0227_tweaked [pax-theme-0227_tweaked-2026-02-28T00-25-33.json]: render mode graph. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- 0227_tweaked [pax-theme-0227_tweaked-2026-02-28T03-30-15.json]: render mode graph. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- 2026-02-028-default [pax-theme-2026-02-028-default-2026-02-28T21-53-44.json]: render mode graph. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- Custom [pax-theme-Custom-2026-02-28T00-05-37.json]: render mode graph. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- Custom [pax-theme-Custom-2026-02-28T21-53-32.json]: render mode graph. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- Custom [pax-theme-Custom-2026-03-06T16-41-27.json]: render mode graph. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- Feb27_default [pax-theme-Feb27_default-2026-02-28T03-30-33.json]: render mode graph. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- new_territory_27 [pax-theme-new_territory_27-2026-02-28T00-19-58.json]: render mode graph. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- stripey_territory [pax-theme-stripey_territory-2026-02-28T20-21-48.json]: render mode graph. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.

### metaball (5)
- CleanVoronoi [pax-theme-CleanVoronoi-2026-02-28T03-41-46.json]: render mode metaball. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- Custom [pax-theme-Custom-2026-02-26T02-43-25.json]: render mode metaball. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- Custom [pax-theme-Custom-2026-02-26T02-45-01.json]: render mode metaball. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- Custom [pax-theme-Custom-2026-02-26T21-08-27.json]: render mode metaball. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- impasto_blend [pax-theme-impasto_blend-2026-03-01T03-08-17.json]: render mode metaball. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.

### pixel (1)
- Mar01_default [pax-theme-Mar01_default-2026-03-01T18-50-31.json]: render mode pixel. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.

### voronoi-lineage (15)
- 2026-03-07-default [pax-theme-2026-03-07-default-2026-03-08T01-11-32.json]: render mode power_voronoi. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- Classic_Mar15 [pax-theme-Classic_Mar15-2026-03-16T01-56-47.json]: render mode power_voronoi. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- Classic_Mar15_v2 [pax-theme-Classic_Mar15_v2-2026-03-16T01-58-25.json]: render mode power_voronoi. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- classic_tight_ships_mar21 [pax-theme-classic_tight_ships_mar21-2026-03-21T19-08-50.json]: render mode power_voronoi. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- Clean Voronoi [pax-theme-Clean Voronoi-2026-02-26T02-57-16.json]: render mode voronoi. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- Clean Voronoi [pax-theme-Clean Voronoi-2026-02-26T03-01-30.json]: render mode voronoi. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- Custom [pax-theme-Custom-2026-02-26T01-55-47.json]: render mode voronoi. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- Custom [pax-theme-Custom-2026-02-26T01-58-19.json]: render mode voronoi. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- Custom [pax-theme-Custom-2026-02-26T02-55-16.json]: render mode voronoi. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- Custom [pax-theme-Custom-2026-02-26T21-10-12.json]: render mode voronoi. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- Custom [pax-theme-Custom-2026-02-28T19-52-13.json]: render mode voronoi. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- Feb28_clear [pax-theme-Feb28_clear-2026-02-28T19-52-27.json]: render mode voronoi. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- Labels_Mar15 [pax-theme-Labels_Mar15-2026-03-16T00-52-08.json]: render mode power_voronoi. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- Lego_PVV2_keeper [pax-theme-Lego_PVV2_keeper-2026-03-11T00-57-31.json]: render mode power_voronoi. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.
- Mar03_newmode [pax-theme-Mar03_newmode-2026-03-03T21-30-23.json]: render mode power_voronoi. Uses GameCanvas legacy boolean fallback because TERRITORY_RENDER_MODE is absent.

## Mode-Agnostic Packs

These files do not declare a territory mode. They still import and apply, but they function as utility packs or category snapshots rather than render-mode-authored themes.

### agnostic (21)
- adjusted_orbits [pax-theme-ships-adjusted_orbits-2026-02-28T03-19-43.json]: no saved render mode; category ships. No territory mode saved; this file is mode-agnostic.
- Custom [pax-theme-Custom-2026-02-17T01-10-51.json]: no saved render mode. No territory mode saved; this file is mode-agnostic.
- Custom [pax-theme-Custom-2026-02-17T17-59-56.json]: no saved render mode. No territory mode saved; this file is mode-agnostic.
- Custom [pax-theme-Custom-2026-02-17T22-26-31.json]: no saved render mode. No territory mode saved; this file is mode-agnostic.
- Custom [pax-theme-Custom-2026-02-18T18-51-51 keeper, arrow capture.json]: no saved render mode. No territory mode saved; this file is mode-agnostic.
- Custom [pax-theme-Custom-2026-02-18T20-14-23.json]: no saved render mode. No territory mode saved; this file is mode-agnostic.
- Custom [pax-theme-Custom-2026-02-18T21-19-21.json]: no saved render mode. No territory mode saved; this file is mode-agnostic.
- Custom [pax-theme-Custom-2026-02-19T22-47-29 keeper,  Arrow conquest.json]: no saved render mode. No territory mode saved; this file is mode-agnostic.
- Custom [pax-theme-Custom-2026-02-20T02-49-27.json]: no saved render mode. No territory mode saved; this file is mode-agnostic.
- Custom [pax-theme-Custom-2026-02-25T01-51-22.json]: no saved render mode. No territory mode saved; this file is mode-agnostic.
- Custom [pax-theme-Custom-2026-02-25T22-27-53.json]: no saved render mode. No territory mode saved; this file is mode-agnostic.
- Custom [pax-theme-Custom-2026-02-25T22-35-15.json]: no saved render mode. No territory mode saved; this file is mode-agnostic.
- Custom [pax-theme-Custom-2026-02-26T00-27-57.json]: no saved render mode. No territory mode saved; this file is mode-agnostic.
- Custom [pax-theme-Custom-2026-02-26T00-31-19.json]: no saved render mode. No territory mode saved; this file is mode-agnostic.
- Custom [pax-theme-Custom-2026-02-26T00-33-54.json]: no saved render mode. No territory mode saved; this file is mode-agnostic.
- Custom [pax-theme-Custom-2026-02-26T00-36-12.json]: no saved render mode. No territory mode saved; this file is mode-agnostic.
- Custom [pax-theme-Custom-2026-02-26T02-11-35.json]: no saved render mode. No territory mode saved; this file is mode-agnostic.
- regular_ships [pax-theme-ships-regular_ships-2026-02-28T00-26-25.json]: no saved render mode; category ships. No territory mode saved; this file is mode-agnostic.
- Smooth Bezier [pax-theme-Smooth Bezier-2026-02-17T23-41-11 keeper, streaming ships.json]: no saved render mode. No territory mode saved; this file is mode-agnostic.
- wider_lanes_shadow [pax-theme-visuals-wider_lanes_shadow-2026-02-28T00-29-13.json]: no saved render mode; category visuals. No territory mode saved; this file is mode-agnostic.
- zoom_on_lane [pax-theme-travel-zoom_on_lane-2026-02-28T00-26-49.json]: no saved render mode; category travel. No territory mode saved; this file is mode-agnostic.

## Theme Select UI Direction

Implemented direction:

- Theme selectors are now grouped by render family with optgroup sections.
- The full settings panel now exposes family cards instead of one flat chip cloud.
- Each theme chip surfaces a status pill: wired, legacy fallback, needs edit, or agnostic.

Recommended follow-up:

- Add a family filter row above the theme chips so you can collapse to one render lineage at a time.
- Surface the selected theme's routing note inline under the dropdown so transition coercions are visible before apply.
- Add a one-click migrate-to-explicit-render-mode action for legacy-fallback themes that writes TERRITORY_RENDER_MODE without changing the rest of the snapshot.
