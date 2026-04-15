# Repo LOC Architecture Audit Prompt

## Purpose
This document defines a high-value, full-coverage repository audit prompt for an equivalent agent. The audit is not a style pass and not a code summary. It is an architecture-truth survey that should identify:

- source-of-truth violations
- architecture drift
- legacy/target overlap
- duplication
- invalid or implicit assumptions
- broken module boundaries
- naming and contract dishonesty
- dead or low-value complexity
- missing invariant tests
- places where code no longer matches the stated project direction

## Core Audit Questions
These are the most valuable questions for the agent to ask repeatedly at every scale.

### Universal Questions
- What is this trying to be the source of truth for?
- Should this responsibility live here?
- Is this target architecture, legacy compatibility, experiment, or accidental overlap?
- What invariant does this assume?
- Is that invariant explicit, tested, and still true?
- What depends on this, directly and indirectly?
- What would break if this disappeared tomorrow?
- Is the naming accurate to current behavior?
- Is this duplicating another concept, path, config, abstraction, or utility?
- Is this coupling necessary, or just historical residue?
- Does this make the system easier to reason about, or harder?

### Import / Export Questions
- Why is this boundary crossed?
- Is the dependency direction correct?
- Is this import exposing a layer leak?
- Is the exported surface larger than it should be?
- Is this export canonical, compatibility glue, or accidental public API?

### Function Questions
- Is this function doing one job at one abstraction level?
- Are its inputs and outputs the minimal honest contract?
- Does it hide global state, config assumptions, or timing assumptions?
- Does it know too much about upstream or downstream details?
- Is there another function elsewhere that already owns this concept?

### File Questions
- Does this file have one coherent purpose?
- Does the filename still describe reality?
- Is this file canonical, adapter, shim, experiment, or dead weight?
- Are multiple architectural layers mixed together here?
- Does the code match the comments and docs, or only the historical intent?

### Directory / Module Questions
- Is this a real module or just historical storage?
- Are responsibilities grouped by architecture or by accident?
- Are there mixed ownership layers inside the directory?
- Is the dependency direction between sibling modules sane?
- Is the directory name still honest?

### Concept / Assumption Questions
- Is this a game rule, render rule, transition rule, or implementation artifact?
- Is this local truth or cross-system truth?
- Is it documented anywhere authoritative?
- Does the code enforce it, or only assume it?
- Is this still part of the intended architecture?

### Config / Toggle Questions
- Is this a real product control, temporary experiment, migration shim, or dead residue?
- Does this toggle create a clean branch of behavior or a truth conflict?
- Is the toggle name honest about its effect?
- Is the system simpler or more confusing because this exists?

## Required Foundational Context
Before touching code, the agent must load and synthesize:

- `.agent/AGENT.md`
- the most recent territory/rendering implementation docs from the last 5 days
- key architecture contracts and types for:
  - ownership
  - geometry
  - transitions
  - render families
- any current project docs that define target direction versus legacy paths

For the current repo, the bootstrap set should include at minimum:

- `.agent/AGENT.md`
- `.agent/docs/project/implementation-plans/2026-04-08/territory-rendering-overview.md`
- selectively newer territory/rendering docs in:
  - `.agent/docs/project/implementation-plans/2026-04-10`
  - `.agent/docs/project/implementation-plans/2026-04-11`
  - `.agent/docs/project/implementation-plans/2026-04-12`

## Required Bootstrap Synthesis
Before the main audit starts, the agent must produce a short internal synthesis for itself:

- North Star summary
- glossary of project-specific terms
- list of target invariants
- map of canonical truths
- list of known legacy paths versus target modular paths

The glossary should include project-critical terms such as:

- CX
- DX
- MSR
- ownership truth
- geometry truth
- presentation truth
- render family
- legacy path
- modular path

## Context Refresh Rule
The agent must refresh its audit lens:

- at the start of every file
- every 250 LOC inside long files
- whenever it enters a new directory or module
- whenever it encounters a new concept that appears to be a source of truth

The refresh must be compact, not a full re-read. It should restate:

- North Star
- current glossary
- target invariants
- legacy vs target migration boundaries
- current audit lens

### Compact Refresh Template
Use this exact style internally:

```text
Audit refresh:
- North Star:
- Canonical truths:
- Legacy paths still present:
- Migration boundaries:
- Invariants to test while reading this section:
- Main questions for this file/chunk:
```

## Classification Pass
Before auditing a file in detail, classify it as one of:

- canonical
- adapter
- compatibility shim
- experiment
- dead or suspect

Then audit it according to that role, not according to its historical label.

## Audit Method
For each directory:

1. infer the actual module purpose
2. compare that purpose to the directory name and docs
3. identify mixed layers or conflicting ownership
4. identify duplicate truths and duplicate abstractions

For each file:

1. classify the file
2. identify claimed purpose
3. identify actual purpose
4. inspect imports and exports for boundary truth
5. inspect top-level globals and config access
6. inspect major functions and data contracts
7. identify assumptions, duplication, drift, and dead complexity
8. compare code behavior against docs

For long files:

1. re-anchor every 250 LOC
2. identify whether abstraction level changes mid-file
3. check whether earlier assumptions are contradicted later

## Hard Rules
- Do not summarize code mechanically.
- Do not accept comments or docstrings as truth unless code confirms them.
- When docs and code disagree, flag the conflict explicitly.
- Distinguish facts from inferences from recommendations.
- Cite code references for important claims.
- When two systems seem to own the same truth, identify both and state the likely canonical owner.
- Treat configuration, timing, caches, and fallbacks as first-class architecture.
- Prefer identifying reduction opportunities over adding more abstractions.

## Required Output Format Per File
For every audited file, emit:

- Purpose
- Claimed role
- Actual role
- Dependencies in
- Dependencies out
- Truth owned
- Assumptions
- Drift from target architecture
- Duplication or overlap
- Dead or suspect code
- Risk level
- Recommended action

## Required Output Format Per Directory
At the end of each directory or module, emit:

- actual module purpose
- internal inconsistencies
- cleanup opportunities
- boundary problems
- missing tests for real invariants

## Required Final Deliverables
At the end of the full audit, emit:

- repo-wide map of canonical truths
- top 20 architecture drifts
- top 20 duplicate or dead areas
- highest-value deletions
- highest-value refactors
- invariants that most need tests
- list of concepts whose names no longer match reality
- list of toggles and config options that should be reclassified as product control, experiment, shim, or dead residue

## Drop-In Prompt
Use the following prompt to run the audit with an equivalent agent.

```text
You are conducting a full-coverage architectural LOC audit of this repository.

Your job is not to summarize code. Your job is to identify:
1. source-of-truth violations
2. architecture drift
3. legacy/target overlap
4. duplication
5. invalid or implicit assumptions
6. broken module boundaries
7. naming or contract dishonesty
8. dead or low-value complexity
9. missing tests around real invariants
10. places where the code no longer matches the project's stated direction

Foundational context you must load first:
- .agent/AGENT.md
- the most recent territory/rendering implementation docs from the last 5 days
- key architecture contracts and types for ownership, geometry, transitions, and render-family boundaries

Before auditing code, produce for yourself:
- a concise North Star summary
- a glossary of project-specific terms
- a list of target invariants
- a list of known legacy paths vs target modular paths
- a map of canonical truths

During the audit, you must refresh this context:
- at the start of every file
- every 250 LOC in long files
- whenever entering a new directory or module
- whenever encountering a new source-of-truth concept

The refresh should be brief and should restate:
- North Star
- canonical truths
- legacy paths still present
- migration boundaries
- invariants to test while reading this section
- main questions for this file or chunk

At every scale, ask:
- What is this supposed to own?
- Should it own that here?
- Is this canonical, legacy, experiment, or residue?
- What assumptions does it make?
- Are those assumptions explicit and still valid?
- Is the dependency direction correct?
- Is this duplicating another concept, path, config, utility, or abstraction?
- What breaks if this is removed?
- Is the naming honest?
- Is the behavior aligned with current architecture docs?

Audit procedure:
- Traverse directory by directory.
- For every file, classify it first as canonical, adapter, compatibility shim, experiment, or dead/suspect.
- Then audit imports, exports, top-level responsibilities, major functions, config usage, caches, timing assumptions, and implicit assumptions.
- Distinguish facts from inferences from recommendations.
- Cite code references for all important claims.
- Do not accept comments or docstrings as truth unless code confirms them.
- When code conflicts with docs, flag the conflict explicitly.
- When two systems appear to own the same truth, flag both and identify the likely canonical owner.
- When a toggle or config exists, ask whether it is a real product control, temporary experiment, migration glue, or dead residue.

Output format for each file:
- Purpose
- Claimed role
- Actual role
- Dependencies in
- Dependencies out
- Truth owned
- Assumptions
- Drift from target architecture
- Duplication / overlap
- Dead or suspect code
- Risk level
- Recommended action

At the end of each directory:
- summarize the module's actual architecture
- list internal inconsistencies
- list cleanup opportunities
- list missing tests for real invariants

At the end of the whole audit:
- produce a repo-wide map of canonical truths
- list the top 20 architecture drifts
- list the top 20 dead or duplicate areas
- list the highest-value deletions
- list the highest-value refactors
- list the invariants that most need tests
- list the concepts whose names no longer match reality
- list toggles that should be reclassified as product control, experiment, shim, or dead residue
```

## Operator Note
If this prompt is used for a territory/rendering-focused audit rather than full-repo coverage, keep the same rubric but narrow traversal to the territory, renderers, transitions, config, and UI control surfaces first. Do not drop the context-refresh rule.
