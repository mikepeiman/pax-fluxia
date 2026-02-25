---
description: Load AGENT.md context file at session start for project conventions
globs: "**/*.{ts,js,svelte,md}"
---

# Rule: Load Agent Context

At the start of every session or when referenced, load `.agent/AGENT.md` for the full project context.
For domain-specific deep dives, load the relevant file from `.agent/context/`.

## Quick Reference
| Need | Load |
|------|------|
| Full project context | `.agent/AGENT.md` |
| Naming, file sizes, logging | `.agent/context/code-standards.md` |
| Debugging methodology | `.agent/context/debugging.md` |
| Game mechanics, animations | `.agent/context/game-design.md` |
| UI layout, CSS, responsive | `.agent/context/ui-patterns.md` |
| Shared engine, Colyseus | `.agent/context/architecture.md` |
| Git, tasks, session docs | `.agent/context/workflow.md` |
| Specific tech traps | `.agent/context/tech-gotchas.md` |
