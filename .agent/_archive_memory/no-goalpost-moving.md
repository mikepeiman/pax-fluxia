# Never Change the Goalposts

## Axiom: "Never change the goalposts" without Architect (human user) instruction to do so.

This is a universal principle that applies to ALL design decisions, ALL code decisions, and ALL problem-solving.

When something doesn't work — a layout, a feature, an API contract, a test, a constraint — **solve the actual problem.** Do not redefine the problem so it ceases to exist.

**DO:**
- Fix the component, widget, logic, or design that isn't working
- Adapt the solution to meet the original requirement
- Ask the Architect if the requirement itself should change

**DO NOT:**
- Move a breakpoint to exclude a problematic viewport
- Relax a validation rule because inputs fail it
- Change a spec so the bug becomes "expected behavior"
- Rename or recategorize something to sidestep a design flaw
- Add a "special case" that avoids confronting the root issue

If the goalposts genuinely need to move, that is the **Architect's decision**, not the agent's.
