# Workflow Installation Spec - 2026-04-11

## Purpose

Install the workflow foundation for Pax Fluxia so future coding, documentation, rendering, and architecture work can run through one coherent stack:

- CLI-Anything is evaluated first as the primary harness candidate
- Pi remains the orchestration candidate
- repo-local context/cache artifacts supply stable project understanding
- `atlas-harness` is kept only if it proves unique value
- LightRAG and OpenSpace plug in later without competing with canonical project truth

## Scope Of This Spec

This spec covers the first concrete setup pass only:

- verify and retain the minimal live workflow substrate
- define the canonical workflow/control boundaries
- install the first repo-local context/cache layer
- prepare the configuration surface Pi will consume later

This spec does not yet install Pi or retrieval/memory systems in full.
This spec now also treats harness choice as an explicit evaluation process rather than a settled atlas-harness-first architecture.

## Canonical Ownership

### Human-facing shell

- Codex Desktop remains the main human-facing shell.

### Orchestration

- Pi is the intended orchestration candidate.
- Pi should consume repo-owned artifacts rather than re-derive project understanding ad hoc.

### Harness evaluation

- CLI-Anything is the primary harness candidate to evaluate:
  - [CLI-Anything](https://clianything.net/)
- atlas-harness is the comparative local candidate.
- Continued atlas-harness development is justified only if it offers unique value worth preserving.

### Execution and enforcement

- During evaluation, atlas-harness remains the current configured execution path in Pax Fluxia.
- After evaluation, the chosen harness boundary should own workspace operations and command abstraction.

### Hook/event layer

- `entire` is the incumbent live hook/event layer.
- It remains transitional until Pi-owned equivalents are ready.
- Official references:
  - [entire.io](https://entire.io/)
  - [Entire docs](https://docs.entire.io/introduction)
  - [Codex integration (preview)](https://docs.entire.io/integrations/codex)

### Project understanding

- Stable project understanding should come from deterministic repo-local artifacts.
- Volatile task data should remain separate and append-only at task time.

## Entire Decision Gate

Entire deserves explicit treatment in the workflow architecture because it is already live in this repo and it provides a real function: checkpointing and session/history capture around agent workflows.

### Current decision

- Keep Entire as the current hook/event and capture layer.
- Do not ask Pi or atlas-harness to replace that function immediately.
- Do not let Entire become a second source of project truth; it should capture sessions, not define architecture.

### Re-evaluation point

Re-evaluate Entire after Pi installation and initial workflow shakedown.

### Retain criteria

- it continues to give durable checkpoint/history value
- it helps explain or recover agent work across sessions
- it operates with low enough hook/config overhead

### Eject criteria

- it duplicates the final Pi-centered workflow stack without adding unique value
- it causes config churn or hook fragility disproportionate to the value it provides
- a cleaner in-repo or Pi-native capture path replaces its useful behavior

## Step 1: Minimal Workflow Substrate

### Keep

- `.agent/mcp_config.json` with direct `atlas-harness --transport mcp`
- `.cursor/hooks.json`
- `.gemini/settings.json`
- `.entire/settings.json`

### Treat As Transitional

- broad prompt/research corpora under `.agent/docs/agentic/`

### Rule

Do not create a parallel workflow forest. New workflow logic should land in:

- `.agent/agentic/` for static agentic config and manifests
- `tools/agentic/` for deterministic generators and benchmarks
- `.agent-harness/` for generated cache state and metrics

## Harness Evaluation Criteria

CLI-Anything and atlas-harness should be compared against:

- command-surface quality for agents
- JSON and structured output quality
- software/control breadth
- codebase awareness
- project-aware rule enforcement
- safety and guardrails
- setup complexity
- maintenance burden
- extensibility burden

Atlas-harness should survive only if its unique strengths are worth continuing to build.

## Step 2: Concrete Install Contract

### Static config surface

Create and maintain:

- `.agent/agentic/config.json`
- `.agent/agentic/context-manifest.json`
- `.agent/agentic/models.json`
- `.agent/agentic/README.md`

### Intended meanings

- `config.json`
  - cache toggles
  - metrics toggles
  - canonical output paths

- `context-manifest.json`
  - stable artifact definitions
  - deterministic source ordering
  - canonical source file lists

- `models.json`
  - abstract model classes only
  - no logic should depend on provider-specific IDs directly

- `README.md`
  - maintainer/operator note
  - what is stable vs volatile
  - how invalidation works
  - how to disable caching
  - how to rerun the benchmark

## Step 3: Minimal Context/Cache Foundation

### Deliverables

- deterministic stable-context builder
- cache manifest
- stable artifact outputs
- metrics log
- cold-vs-warm benchmark report

### Required paths

- source config:
  - `.agent/agentic/`
- generated cache/artifacts:
  - `.agent-harness/context-cache/`
- generated metrics and benchmark outputs:
  - `.agent-harness/metrics/`

### Stable artifacts in this first cut

- `stable-instructions.md`
- `stable-coding-policy.md`
- `stable-project-architecture.md`
- `stable-workflow-stack.md`

### Volatile artifacts in this first cut

Volatile artifacts are defined here, but not fully generated yet:

- `task-brief.md`
- `current-diff-summary.md`
- `latest-validation-summary.md`
- `latest-runtime-errors.md`

These should be appended per-task later and must not contaminate the stable cache outputs.

## Deterministic Rules

- stable sections must use deterministic source ordering
- stable outputs must normalize line endings and trailing whitespace
- stable outputs must not include timestamps or random IDs
- cache invalidation must be driven by content hash of relevant source inputs
- metrics can include timestamps because they are operational records, not stable context

## Validation Gates

This slice is complete when:

- `atlas-harness` remains the direct MCP command path
- stable artifacts can be built reproducibly
- a second build reuses stable artifacts instead of regenerating them
- cache hits/misses and invalidation reasons are logged
- a human-readable benchmark report shows cold vs warm behavior
- the builder still works with caching disabled

## Not Yet In Scope

- provider-side caching integration
- full Pi installation
- LightRAG indexing
- OpenSpace skill harvest
- volatile task-pack generation

## Follow-On Work After This Slice

1. Evaluate CLI-Anything against atlas-harness and decide the retained harness boundary.
2. Add retrieval and memory integrations that consume canonical artifacts.
3. Reduce prompt/research sprawl.
4. Extend the context packer with volatile task-time artifacts.
