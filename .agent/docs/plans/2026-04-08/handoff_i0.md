# Handoff — Impl 0 (Render Family shell)

**Date:** 2026-04-09  
**Status:** Delivered in repo (baseline for Impl 1).

## What shipped

- **`RenderFamily` / `RenderFamilyInput` / `RenderFamilyOutput`** — [`pax-fluxia/src/lib/territory/families/RenderFamilyTypes.ts`](../../../../../pax-fluxia/src/lib/territory/families/RenderFamilyTypes.ts)
- **Registry** — `registerRenderFamily`, `getRenderFamily`, `getRegisteredFamilyAdapterModeIds`, `disposeAllRenderFamilies` — [`renderFamilyRegistry.ts`](../../../../../pax-fluxia/src/lib/territory/families/renderFamilyRegistry.ts)
- **Gated dispatch** — `GAME_CONFIG.USE_RENDER_FAMILIES` (default **false**) in [`game.config.ts`](../../../../../pax-fluxia/src/lib/config/game.config.ts); mirrored in [`settingsDefs.ts`](../../../../../pax-fluxia/src/lib/components/ui/settingsDefs.ts) and Territory panel checkbox
- **Input builder** — [`buildRenderFamilyInput.ts`](../../../../../pax-fluxia/src/lib/territory/families/buildRenderFamilyInput.ts) (minimal; `ownership` null until Tier 1 wiring)
- **UI catalog** — [`territoryRenderModeCatalog.ts`](../../../../../pax-fluxia/src/lib/territory/ui/territoryRenderModeCatalog.ts) + full mode grid in `ControlsSection-Territory.svelte`; options resolve against gate + registered family ids
- **DiagnosticProvider** — type only on `RenderFamilyTypes.ts` (optional implement per family later)

## Follow-ups (Impl 1+)

- Wire real **`OwnershipSnapshot`** into `buildRenderFamilyInput` from runtime coordinator when ready
- **`TransitionClock` / `activeTransition`** on family input — currently `null`
- Register additional families per [TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md](./TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md) (Contour → DF → VectorPolygon)

## Verification

- With **`USE_RENDER_FAMILIES` off**, all catalog modes stay selectable; game uses legacy `GameCanvas` branches
- With gate **on**, only exempt modes (`none`, `territory_canonical`) + registered adapters are selectable; **metaball** registers on first metaball render and becomes selectable after
