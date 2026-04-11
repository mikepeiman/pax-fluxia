---
title: Sprint handoff — territory families, map lanes, terminology
date: 2026-04-10
status: active
audience: agents continuing mapgen, territory, or RenderFamily work
related:
  - ../2026-04-08/TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md
  - ./MAP_LANES_MSR_BUFFER_AND_CROSS_PLAYER_CX.md
  - ./UTILITY_EXTRACT_FAMILY_WRAP_PLAN.md
  - ../../MAP_GRAPH_LANE_AND_UI_CONSTRAINTS_CATALOG.md
  - ../../sessions/notes/SESSION_2026-04-10.md
---

# Sprint handoff (2026-04-10)

## 1. Terminology (use consistently)

| Term | Meaning |
|------|--------|
| **Lane** | Player-visible connection between two stars: either a **straight lane** (single line segment between endpoints) or a **curved lane** (polyline / Bézier samples) that still obeys clearance. Prefer **lane** in docs and UI; avoid **chord** except when quoting legacy code comments. |
| **Straight lane** | The linear segment from star A to star B (what Phase 4 tests for pass-through clearance). |
| **Lane centerline** | The geometric path used for drawing, CX sampling, and (when wired) ship travel — from `laneWaypoints` / `lanePolylineCache`. |
| **Lane margin** | `MAPGEN_LANE_MARGIN_PX` — minimum distance from the **sampled lane centerline** to every non-endpoint star. Hard constraint; not optional decoration. |
| **MSR** | `MODIFIED_VORONOI_STAR_MARGIN` — **territory / ownership boundary** margin only. Does **not** set lane clearance. |
| **Curve vs prune bias** | `MAPGEN_LANE_CURVE_VS_PRUNE_BIAS` (0..1) — trades **topology** (Phase 4 drop link + Phase 5 reconnect) vs **geometry** (keep link; curved lane may satisfy full lane margin when the straight lane cannot). |

---

## 2. Updated requirements (lanes + map graph)

- **G-1 / G-2:** Star graph stays **connected**; Phase 5 may add bridge links after prunes ([`generateConnections`](../../../../../common/src/mapgen/connections.ts)).
- **Lane margin:** All **drawn** centerlines respect full lane margin vs non-endpoints ([`attachLaneWaypointsToConnections`](../../../../../common/src/mapgen/lanePolylines.ts)).
- **Phase 4:** Uses **only** the **straight lane** (line between endpoints) for the pass-through test, with effective clearance `laneMargin × (1 − bias)` — **not** the curved sampling clearance.
- **Curved lanes:** Satisfy the **same** lane margin as straight lanes when the solver picks a non-linear path — **constraint-driven**, not cosmetic.
- **MSR split:** Map & Grid MSR slider → territory bump only; lane margin + bias + mode → `rebuildConnectionsFromLaneClearance` / `refreshLanePolylinesFromConfig` as already wired.
- **Single-source CX:** Corridor virtuals from one module; cross-owner lanes included; **queued:** midpoint **vstars per player** on opposing lanes ([MAP_LANES…](./MAP_LANES_MSR_BUFFER_AND_CROSS_PLAYER_CX.md) § Next).
- **Motion contract (still open):** Ships / FX should follow the same polyline as territory consumers (`LanePath` / `lanePolylineCache` — see checklist in MAP_LANES).

Canonical constraint table: [`MAP_GRAPH_LANE_AND_UI_CONSTRAINTS_CATALOG.md`](../../MAP_GRAPH_LANE_AND_UI_CONSTRAINTS_CATALOG.md).

---

## 3. Architecture shift — Render Family (past few days)

**Source of truth:** [TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md](../2026-04-08/TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md).

**Problem:** The old **4-layer** stack (ownership → geometry → transition → presentation) fits **vector polygons + polyline morph** well; it **does not** natively fit metaball grids, GPU distance fields, or shader-centric transitions without forcing one DTO shape.

**Target:**

- **Tier 1 (shared):** Ownership (+ runtime clock; VFX from ownership diffs).
- **Tier 2 (one active):** A **RenderFamily** owns geometry / transition / presentation and returns a **`PIXI.Container`**.
- **VectorPolygonFamily:** Houses today’s 4-layer idea **internally** — not deleted, **scoped**.
- **Shared helpers:** Libraries, not mandatory global pipeline stages for every family.

**Normative interface:** `RenderFamily` + `RenderFamilyInput` / `Output` (see § I.3 in unified plan). Input includes **`lanes`** (star connections), **`tunables`**, **`activeTransition`**, etc.

**Implementation order (supersedes older DF-first idea):**

| Step | Deliverable | Status (plan) |
|------|-------------|---------------|
| Doc A–C | Idea corpus, index, architect recommendations | Done (checklist in unified plan) |
| **Impl 0** | Registry, `DiagnosticProvider`, runtime clock, gated dispatch | **Open** |
| **Impl 1** | `MetaballFamily` (first adapter) | **Open** |
| **Impl 2** | `ContourFamily` | **Open** |
| **Impl 3** | `DistanceFieldFamily` + `VectorPolygonFamily` facade, family UI, prune | **Open** |

**Related parallel plan:** [UTILITY_EXTRACT_FAMILY_WRAP_PLAN.md](./UTILITY_EXTRACT_FAMILY_WRAP_PLAN.md) — dedupe `renderers/geometry/` imports, then wrap remaining renderers as families without deleting options.

---

## 4. Work completed (2026-04-10 — concrete tasks)

- **Map & Grid live:** Removed `hasStarted` gate on lane controls; `snapshot = toGameState(state)` after link rebuild / lane refresh ([`gameStore.svelte.ts`](../../../../../pax-fluxia/src/lib/stores/gameStore.svelte.ts), [`ControlsSection-Visuals.svelte`](../../../../../pax-fluxia/src/lib/components/ui/settings/ControlsSection-Visuals.svelte)).
- **Lane margin vs MSR:** `MAPGEN_LANE_MARGIN_PX` for lanes; MSR territory-only; renamed UI from “lane buffer”; migrations for old keys ([`game.config.ts`](../../../../../pax-fluxia/src/lib/config/game.config.ts), [`panelSync.ts`](../../../../../pax-fluxia/src/lib/components/ui/panelSync.ts), [`GameRoom.ts`](../../../../../pax-server/src/rooms/GameRoom.ts), [`common/mapgen`](../../../../../common/src/mapgen/)).
- **Curve vs prune bias:** `MAPGEN_LANE_CURVE_VS_PRUNE_BIAS` + Phase 4 clearance scaling; wired mapgen, client, server, Main Menu ([`connections.ts`](../../../../../common/src/mapgen/connections.ts)).
- **Necessity-only curved solver:** No decorative bulge when straight lane already clears; curves when geometry requires it **given** the edge set from Phase 4.
- **Metaball:** `METABALL_BLUR_AFFECTS_BORDERS` + UI + renderer parenting / fingerprint (see session).
- **Docs:** `SESSION_2026-04-10.md`, `MAP_GRAPH` L-1, `MAP_LANES` sections; removed duplicate 04-09 session file earlier in week.
- **Hygiene:** Removed debug ingest `fetch` from prior lane debug session.

---

## 5. Remaining (current sprint / queue)

**Lanes & CX (MAP_LANES checklist)**

| Item | Notes |
|------|--------|
| Cross-player **midpoint vstars** (per owner) | MAP_LANES § Next; FEATURE_STATUS V-9 |
| `validateLaneClearance` (custom maps) | P4 |
| `LanePath` + ship / conquest FX on polylines | P1 motion |
| MV → single `computeCorridorVirtuals` import | P2 optional |
| Per-family CX weights | Only if QA needs |

**Render Family (unified plan)**

| Item | Notes |
|------|--------|
| Impl 0–3 | Registry, Metaball → Contour → DF → VectorPolygon facade |
| Family selector UX | One family + family-specific sub-options |

**Utility / wrap ([UTILITY_EXTRACT_FAMILY_WRAP_PLAN.md](./UTILITY_EXTRACT_FAMILY_WRAP_PLAN.md))**

| Item | Notes |
|------|--------|
| Phase 1 | Redirect duplicate geometry helpers to `renderers/geometry/` |
| Later phases | Wrap each renderer as a family (inventory in that doc) |

**UX backlog (session)**

- **Order arrows:** Visual pass, extra tunables, **dedicated panel**.

**Tracker**

- Refresh **FEATURE_STATUS** V-9 wording if it still implies “no bias” or omits Phase 4 scaling.

---

## 6. How the next agent should proceed

1. **Lanes:** Read **§2** above + [`MAP_GRAPH…`](../../MAP_GRAPH_LANE_AND_UI_CONSTRAINTS_CATALOG.md). Code path: [`common/src/mapgen/index.ts`](../../../../../common/src/mapgen/index.ts) → `generateConnections` → `attachLaneWaypointsToConnections`; client cache [`lanePolylineCache.ts`](../../../../../pax-fluxia/src/lib/lanes/lanePolylineCache.ts).
2. **CX next feature:** Implement midpoint vstars in [`buildCorridorVirtualSites.ts`](../../../../../pax-fluxia/src/lib/territory/corridor/buildCorridorVirtualSites.ts) (or delegated helper), then verify Metaball → MV → others per MAP_LANES rollout list.
3. **Render Family:** Start from [TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md](../2026-04-08/TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md) **Impl 0** checklist; do not assume DF-first.
4. **Language:** In new prose, say **lane** / **straight lane** / **curved lane**; align UI strings over time.

---

## 7. Quick file index

| Area | Path |
|------|------|
| Mapgen entry | `common/src/mapgen/index.ts` |
| Topology + Phase 4/5 | `common/src/mapgen/connections.ts` |
| Lane geometry | `common/src/mapgen/lanePolylines.ts` |
| Live rebuild | `pax-fluxia/src/lib/stores/gameStore.svelte.ts` |
| Map & Grid UI | `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Visuals.svelte` |
| Session log | `.agent/docs/project/sessions/notes/SESSION_2026-04-10.md` |
