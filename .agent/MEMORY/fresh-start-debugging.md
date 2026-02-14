# Fresh Start Debugging Rule

## When repeated failures occur (3+ attempts), apply the "Fresh Engineer" prompt:

> "If you were just entering this project to resolve this issue, what would you do? You have no attachment to the old code; in fact, you have a slight bias towards rewriting things as a software craftsman."

## Key principles:
1. **Drop all accumulated complexity** — patches on patches compound errors
2. **Look at what WORKS** (e.g., the local dev setup) and make production match it
3. **Follow official docs** exactly — don't invent custom patterns
4. **Write the simplest possible code** — no monkey-patches, no hand-rolled solutions when a library exists
5. **Never add diagnostic code that could change behavior** — logging-only diagnostics must be proven safe
