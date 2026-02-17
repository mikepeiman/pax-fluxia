# Post-Mortems

## 2026-02-08: Multi-Star Combat Regression

**What happened**: During animation system refactoring, `resolveMultiSourceCombat` was rewritten to group attackers by target star only, NOT by `ownerId`. This violated MECHANICS.md §3.3: `forces (Map of PlayerId → count)`.

**Why**: Agent did not re-read specs before refactoring combat-adjacent code. Treated the change as "just animation" when it touched combat resolution pathways.

**Resolution**: Rewrite to group by `ownerId`, sum per-player ship count, victor = player with largest total force.

---

## 2026-02-08: Ship "Spawning" Instead of Transfer Animation

**What happened**: Conquered ships appeared ("bloomed") from star center as if produced there, instead of being animated arriving from the conquering star.

**Why**: Shortcut — spawning is simpler than animating transfers. Misinterpretation of spec's "teleport" as visual instant-spawn rather than game-logic-instant + visual-animated-arrival.

**Resolution**: Ships always travel visually. "Transfer" = animated movement. Engine instant ≠ visual instant.

---

## 2026-02-08: Diff-Based Animation Detection

**What happened**: `detectTransfers` used ship count diffs between frames to decide what to animate. This conflated attacks (remote, no travel), reinforcements (physical travel), and conquest (ownership transfer with ship arrival).

**Why**: Reactive observation pattern chosen instead of imperative event-driven pattern. The engine already knows the action type — the agent chose to re-derive it from numerical changes.

**Resolution**: Engine emits typed events (`reinforce`, `conquest`, `scatter`, `retreat`). Animation system consumes events directly.

---

## 2026-02-08: Transfer Rate Floor/Ceil

**What happened**: Transfer formula used `Math.floor(ships × rate)`, user observed ships "stuck" at 8/18/26.

**Analysis**: `floor` alone was NOT the root cause — `MIN_SHIPS_PER_TRANSFER=1` prevents zero transfer. The real cause is **production/transfer equilibrium**: production adds ships before transfer removes them, creating a steady-state. Changing to `ceil` shifts the equilibrium lower but doesn't eliminate it.

**Resolution**: User changed `floor` → `ceil`. The equilibrium interaction between production rate and transfer rate is a game design consideration, not a code bug.

---

## 2026-02-11: Graphics.circle() Performance Wall

**What happened**: At 10k ships, FPS dropped below 10. Each ship was rendered via `shipGraphics.circle(x, y, size)` + `.fill()` every frame, totaling 10k+ geometry tessellations per frame.

**Why**: `PIXI.Graphics` rebuilds and tessellates all circle geometry from scratch every frame. This is a CPU-bound operation — the GPU was idle while JavaScript converted circles to triangle meshes. This approach works for hundreds of objects but collapses at thousands.

**Resolution**: Decision made to switch to `ParticleContainer` with pre-rendered sprite textures. Sprite batching submits all ships as a single GPU draw call, moving the bottleneck from CPU tessellation to GPU fill rate (which can handle 100k+ sprites).

---

## 2026-02-11: Sprite Pool Visual Quality Regression

**What happened**: First attempt at sprite-based ship rendering (replacing Graphics.circle) produced visibly softer, blurrier ships. User immediately noticed degradation.

**Why**: Initial texture was 16px, then 64px. The scaled-down bitmap lost the mathematical precision of vector `Graphics.circle()` calls. Missing `scaleMode = 'linear'` filtering and insufficient texture resolution for the display's device pixel ratio.

**Lesson**: When replacing vector with raster, texture must be at least 128px with proper anti-aliasing, radial gradient edges, and correct PIXI texture filtering settings. Test at native resolution before shipping.

**Resolution**: Reverted to Graphics.circle temporarily. Now implementing ParticleContainer with 128px high-quality textures and proper filtering.
