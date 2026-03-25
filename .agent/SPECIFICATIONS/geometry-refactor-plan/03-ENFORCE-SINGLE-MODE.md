# Step 3: Enforce the Single Canonical Geometry Mode

## Goal

Make `UnifiedVectorGeometryMode` the only canonical vector geometry mode in the runtime. Update the registry, coordinator, mode selection, and UI.

---

## Changes Required

### 1. Rewrite `UnifiedVectorGeometryMode.ts`

**Current:** 111 lines with inline orchestration, `computeGeometry0319` calls, polyline building, frontier topology building, error handling.

**Target:** Pure 3-line delegator.

```typescript
import { compileVectorGeometry } from '../compiler_UnifiedVectorGeometry';
import type { GeometryMode } from '../GeometryMode';

export class UnifiedVectorGeometryMode implements GeometryMode {
    readonly id = 'unified_vector' as const;
    readonly label = 'Unified Vector Geometry';
    compute(input: Parameters<GeometryMode['compute']>[0]) {
        return compileVectorGeometry(input);
    }
}
```

No geometry compilation logic in this class.

### 2. Update `registry.ts`

**Current:** Registers 4 modes (Unified + 3 legacy).

**Target:** Register only `UnifiedVectorGeometryMode`.

```typescript
import { UnifiedVectorGeometryMode } from './modes/UnifiedVectorGeometryMode';
import type { GeometryMode } from './GeometryMode';

export const GEOMETRY_MODES: readonly GeometryMode[] = [
    new UnifiedVectorGeometryMode(),
];

export const GEOMETRY_MODE_BY_ID: ReadonlyMap<GeometryMode['id'], GeometryMode> =
    new Map(GEOMETRY_MODES.map((mode) => [mode.id, mode]));
```

Legacy modes are simply not registered. They will be deleted in Step 5.

### 3. Update `TerritoryModeSelection.ts`

**Current `GeometryModeId`:** `'unified_vector' | 'power_voronoi' | 'boundary_aware_frontier' | 'seed_graph'`

**Target:** `'unified_vector'` only. Legacy IDs removed from the canonical type.

```typescript
export type GeometryModeId = 'unified_vector';
```

If config migration requires mapping old IDs, handle it in a config normalizer (e.g., `TerritorySettingsBridge.ts` → `resolveGeometryMode()` maps any legacy string to `'unified_vector'`).

### 4. Update `GeometryLayerCoordinator.ts`

**Current:** Looks up mode by `input.selection.geometryMode` from registry map.

**Target:** Same logic works unchanged — the map now has only one entry. The coordinator needs no structural change, only verifying it doesn't have legacy mode branching.

### 5. Update UI Controls

**Current:** `ControlsSection-Territory.svelte` has buttons for multiple geometry modes.

**Target:** Remove the per-mode buttons. Either:
- Show a single non-selectable label "Unified Vector Geometry", or
- Remove the geometry-mode selector section entirely.

### 6. Update `TerritorySettingsBridge.ts`

**Current `resolveGeometryMode()`:** Maps raw strings to `GeometryModeId`.

**Target:** All inputs map to `'unified_vector'`. Legacy strings (`'power_voronoi'`, `'boundary_aware_frontier'`, `'seed_graph'`) normalize silently.

---

## Files Modified

| File | Change |
|------|--------|
| `layers/geometry/modes/UnifiedVectorGeometryMode.ts` | Gut to delegator |
| `layers/geometry/registry.ts` | Remove legacy mode registrations |
| `contracts/TerritoryModeSelection.ts` | Remove legacy `GeometryModeId` variants |
| `integration/TerritorySettingsBridge.ts` | Normalize all geometry mode strings to `'unified_vector'` |
| `components/ui/settings/ControlsSection-Territory.svelte` | Remove geometry mode buttons |
| `contracts/TerritoryModeCatalog.ts` | Remove legacy mode catalog entries |

---

## Verification

- `bunx vite build` clean.
- Old saved settings with `geometryMode: 'power_voronoi'` are silently normalized to `'unified_vector'`.
- UI shows no geometry mode selection buttons (or a single non-interactive label).
