# Visual Feedback Round 3 — 2026-03-03 13:06

## Screenshot Analysis (user-annotated, game at tick ~150, all stars at 70 ships)

### Observation 1: "Connect territories vertex-to-vertex and fill"
- **Location:** Top-left — two same-owner (teal/dark blue) territories near each other but not connected
- **User says:** "I don't think you've properly instituted this as part of the algo pipeline"
- **Problem:** Same-owner territories that are spatially adjacent but separated by an unowned or enemy cell don't connect. The merged polygons are per-cluster (connected component) — isolated same-owner stars near each other but not directly connected via lane still produce separate polygons.
- **Implication:** The user wants same-owner territories that are spatially close to visually connect and fill the space between them, even without a direct lane connection.

### Observation 2: "Still need to pull in/backfill territories"
- **Location:** Center area
- **Problem:** Despite switching to all-stars Voronoi, there are still visible gaps between territories. The gaps may be caused by:
  - Unowned stars whose cells are not rendered (creating dead zones)
  - Star margin pushing boundaries inward, creating slivers between adjacent different-owner territories
  - Edge effects at map boundaries
- **Action needed:** Verify that ALL space within the game world is covered by some territory polygon. If all stars are owned, coverage should be complete from the Voronoi itself. If some stars are unowned, their cells create gaps.

### Observation 3: Lane-Aware Corridors — CRITICAL DESIGN INPUT
- **Location:** Bottom-right, extensive annotation
- **User says:** "Both dark blue and green in this example are jutting in where they do not belong. Because teal is connected by a lane here, that lane should take precedence. The green angle alone should be affected by our angle algorithm, can you see what is happening in the renderer in this case? But bottom line, we do need lane awareness - 'corridors' - but I do NOT want you to simply reuse previous efforts. I want fresh thinking that fits this model, this renderer, this approach."
- **Core insight:** Territory boundaries based on pure Voronoi proximity ignore the game's strategic lane connections. When two same-owner stars are connected by a lane, the territory between them should form a corridor owned by that player — even if Voronoi geometry would assign that space to a different (unconnected) owner.
- **Constraint:** Fresh design for THIS renderer. Do NOT copy/paste the LaneTerritoryRenderer approach.

## Design Thinking: Lane-Aware Corridors for Modified Voronoi

### The fundamental problem
Voronoi = spatial proximity. Lanes = strategic connectivity. These two models conflict:
- A star may be spatially closer to an enemy, but strategically connected to a friendly star via lane
- The Voronoi boundary between them gets assigned to the spatially-closer enemy
- The lane corridor should "claim" territory from the Voronoi cells it passes through

### Fresh approach for this renderer
Instead of building a separate lane renderer, integrate lane awareness INTO the Voronoi pipeline:

**Option A: Weighted Voronoi (Power Diagram)**
- Add "influence weight" per star based on lane connectivity
- Stars with more same-owner lane connections get larger cells
- Pros: Mathematically clean, smooth boundaries
- Cons: d3-delaunay doesn't support weighted diagrams natively

**Option B: Post-Voronoi Corridor Overlay**
- After computing merged Voronoi polygons, for each same-owner lane:
  1. Compute a corridor strip (rectangle + endcaps) along the lane
  2. Union the corridor strip with the owner's merged polygon
  3. Subtract the corridor from enemy polygons that overlap it
- Pros: Clean separation of concerns, works with existing pipeline
- Cons: Polygon union/subtraction is complex geometry

**Option C: Voronoi Site Injection (RECOMMENDED)**
- For each same-owner lane, inject virtual "corridor sites" along the lane path
- These virtual sites participate in the Voronoi computation as additional stars owned by the same player
- The Voronoi diagram naturally assigns the corridor space to the virtual sites
- The merge step then merges these corridor cells with the real star cells
- Pros: Leverages existing Voronoi+merge pipeline, no polygon boolean ops needed
- Cons: More sites = slightly more computation, need to tune virtual site density

### How Option C works:
1. For each same-owner lane connection, sample N points along the lane (every ~50-100px)
2. Each sample point becomes a virtual star with the same ownerId
3. Include virtual stars in the Voronoi computation (alongside real stars)
4. Virtual star cells get the owner's color, merge naturally with adjacent same-owner cells
5. Result: lanes produce territory corridors that emerge organically from the Voronoi geometry

### Why this fits THIS renderer:
- No new rendering code needed — virtual sites are just more Voronoi input
- Merge step already handles same-owner adjacency
- Arc smoothing already rounds corridor boundaries
- Star margin already keeps boundaries clear of real stars
- Chaikin smoothing works on the final result
