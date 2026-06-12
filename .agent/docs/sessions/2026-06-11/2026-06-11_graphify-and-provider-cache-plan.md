---
date created: 2026-06-11
last updated: 2026-06-11
last updated by: AI
relevant prior docs:
  - .agent/agentic/README.md
  - .agent/agentic/config.json
  - .pi/extensions/pax-project/index.ts
superseding docs:
---

# Graphify And Provider Prompt Cache Plan

## Purpose

Evaluate Graphify for Pax Fluxia, plan how to integrate it for more effective coding and refactoring, and integrate a prompt-caching strategy that works with OpenAI and Anthropic APIs.

## Local Context

- Pax already has a repo-local agentic context layer in `tools/agentic/`.
- Stable context artifacts are generated from `.agent/agentic/context-manifest.json`.
- Pi integration already exposes `/pax-context:status`, `/pax-context:rebuild`, and `/pax-context:inject`.
- Before this pass, `providerCaching` existed as a config switch but was disabled and not wired to a provider-specific strategy.

## Research Basis

- Graphify GitHub: `uv tool install graphifyy`, `graphify install`, and `/graphify .` produce `graph.html`, `GRAPH_REPORT.md`, and `graph.json`; it advertises support for Codex, Pi, Claude Code, Cursor, Aider, Gemini CLI, and others. Source: https://github.com/safishamsi/graphify
- Graphify privacy notes: code is processed locally through tree-sitter; docs, PDFs, and images may be sent to the active assistant/model path for semantic extraction; query logs are written by default unless disabled. Source: https://github.com/safishamsi/graphify
- Graphify site: positions the tool as a persistent, on-device knowledge graph with incremental updates and `graphify watch`. Source: https://graphifylabs.ai/
- OpenAI prompt caching: caching is automatic for eligible recent models; exact prefix stability matters; prompts need at least 1024 tokens for useful cached hits; `prompt_cache_key`, `prompt_cache_retention`, and `usage.prompt_tokens_details.cached_tokens` are the relevant controls/metrics. Source: https://developers.openai.com/api/docs/guides/prompt-caching
- Anthropic prompt caching: use top-level automatic `cache_control` or explicit block-level `cache_control`; cache order is `tools`, `system`, then `messages`; default TTL is 5 minutes, optional 1 hour costs more; track `cache_creation_input_tokens` and `cache_read_input_tokens`. Source: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- Adjacent tools searched: `code-review-graph` for review-focused structural context through MCP, Repomix for one-shot AI-friendly repo packs, Repo Prompt for manual context curation/MCP, and Aider's tree-sitter repo map as a proven pattern for symbol-aware context selection.

## Graphify Evaluation

Graphify is useful for Pax Fluxia if treated as a structural discovery index, not as a replacement for source reads, tests, or `rg`. Pax has multiple active code roots (`common/`, `pax-fluxia/`, `pax-server/`), a large `.agent/docs/` knowledge base, legacy artifacts, generated assets, and many architecture/refactor documents. A graph query layer should reduce repeated broad scans when asking questions like "which modules own territory geometry?", "what files connect UI slider state to render behavior?", or "what docs and code mention lane margin constraints?"

High-value uses:

- architecture discovery before refactors
- cross-root impact analysis across client, server, and common package
- linking project docs to code symbols and generated reports
- onboarding new agent sessions without rereading large raw docs
- finding surprising coupling before large edits

Risks and constraints:

- Graphify output can be stale unless rebuild/watch is part of the workflow.
- The public claims around token reductions should be benchmarked locally before being trusted.
- Multimodal/doc semantic extraction can leave the machine depending on backend settings. Start with code-only/offline extraction for private code.
- Default query logging should be disabled or redirected for sensitive prompts.
- `node_modules`, `dist`, `.agent-harness`, media assets, generated screenshots, and heavy archives should be excluded from the first graph.

## Graphify Integration Plan

1. Smoke test code-only extraction.
   - Install with `uv tool install graphifyy`.
   - Run from the repo root with a narrow target set first: `common`, `pax-fluxia/src`, `pax-server/src`, `tools`, `.agent/docs/project`, `.agent/docs/game`, and `.atlas`.
   - Exclude generated and heavy paths: `node_modules`, `dist`, `.agent-harness`, `resources/audio`, `pencil`, `website_cursor_pencil`, screenshots, lockfiles, and generated Tauri mobile folders.

2. Keep generated output out of commits until value is proven.
   - Treat `graphify-out/graph.json`, `graph.html`, and `GRAPH_REPORT.md` as cache artifacts under `.agent-harness/graphify/` or keep default output ignored.
   - Commit only durable project wiring or instructions after the trial.

3. Install project skill only after smoke test.
   - Use `graphify install --project --platform codex` for Codex.
   - If Pi support behaves as advertised, add the Pi install path after Codex works.

4. Add usage rules to the agentic workflow.
   - Use Graphify first for architecture discovery and impact questions.
   - Use `rg` for exact text, symbols, config keys, and verification.
   - Use source reads before edits.
   - Record when Graphify answers disagree with source search.

5. Benchmark before relying on it.
   - Pick 5 recurring Pax tasks: territory pipeline tracing, slider-to-config tracing, lane geometry impact analysis, server/shared protocol impact, and doc-to-code consistency checks.
   - Compare Graphify-assisted workflow against `rg` plus source reads.
   - Track files read, estimated tokens, elapsed time, missed references, and correction count.

## Prompt-Caching Strategy Integrated

Implemented strategy:

- `providerCaching` is now enabled in `.agent/agentic/config.json`.
- `tools/agentic/context-pack.ts` now writes a stable provider-cache prefix and provider strategy report after building stable context artifacts.
- `tools/agentic/provider-cache.ts` owns provider-cache prefix generation, deterministic hashing, provider examples, and threshold reporting.
- `.pi/extensions/pax-project/index.ts` now advertises the provider-cache prefix and strategy files.
- `tools/agentic/benchmark-context-cache.ts` now reports provider-cache readiness.

Generated files after `bun run agentic:context:build`:

- `.agent-harness/context-cache/provider-cache-prefix.md`
- `.agent-harness/context-cache/provider-cache-strategy.md`

Runtime request contract:

- Stable prefix first.
- Tool/schema definitions stable and sorted when reused.
- Current task, current diff, fresh logs, and user-specific instructions after the stable prefix.
- No timestamps, run IDs, volatile metrics, or fresh summaries before the provider-cache breakpoint.

OpenAI contract:

- Keep the generated prefix byte-identical at the start of the request.
- Use `prompt_cache_key: "pax-fluxia-agentic-stable-v1"` for requests sharing this prefix.
- Use `prompt_cache_retention: "24h"` only when the selected model supports extended retention; otherwise omit it.
- Track `usage.prompt_tokens_details.cached_tokens`.

Anthropic contract:

- Send the generated prefix as a stable `system` text block.
- Put `cache_control: { "type": "ephemeral" }` on that block.
- Use one explicit breakpoint for Pax stable context; reserve other breakpoint slots for large stable tools or retrieved docs if needed.
- Track `usage.cache_creation_input_tokens` and `usage.cache_read_input_tokens`.

## Adjacent Tool Recommendations

- Primary: Graphify for structural discovery, if the local benchmark shows fewer missed references and fewer broad raw-doc reads.
- Secondary: `code-review-graph` only if PR/review-specific MCP context becomes a major bottleneck.
- Fallback: Repomix for one-shot audits or external model handoff, not for normal iterative coding because it encourages large flat prompts.
- Optional manual workflow: Repo Prompt if human-curated context assembly becomes important enough to justify a separate UI.
- Keep existing `tools/agentic/context-pack.ts` as the stable context baseline because it is deterministic, cheap, and already integrated with Pi.

## Success Criteria

- Stable provider prefix exceeds 1024 estimated tokens.
- Warm local context builds reuse stable artifacts.
- OpenAI requests report nonzero `cached_tokens` after warm-up for identical prefixes.
- Anthropic requests report nonzero `cache_read_input_tokens` after the first cache write.
- Graphify-assisted tasks reduce files read and missed cross-module references without hiding source verification.

## Verification

- `bun tools/agentic/build-context-pack.ts --json` succeeded.
- `bun tools/agentic/build-context-pack.ts --artifact stable-instructions --json` succeeded and kept the full provider prefix hash unchanged.
- `bun tools/agentic/benchmark-context-cache.ts` succeeded.
- Warm local context cache hit rate: 100%.
- Stable provider prefix estimated tokens: 34240.
- Stable provider prefix hash: `833fbc95c9810c33e5d337d8c96f74a13eb87162d81d70c9ae91868d1580c7b1`.
