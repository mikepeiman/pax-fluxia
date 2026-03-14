# Architect Review V2

## Purpose

This document is the architect-facing review for the Territory Engine Master Plan Bundle V2. It records the key architectural corrections learned from implementation, the current runtime truth in the repo, the major remaining risks, and the contract changes needed to make the 15-mode system easier to execute, reason about, and delegate.

## Core Architectural Correction

The most important correction is this:

- `FG*`, `DY*`, and `HY*` are method and orchestration identities.
- `PVV2`, `PVV3`, and `DF` are backends and renderer hosts.
- A method is not a backend.
- A backend is not a method.

Earlier planning language blurred these layers by treating backend choice and method identity as if they were the same thing. That was manageable while everything was adapter-heavy, but it is now actively misleading because `PVV3` is in active development and already acts as a direct consumer of native FG2 artifacts.

## Current Repo Truth

### Route truth

The runtime currently has three mutually exclusive live route families:

- `static`
- `dynamic`
- `hybrid`

Only one of them is active at a time.

Within those families:

- `static` uses the selected `FG*` method.
- `dynamic` uses the selected `DY*` method, and that dynamic method determines its anchor static geometry route.
- `hybrid` uses the selected `HY*` plan, and that plan determines both the static and dynamic legs.

This means a visible combination in the UI is not automatically a real live combination. For example, selecting `FG1` while `DY5` is active does not produce a true `FG1 + DY5` route. `DY5` currently anchors to `FG2`.

### Native method truth

`FG2 Seed Graph` is the only native end-to-end method in the territory-engine pipeline today. It already performs meaningful metric, frontier, holding, trace, and fill work in-engine.

The rest of the 15 modes are still partial. They are present in the registry and useful for comparison, but they are currently realized through backend-specific adapter or placeholder paths rather than their own native pipelines.

### Backend truth

The backends are all still in active use, but not in equal maturity:

- `PVV2` remains a maintained comparator backend and legacy-path compatibility surface.
- `PVV3` is an active runtime/backend and should be treated as the primary frontier-first renderer host under active development.
- `DF` remains a maintained field-oriented comparator backend and an important contrast path for field-heavy ideas.

`PVV3` must not be described as a legacy bucket in new planning language.

## Architectural Target

### Planning language updates

The planning model should converge on the following vocabulary:

```ts
export type TerritoryBackendId = 'pvv2' | 'pvv3' | 'df';

export interface TerritoryBackendCapabilities {
  consumesCanonicalFrontiers: boolean;
  consumesHoldings: boolean;
  supportsStaticRoute: boolean;
  supportsDynamicRoute: boolean;
  supportsHybridRoute: boolean;
  supportsTraceInspector: boolean;
  supportsStepMode: boolean;
  supportsBackendNativeFallback: boolean;
}

export interface TerritoryBackendDescriptor {
  id: TerritoryBackendId;
  label: string;
  capabilities: TerritoryBackendCapabilities;
  currentResponsibilities: string[];
  targetResponsibilities: string[];
}

export interface TerritoryResolvedRoute {
  mode: 'static' | 'dynamic' | 'hybrid';
  staticMethodId: TerritoryStaticMethodId;
  dynamicMethodId: TerritoryDynamicMethodId | null;
  hybridPlanId: TerritoryHybridPlanId | null;
  backendId: TerritoryBackendId;
  reason: string[];
}
```

These types do not need to be implemented in code immediately, but the bundle should treat them as the target planning contract.

### Separation model

The intended separation is:

1. Resolve the live route.
2. Resolve the backend.
3. Run or adapt the method.
4. Publish canonical artifacts.
5. Let the backend render those artifacts or fall back explicitly.

That is cleaner than today’s mixed registry semantics and makes backend parity measurable.

## What Has Been Proven So Far

- A native frontier/holding path is viable.
- FG2 can already produce real user-visible value and support trace inspection.
- Backend-specific renderer behavior can diverge from method truth, which means validation must include route-truth and screenshot checks.
- The settings UI can mislead users about combinations if route exclusivity is not surfaced clearly.
- Border/fill alignment is a separate validation surface from route correctness.

## Main Bottlenecks

| Bottleneck | Why it matters | Impact |
| --- | --- | --- |
| Only FG2 is native | Limits serious apples-to-apples comparison across the 15 methods | High |
| Route truth is partially implicit | Makes UI combinations easy to misunderstand | High |
| Backend parity is informal | Different backends can drift in border, fill, and animation behavior | High |
| Dynamic identity continuity is not generalized | Spawn, split, merge, and vanish behavior will remain brittle | High |
| Validation is still mostly manual | Visual regressions can survive code checks | Medium |

## Major Risks

| Risk | Failure mode | Mitigation |
| --- | --- | --- |
| Method/backend confusion persists | Planning and execution tickets target the wrong layer | Make the new bundle the explicit source of truth |
| PVV3 is treated as legacy | New work gets routed away from the active renderer host | Reclassify PVV3 in every new planning artifact |
| Dynamic routes remain adapter-heavy | Animation bugs get blamed on frontier math alone | Split static truth tasks from dynamic continuity tasks |
| Visual validation stays optional | Gap/alignment defects survive into demos | Make browser and screenshot checks mandatory |
| Historical docs remain unqualified | Agents inherit stale assumptions or merge-conflict junk | Track cleanup under `ARC-006` |

## Delivery Guidance

The next execution phase should not start with broad architecture discussions. It should start with bounded packets that each satisfy all of the following:

- one exact objective
- one owning document
- one primary subsystem
- exact files likely to change
- explicit acceptance checks
- explicit browser/screenshot requirements
- clear non-goals and stop conditions

That is the threshold at which a strong LLM agent can reliably one-shot the work.

## Review Questions

Before approving later execution packets, verify these questions have clear answers:

1. Does the packet distinguish method work from backend work?
2. Does it identify the actual live route, not just the visible UI choice?
3. Does it specify which backend must be validated?
4. Does it say what canonical artifacts are expected?
5. Does it require screenshots or only code checks?
6. Does it preserve the rule that `PVV3` is an active backend, not a legacy bucket?

## Decision Summary

- Keep the 15 method IDs unchanged.
- Reclassify `PVV2`, `PVV3`, and `DF` as equal maintained backends in planning.
- Treat `PVV3` as an active runtime/backend and renderer host.
- Preserve runtime mode exclusivity.
- Use `holding` and `component` as the primary geometry language.
- Push future work into bounded execution packets rather than broad roadmap prose.
