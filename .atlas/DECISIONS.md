# Architecture Decisions

## 2026-02-17

### D-10: Join Confirmation Modal z-index
- **Issue**: B-74 — confirm overlay had `z-index: 200`, behind `menu-fullscreen` at `z-index: 9999`
- **Decision**: Bumped to `z-index: 10000`
- **Rationale**: Modal must render above the menu that spawns it

### D-11: Player Color Enforcement Strategy
- **Decision**: Min 30° hue gap enforced in two places:
  1. **SP/client**: `enforceHueSpacing()` in `MainMenu.svelte` before `applyConfig()`
  2. **MP/server**: `hexToHue` + shift logic in `GameRoom.onJoin()` lobby path
- **Gap**: Takeover path (L203-255) was missed → B-77

### D-12: Streaming Departure Mode
- **Decision**: `DEPART_STAGGER` boolean — when true, ships depart at evenly-spaced intervals (`effectiveTickMs / shipsToMove * shipIndex`) instead of random jitter
- **Rationale**: Creates steady stream visual rather than chaotic burst

### D-13: Per-Phase Arc Intensity (Partial)
- **Decision**: Added `DEPART_ARC_INTENSITY` and `ARRIVAL_ARC_INTENSITY` to config, PhaseContext, and UI
- **Gap**: Values exist but behaviors.ts doesn't read them yet → B-78

### D-14: Spectator-First Takeover (Planned)
- **Decision**: R-124 — players joining in-progress games should enter as spectators first, observe the game, then click a player to take over

### D-15: Per-Player VFX Themes (Planned)
- **Decision**: F-48 — every player MUST be able to have their own VFX/animation theme settings (UX/GX) without affecting other players in multiplayer
- **Rationale**: VFX settings are currently global via `GAME_CONFIG` + localStorage. In MP, each client already has its own local `GAME_CONFIG`, so settings are inherently per-client. Need to verify this holds true and no VFX settings leak through the server state
- **Rationale**: Current takeover dialog shows stale/wrong metadata. Spectator mode provides accurate live-state information before committing to a player

### D-16: Settle Animation — NO Tiny Dots
- **Decision**: Ships arriving into orbit MUST appear at full orbit scale (`0.8`) and full alpha (`1.0`) immediately. **Never** start at small scale/low alpha and bloom up.
- **Rationale**: The "tiny dots that bloom" effect (scale 0.3→0.8, alpha 0.5→1.0) was universally disliked. Reverted twice (2026-02-17). This is a hard constraint.
- **Code**: `ShipRenderer.ts` settle block — `ship.scale = 0.8; ship.alpha = 1.0;` (both during and after settle)

### D-17: All Animation Timing Uses FXClock Game Time
- **Decision**: Zero `performance.now()` in renderers or FX handlers. All timestamps use `state.gameNowMs` (renderers) or `ctx.gameTime` (handlers), both sourced from `FXClock`.
- **Rationale**: Wall-clock timing caused 3 bug classes: animations ignoring pause, persisting across game restart, and ignoring speed settings. FXClock (already in `clock.ts`) is pause-aware, speed-scaled, and resets on new game.
- **Code**: `FXClock.tick()` called per-frame from `GameCanvas.svelte`; `gameNowMs` field on both `ShipRenderState` and `StarRenderState`

### D-18: No Opaque Animation Timing — Everything Must Be Tunable
- **Decision**: Every animation delay, stagger, and duration MUST be exposed as a `GAME_CONFIG` slider or at minimum documented with its formula. No hidden timing math that the user can't inspect or tune.
- **Lesson**: `ARRIVAL_SPREAD` stagger formula used `destShips.length / (destShips.length+1) * staggerWindow`, silently creating 2000ms+ delays at stars with 100+ ships. The fix was trivial (use batch index instead), but the bug persisted across dozens of iterations because the formula was opaque. **If `settleStartTime` had been exposed with a slider or set to 0 on conquest, the user could have diagnosed this in seconds.**
- **Anti-pattern**: Never write an integral animation function that is opaque, unexposed, and unspecified. When the user insists on tunability, that means ALL timing parameters, not just the ones that seem important.

### D-20: Opposing Orders — Client-Only Game Rule
- **Decision**: `ALLOW_OPPOSING_ORDERS` is a client-only boolean (not syncd to server). When `false` (default), issuing A→B cancels any existing B→A order. When `true`, both coexist.
- **Rationale**: Order management is handled entirely in `GameCanvas.addPendingOrder()` (client-side `pendingOrders` Set). No server logic needed — the server just processes whatever orders arrive. Exposed in both pre-game MainMenu and in-game GameSettingsPanel "Rules" section.

### D-19: Engulf Ring — Perfect Circle Distribution
- **Decision**: Arriving conquest ships distribute their `settleStartAngle` evenly around 2π using batch index, not clustered at arrival direction.
- **Rationale**: All ships from the same source star arrive at the same angle, creating a gap. Even distribution creates a perfect engulf ring.

## 2026-02-18

### D-21: Orders Immediate, Attacks Tick-Gated
- **Decision**: Orders (player drag A→B) take effect immediately on the client. Attack surge animation waits for the next tick boundary to begin rendering.
- **Mechanism**: `starsInCombat` set is populated from `CombatEvent` at tick boundary. Surge only renders when `starsInCombat.has(star.id)` — i.e., when the tick has confirmed this star is in combat.

### D-23: Orb Modes Are Full Visual Packages
- **Decision**: An orb mode controls the ENTIRE travel visual — both the orb draw style AND whether individual ships are visible during travel. "Orb Mode 1" specifically preserves the ships+orbs combo (individual ships visible alongside orb power effects at destination). When B-90 is fixed (proper one-orb-per-transfer), Mode 1 must re-enable the dual-render behavior.
- **Key**: Selecting an orb mode is a single UI choice that configures multiple rendering behaviors, not just the orb shape.

## 2026-02-24

### D-24: Visual Layer Semantic Naming — Star Power vs Territory
- **Decision**: Rename `TerritoryRenderer` → `StarPowerRenderer`, `SHOW_TERRITORY` → `SHOW_STAR_POWER`. Per-star radial halos represent fleet strength/power, not ownership geometry.
- **Rationale**: "Territory" describes ownership boundaries (Voronoi cells, metaball fields). Per-star halos that scale with ship count are "star power" — a visual indicator of strength radiating from individual stars. Naming must describe what the visual *represents*, not the rendering technique.
- **Rule**: Added to `.agent/memory/semantic-naming.md` (Visual Layer Naming section)

## 2026-03-01

### D-25: Consumption-Layer Transpose for Map Orientation
- **Decision**: Star coordinate transposition (x↔y for portrait/landscape) must happen at the point of consumption (rendering, territory worker, world-bounds), NOT in the data layer (toGameState). A shared `mapTranspose` flag provides `x(star)`/`y(star)` utilities.
- **Rationale**: `toGameState()` only runs at tick time. Mutating star objects or swapping in toGameState creates stale-coordinate windows between ticks where rendering, territory, and view scaling use non-transposed values.

### D-26: Topbar Renamed to "StatusBar"
- **Decision**: The top UI bar is now called "StatusBar" (or "statusbar"). It displays game info only — no controls live here.

### D-27: StatusBar Design — CSS Grid + Minified Leaderboard
- **Decision**: StatusBar uses CSS Grid layout containing a minified leaderboard display and player-color swatch.

### D-28: Star Cycling Navigation Widget
- **Decision**: A `< [⊕] >` widget cycles through the player's owned stars. `<` and `>` cycle prev/next. `[⊕]` recenters full-map view. Zoom level for star focus is user-controllable (slider). This widget is a standalone component.

### D-29: Player-Color Swatch in StatusBar
- **Decision**: Two-part swatch — outer shape uses player's territory color+pattern, inner inset shape uses player's primary color fill.

### D-30: Settings + Hamburger Combined in Speed Widget
- **Decision**: Gear icon (settings) and hamburger icon merge into a single small widget within the game speed control area, freeing the statusbar for info display only.

### D-31: Mobile Layout uses CSS Grid
- **Decision**: Mobile game layouts refactor from current approach to CSS Grid for proper spacing, UI avoidance, and responsive behavior.

## 2026-03-02

### D-32: Map Transpose Must Match Physical Device Rotation (F-107)
- **Decision**: When the device rotates counter-clockwise (portrait → landscape), the map must rotate to match. A star at top-right in portrait should appear at top-left in landscape. Implemented via 90° CCW rotation transform: `displayX = star.y`, `displayY = mapWidth - star.x`.
- **Rationale**: The player's spatial memory of star positions must be preserved across orientation changes. A simple x↔y swap without axis flip keeps stars in the same quadrant, which feels like a layout shift rather than a rotation.
- **Critical**: The axis flip must use `GAME_WIDTH` (pre-transpose narrow dimension, ~900), NOT `GAME_HEIGHT` (~1600). Using the wrong dimension caused a 700px vertical offset regression (2026-03-02).

### PM-01: Incomplete Debug Cleanup (Post-Mortem, 2026-03-02)
- **Error**: Told to "remove the two rectangular boxes and any other code artifacts" for map fit debugging. Removed PIXI `drawDebugWorldBounds()` calls but missed a CSS `border: 3px solid red` debug style on `GameContainer.svelte:L672`.
- **Root cause**: Agent searched codebase for debug patterns instead of first consulting the log of what it actually did in prior steps. The red border was added by the agent itself in a previous step; reviewing that step would have immediately revealed it.
- **Prevention**: When user refers to "things you did" or "code you added," the agent's **first step** must be to go back and read the log/diff of what was actually changed, not guess and search the codebase. The work history is the source of truth for what was introduced.

### PM-02: Wrong Settings Section (Post-Mortem, 2026-03-02)
- **Error**: User specified "Section: Map & Game" for the Label Anim Mode toggle. Agent placed it in Timing section instead.
- **Root cause**: Agent noticed `NUMBER_TRANSITION_MS` was already in Timing and assumed logical grouping overrode the user's explicit instruction. This violates §2.3: "User words are specifications."
- **Prevention**: When user specifies a section/location, treat it as a hard constraint. Never substitute own judgment for an explicit placement instruction.

### D-33: Chaikin Smoothing Defaults to OFF (0)
- **Decision**: Chaikin smoothing slider defaults to 0 (completely off). Must be applied AFTER junction correction (F-135), never before.
- **Rationale**: Smoothing erases junction geometry and creates corner gaps. User should opt in to smoothing only after junctions are correct.

### D-34: Voronoi Over Marching Squares for Territory Rendering
- **Decision**: Abandon marching squares / contour-based renderer (F-104, F-135) in favor of **Voronoi merged territories (F-138)** using d3-delaunay.
- **Rationale**: Marching squares geometry is fundamentally too noisy — edge midpoints are pairwise (between 2 owners), no shared 3-way junction vertex exists, and every junction fix exposed a deeper geometric issue. After 3 algorithm iterations, visual quality was still unacceptable.
- **New approach**: d3-delaunay gives clean convex cells with natural ~120° junction angles. Merge same-owner adjacent cells (remove shared edges, chain boundary), apply minimum star margin (F-139), Bézier arc junctions, Chaikin smoothing.
- **Boilerplate**: `MergedVoronoiRenderer.ts` created as duplicate of `VoronoiRenderer.ts` with TODO markers.

## 2026-03-03

### D-35: Voronoi Tiling Property — Gap Root Cause (F-138)
- **Decision**: The d3-delaunay Voronoi tiles the plane perfectly (zero gaps). All gaps in the rendered output are caused by pipeline stages modifying shared boundary vertices independently per polygon. This is the SINGLE root cause of gap artifacts.
- **Mechanism**: When same-owner cells merge, boundary edges shared between different-owner polygons exist as duplicate vertex copies. Stages (arc smoothing, star margin) modify each copy independently → vertices diverge → slivers appear.
- **Fix approach**: Shared-vertex reconciliation — catalog shared vertices pre-modification, reconcile post-modification.

### D-36: Single-Layer Rendering Mandate (F-138)
- **Decision**: Territory rendering MUST produce a single set of modified polygons. No base layer + overlay, no bleed/overlap, no dual rendering.
- **Rationale**: User directive. Stacking layers is a hack that hides gaps rather than solving them.

### D-37: Corridor Virtual Sites (F-138)
- **Decision**: Inject virtual Voronoi sites along same-owner lanes to create connected territory corridors. Virtual sites inherit source star cluster index. Parameterized by `CORRIDOR_SPACING` (20-200px).
- **Known issue**: Spacing < ~45px can destabilize merge step.

### D-38: Disconnect Buffer — Enemy Territory Wedge (F-138)
- **Decision**: Same-owner stars NOT connected by a lane must have enemy territory visually separating them. Algorithm: split connection vector into thirds, enemy territory fills center 1/3rd, meeting at the connection line.
- **Status**: Concept approved by user, implementation needs redesign (current vertex-pushing approach is imprecise).

### PM-03: False "Unowned Stars" Diagnosis (Post-Mortem, 2026-03-03)
- **Error**: Agent claimed gaps were caused by "unowned stars creating Voronoi cells nobody renders." All stars are currently owned. Agent made this claim **twice** after being corrected.
- **Root cause**: Agent substituted speculation for investigation. Instead of examining the actual pipeline code to identify where shared vertices diverge, fabricated a theory that fit the symptom.
- **Prevention**: Before proposing a root cause for any rendering bug, verify the claim against actual data (star ownership status, vertex coordinates before/after each stage). Never repeat a diagnosis the user has already corrected.


- 2026-03-07: Territory borders in production now use GPU ownership-field two-pass rendering as canonical path; CPU vector overlay remains debug-only due non-zero divergence risk from simplify/straighten operations.

- 2026-03-07: DF border width semantics changed to center-stroke (half-width per side) in both single-pass and canonical two-pass shaders; two-pass now subtracts half-texel boundary-center bias so the stroke centers on the ownership interface instead of sitting fully inside one territory.

### D-39: Territory Architecture v3 — Final Hybrid (2026-03-07)
- **Decision**: Adopt a three-source hybrid architecture for territory rendering:
  1. **Solver**: Graph-native multi-source top-2 Dijkstra (replaces per-player `computeDistToPlayer`). Disconnects solved by construction — no virtual sites or Union-Find needed.
  2. **Fills**: Low-res ownership RT (512–2048²) computed only on topology delta, sampled via fill shader with ping-pong RT morph.
  3. **Borders**: Geometry pipeline — centerline graph from analytical lane borders + field-derived interstitial borders → family fitters (straight/curved/segmented) → stroke mesh with round joins/caps.
- **Rationale**: Synthesizes insights from three independent analyses. Graph-metric Dijkstra handles disconnects intrinsically. Ownership RT provides full-field fill coverage. Geometry borders give resolution-independent even-width strokes. Distance-lerp morph produces physically accurate border drift.
- **Full spec**: `.agent/WIP Work-In-Progress/proposals/TERRITORY_ARCHITECTURE_v3.md`

## 2026-03-10

### D-40: Frontier Normalization — Region-Sequential Smoothing (F-138v2)
- **Decision**: Territory polygons must be built from stars (contiguous groups by ownership, constrained by graph relationships). The entire map is first computed as angular Voronoi with all adjustments (CX corridors, DX disconnect zones, MSR minimum star radius). Then Chaikin + arc smoothing is applied **region by region** in a deterministic order (topmost-leftmost first), including rectangular world-bound corners. Each subsequent abutting region **normalizes its shared frontier** to use the exact same coordinates as the already-processed neighbor.
- **Rationale**: Current system applies Chaikin smoothing independently per owner-pair polyline. When these are chained at junctions, endpoints don't match because smoothing displaced them independently → junction gaps, degenerate chains, failed loops. Building sequentially with shared-edge normalization eliminates this class of bugs entirely.
- **Key terms**:
  - **Frontier normalization**: Ensuring that where two regions share a border, both sides reference identical vertex coordinates
  - **Region-sequential smoothing**: Process regions in deterministic order; later regions adopt the already-smoothed edge from earlier neighbors
- **Status**: Planned. Requires rewrite of `assembleFrontierLoops` pipeline. Current polyline-chaining approach is a scaffold.

## [2026-03-10] PVV3 Territory Smoothing Architecture
- World bounding box required: all outer frontiers must connect to map-edge rectangle
- Smoothing must happen on shared boundaries, NOT independently per territory polygon
- Independent per-territory Chaikin causes visible gaps at shared edges
- Fill crossfade (alpha-fade transition) intentionally cut for focus, NOT rejected � trivial to restore

## 2026-03-12

### D-41: Territory Engine Must Be Mode-Modular (Static/Dynamic/Hybrid)
- **Decision**: Territory rendering is routed through a single modular engine that selects `static`, `dynamic`, or `hybrid` mode at runtime using config keys.
- **Rationale**: User requires side-by-side evaluation of method families without rewiring renderer entry points.

### D-42: Preserve FG/DY/HY Method IDs as Stable Contracts
- **Decision**: Lock method identity contracts as `FG1..FG5`, `DY1..DY5`, `HY1..HY5` and keep them registry-driven.
- **Rationale**: Enables interchangeable implementation and benchmark reporting while preventing ad-hoc method drift.

### D-43: Step Debugging Is a First-Class Runtime Path
- **Decision**: Territory pipeline supports interactive stepping via `TERRITORY_ENGINE_STEP_MODE` and `TERRITORY_ENGINE_STEP_ADVANCE_TOKEN`.
- **Rationale**: User requires pause-and-inspect computation visibility beyond final visuals.

### D-44: Bootstrap Legacy Adapters Are Allowed During Architecture Phase
- **Decision**: Until native FG/DY/HY implementations are complete, render stage may use legacy adapters (PVV2/PVV3/DF) behind the modular engine.
- **Rationale**: Preserves momentum: architecture and diagnostics land first, native geometry methods follow in dedicated epic branches.

### D-45: FG2 Seed Placement Uses Lane Tie Solve (Bootstrap Bias Model)
- **Decision**: FG2 no longer seeds contested lanes at fixed midpoint. It solves a lane tie parameter from two linearized influence distances and clamps to a safe interval.
- **Rationale**: Midpoint seeding cannot represent force asymmetry and produces visually rigid frontiers. Tie solving is the first step toward MSR/CX/DX-aware frontier genesis.

### D-46: FG2 Geometry Uses Pair-Topology Graphs Instead of Nearest-Neighbor Ordering
- **Decision**: FG2 geometry now assembles frontier lines from owner-pair topology graphs derived from star incidence and angular local links, then extracts edge-disjoint chains/cycles for rendering.
- **Rationale**: Nearest-neighbor ordering is not topology-aware and produces unstable chain construction. Pair-topology graphs are still heuristic, but they preserve graph-local structure and create a deterministic stepping surface for the next half-edge/junction phase.

### D-47: Native Territory Stages Register Through a Shared Dispatch Layer
- **Decision**: Native territory methods now plug into a shared dispatcher in `territory-engine/methods/index.ts`, and the engine calls that dispatcher before generic fallback logic.
- **Rationale**: The engine must remain stable while FG/DY/HY native methods multiply. Centralized native dispatch removes method-specific imports from the engine and makes branch-by-branch method rollout modular.

### D-48: FG2 Pair Graphs Use Explicit Node and Link Types
- **Decision**: FG2 owner-pair topology graphs now model typed nodes (`seed`, `junction`, `boundary`) and typed links (`star_arc`, `boundary_extension`) instead of seed-only adjacency.
- **Rationale**: Half-edge/world-closure work needs a graph that can represent frontier turns around stars and explicit terminations at map edges. Seed-only links cannot support later face walking or fill reconstruction.

### D-49: FG2 Open Frontier Ends Project to the World Rectangle
- **Decision**: When a contested seed has no second continuation on a star side, FG2 extends that side by ray projection to the world rectangle and creates a boundary anchor node.
- **Rationale**: Frontier chains must terminate on canonical map edges rather than arbitrary local cutoffs. This is the first step toward world-corner stitching and closed region recovery.
