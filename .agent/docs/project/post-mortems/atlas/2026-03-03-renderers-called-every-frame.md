# Post-Mortem: 2026-03-03 — All Territory Renderers Called Every Frame

## What Happened
- **Expected:** Territory renderers fire once per tick (when ownership changes), idle otherwise.
- **Actual:** All 6 territory renderers were called at 60fps from `renderFrame()`. Inactive renderers checked a boolean and returned. The active renderer built a fingerprint string (~100 chars of string concatenation) every frame to compare against cache.
- **Discovery:** User checked browser console while in Pixel Classic mode and saw `console.warn` logs growing continuously at 60fps. Asked "why are they called every frame?" — agent initially rationalized it as "by design" before user challenged: *"Justify."*

## Root Cause
- [x] Incorrect mental model
- [x] Skipped verification step
- [ ] Other: Cargo-cult architecture — each renderer was added by copying the previous one's pattern without questioning whether the calling convention was correct.

### Deep Analysis

**The fundamental failure is not the code — it's the reasoning process that produced it.**

When I first added VoronoiRenderer to `GameCanvas.svelte`, I placed the call inside `renderFrame()` — the only rendering hook available. I then added a fingerprint guard inside the renderer to skip expensive work. This was a **reasonable first implementation** for a single renderer.

The failure was **cumulative and structural**: every subsequent renderer (Metaball, Pixel, Lane, Contour, Modified Voronoi) was added by copying the same pattern without ever re-evaluating whether the architectural foundation was sound. By the 6th renderer, we had 6 function calls × 60 fps = 360 unnecessary function invocations per second, each performing:
1. A function call into the renderer module
2. A `GAME_CONFIG` boolean check
3. A return

**Why didn't I catch this?** Because:
1. **No performance review checkpoint exists** — there's no rule that says "when adding a new renderer to a render loop, verify call frequency is appropriate."
2. **Each renderer worked in isolation** — the fingerprint guard masked the problem because the expensive work was correctly skipped. The overhead was invisible unless you looked at call frequency.
3. **I treated the render loop as a black box** — I asked "where do other renderers get called?" and copied the pattern, instead of asking "is this pattern architecturally correct for N renderers?"

## Impact
- **Performance waste:** 360 unnecessary function calls/sec, each with config reads and potentially string fingerprint construction on the active renderer.
- **Log spam:** Debug `console.warn` in PixelTerritoryRenderer ran at 60fps, flooding the console and obscuring real issues.
- **User trust:** User had to discover and report a problem that the agent should have identified proactively.

## What I Should Have Known Beforehand
1. **Render loops should call only what's needed that frame.** This is game dev 101. A render loop is the hottest path — every unnecessary call multiplied by 60fps compounds.
2. **Mutual-exclusion patterns demand call-site guards, not callee guards.** If only one renderer is active at a time, the call site should select which to call, not broadcast to all and let each self-filter.
3. **Adding a new system to a hot loop requires architectural review.** The question isn't "does it work?" but "does it belong here, at this frequency?"

## Corrective Actions

### Rule: New Renderer Architecture Checklist
When adding any new renderer or system to a game loop:
- [ ] **Frequency audit:** Is this called per-frame, per-tick, or on-demand? Is that the correct frequency for this system?
- [ ] **Guard placement:** Is the guard at the call site (correct) or inside the callee (wasteful)?
- [ ] **Existing pattern review:** If copying an existing pattern, question whether the pattern is correct, not just whether it "works."
- [ ] **Hot path audit:** Count function calls × frequency. Is the total acceptable?

### Proposed Memory Rule (for `.agent/rules/`)
```markdown
# Render Loop Architecture Rule

## RULE: Never broadcast to all systems from a render loop.

The render loop (`renderFrame`) runs at 60fps. Every call inside it must justify its frequency:
- **Per-frame:** Camera, interpolation, animations, particles
- **Per-tick:** Territory, ownership overlays, static structure
- **On-demand:** Theme changes, config updates

### Anti-Pattern: Callee Self-Filtering
```typescript
// BAD — calling 6 renderers × 60fps, each checking a boolean
renderVoronoi(stars, ...);     // checks TERRITORY_VORONOI internally
renderMetaball(stars, ...);    // checks TERRITORY_METABALL internally
renderPixel(stars, ...);       // checks TERRITORY_PIXEL internally
```

### Correct Pattern: Caller Dispatches
```typescript
// GOOD — only the active renderer is called
if (GAME_CONFIG.TERRITORY_VORONOI) renderVoronoi(stars, ...);
if (GAME_CONFIG.TERRITORY_PIXEL)   renderPixel(stars, ...);
```

### Even Better: Event-Driven Territory Updates
Territory only changes on tick events (ownership changes). The ideal architecture would:
1. Subscribe to tick/ownership change events
2. Recompute territory only when notified
3. Keep cached PIXI objects visible between updates
```

## Prevention Checklist for Future Work
- [ ] When adding a system call to `renderFrame()`, ask: "Should this run every frame or only on specific events?"
- [ ] When copying an existing call pattern, ask: "Is this pattern correct, or is it just what the previous author did?"
- [ ] When a system has mutual exclusivity (only one active at a time), enforce dispatch at the call site
- [ ] Remove all `console.warn`/`console.log` debug statements before declaring work complete

## Heuristic
> "Never broadcast to a hot loop. Dispatch to the active system only. When copying a pattern, question the pattern — don't just copy the cargo."

## Meta-Analysis: What Prompt/Rule Structure Would Have Prevented This?

The specific failure mode is **pattern cargo-culting in hot paths**. An agent sees an existing pattern (renderer called from renderFrame), assumes it's correct because it exists, and replicates it. No existing rule challenges this assumption.

### Required Rule Structure:
1. **Hot-path review trigger:** Any time the agent modifies a function that runs per-frame (`renderFrame`, `animate`, `update`, tick loops), it must perform a frequency audit of all calls within that function.
2. **Pattern justification requirement:** When replicating an existing code pattern, the agent must state WHY the pattern is correct, not just that it matches existing code. "Other renderers do it this way" is not a justification — it's cargo culting.
3. **Architectural smell detection:** If a function contains N > 3 calls to similar systems where only one can be active at a time, flag this as an architectural smell and propose dispatch-based calling.

### Exact Prompt Addition:
```
When adding code to a render loop, animation loop, or any function called at 60fps+:
1. State the required update frequency for the new code (per-frame / per-tick / on-demand)
2. Justify why it belongs in THIS loop at THIS frequency
3. If it doesn't need per-frame updates, propose event-driven or tick-gated alternatives
4. Count total calls in the loop × frequency — reject if overhead is unjustified
```
