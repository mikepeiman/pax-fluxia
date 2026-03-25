# Legacy Patterns, Migration, and Non-Canonical Approaches

## Purpose

This document isolates historical implementation details, rejected approaches, and migration concerns from the canonical architecture. Use this document only when dealing with legacy code or understanding why certain patterns were rejected.

**Canonical architecture appears in MASTER_TERRITORY_ARCHITECTURE.md. Do not reference this document for new implementation decisions.**

## Deprecated patterns

The following are not canonical and must not appear in new code:

- **Pixel-derived contour extraction.** Rasterization to a render texture, marching squares, and contour extraction produce non-canonical, axis-aligned approximations. The canonical approach is graph-native frontier generation.

- **Separate fill and border approximations.** Never maintain separate geometry pipelines for fills and borders. Both must derive from the same canonical frontier data.

- **Module-level mutable renderer state.** Global `let graphics`, `let worker`, or `let cachedFingerprint` variables. All render state must be class-encapsulated.

- **Untyped artifact bags.** Functions that accept or return bare `any` objects without clear contract boundaries. All compiler outputs must be strictly typed.

- **Fallback or placeholder geometry fabrication.** If a compile stage is incomplete, return a typed error status, not made-up geometry.

## Legacy adapter boundary

Legacy renderers (PVV2, PVV3, Distance Field) may exist during migration, but they must be quarantined behind `TerritoryLegacyBridge`. They must not:

- Define canonical ownership truth.
- Override compiler contract outputs.
- Contaminate the render layer with legacy design decisions.

The legacy bridge exists as a temporary escape hatch during refactoring, not as a permanent parallel architecture.

## Devtools boundary

Trace stores, interactive stepping, diagnostic snapshots, and UI-facing debug state belong in devtools modules:

- `devtools/TerritoryTraceStore.ts` – Svelte store and trace persistence.
- `devtools/TerritoryStepRunner.ts` – Step-through execution and snapshot replay.

Devtools logic must not pollute the compiler or renderer contracts.

## Terminology policy

When describing non-canonical patterns or historical bugs, use precise operational language:

| Avoid | Use |
|---|---|
| "Jagged borders" | "Non-canonical raster contour output" |
| "Fill vs border bug" | "Dual-truth divergence" |
| "Stair-stepping artifacts" | "Pixel-grid aliasing in rejected raster approaches" |
| "Placeholder geometry" | "Non-authoritative fallback geometry" |
| "God Object" | "Legacy monolithic pipeline" |
| "Singleton trap" | "Module-scoped renderer state leakage" |

## Migration checklist

When refactoring from a legacy system, enforce:

1. ✓ Extract compiler logic into pure stages; remove all PIXI imports.
2. ✓ Build singular canonical frontier graph; eliminate separate fill and border paths.
3. ✓ Move adapter logic into `TerritoryLegacyBridge`.
4. ✓ Move devtools state into dedicated modules.
5. ✓ Refactor all renderers into class-encapsulated instances.
6. ✓ Validate that fills and borders derive from identical canonical data.
7. ✓ Add unit tests for compiler stages before render layer testing.

---

**This document is for context only. All new implementation should reference MASTER_TERRITORY_ARCHITECTURE.md.**
