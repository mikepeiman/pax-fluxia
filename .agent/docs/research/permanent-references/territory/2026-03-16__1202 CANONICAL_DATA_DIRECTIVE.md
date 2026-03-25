# CANONICAL DATA DIRECTIVE

**This is not new. This has been the plan for weeks. Execute it.**

---

## The Rule

ONE set of points defines each territory boundary.
Fills are drawn FROM those points.
Borders are drawn ON those points.
There is no other geometry. There is no second extraction. There is no "shared edge" side-channel.

Deviation is **impossible by construction** because there is only one source.

---

## The Violation

`legacy_pvv2` calls `renderPowerVoronoi()` without canonical data.
PVV2 then runs its own `d3-weighted-voronoi` and produces TWO geometry sets:
- `mergeSameOwnerCells()` → fills
- `extractSharedEdges()` → borders

Two extractions. Two coordinate sets. Guaranteed mismatch. This is the ONLY reason B-42 exists.

---

## The Fix

`legacy_pvv2` runs `runFG2DataPipeline()` → `extractCanonicalData()` → passes to PVV2.
PVV2 receives `CanonicalTerritoryData`. Each shell has `points: [number, number][]`.
PVV2 draws fill polygon from shell points. PVV2 strokes borders on the same shell points.
Done.

---

## Do Not

- Do NOT try to "align" two separate geometry sources. Eliminate one.
- Do NOT add Bézier, Chaikin, or any smoothing hack to make divergent paths look similar.
- Do NOT reframe the problem. It was diagnosed. It was planned. Execute.
- Do NOT claim this is new information. It is documented in V3 master plan §1, §3, and §6.

---

## Precedent

PVV3 already does this correctly. `legacy_pvv3` runs FG2 → canonical → PVV3 draws from shells.
Copy the pattern. Nothing novel required.
