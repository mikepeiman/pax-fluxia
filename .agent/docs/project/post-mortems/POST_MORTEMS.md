# Post-Mortems

## 2026-04-14: Stale Power-Voronoi Recorder Path

**What happened**: `perimeter_field` diagnostics and transition bundle export were still wired through the old Power-Voronoi / DY4 snapshot path in `GameCanvas.svelte` instead of the active perimeter-field family render path.

**Why**: Diagnostics were left attached to a legacy renderer boundary after gameplay truth had moved into the render-family architecture.

**Resolution**: Move perimeter-field capture to the real family update path and record pre-rendered PREV/NEXT/interim frames from the actual gameplay loop.

---

## 2026-04-14: Star-Center Reconstruction Instead of Real Perimeter State

**What happened**: Perimeter-field transition samples were generated from star-center radial ray hits rather than from the real PREV/NEXT perimeter-vstar state, so transition-state `0` did not equal true PREV.

**Why**: The transition builder used a simpler geometric shortcut instead of the actual active representation used by gameplay.

**Resolution**: Treat real perimeter-vstar endpoints as authoritative for diagnostics and hold the star-center reconstruction logic to strict PREV/NEXT identity requirements.

---

## 2026-04-14: False-Gradient Language on Binary Failure

**What happened**: During perimeter-field debug work, a fully failed visual result was described as if it were a partially correct one using phrases like "not strong enough" and "not dominant enough on screen." The explanation then drifted into visual-design terminology before first stating the simple truth: the previous fix had failed.

**Why**: The agent flattened a binary failure into a spectrum and explained intended patch semantics instead of verified visible behavior.

**Resolution**: Record the failure plainly as failed, not partially successful. Separate observed result, code change, intended effect, and verified effect in future renderer/debug explanations.

---

## 2026-04-13: Menu Layout Assumption Cascade

**What happened**: During main menu layout debugging, the user explicitly said the issue was a desktop menu collapsed into a narrow right column, not a mobile-width or below-the-fold problem. The agent repeatedly mapped it back to breakpoint or viewport theories, edited layout based on that rejected assumption, and then initially failed to create an actual post-mortem artifact.

**Why**: The agent let an early pattern-match survive direct user contradiction. It also violated an explicit "no layout changes until cause agreed" boundary and treated "post-mortem" as a chat explanation instead of a repository document.

**Resolution**: Create an actual post-mortem artifact and adopt stricter UI-debug rules: user contradiction invalidates the hypothesis, no edits during a diagnose-first phase, and layout debugging must verify DOM, container, placement, and runtime overrides before changing CSS.

---

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

---

## 2026-02-27: Blind Merge Conflict Resolution (Feature Destruction)

**What happened**: During `git merge feat/landing-page-redesign`, 7 files conflicted. Agent immediately ran `git checkout --ours` on 4 renderer/config files without reading the diffs, discarding the branch versions. User intervened: "Don't be so simplistic", "Comprehend each diff before selecting, and ask me", "Keep in mind your 'cleaned up master' was MISSING features."

**Why**: Agent assumed master was correct because it had just "fixed" those files. Agent treated merge conflicts as a routine cleanup task rather than a reconciliation of two diverged feature sets. The branch had months of work — 3D shaded polygon stars, ownership rings, `ORBIT_BASE_RADIUS`, simplified territory toggles, `LandingPage→GameContainer` flow — all of which would have been destroyed.

**Root cause**: Bias toward recent work. The agent had just spent time on master fixing things and assumed its own recent changes were authoritative. It failed to consider that the branch might contain the user's preferred, more complete implementation.

**Resolution**: Aborted merge, generated diffs for all 7 files, analyzed each one, presented analysis to user with recommendations. Took branch version for all conflicting files. The branch had the superior version in every case.

**Lesson**: **Never resolve merge conflicts without reading the diffs first.** Merging is a reconciliation, not a cleanup. Recent work on one branch does not make it authoritative. Always diff, always ask.

---

## 2026-02-27: Discarding User Controls During Merge (Star Ring Config)

**What happened**: On master, agent added `STAR_RING_OFFSET`, `STAR_RING_WIDTH`, `STAR_RING_ALPHA` — three user-configurable properties with UI sliders for controlling player ownership rings around stars. During merge, the branch version (a hardcoded `radius * 1.35` with zero user control) was kept and all three config properties were discarded. The post-mortem then rationalized this as "architecturally cleaner."

**Why**: Agent preferred simpler code (fewer config keys, no sliders) over user configurability. It called this preference "architecturally cleaner" — a euphemism for "less code." The agent's default heuristic is to reduce complexity. But in this project, **user-facing controls ARE the product**. Dozens of iterations have been spent specifically ADDING settings sliders. Fewer sliders is a regression, not an improvement.

**Root cause**: Systemic bias toward code simplicity over user value. When choosing between "hardcoded + fewer lines" and "configurable + sliders + config keys," the agent defaults to the former. This is the exact opposite of what this project requires.

**Resolution**: The three `STAR_RING_*` controls were incorrectly discarded and need to be restored. The correct merge resolution was: keep the branch's rendering pipeline AND keep master's three config properties. More controls for the same feature, not fewer.

**Lesson**: **NEVER remove user-facing config properties or UI controls to achieve "simpler" code.** In this project, configurability is the #1 priority. Hardcoded values are regressions. If both branches have implementations of the same feature, keep the one with MORE user controls, or merge both to get the best rendering AND the most control. "Architecturally cleaner" is not a valid reason to discard user-facing sliders.

---

## 2026-02-28: Silent Removal of UI Controls (Fill Pattern Regression)

**What happened**: While adding graph territory pattern mappings to `PANEL_CONFIG_MAP` and restoring pattern controls to the Lane Territory section, the agent failed to notice that those controls had been silently dropped from the file at some earlier point. The user had to explicitly call out the regression: "you REMOVED controls from my control panel without asking or instruction."

**Why**: The agent was making targeted edits to add/change specific controls (Alpha, max range, etc.) and was not doing a holistic audit of the section before and after changes. UI components were treated as atomic edits rather than as a complete set of controls that must remain intact.

**Root cause**: No completeness check performed. The agent never compared "what controls existed before" vs "what controls exist after." Each edit was evaluated in isolation.

**Resolution**: Restored Pattern, Pattern Scale, and Pattern Rotation controls to the Lane Territory (`{#if panel.territoryGraph}`) section. These map to `GRAPH_PATTERN`, `GRAPH_PATTERN_SCALE`, `GRAPH_PATTERN_ROTATION` which the `laneTerritory.worker.ts` fully supports.

**Lesson**: **When editing a UI section, always read the entire section from `{#if ...}` to `{/if}` before and after changes.** Verify that no existing controls were dropped. If a full section rewrite is needed, explicitly enumerate and preserve all existing controls. Never silently remove user-visible controls.

---

## 2026-04-14: Side-Effecting Perimeter-Field Diagnostic Render

**What happened**: `perimeter_field` conquest capture re-rendered diagnostic PREV/NEXT/intermediate frames through a temporary PIXI root. That helper called `renderMetaball()` inside the live render loop, even though `MetaballRenderer` owns shared module-global `Graphics` state.

**Why**: The diagnostic path treated the renderer as pure and tried to synthesize a second render instead of tapping the already-rendered gameplay frame. That duplicated work and let the recorder mutate live territory graphics.

**Resolution**: Removed the offscreen diagnostic render call from the live path. `perimeter_field` bundles are now captured passively from the actual `displayRoot` in `GameCanvas`, using the last stable PREV frame, live transition frames, and the first settled NEXT frame.

**Lesson**: If diagnostics must reflect real gameplay, capture the real gameplay output. Do not re-run a stateful renderer from the side.

