# Territory Engine Trace Inspector (2026-03-12)

## Summary
Added a live territory-engine trace inspector to the territory settings UI so trace and step-mode runs are inspectable without reading console output.

## Files
- `pax-fluxia/src/lib/territory-engine/traceStore.ts`
- `pax-fluxia/src/lib/territory-engine/engine.ts`
- `pax-fluxia/src/lib/territory-engine/types.ts`
- `pax-fluxia/src/lib/territory-engine/index.ts`
- `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`

## What Changed
- Added a writable Svelte store, `territoryTraceRun`, for the last published territory-engine trace run.
- Extended `TerritoryTraceRun` to include the full `artifacts` snapshot.
- Engine trace publication now updates both the in-memory getter and the live store.
- Added a `Trace Inspector` block under territory-engine controls.
- The inspector surfaces:
  - run id
  - completed stages vs total pipeline stages
  - next stage label
  - selected mode/static method
  - total run duration
  - trace meta summary
  - owner-region preview lines
  - artifact summaries
  - per-stage step summaries

## Why
- The engine already had trace/step infrastructure, but there was no first-class UI consumer.
- This creates an actual demo/debug surface for the modular territory architecture.

## Verification
- Targeted `bun run check` for `src/lib/territory-engine/*` and the territory controls returned no territory-engine errors.
- Remaining warnings were pre-existing unused CSS selectors in `ControlsSection-Territory.svelte`.

## Demo
Enable:
- `TERRITORY_ENGINE_ENABLED=true`
- `TERRITORY_ENGINE_TRACE_MODE=true`
- optionally `TERRITORY_ENGINE_STEP_MODE=true`
- `TERRITORY_ENGINE_STATIC_METHOD='fg2_seed_graph'`

Then open the Territory section and inspect the `Trace Inspector` block while changing territory settings or stepping the pipeline.
