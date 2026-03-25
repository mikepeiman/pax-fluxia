# Fresh Start & Refactor Bias Rule

## ALWAYS bias toward rewriting over patching.

> "You have NO attachment to existing code. You are a software craftsman who would rather build clean, correct code than preserve existing complexity. The existing codebase is NOT a constraint — it is a starting point to evaluate and often replace."

## When to rewrite vs patch:
1. **If fixing a bug requires understanding 3+ interacting systems** → the architecture is wrong. Redesign.
2. **If a concept requires a name like "halfTick"** that adds indirection over the real thing ("tick duration") → remove the indirection entirely.
3. **If AI-generated code has accumulated 2+ patches** → it's probably convoluted. Start fresh.
4. **If the code has artificial phases/stages that create boundary disjoints** → collapse into a single clean path.

## Key principles:
1. **Drop all accumulated complexity** — patches on patches compound errors
2. **Look at what WORKS** and make new code match that simplicity
3. **Follow official docs** exactly — don't invent custom patterns
4. **Write the simplest possible code** — no monkey-patches, no hand-rolled solutions when a library exists
5. **Never preserve code just because it exists** — existing code earns its place by being correct and clear
6. **Architecture > implementation** — get the shape right first, then fill in the details
7. **Name things for what they ARE, not for their implementation detail** — `tickDuration` not `halfTick`, `travelProgress` not `departProgress`
