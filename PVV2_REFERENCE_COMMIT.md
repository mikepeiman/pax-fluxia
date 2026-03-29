# 🔒 PVV2 Reference Commit — DO NOT DELETE

> [!CAUTION]
> This document preserves the identity of the **best known working state** of PVV2 territory rendering + transitions. It is a primary reference for any future rendering excavation or reimplementation work.

## Reference Commit

| Field | Value |
|-------|-------|
| **Commit** | `8dce88c23d94bdd1ecc8be636c579866ee25eeee` |
| **Branch** | `feat/pax-fluxia-ui-design` |
| **Date** | 2026-03-25 15:37:05 -0400 |
| **Worktree** | `C:/Users/mikep/Desktop/WebDev/PRISM-ui-design` (prunable) |
| **Remote** | `origin/feat/pax-fluxia-ui-design` (pushed) |

## What Makes This State Special

This commit represents the **best working PVV2 rendering** with:

1. **Smooth territory fills** — Power Voronoi V2 with weighted Voronoi diagrams, Chaikin smoothing on transition fill paths
2. **Working conquest transitions** — DY4 Optimal Transport morphing between territory states with correct fill-border alignment
3. **Star label pill layout** — Horizontal/vertical modes with owner-colored borders, configurable pad/gap/alpha/font
4. **Full Main Menu v2** — Map cards, accessibility-sized controls, MP lobby with slot grid + vote-to-start + chat

## Key Files at This Commit

### Rendering (the crown jewels)
- `pax-fluxia/src/lib/renderers/PowerVoronoiRenderer.ts` — **1,271 lines**, monolithic PVV2 renderer with integrated transition logic
- `pax-fluxia/src/lib/renderers/frontierGraph.ts` — Frontier graph computation
- `pax-fluxia/src/lib/renderers/strokeMeshBorders.ts` — Border stroke rendering
- `pax-fluxia/src/lib/renderers/territoryUtils.ts` — Territory utility functions
- `pax-fluxia/src/lib/renderers/colorUtils.ts` — HSL/RGB color utilities

### UI
- `pax-fluxia/src/lib/components/ui/MainMenu.svelte` — Full Main Menu v2
- `pax-fluxia/src/lib/renderers/StarRenderer.ts` — Pill-style star labels with density coloring

## How to Access This State

```powershell
# View any file at this exact commit:
git show 8dce88c:pax-fluxia/src/lib/renderers/PowerVoronoiRenderer.ts

# Create a temp worktree to inspect the full state:
git worktree add ../pvv2-reference 8dce88c

# Diff any file against current master:
git diff master 8dce88c -- pax-fluxia/src/lib/renderers/PowerVoronoiRenderer.ts
```

## Relationship to Current Architecture

The current master uses a **4-layer modular pipeline** (Ownership → Geometry → Transition → Presentation). The PVV2 renderer at this commit is a **monolithic single-file** that combines all four layers.

**Future work**: Extract the working transition logic and geometry generation from `PowerVoronoiRenderer.ts` at this commit, and reimplement them within the modular pipeline's Geometry and Transition layers. This is NOT a copy-paste job — it requires architectural translation.

See: `.agent/plans/PVV2_EXCAVATION_PLAN.md` for the detailed extraction roadmap.
