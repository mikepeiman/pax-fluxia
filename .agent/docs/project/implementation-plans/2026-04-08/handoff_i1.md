# Handoff — Impl 1 (MetaballFamily)

**Date:** 2026-04-09  
**Status:** Delivered in repo.

## What shipped

- **`MetaballFamily`** — [`pax-fluxia/src/lib/territory/families/metaball/MetaballFamily.ts`](../../../../../pax-fluxia/src/lib/territory/families/metaball/MetaballFamily.ts)  
  - Thin adapter over `renderMetaball` / `resetMetaballCache`  
  - `displayRoot` used by `GameCanvas` to mount/detach from `voronoiContainer`
- **`GameCanvas.svelte`** — when `TERRITORY_RENDER_MODE === 'metaball'` **and** `USE_RENDER_FAMILIES`, registers family once, calls `update`, mounts container; otherwise legacy `renderMetaballModule` path
- **Detach** — when mode ≠ metaball or gate off, family root is removed from `voronoiContainer` so legacy graphics can own the layer again

## Tunables

- `tunableKeys` lists metaball-related `GAME_CONFIG` keys; values are still read inside `MetaballRenderer` (no `tunables` map plumbing yet)

## Next (Impl 2 — Contour)

- Mirror pattern: `ContourFamily`, worker lifecycle, `getRegisteredFamilyAdapterModeIds` will include `contour` after registration
- Update **catalog** / gate: add `contour` to family-ready set via registry (automatic once registered)

## Verification

- Gate **off** → metaball behaves as before  
- Gate **on** + metaball → draws via family container; no duplicate metaball graphics after switching modes  
