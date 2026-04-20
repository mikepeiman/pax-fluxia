# Feature And Task Queue - 2026-04-18

## Completed Today

- Reworked the map editor shell into a lower-chrome tactical workbench layout:
  - replaced the permanent full-height form stack with an icon-led tool rail and anchored flyouts
  - moved primary session commands into a compact bottom command dock
  - added a floating board HUD for viewport fit, zoom/grid readout, validation summary, and density controls
  - converted selection editing into a contextual right-side panel that only appears when something is selected
- Added a dedicated editor UI presentation store:
  - introduced persisted `compact`, `standard`, and `expanded` density presets
  - added transient tool panel and side-sheet state outside the authored-map document store
- Split the map editor route UI into focused editor components:
  - tool rail
  - board HUD
  - command dock
  - selection panel
  - library sheet
  - validation sheet
  - overflow / metadata sheet
- Reworked map loading UX:
  - `Load` now opens a searchable library sheet with recent maps pinned first
  - saved, built-in, fixture, and autosave sources remain grouped in one coherent surface
- Added UI hotkey support for numeric star placement shortcuts and `Escape` to close transient editor surfaces

## Verification Notes

- `bunx tsc --noEmit -p common/tsconfig.json` passed.
- Filtered `svelte-check` and filtered client `tsc` scans did not report direct hits for the new map editor shell files.
- Full client `svelte-check` and full client `tsc` still have an existing repo-wide baseline outside the editor slice.

## Follow-Up

- Manual verification needed for:
  - density presets across desktop and tablet widths
  - tool flyout behavior and board-space protection
  - selection panel, validation sheet, and library sheet interaction overlap
  - numeric star-type hotkeys and `Escape` sheet close behavior
