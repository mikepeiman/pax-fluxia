# ADR: Voronoi-based territory modes — comparison and craftsmanship

**Date:** 2026-04-09  
**Status:** Accepted (documentation record; not a runtime change)

## Context

Multiple Voronoi-class render paths coexist (`voronoi`, `modified_voronoi`, `power_voronoi`, `vs_pvv3`, `pvv2_dy4`). Human-visible seam gaps in Modified Voronoi persisted after incremental fixes (weld, border dedup). A full comparative read was needed to align intent, implementation, and investment.

## Decision / record

Canonical prose for **scope, per-mode behavior, craftsmanship, and strategic directions** — maintain in the analysis doc; this ADR is a stable pointer for decision logs:

- **[territory-d3-voronoi-family-analysis.md](../implementation-plans/2026-04-08/territory-d3-voronoi-family-analysis.md)** — “Voronoi-based territory modes: comparison and craftsmanship” (split from the former jumpstart §4.A). **Hub** for assignable path / load order: [territory-rendering-jumpstart.md §0](../implementation-plans/2026-04-08/territory-rendering-jumpstart.md).

This ADR exists so decision logs and searches can point here without duplicating the full analysis.

## Summary (one paragraph)

Euclidean **basic Voronoi** is per-star cells with probe-drawn borders. **Modified Voronoi** merges and post-warps per polygon, so contested seams are repaired late and can stay misaligned after asymmetric arc subdivision. **PVV2/PVV3 (power)** treat contested edges as first-class geometry and splice smoothed seams into fills (`substituteSmoothedEdges`), matching the architecture story for gap-free spec behavior. **DY4** is a reference snapshot, not a product fork.

## Consequences

- Prefer **power / PVV3 / canonical** paths when spec fidelity for shared boundaries is required.
- Further MV work should target **seam graph convergence** or explicit “approximate mode” labeling, not endless weld tuning alone.

## References

- `pax-fluxia/src/lib/territory/ui/territoryRenderModeCatalog.ts`
- `pax-fluxia/src/lib/components/game/GameCanvas.svelte` (territory dispatch)
- `pax-fluxia/src/lib/renderers/geometry/borderPipeline.ts` (`substituteSmoothedEdges`, `splitMergedOwnerOutlineEdges`)
