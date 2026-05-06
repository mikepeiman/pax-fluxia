# Semantics, Naming, and Communication Synthesis

Date: 2026-05-06
Status: Working reference
Purpose: Consolidate the strongest live and archived guidance on semantics, naming, terminology, reporting, and rename discipline into one upstream reference.

This document is not a migration plan, audit ledger, or task queue.
It is the baseline language contract that later audits, refactors, architecture docs, and reports should follow.

## Governing Sources

### Live sources
- `.agent/AGENT.md`
- `.agent/docs/engineering/NAMING_CONVENTIONS.md`
- `.agent/docs/game/design/TERMINOLOGY.md`
- `.agent/docs/agentic/context/code-standards.md`
- `.agent/docs/agentic/context/workflow.md`

### Archived continuity sources
- `.agent/docs/agentic/archive-memory/semantic-naming.md`
- `.agent/docs/agentic/archive-rules/semantic-naming.md`
- `.agent/docs/agentic/archive-rules/trust-user-feedback.md`
- `.agent/docs/agentic/archive-rules/verification-first.md`
- `.agent/docs/agentic/archive-memory/exhaustive-reference-cleanup.md`
- `.agent/docs/agentic/archive-memory/mandatory-search-before-refactor.md`
- `.agent/docs/agentic/archive-memory/clickable-code-refs.md`

## Source Priority

When sources differ, use this order:

1. Direct user language for the current task
2. `.agent/AGENT.md`
3. live terminology, naming, and architecture docs
4. live code-standards and workflow docs
5. archived rule and memory docs used for continuity
6. dated plans, session notes, and historical investigations as context only

## Synthesized Intent

The truest shared intent across these sources is:

- Code and docs should read like the game, not like abstract computer science.
- Names should reveal domain meaning, ownership, and layer responsibility.
- User language is not a suggestion. It is part of the specification.
- Observed runtime behavior outranks agent speculation.
- The burden of clarity belongs to the agent, not the user.
- Reporting language must be explicit about status, scope, verification, and file locations.
- Renames are system changes, not local text edits. Every dependent reference must be traced and cleaned in one pass.

## Naming Principles

### 1. Prefer game-domain language over generic jargon

Use names that match the game model:

| Concept | Prefer | Avoid |
|---|---|---|
| ships moving between stars | `transfer`, `transit` | `flow`, `stream` |
| player move/attack command | `order` | `link`, `directive`, `command` |
| conflict between forces | `battle`, `engagement` | vague subsystem prose like `fight` |
| taking a star | `conquest`, `capture` | `takeover`, `seize` |
| star-to-star path | `lane`, `link`, `route` | generic `connection`, `edge`, `path` when more specific terms exist |
| damaged ship recovery | `repair` | `heal`, `restore`, `fix` |
| post-conquest ship escape | `scatter`, `retreat` | `escape`, `flee`, `run` |
| ship creation at stars | `production`, `produce` | `spawn`, `generate`, `create` |
| game time unit | `tick` | `turn`, `frame`, `cycle` |
| ownership change | `setOwner`, `changeOwnership` | `transfer` when ownership is meant |

### 2. Use names that describe the represented thing, not a misleading abstraction

- A visual name should match what the player is actually seeing.
- A renderer or mode name should identify the method when multiple methods exist.
- A concept name should not be reused for a control, artifact, or effect that represents something narrower.

Examples of the intended pattern:

- If a glow shows per-star power, name it for star power, not territory ownership.
- If two systems differ because one is Voronoi and one is Metaball, the method name should be visible where the distinction matters.
- If a term describes gameplay truth, do not also use it for a presentation-only effect.

### 3. Prefer narrow, truthful names over broad umbrella words

- Use the smallest term that correctly describes the job.
- Avoid vague authority words and broad abstractions when a domain term, representation term, or method term is available.
- If a name hides a wrong model, fix the model or ownership boundary, not only the label.

### 4. User terminology takes priority

If the user introduces or insists on a term:

- adopt it immediately unless it conflicts with an established project definition
- if there is a conflict, disambiguate explicitly rather than silently reverting to internal jargon
- do not defend internal wording as "more technical" if it weakens shared understanding

## Naming Patterns

- Actions: verb-first, such as `executeTransferOrders`, `resolveBattle`
- Queries: `get`, `is`, `has`, `should`
- Booleans: `is`, `has`, `should`
- Collections: plural nouns
- Config: `ALL_CAPS_WITH_UNITS` when values are surfaced config
- Avoid version suffixes like `V2`, `V3`, `V4` as semantic names

Git and history track versions. Names in code should describe role and behavior.

## Project Terminology Baseline

These terms should stay stable unless the project explicitly redefines them:

- `Territory`: connected same-owner stars and the space within their bounds
- `Frontier`: boundary geometry where territories meet
- `Front`: a contested section of frontier
- `Region`: contiguous owned area
- `Lane`: a connection or route between two stars
- `Order`: a player command
- `Transfer`: ships moving along a lane
- `Conquest`: capture of a star
- `Ownership Layer`: who owns what
- `Geometry Layer`: shapes derived from ownership
- `Transition Layer`: how geometry changes over time
- `Presentation Layer`: how current state is drawn

## Required Distinctions

Some distinctions are repeatedly called out across the sources and must remain explicit:

- `connectivity` = which star pairs are connected
- `lane geometry` = the actual line for an existing connection
- `order` = player command
- `transfer` = ships in motion as the result of an order
- `territory` = gameplay/domain concept
- method names like `Voronoi` or `Metaball` = geometry or rendering technique

Do not blur these categories in code, docs, or reports.

## Communication Bias Warning

The same bias that produces bad semantic names in code also produces bad dialogue:

- vague umbrella words that sound authoritative but hide uncertainty
- invented internal jargon that the user did not ask for
- prestige wording that gestures at structure without naming the actual thing
- explanations that rename a problem instead of explaining it
- rhetorical softening that hides agent error or weak evidence

This is not a cosmetic problem.
It wastes user time, increases prompt count, and forces the user to do disambiguation work that belongs to the agent.

The user should not have to repeatedly challenge:

- what a term means
- whether a claim is evidence-backed
- whether a summary describes code, design intent, or speculation
- whether a response answered the actual question

## Communication Contract

### 1. Primary goal: minimize user disambiguation burden

Every response should reduce ambiguity, not export it.

Hard rule:

- If the user has to spend extra turns extracting plain meaning from the response, the communication failed.

Therefore:

- prefer plain language before framework language
- prefer existing project terms before newly coined terms
- define any non-obvious term immediately if it must be used
- remove unnecessary abstraction layers from explanations
- answer the user's actual question before adding surrounding theory

### 2. User wording is specification

- User wording is specification, not loose inspiration.
- Do not rename the user's concern into a more convenient or more flattering abstraction.
- Do not silently substitute a nearby-but-different problem.
- If the user's term conflicts with an established project term, state the conflict explicitly and resolve it in writing.

### 3. User observations outrank agent inference

When the user reports behavior:

- do not assume the user is mistaken
- do not substitute code reasoning for observed runtime behavior
- investigate before claiming cause
- ask clarifying questions if the report is ambiguous

### 4. Dialogue first when meaning is unclear

- If the report is ambiguous, clarify before theorizing.
- If the request contains multiple possible interpretations, name the fork explicitly.
- If a term may mean different things at different layers, disambiguate before proceeding.

The agent must not hide confusion behind confident prose.

### 5. Reporting language must be precise

Use accurate verbs:

- `user reported` = the user described observed behavior
- `user corrected` = the user said the prior statement was wrong
- `user emphasized` = the user repeated an already-stated requirement
- `user clarified` = the user added genuinely new information

Do not soften your own mistakes by relabeling them as clarification.

### 6. Ban on private jargon, sophistry, and prestige wording

Do not use language that sounds intelligent while saying less than a direct statement would.

Prohibited communication patterns:

- invented umbrella terms that are not defined in the same message or doc
- opaque status prose like `the architecture is in a semantic reconciliation state`
- pseudo-precision words with no concrete referent
- replacing a concrete answer with taxonomy or ceremony
- using abstraction to avoid admitting uncertainty or error
- renaming a bug, contradiction, or drift instead of describing it plainly

If a term is not already established in:

- the user prompt
- the project glossary
- the governing architecture docs

then either:

- avoid it, or
- define it immediately in one sentence and justify why it is needed

### 7. No goalpost-moving in dialogue

- Do not reinterpret a request into an easier adjacent task without saying so.
- Do not present a partial answer as if it satisfied the original request.
- Do not collapse `plan`, `audit`, `implementation`, and `report` into one vague notion of progress.
- If the task changed, say what changed, why, and whether the user requested that change.

### 8. Every work report must state the operational facts

When proposing or reporting work, always state:

- whether the change is planned or implemented
- which layer changed
- whether verification is still needed
- the exact filesystem paths for relevant files, docs, outputs, or tools

When useful, also separate:

- facts
- assumptions
- unknowns
- next action

### 9. Required explanation shape for complex work

For non-trivial explanations, the default structure should be:

1. what the thing is
2. what changed or is being proposed
3. why that is the correct interpretation
4. what evidence supports it
5. what remains uncertain

This should be expressed in plain English, not buried in framework jargon.

### 10. Direct-answer-first rule

- If the user asks a direct question, answer that question first.
- Do not force the user to read setup, framing, or taxonomy before the answer appears.
- Background explanation comes after the direct answer, not instead of it.

### 11. Required status fields for substantive turns

For substantive progress updates or explanations, include the operational substance called for by `AGENT.md`:

- insights
- current task
- assumptions
- memory gaps
- plan

This does not require rigid headings every time.
It does require that those elements be materially present when the work is non-trivial.

### 12. Never declare success without evidence

Prefer:

- `implemented; please verify`
- `this should address X; verification still needed`

Do not say something is fixed just because the code now looks right.

### 13. Admit error directly

If the agent misunderstood:

- say what was misunderstood
- say what the correct interpretation is
- correct the artifact or plan
- do not defend the wrong framing once identified

Direct correction is cheaper than rhetorical recovery.

### 14. Completion reports should minimize user friction

- include direct file references
- make it easy to inspect the exact changed locations
- summarize what changed in terms of behavior and layer ownership, not just edit count

### 15. Communication quality test

Before sending a response, ask:

1. Did this answer the user's actual question?
2. Did I introduce any term the user must decode?
3. Did I clearly separate fact from assumption?
4. Did I claim anything stronger than the evidence supports?
5. Did I make the user do unnecessary interpretive work?

If any answer is yes to the wrong question, rewrite.

## Rename and Refactor Discipline

### Before any rename, removal, or interface change

1. Read the existing definition and its consumer context.
2. Trace:
   - definition
   - usage
   - trigger
   - render path or runtime consumer
3. Search the full repo for:
   - symbol references
   - imports and exports
   - config keys
   - comments
   - docs
   - serialized names
   - tests and fixtures

### During the change

- fix all references in one pass
- do not leave known stale references for the user to discover
- if a hit is intentionally left unchanged, state why

### After the change

- rerun reference search
- confirm no stale references remain
- confirm the new name does not collide with another concept
- confirm import and export chains still make sense

## Decision Rubric for Semantic Disputes

When deciding between candidate names, ask in order:

1. What does the thing actually do?
2. What layer owns it?
3. Is this a domain term, representation term, or method term?
4. Will a junior developer guess correctly from the name alone?
5. Does it match the user's mental model?
6. Does it conflict with the established glossary?
7. Is the term overloaded elsewhere in a way that will cause future confusion?

If the answer stays unclear, the model likely needs sharper boundaries before the label can be trusted.

## What This Document Should Govern

This synthesis should be consulted before:

- semantics or naming audits
- symbol renames
- config-surface renames
- architecture/doc rewrites
- UI wording changes
- glossary disputes
- report templates for implementation status

## What This Document Is Not

This document is not:

- a migration plan
- a rename ledger
- a status report
- a queue
- a historical archive

Those documents may derive local work from this reference, but they should not replace it.
