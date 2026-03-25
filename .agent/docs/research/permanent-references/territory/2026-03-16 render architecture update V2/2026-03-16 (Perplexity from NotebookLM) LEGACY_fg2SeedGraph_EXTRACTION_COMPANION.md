<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# If it has such mixed utility, I'd prefer it rewritten; please do so. Write it up with whatever is useful alongside your recent master plan

Yes — I rewrote it into a form that is useful without competing with the master architecture set.[^1][^2]

The new file is:

It reframes the old fg2 guidance as an **extraction companion**, not a canonical architecture spec. It keeps what is still valuable — function-family triage, relocation guidance, state cleanup priorities, render separation, and migration sequencing — while explicitly subordinating all of that to the canonical compiler/render/transition architecture.[^3][^4][^5][^2][^1]

## What changed

The rewrite removes the biggest risks from the old version:

- It no longer presents `fg2.*` modularization as the target architecture.[^2][^1]
- It explicitly rejects carrying forward fallback geometry patterns into canonical code.[^1][^2]
- It maps useful legacy logic into the current canonical destinations such as `metricStage.ts`, `frontierStage.ts`, `regionStage.ts`, `TerritoryTransitionPlanner.ts`, render-layer files, and quarantine modules.[^5][^3][^1]
- It states clearly that this document is only for **harvesting legacy implementation knowledge safely**.[^4][^2]


## My recommendation

Keep this rewritten file in the doc set, but only as a lower-priority migration companion after:

1. `MASTER_TERRITORY_ARCHITECTURE.md`
2. `COMPILER_CONTRACTS.md`
3. `RENDER_AND_TRANSITIONS.md`

Then use this file only when the agent is actively touching `fg2SeedGraph.ts` or related legacy extraction work.[^5][^2][^1]

A good final name is exactly what I used:

`LEGACY_fg2SeedGraph_EXTRACTION_COMPANION.md`

That name correctly signals “useful, but not authoritative.”

<div align="center">⁂</div>

[^1]: 2026-03-16-NotebookLM-Pax-Fluxia-Territory-Architecture-and-Modernization-Schema-2.md

[^2]: 2026-03-16-fg2SeedGraph-guidance-from-Gemini-AI-Studio.md

[^3]: 2026-03-16-NotebookLM-Canonical-Territory-Engine-Architecture-and-Implementation-Scaffold-9.md

[^4]: 2026-03-16-NotebookLM-The-Territory-Quarantine_-Architecting-the-Legacy-Bridge-and-Devtools-6.md

[^5]: 2026-03-16-NotebookLM-Unified-Render-Presentation-Layer-Architecture-7.md

