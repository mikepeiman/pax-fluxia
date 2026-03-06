# Post-Mortem V2: GPU Border Debugging (March 6, 2026)
# STATUS: CORRECTED — Root cause identified from shader code analysis.

## The Systemic Error

I substituted **my interpretation** for the **user's actual observation** — repeatedly, across 10+ iterations.

| What the user said | What I heard | What they meant |
|---|---|---|
| "borders are broken" | "borders don't render" | **borders render at wrong positions** |
| "still broken" | "my fix didn't apply" | **same visual problem persists** |
| "complete mess, both in location and appearance" | "softness math is wrong" | **the borders are at wrong locations** |
| "LOCATIONS of the borders are wrong" | (finally heard it) | **the borders are at wrong locations** |

The user told me the problem **from the start**. I pattern-matched to past bugs (shader compilation failures, invisible renders) and never checked my interpretation against their words.

## Wasted Effort

- **~12 commits** on wrong hypotheses
- **~75 minutes** of user time
- **~25 tool calls** that addressed non-problems
- 0 of those iterations were correctly oriented toward the actual problem
- V1 post-mortem itself contained another unverified hypothesis ("all renderers active"), requiring a second correction

## The ACTUAL Root Cause (from shader code analysis)

**The fill and border coordinate systems are disconnected.**

```glsl
// FILL: Uses gapNorm to fade alpha near mathematical boundaries
// Result: territories appear as glowing blobs NEAR stars
float junctionFade = smoothstep(0.0, 1.0, gapNorm * (200.0 / max(uSmoothing, 1.0)));
alpha *= junctionFade;  // ← alpha → 0 far from star centers

// BORDERS: Detect ownership changes at mathematical Voronoi boundaries
// Result: borders appear at VORONOI CELL EDGES — far from visible fills
int oE = int(floor(sE.r * 255.0 + 0.5)) - 1;
if (oE != myOwner && oE >= 0) isBorder = true;
```

**The fills fade to zero alpha** long before reaching the Voronoi cell edges. **The borders appear at those edges.** The result: a huge gap between visible fills and visible borders.

## The Correct Fix

Borders should appear at the **visible boundary** (where fill alpha drops below threshold), not the mathematical Voronoi edge. Two approaches:

1. **Use gapNorm for border position**: `gapNorm` already encodes distance-to-boundary. Draw borders where `gapNorm` is small but nonzero (at the visible edge), rather than where a different owner texel exists
2. **Restrict neighbor sampling to visible range**: Scale the search radius by gapNorm or only trigger borders where the fill is still visible

## Error Pattern Analysis

The failure repeated three times in escalating meta-levels:
1. **Level 1**: Wrong diagnosis of user's bug report → wrong code changes
2. **Level 2**: Wrong root cause in V1 post-mortem → would have led to wrong fix
3. **Level 3**: Still forming hypotheses from my reasoning instead of the user's observation

The consistent error: **privileging my internal model over the user's direct observation**. Each time I was corrected, I formed a new hypothesis from my model instead of going to the source (the user's words, the actual code, the visual output).

## Rule Created

`visual-bug-protocol.md` — mandatory 5-step protocol:
1. **PARROT** — Restate user's exact words
2. **OBSERVE** — Use browser tool or request annotated screenshot
3. **HYPOTHESIZE** — Generate 3+ hypotheses, present to user
4. **VERIFY** — State visual predictions before coding
5. **ONE CHANGE** — One change per iteration, verify before next
