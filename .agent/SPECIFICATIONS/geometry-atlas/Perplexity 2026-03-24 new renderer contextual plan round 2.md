<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Good! Please make this a clear, self-contained prompt.

Implement a **Territory Transition Snapshot Recorder** for Pax Fluxia. The goal is to automatically capture conquest-related before/after screenshots plus diagnostic overlays showing which frontier/region geometry is computed as changed, so I can inspect and compare transitions visually.[^1][^2]

## Objective

Whenever a conquest event occurs, automatically generate a dated debug bundle containing:

- previous state screenshot,
- next state screenshot,
- screenshots with changed-frontier overlays,
- screenshots with planner/anchor overlays,
- metadata JSON describing the conquest and computed change set.[^1]

This is **debug tooling only**. It must not affect gameplay logic, geometry truth, or transition output. It should be implemented as a separate dev/debug utility, not buried inside legacy renderer logic.[^2][^1]

## Trigger

Use `OwnershipSnapshot.conquestEvents` as the primary trigger. For each conquest event, create one debug bundle keyed by:

- timestamp,
- tick,
- transition id if available,
- `starId`,
- `previousOwner`,
- `newOwner`.[^1]

If multiple conquest events happen in one update, produce one bundle per event unless they are already grouped by an existing transition envelope.[^1]

## Inputs to use

Use the existing runtime and transition data already present in the codebase:

- `prevSnapshot` / `nextSnapshot`
- `prevGeometryData` / `nextGeometryData`
- `prevData.frontierMap` / `nextData.frontierMap`
- `computeTerritoryDeltaContext`
- `diffFrontierMaps`
- `TerritoryTransitionPlanSet`
- `AnimatedRingPlan.diagnostics`
- `canonicalTraceStore` if useful for persistence or later browsing.[^1]

Do **not** invent alternate geometry sources. The overlays should reflect what the current geometry / transition system actually computed.[^3][^1]

## Output directory structure

Write bundles under:

- `debug/territory-transitions/YYYY-MM-DD/HHmmss_star-{starId}_{previousOwner}_to_{newOwner}_{transitionId}/`

Inside each bundle folder, save:

- `00-prev.png`
- `01-next.png`
- `02-prev-changed-frontiers.png`
- `03-next-changed-frontiers.png`
- `04-plan-anchors.png`
- `05-plan-rings.png`
- `06-composite.png`
- `meta.json`

Also maintain a top-level manifest file:

- `debug/territory-transitions/index.json`

This manifest should include one entry per captured bundle with enough metadata to browse and sort later.

## Required screenshots

### 1. Previous state

Render the previous territory state exactly as the player would see it immediately before the conquest.

Save as:

- `00-prev.png`


### 2. Next state

Render the next territory state exactly as the player would see it immediately after the conquest.

Save as:

- `01-next.png`


### 3. Previous state with changed-frontier overlay

Render the previous state and overlay the geometry/transition diff results. At minimum show:

- changed frontier sections,
- unchanged frontier sections if available,
- changed regions or affected territories if available,
- conquered star position.[^1]

Save as:

- `02-prev-changed-frontiers.png`


### 4. Next state with changed-frontier overlay

Same as above, but on the next-state render.

Save as:

- `03-next-changed-frontiers.png`


### 5. Planner anchors overlay

Render a diagnostic view that shows:

- patch anchors,
- changed windows,
- anchor points from `PatchMorphPlan`,
- conquest star position,
- any useful splice window endpoints.[^1]

Save as:

- `04-plan-anchors.png`


### 6. Planner/ring diagnostics overlay

Render a diagnostic view that shows:

- ring ids,
- ring transition kind (`unchanged`, `splice-replace`, `splice-insert`, `splice-delete`, `fallback-snap`),
- affected territory ids,
- optionally labels for owner pair keys,
- optionally sample counts / static vs changed sample counts if already available from diagnostics.[^1]

Save as:

- `05-plan-rings.png`


### 7. Composite sheet

Create one combined image that lays out the key panels side-by-side for quick browsing:

- prev,
- next,
- prev with changed overlay,
- next with changed overlay,
- anchors,
- ring diagnostics.

Include a small visual legend in the composite.

Save as:

- `06-composite.png`


## Overlay visual rules

Make the overlays intentionally bold and diagnostic, not subtle.

Use the following default colors:

- **Changed frontier:** thick red
- **Unchanged matched frontier:** thick green
- **Inserted frontier:** orange
- **Deleted frontier:** purple
- **Anchors:** cyan circles
- **Conquered star:** yellow marker
- **Optional labels / diagnostics text:** white or bright contrasting color

Suggested styling:

- line width 5–8 px for changed frontier,
- line width 3–5 px for unchanged frontier,
- anchor circles radius 6–10 px,
- small text labels near anchors / ring centers.

If owner-pair labels or ring ids are shown, make them readable and non-overlapping where possible.

## `meta.json` contents

Save a `meta.json` file with at least:

- timestamp
- tick
- transition id
- transition mode if available
- `starId`
- `previousOwner`
- `newOwner`
- prev ownership version
- next ownership version
- prev geometry version / fingerprint
- next geometry version / fingerprint
- `changedSiteIds`
- `affectedTerritoryIds`
- conquest event payload
- changed frontier edge ids if available
- changed owner pair keys if available
- list of ring transition kinds
- anchor coordinates
- diagnostics summary
- path(s) to generated PNGs

If available, include:

- `AnimatedRingPlan.diagnostics`
- frontier-map diff summary
- counts of changed/unchanged/inserted/deleted frontiers.[^1]


## Suggested implementation modules

Create a focused devtools pipeline, e.g.:

- `devtools/TerritoryTransitionSnapshotRecorder.ts`
- `devtools/renderTerritoryDebugOverlay.ts`
- `devtools/saveTransitionDebugBundle.ts`
- `devtools/buildTransitionDebugComposite.ts`

The recorder should be called from a clean orchestration point such as `TerritoryEngineController` after conquest detection and transition plan creation, not embedded directly into `PowerVoronoiRenderer.ts` unless absolutely necessary.[^2][^1]

## Recommended call timing

For each conquest event:

1. Capture / reference previous snapshot and geometry.
2. Compute next geometry and transition plan.
3. Generate overlays from:
    - frontier diff,
    - delta context,
    - transition plan,
    - ring diagnostics.
4. Render all required images.
5. Save images + `meta.json`.
6. Append an entry to `debug/territory-transitions/index.json`.
7. Emit a concise console log summarizing:
    - conquest,
    - transition mode,
    - output folder path,
    - changed frontier count,
    - affected territory count.

## Implementation constraints

- Debug-only feature.
- No mutation of authoritative geometry or transition results.
- No renderer-global hidden state.
- Must work even if no screenshot capture existed previously.
- Must degrade gracefully if some diagnostics are absent; still save the bundle with partial overlays and note missing fields in `meta.json`.[^4][^1]


## Phase 1 acceptance criteria

Phase 1 is complete when the system can reliably produce, for each conquest:

- prev screenshot,
- next screenshot,
- changed-frontier overlays,
- conquest marker,
- metadata JSON,
- folder creation + manifest update.

Even if planner anchors/ring annotations are minimal at first, the bundle should already be useful for visual inspection.

## Phase 2 enhancements

After Phase 1 works, add:

- planner anchor overlays from `PatchMorphPlan`,
- ring diagnostics overlays from `AnimatedRingPlan.diagnostics`,
- multi-frame capture across transition progress (e.g. `t=0, .15, .35, .5, .65, .85, 1.0`),
- per-mode comparison folders when multiple transition modes exist,
- optional frontier-mask / raster-diff debug images for future RT/field transition experiments.


## Important note

The purpose of this tool is to let me visually inspect:

1. what the game looked like before and after a conquest,
2. what the system believes changed,
3. where the transition planner thinks anchors and changed windows are.

The screenshots and overlays should make disagreements between geometry, diffing, and planner logic obvious at a glance.

<div align="center">⁂</div>

[^1]: TERRITORY_TRANSITION_INVENTORY.md

[^2]: TERRITORY_CLEAN_ARCHITECTURE_BLUEPRINT.md

[^3]: GEOMETRY_0319_AGENT_PROMPT.md

[^4]: 2026-03-16-NotebookLM-Pax-Fluxia-Territory-Architecture-and-Modernization-Schema-2.md

