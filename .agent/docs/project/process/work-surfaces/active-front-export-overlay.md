# Active Front Export / Overlay Work Surface

## Scope

This map covers the active-front diagnostics path for:

- live overlay in `GameCanvas`
- transition package render export
- package JSON manifest / README

## Entry Points

1. Live runtime output
   - `pax-fluxia/src/lib/territory/runtime/TerritoryRuntimeCoordinator.ts:220`
   - writes `activeFrontPlan` into runtime output
   - `pax-fluxia/src/lib/territory/runtime/TerritoryRuntimeCoordinator.ts:230`
   - writes `activeFrontDebug` into compact extra diagnostics

2. Live map overlay
   - `pax-fluxia/src/lib/components/game/GameCanvas.svelte:4680`
   - `renderActiveFrontDebugOverlay(...)`
   - `pax-fluxia/src/lib/components/game/GameCanvas.svelte:6720`
   - called from frame render using `canonicalDebugRuntimeOutput`

3. Package export
   - `pax-fluxia/src/lib/territory/devtools/TransitionBundleSerializer.ts:684`
   - `renderExportCanvas(...)`
   - `pax-fluxia/src/lib/territory/devtools/TransitionBundleSerializer.ts:884`
   - `downloadDiagnosticPackage(...)`

## Key Files

### 1. Transition bundle exporter

- File:
  - `pax-fluxia/src/lib/territory/devtools/TransitionBundleSerializer.ts`
- Key seams:
  - `500` `buildDiagnosticManifest(...)`
  - `556` `buildDiagnosticReadme(...)`
  - `684` `renderExportCanvas(...)`
  - `701` `downloadBundle(...)`
  - `884` `downloadDiagnosticPackage(...)`
- Why:
  - this is the package generator
  - if a render or JSON file is missing from the bundle, the change is usually here

### 2. Adapter routing for diagnostic renders

- File:
  - `pax-fluxia/src/lib/territory/devtools/TransitionDiagnosticsAdapters.ts`
- Key seams:
  - `458` `drawActiveFrontReferenceFrame(...)`
  - `569` `renderActiveFrontDiagnosticCanvas(...)`
  - `715` `activeFrontLiveCaptureAdapter`
  - `755` `renderSupplementalCanvases(bundle)`
- Why:
  - this is where active-front-specific render overlays are drawn for export
  - add or change package render frames here

### 3. Snapshot capture source

- File:
  - `pax-fluxia/src/lib/territory/devtools/TransitionSnapshotRecorder.ts`
- Key seam:
  - `37` `activeFrontPlan` on captured context
- Why:
  - if export is missing source transition truth, check capture here first

### 4. Runtime source of truth

- File:
  - `pax-fluxia/src/lib/territory/runtime/TerritoryRuntimeCoordinator.ts`
- Key seams:
  - `172` state carries `activeFrontPlan`
  - `220` output includes `activeFrontPlan`
  - `230-231` compact export diagnostics include `activeFrontDebug` and compact plan
  - `266-277` returned runtime output exposes active-front state
- Why:
  - if the overlay/export is empty, verify the runtime is actually emitting plan/debug data

### 5. Live map overlay host

- File:
  - `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- Key seams:
  - `2108` `canonicalDebugRuntimeOutput`
  - `4680` `renderActiveFrontDebugOverlay(...)`
  - `6442` writes canonical runtime output into debug snapshot
  - `6720` perimeter/territory debug overlay call site
  - `8603-8609` AF HUD legend markup
- Why:
  - if the live overlay is missing or stale, the problem is usually here

## Read / Write Flow

1. Territory runtime computes:
   - `activeFrontPlan`
   - `activeFrontDebug`

2. Runtime output is exposed to:
   - live overlay in `GameCanvas`
   - snapshot recorder / export bundle

3. Export path then splits:
   - JSON manifest / compact files in `TransitionBundleSerializer.ts`
   - image overlays through `TransitionDiagnosticsAdapters.ts`

## Hot Edit Seams

1. Add a new package render:
   - `TransitionDiagnosticsAdapters.ts`
   - `activeFrontLiveCaptureAdapter.renderSupplementalCanvases(...)`

2. Add that render to the zip / standalone export:
   - `TransitionBundleSerializer.ts`
   - `downloadDiagnosticPackage(...)`
   - `downloadBundle(...)`

3. Change legend content:
   - `TransitionDiagnosticsAdapters.ts`
   - `drawActiveFrontHudLegend(...)`
   - and/or `GameCanvas.svelte` HUD markup

4. Fix missing live overlay:
   - `GameCanvas.svelte`
   - `canonicalDebugRuntimeOutput`
   - `renderActiveFrontDebugOverlay(...)`

## Known Traps

1. Live overlay and package export are separate paths.
   - fixing one does not fix the other

2. `compact_diag.json` is not enough for visual diagnosis.
   - snap cases often need a dedicated render frame

3. `activeFrontDebug` can exist while the actual render bundle still omits the useful image.
   - check adapter supplemental canvases

4. `canonicalRuntimeOutput` / `canonicalDebugRuntimeOutput` scope bugs in `GameCanvas` have already happened multiple times.
   - verify the actual variable used at the final call site
