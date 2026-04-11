# Workflow Surface Inventory - 2026-04-11

## Purpose

Capture the workflow and control surfaces that already exist in Pax Fluxia so the Pi + atlas-harness installation/setup pass can reduce and unify the stack instead of layering blindly on top of it.

## Grounded Inventory

### Live runtime-facing surfaces

- `.agent/mcp_config.json`
  - Current role: workspace MCP entrypoint for `atlas-harness`
  - Current state: direct command invocation via `atlas-harness --transport mcp`
  - Status: live and canonical for workspace operations

- `.cursor/hooks.json`
  - Current role: Cursor lifecycle hook routing
  - Current state: forwards session/tool lifecycle events through `entire hooks cursor ...`
  - Status: live incumbent hook surface

- `.gemini/settings.json`
  - Current role: Gemini lifecycle hook routing
  - Current state: forwards agent/model/tool lifecycle events through `entire hooks gemini ...`
  - Status: live incumbent hook surface

- `.entire/settings.json`
  - Current role: Entire runtime toggle
  - Current state: `"enabled": true`, `"telemetry": false`
  - Status: live incumbent event/hook bus
  - Official references:
    - [entire.io](https://entire.io/)
    - [Entire docs](https://docs.entire.io/introduction)

## Entire Review

Based on the official product/docs review, Entire is a Git-workflow capture layer that records AI agent sessions as checkpoints attached to repository history. Its docs also explicitly list Codex integration as preview support:

- [Entire home](https://entire.io/)
- [Introduction](https://docs.entire.io/introduction)
- [Codex integration (preview)](https://docs.entire.io/integrations/codex)

That aligns with what Pax Fluxia is already doing today:

- Cursor hooks route through `entire`
- Gemini hooks route through `entire`
- `.entire/settings.json` is enabled

So Entire is not random overhead in this repo. It is a real incumbent checkpoint/history layer.

### Current assessment

- Keep Entire in the stack for now as the live session-capture and hook/event substrate.
- Treat it as complementary to Pi + atlas-harness, not as a replacement for them.
- Re-evaluate it after Pi is installed and the repo-local context/cache layer is fully in use.

### Eject criteria

Entire becomes a candidate for removal if, after Pi installation:

- it duplicates rather than complements the final workflow stack
- it adds hook/config complexity without providing durable checkpoint/history value
- its capture value is already covered cleanly by a better in-repo or Pi-native solution
- it creates more operational friction than reusable context value

### Stable project-understanding surfaces

- `.agent/AGENT.md`
  - Current role: master agent context
  - Status: primary stable instruction source

- `.agent/rules/`
  - Current role: local operating rules and workflow discipline
  - Status: stable policy corpus

- `.agent/docs/agentic/`
  - Current role: harness, prompt, and workflow research/reference material
  - Status: valuable but too broad to be consumed raw

- `.atlas/`
  - Current role: compact architecture, mechanics, and decision references
  - Status: primary stable architecture source

- `.agent/docs/project/`
  - Current role: plans, session notes, process docs, feature and decision tracking
  - Status: primary planning/history corpus, but currently too large to consume raw

### Workflow corpus that must be reduced before Pi becomes first-class

- `.agent/workflows/`
  - Current role: large markdown workflow library, heavily BMAD-oriented
  - Status: transitional corpus, not a clean canonical workflow stack
  - Risk: if left unmanaged, Pi integration will create a second workflow operating system beside it

## Classification

### Retain now

- `.agent/mcp_config.json`
- `.cursor/hooks.json`
- `.gemini/settings.json`
- `.entire/settings.json`
- `.agent/AGENT.md`
- `.agent/rules/`
- `.atlas/`

### Transitional

- `.agent/workflows/`
- `.agent/docs/agentic/`
- large portions of `.agent/docs/project/` that should be reduced into smaller canonical artifacts before being fed to Pi or retrieval systems

### Do not expand yet

- a second sprawling markdown workflow library
- provider-specific cache logic scattered across multiple config files
- a separate orchestration system that bypasses `atlas-harness`

## Immediate Decisions For Steps 1-3

- `atlas-harness` remains the execution and enforcement boundary.
- Pi is the intended future orchestrator, but it should not be installed as a second truth source.
- `entire` remains the incumbent live hook/event layer until Pi-owned equivalents exist.
- Stable project context should be built into deterministic repo-local artifacts before Pi consumes it.
- Generated cache state and metrics should live under `.agent-harness/`, not inside source-controlled documentation trees.
- Entire should be explicitly acknowledged as the current checkpoint/history layer, then retained or ejected later by decision gate rather than by neglect.

## Reduction Targets

### First reduction target: workflow surfaces

- inventory the live hook entrypoints and keep them visible
- avoid multiplying new top-level workflow docs
- reduce `.agent/workflows/` into:
  - retained canonical workflows
  - transitional reference workflows
  - archive candidates

### Second reduction target: stable context inputs

- choose a small canonical input set for the first cache layer
- keep stable artifacts explicit and inspectable
- keep volatile task context out of the stable cache outputs

## Exit Criteria For This Inventory

This inventory is "good enough" for the current implementation pass when:

- the live runtime-facing surfaces are clearly named
- the transitional workflow corpus is called out explicitly
- the initial keep/transitional/do-not-expand decisions are documented
- the cache and workflow-installation work can proceed without pretending the repo is a blank slate
