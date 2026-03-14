# Post-Mortem V1: GPU Border Debugging (March 6, 2026)
# STATUS: FALLACIOUS — This post-mortem itself contained an unverified hypothesis.
# See V2 for the corrected analysis.

## What Went Wrong

### The Misdiagnosis
I spent **~10 iterations debugging the wrong problem**. The user reported "borders are broken." I interpreted this as **"borders don't render"** when the actual problem was **"borders render at WRONG LOCATIONS."**

The red-line diagnostic proved this: the bright red borders ARE visible in all screenshots. They've been rendering correctly all along. The rendering pipeline, shader compilation, and texture sampling all work. The issue is that the borders appear at positions that don't match the visible territory fills.

### Root Cause: All Territory Renderers Active Simultaneously

> **THIS ROOT CAUSE WAS WRONG.** I formed another hypothesis without verifying it.
> The actual root cause is the gapNorm junction smoothing mismatch — see V2.

After the user cleared localStorage, **8 territory renderers** activated simultaneously:
- Voronoi, Metaball, Flux (Classic), Lane Territory, Contour (Round), Power Voronoi V2, **Distance Field**, Cluster Split

The GPU borders correctly outline the **Distance Field** renderer's territories. But 7 other renderers are compositing their own territory fills on top, creating a visual where:
- **Fills** = chaotic composite of 8 different territory algorithms
- **Borders** = only follow DF algorithm's boundaries
- **Result** = borders appear to be in "wrong locations" because the visible fills don't match the DF territories

### Timeline of Wasted Effort

| Iteration | What I Did | What I Should Have Done |
|-----------|-----------|----------------------|
| 1 | Replaced gapNorm with neighbor sampling | Correct — this was the original intent |
| 2 | Replaced arrays with macros | Wrong diagnosis — arrays weren't the issue |
| 3 | Replaced macros with header function | Wrong diagnosis — macros weren't the issue |
| 4 | Minimal inline diagnostic (RED) | **Correct approach** — proved sampling works |
| 5 | Added coloring, diagonals, smoothstep | Too many changes at once |
| 6 | Diagnosed "softness=0 hides borders" | Partially correct, but masked the real problem |
| 7 | Fixed smoothstep math | Wrong — location was the issue, not smoothstep |
| 8 | Reverted to binary isBorder | Unnecessary — red diagnostic already worked |
| 9 | Diagnosed "Pass 3 covering borders" | Partially correct (Pass 3 WAS drawing on top) but not the root cause |
| 10 | Restored exact red diagnostic | Proved borders always rendered — location is the issue |

### Concrete Mistakes

1. **Binary question bias**: Kept asking "do you see borders?" (yes/no) instead of "where are the borders relative to territories?"
2. **Didn't request console output early**: The `[DF] Vector borders: 16K segments` log was visible for 4+ iterations before I noticed
3. **Didn't consider environment change**: Clearing localStorage activated all renderers — fundamentally changed the visual baseline
4. **Violated simplest-test-first**: Added 3+ features (diagonals, smoothstep, coloring) in one commit before verifying the base worked
5. **Didn't verify assumptions**: Assumed "broken" = "invisible" without asking the user what specifically was wrong

### Time Wasted
- **~12 commits** on the wrong problem path
- **~75 minutes** of user time
- **~25 tool calls** that could have been avoided

## The Actual Fix Needed

> **THIS FIX WAS ALSO WRONG** — based on the wrong root cause hypothesis.

The borders ARE correct for the DF renderer. The fix is:

1. **Ensure only Distance Field is active** when testing borders (disable other renderers)
2. **OR** Accept that borders only work when DF is the exclusive territory renderer and document this
3. Verify the border positions match DF territory fills when DF is the only active renderer

## Lessons for Future

1. **Ask "what specifically looks wrong?"** before debugging
2. **Request console output and specific visual details** at first failure report
3. **One change per commit**, verify each before the next
4. **Consider environment changes** (localStorage clear, renderer state) as a hypothesis
5. **Don't pattern-match on past bugs** — investigate the current symptoms

---

## Meta-Analysis: Why This Post-Mortem Was Also Wrong

This V1 post-mortem committed the SAME error it was analyzing: forming a hypothesis ("multiple renderers active") without verifying it against the user's observation. The user had to correct me AGAIN, pointing out that I was STILL making erroneous assumptions as my core operating thesis.

The correction (V2) was prompted by actually reading the shader code and understanding the relationship between `gapNorm` (which controls fill alpha) and ownership boundaries (which determine border positions). The fills fade out via junction smoothing long before reaching the mathematical Voronoi boundaries where the borders detect ownership changes.
