---
title: Map graph, lanes, and Map & Grid UI — constraints catalog
date: 2026-04-09
status: active
related:
  - ./implementation-plans/2026-04-10/MAP_LANES_MSR_BUFFER_AND_CROSS_PLAYER_CX.md
---

# Map graph, lanes, and Map & Grid UI — constraints catalog

Single place for **map topology**, **lane geometry**, **live UI**, and **related territory (CX/DX) expectations** that have been stated as requirements (originating design plus refinements from implementation discussion on **2026-04-09**).

**Legend:** **Must** = hard product constraint. **Should** = strong intent with known implementation gaps called out. **Plan** = captured in a planning artifact, rollout may be partial.

---

## 1. Graph connectivity (map topology)

| ID | Constraint |
|----|------------|
| **G-1** | **Must.** The star–connection graph is **connected**: for **every** pair of distinct stars there exists a **path of edges** (lanes / map connections) between them. There are **no disconnected components** or island subgraphs. **Gameplay depends on this:** ships and orders must be able to route (directly or transitively) between any two stars on the map. *(Originating constraint; restated 2026-04-09; gameplay impact explicit 2026-04-09.)* |
| **G-2** | **Must.** Map generation (`generateConnections` and any prune or clearance pass) **must not** ship a disconnected graph. If a prune step removes bridge edges, the pipeline **must repair** connectivity (e.g. Phase 5 bridge re-add from the Delaunay edge pool, shortest first) or reject/regenerate the layout. **MSR-only edge prune** and similar heuristics are allowed only when followed by a **connectivity guarantee**. |

---

## 2. Lane geometry (clearance, shape, crossings)

| ID | Constraint |
|----|------------|
| **L-1** | **Plan.** **Phase 4 Delaunay prune** (which edges exist) uses **MSR-only** clearance to non-endpoints so the graph is not over-pruned before lanes run. **Drawn** lane segments (straight or curved) still respect **`D_clear = MSR_px + laneBuffer_px`** vs non-endpoints. Endpoints exempt per edge. **G-1 / G-2:** after pruning, **`generateConnections`** runs a **connectivity repair** pass so the final edge set remains a single component. |
| **L-2** | **Must.** Sampled **curved** lane centerlines stay at least **`D_clear = MSR + laneBuffer`** from any non-endpoint star center (same numeric clearance as L-1 / MAP_LANES §1.3). Straight **map lane mode** still uses endpoint-to-endpoint chords only. |
| **L-3** | **Must (session 2026-04-09).** In **curve-allowed** mode, lanes are **not** all curved: use a **straight chord** when it already satisfies **L-2** (and non-crossing rules below). Introduce curvature or a detour **only when necessary**. |
| **L-4** | **Must (session 2026-04-09).** Lane centerlines **must not cross** each other (interior intersections between distinct edges). |
| **L-5** | **Plan.** **Straight** mode: path is exactly the segment between endpoints; clearance checked accordingly. |
| **L-6** | **Plan.** Curved solver: **prefer** a single curved segment (e.g. one Bézier); allow a **small** number of interior vertices only if required; **hard** iteration and/or time limits; capped sampling — no unbounded loops. |
| **L-7** | **Plan.** If no feasible lane exists within budget, policy is **prune edge** or **regenerate placement** (product choice). **Should.** Avoid silent acceptance of **L-2** / **L-4** violations; current fallback behavior may still allow edge cases until strengthened. |

---

## 3. Lane path contract and motion

| ID | Constraint |
|----|------------|
| **M-1** | **Plan.** Map output carries stable **waypoints / polyline** per connection plus **`lanePathKind`** (`straight` \| `curved`) so renderers, CX, and gameplay do not re-solve independently. |
| **M-2** | **Plan.** Ship travel and conquest (and related FX) follow the **same** lane path as territory/corridor consumers — not an ad hoc chord if the map is curved. |

---

## 4. Map & Grid UI (live editing)

| ID | Constraint |
|----|------------|
| **U-1** | **Plan.** **MSR**, **lane buffer**, **lane mode**, and related map knobs live under **Map & Grid**; while **paused**, changes **recompute** lane geometry and bump dependent caches so feedback is immediate. |
| **U-2** | **Must (session 2026-04-09).** Lane geometry mode is presented as a **two-state control** (**Straight** vs **curve-allowed** / **curve if needed**), not as a lone checkbox that reads as “on/off” without the straight alternative. |

---

## 5. Corridor virtuals (CX)

| ID | Constraint |
|----|------------|
| **C-1** | **Plan.** **Single-source** CX builder consumed by all territory render families (Metaball first, then others). |
| **C-2** | **Plan.** Corridor virtuals apply to **qualifying connections across owners** — remove **same-owner-only** eligibility so borders can meet along **cross-player** edges. |
| **C-3** | **Plan.** For **curved** lanes, sample virtuals along the **polyline**, not only the chord. |
| **C-4** | **Plan.** Virtual sites must **not** imply false graph connectivity between clusters. |
| **C-5** | **Open.** Neutral endpoint policy (both endpoints owned vs mixed) — see MAP_LANES §4. |

---

## 6. Disconnect buffer / “DX” (presentation — intent vs today)

These items describe **what the player should eventually perceive** and how **current** behavior differs; they are **not** all implemented as stated.

| ID | Item |
|----|------|
| **D-1** | **Intent (session 2026-04-09).** Between **same-owner** stars that are **not** connected by a lane, the map should show a **visually obvious** separatrix / gap so disjoint components are readable. |
| **D-2** | **Intent (session 2026-04-09).** When **no enemy** is proximate enough to “claim” the gap, that region may present as **neutral** rather than attributed to a single enemy. |
| **D-3** | **Intent (session 2026-04-09).** Neutral (or dedicated) gap styling: **adjustable pattern fill** and **HSLA** (or equivalent) controls — **future**; not a locked constraint until specified. |
| **D-4** | **Fact (transparency).** Today, disconnect virtuals and buffer geometry can feel **asymmetric** (enemy-attributed midpoint influence, two-phase vertex push/pull). Treat as **known behavior** to revise when pursuing D-1–D-3. |

---

## 7. Config and architecture alignment

| ID | Constraint |
|----|------------|
| **A-1** | **Plan.** Mapgen and runtime territory assumptions share **the same logical** MSR / lane buffer / lane mode inputs at generation time; live Map & Grid edits use **current** slider values when paused. |

---

## 8. Change log

| Date | Notes |
|------|--------|
| 2026-04-09 | Initial catalog: connectivity **G-1**, adaptive lanes **L-3**, MSR obstacle **L-2**, non-crossing **L-4**, lane mode toggle **U-2**, DX neutral/pattern intent **D-1–D-3**; merged with MAP_LANES plan items **L-1**, **L-5–L-7**, **M-***, **U-1**, **C-***, **A-1**. |
| 2026-04-09 | **L-2** unified with **D_clear** for curved sampling; **M-1** adds `lanePathKind` on `MapConnection`. |
| 2026-04-09 | **G-1** expanded with **gameplay routing** wording; **G-2** promoted to **Must** + connectivity repair after prune (`common/mapgen/connections.ts` Phase 5). |
