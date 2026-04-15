# Render Family implementation spike order — Metaball first

**Recorded:** 2026-04-09  
**Folder:** `.agent/docs/project/implementation-plans/2026-04-08/` (territory epic)  
**Status:** Architect direction — supersedes DF-first ordering for **first family after Impl 0** only (see [TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md](./TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md) §II.5).

---

## Provenance

Early Cursor `CreatePlan` work (territory architecture audit) proposed a **migration path** that wrapped legacy renderers as families in this order:

1. **`MetaballFamily`** ← `MetaballRenderer.ts` — described as the **thinnest adapter** and **closest to fitting already** into shared ownership + dispatch.
2. **`ContourFamily`** — host + worker, still bounded size.
3. **`DistanceFieldFamily`** — largest / shader-heavy surface.

A later **2026-04-08** documentation pass reordered implementation priority to **DistanceFieldFamily first** (“validate hardest GPU/shader path” after Impl 0). That ordering remains valid as a *risk* argument but is **not** the spike order the architect wants for **proving** the family shell.

---

## Decision (2026-04-09)

- **Impl 0** is unchanged: `RenderFamily` interface, registry, runtime transition clock, **`USE_RENDER_FAMILIES`** gated off by default, diagnostics hook sketch ([unified plan](./TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md) Part I.3).
- **Impl 1** is **`MetaballFamily`**: thin adapter over existing metaball module (~390-line CPU influence grid) to prove registry + clock + gated dispatch with minimal line-count risk.
- **Subsequent families** (architect-tunable): default suggestion **Contour → DistanceField → VectorPolygon** facade last (largest blast radius). Revisit order if evidence from Metaball integration changes risk.

---

## UI workstream

Territory settings expose a **single catalog** of all legacy render modes (aligned with `GameCanvas` dispatch). Modes that are not yet wired under `RenderFamily` remain visible but may be **grayed out** when policy requires it (e.g. future `USE_RENDER_FAMILIES`-only paths), with a short **tooltip** explaining why.

---

## Cross-links

- Entry / load order: [territory-rendering-jumpstart.md](./territory-rendering-jumpstart.md) §0  
- Renderer inventory + strategy context: [territory-rendering-overview.md](./territory-rendering-overview.md)  
- Canonical engineering plan: [TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md](./TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md)  
- Optional Cursor pointer stub: `~/.cursor/plans/territory_architecture_audit_778cac4a.plan.md` (redirects to repo unified plan)
