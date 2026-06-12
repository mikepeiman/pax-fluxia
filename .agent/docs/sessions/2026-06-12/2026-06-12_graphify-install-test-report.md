---
date created: 2026-06-12
last updated: 2026-06-12
last updated by: AI
relevant prior docs:
  - .agent/docs/sessions/2026-06-11/2026-06-11_graphify-and-provider-cache-plan.md
superseding docs:
---

# Graphify Install Test Report

## Purpose

Install and test Graphify now.

## Installed

- Verified `uv 0.6.14` and `Python 3.12.7`.
- Installed `graphifyy==0.8.38` with `uv tool install graphifyy`.
- Verified CLI with `graphify --version`.
- Installed project-scoped Codex integration with `graphify install --project --platform codex`.

Project files created by Graphify:

- `AGENTS.md`
- `.codex/hooks.json`
- `.codex/skills/graphify/SKILL.md`
- `.codex/skills/graphify/references/*`

## Smoke Test Results

Successful commands:

- `graphify extract .\pax-fluxia\src\lib\territory --no-cluster --out .agent-harness\graphify\territory-smoke`
  - 245 code files
  - 2314 nodes
  - 6479 edges
- `graphify query "What modules implement territory geometry modes?" --graph .agent-harness\graphify\territory-smoke\graphify-out\graph.json --budget 1200`
- `graphify explain "GeometryLayerCoordinator" --graph .agent-harness\graphify\territory-smoke\graphify-out\graph.json`
- `graphify diagnose multigraph --graph .agent-harness\graphify\territory-smoke\graphify-out\graph.json --json`
- `graphify tree --graph .agent-harness\graphify\territory-smoke\graphify-out\graph.json --output .agent-harness\graphify\territory-smoke\graphify-out\GRAPH_TREE.html --root pax-fluxia/src/lib/territory --label "Pax Territory Smoke"`
- `graphify extract .\common\src --no-cluster --out .agent-harness\graphify\common-src`
- `graphify extract .\pax-server\src --no-cluster --out .agent-harness\graphify\server-src`
- `graphify hook-check`
- `graphify check-update .`
- Full-code AST-only build:
  - Added repeatable command: `bun run agentic:graphify:build`.
  - Mirrored source files from `common/src`, `pax-server/src`, and `pax-fluxia/src` into a temporary non-repo mirror.
  - Included `.ts`, `.svelte`, `.js`, `.mjs`, `.cjs`, `.css`, and `.ps1`.
  - Excluded docs, HTML prototypes, JSON theme/config data, static assets, and semantic/LLM extraction.
  - Extracted with `graphify extract <temp-mirror> --no-cluster --out .agent-harness\graphify\full-code-graph`.
  - Result: 583 code files, 5482 nodes, 12083 edges, 19.5 seconds cold extraction.
  - Rewrote temp mirror source paths back to real workspace paths in generated graph JSON.

Default root query test:

- Copied the full-code AST graph into ignored `graphify-out/`.
- Verified default `graphify query "What modules implement territory geometry modes?" --budget 1000`.
- Verified default `graphify explain "GeometryLayerCoordinator"`.

## Failures And Limits

- `graphify benchmark .agent-harness\graphify\territory-smoke\graphify-out\graph.json` failed with `KeyError: 'links'`. The raw graph has `nodes` and `edges`, while benchmark expected NetworkX node-link `links`.
- `graphify merge-graphs ... --out graphify-out\graph.json` failed with `NetworkXError: All graphs must be graphs or multigraphs`, apparently from the same raw graph shape mismatch.
- `graphify extract .\pax-fluxia\src --no-cluster --out .agent-harness\graphify\client-src` found 627 code files and 12 docs, then attempted semantic extraction through OpenAI and failed because the `openai` package extra is not installed. This was not retried because the smoke test was intended to avoid provider/API-backed extraction.
- Graphify respects `.gitignore`; an ignored in-repo code mirror is skipped. The working strategy uses a temp mirror outside the repo and post-processes source paths back to the real workspace.

## Token And Time Comparison

Benchmark harness:

- `tools/agentic/benchmark-graphify.ts`
- Command: `bun run agentic:graphify:benchmark`
- Output report: `.agent-harness/metrics/graphify-comparison-latest.md`
- Output JSON: `.agent-harness/metrics/graphify-comparison-latest.json`
- Token estimate: output characters divided by 4.

| Task | Graphify ms | rg ms | Graphify est tokens | rg est tokens | Token delta favoring Graphify | Time delta favoring Graphify |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| territory geometry modes | 1108 | 24 | 1550 | 1343 | -207 | -1084 |
| settings panel flow | 454 | 32 | 1565 | 38489 | 36924 | -422 |
| lane margin constraints | 438 | 31 | 428 | 6044 | 5616 | -407 |
| server/shared state | 443 | 24 | 1560 | 4433 | 2873 | -419 |

Interpretation:

- Graphify is slower than `rg` for these local CLI commands by roughly 0.41-1.08 seconds per query in the final scripted run.
- Graphify is token-efficient for broad/noisy discovery tasks, especially settings flow and lane constraints.
- Graphify is not automatically better for already-tight symbol searches; the territory geometry mode task was both slower and slightly more verbose than a focused `rg`.
- Use Graphify first when the likely query would otherwise produce hundreds or thousands of lines of search output. Use `rg` first when the target symbol or file set is already known.

## Repo Changes

- Added `graphify-out/` and `.agent-harness/graphify/` to `.gitignore`.
- Added a scope warning to `AGENTS.md` because the current default graph is an AST-only source graph, not whole-project coverage.
- Replaced Graphify's generated `graphify update .` instruction with `bun run agentic:graphify:build` so future rebuilds use the tested code-only mirror strategy.

## Current Recommendation

Use Graphify now for broad source-structure discovery across `common/src`, `pax-server/src`, and `pax-fluxia/src`. Do not use it as the only evidence for edits. The effective workflow is Graphify for shortlist/context, then `rg` and source reads for exact references and verification. Rebuild through the code-only temp mirror strategy until Graphify supports a clean no-doc/no-semantic extraction mode for the actual source roots.
