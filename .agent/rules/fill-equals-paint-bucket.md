# Fill = Paint Bucket

## Imperative

**Fills must behave like a paint bucket tool.** Whatever the bounding lines (borders) are, fill the enclosed region completely. No gaps. No misalignment. No independent geometry.

## Rules

1. Fills and borders MUST use the exact same point data
2. If borders apply any interpolation (Bézier, Chaikin, densification), that interpolation must be applied to the shared data BEFORE it reaches either renderer
3. Fill renderer draws straight lines between points (`poly()`)
4. Border renderer draws straight lines between points (`lineTo`)
5. Both receive the same pre-processed dense point array — divergence is impossible

## Architecture

```
pvv2MetricStage → raw points
                    ↓
         densifyBezierMidpoints()  ← single transformation
                    ↓
         shared dense point array
              ↙          ↘
     poly() fills     lineTo borders
```

## What NOT To Do

- ❌ Apply curves at draw time in one renderer but not the other
- ❌ Use different smoothing strategies for fills vs borders
- ❌ Alpha-crossfade fills while vertex-lerping borders during transitions
- ❌ Compute geometry in the renderer
