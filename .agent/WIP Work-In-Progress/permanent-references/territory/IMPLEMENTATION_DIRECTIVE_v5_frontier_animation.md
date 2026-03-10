# Frontier Transition Animation

> [!CAUTION]
> **No breaks in frontier lines — NONE.** The frontier is always a continuous, unbroken line.

## Glossary

| Term | Meaning |
|------|---------|
| **Frontier** | Geographic boundary between two players' territory. Always a continuous, unbroken line. The single source of truth for territory extent. |
| **Border** | Visual appearance (stroke) drawn at a frontier. Optional — players may toggle visibility, color, width. Borders are drawn at frontiers; frontiers exist whether or not borders are drawn. |
| **Frontier region** | A section of the frontier line. May span multiple stars' Voronoi boundaries. |
| **Control points** | Points along a frontier region used for interpolation during animation. More = smoother morph. Adjustable slider: 5–300 (step 5). |
| **F1** | Current frontier state — the complete, continuous frontier line(s) before a conquest. |
| **F2** | Future frontier state — the complete, continuous frontier line(s) after a conquest. Computed immediately when battle calculations conclude. |
| **Star** | A game-world star. Each owned star produces a Voronoi cell that defines its territory contribution. |
| **Frontier = Voronoi + Chaikin + arcs** | The frontier is the full smoothing pipeline output, not raw polygon edges. |

## Algorithm

### 1. Compute F1 and F2

When a conquest concludes:
- **F1** = current frontier (already rendered on screen)
- **F2** = new frontier (computed from post-conquest ownership via the full pipeline: Voronoi → Chaikin → arcs)

### 2. Diff F1 and F2

Compare the two frontier states:
- **Static sections**: parts of the frontier line that remain in the same position from F1→F2. These stay put — no flicker, no morph, no redraw.
- **Changed sections**: parts that moved. From the points where a static section ends and movement begins, these sections need animation.

### 3. Animate Changed Sections

For each changed section:
- Sample N control points (adjustable slider, 5–300, step 5) along the F1 version
- Sample N control points along the corresponding F2 version
- Each frame: interpolate all N points from F1 positions → F2 positions

The frontier line is always continuous and unbroken. It simply slides from old position to new.

### 4. Fill Inside Frontiers

At every frame during animation, fill each territory region as defined by the current frontier position. The frontier IS the boundary — fill everything inside it with the owning player's color.

No prev/target baggage. No clipping against old state. The frontier defines the regions; the fill follows.

### 5. Tag Border Segments by Star Identity

Each frontier section knows which two stars it separates (starIdA/starIdB). This enables deterministic matching between F1 and F2 — the border between star #23 and star #42 in F1 matches to the same star-pair entry in F2, regardless of ownership changes.

Modify `extractSharedEdges` to include `siteIdA`/`siteIdB` on each `SharedBorderEdge`.

## Special Case: Territory Splitting

If PlayerA's territory contains three stars in a line A–B–C, and star B is captured:
- F1: one elongated frontier loop around all three stars
- F2: two separate frontier loops — one around A, one around C

The single loop gets severed and splits into two. The animation must handle this: the frontier line pinches at the B-region and separates into two closed loops.

## Modular Fill Transition

Config toggle `TERRITORY_FILL_TRANSITION_MODE`:
- `'geometry'`: fill bounded by current frontier position (spec-correct)
- `'crossfade'`: alpha fade between prev/target fills (player appearance option)

## Verification

- `TERRITORY_TRANSITION_MS` at 2000+
- Conquest: fill grows behind the moving frontier
- **No breaks in frontier lines — NONE**
- Static frontier sections: zero flicker or redraw
- Moving frontier sections: smooth morph with N control points
- Frontier = full pipeline output (Voronoi + Chaikin + arcs)
