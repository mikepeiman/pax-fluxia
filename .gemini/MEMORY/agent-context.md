

# Load Agent Context

## MANDATORY: Load `.agent/AGENT.md` at the start of every session.

This is the master context file containing ALL project rules, conventions, and domain knowledge.

## Key Rules (Inline for System Prompt)

### PowerShell
**NEVER use `&&` to chain commands.** Run commands separately or use `git ac "message"` alias.

### Trust User Feedback
- Never assume the user is mistaken about what they observed
- Always investigate before proposing a cause
- Use accurate language: "clarified" = new info, "corrected" = you were wrong

### Verification
Never claim something is "fixed" without evidence. Say "I've made changes — please verify."

### Document Everything
Every idea, fix, or feature the user mentions MUST be documented in `.atlas/FEATURE_STATUS.md` or `.atlas/DECISIONS.md`.

### Chat-First Response
Every response starts with a text paragraph showing: all remembered tasks, working assumptions, memory gaps, and your approach.

## Deep Dives (Load As Needed)
| Topic | File |
|-------|------|
| Architecture | `.agent/context/architecture.md` |
| Code standards | `.agent/context/code-standards.md` |
| Debugging | `.agent/context/debugging.md` |
| Game design | `.agent/context/game-design.md` |
| UI patterns | `.agent/context/ui-patterns.md` |
| Workflow | `.agent/context/workflow.md` |
| Tech gotchas | `.agent/context/tech-gotchas.md` |
