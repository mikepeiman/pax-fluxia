# Current State Matrix

## Purpose

This matrix records the current implementation truth for all 15 territory methods and all 3 maintained backends. It is intentionally explicit about what is native, what is adapter-backed, what is demo-ready, and what still blocks meaningful comparison.

## Route Truth

These rules override casual UI interpretation:

- `static`, `dynamic`, and `hybrid` are mutually exclusive live routes.
- The selected `FG*` method only controls the route when `static` mode is active.
- The selected `DY*` method controls the live route when `dynamic` mode is active, including its anchor static geometry route.
- The selected `HY*` plan controls the live route when `hybrid` mode is active, including both its static and dynamic legs.
- `FG1 + DY5` is not currently a real live combination. `DY5` currently anchors to `FG2`.

## Static Methods

| Method | Current status | Current backend reality | Demo readiness | Main blockers | Intended backends |
| --- | --- | --- | --- | --- | --- |
| `FG1 Adaptive Field` | Partial | Adapter-backed render/comparator path, currently routed through `PVV2` | Limited comparison only | No native modified-distance field pipeline yet | `PVV2`, `PVV3`, `DF` |
| `FG2 Seed Graph` | Native | In-engine native pipeline with direct consumption by `PVV3` and explicit engine route | Strongest current demo path | Residual fill/border alignment, holding identity hardening | `PVV2`, `PVV3`, `DF` |
| `FG3 Implicit Trace` | Partial | Adapter-backed field route, currently routed through `DF` | Limited comparison only | No native implicit contour pipeline yet | `PVV2`, `PVV3`, `DF` |
| `FG4 Pairwise Arrangement` | Partial | Adapter-backed comparison route, currently routed through `PVV2` | Limited comparison only | No native arrangement graph pipeline yet | `PVV2`, `PVV3`, `DF` |
| `FG5 RT-Assisted Publish` | Partial | Adapter-backed RT/field route, currently routed through `DF` | Limited comparison only | No native RT publish pipeline yet | `PVV2`, `PVV3`, `DF` |

## Dynamic Methods

| Method | Current status | Current backend reality | Anchor static route today | Demo readiness | Main blockers |
| --- | --- | --- | --- | --- | --- |
| `DY1 Span Graph Morph` | Partial | Adapter-backed dynamic path through `PVV3` | `FG2` | Comparison only | No native correspondence and playback contract |
| `DY2 Local Delta Patch` | Partial | Adapter-backed dynamic path through `DF` | `FG3` | Comparison only | No native dirty-window and seam-stitch pipeline |
| `DY3 Field Interp Stabilized` | Partial | Adapter-backed dynamic path through `DF` | `FG3` | Comparison only | No native field cache and stabilizer pipeline |
| `DY4 Optimal Transport` | Partial | Adapter-backed dynamic path through `PVV2` | `FG1` | Comparison only | No native transport approximation and publish path |
| `DY5 Corridor Event Decomposition` | Partial | Adapter-backed dynamic path through `PVV3` | `FG2` | Verified route comparison path | No native event taxonomy and dirty-region manager yet |

## Hybrid Plans

| Plan | Current status | Current backend reality | Static leg today | Dynamic leg today | Demo readiness | Main blockers |
| --- | --- | --- | --- | --- | --- | --- |
| `HY1 Static Backbone + Dynamic Refine` | Partial | Adapter-backed hybrid path through `PVV2` | `FG1` | `DY1` | Comparison only | Native composition contract absent |
| `HY2 Seed Graph + Local Delta` | Partial | Adapter-backed hybrid path through `PVV3` | `FG2` | `DY2` | Verified route comparison path | Native patch composition absent |
| `HY3 Implicit Field + Transport` | Partial | Adapter-backed hybrid path through `DF` | `FG3` | `DY4` | Comparison only | Native smoothness/cost composition absent |
| `HY4 Pairwise + Patch + Transport` | Partial | Adapter-backed hybrid path through `PVV2` | `FG4` | `DY4` | Comparison only | Native gating and exactness rules absent |
| `HY5 RT Publish + Corridor Events` | Partial | Adapter-backed hybrid path through `DF` | `FG5` | `DY5` | Comparison only | Native high-load dirty-region publish absent |

## Backend Matrix

| Backend | Current role | Current strengths | Current weaknesses | Target parity responsibility |
| --- | --- | --- | --- | --- |
| `PVV2` | Maintained comparator and compatibility backend | Stable comparison surface, helpful for legacy baseline checks | Not the active frontier-first host, still adapter-heavy | Render and validate all demo-ready routes without truth drift |
| `PVV3` | Active runtime/backend and renderer host | Direct FG2 artifact consumption, active development focus, best path for frontier-first iteration | Mixed native/adapter semantics still need cleanup | Become the clearest first-class consumer of canonical frontiers and holdings |
| `DF` | Maintained field-oriented comparator backend | Useful for field-heavy concepts and contrast testing | Still mostly adapter-heavy, not yet canonical artifact first | Reach backend parity for field-based methods and diagnostics |

## Most Important Truths To Preserve

1. `FG2` is the only native end-to-end method today.
2. `PVV3` is not legacy. It is an active backend.
3. UI selections do not override route truth.
4. Route truth must be explained in docs and validated in-browser.
5. Backend parity is a deliverable, not an assumption.

## Immediate Planning Consequence

This matrix implies a phased execution strategy:

- Harden `FG2` as the canonical reference path.
- Turn the remaining static methods into native publishers.
- Add shared dynamic identity and event substrate.
- Rebuild dynamic and hybrid methods on that substrate.
- Drive backend parity and visual validation as separate tracked work.
