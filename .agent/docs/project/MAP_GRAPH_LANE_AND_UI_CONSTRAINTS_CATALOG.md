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
| **G-1** | **Must.** The star–connection graph is **connected**: for every pair of distinct stars there exists a **path of edges** (lanes / map connections) between them. There are **no disconnected components** or island subgraphs. *(Originating constraint; restated explicitly 2026-04-09.)* |
| **G-2** | **Should.** Map generation (placement + `generateConnections` and any prune passes) **preserves G-1** or **repairs** it (e.g. guarantee a spanning structure, re-add bridge edges, or reject/regenerate layouts). If a prune step can remove bridges, that is an **implementation risk** against G-1 until addressed. |

---

## 2. Lane geometry (clearance, shape, crossings)

| ID | Constraint |
|----|------------|
| **L-1** | **Plan (mapgen prune / straight chords).** For feasibility of **straight** segments and for **Phase 4** chord-based pruning in connection generation, clearance to **non-endpoint** stars uses **`D_clear = MSR_px + laneBuffer_px`** (tunable; not a hardcoded constant). Endpoints of that edge are **exempt**. See [MAP_LANES_MSR_BUFFER_AND_CROSS_PLAYER_CX.md](./implementation-plans/2026-04-10/MAP_LANES_MSR_BUFFER_AND_CROSS_PLAYER_CX.md) §1. |
| **L-2** | **Must (session 2026-04-09).** The **drawn lane centerline** must not pass within **MSR** of the center of any star that is **not** an endpoint of that lane. *(Implementation today: curved polyline obstacle check uses MSR-only; graph prune still uses MSR + lane buffer per L-1 — keep both documented until unified if design requires.)* |
| **L-3** | **Must (session 2026-04-09).** In **curve-allowed** mode, lanes are **not** all curved: use a **straight chord** when it already satisfies **L-2** (and non-crossing rules below). Introduce curvature or a detour **only when necessary**. |
| **L-4** | **Must (session 2026-04-09).** Lane centerlines **must not cross** each other (interior intersections between distinct edges). |
| **L-5** | **Plan.** **Straight** mode: path is exactly the segment between endpoints; clearance checked accordingly. |
| **L-6** | **Plan.** Curved solver: **prefer** a single curved segment (e.g. one Bézier); allow a **small** number of interior vertices only if required; **hard** iteration and/or time limits; capped sampling — no unbounded loops. |
| **L-7** | **Plan.** If no feasible lane exists within budget, policy is **prune edge** or **regenerate placement** (product choice). **Should.** Avoid silent acceptance of **L-2** / **L-4** violations; current fallback behavior may still allow edge cases until strengthened. |

---

## 3. Lane path contract and motion

| ID | Constraint |
|----|------------|
| **M-1** | **Plan.** Map output carries stable **waypoints / polyline** per connection so renderers, CX, and gameplay do not re-solve independently. |
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
