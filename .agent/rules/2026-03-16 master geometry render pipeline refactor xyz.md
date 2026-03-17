---
trigger: always_on
---

Use Planning mode. 
Follow .agent/agent.md
Use MCP atlas-harness for CLI work where possible.

Follow this exact architecture:

Canonical pipeline:
MetricState -> FrontierGraph -> TerritoryRegions -> RenderCaches.

Compiler rules:

NO rendering in compiler.

NO PIXI imports in compiler.

NO placeholder or fallback geometry.

NO config mutation.

Return typed data only.

Canonical truth:
CanonicalTerritoryState is the only territory truth.
It must contain at least:

metric or metricTruth

frontierGraph

regions

transitionActive.

Render rules:

FillMeshCache and BorderMeshCache are caches only, never truth.
​

Fills and borders must both derive from the exact same canonical frontier/region data for the same frame.

Renderer must not compute ownership or invent geometry.

State rules:

NO module-level mutable renderer state.

NO global animation state.

Use class-encapsulated renderer instances and explicit transition plans.

Required files:

TerritoryCompiler.ts

metricStage.ts

frontierStage.ts

regionStage.ts

TerritoryTransitionPlanner.ts

TerritoryRenderer.ts

TerritoryEngineController.ts

TerritoryTraceStore.ts

buildBorderMeshCache.ts

buildFillMeshCache.ts.

If needed, also create:

BorderLayerRenderer.ts

OwnerFillLayerRenderer.ts

TerritoryStepRunner.ts

TerritoryLegacyBridge.ts.

Implementation rule:
Preserve layer separation strictly. If a stage is incomplete, return a typed error or notImplemented status rather than fabricating geometry.
​

Validation rule:
Test:

graph-native ownership,

shared frontier uniqueness,

fill/border derivation from one source,

no module-level mutable state,

transition alignment.

Implement strictly.