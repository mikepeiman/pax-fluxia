---
title: Territory architecture and parity report
date: 2026-04-10
status: active
author: Codex
audience: human architect and future agents
---

# Territory architecture and parity report (2026-04-10)

This report is a code-verified end-of-day assessment of the territory, lane, and RenderFamily work in the current `pax-fluxia` workspace.

It is intentionally skeptical of planning drift. Where docs and code disagree, this report treats the code as the current fact and the docs as intent or history.

---

## 1. Executive summary

The territory effort is not futile, but the architecture has been carrying too many active concepts at once.

The strongest current work is:

- the lane model and lane/MSR split
- lane-centerline consumption in single-player rendering and FX
- corridor/CX centralization through one builder
- the realization that the old 4-layer stack is a vector-family-specific architecture, not the universal master architecture

The weakest current areas are:

- partial RenderFamily migration with no single runtime boundary yet
- `GameCanvas.svelte` still acting as the real territory router
- planning/documentation drift and contradictory "authoritative" statements
- multiplayer parity for lane-path truth

The best path forward is not to delete variety. It is to:

1. keep a small active family shortlist
2. hide non-shortlisted paths from normal UI
3. make one canonical scene/runtime contract real
4. move duplicated utilities into semantically correct homes
5. stop adding abstraction until verification and dispatch are simpler

Given today's priorities, the active renderer shortlist should be:

- `metaball` as the immediate focus
- `distance_field` as an active alternative
- one PV family path only: either current PVV2-weighted, PVV3, or DY4 reference, chosen explicitly

Everything else can remain in the repo, but should not remain equally "live" in the main mental model.

---

## 2. What is working and worth preserving

### 2.1 Lanes are materially improved

The lane model is not just a planning idea anymore. It is implemented and coherent in the single-player path.

Verified in:

- `common/src/mapgen/index.ts`
- `common/src/mapgen/connections.ts`
- `common/src/mapgen/lanePolylines.ts`
- `common/src/mapgen/types.ts`
- `pax-fluxia/src/lib/stores/gameStore.svelte.ts`
- `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Visuals.svelte`

What is true in code now:

- `MAPGEN_LANE_MARGIN_PX` is the lane-clearance knob.
- `MODIFIED_VORONOI_STAR_MARGIN` is territory/MSR only.
- Phase 4 prune checks the straight chord only.
- curved lanes satisfy the full lane margin on samples
- Phase 5 reconnect protects graph connectivity

That is good architecture because it separates:

- topology constraints
- path geometry constraints
- territory boundary constraints

### 2.2 Lane path is already feeding real consumers

The "motion contract still open" language in current docs is partially stale.

Single-player already has a meaningful shared lane-path consumption chain:

- cache and rebuild: `pax-fluxia/src/lib/lanes/lanePolylineCache.ts`
- lane drawing: `pax-fluxia/src/lib/renderers/LaneRenderer.ts`
- ship path assignment: `pax-fluxia/src/lib/lanes/applyLaneTravelPath.ts`
- transfer FX: `pax-fluxia/src/lib/fx/handlers/transferHandler.ts`
- conquest FX: `pax-fluxia/src/lib/fx/handlers/conquestHandler.ts`

This is an important success. It means lane-centerline truth is already useful outside territory rendering.

### 2.3 Corridor/CX consolidation is partially real

The corridor builder is not just planned; it exists and is already reused.

Verified in:

- `pax-fluxia/src/lib/territory/corridor/buildCorridorVirtualSites.ts`
- `pax-fluxia/src/lib/renderers/territoryFeatures.ts`
- consumers in Metaball, Modified Voronoi, PV-family paths, DF, and compiler code

This is a good direction because it pulls corridor logic out of ad hoc per-renderer duplication.

### 2.4 The "4-layer is vector-family-specific" conceptual correction is correct

This is the most important architecture correction made in the last few days.

The old 4-layer stack:

- ownership
- geometry
- transition
- presentation

fits vector polygons and polyline/frontier morphing.

It does not cleanly fit:

- metaball field/grid renderers
- distance-field shader-driven renderers
- some other field or texture-based families

So keeping that stack as the internals of a `VectorPolygonFamily` is a sound architectural idea.

---

## 3. Main deficiencies found

### 3.1 RenderFamily exists as a concept and partial scaffold, not yet as the real runtime

The family system is real but incomplete.

Verified in:

- `pax-fluxia/src/lib/territory/families/RenderFamilyTypes.ts`
- `pax-fluxia/src/lib/territory/families/renderFamilyRegistry.ts`
- `pax-fluxia/src/lib/territory/families/metaball/MetaballFamily.ts`
- `pax-fluxia/src/lib/territory/families/buildRenderFamilyInput.ts`

Current state:

- the interface exists
- the registry exists
- one family adapter exists (`MetaballFamily`)
- the builder feeding that interface is still a stub:
  - `ownership: null`
  - `tunables: new Map()`
  - `activeTransition: null`

Implication:

The family contract is not yet the canonical runtime contract. It is still migration scaffolding.

### 3.2 `GameCanvas.svelte` is still the actual territory architecture

The real territory dispatch is still a large switch in `GameCanvas.svelte`.

Verified in:

- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`

The file currently hosts:

- direct legacy renderer dispatch
- canonical clean bridge dispatch
- canonical legacy controller/renderer fallback
- special-case metaball family dispatch
- family gating behavior for UI

So the architecture is still centered around a giant composition/integration file rather than a single territory runtime boundary.

This is the main readability problem for both humans and agents.

### 3.3 Too many active routing models coexist

As of today, there are several overlapping "ways territory happens":

- direct style dispatch by `TERRITORY_RENDER_MODE`
- canonical clean vs legacy route via `TERRITORY_ARCHITECTURE_PATH`
- territory engine path
- family gate path via `USE_RENDER_FAMILIES`
- legacy renderers that are still first-class in the same UI row

This is not just a UX issue. It creates architecture ambiguity:

- which thing is the master runtime?
- which thing is compatibility only?
- which modes are strategic?
- which are reference implementations?

When every path appears equally active, the project becomes harder to trust.

### 3.4 Planning drift is already visible

The implementation-plan docs are helpful, but not stable enough to be treated as ground truth on their own.

Examples found during this pass:

- one document says `MetaballFamily` is still open
- another says it is already wrapped
- several docs describe a future family runtime that the code has only partially implemented
- "motion contract still open" is only partly true because SP already consumes lane polylines in FX

Implication:

Future work should stop creating new "authoritative" docs that are not explicitly marked as:

- intent
- verified current state
- historical context

### 3.5 Shared scene contract is not yet canonical enough

Mapgen emits lane metadata through `MapConnection` in:

- `common/src/mapgen/types.ts`

but the canonical shared gameplay `Connection` type in:

- `common/src/types.ts`

still only contains:

- `sourceId`
- `targetId`
- `distance`

So lane-path truth is canonical inside mapgen, but not canonical in the general game-state contract.

That matters because lane geometry is now used by:

- lane rendering
- territory corridor sampling
- transfer FX
- conquest FX
- map preview

This contract mismatch should be resolved.

---

## 4. Multiplayer parity findings

## 4.1 Short answer

Yes, a client/MP parity gap exists right now.

I cannot prove from this pass whether it is newly reintroduced or simply more visible because of the recent lane work, but it definitely exists in the current code snapshot.

## 4.2 The exact gap

The server generates lane waypoints during map generation:

- `pax-server/src/rooms/GameRoom.ts`
- `common/src/mapgen/index.ts`

but then discards them when converting to schema connections.

Verified in:

- `common/src/schema/GameState.ts`
- `pax-server/src/rooms/GameRoom.ts`
- `pax-fluxia/src/lib/stores/multiplayerStore.svelte.ts`

Current behavior:

- server `generateMap()` produces `laneWaypoints` and `lanePathKind`
- server schema `ConnectionSchema` does not store them
- multiplayer store only reconstructs `sourceId`, `targetId`, `distance`
- multiplayer store does not seed or rebuild the lane polyline cache

So:

- SP has real lane-path truth
- MP clients do not receive or reconstruct that truth

## 4.3 Why this matters

This is not cosmetic anymore.

It affects:

- curved lane rendering parity
- CX sampling parity
- FX travel/conquest parity if MP wants the same path truth
- future confidence in any "shared lane path contract"

Right now the project has effectively achieved:

- SP lane-path architecture

but not yet:

- MP lane-path architecture

## 4.4 Recommended fix direction

There are two sane options.

### Option A: schema and state carry lane paths

Add `laneWaypoints` and `lanePathKind` to the shared connection/state contract and Colyseus schema.

Pros:

- true parity
- no per-client re-solve ambiguity
- one canonical path

Cons:

- more state payload
- schema migration work

### Option B: MP client deterministically rebuilds lane paths from star positions plus connection topology

This only works if the same inputs are guaranteed on the client:

- lane mode
- lane margin
- curve-vs-prune bias
- star positions
- connection edge set

Pros:

- smaller network payload

Cons:

- more hidden reconstruction logic
- easier to drift
- worse for trust/debugging

Recommendation:

Prefer Option A. Lane paths have become important enough to deserve canonical state.

---

## 5. Render-family guidance for the current phase

Given the updated product direction from the human architect:

- `metaball` is the current focus
- `distance_field` stays active
- one PV family stays active
- several families/modes can remain in repo but hidden

the best practical family model is:

### 5.1 Supported families

These are normal user-facing families:

- `metaball`
- `distance_field`
- one PV path only

Choose one PV path explicitly and say so in docs and UI. Do not let "PVV2/PVV3/DY4" all behave like co-equal active strategic paths indefinitely.

### 5.2 Experimental families

Still available behind dev or advanced settings:

- contour
- pixel
- graph
- canonical/vector if it is not the daily-focus family

### 5.3 Archived reference paths

Remain in repo, but not in the normal render-mode selector:

- deprecated or superseded comparison renderers
- historical references kept for visual/engineering comparison

This gives you variety without preserving conceptual chaos.

---

## 6. Recommendations for utility extraction and project structure

The utility-extraction instinct is correct, but the most important thing is to extract by semantic scope, not just by repeated text.

## 6.1 Core rule

Do not create one giant "shared utils" bucket.

Instead, place utilities where their ownership and intended reuse are obvious.

## 6.2 Recommended structure

### A. `common/src/mapgen/`

Keep only pure cross-client/server map generation and lane derivation here.

Examples:

- Delaunay connection generation
- lane waypoint generation
- path kind tagging

This folder should remain framework-free and territory-renderer-free.

### B. `pax-fluxia/src/lib/lanes/`

This should be the runtime lane-consumption layer.

Examples:

- cache
- trim-to-rim logic
- arc-length helpers
- travel path assignment
- lane drawing helpers that depend on runtime star radius/display needs

This folder should own "how the app consumes lane paths," not how mapgen creates them.

### C. `pax-fluxia/src/lib/territory/shared/`

Create this and use it for territory-family-agnostic helpers.

Good candidates:

- family registry and family input/output contracts
- corridor virtual-site builders
- ownership diff helpers
- territory tunable definitions
- diagnostics/shared runtime metadata

This becomes the neutral territory runtime layer.

### D. `pax-fluxia/src/lib/territory/vector/`

Move vector-family-specific geometry and transition helpers here over time.

This should eventually own what is currently misleadingly located in:

- `pax-fluxia/src/lib/renderers/geometry/`

Good candidates:

- Chaikin helpers
- merge/shell/frontier utilities
- vector border/morph helpers
- polygon/frontier-specific smoothing and substitution logic

Reason:

Once families are the architecture, `renderers/geometry` is the wrong semantic home for utilities that are really "vector territory family internals."

### E. `pax-fluxia/src/lib/territory/families/<family>/`

Each family keeps its own private internals close to its adapter/runtime boundary.

Example:

- `families/metaball/*`
- `families/distanceField/*`
- `families/pv/*`
- `families/vectorPolygon/*`

Only family-agnostic helpers should live outside these folders.

## 6.3 Extraction process

Do this in phases.

### Phase 1: inventory and classify

For every duplicate helper, classify it as one of:

- mapgen-shared
- lane-runtime-shared
- territory-family-shared
- vector-family-only
- family-private

Do not extract until this classification is done.

### Phase 2: no-logic-change redirects

For existing exact or near-exact duplicates:

- extract canonical function
- import it from one place
- do not change behavior in the same PR

### Phase 3: add tests for the new canonical helper

Especially for:

- lane geometry
- corridor/CX builders
- vector geometry utilities with known historical drift

### Phase 4: delete leftover copies only after adoption is complete

This prevents "half-migrated" utility duplication from lingering indefinitely.

## 6.4 Specific recommendation about the current `renderers/geometry` folder

Do not keep expanding `pax-fluxia/src/lib/renderers/geometry/` as the long-term shared home.

It is a reasonable temporary consolidation point, but its name now implies the wrong architectural center.

Long-term recommendation:

- preserve it during the current metaball/DF/PV work
- stop adding new unrelated shared helpers there
- gradually migrate vector-specific pieces under `territory/vector/`
- reserve truly general non-vector helpers for `territory/shared/` or `lanes/`

---

## 7. Documentation and queue management recommendations

The human request to better document and queue sub-features is exactly right.

The project needs fewer grand theory docs and more reliable working docs.

## 7.1 Recommended document classes

### A. Current state reports

Purpose:

- code-verified facts only

Examples:

- "what is active now"
- "current parity gaps"
- "current shortlist"

### B. Design specs

Purpose:

- desired product behavior

Examples:

- metaball border behavior
- corridor/CX visual intent
- combat-border accent rules

### C. Implementation plans

Purpose:

- ordered work sequence with explicit prerequisites

### D. Queue/backlog trackers

Purpose:

- short atomic items
- owner
- status
- verification note

## 7.2 For the current metaball phase

Create one focused queue doc for metaball sub-features and details.

It should separate:

- visual requirements
- correctness requirements
- architecture cleanup tasks
- performance/diagnostic tasks

Do not mix these into one long undifferentiated checkbox list.

Suggested sections:

- fill behavior
- border behavior
- combat/recency accents
- CX/DX behavior
- blur/filter behavior
- cache/fingerprint behavior
- family/runtime integration tasks
- visual QA cases

---

## 8. Concrete priorities I recommend next

### Priority 1: make lane-path truth canonical across MP

This is the most important parity cleanup.

### Priority 2: choose the active PV family

Do not keep the PV question fuzzy.

Pick:

- PVV2 weighted
- or PVV3
- or DY4 reference

Then define the others as experimental or archived reference.

### Priority 3: turn family architecture into a real runtime boundary

Minimal bar:

- no special-case family path in `GameCanvas`
- one territory runtime dispatcher
- one real `RenderFamilyInput` with actual ownership/tunables/transition data

### Priority 4: freeze the active shortlist and hide the rest

Keep the code, reduce the mental load.

### Priority 5: utility extraction by semantic scope

Especially:

- `territory/shared/`
- `territory/vector/`
- `lanes/`

### Priority 6: build a visual acceptance harness

You need a small set of fixed scenarios with expected outcomes.

Examples:

- lane passes near third star
- cross-owner lane corridor behavior
- conquest border/fill continuity
- world-edge/front continuity
- MSR around isolated star

Without this, architecture discussions will keep outrunning trust.

---

## 9. Final position

The project is not suffering from a lack of cleverness.

It is suffering from:

- too many simultaneously active abstractions
- too many equally visible render paths
- too much undocumented distinction between "supported", "experimental", and "historical"
- one important parity gap between SP and MP

The right move now is not to shrink the renderer imagination of the project.

It is to make the architecture honest:

- shortlist what is actually active
- give shared contracts real data
- keep vector-specific abstractions scoped
- move duplicated utilities into semantically correct homes
- make multiplayer match the new lane-path model

That is the path most likely to produce both the visual quality you want and the long-term comprehensibility you want.
