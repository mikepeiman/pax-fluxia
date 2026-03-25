# Frontier-First Territory Rendering

> [!CAUTION]
> **No breaks in frontier lines — NONE.**
> This is the always-on rendering architecture, not just transition behavior.

## Glossary

| Term | Meaning |
|------|---------|
| **Frontier** | Geographic boundary between two players' territory. Always continuous and unbroken. Single source of truth for territory extent. |
| **Border** | Visual stroke drawn at a frontier. Optional appearance setting. |
| **F1** | Current frontier state — array of closed loops. |
| **F2** | Post-conquest frontier state — array of closed loops (may have more or fewer loops than F1 due to splitting/merging). |
| **Control points** | Points sampled along changed frontier sections for interpolation. Slider: 5–300 (step 5). |

## Always-On Architecture

Every frame, regardless of conquest:
1. Compute frontiers (Voronoi → Chaikin → arcs, with corridors and disconnect regions)
2. Fill inside each frontier region with the owning player's color
3. Optionally draw border strokes at frontiers

This is how territory renders. Period.

## Conquest Animation

When a conquest occurs, only the frontier positions change. The animation is a diff between two whole-frontier states.

### 1. Compute F1 and F2

- **F1**: `FrontierLoop[]` — current frontier (already on screen)
- **F2**: `FrontierLoop[]` — post-conquest frontier (computed immediately)

Both are **arrays of loops** — because a conquest can split one loop into two, or merge two loops into one.

### 2. Diff F1 → F2

Walk both frontier arrays and identify:
- **Static sections**: points that haven't moved (same position in F1 and F2). Stay put — no flicker, no redraw.
- **Changed sections**: points that moved. From where a static section ends and movement begins, sample N control points on each side.

### 3. Animate

Each frame during transition:
- Static sections: rendered at their fixed position
- Changed sections: interpolate N control points from F1 positions → F2 positions
- The frontier is always continuous and unbroken throughout

### 4. Fill Inside Frontier

Every frame: fill each territory region as defined by the current frontier position. The frontier IS the boundary — fill everything inside it. No prev/target state baggage.

## Territory Splitting

If PlayerA has stars A–B–C in a line and star B is captured:
- **F1**: one loop around A–B–C
- **F2**: two loops — one around A, one around C

The data structures and function signatures accept arrays:
```typescript
function morphFrontierToTarget(
    f1: [number, number][][],  // array of frontier loops (current)
    f2: [number, number][][],  // array of frontier loops (target — may be different count)
    t: number,                 // interpolation 0→1
    controlPointCount: number, // 5–300 slider
): [number, number][][]       // interpolated frontier loops
```

When splitting: control points from the single F1 loop are distributed to the two F2 loops based on which section of the original loop maps to which new loop.

## Modular Fill Mode

Config `TERRITORY_FILL_TRANSITION_MODE`:
- `'geometry'`: fill bounded by current frontier position (spec-correct)
- `'crossfade'`: alpha fade (player appearance option)

## Verification

- **No breaks in frontier lines — NONE**
- Static sections: zero flicker
- Changed sections: smooth morph via N control points
- Fills follow frontier position every frame
- Territory splitting: one loop → two loops animated smoothly
- Frontier = full pipeline (Voronoi + Chaikin + arcs)
