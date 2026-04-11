# Master Program Plan - 2026-04-11

## Purpose

Build a coherent long-horizon program for Pax Fluxia that:

- restores and preserves architectural trust
- enforces zero meaningful SP/MP divergence for shared game truth
- keeps multiple territory render families without letting the codebase become unreadable
- reduces agentic token waste and context waste through deterministic caching and better context packaging
- replaces document sprawl with a smaller, more potent planning and reference system
- prepares a credible path toward agentic workflow support, curated fixture maps, and a custom map editor

This document is the rolling master plan for 2026-04-11 and should be updated as new resource dumps, decisions, and workstreams are integrated.

---

## Implementation Status

### Steps 1-3 completed in this slice

The following concrete outputs now exist:

- workflow inventory:
  - `.agent/docs/project/implementation-plans/2026-04-11/WORKFLOW_SURFACE_INVENTORY_2026-04-11.md`
- workflow installation spec:
  - `.agent/docs/project/implementation-plans/2026-04-11/WORKFLOW_INSTALLATION_SPEC_2026-04-11.md`
- static agentic config surface:
  - `.agent/agentic/config.json`
  - `.agent/agentic/context-manifest.json`
  - `.agent/agentic/models.json`
  - `.agent/agentic/README.md`
- deterministic context/cache tooling:
  - `tools/agentic/context-pack.ts`
  - `tools/agentic/build-context-pack.ts`
  - `tools/agentic/benchmark-context-cache.ts`

### What was normalized

- root workspace scripts were normalized to Bun:
  - `package.json`
- the server workspace no longer uses `npx tsx` in `dev:node`:
  - `pax-server/package.json`
- generated cache state and metrics are now ignored:
  - `.gitignore`

### What validation proved

- stable artifact generation works
- content-hash invalidation works
- cold build regenerated all 4 stable artifacts
- warm build reused all 4 stable artifacts
- benchmark output is written to:
  - `.agent-harness/metrics/context-benchmark-latest.md`
- cache metadata is written to:
  - `.agent-harness/context-cache/cache-manifest.json`

---

## Grounded Facts As Of This Round

### Repo and agentic context reality

- The repo contains a very large stable context corpus in `.agent/`, `.atlas/`, and `.agent/docs/`.
- The repo contains external tool integration surfaces:
  - `.agent/mcp_config.json`
  - `.cursor/hooks.json`
  - `.gemini/settings.json`
  - `.entire/settings.json`
- Entire has now been reviewed against its official docs and should be treated explicitly as a real incumbent checkpoint/history layer, not as incidental residue:
  - [entire.io](https://entire.io/)
  - [Entire docs](https://docs.entire.io/introduction)
  - [Codex integration (preview)](https://docs.entire.io/integrations/codex)
- The repo already has an incumbent hook/event layer:
  - `.cursor/hooks.json` routes Cursor lifecycle events through `entire hooks cursor ...`
  - `.gemini/settings.json` routes Gemini lifecycle hooks through `entire hooks gemini ...`
  - `.entire/settings.json` is enabled, so `entire` is not theoretical here; it is live wiring
- The repo also contains a large preexisting workflow corpus under `.agent/workflows/`, much of it BMAD-oriented, which means workflow setup is partly a migration and reduction problem, not a blank-slate install.
- The repo does **not** currently expose an obvious in-repo provider client or prompt-orchestration runtime that can simply be patched for caching.
- There is already a local state/log area in `.agent-harness/` that proves this repo tolerates workspace-local dynamic agent state.
- There is already a deterministic markdown inventory pipeline in `.agent/docs/project/implementation-plans/2026-04-08/doc-audit/`, which is the best current precedent for memoized derived context.

### Game and architecture reality already established

- Shared authoritative gameplay logic already lives in `/common`, and that remains the correct long-term direction.
- A real SP/MP parity gap exists around curved lane path data, because single-player preserves lane path geometry while multiplayer currently drops it during schema/client reconstruction.
- Territory-family work is partially migrated:
  - `RenderFamily` and registry scaffolding exist
  - `GameCanvas.svelte` is still carrying too much runtime routing responsibility
- Current active territory direction:
  - `metaball` is the immediate focus
  - `distance_field` remains active
  - one PV-family path should remain active
- The 4-layer architecture is now understood as vector-family-specific, not the universal master architecture.

### Documentation reality

- There is too much useful material spread across too many first-class docs.
- Some documentation indexes already drift from repo reality.
- The doc audit tooling and outputs are valuable raw material, but not yet a finished operating system for the project.

---

## Newly Integrated Direction From Harness Research

The external harness research is useful, but it should be **integrated**, not copied blindly.

The correct synthesis is:

- Codex Desktop remains the human-facing shell.
- Pi is now the leading candidate for the outer harness/runtime layer.
- `atlas-harness` is already a serious local asset and should be treated as the main action + enforcement substrate, not as an incidental MCP sidecar.
- The repo itself should own the deterministic project context layer, cache-aware context packaging, and maintainable configuration surface.
- The chosen outer harness should consume those repo-owned context artifacts rather than re-deriving project understanding ad hoc on every task.

### Capability ownership

- **Codex Desktop**: main UI shell for the human.
- **Pi**: preferred outer harness candidate for orchestration, session control, model routing, and extensibility.
- **OMO**: optional comparison branch, not the primary direction.
- **Advisor**: planning, risk review, escalation, model-class recommendation.
- **Executor**: code/task execution.
- **LightRAG**: default retrieval layer for code/docs/notes/post-mortems.
- **RAG-Anything**: optional multimodal extension only when explicitly requested.
- **OpenSpace**: reusable skills, workflow harvest, reusable post-mortem memory.
- **atlas-harness**: action substrate, workspace tool server, and methodology-enforcement plane.
- **CLI-Anything**: optional complementary command abstraction only if it fills a real gap that atlas-harness does not already cover.
- **Repo-local context/cache layer**: deterministic stable-context generation, memoization, metrics, invalidation, benchmarkability.

This ownership map matters because it prevents overlapping tools from turning into overlapping responsibilities.

### Atlas Harness findings that change the plan

The local environment now confirms several facts:

- A globally installed `atlas-harness` command exists locally:
  - `C:/Users/mikep/.bun/bin/atlas-harness.exe`
- Pax Fluxia has now been corrected to stop pointing at the deprecated local atlas-harness checkout.
- The direct command `atlas-harness --transport mcp` was verified successfully outside the sandbox from this agent session.
- The earlier failure in the sandboxed agent shell was a false negative caused by execution-context restrictions, not a true atlas-harness launcher defect.
- The repo MCP config has now been corrected to use the simple direct command path again.

The practical conclusion is:

- **Published package only** is the policy.
- The direct command path is the correct repo configuration choice here.
- The deprecated local checkout should remain removed regardless of which published-package invocation path we standardize on.
- atlas-harness quality should be tracked through a permanent active ledger, not scattered session remarks:
  - `.agent/docs/project/process/ATLAS_HARNESS_IMPROVEMENTS.md`

---

## Locked Program Decisions

### 1. Zero divergence rule

SP and MP must use the same shared generative and derived gameplay-meaningful truth from `/common`. No mocked, reconstructed, or approximate alternate truth is acceptable when the underlying data can be shared directly.

### 2. Caching is a correctness-preserving optimization

Caching work must:

- never substitute stale task-critical context
- be deterministic
- be easy to inspect
- be easy to clear
- be easy to disable
- log enough metrics to prove value

### 3. Stable context must become explicit

Prompt and context assembly should be split into layers:

- stable global agent instructions
- stable project architecture and policy context
- semi-stable repo/project summaries
- volatile task-specific context
- volatile runtime artifacts such as diffs, logs, and latest outputs

Stable layers should be normalized and memoized. Volatile layers should be appended last and never allowed to contaminate reusable stable blocks.

### 4. One rolling master plan, one same-day session note

For this project workflow:

- the rolling daily master plan is the main planning artifact
- the same-day session note captures what changed in understanding and direction

Avoid spawning fresh top-level planning docs unless a dedicated companion is truly necessary.

### 5. Multiple render families are allowed, equal prominence is not

The repo can keep several render families and experiments, but the codebase and main UI must clearly distinguish:

- active supported families
- experimental families
- archived/reference families

Hidden-but-preserved is acceptable. Simultaneously-first-class is not.

---

## Recommended Implementation Architecture

## A. Repo-local context and caching foundation

This is the first foundational workstream for token reduction and agentic support.

### Intended shape

Add a small repo-local TypeScript/Bun utility layer dedicated to deterministic context-pack generation and caching.

Recommended source layout:

- `tools/agentic/`
  - `build-context-pack.ts`
  - `stable-context.ts`
  - `volatile-context.ts`
  - `cache.ts`
  - `hash.ts`
  - `metrics.ts`
  - `benchmark.ts`
  - `adapters/`
- `.agent/agentic/`
  - `models.json`
  - `context-manifest.json`
  - `advisor-prompt.md`
  - `executor-prompt.md`
  - `README.md`
- `.agent-harness/`
  - `context-cache/`
  - `metrics/`
  - `audit/`

Static definitions and prompts should be versioned in repo. Generated cache state and metrics should live under `.agent-harness/` and be gitignored.

### Stable context inputs

Initial stable inputs should include:

- `.agent/AGENT.md`
- active `.agent/rules/*`
- selected `.agent/docs/agentic/context/*`
- canonical architecture/design docs
- decisions and feature-status docs
- curated project summaries generated from the doc audit pipeline

### Volatile context inputs

Volatile inputs should include:

- user task/request
- target files
- current git diff/status
- latest validation output
- fresh errors/logs
- latest work-in-progress notes relevant to the task

### Deterministic requirements

- consistent ordering
- normalized whitespace
- deterministic serialization
- no timestamps inside stable pack content
- no duplicate sections
- invalidation by content hash of relevant source inputs

### Metrics and benchmark requirements

For each context build or request preparation pass, log:

- stable blocks reused
- stable blocks regenerated
- cache hits and misses
- invalidation reasons
- estimated size/tokens
- provider/model class when known
- duration

If exact token counts are unavailable, use one deterministic approximation method and document it.

Benchmark requirement:

- compare cold vs warm runs on a realistic multi-turn coding scenario
- write human-readable output under `.agent-harness/metrics/`

### Cache/artifact interface for Pi

The repo-local context/cache layer should expose a small, explicit artifact contract for Pi rather than making Pi scrape project docs ad hoc.

Recommended stable artifacts:

- `stable-instructions.md`
- `stable-project-architecture.md`
- `stable-coding-policy.md`
- `stable-repo-summary.md`
- `stable-rendering-summary.md`
- `context-metrics.json`
- `cache-manifest.json`

Recommended volatile artifacts:

- `task-brief.md`
- `current-diff-summary.md`
- `latest-validation-summary.md`
- `latest-runtime-errors.md`

Pi should consume these artifacts as resources or prompt inputs, not regenerate them independently.

---

## B. Pi-centered orchestration layer

Pi should be integrated **after** the repo-local context/cache foundation is defined, so the outer harness consumes stable project artifacts instead of improvising them.

### Why Pi now looks like the better primary fit

Based on the imported harness review plus local-repo reality:

- Pi appears better aligned with a provider-agnostic, multi-model, local-friendly architecture.
- Pi is a cleaner outer harness candidate when the project already has a custom inner tool substrate (`atlas-harness`).
- OMO now looks more like a high-variance comparison candidate than the best default base.
- Superpowers remains a useful Claude-specific process enhancer, but not the central architecture for this project.

### Advisor pattern

- One `advisor` agent, tool-less, stronger model class.
- One `code_executor` agent, tool-enabled, fast/balanced model class by default.
- Advisor should be called:
  - once early for multi-step or multi-file tasks
  - once before declaring completion on substantial tasks
  - when the executor is stuck
  - when repeated validation fails
  - before destructive changes
- Advisor budget must be explicit and bounded per task.

### Model routing

Use config-driven model classes only:

- `cheap`
- `balanced`
- `premium`
- `local`

All concrete provider/model IDs must be mapped in one obvious configuration surface and remain provider-agnostic in logic.

### Human workflow ergonomics

The Pi-centered integration should support:

- start complex task
- inspect advisor plan
- override plan
- harvest a good workflow as a reusable skill
- inspect recent logs, decisions, and outcomes

The first pass should favor inspectable CLI/config entrypoints over an elaborate custom UI.

### Atlas Harness integration rules

Pi should not replace atlas-harness. It should sit above it.

The preferred stack is:

- Codex Desktop = human shell
- Pi = outer harness/orchestrator
- atlas-harness = workspace operations + enforcement + code intelligence

That means:

- do **not** build a duplicate generic action substrate if atlas-harness already provides the capability
- do **not** spread policy enforcement across multiple overlapping layers unless there is a clear reason
- treat atlas-harness as the main execution/control boundary for file/process/git/workspace operations
- let Pi focus on orchestration, routing, advisor logic, and extension composition

### Current local caveat

Sandboxed shell results inside this agent context can produce false negatives for direct command invocation. Repo configuration decisions should be based on verified non-sandbox behavior when available.

Operational reminder from this session:

- do not let sandbox-only shell failures harden into repo policy or broad tool diagnoses before a decisive outside-sandbox verification
- see:
  - `.agent/docs/project/process/POST_MORTEM_2026-04-11_SANDBOX_FALSE_NEGATIVE_AND_OVERDIAGNOSIS.md`

### Workflow-first installation pass

This should be the next concrete implementation pass, before deeper caching and retrieval work.

#### Goal

Install and bootstrap the agentic workflow stack so all subsequent architecture, docs, rendering, and gameplay work can use the new system instead of retrofitting it later.

#### Stack for this pass

- Pi orchestrates
- repo-local context/cache layer supplies stable artifacts
- atlas-harness executes and enforces
- LightRAG and OpenSpace plug in as services

#### Current repo reality this pass must respect

- `entire` is the current active hook/event bus for both Cursor and Gemini surfaces.
- `.agent/workflows/` already contains a large workflow library, so we should not casually add a second sprawling workflow corpus beside it.
- `atlas-harness` is now correctly pointed at the published installed package line through `.agent/mcp_config.json`.
- The canonical invocation for Pax Fluxia should be the direct command form:
  - `atlas-harness --transport mcp`

#### Migration stance

This first workflow/setup pass should be **interop-first**, not rip-and-replace.

- Pi becomes the intended orchestrator.
- atlas-harness remains the execution and enforcement boundary.
- the repo-local context/cache layer becomes the stable artifact source of truth.
- `entire` should be treated as the incumbent hook/event layer that must either:
  - remain as a transitional event source feeding the new stack, or
  - be cleanly retired later once Pi-owned equivalents exist

What we should not do is build Pi in isolation, ignore the live `entire` hooks, and accidentally create two simultaneous workflow operating systems.

#### Phase 1: foundation and wiring

- Install Pi as the new workflow/runtime layer.
- Keep atlas-harness on the published package line only.
- Ensure Pax Fluxia MCP/config points only at the published `atlas-harness` package line through the direct command form.
- Create the initial Pi project structure in-repo.
- Establish one obvious configuration surface for:
  - model classes
  - provider IDs
  - resource locations
  - advisor settings
  - retrieval endpoints
  - skill/memory endpoints
- Inventory the current external control points and decide which are:
  - retained as-is for now
  - routed through Pi next
  - scheduled for retirement later

#### Phase 1A: workflow-surface inventory and reduction

Before broad installation work, capture the live workflow surfaces and classify them:

- `.cursor/hooks.json`
- `.gemini/settings.json`
- `.entire/settings.json`
- `.agent/workflows/*`
- `.agent/rules/*`
- `.agent/docs/agentic/*`

For each surface, record:

- owner
- purpose
- whether it is live, stale, duplicate, or transitional
- whether Pi should consume it, replace it, or ignore/archive it

This is important because the repo already has too many workflow-like artifacts. Installation without reduction will just compound that.

#### Phase 2: context-pack contract

- Build the first deterministic stable-context manifest for Pi consumption.
- Separate stable artifacts from volatile artifacts.
- Define the generation commands and output locations.
- Log metrics for cache hits/misses and stable artifact reuse.

#### Phase 3: advisor/executor loop

- Define the Pi advisor/executor workflow around atlas-harness-backed operations.
- Advisor remains tool-less.
- Executor uses atlas-harness for file/process/git/workspace capabilities.
- Add clear trigger rules for when advisor is called automatically.

#### Phase 4: retrieval and skill stubs

- Wire LightRAG as the planned default retrieval owner, even if indexing depth is shallow at first.
- Define OpenSpace integration points for skill harvest and post-mortem reuse.
- Keep both as clean extension points rather than giant upfront integrations.
- Do not let retrieval or skill memory become a second source of project truth. They should consume the repo-local canonical artifacts and harvested outputs, not compete with them.

#### Phase 5: validation and operating docs

- Validate the workflow end to end with a simple realistic task.
- Write concise operator instructions for:
  - launching Pi for Pax Fluxia
  - where atlas-harness is invoked from
  - where stable context artifacts live
  - how advisor triggers work
  - how to disable caching/metrics
  - how to reindex retrieval later
- Include a short migration note explaining the relationship between:
  - Pi
  - atlas-harness
  - `entire`
  - existing `.agent/workflows/`

#### Recommended concrete landing points

To keep the workflow setup inspectable and avoid scattering config:

- `.agent/agentic/`
  - Pi-facing model and workflow config
  - stable artifact manifests
  - operator notes
- `tools/agentic/`
  - generators, cache utilities, metrics, benchmark scripts
- `.agent-harness/`
  - generated cache state
  - metrics
  - workflow audit outputs
- `.agent/docs/project/`
  - canonical planning and operating docs only

Avoid creating a second large markdown forest outside these boundaries.

---

## C. Retrieval, skills, and post-mortem memory

### Retrieval

Default retrieval owner: LightRAG.

Indexed material should include:

- codebase
- markdown docs
- design notes
- post-mortems
- workflow notes
- curated planning and session artifacts

RAG-Anything should remain opt-in for explicit multimodal needs only.

Changed-file-only refresh is required for practicality.

### Skill evolution

OpenSpace should own:

- reusable workflows
- playbooks
- harvested post-mortems
- reusable lessons

This system should store structured outputs, not vague prose dumps.

Minimum harvested artifact fields:

- task
- context
- chosen approach
- failures
- final solution
- reusable lessons

---

## D. Documentation recovery and prompt/rules synthesis

This remains a first-class workstream because the agentic stack will be only as good as the reference layer it consumes.

### Main objective

Reduce the current documentation/prompt/rules sprawl into a smaller canonical operating set while preserving valuable content and provenance.

### Outputs to produce

- `PROJECT_OPERATING_MODEL.md`
- `RENDERING_STRATEGY_AND_SHORTLIST.md`
- `MAP_AND_FIXTURE_SYSTEM.md`
- `AGENT_SYSTEM_AND_WORKFLOW_PLAN.md`
- `PROMPTS_RULES_THINKING_SYNTHESIS.md`
- `IDEAS_LEDGER_RENDERING_AND_GAMEPLAY.md`
- `IMPLEMENTATION_ROADMAP.md`

### Rendering-ideas consolidation rule

The rendering brainstorm corpus must be treated as a structured salvage operation, not as a menu of equally valid new modes.

The most important synthesis from the newly imported rendering idea dumps is:

- many "new methods" are not actually new top-level render families
- many are better understood as alternative choices along different axes inside the same family or transition system

For documentation review, every imported rendering idea should be classified along these axes:

- **Canonical truth model**
  - graph-native ownership and competition truth
  - canonical frontier/bookend truth
- **Family internal representation**
  - distance field
  - vector/polygon
  - metaball / implicit field
  - contour / sampled field
- **Transition representation**
  - direct frontier/vector morph
  - scalar-field morph
  - node-weight animation
  - node + edge-tube animation
  - heuristic velocity field
  - OT / level-set / PDE-inspired flow
- **Border derivation**
  - direct vector frontier
  - contour extraction from scalar field
  - traced or simplified paths
- **Sampling / polygonization**
  - square grid
  - triangular / marching-triangles
  - hex-aligned lattice
- **Presentation styling**
  - crisp vector
  - soft field / metaball
  - hybrid fill + vector border

This axis-based classification should become part of `IDEAS_LEDGER_RENDERING_AND_GAMEPLAY.md`, because it prevents another round of family explosion and makes future comparison far more intelligible.

### Rendering-idea ingestion outputs

For each imported rendering idea source, the ledger should capture:

- source document and date
- compact idea summary
- which axis or axes it affects
- whether it is:
  - canonical-candidate
  - active-family option
  - transition option
  - border-extraction option
  - presentation-only styling idea
  - research-only
- invariants it must preserve
- likely implementation cost
- likely maintenance cost
- proof needed to justify adoption

### Rules for the doc audit++

- extract, do not merely enumerate
- collapse duplicates aggressively
- keep provenance for mined ideas and lessons
- promote only clearly canonical docs
- archive the rest behind indexes instead of keeping them all first-class
- classify rendering ideas by architectural axis before discussing them as "modes"
- do not let brainstorming docs silently create new first-class runtime categories

The prompt/rules/thinking review should explicitly separate:

- durable useful operating rules
- prompt fragments worth reusing
- anti-patterns and token waste
- obsolete or contradictory instructions

---

## E. Game-architecture continuity workstreams

These remain active and must not get lost while the agentic-support layer is built.

### Shared truth and parity

- Move lane path truth fully into shared contracts and schema.
- Eliminate SP/MP divergence for lane-path consumption.
- Keep future authoritative map/editor data models in `/common`.

### Curated fixture maps

Introduce deterministic small maps in `/common` to support:

- renderer comparison
- bug reproduction
- parity verification
- future automated checks
- custom-map-editor regression

### Territory render-family program

Maintain the active shortlist:

- `metaball`
- `distance_field`
- one PV-family path

Use fixture maps plus human visual review to choose and validate the PV path.

### Metaball-family synthesis from the new idea dumps

The imported rendering idea dumps sharpen the right mental model for `metaball`:

- `metaball` should remain a family representation and transition option, not the canonical source of ownership truth
- per-frame border derivation from the current scalar field is a strong idea inside `MetaballFamily`, because it avoids fragile vector-to-vector morph logic
- fill-first / water-flow thinking is promising as a **transition representation** for the metaball family, not as the project-wide master architecture
- hex-aligned or triangular-lattice polygonization is best treated as a sampling/polygonization option for metaball output, not as a separate territory family

Recommended internal priority order for metaball transition exploration:

1. **Per-node weight animation**
   - lowest conceptual risk
   - aligns well with star ownership change
   - good baseline transition mechanism
2. **Per-node weight + edge-tube influence**
   - strong candidate for conquest "flow" feel
   - still understandable and bounded
3. **Field morph between old/new states**
   - useful experimental branch
   - likely visually rich
   - higher risk of odd intermediate topology
4. **Heuristic velocity field / level-set / OT / PDE flow**
   - keep as research and prototype territory
   - do not elevate to primary implementation until simpler metaball transitions are judged insufficient

Recommended hybrid north star:

- keep graph-native/canonical frontier truth as the bookends
- allow a fill-first scalar-field evolution inside a transition window for `MetaballFamily`
- re-derive borders per frame from the current field
- snap cleanly to canonical truth at the end of the transition

This is the most valuable synthesis from the new material because it preserves correctness while still making room for the more liquid, alive behavior you are looking for.

### Custom map editor

Build toward an internal MVP first:

- place/move/delete stars
- connect/disconnect lanes
- set owner/faction/type/force
- validate
- save/load/export
- test-play against shared map data

The editor must sit on the same shared map data model that fixtures and future authored maps use.

---

## Recommended Execution Order

1. Install and bootstrap the workflow stack around Pi + published atlas-harness.
2. Create the repo-local context-pack/cache foundation and its config surface.
3. Normalize stable inputs and establish deterministic invalidation plus metrics.
4. Produce the doc audit++ reduction plan and canonical-context shortlist that the cache layer will consume.
5. Integrate Pi around the repo-local context/cache layer instead of bypassing it.
6. Add retrieval indexing and changed-file refresh flow.
7. Add OpenSpace-based skill harvest and post-mortem capture.
8. Continue the shared-truth game workstreams in parallel:
   - lane-path SP/MP parity
   - curated fixture maps
   - render-family shortlist discipline
   - internal map-editor foundations

This sequence is deliberate: if we keep doing game and architecture work before the workflow stack is installed, we will keep paying repeated retrofit costs. If we wire Pi directly to raw docs without the context-pack layer, we will reproduce the same token waste and conceptual drift through a new harness.

---

## Immediate Next Planning Targets

The next strong planning updates should focus on:

1. the workflow-first Pi + atlas-harness installation/setup pass
2. the caching implementation pass, grounded in the repo-local context-pack approach
3. the doc audit++ and prompts/rules synthesis pass
4. the rendering-ideas consolidation ledger
5. the shared `/common` path for parity, fixtures, and map-authoring data

---

## Defaults And Assumptions

- Codex Desktop remains the main human-facing shell.
- Pi is the intended orchestrator, and it should be integrated around repo-owned context artifacts.
- atlas-harness should be consumed from the published installed package line only.
- The first caching pass should target local deterministic context reuse even if provider-side caching support is absent or limited.
- Generated cache state should not be treated as source-of-truth project documentation.
- Multiple render families will remain in the repo, but not all should remain equally exposed in the main UI.
- The first custom map editor milestone is an internal tool, not a polished end-user feature.
