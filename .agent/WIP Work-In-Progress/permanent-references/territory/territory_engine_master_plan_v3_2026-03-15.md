# Territory Engine Master Plan V3

**Date**: 2026-03-15
**Supersedes**: [Master Plan V2 (2026-03-13)](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/WIP%20Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/00_INDEX_AND_READING_ORDER.md) — preserved intact as reference
**Driven by**: [D-67](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.atlas/DECISIONS.md#L335) (Unify Static + Dynamic)

---

## 1. Executive Summary

### What changed from V2

V2 organized territory work as 15 modes (5 static × 5 dynamic × 5 hybrid) across 3 backends. Of those 15, only one (FG2) was fully implemented. The static/dynamic/hybrid split created duplicated code paths that caused real bugs (B-42: borders smooth but fills straight, because the transition renderer diverged from the rebuild renderer).

V3 replaces that with a **two-layer architecture**:

1. **Data Engine** — one system that computes front geometry and ownership from game state
2. **Render Modes** — seven visual presentation styles, each consuming the same canonical data

The static/dynamic distinction is eliminated. The data engine always produces the same canonical geometry. Each render mode handles both steady-state display and animated transitions as a single continuous pipeline.

### Why this is better

- **Eliminates border/fill mismatch bugs by construction** — one canonical data source, one code path per render mode
- **7 real modes instead of 15 theoretical ones** — every mode in this plan is intended for implementation
- **Player value first** — multiple distinct visual styles the player can choose and customize
- **Honest about scope** — modes are ordered by priority. We stop when you're satisfied

### What stays from V2

- Method ≠ Renderer separation (renamed from "method ≠ backend")
- Canonical geometry as single source of truth
- Validation protocol (screenshots, fixtures, stop rules)
- D-70 terminology (territory, front, holding, sector, enclave)
- PVV3 Renderer as the primary active renderer (now called "Vector Stroke" in player-facing terms)

---

## 2. Architecture

### Two layers

```
GAME STATE (stars, lanes, ownership, tick events)
    │
    ▼
┌──────────────────────────────────────────────────┐
│  DATA ENGINE                                     │
│                                                  │
│  Runs on: ownership change (conquest) or init    │
│  Produces: canonical front coordinates,          │
│            holding regions, enclave detection     │
│  Satisfies: MSR, CX, DX constraints             │
│  Does NOT run when: nothing changed              │
│                                                  │
│  Implementation: fg2SeedGraph.ts (209KB)         │
│  Orchestrator: territory-engine/engine.ts        │
│  Registry: territory-engine/registry.ts          │
└──────────────────────┬───────────────────────────┘
                       │
          canonical front data + ownership
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│  RENDER MODE  (one active at a time)             │
│                                                  │
│  Steady state: draws borders + fills from data   │
│  Transition: animates from old data to new data  │
│  Player control: tunables per mode (sliders,     │
│    style options, animation speed)               │
│                                                  │
│  Seven modes available (see Section 4)           │
└──────────────────────────────────────────────────┘
```

### Data flow on ownership change

1. Game tick detects conquest / ownership change
2. Data engine recomputes front geometry and holdings
3. Active render mode receives old and new canonical data
4. Render mode interpolates from old → new over one tick
5. When interpolation completes, old data is discarded

### Data flow in steady state

1. No ownership changes
2. Data engine does nothing (no recomputation needed)
3. Render mode draws from current canonical data
4. Per-frame work is rendering only — no computation

### Data flow on map initialization

1. Map loads, all stars assigned to players
2. Data engine computes full front geometry from scratch
3. Render mode receives data with no "old" state
4. Render mode draws the initial state directly — no transition animation needed on first frame

---

## 3. Data Engine

### Current status

The data engine is **fully implemented** via the FG2 Seed Graph approach in [fg2SeedGraph.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/territory-engine/methods/fg2SeedGraph.ts).

### What it does

| Responsibility | Implementation |
|---|---|
| Ownership truth | Graph-native multi-source Dijkstra on stars and lanes |
| Constraint enforcement | MSR (minimum star radius), CX (corridor extension), DX (disconnect separation) |
| Front generation | Analytical front seeds on lanes + star-pair competition + junction resolution + perimeter closure |
| Holding identification | Connected ownership regions with face walking and enclave detection |
| Canonical geometry | Shared front coordinates — the single source of truth for borders and fills |

### What it produces

The data engine outputs a **canonical dataset** that any render mode can consume:

- **Front graph**: shared coordinates where opposing territories meet. Each front segment is owned by exactly one player pair
- **Holdings**: closed polygon regions for each player's connected territory
- **Enclaves**: holdings that are entirely surrounded by an opposing player's territory
- **Topology metadata**: which holdings are adjacent, which fronts they share

### Future: alternative data engines

The FG2 approach is the current implementation. Different data engine algorithms (field-based, arrangement-based, RT-assisted) might produce subtly different results or handle edge cases better. This is valid future work, but **low priority** as long as FG2 produces correct, consistent results. If a second data engine is ever built, it must produce the same canonical data format so all render modes work with it unchanged.

---

## 4. Render Modes

Seven modes, ordered by implementation priority. Each mode consumes the same canonical data from the data engine. Each handles both steady-state drawing and animated transitions.

### How render modes work

Every render mode implements the same contract:

1. **`draw(canonicalData)`** — render the current territory state (fills + borders)
2. **`transition(oldData, newData, progress)`** — interpolate between two states during conquest animation
3. **`configure(tunables)`** — respond to player settings (sliders, style options)

When nothing is changing, only `draw()` runs. When ownership changes, `transition()` runs each frame until interpolation completes, then reverts to `draw()`.

---

### Mode 1: Vector Stroke ⭐ PRIORITY

**What it looks like**: Clean, SVG-like borders with even-width strokes. Crisp polygon fills. The classic strategy-game look.

**Transition animation**: Front vertices interpolate from old to new positions with minimal travel distance. Fills follow fronts exactly — no crossfade, no alpha blending.

**Player tunables**:
- Border width
- Chaikin smoothing passes (angular ↔ curved)
- Bézier curve fitting
- Style: straight / curved / segmented
- Animation speed

**Existing code**: [PVV3Renderer.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/PVV3Renderer.ts) — this is the currently working renderer. The animation is very close to the intended behavior.

> [!IMPORTANT]
> This renderer must be preserved without regression. Only code/architecture cleanup as part of the V3 restructuring. No behavior changes unless explicitly requested.

**Implementation work**: Restructure existing PVV3Renderer to consume canonical data through the new render mode contract. The rendering logic itself is mostly done.

---

### Mode 2: Distance Field Glow

**What it looks like**: Soft, glowing borders that bleed outward. Territory fills have gradient edges that fade toward fronts. Sci-fi energy field aesthetic.

**Transition animation**: Distance field interpolates smoothly — fronts dissolve and reform. Organic-looking transitions.

**Player tunables**:
- Glow intensity
- Falloff curve (sharp ↔ soft edges)
- Border emission width
- Color blending at multi-player junctions

**Existing code**: [DistanceFieldTerritoryRenderer.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/DistanceFieldTerritoryRenderer.ts) — existing GPU shader renderer. Needs adaptation to consume canonical front data instead of computing its own.

**Implementation work**: Modify DF renderer to consume canonical data engine output for ownership truth, use its own GPU shader for visual presentation.

---

### Mode 3: Pressure Wave

**What it looks like**: Fronts rendered as animated pressure/interference patterns. Territory ownership shown through wave-like pulses emanating from owned stars. Borders shimmer with energy.

**Transition animation**: Ownership changes create visible wavefront propagation — the new front sweeps across contested space.

**Player tunables**:
- Wave speed
- Wave amplitude
- Interference pattern density
- Color cycling speed

**Existing code**: None — new implementation required.

**Implementation work**: New shader that uses canonical front data as wave sources. Animation system for propagation. Should leverage the distance-from-star data the data engine already computes.

---

### Mode 4: Pixel Art / Retro

**What it looks like**: Deliberately pixelated territory fills with chunky borders. Retro strategy game aesthetic — think 16-bit era map screens.

**Transition animation**: Tiles flip ownership one-by-one in a wave pattern from the conquest point.

**Player tunables**:
- Pixel/tile size
- Flip speed (how fast tiles cascade)
- Border pixel width
- Dithering at borders (yes/no)

**Existing code**: [PixelTerritoryRenderer.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/PixelTerritoryRenderer.ts) — existing pixel-based renderer. Needs adaptation to the V3 contract.

**Implementation work**: Adapt existing pixel renderer to consume canonical data. Add tile-flip transition animation.

---

### Mode 5: Terrain Shader

**What it looks like**: Territory fills rendered with procedural terrain textures — each player's territory looks like a distinct biome or surface material. Borders are where terrain types meet.

**Transition animation**: Territory transitions show terrain transformation — gradient blend from one terrain type to another as ownership changes.

**Player tunables**:
- Texture style per player (desert, forest, ocean, volcanic, etc.)
- Transition blend type (dissolve, grow-over, erode)
- Border roughness (how ragged the terrain boundaries are)

**Existing code**: None — new implementation required.

**Implementation work**: New shader with procedural terrain generation. UV mapping from canonical front data. Per-player texture assignment system.

---

### Mode 6: Metaball / Organic

**What it looks like**: Territories with smooth, organic shapes and rounded boundaries. Not perfectly rounded (that causes gaps at junctions), but softer and more biological than Vector Stroke.

**Transition animation**: Territories flow like fluid. Conquests look like one organism consuming another.

**Player tunables**:
- Surface tension (how much territory shapes merge vs separate)
- Smoothness
- Organic irregularity (noise-based edge variation)

**Existing code**: [MetaballRenderer.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/MetaballRenderer.ts) — existing metaball renderer using Euclidean distances. Needs adaptation to use canonical graph-based data.

**Implementation work**: Modify metaball renderer to use canonical front data for ownership truth while applying metaball visual treatment on top. Must handle multi-player junctions without gaps.

---

### Mode 7: No Animation (Default / Instant)

**What it looks like**: Same as Vector Stroke in steady state. Clean, professional, high-contrast political map style.

**Transition animation**: None. Fronts update instantly to new positions. No interpolation.

**Player tunables**:
- Same as Vector Stroke for steady-state appearance
- Optional: brief flash/highlight at the front that just moved (so the player notices the change)

**Existing code**: Subset of PVV3Renderer — same draw logic, skip transition logic.

**Implementation work**: Minimal. This is Vector Stroke with `transition()` as a no-op. Useful as a fallback and as a preference for players who dislike animation.

> [!NOTE]
> This is not a "full" render mode — it's the absence of transition animation. It exists as a player option and as a useful reference/debugging tool (instant state changes make data engine correctness easier to verify).

---

## 5. Existing Renderer Inventory

These renderers already exist in the codebase. Their relationship to the V3 render modes:

| Existing Renderer | V3 Role |
|---|---|
| [PVV3Renderer.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/PVV3Renderer.ts) | Becomes **Mode 1: Vector Stroke** |
| [DistanceFieldTerritoryRenderer.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/DistanceFieldTerritoryRenderer.ts) | Becomes **Mode 2: Distance Field Glow** |
| [PixelTerritoryRenderer.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/PixelTerritoryRenderer.ts) | Becomes **Mode 4: Pixel Art / Retro** |
| [MetaballRenderer.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/MetaballRenderer.ts) | Becomes **Mode 6: Metaball / Organic** |
| [PowerVoronoiRenderer.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/PowerVoronoiRenderer.ts) (PVV2) | Reference/comparison renderer. Keep as-is for regression testing |
| [VoronoiRenderer.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/VoronoiRenderer.ts) | Legacy. Can be retired after V3 stabilizes |
| [ModifiedVoronoiRenderer.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/ModifiedVoronoiRenderer.ts) | Disabled (causes freeze). Candidate for deletion |
| [ContourTerritoryRenderer.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/ContourTerritoryRenderer.ts) | Legacy marching-squares approach. Can be retired |
| [GraphTerritoryRenderer.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/GraphTerritoryRenderer.ts) | Legacy. Can be retired |
| [LaneTerritoryRenderer.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/LaneTerritoryRenderer.ts) | Legacy. Can be retired |

---

## 6. Implementation Sequence

Ordered by value and risk. Each phase is independent — we stop when you're satisfied.

### Phase 0: Validate the Approach (Vector Stroke as unified pipeline)

**Goal**: Prove that the unified approach (one code path for steady-state + transitions) works with the existing Vector Stroke renderer.

**Work**:
1. Audit PVV3Renderer.ts to identify where steady-state and transition code paths currently diverge
2. Unify them into a single `draw`/`transition` contract
3. Verify no visual regression — screenshot comparison before/after
4. Verify transitions still animate correctly

**Exit criteria**: Vector Stroke renders identically to current behavior, but through the unified contract. If this step reveals that the unified approach doesn't work well, we reassess before proceeding.

**This phase answers the open question**: Is one unified render pipeline better than separate static/dynamic renderers?

---

### Phase 1: Clean Data Engine Interface

**Goal**: Define a clean, documented interface between the data engine and render modes.

**Work**:
1. Define the `CanonicalTerritoryData` type — what the data engine outputs
2. Define the `RenderMode` interface — `draw()`, `transition()`, `configure()`
3. Adapt PVV3Renderer to consume `CanonicalTerritoryData` through the interface
4. Verify data engine output is sufficient for Vector Stroke — identify any missing data

**Exit criteria**: PVV3Renderer runs entirely through the clean interface. The interface is documented and stable enough to build new render modes against.

---

### Phase 2: Mode Selector UI

**Goal**: Player can switch between render modes in the game settings.

**Work**:
1. Add a render mode dropdown to the territory controls section
2. Wire mode selection to the active renderer
3. Ensure mode switching doesn't crash or leave stale state

**Exit criteria**: Player can switch between Vector Stroke and No Animation (Mode 7) as a proof of the selector working.

---

### Phase 3+: Additional Render Modes (as desired)

Each subsequent mode follows the same pattern:
1. Adapt or build the renderer to implement the `RenderMode` interface
2. Add it to the mode selector
3. Add its tunables to the territory controls panel
4. Screenshot validation

**Suggested order** (based on existing code leverage):
- **Phase 3**: Distance Field Glow — existing DF renderer is closest to ready
- **Phase 4**: Pixel Art / Retro — existing pixel renderer + new tile-flip animation
- **Phase 5**: Metaball / Organic — existing metaball renderer + graph-based data adaptation
- **Phase 6**: Pressure Wave — new shader work
- **Phase 7**: Terrain Shader — new shader work, most creative effort required

---

## 7. Validation Protocol

Carried forward from V2 with simplifications for the two-layer architecture.

### Mandatory checks for any territory work

1. **Data engine correctness**: fronts are gap-free, holdings partition the entire map, enclaves are detected
2. **Render mode correctness**: fills match borders, no visual gaps, transitions complete without glitches
3. **Screenshot evidence**: saved before/after screenshots for any change
4. **Mode switching**: switching render modes doesn't corrupt state

### Test scenarios

| Scenario | What it tests |
|---|---|
| Small map (4 stars) | Easy visual inspection |
| Medium map (12 stars) | Normal gameplay |
| High-churn (rapid conquests) | Transition stress |
| Enclave (surrounded holdings) | Enclave rendering correctness |
| World-edge | Front geometry at map boundaries |
| Mode switch during transition | State management under mode change |

### Stop rules

- Never claim a visual bug is fixed without saved screenshots
- Never merge a render mode change without testing steady-state AND transition
- If a change to Mode X breaks Mode Y, the change is wrong — render modes must be independent

---

## 8. Glossary (D-70 Vocabulary)

| Term | Meaning |
|---|---|
| **Territory** | A grouping of connected stars and all the space within its bounds |
| **Front** | The line where opposing territories meet (synonymous with "frontier" in current code) |
| **Holding** | The sum total of a player's territories |
| **Sector** | The game map |
| **Enclave** | A territory entirely surrounded by an opposing player's territory |
| **Holdout** | Same as enclave |
| **Data engine** | The system that computes front geometry and ownership from game state |
| **Render mode** | A visual presentation style that consumes data engine output |
| **Canonical data** | The single source of truth for front geometry that all render modes consume |
| **MSR** | Minimum Star Radius — minimum distance from owned stars to fronts |
| **CX** | Corridor Extension — territory extends along and encompasses connected lanes |
| **DX** | Disconnect Separation — unconnected same-owner territories are visually separated by enemy territory |

### Retired terms

| Old term | Replacement |
|---|---|
| Backend | Render mode (for rendering) or Data engine (for computation) |
| Static method | Data engine (there's only one pipeline now) |
| Dynamic method | Transition animation within a render mode |
| Hybrid | Eliminated — no meaning in the unified architecture |
| Shell | Holding |
| Component | (context-dependent) Territory, holding, or enclave |
| Route | Render mode selection |
| Adapter | (eliminated — all render modes consume canonical data directly) |
| Native | (eliminated — say "fully implemented" or "partially implemented") |

---

*V2 master plan preserved at [territory_engine_master_plan_v2_2026-03-13/](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/WIP%20Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/00_INDEX_AND_READING_ORDER.md)*
