# Disconnect Virtual Sites — Why They Produce Black Voids

## What Disconnect Is Supposed To Do

**Goal:** When a player owns two stars that are **NOT connected by a direct lane**, territory should **NOT extend continuously** between them. There should be a visual **gap** — ideally filled by adjacent enemy territory, NOT transparent holes.

**PVV2 behavior** (working correctly): Disconnect generates an invisible Voronoi site at the midpoint. The power diagram creates a polygon for this invisible site, which simply isn't drawn. Adjacent enemy players' polygons naturally fill that space. Result: enemy-colored territory fills the gap — visually clean.

## What DF Shader Currently Does (Broken)

### Step 1: Generate disconnect virtual sites
```
File: territoryFeatures.ts:95-151  (computeDisconnectVirtuals)
```
For each pair of same-owner stars NOT connected by a lane (within `maxDistance`), a virtual site is placed at their midpoint with `ownerId: DISCONNECT_OWNER_ID` and `kind: 'disconnect'`.

### Step 2: Pack into data texture
```
File: DistanceFieldTerritoryRenderer.ts:596-614
```
Disconnect sites get packed with:
- **Owner byte** = `255` (1-indexed) → shader decodes as index `254`
- **Dijkstra** = `0` (competes purely on pixel distance)
- **Boost** = `weight * 100` encoded in row 2 bytes 2-3

### Step 3: Shader influence competition
```
File: DistanceFieldTerritoryRenderer.ts:118-173 (fragment shader loop)
```
The shader loops through ALL stars (real + virtual). For each pixel, it finds the star with the **lowest influence** (`pixelDist + dijkstra * weight - boost`). If the disconnect virtual site wins (it's closest in pixel distance + has boost), that pixel's `bestOwner` = `254`.

### Step 4: Discard (THE PROBLEM)
```
File: DistanceFieldTerritoryRenderer.ts:168-170
```
```glsl
if (bestStar < 0 || bestOwner < 0 || bestOwner == 254) {
    discard;  // <-- Fragment is completely skipped
}
```

**The discard creates a transparent hole.** The game background (dark space/nebula) shows through — which looks like a **black void**.

## Why PVV2 Doesn't Have This Problem

In PVV2's polygon renderer, disconnect sites create invisible Voronoi cells. **But adjacent enemy players' cells naturally extend to fill the gap.** The rendering draws real player polygons, so enemy territory covers the disconnect zone.

In the DF shader, `discard` means **nothing is drawn** at that pixel — not even enemy territory. The pixel is just... empty.

## The Fix: Let Enemy Territory Fill the Gap

Instead of discarding pixels where disconnect wins, the shader should **skip disconnect sites during the ownership competition** and let the **next-best real player** own those pixels. This way:
- Where disconnect sites would have won → enemy territory fills in naturally
- The disconnect sites still **weaken** the same-owner's influence by existing in the competition (they affect where borders land)
- No black holes

### Proposed shader change:
```glsl
// Instead of: if bestOwner == 254 → discard
// Do: skip owner 254 in the competition, let real owners win
if (ownIdx == 254) continue; // Skip disconnect sites in ownership loop
```

This means disconnect sites **don't compete for pixels at all** — they're invisible to the ownership decision. But they still exist in the data texture and **could** be used differently:

**Alternative approach:** Keep disconnect sites in the loop but mark them. After the loop, if `bestOwner == 254`, fall back to `enemyOwner`'s color instead of discarding. This preserves the "push" effect while filling with enemy territory:

```glsl
if (bestOwner == 254 && enemyOwner >= 0 && enemyOwner != 254) {
    // Disconnect won — but render as enemy territory instead of discarding
    bestOwner = enemyOwner;
    bestInfluence = enemyInfluence;
    // Use enemy's color
}
```

This matches PVV2's visual behavior: the gap between unconnected same-owner stars is filled by **enemy territory**, not transparent holes.

## Recommendation

**Use the "fallback to enemy" approach** — it keeps disconnect sites in the influence competition (so they actually push boundaries) but renders enemy-colored territory instead of black voids. This most closely matches PVV2's behavior.

**UPDATE (2026-03-05 10:00):** Implemented the correct approach — disconnect virtual sites now use the nearest enemy player's actual `ownerId` instead of `DISCONNECT_OWNER_ID`. This makes enemy territory fill gaps naturally through normal influence competition. No shader special cases needed. The shader no longer references owner 254 at all.

## User Visual Feedback (2026-03-05 10:09)

From annotated screenshot — three observations for follow-up work:

1. **Star minimum territory buffers** — "The darker blue territory is too squished, we need star minimum territory buffers." Stars at the edges of territory get crowded. Need to implement a minimum distance from star centers (at least 5 orbit radii) before territory boundaries can exist.

2. **Sharp corners need smoothing** — Red boxes highlight specific 3-way junctions where territory corners are too sharp. The current `uSmoothing` alpha-fade approach may not be sufficient; may need stronger smoothing or a different algorithm (e.g., `smin`-based soft minimum for influence blending).

3. **Another sharp corner** — Bottom-center area shows another corner that is "way too sharp and needs a trim."

These are separate tasks from disconnect — document here as reference.
