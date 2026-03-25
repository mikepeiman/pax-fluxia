# Territory Engine Native Stage Dispatch Epic (2026-03-12)

## Branch
- `codex/territory-engine-epic-native-stage-dispatch`

## Scope Delivered
- Added shared runtime and native-stage executor contracts in `pax-fluxia/src/lib/territory-engine/types.ts`.
- Added native dispatch registry in `pax-fluxia/src/lib/territory-engine/methods/index.ts`.
- Refactored `pax-fluxia/src/lib/territory-engine/engine.ts` to call `executeNativeTerritoryStage(...)` instead of importing FG2 directly.
- Migrated `pax-fluxia/src/lib/territory-engine/methods/fg2SeedGraph.ts` to the shared runtime contract.
- Re-exported the new runtime/executor types from `pax-fluxia/src/lib/territory-engine/index.ts`.

## Why This Matters
- The engine now has a single modular hook for all native territory methods.
- Future FG/DY/HY implementations can register into one place instead of requiring bespoke engine edits.
- This keeps the step-trace and placeholder fallback behavior stable while native coverage expands.

## Current Native Dispatch State
- Registered native methods:
  - `fg2_seed_graph`
- Generic engine fallback remains responsible for:
  - placeholder stage summaries
  - legacy adapter render fallback for non-native methods

## Next Step
1. Register the next native method through the dispatch layer.
2. Start moving method-family-specific diagnostics/metadata into method modules.
3. Introduce stage-capability descriptors so the UI and trace mode can show native-vs-fallback ownership per stage.
