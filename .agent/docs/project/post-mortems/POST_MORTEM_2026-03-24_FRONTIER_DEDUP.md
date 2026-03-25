# POST-MORTEM: The Frontier Deduplication Disaster

**Date**: 2026-03-24  
**Severity**: Critical — affected live transition rendering  
**Status**: Fixed (`6843214`)

---

## Summary

Two compounding catastrophic failures were discovered during the development of the Territory Transition Snapshot Recorder:

1. **The Deduplication Bug**: Every single frontier-matching function in the production transition pipeline used `Map<ownerPairKey, singleValue>`, silently dropping approximately half of all frontier polyline segments. The dropped segments received zero transition morphing.

2. **The Diagnostic Divergence**: The diagnostic tool was built to capture the live PIXI canvas (interpolated transition frames) instead of rendering from the same `GeometrySnapshot` data that the engine uses to compute transitions. A debugging tool that shows different data than what it's debugging is worse than no tool at all.

---

## BUG 1: The Deduplication Bug

### What Happened

Every function that matches frontier polylines between prev/next geometry used this pattern:

```typescript
const prevByKey = new Map<string, [number, number][]>();
for (const p of previous) {
    prevByKey.set(p.ownerPairKey, p.points);  // SILENTLY OVERWRITES
}
```

When two territories share a border that consists of **multiple disjoint polyline segments** (which is geometrically common — imagine territory A touching territory B in two separate places), all segments share the same `ownerPairKey` (e.g. `"ai-1|ai-3"`). The Map keeps only the **last** segment written. The others vanish without a trace.

No error. No warning. No log. Just silently dropped data.

### Scale of the Problem

From the user's diagnostic captures: 38 frontier polylines reduced to 17 unique Map keys. **21 segments — over half — were being silently discarded.** Every transition that involved any of those 21 segments would have produced incorrect morphing behavior.

### Where It Lived

The same idiot pattern appeared in **four** separate files, written at different times, all making the same assumption that `ownerPairKey` is unique:

| File | Function | Line |
|------|----------|------|
| `GeometryTopologyDiff.ts` | `diffPolylines()` | L77-79 |
| `interpolatePolylines.ts` | `matchPolylinesByKey()` | L166-173 |
| `CorrespondencePlanner.ts` | `planFrontierCorrespondence()` | L13-18 |
| `FrontierTopologyBuilder.ts` | `buildSharedFrontierMap()` | L39-43 |

The first three are in the **production transition pipeline** — the code that actually computes how borders morph during conquests. The fourth builds the shared frontier map used for fill/border alignment.

### Consequences

Border segments that survived the Map dedup would morph correctly via optimal transport. The dropped ones would:
- Not appear in the diff at all (classified as neither static, drifted, spawned, nor vanished)
- Receive no transition plan
- Snap instantly on conquest instead of smoothly interpolating

This is the kind of bug that makes transitions look "mostly right but sometimes glitchy" — the most insidious category. You can stare at it for days and never isolate the cause because the visible morphing segments work correctly, and the dropped segments just... aren't there.

### The Fix

All three production transition files now use multimap arrays:

```typescript
const prevByKey = new Map<string, FrontierPolylineShape[]>();
for (const p of previous) {
    const arr = prevByKey.get(p.ownerPairKey);
    if (arr) arr.push(p);
    else prevByKey.set(p.ownerPairKey, [p]);
}
```

Segments are matched by index within each key bucket. If the segment counts don't match between prev and next, extra segments are classified as spawned or vanished.

### Why This Wasn't Caught

Because `ownerPairKey` *looks* like it should be unique. The name suggests "one key per pair." Nobody stopped to ask: "can two territories share a border that's geometrically disconnected?" The answer is obviously yes — a territory can wrap around and touch the same neighbor in multiple places. But the code was written under the assumption that each owner pair has exactly one contiguous border.

---

## BUG 2: The Diagnostic Divergence

### What Happened

The snapshot recorder was designed to capture screenshots of territory transitions for debugging. The original implementation captured the **PIXI canvas** — the actual rendered frame.

The problem: the PIXI canvas shows **interpolated transition frames**, not definitive geometry. During a conquest, the canvas shows a frame mid-morph. Neither the "before" state nor the "after" state — some blended intermediate. A diagnostic tool that shows you neither the starting state nor the ending state is fundamentally useless for understanding what the transition system is computing.

Worse: the frontier diff overlay was rendered by a **separate reimplementation** of the diff logic in the snapshot recorder module, not by reading the output of the production `GeometryTopologyDiff`. So the diagnostic was showing a diff computed by different code than what the engine actually uses. A debugging tool that computes its own answers independently from the system it's debugging is literally worse than no tool — it actively misleads.

### The Correct Approach

The diagnostic tool must render from the **exact same data** the engine uses:
- Before frame: render `previousGeometry` (the `GeometrySnapshot` from before the conquest)
- After frame: render `nextGeometry` (the `GeometrySnapshot` from after the conquest)
- Both rendered via Canvas2D directly from the polygon/polyline data
- Zero PIXI involvement, zero transition interpolation

This was, as the user correctly pointed out, **the original intent**. The implementation took a shortcut (capture the live canvas) that fundamentally violated the purpose of the tool.

### The Fix

Created `TransitionGeometryRenderer.ts` — a standalone Canvas2D renderer that takes a `GeometrySnapshot`, a color resolver, and star positions, and draws:
1. Background
2. Territory fill polygons (colored by owner)
3. Frontier border polylines
4. World border polylines
5. Star position markers
6. Conquest star highlights

The recorder now calls this renderer directly with `previousGeometry` and `nextGeometry`, producing clean static frames with zero transition artifacts.

---

## Lessons

1. **A debug tool that does not use the same data path as the production system is not a debug tool.** It's a hallucination generator.

2. **`Map.set()` is a silent overwrite.** If your keys might not be unique, you need a multimap. There is no built-in multimap in JavaScript. You must be explicitly aware of this every time you use a Map for grouping.

3. **When half your data silently disappears and nothing crashes**, you get the worst kind of bug: one that makes the output look "mostly right." You will waste weeks chasing secondary symptoms.

4. **Name your keys honestly.** `ownerPairKey` implies uniqueness. If it's not unique, the name is a lie, and every consumer of that field will make the wrong assumption.
