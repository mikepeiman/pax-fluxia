# Model Selection Guide

> **Default instinct**: "Always pick the biggest model."
> **Better instinct**: "Pick the model that matches the task's *reasoning depth*."
>
> Opus is not "better" at writing a for-loop than Sonnet. It's better at reasoning about *which* for-loop to write when 5 subsystems interact. If the task doesn't require that depth, you're burning quota for zero benefit.

---

## Available Models (Google One AI Ultra via Antigravity)

| Model | Tier | Strengths | Latency | Use When |
|-------|------|-----------|---------|----------|
| **Claude Opus 4.6 (Thinking)** | 🔴 Heavy | Deep multi-step reasoning, architecture, complex debugging, novel design | Slowest | You need a "senior architect brain" |
| **Claude Sonnet 4.6 (Thinking)** | 🟡 Standard | Code generation, refactoring, feature work, code review, most tasks | Medium | **Default for 80% of work** |
| **Gemini 3.1 Pro (High)** | 🟡 Standard | Large context, good code gen, strong at reading big files | Medium | Big codebase reads, long sessions |
| **Gemini 3.1 Pro (Low)** | 🟢 Light | Same model, less compute per token | Faster | Shorter tasks, doc writing |
| **Gemini 3 Flash** | 🟢 Light | Very fast, cheap, good enough for simple work | Fast | Lookups, grep-like work, formatting |
| **GPT-OSS 120B (Medium)** | 🟢 Light | Alternative perspective, decent reasoning | Medium | Second opinion, variety |

---

## Mapped to PRISM Variable Rigour

| Gear | Task Type | Recommended Model |
|------|-----------|-------------------|
| **Gear 1: Hotfix** | Bug fixes, config tweaks, < 50 lines | **Sonnet 4.6** or **Gemini 3.1 Pro (Low)** |
| **Gear 2: Feature** | New features, UI work, refactors, component extraction | **Sonnet 4.6** (default) |
| **Gear 3: Deep Work** | Architecture changes, new systems, engine convergence, multi-system debugging | **Opus 4.6** |

### The Decision Tree

```
Is this bug/feature contained within 1-2 files?
  YES → Sonnet 4.6
  NO  → Does it cross 3+ subsystems (engine + renderer + server)?
          YES → Opus 4.6
          NO  → Sonnet 4.6

Am I generating boilerplate or routine code?
  YES → Gemini 3 Flash or Gemini 3.1 Pro (Low)

Am I debugging something that's failed 2+ previous fixes?
  YES → Opus 4.6 (needs the deeper reasoning to break out of the loop)

Am I reading/auditing a large codebase or long doc?
  YES → Gemini 3.1 Pro (High) (best large context handling)
```

---

## When to Override to Opus

Even during Gear 1/2 work, escalate to Opus when:

1. **Repeated failure** — a fix has failed 2+ times and you need deeper reasoning
2. **Cross-cutting concerns** — change touches engine + renderer + server + schemas
3. **Novel design** — nothing like this exists in the codebase yet
4. **Ambiguous specs** — user described something but the implementation path isn't obvious
5. **Engine convergence** — Phase 3 work (stripping client duplication) requires understanding both engines simultaneously

---

## When Gemini 3 Flash is Enough

Don't overthink these:

- Reformatting/linting existing code
- Writing session documents
- Updating FEATURE_STATUS.md
- Adding comments or documentation
- Simple config changes
- Looking up information in large files
- Git operations (commit messages, log review)

---

## Practical Rule of Thumb

> **Start with Sonnet 4.6.** If you find yourself thinking "this is harder than expected" or "I need to understand how 3 systems interact" — *then* switch to Opus for that task. Most sessions should be 70% Sonnet, 20% Flash/Pro, 10% Opus.

The cost of picking Sonnet when Opus was needed: you waste 5 minutes, notice the output isn't deep enough, and switch. Low cost.

The cost of always picking Opus: you burn through quota 3-5x faster, sessions are slower, and **80% of that extra reasoning power was unused** because the task didn't need it.
