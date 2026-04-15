# PLAN_CONDENSED — Territory Render Family

**Canonical source:** [`TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md`](../TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md) — read that file for full rationale, exclusions, and phase detail.

**Onboarding:** [`territory-rendering-jumpstart.md`](../territory-rendering-jumpstart.md) §0 (ingestion roots, load order).

**Date:** 2026-04-08 (P0)

---

## Diagnosis (why families)

The 4-layer pipeline fits **vector polygons → morph → draw commands**. **Distance fields, metaballs, contour workers** do not natively share the same geometry/transition DTOs. Forcing them through one pipeline **loses what makes each approach work**.

**Target:** **Tier 1 shared** = ownership (+ runtime clock, VFX from ownership diffs). **Tier 2** = one active **Render Family** owning its own geometry/transition/presentation, returning a **`PIXI.Container`**. Existing coordinators/contracts become **`VectorPolygonFamily` internals** (library/facade), not a universal straitjacket.

---

## Resolved decisions (2026-04-08)

| Topic | Decision |
|-------|----------|
| PVV | Inside **VectorPolygonFamily**; not its own family. |
| Diagnostics | Incremental D-menu; optional **DiagnosticProvider** with shared overlay — ship with renderer work. |
| VFX | **Runtime** emits from ownership diff → `VFXBus`; optional `events[]` on family output later. |
| Clock | **Runtime-owned** transition clock; `activeTransition` + tunables per family. |
| Build order | **Impl 0** (interface + gated dispatch) → **MetaballFamily** → **ContourFamily** → **DistanceFieldFamily** + **VectorPolygonFamily** + UI prune — [RENDER_FAMILY_SPIKE_ORDER_METABALL_FIRST.md](../RENDER_FAMILY_SPIKE_ORDER_METABALL_FIRST.md) (2026-04-09 supersedes DF-first for Impl 1). |

---

## `RenderFamily` sketch (normative for Impl 0)

```typescript
interface RenderFamily {
  readonly id: string;
  readonly label: string;
  readonly tunableKeys: readonly string[];
  update(input: RenderFamilyInput): RenderFamilyOutput;
  dispose(): void;
}

interface RenderFamilyInput {
  ownership: OwnershipSnapshot;
  nowMs: number;
  stars: ReadonlyArray<StarState>;
  lanes: ReadonlyArray<StarConnection>;
  world: { width: number; height: number };
  tunables: ReadonlyMap<string, number>;
  renderer?: PIXI.Renderer;
  activeTransition?: {
    conquestEvents: ReadonlyArray<TerritoryConquestEvent>;
    startedAtMs: number;
    durationMs: number;
    progress: number;
    rawProgress: number;
  } | null;
}

interface RenderFamilyOutput {
  container: PIXI.Container;
  diagnostics?: TerritoryRuntimeDiagnostics;
  debugGeometry?: { regions?: unknown; frontiers?: unknown };
  events?: ReadonlyArray<{ type: string; payload: unknown }>;
}
```

---

## Phase spine

| Phase | Output |
|-------|--------|
| **P0** | `condensed/*`, `handoff_p0.md` |
| **Doc A** | Artifacts v1, `BRAINSTORMING_IDEAS_INDEX.md` v1, band 2026-03-23…04-08 + PVV2 / `.atlas` / `.gemini` skim |
| **Doc B** | Artifacts v2, index v2, band 2026-03-08…03-22 |
| **Doc C** | `*_FINAL.md`, `BRAINSTORMING_IDEAS_INDEX_FINAL.md`, `RECOMMENDATIONS_FOR_ARCHITECT.md` |
| **Impl 0** | Types, registry, `DiagnosticProvider`, runtime clock, **`USE_RENDER_FAMILIES` default false** |
| **Impl 1** | `MetaballFamily` |
| **Impl 2** | `ContourFamily` |
| **Impl 3** | `DistanceFieldFamily` + `VectorPolygonFamily` facade + family UI + prune |

**Doc epic precedes implementation.** Handoffs: `handoff_doc_a.md` … `handoff_i2.md` in this folder.

---

## Sacrosanct (still)

- Ownership as shared truth.  
- `FrontierTopologyContracts` as useful **library shape** for vector family.  
- 4-layer **idea** preserved **inside** VectorPolygonFamily.  
- PIXI at the edge; requirements verified in the running app, not by one-size geometry DTOs.

---

## Ingestion (one line)

Enumerate **bucket manifests** (keyword-filtered `.md` lists) **before** deep reading; read in **date bands**; exclude harness logs, pipeline snapshot dumps, `node_modules`, `.svelte-kit` — see unified plan **Part VII**.
