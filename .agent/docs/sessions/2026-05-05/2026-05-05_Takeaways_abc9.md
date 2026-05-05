# Takeaways - 2026-05-05

- Background FX controls are part of the product settings surface and must obey the same persistence/update discipline as the rest of the panel.
- Letting `GameSettingsPanel.svelte` mutate `vis` in place was the wrong ownership boundary; `panelSync.ts` must own visual-setting normalization and replacement.
- A persistence bug can hide inside an apparently working UI. Round-trip localStorage tests are necessary when adding new persisted setting shapes, especially nested ones like per-player selections.
- Merge-sensitive background FX state now includes:
  - `backgroundSelection`
  - `backgroundAffectAllTerritory`
  - `playerBackgroundSelections`
