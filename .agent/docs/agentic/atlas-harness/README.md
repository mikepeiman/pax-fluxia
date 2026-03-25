# Atlas Harness Project

A Windows-first TypeScript service providing AI agents with a typed, transactional API for workspace operations — plus methodology enforcement hooks that make PRISM-Atlas rules structurally unbreakable.

## Project Documents

| # | Document | Purpose |
|---|----------|---------|
| 01 | [Methodology Review](01-methodology-review.md) | Grading of PRISM/Atlas/DART, lessons learned, system evolution, harness hook opportunities |
| 02 | [Basic Harness Plan](02-basic-harness-plan.md) | Build plan for core reliability layer: file ops, process exec, git, workspace, lossless chat log |
| 03 | [Atlas Harness Plan](03-atlas-harness-plan.md) | Build plan for methodology enforcement layer: 8 hooks built on top of Basic Harness |
| 04 | [Perplexity Evaluation](04-perplexity-evaluation.md) | Dual-perspective evaluation of the Perplexity prototype — what to adopt, modify, and add |

## Reference Material

| File | What |
|------|------|
| [reference/00-original-spec.md](reference/00-original-spec.md) | Original Windows agent harness specification |
| [reference/agent-harness-schema.md](reference/agent-harness-schema.md) | Perplexity: Complete JSON-RPC API schema with examples |
| [reference/implementation-reference.md](reference/implementation-reference.md) | Perplexity: Working TypeScript implementations (~1,500 LOC) |
| [reference/project-scaffold.md](reference/project-scaffold.md) | Perplexity: Full project structure with types and config |
| [reference/script.py](reference/script.py) | Perplexity: Outline script |
| [reference/prism-critique.md](reference/prism-critique.md) | PRISM meta-analysis and improvement proposals |
| [reference/ai-mental-models.md](reference/ai-mental-models.md) | Thinking tools taxonomy (lenses, operations, recipes) |

## Key Decisions

- **Runtime**: Bun first, Node LTS fallback
- **IPC**: All three transports (stdio, named pipe, HTTP localhost)
- **Project**: Standalone repo, separate from Pax Fluxia
- **Approach**: Fork Perplexity prototype → fix shortcomings → add chat log/context → layer Atlas hooks

## Getting Started

Copy this entire folder to a new location and initialize as a git project:
```powershell
Copy-Item -Path ".agent\SYSTEM\atlas-harness-project" -Destination "C:\Users\mikep\Desktop\WebDev\atlas-harness" -Recurse
cd "C:\Users\mikep\Desktop\WebDev\atlas-harness"
git init
git add -A
git commit -m "Initial planning docs for Atlas Harness"
```
