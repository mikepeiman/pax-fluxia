# Territory Review Phase 0 Update 19: Web Research

Timestamp: 2026-06-29T17:52:00-04:00

Scope: external research to support the remediation plan.

## Sources Checked

- MDN: Scheduler `postTask()` API  
  https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/postTask

- web.dev: Optimize long tasks  
  https://web.dev/articles/optimize-long-tasks

- Chrome Platform Status: Prioritized `scheduler.postTask`  
  https://chromestatus.com/feature/6031161734201344

- PixiJS v8 Performance Tips  
  https://pixijs.com/8.x/guides/concepts/performance-tips

- PixiJS Graphics API: `cacheAsTexture`  
  https://pixijs.download/dev/docs/scene.Graphics.html

## Findings Applied To This Project

### Browser Scheduling

Observation from sources:

- `scheduler.postTask()` has three priority levels: `user-blocking`, `user-visible`, and `background`.
- If no priority is set, the default is `user-visible`.
- A scheduled delay is a minimum; real execution can happen later.
- The API is not fully universal across all major browsers.

Project implication:

- The branch used `scheduler.postTask(..., { priority: "background" })` for territory presentation. That is a bad fit for visible conquest truth. A newly conquered star and its territory are user-visible game state, not cleanup or analytics.
- Background scheduling can make frame tables look better while the player sees old territory. That matches the local pending-wait measurements.

### Long Tasks And Yielding

Observation from sources:

- Long JavaScript tasks block visible response until the task finishes.
- Yielding is useful when lower-priority work can wait.
- User-visible work should run before yielding.
- Yielding too often has overhead and should be bounded.

Project implication:

- The correct shape is not "never yield." The correct shape is "do the visible truth first, then yield or defer optional transition preparation."
- Input pressure can justify deferring decorative or optional work. It should not allow ownership display to become stale for hundreds of milliseconds.

### Pixi Rendering

Observation from sources:

- Pixi Graphics objects are fastest when not constantly modified.
- Hundreds of complex Graphics objects can be slow; sprites or textures are recommended for that case.
- Caching a complex static container as a texture can improve rendering performance.

Project implication:

- Phase Edges / Ember Lattice should not rely on repeatedly rebuilding complex vector graphics in the visible frame when a stable or mostly stable texture/sprite path can represent the same current territory.
- The plan to split "show current ownership now" from "prepare fancy transition plan" is consistent with Pixi guidance: render stable territory through cached textures/sprites, then apply transition overlays only when ready.

## Resulting Plan Constraint

The product fix should obey this priority order:

1. Show current conquest ownership promptly.
2. Keep input responsive.
3. Prepare optional transition animation without blocking visible truth.
4. Use Pixi caching/sprites/textures for stable heavy visuals.
5. Treat background tasks as background only; do not put primary game-state display there.

## Research Confidence

High for the scheduler conclusion. The local measurements and external browser docs agree: background priority is not suitable for immediate visible territory truth.

Medium for Pixi optimization direction. The Pixi docs support the general approach, but the exact implementation still needs project-specific measurement.
