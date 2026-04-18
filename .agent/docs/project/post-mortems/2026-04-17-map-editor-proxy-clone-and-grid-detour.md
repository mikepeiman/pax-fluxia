# Post-Mortem - 2026-04-17 - Map Editor Proxy Clone And Grid Detour

## Summary

The new map editor shipped with a direct interaction failure: clicking the canvas to place a star threw a `DataCloneError`, so the editor appeared inert. While debugging that failure, I also spent time speculating about hex-geometry mismatch instead of following the concrete runtime exception first.

## Cause

- `mapEditorStore.svelte.ts` used `structuredClone(map)` on a Svelte rune-backed proxy object.
- `structuredClone` cannot clone the proxy host object, so any code path that cloned the live editor document crashed before mutating state.
- At the same time, the grid investigation drifted into speculative geometry discussion before the placement exception was resolved.

## Mistaken Reasoning

- I treated the visible “grid is wrong” report as the primary blocker even after the user reported that placement itself was dead.
- I stated likely causes around geometry parity without first closing the explicit console exception the user had already supplied.
- That violated the project rule that user observations are ground truth and that concrete failures take priority over inferred ones.

## Diagnostic Method

1. Follow the user-supplied stack trace:
   - `cloneMap`
   - `normalizeDocument`
   - `refreshSources` / `placeStar`
2. Confirm that the cloned object was a rune proxy, not a plain snapshot.
3. Replace direct proxy cloning with `structuredClone($state.snapshot(map))`.
4. Re-check canvas interaction after the exception path was removed.

## Fix

- `cloneMap()` now snapshots the rune-backed map state before cloning.
- Follow-up editor work now stores stable grid coordinates (`gridQ/gridR`) for authored stars so grid-size changes use lattice identity instead of stale screen-space positions.

## Derived Rule

- When a user provides a concrete runtime exception, resolve that exception path before theorizing about secondary visual causes.
- Never pass live rune proxies to `structuredClone`; snapshot reactive state first.
- For lattice-authored editor data, persist lattice coordinates and derive screen coordinates from them. Do not treat snapped screen coordinates as the authored source of truth.
