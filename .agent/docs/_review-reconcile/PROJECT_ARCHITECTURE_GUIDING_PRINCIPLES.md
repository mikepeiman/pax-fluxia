# Project Architecture — Guiding Principles

**Status:** ACTIVE — Applies to ALL code in the project, present and future.
**Created:** 2026-03-23

This document defines what "clean architecture" means for this project. It is not aspirational — it is a specification. Every decision, refactor, and new feature should be verifiable against these principles. When two approaches conflict, this document resolves the conflict.

---

## 1. Reliability Is the Highest Priority

**The system must work correctly, every time, in every state.**

### 1.1 No Silent Failures

A failure must be visible. If a module cannot produce valid output, it must signal that explicitly — a typed error, a console warning, a fallback indicator. Never return plausible-looking wrong data. Plausible-looking wrong data is the most dangerous kind of bug because it passes visual inspection and corrupts downstream logic without triggering any alarm.

### 1.2 Typed Boundaries Prevent Silent Breakage

Every module boundary is a TypeScript interface. If a producer stops producing the right shape, the build fails before the bug reaches the user. No `any`, no `Record<string, unknown>`, no `as` casts at module boundaries.

**Resolution:** If a type is inconvenient, the right response is to understand *why* it's inconvenient — the friction often reveals a design problem. Weakening the type hides the design problem behind a cast.

### 1.3 Immutable Data Between Modules

Data that crosses a module boundary should be `readonly`. If Module A produces data and Module B consumes it, B must not mutate A's output. This prevents the entire class of bugs where one consumer's modification silently corrupts another consumer's input.

### 1.4 Idempotent Computation

Given the same inputs, a module produces the same outputs, with no side effects. This makes every module independently testable, cacheable, and safe to call at any frequency. Caching follows naturally — if the inputs haven't changed, skip the computation and return the cached output.

---

## 2. Structure Reveals Purpose

**The project's file and folder layout must be a readable map of its architecture. A developer or agent reading the directory tree should understand what the system does, where each concern lives, and how modules relate — without opening a single file.**

### 2.1 Folder = Concern

Each top-level folder owns exactly one domain concern. If a folder's contents serve two different purposes, it should be split. If two folders serve the same purpose, they should be merged.

### 2.2 File = Responsibility

Each file has one job. Its name describes that job. If describing a file's responsibility requires "and" — e.g., "computes geometry **and** renders it" — the file should be split.

### 2.3 Depth = Specificity

The folder hierarchy moves from general to specific. Top-level folders name the domain (`territory/`, `renderers/`, `config/`). Subdirectories add specificity (`territory/layers/geometry/modes/`). Every level of depth adds one level of detail.

### 2.4 No Orphan Logic

If code exists in a file but isn't reachable from any import chain, it must be deleted. Dead code creates false signals about the system's structure. It suggests capabilities that don't exist and relationships that aren't real.

---

## 3. Easy to Reason About

**A developer reading any one module should be able to understand what it does, what it needs, and what it produces — without reading any other module's implementation.**

### 3.1 One-Way Data Flow

Data flows in one direction through the system. If Module A calls Module B, A passes data down. B returns data up. B does not reach into A's state, and A does not poll B's internal state. This eliminates circular dependencies and makes the call graph a DAG (directed acyclic graph).

### 3.2 Explicit Dependencies

A module declares its dependencies in its function signatures or constructor. It never reaches into global state, module-level mutables, or `globalThis` for data that another module produced. If a module needs data, it receives that data as a parameter.

**Why:** When dependencies are parameters, you can read a function's signature and know everything it needs. When dependencies are globals, you must read the entire function body — and every function it calls — to understand what state it touches.

### 3.3 Minimal Surface Area

A module exports only what its consumers need. Internal helpers, intermediate types, and implementation details are private. The fewer exports a module has, the easier it is to reason about its contract with the outside world.

### 3.4 No Implicit Coupling

Two modules that don't know about each other must not depend on shared assumptions about data format, timing, or execution order. If they need to coordinate, they should share an explicit contract (an interface, a protocol type, a shared constant file) — never a coincidence.

**Anti-pattern:** Module A happens to produce points in clockwise order. Module B happens to consume clockwise points. Neither declares this. When Module C is inserted between them and reverses the ordering, B breaks silently.

**Fix:** Declare the ordering invariant in a shared contract type. Now A, B, and C all reference the same specification.

---

## 4. Semantic Naming

**Every name — file, folder, type, function, variable — must accurately describe what it represents. Names are the primary interface between human intent and machine structure. Wrong names produce wrong reasoning.**

### 4.1 Names Describe Responsibility, Not History

A name answers "what does this do?" — never "when was this written?" or "who wrote it?"

| Wrong | Right | Why |
|-------|-------|-----|
| `Geometry_0319` | `BoundaryAwareFrontierGeometry` | Describes the algorithm's nature, not its date |
| `DY4` | `OptimalTransportBorderTransition` | Describes what it does, not its registry index |
| `PVV2` | `PowerVoronoiRenderer` | Describes the technique, not the version number |
| `engine.ts` | `TerritoryRuntimeCoordinator.ts` | Describes the role, not a vague metaphor |

### 4.2 Names Encode Position

A module's name should tell you where it sits in the architecture. Reading the name should answer:
- What **domain** does it belong to?
- What **kind** of module is it?
- What **specific concern** does it handle?

> `layers/transition/modes/OptimalTransportBorderMode.ts`

Domain: territory. Kind: transition mode. Concern: optimal transport for borders. No ambiguity, no further context needed.

### 4.3 Consistent Vocabulary

The project maintains a fixed vocabulary where each term has exactly one meaning. Terms are never used interchangeably, and no concept has two names.

| Term | Means | Never means |
|------|-------|------------|
| **compute** | Produce data through calculation | Draw to screen, update UI |
| **render** | Draw visual output to screen | Compute game logic |
| **build** | Construct a data structure | Compile, deploy |
| **update** | Advance state for a new frame | Modify in-place arbitrarily |
| **snapshot** | Immutable point-in-time data | Mutable state |
| **mode** | Interchangeable implementation of a contract | Configuration setting |
| **coordinator** | Orchestrator that selects modes and manages flow | Individual algorithm |
| **presenter** | Adapter that translates domain data to a rendering library | Domain logic |
| **bridge** | Integration adapter between domain and framework | Direct coupling |

When a new concept emerges, a new term is added to this table. When an existing concept matches an existing term, that term is reused — no synonyms.

### 4.4 Boolean Names Are Questions

A boolean variable's name reads as a yes/no question: `isActive`, `hasTransition`, `shouldSmooth`. Reading the name tells you what `true` means.

| Wrong | Right |
|-------|-------|
| `paused` | `isPaused` |
| `transition` | `hasActiveTransition` |
| `smooth` | `shouldApplySmoothing` |

---

## 5. Separation of Concerns

**Every module does one thing. That thing is defined clearly enough that you could explain it in one sentence. If a module does two things, split it. If two modules do the same thing, merge them.**

### 5.1 Domain ≠ Framework

Game logic (ownership, geometry, transitions) is pure computation — no rendering library, no UI framework, no browser APIs. Framework-specific code (PIXI, Svelte, browser events) lives in dedicated adapter/bridge modules at the project's edges.

**Test:** Can you run your game logic in a Node.js test without importing PIXI or Svelte? If not, framework code has leaked into the domain.

### 5.2 Data Production ≠ Data Consumption

The module that produces data is not the module that consumes it. A geometry module produces shapes. A presentation module consumes shapes and produces draw commands. An adapter consumes draw commands and makes PIXI calls. Each has a distinct, non-overlapping responsibility.

### 5.3 Configuration ≠ Implementation

Configuration values (what the user chose) are read in one place and passed as structured, typed objects to the modules that need them. No module reaches into global config directly. This means:
- Renaming a config key changes one file
- Adding a new option changes one file plus the consumer
- Testing with different configuration is trivial — pass different parameters

---

## 6. Progressive Architecture

**The project evolves toward clean architecture, always. This is not a one-time refactor — it is a direction of travel.**

### 6.1 Every Change Is an Opportunity

Every code change — bug fix, feature, refactor — is an opportunity to:
- Replace an ad-hoc solution with a principled one
- Extract a concern that's bleeding across boundaries
- Rename something that's misleading
- Delete code that's no longer needed

Not every change must improve architecture. But no change should degrade it. When a change would compromise architecture to save time, flag it for discussion rather than silently accepting the compromise.

### 6.2 Refactor Direction, Not Destination

The project won't achieve perfect architecture in one pass. The question is whether each change moves toward the principles in this document or away from them. Small, consistent improvements compound. Small, consistent compromises also compound — in the wrong direction.

### 6.3 Legacy Is Reference, Not Foundation

When existing code doesn't match these principles, the code is wrong — not the principles. Legacy code provides:
- **Algorithms** that may be worth re-implementing in clean architecture
- **Behavioral specifications** that were verified by the user (what it should look like)
- **Anti-patterns** that show what not to repeat

Legacy code is never the basis for new architecture. New code is designed from contracts first, implemented from principles, and validated against the user's observed expectations. Legacy code that has been fully superseded is deleted (with explicit user confirmation per D-87).

---

## 7. Conflict Resolution

When two goals conflict, resolve in this priority order:

1. **Correctness** — Does it produce the right result? (reliability)
2. **Clarity** — Can you understand what it does by reading the code? (structure + naming)
3. **Modularity** — Can you change one part without breaking another? (separation)
4. **Performance** — Is it fast enough? (only matters after 1-3 are satisfied)
5. **Brevity** — Is the code concise? (nice-to-have, never at the cost of 1-4)

**Example conflict:** A performance optimization would require leaking an internal data structure across a module boundary.

**Resolution:** Reject the optimization. Find a way to achieve the performance goal within the module boundary. If impossible, bring it to the user as a principled tradeoff — "we can gain X performance if we accept Y architectural compromise." Let the human make the tradeoff, not the agent.

---

## 8. Agent Working Protocol

These principles also govern how the AI agent works on this project:

### 8.1 Ongoing Architectural Analysis

The agent does not merely implement tasks — it continuously evaluates whether each step upholds these principles. If a task specification would violate a principle, the agent raises it before implementing.

### 8.2 Names First

Before writing any implementation, name the module, its types, its functions. If you can't name something clearly, you don't understand it well enough to implement it.

### 8.3 Contracts Before Code

Before writing any module, define its input and output types. If the types don't exist yet, write them first. Implementation follows naturally from clear contracts.

### 8.4 Evidence-Based Conclusions

The agent does not declare "root cause found" or "this is fixed" based on code inspection alone. Conclusions require evidence: build output, user observation, or runtime logs. (See: reflective-thinking rule, verification-first rule.)
