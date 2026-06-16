## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Current graph scope: `graphify-out/graph.json` is an AST-only source graph built from `common/src`, `pax-server/src`, and `pax-fluxia/src` source files. It excludes docs, HTML prototypes, JSON theme/config data, static assets, and semantic/LLM extraction. Use it for code-structure discovery; use `rg` and source reads for exact text, docs, config data, and verification.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code in `common/src`, `pax-server/src`, or `pax-fluxia/src`, run `bun run agentic:graphify:build` to rebuild the code-only graph. Do not use `graphify update .` for this repo unless the extraction scope is changed deliberately; the root contains docs, prototypes, config data, assets, and ignored paths that do not match the tested graph.
