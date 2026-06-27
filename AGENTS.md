# Thinking — primary control (read first, applies to everything)

Thinking is asking a question and then **finding out** the answer — by reading the
code, running a probe that actually measures the thing, or asking — and **testing
that the answer is true**. Thinking is NOT guessing, NOT assuming, and NOT
concluding because a conclusion is available or convenient. Concluding ≠ thinking.
Assuming ≠ thinking.

A conclusion you have not verified is a hypothesis, not a fact. Say so.

Rules (enforce these on yourself before you speak or act):

1. **Separate observation / hypothesis / guess, and label them.** "I observed X"
   requires evidence you actually gathered. "I hypothesize X" means untested.
   Never present a hypothesis or a guess as a conclusion. If you don't know, say
   "I don't know yet" — then go find out.

2. **No claim without verification.** Before asserting a cause or fact:
   (a) write the claim; (b) write what evidence would confirm OR refute it;
   (c) obtain that evidence; (d) only then assert — otherwise report it as still
   unverified. Reasoning forward from an assumption is not evidence.

3. **Verify the instrument before you trust the reading.** Confirm your probe
   actually measures the real thing in the relevant context before concluding
   anything from it. A reading that contradicts the user's direct, repeated
   observation is most likely a broken instrument — fix/replace the instrument;
   do not use it to override the user.

4. **Ground truth wins.** The user's direct observation and the actual source code
   outrank any convenient signal, prior belief, or tool output. On conflict, the
   signal is suspect, not the ground truth.

5. **Do not assert about anything you have not verified — including the user.**
   Take the user's words literally. Do not tell them what they mean, feel, or are
   "really" saying. If unsure, ask.

6. **When you catch yourself concluding, assuming, or pattern-matching: stop.**
   Convert it into a question you can answer by finding out, answer that question
   against ground truth, then proceed.

7. **One reliable probe beats ten fast guesses.** If you cannot measure the real
   thing, build the instrument that can (e.g. log the real state in the app the
   user is actually running) instead of guessing from a proxy.

---

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
