# LOC Audit Agent Prompt And Recipe - 2026-04-12

## Purpose

Create a high-value surveying prompt and execution recipe for an equivalent agent to audit the entire Pax Fluxia repository at the level of:

- every LOC
- every function
- every import/export
- every file
- every directory
- every concept
- every implicit assumption

The goal is not to summarize code. The goal is to determine what is valuable, canonical, duplicated, drifting, misleading, obsolete, underspecified, overcomplicated, or strategically potent.

---

## Core Audit Principle

The audit should behave like an architecture-and-value investigation, not a passive reading exercise.

The agent should repeatedly ask:

1. Why does this exist?
2. What value does it provide right now?
3. Is this the canonical owner of this responsibility?
4. What truth does this own, and what truth does it duplicate?
5. What assumptions does this make?
6. Are those assumptions still valid?
7. Is this active, transitional, legacy, experimental, dead, or misleading?
8. If removed, what would actually break?
9. Does this match current architecture and active plans?
10. Is this simple because it is good, or simple because it is incomplete?
11. Is this complexity buying anything real?
12. Is the naming honest?
13. Is this import/export boundary clean?
14. Does this create SP/MP divergence, UI/runtime divergence, or doc/code divergence?
15. Should this be kept, moved, merged, rewritten, surfaced, archived, or deleted?

---

## Audit Dimensions

Every substantive unit should be evaluated against these dimensions:

- `Value`
- `Canonicality`
- `Duplication`
- `Drift risk`
- `Complexity cost`
- `Debuggability`
- `Architecture fit`
- `UI/UX truthfulness`
- `Deletion confidence`

Recommended scale:

- `0` = none / broken / absent
- `1` = weak
- `2` = mixed
- `3` = strong

---

## Foundational Context Pack

Before auditing code, the agent must load and internalize the current canonical context. For this repo, start with:

1. [AGENT.md](C:/Users/mikep/Desktop/WebDev/pax-fluxia/.agent/AGENT.md)
2. [FEATURE_AND_TASK_QUEUE_2026-04-12.md](C:/Users/mikep/Desktop/WebDev/pax-fluxia/.agent/docs/project/implementation-plans/2026-04-12/FEATURE_AND_TASK_QUEUE_2026-04-12.md)
3. [MASTER_PROGRAM_PLAN_2026-04-12.md](C:/Users/mikep/Desktop/WebDev/pax-fluxia/.agent/docs/project/implementation-plans/2026-04-12/MASTER_PROGRAM_PLAN_2026-04-12.md)
4. [SESSION_2026-04-12.md](C:/Users/mikep/Desktop/WebDev/pax-fluxia/.agent/docs/project/sessions/notes/SESSION_2026-04-12.md)
5. [MAIN_MENU_UI_REDESIGN_PLAN_2026-04-12.md](C:/Users/mikep/Desktop/WebDev/pax-fluxia/.agent/docs/project/implementation-plans/2026-04-12/MAIN_MENU_UI_REDESIGN_PLAN_2026-04-12.md)
6. [MP_PUBLIC_ROOM_TRANSPORT_FIX_2026-04-12.md](C:/Users/mikep/Desktop/WebDev/pax-fluxia/.agent/docs/project/implementation-plans/2026-04-12/MP_PUBLIC_ROOM_TRANSPORT_FIX_2026-04-12.md)
7. [MAPGEN_RUNTIME_REGRESSION_ANALYSIS_2026-04-12.md](C:/Users/mikep/Desktop/WebDev/pax-fluxia/.agent/docs/project/implementation-plans/2026-04-12/MAPGEN_RUNTIME_REGRESSION_ANALYSIS_2026-04-12.md)

If doing a larger architecture sweep, also load the current canonical docs for:

- mechanics
- terminology
- territory architecture
- major post-mortems

### Context The Agent Must Explicitly Internalize

- `/common` owns shared truth and deterministic derived truth
- client owns presentation and runtime consumption
- server owns authority and networking, not divergent gameplay meaning
- SP/MP divergence is a defect unless explicitly intended
- misleading active-looking dead code is high severity
- naming matters because false names create false reasoning
- value extraction beats documentation sprawl
- user-facing UI must reflect real state, not implementation convenience

---

## Refresh Discipline

Do not stuff the full context pack into every step. Use layered refresh.

### Once Per Audit Run

Load the full foundational context pack.

### Once Per Directory

Re-anchor on:

- what this directory should own
- what the architecture says it should not own
- what current active plans imply for it

### Once Per File

Re-state:

- current subsystem
- expected ownership
- active architecture constraints
- top 3 suspicion axes for this file

### Every 200-300 LOC Or At Major Symbol Boundary

Refresh a short working frame:

- what this file claims to do
- what it is actually doing
- whether ownership drift is appearing
- whether assumptions are going stale
- whether duplication is emerging

### Immediate Refresh Triggers

Force a re-anchor when the agent detects:

- legacy/new architecture overlap
- duplicate truth
- unexplained config
- a function that seems too important for its location
- weird imports
- “helper” files doing policy work
- user-facing UI showing possibly false state
- anything that contradicts current plans

---

## Best Output Structure

The agent should not emit one undifferentiated blob. It should produce outputs in layers.

### Directory-Level Output

For each directory:

- intended ownership
- actual ownership
- boundary violations
- duplication patterns
- archival or consolidation candidates

### File-Level Output

For each file:

- purpose
- status
  - `canonical`
  - `active`
  - `transitional`
  - `legacy`
  - `experimental`
  - `dead`
  - `misleading`
- value assessment
- drift assessment
- duplication assessment
- key findings
- recommended action
- confidence

### Symbol-Level Output

For important functions, exports, configs, and assumptions:

- what it claims to do
- what it really does
- what depends on it
- whether it belongs here
- whether it should survive unchanged

### Repo-Level Synthesis

At the end, require:

- top deletion targets
- top consolidation targets
- top architectural contradictions
- top naming problems
- top drift risks
- top missing diagnostics
- top missing surfaced controls
- top docs to keep
- top docs to archive
- best next 10 cleanup moves

---

## Recommended Pass Order

Run the audit in passes rather than one monolithic sweep.

1. `Directory ownership pass`
2. `Canonical file pass`
3. `Import/export boundary pass`
4. `Function and assumption pass`
5. `Config and surfaced-control pass`
6. `Delete/merge/archive plan pass`
7. `Docs/prompts/rules corpus pass`

This sequence produces better judgment than a single long readthrough.

---

## Prompt Template

Use this prompt almost verbatim for an equivalent agent:

```md
You are conducting a repository-wide LOC audit of Pax Fluxia.

Your goal is not to summarize code. Your goal is to determine:
- what is valuable
- what is canonical
- what is duplicated
- what is drifting
- what is misleading
- what should be kept, moved, merged, rewritten, surfaced, archived, or deleted

## Canonical context you must load first
- [AGENT.md](C:/Users/mikep/Desktop/WebDev/pax-fluxia/.agent/AGENT.md)
- [FEATURE_AND_TASK_QUEUE_2026-04-12.md](C:/Users/mikep/Desktop/WebDev/pax-fluxia/.agent/docs/project/implementation-plans/2026-04-12/FEATURE_AND_TASK_QUEUE_2026-04-12.md)
- [MASTER_PROGRAM_PLAN_2026-04-12.md](C:/Users/mikep/Desktop/WebDev/pax-fluxia/.agent/docs/project/implementation-plans/2026-04-12/MASTER_PROGRAM_PLAN_2026-04-12.md)
- [SESSION_2026-04-12.md](C:/Users/mikep/Desktop/WebDev/pax-fluxia/.agent/docs/project/sessions/notes/SESSION_2026-04-12.md)
- [MAIN_MENU_UI_REDESIGN_PLAN_2026-04-12.md](C:/Users/mikep/Desktop/WebDev/pax-fluxia/.agent/docs/project/implementation-plans/2026-04-12/MAIN_MENU_UI_REDESIGN_PLAN_2026-04-12.md)

Core constraints:
- `/common` owns shared truth and deterministic derived truth
- client owns presentation/runtime consumption
- server owns authority/networking, not divergent gameplay meaning
- SP/MP divergence is a defect unless explicitly intended
- misleading active-looking dead code is high severity
- naming must reflect actual behavior
- prefer deletion and consolidation over commentary sprawl

## Your standing audit questions
For every directory, file, export, function, important block, and suspicious assumption, ask:
1. Why does this exist?
2. What value does it provide now?
3. Is this the canonical place for this responsibility?
4. What truth does it own vs duplicate?
5. What assumptions does it depend on?
6. Does it align with current architecture and active plans?
7. Is it active, transitional, legacy, dead, experimental, or misleading?
8. Should it be kept, moved, merged, rewritten, surfaced, hidden, archived, or deleted?

## Refresh discipline
- Load the full context pack once at the start.
- Before each directory, restate what that directory should own.
- Before each file, restate current subsystem, expected ownership, and top suspicion axes.
- Every 200-300 LOC or at major symbol boundaries, refresh your short working frame:
  - what the file claims to do
  - what it is actually doing
  - what is drifting
  - what is duplicated
- If you detect context drift or architectural conflict, stop and re-anchor before continuing.

## Required output structure
For each directory:
- intended ownership
- actual ownership
- boundary violations
- consolidation opportunities

For each file:
- purpose
- status
- value assessment
- drift assessment
- duplication assessment
- key findings
- recommended action
- confidence

For each important symbol:
- claimed role
- actual role
- dependency significance
- keep / move / merge / rewrite / delete recommendation

At repo end:
- top deletion targets
- top consolidation targets
- top architectural contradictions
- top naming problems
- top missing diagnostics/tests
- top docs to keep
- top docs to archive
- best next 10 cleanup moves

## Severity escalation
Escalate when you find:
- duplicate truths
- misleading names
- dead code masquerading as active
- SP/MP divergence
- UI presenting false state
- runtime logic split across unclear owners
- active config/tunables that are unsurfaced or nonfunctional

## Style rules
- Do not produce generic praise.
- Do not summarize everything equally.
- Prefer decisive judgments with evidence.
- If uncertain, say exactly why.
- Optimize for value extraction, not completeness theater.
```

---

## Extra High-Value Questions By Level

### Every Import / Export

- Is this boundary honest?
- Is this export truly public, or just convenient?
- Is this import pulling responsibility in from the wrong layer?
- Would moving this symbol simplify the dependency graph?

### Every Function

- Is this a function or a disguised policy boundary?
- Does its name match its side effects?
- Does it own logic that should live elsewhere?
- Is it hiding multiple responsibilities?

### Every File

- Does this file deserve to exist as its own file?
- Is it too broad, too thin, or fake-modular?
- Does it preserve or obscure system understanding?

### Every Directory

- Is this a real subsystem or a junk drawer?
- If renamed, would the new name be more honest?
- Should this collapse into a clearer home?

### Every Concept / Assumption

- Is this concept still current?
- Is it documented canonically?
- Is it implemented in one place or many?
- Is the code organized around the right concept, or an accidental historical artifact?

---

## Best Final Deliverables

If this audit is successful, the best outputs are:

1. a ranked delete/archive list
2. a ranked consolidation list
3. a canonical ownership map
4. a drift map
5. a terminology cleanup list
6. a “top 10 next cleanup moves” implementation plan

That is much more valuable than a giant summary.
