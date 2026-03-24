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
- **Status**: Planned. Requires rewrite of `assembleFrontierLoops` pipeline.

## [2026-03-10] PVV3 Territory Smoothing Architecture
- World bounding box required: all outer frontiers must connect to map-edge rectangle
- Smoothing must happen on shared boundaries, NOT independently per territory polygon
- Independent per-territory Chaikin causes visible gaps at shared edges
- Fill crossfade (alpha-fade transition) intentionally cut for focus, NOT rejected — trivial to restore

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

## 2026-03-13

### D-50: Architecture-Level Debugging Heuristic
- **Rule**: If fixing the same class of bug requires patching 3+ different functions in the same pipeline, the architecture is wrong — not the code. Stop debugging and redesign the data flow.
- **Anti-pattern name**: "Compensating for wrong architecture with correct debugging"
- **Extracted from**: 200+ hours of territory rendering work across 8-10 approaches. Each mode independently derived frontier geometry and each had gaps/misalignment. The fix was never better matching/substitution — it was always ensuring a single canonical geometry source.
- **Heuristic**: When two consumers need the same data, that data must be computed once and shared by reference — never independently derived and reconciled.

### D-51: FG2 Is Part of PVV3, Not Separate
- **Decision**: FG2 (frontier graph method 2) is PVV3's internal frontier-construction pipeline. It is NOT a separate system. Agents must not treat these as independent components in tension.
- **Rationale**: The naming "FG2 vs PVV3" created a false dichotomy that led to thinking about them as competing systems rather than producer (FG2 constructs geometry) and consumer (PVV3 renders it) within one unified renderer.

### D-52: FG2 Boundary Anchors Stitch Along the World Perimeter
- **Decision**: FG2 now orders owner-pair boundary anchors along the world rectangle, pairs them into perimeter paths, and connects them through explicit corner nodes plus `boundary_perimeter` links.
- **Rationale**: Half-edge face walking and eventual canonical fills need frontier continuity on the actual map boundary, not isolated edge anchors that die at the rectangle.

### D-53: FG2 Loop Stage Must Explicitly Mark Exterior vs Canonical Face Candidates
- **Decision**: FG2 half-edge loop artifacts now classify closed left-face walks into one deterministic exterior-face candidate and the remaining canonical-face candidates per owner pair.
- **Rationale**: Canonical fill reconstruction cannot start from raw closed walks alone. The pipeline needs an explicit diagnostic partition between the rectangle exterior and plausible interior frontier faces before ownership reconstruction can be made reliable.

### D-54: FG2 Canonical Loops Must Be Owner-Attributed Before Fill Reconstruction
- **Decision**: FG2 now converts canonical owner-pair face walks into owner-attributed `ownerRegionLoops` using link-level `viaOwner` provenance from `star_arc` and `boundary_extension` edges. Tied attributions remain diagnostic-only and are not promoted.
- **Rationale**: Pairwise frontier faces are not yet usable as territory candidates. Fill reconstruction and meaningful trace visuals require player-colored region pieces, but that ownership signal should remain modular and derived from link provenance rather than hard-coded into geometry extraction.

### D-55: Territory Trace Runs Must Be Published to UI-Readable State
- **Decision**: The last territory-engine trace run is published through a live store and exposed in the territory controls UI, including full artifact snapshots.
- **Rationale**: Step-debugging only matters if the user can inspect staged data without relying on console spelunking.

### D-56: FG2 Star-Side Junctions Must Use Global Angular Incidence
- **Decision**: FG2 now synthesizes star-side junctions from the globally ordered contested seeds around each star, then lets owner-pair graphs reuse those shared junction nodes.
- **Rationale**: Pair-local junction synthesis creates fake local closures and prevents different owner-pairs from meeting at the same real frontier junction.

### D-57: FG2 Owner Region Candidates Prefer Global Face Resolution Over Pair-Local Loops
- **Decision**: When available, `ownerRegionLoops` are now sourced from a global face walk over the merged FG2 topology graph; pair-local owner loops remain fallback diagnostics.
- **Rationale**: Pairwise canonical loops are useful scaffolding, but they cannot serve as the final ground truth once frontier continuity begins to span multiple owner-pairs at shared junctions.

### D-58: FG2 Fill Geometry Must Be Synthesized From Owner-Exposed Edges of the Global Arrangement
- **Decision**: FG2 now derives `ownerShells` by projecting the globally resolved face ownership onto the merged half-edge arrangement and keeping only owner-exposed links; shell loops are then classified by containment into shells vs holes.
- **Rationale**: Raw owner-region face candidates are not yet owner-level fill geometry. The owner shell graph removes same-owner internal shared edges and produces a materially better canonical fill artifact for later morphing and border/fill coincidence.

### D-59: FG2 Dynamic Playback Starts From Owner-Shell Correspondence
- **Decision**: FG2 shell transitions now match previous/current owner shells using centroid, area, perimeter, hole-count, and world-boundary heuristics, then build explicit contour correspondences. Spawn and vanish events use centroid-collapsed contour fallbacks.
- **Rationale**: Dynamic territory playback needs a modular geometry bridge between discrete owner-shell states before full frontier-native morphing is ready.

### D-60: Displayed Borders Must Follow Animated Geometry During Territory Morphs
- **Decision**: While FG2 shell playback is active, render-stage border presentation switches from static target `frontiers` to animated shell contours.
- **Rationale**: Showing target frontier strokes before the displayed fill arrives recreates the exact border/fill desynchronization this program is meant to eliminate. The displayed border source must stay temporally aligned with the displayed fill geometry.

### D-61: FG2 Static Borders Must Reuse Owner-Shell Geometry When Available
- **Decision**: FG2 render-stage border presentation now uses owner-shell contours whenever owner-shell geometry exists, regardless of whether shell playback is currently active. Pair-frontier polylines are fallback-only.
- **Rationale**: Border/fill coincidence is required in settled states too, not only during active transitions. If static fills come from owner shells while borders fall back to pair frontiers, the engine reintroduces the exact adjacency mismatch it is supposed to eliminate.

### D-62: FG2 Static Owner-Shell Fills Must Subtract Classified Hole Loops
- **Decision**: Static FG2 owner-shell fills now cut their classified `holeLoopIds` out of the filled shell path during render.
- **Rationale**: Hole classification is not meaningful if enclaves are still painted over. Fill-ready shell geometry must preserve empty interior regions as actual negative space.

### D-63: FG2 Shell Playback Must Carry Hole Geometry, Not Only Hole Counts
- **Decision**: FG2 owner-shell frame snapshots, transition artifacts, and displayed interpolated shells now carry explicit hole-loop geometry in addition to aggregate hole counts.
- **Rationale**: Hole-only topology changes must be able to trigger playback and preserve visible cutouts during morphs. Hole counts alone are insufficient for either change detection or renderable animated cutouts.

### D-64: FG2 Shell and Hole Playback Must Use Global Non-Conflicting Correspondence
- **Decision**: FG2 shell transitions now select shell matches globally per owner from all previous/current candidates, and hole transitions now select hole matches globally within each shell transition. Candidate selection is one-to-one and score-ordered rather than greedy by current item iteration.
- **Rationale**: Greedy local matching reuses previous shapes incorrectly, causes shell identity flicker, and pairs the wrong enclaves during split, merge, or strong topology-shift frames.

### D-65: Animated Hole Geometry Must Be Sanitized Against the Displayed Shell
- **Decision**: Interpolated hole loops are now filtered against the displayed shell polygon before render use, and degenerate or clearly out-of-shell hole loops are dropped.
- **Rationale**: Negative geometry that escapes the shell or collapses numerically creates invalid cutouts and visible playback artifacts. The displayed hole set must remain a subset of the displayed shell geometry.

### D-66: FG2 Spawn and Vanish Playback Must Collapse Toward Anchor-Shaped Contours
- **Decision**: When FG2 builds unmatched `spawn` or `vanish` transitions and an anchor holding exists, the collapsed contour now blends toward the aligned anchor contour before scaling around the anchor point. Endpoint fallback is also allowed for all transition kinds if interpolation becomes invalid.
- **Rationale**: Collapsing unmatched holdings toward a near-point version of themselves produces brittle split/merge motion and can drop geometry entirely when interpolation becomes invalid. The fallback should preserve recognizable nearby geometry and degrade to a valid displayed loop rather than disappear.

### D-67: Territory Trace Inspector Must Expose Holding-Transition Diagnostics
- **Decision**: The Trace Inspector now includes a `Holding Transitions` section with transition-count summary metrics and per-transition preview lines sourced from the FG2 animation artifact.
- **Rationale**: Dynamic territory debugging depends on seeing transition kind, anchor relation, fallback counts, and contour-distance signals directly in the UI. Artifact dumps alone are too indirect for rapid evaluation.

### D-68: PVV3 Is An Active Territory Runtime, Not A Legacy Method Bucket
- **Decision**: PVV3 is now treated as an active runtime/backend and renderer host for the territory engine, not as a "legacy method" category. The `FG/DY/HY` identifiers remain the method contracts; PVV3 is the execution surface that can host them.
- **Rationale**: FG2 now runs natively and PVV3 already consumes FG2 artifacts directly for fills, borders, and playback while still hosting adapter-backed routes for incomplete methods. Treating PVV3 as merely "legacy" obscures the actual architecture and leads to incorrect reasoning about how the 15 modes fit together.

### D-69: Terminology Evaluation — Method vs Backend vs Contract vs Renderer Host (2026-03-14)
- **Decision**: Of the four architectural terms used in the planning docs, two are **fully valid** and two are **partially valid**:
  - ✅ **Algorithm family** (FG/DY/HY): Fully valid separation — static frontier, dynamic update, and hybrid orchestration are genuinely independent concerns.
  - ✅ **Runtime/backend** (PVV2/PVV3/DF): Fully valid — the execution surface that renders is genuinely separate from the method that produces geometry.
  - ⚠️ **Contract**: Aspirational, not enforced. Method descriptors have stable IDs but `TerritoryPipelineArtifacts` is generic `Record<string, unknown>`. Only FG2 produces real typed artifacts; other methods skip to adapter calls.
  - ⚠️ **Renderer host**: Currently conflated with "backend" — PVV3 does artifact consumption and pixel drawing in the same function. Distinction becomes real only if a separate artifact-consumption layer exists.
- **Implication**: The useful architectural axis is **method ≠ renderer**. The contract gap is the biggest risk for functional modularity — without typed method outputs, methods can't freely target different renderers.

### D-70: Canonical Terminology — Territory / Front / Holding / Sector (2026-03-14)
- **Decision**: All code, docs, and variables adopt this terminology going forward:
  - **Territory**: A grouping of connected stars and all the space within its bounds
  - **Front**: The line where opposing territories meet (replaces "frontier" in gameplay context)
  - **Holding**: The sum total of a player's territories
  - **Sector**: The game map
  - (Future roadmap) **Frontier**: fronts facing unexplored space; **District**: higher-level map of sectors; **Quadrant**: higher-level map of districts; **Galaxy**: highest-level map of quadrants
- **Action**: Variable/file rename inventory and migration plan to be created as a separate task. Code variable names like `ownerShells`, `frontierGraph`, `holdings` will be mapped to new canonical terms.

### D-71: Renderer Inventory — 10 Renderers, Not 3 (2026-03-14)
- **Decision**: The project has **10 territory renderers** available in the UI (9 active + 1 disabled), not 3. The territory engine's 15 sub-modes route through 3 of them via adapters, but they are not the only renderers:
  1. Voronoi (basic d3-voronoi)
  2. Modified Voronoi (disabled — causes freeze)
  3. Metaball (WebGL shader)
  4. Pixel (classic pixel-based)
  5. Lane Territory (graph lanes)
  6. Contour (vector marching-squares)
  7. Power Voronoi V2 / PVV2 (weighted Voronoi, d3-weighted-voronoi)
  8. PVV3 (frontier-first, consumes FG2 artifacts)
  9. Territory Engine (15-mode orchestrator routing to PVV2/PVV3/DF)
  10. Distance Field (GPU shader)
- **Implication**: "Backend" and "renderer host" are retired terms. Use **renderer** for all. The territory engine is a mode selector that routes to renderers, not a renderer itself.

### D-65: B-42 Fix — Never Regress Visual Quality For Easier Fix
- **Context**: Territory border/fill misalignment — borders used Chaikin+Bézier smoothing but fills used straight edges.
- **Wrong approach (Option A)**: Remove smoothing from borders (`smoothPasses=0`) so they match straight fills. This was implemented and committed first — **deliberate regression** that removed curved borders.
- **Correct fix (Option B)**: Apply `chaikinSmoothPolygon` to fill polygons so they match the smoothed borders. Both fills and borders now get the same Chaikin smoothing level.
- **Rule**: Never choose the easier solution if it doesn't meet spec. The spec requires "vector-like, smooth, even edges."

### D-66: B-42 Post-Mortem — Verify Which Renderer is Active Before Fixing
- **Context**: Applied B-42 fill smoothing to PVV3 (FG2 path + legacy path) but user was actually seeing PVV2 via FG1 Adaptive Field → `legacy_pvv2` adapter.
- **Lesson**: Before fixing a rendering bug, verify which renderer is executing by checking console logs, not by guessing from architecture diagrams. Both PVV2 and PVV3 have `◀ rebuild complete` logs — filter for those.
- **Additional**: PVV2 had **5 callsites** for `drawTerritoryFillWithHoles` — 3 in rebuild (steady-state), 2 in per-frame transition animation. The transition callsites drew raw polygons without smoothing on every frame, overriding the smoothed rebuild draws.

### D-67: Architecture Idea — Unify Static + Dynamic Methods
- **Decision**: Proposed (not yet implemented)
- **Idea**: Eliminate the static/dynamic method distinction. A "static" map is just a dynamic map running at 60fps with no frontier changes. There should be ONE unified rendering pipeline that handles both steady-state and transition-state identically.
- **Rationale**: The current static/dynamic split creates code duplication (5 static × 5 dynamic × 5 hybrid = 75 theoretical combinations, most unimplemented). Transition-state rendering has separate code paths that diverge from rebuild-state rendering (exactly the B-42 bug). A unified dynamic-only approach eliminates this divergence by construction.
- **Implication**: The registry.ts `TERRITORY_STATIC_METHODS` and `TERRITORY_DYNAMIC_METHODS` arrays would merge into a single `TERRITORY_METHODS` array. Each method would just be a continuously-running renderer that responds to ownership deltas.

## 2026-03-15

### D-72: Two-Layer Territory Architecture (V3 Master Plan)
- **Decision**: Territory system is restructured as two layers: **Data Engine** (computes front geometry and ownership) and **Render Modes** (visual presentation consuming canonical data). The static/dynamic/hybrid trichotomy from V2 is eliminated.
- **Rationale**: The 15-mode V2 plan embedded the static/dynamic distinction as a top-level axis, creating duplicated code paths that caused B-42. The data engine always produces the same canonical geometry regardless of whether ownership is changing. Each render mode handles both steady-state and transitions as a single pipeline.
- **Implication**: V2's `FG*`, `DY*`, `HY*` method families are replaced by one data engine + seven render modes. V2 "backends" become render modes. The term "backend" is retired.
- **Full spec**: `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v3_2026-03-15.md`

### D-73: Seven Render Modes — All In Plan, Implement As We Go
- **Decision**: Seven render modes are defined: (1) Vector Stroke, (2) Distance Field Glow, (3) Pressure Wave, (4) Pixel Art / Retro, (5) Terrain Shader, (6) Metaball / Organic, (7) No Animation (instant). Implementation follows priority order and stops when the user is satisfied.
- **Rationale**: Multiple visual styles serve both game design iteration (seeing which defaults work best) and player customization (theming engine as a feature). No modes are excluded from the plan; depth of implementation depends on available time and effectiveness of execution.
- **Key constraint**: Vector Stroke (currently working via PVV3Renderer) must be preserved without any visual regression.

### D-74: Validate Unified Approach Before Committing — Vector Stroke First
- **Decision**: Before restructuring all render modes, first validate the unified pipeline approach (one code path for steady-state + transitions) using only the Vector Stroke renderer. If this step reveals the unified approach doesn't work well, reassess before proceeding.
- **Rationale**: The open question — whether one unified render pipeline is better than separate static/dynamic renderers — should be answered through implementation rather than theory.

### D-75: Lane-Exclusivity Constraint (Replaces DX)
- **Decision**: The DX (disconnect separation) constraint is replaced by a lane-exclusivity rule: **only one or two player holdings are allowed to underlay any lane.** No third player's territory may touch or extend over any point along a lane.
- **A lane is either:**
  1. Entirely within one player's holding
  2. Has a front between exactly two players somewhere along that lane (typically near the midpoint, but varies with geometry)
- **Rationale**: DX used virtual enemy sites at arbitrary distances, which is not universally correct in all scenarios. The lane-exclusivity rule is a cleaner gameplay-geometry constraint that directly expresses the intended behavior: lanes belong to the players who own the stars they connect, and fronts resolve along them.
- **Implication**: `computeDisconnectVirtuals()` is superseded. The data engine must enforce lane exclusivity as a first-class constraint rather than injecting virtual sites as a hack.

### D-76: Current Active Territory Mode Is FG1/PVV2
- **Decision**: The currently active territory rendering path in the live game is **FG1 (Adaptive Field) via PowerVoronoiRenderer (PVV2)**, not PVV3/FG2. `TERRITORY_POWER_VORONOI: true` in the user's saved settings. PVV3 (`TERRITORY_PVV3: false`) and the modular territory engine (`TERRITORY_ENGINE_ENABLED: false`) are both off.
- **Implication**: All V3 work must be tested against the user's actual running configuration. Code defaults (game.config.ts) may differ from the user's localStorage-persisted settings. The settings persistence system (GAME_CONFIG Proxy → debounced localStorage save) must be consulted, not just code defaults.

### D-77: DY4 Optimal Transport — Sacrosanct Canonical Default (2026-03-15)
- **Decision**: DY4 Optimal Transport is designated the **sacrosanct canonical default** border animation mode. It is the most unique and attractive border animation in the game. All code defaults and documentation must preserve it as the default.
- **Configuration chain**:
  - `TERRITORY_ENGINE_MODE: 'dynamic'`
  - `TERRITORY_ENGINE_DYNAMIC_METHOD: 'dy4_optimal_transport'`
  - `TERRITORY_ENGINE_STATIC_METHOD: 'fg1_adaptive_field'` (DY4's anchor)
  - `adapter: 'legacy_pvv2'` (routes to `PowerVoronoiRenderer`)
  - `TERRITORY_POWER_VORONOI: true` (direct renderer toggle)
- **Protection**: This mode MUST NOT be broken by any refactoring, modularization, or new feature work. If a code change could affect DY4's rendering:
  1. Test DY4 before and after the change
  2. Verify border animations render correctly during conquest
  3. If in doubt, do not merge
- **Files involved**: `registry.ts`, `game.config.ts`, `PowerVoronoiRenderer.ts`, `engine.ts`
- **See also**: Code comments marked `SACROSANCT` in `registry.ts` and `game.config.ts`

### D-78: PVV3 Wired to FG2 Canonical Data — Single Source of Truth (2026-03-15)
- **Decision**: The `legacy_pvv3` adapter in `engine.ts` now calls `runFG2DataPipeline()` before `renderPVV3()`, passing FG2 canonical artifacts. PVV3 always uses FG2's single-source data for both fills AND borders, eliminating fill/border divergence by construction.
- **Rationale**: PVV3's legacy datagen computed fills from merged Voronoi cells and borders from shared-edge polylines independently, causing B-42 visual divergence. The FG2 canonical path already existed but was never activated because the adapter didn't pass artifacts.
- **Implication**: PVV3's legacy datagen (~200 lines) is now dead code at runtime. Kept with deprecation warning for safety; will be removed in a future cleanup.
- **Commits**: `23e74b8`

### D-79: CanonicalTerritoryData + RenderMode Interface (2026-03-15)
- **Decision**: Formalized the V3 two-layer architecture with typed `CanonicalTerritoryData` (shells, shellLoops, animatedShells, transitionActive) and `RenderMode` interface (draw, reset). All render modes will consume canonical data through this contract.
- **Rationale**: Raw `TerritoryPipelineArtifacts` was untyped (`Record<string, unknown>`). PVV3 used inline `as any` casts to access shell data. The typed interface eliminates unsafe casts and establishes the formal contract for the pluggable render mode architecture.
- **Files**: `renderMode.ts` (new), `engine.ts` (extractCanonicalData), `PVV3Renderer.ts`, `GameCanvas.svelte`, `index.ts` (barrel)
- **Commits**: `e2233f1`

### D-80: V3.1 Three-Concern Architecture (2026-03-15)
- **Decision**: Split monolithic `RenderMode` into three independent contracts: `TerritoryStyle` (steady-state drawing), `FillTransition` (fill animation on conquest), `BorderTransition` (border animation on conquest). Transitions produce modified `CanonicalTerritoryData` — styles render it.
- **Rationale**: V3's single `RenderMode` conflated "how territories look" with "how they animate." These are orthogonal: a player should pick a visual style independently from transition behavior. "None" makes no sense for territory style but makes perfect sense as a transition option (instant snap). The Static/Dynamic distinction resurfaces as transition selection, not data engine split.
- **UI**: Three side-by-side dropdowns replace single Render Mode + 10 legacy toggle switches. ~2,657 lines removed from `ControlsSection-Territory.svelte` (4518→1614).
- **Files**: `renderMode.ts`, `ControlsSection-Territory.svelte`
- **Commits**: `489da45`, `747027c`

### D-81: DY4 De-Sacrosanct — Include in Full Refactor (2026-03-16)
- **Decision**: DY4 Optimal Transport border animation is **no longer sacrosanct**. It has been visually broken for multiple commits. The `dy4-sacrosanct` rule is revoked by explicit user instruction on 2026-03-16. DY4 is to be included in the full territory refactor scope.
- **Rationale**: DY4 was protected to prevent accidental regression. However it has already regressed without detection. Sacrosanct status offers no protection when the feature is already broken. The user's intent is to restore DY4 to full functionality — ideally wired through the canonical pipeline — because it remains the strongest VFX result in the game.
- **Recovery goal**: After the canonical compiler/render pipeline stabilizes, wire DY4's mass-preserving transport logic (currently in `PowerVoronoiRenderer` via `legacy_pvv2` adapter) into the `TerritoryTransitionPlanner` or as a named `BorderTransition` mode so it runs on canonical state. Git archaeology will identify the original regression commit (B-44).
- **Replaces**: `dy4-sacrosanct.md` rule — that constraint is superseded by this decision.
- **References**: B-44, `registry.ts` SACROSANCT block (still in code but no longer behaviorally binding)

## 2026-03-21

### D-83: Territory Runtime Rebuild Blueprint — One Authoritative Runtime, One Orchestrator Per Layer
- **Decision**: The territory system should be rebuilt around one authoritative runtime coordinator plus one orchestrator per layer: `Ownership`, `Geometry`, `Transition`, and `Presentation`. Each layer must have a strict typed input/output contract, and user-facing mode selection must be split into semantic axes (`geometry`, `style`, `fillTransition`, `borderTransition`) rather than `engine method`, `static`, `dynamic`, or renderer names.
- **Rationale**: The current runtime mixes multiple authority paths (`GameCanvas` dispatch, `engine.ts` adapter routing, renderer-side geometry/transition ownership, and a side `territory_canonical` path). This makes data flow hard to follow and makes renaming or swapping modules risky. A single runtime with typed boundaries allows modules to be replaced cleanly without re-coupling geometry, FX, and PIXI rendering.
- **Implementation posture**: Reuse the good pieces already present:
  - `powerVoronoiTerritoryGeometryGenerator.ts` and `Geometry_0319.ts` as geometry-mode implementations
  - `TerritoryEngineController` as the basis for the top-level runtime coordinator
  - `TerritoryRenderer` class-encapsulation ideas, but pushed behind a PIXI presenter boundary
  - FX orchestration patterns from `fx/` as an event bridge rather than a renderer-owned transition singleton
- **Naming rule**: Public runtime names must describe the concern they own. Archaeology names like `FG1`, `FG2`, `DY4`, `PVV2`, `PVV3`, `static`, and `dynamic` should only survive as migration aliases or legacy adapter labels, not as the primary semantic API.
- **Blueprint**: See `.agent/SPECIFICATIONS/TERRITORY_CLEAN_ARCHITECTURE_BLUEPRINT.md`

## 2026-03-23

### D-84: Contracts Define Ideal Architecture — Code Adapts, Not The Other Way Around
- **Decision**: When contract interfaces don't match legacy data shapes, the contracts are authoritative. Code must be rewritten to produce the contract-defined shape. Legacy data shapes are never the reason to weaken a contract.
- **Rationale**: The point of the refactor is clean architecture. Bending contracts to fit legacy code defeats the purpose. Any contract-vs-code conflict must be brought to the user with architectural analysis for resolution.

### D-85: Zero Legacy Adapters — Full Rewrite, Legacy as Reference Only
- **Decision**: The refactor is a 100% transition to new architecture. All rendering modes must be rewritten from scratch within the new pipeline, with zero copy-paste from legacy code. Legacy code serves only as reference material for understanding algorithms and behavior. Once a new mode is confirmed functional, its legacy counterpart is deleted entirely.
- **Rationale**: Legacy adapters preserve legacy architecture. The user's goal is architectural transformation, not compatibility wrapping. Wrapping old code in new interfaces creates a veneer of clean architecture without delivering its benefits.
- **Supersedes**: D-44 (which permitted bootstrap legacy adapters during architecture phase)

### D-86: DY4 Transition Must Be Rethought, Not Wrapped
- **Decision**: The DY4 Optimal Transport border transition must be re-implemented from first principles to deliver the canonical conquest transition spec, not wrapped in an adapter from its current degraded state. It regressed from its best visual quality and was never perfect.
- **Rationale**: The current DY4 implementation has accumulated regressions (see D-81). Wrapping a degraded implementation in a clean interface produces a degraded result in a clean interface. The canonical spec for conquest transition behavior is the target, not the current DY4 code.

### D-87: Legacy Deletion Requires Explicit User Confirmation
- **Decision**: Before any legacy file is deleted, the user must be asked and must explicitly confirm. No silent deletions, no batch deletions without per-file acknowledgment.
- **Rationale**: Legacy code contains algorithmic knowledge. Even when a clean replacement is confirmed working, the user may want to review the old file one last time before it's gone.

## 2026-03-23

### D-88: Deterministic Ownership Version Hash for Geometry Caching
- **Decision**: `ownership.version` uses an FNV-1a hash of sorted star-owner pairs + virtual star count instead of including `nowMs`. Cache hits when ownership is unchanged between frames.
- **Rationale**: Previous version included `nowMs`, causing geometry cache to miss every frame (~50x/second). Settings changes still invalidate the cache via separate cache key components (smoothingPasses, frontierResolution, geometryMode, etc.).
- **Commit**: `9bc2507`

### D-89: Transition Overlap — Configuration Edge Case, Not Architectural
- **Decision**: Pax Fluxia is tick-based. All conquests dispatch on tick boundaries, and transitions should complete within the tick interval. The only overlap scenario is when `transitionDurationMs > tickInterval` — a settings misconfiguration. If advanced VFX modes require longer animations, they must handle overlap explicitly (e.g. fast-forward or merge), but the default behavior assumes transitions complete by the next tick.
- **Rationale**: The current replace-and-restart behavior in `TransitionLayerCoordinator` is correct for the default case. No architectural change needed.

## 2026-03-24

### D-90: ownerPairKey Is NOT Unique — Frontier Matching Must Use Multimaps (CRITICAL)
- **Decision**: `ownerPairKey` on `FrontierPolylineShape` is NOT a unique identifier. Multiple disjoint polyline segments can (and frequently do) share the same key. **All code that groups or matches frontier polylines by `ownerPairKey` MUST use multimaps** (`Map<string, T[]>`), never single-value Maps.
- **Bug**: Every frontier-matching function in the production transition pipeline used `Map<string, singleValue>`, silently overwriting duplicate segments. With 38 frontier polylines reduced to 17 unique keys, over half the segments were dropped with zero warning. The dropped segments received no transition morphing — they snapped instantly instead of smoothly interpolating via optimal transport.
- **Affected files**: `GeometryTopologyDiff.ts`, `interpolatePolylines.ts`, `CorrespondencePlanner.ts`, `FrontierTopologyBuilder.ts`
- **Why it persisted**: The name `ownerPairKey` implies uniqueness. Nobody verified that two territories can share a geometrically disconnected border (multiple segments). The Map pattern is the default JavaScript grouping idiom — it requires explicit awareness that `Map.set()` is a silent overwrite when keys collide.
- **Rule**: Any new code that uses `ownerPairKey` as a Map key must be multimap or prove uniqueness.
- **Post-mortem**: `.agent/WIP Work-In-Progress/POST_MORTEM_2026-03-24_FRONTIER_DEDUP.md`
- **Commit**: `6843214`

### D-91: Diagnostic Tools Must Use Production Data Paths — Never Reimplement
- **Decision**: Any diagnostic, debug overlay, or snapshot tool MUST consume the exact same data structures and diff functions as the production code it's debugging. A diagnostic tool that reimplements its own diff logic independently from the production system is worse than no tool — it actively misleads.
- **Bug**: The Transition Snapshot Recorder originally (1) captured the live PIXI canvas (showing interpolated mid-transition frames, not definitive geometry), and (2) implemented its own `diffFrontiers` function separate from the production `GeometryTopologyDiff`. The diagnostic showed border coverage that didn't match what the transition engine was actually computing.
- **Rule**: A debug tool's value is exactly proportional to how faithfully it mirrors the production data path. If it computes its own answers, it's hallucinating. Wire it to the production output, or don't build it.
- **Remaining work**: The snapshot recorder's diff function should be replaced by a thin wrapper around the production `GeometryTopologyDiff.computeGeometryTopologyDiff()`.

