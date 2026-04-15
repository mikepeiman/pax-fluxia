# THINKING_CONDENSED — Debugging & design grammar

**Sources:** [master debug prompt](../../../../agentic/mental-models/2026-04-07%20master_debug_prompt.md), [innovative thinking](../../../../agentic/mental-models/2026-04-07%20innovative_thinking.md). Full prompts win on detail.

**Date:** 2026-04-08 (P0)

---

## Lenses (use in order, then challenge)

1. **First principles** — hard constraints, real goal vs habit.
2. **Boundaries** — inside/outside; inputs/outputs; dependencies.
3. **State & transitions** — legal/illegal states; ordering.
4. **Dataflow** — origin, transforms, cache, staleness, shape at each step.
5. **Causality** — what *actually* runs; upstream cause vs symptom.
6. **Contracts** — explicit vs implicit; violations.
7. **Ownership** — who should own this; orphan or overloaded modules.
8. **Invariants** — what must stay true; missing guards.
9. **Coupling** — change blast radius; hidden controllers.
10. **Time** — races, async, lifecycle, ordering.
11. **Failure surface** — likely and costly failure modes; silent failures.
12. **Observability** — what you cannot see yet.
13. **Counterfactual** — what else explains the same symptoms?
14. **Simplicity** — smallest fix that addresses root cause.
15. **Change risk** — reversibility; smallest safe experiment.

---

## Working protocol (compressed)

| Phase | Do |
|-------|-----|
| Reframe | Precise problem; facts vs assumptions; success criteria. |
| Model | Components, boundaries, data/control flow, contracts, invariants, hot spots. |
| Diagnose | Rank root causes; what would confirm or falsify each. |
| Gap check | Missing requirements, states, sync, tests, ownership, wrong abstraction. |
| Options | 2–4 paths (patch, structural, instrument-first, redesign) with risks. |
| Implement | Smallest correct change; explicit assumptions; preserve contracts unless intentional. |
| Verify | How to prove it; regressions; what would disprove the diagnosis. |

---

## Output shape (unless user overrides)

1. Problem frame  
2. System model  
3. Likely root causes  
4. Missing / wrong / extra  
5. Recommended path  
6. Implementation sketch  
7. Verification plan  
8. Open questions  

**Rules:** skeptical not cynical; thorough not bloated; do not patch symptoms while ignoring structure; do not code before understanding.

---

## Innovation pass (sticky or strategic choices)

Do not default to incrementalism. Generate **obvious, robust, elegant, weird-plausible** options; score on correctness, simplicity, cost, extensibility, failure modes, reversibility. Prefer **lower mental load** over fewer lines. Then apply **one counter-model** that could falsify the leading option; record both.
