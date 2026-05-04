# Merge Note

- source worktree: `c2f3`
- source commit: `cad080942cd19c311f7954fe342e3213663ce1dd`
- merge intent: fold deltas into the canonical unsuffixed master doc, do not overwrite it

# 2026-04-28 Chat Log â€” worktree `c2f3`

Human-written input is preserved below verbatim and in order. Machine/tool output may be summarized elsewhere.

## User

Within the Diagnostics section there is a Diagnostics sub-section - this is a sure sign of thoughtless work.
There is a bunch of Perimeter Field settings here, which I previously mandated must only be displayed when that mode is active.
Also there is a Geometry selection in this panel, WTF? That is Territory settings.
You MUST NOT duplicate settings like this.
You'll need to do a full Settings UI audit.

Re: diagnostics:
1. Yes, "Legacy this" and "Legacy that" is a STUPID AND MISLEADING way to label things; and you saw this; and you did not fix it. You should have fixed it. Fix it.
2. There is no list of bundles, with that recorder toggled on, after a few conquests. However, it did give me a bundle when I clicked the button "Legacy Package All".

When I draw a ruler measure, it remains drawn after toggling "Ruler OFF"

At the top of Diagnostics panel is some info that no one EVER fucking wanted, explaining to NO ONE and wasting space "What This Panel Owns
This is now the single diagnostics surface. Use it for live overlay toggles, ruler, recorder bundles, perimeter-field scrub, geometry artifact export, conquest package export, and contact-sheet export."
Similarly "Perimeter Field Diagnostics
This is the only place for perimeter-field scrub, vstar overlays, geometry export, conquest package export, contact-sheet export, onion-skin ghosts, and stroboscopic trails."

And anything else you find like that - get rid of it.

## User

"The lower-right diagnostics button still exists in TopBar, " Excuse me? A bottom icon in a TopBar? WTF?
You mention Geometry 0319 mode - but I'm not operating in that mode.
Are you using [current-settings.json](common/resources/settings-live/current-settings.json) to get an idea what I'm running? And bear in mind that changes with literally every setting I touch. You need to think and ask questions.

Semantics matter.
You'll eliminate all mention of Canonical and Legacy. Things are what they are, so name them what they are. The way to distinguish similar items is name them with a date first worked on, eg. "Power Voronoi 0427". Or, given our history, it could be PVV4.

Your audit must cover ALL settings sections. And it must intelligently propose at least one, but preferably several multi-level ontologies to organize this. ***No one is telling you that what exists is sacrosanct***. The feedback you're getting is all about deficiencies, so be "bold" and innovative and serious about reorganizing this.

Map Options name refined to "Map Options & Tuning".

This "Create one shared topology-controls component used wherever topology tuning is legitimately allowed." Actually, the map adjustments around star spacing, Lane Margins, arrow shapes etc is topology. The controls you listed are Territory Tuning controls. Yes, these do meet the definition of Topology, but we need distinctions and intuitive labels.

Also, I've said it before, but the Territory section itself is too bloated and must have 1-2 separate sections fractioned off.

Explain this, how is this implemented, and what results do you expect from it? "Replace the current implicit subsection detection with explicit subsection metadata per settings section." I didn't even know this was (allegedly) implemented as implicit.

Writing this is actually wrong: "Canonical PV should never display mode unknown once selected." No, NO MODE should display "mode unknown" once selected.

Phrased wrong, inverse logic "Canonical PV does not expose editable architecture or geometry-source selectors." No, it is that these are default Territory mode controls. And the exception is that "these other, irrelevant options are hidden when Canonical PV active".

FYI the perf issue with CX Corridors is NOT correctly described as "dragging heavy sliders does not trigger unbounded recompiles". This is and was NOT the issue. It was a simple click of the toggle caused the compute lag.


What does this mean? I can tell you for sure it is very poorly phrased and unclear, and I believe it is due to unclear thinking from you "Apply the chip pattern consistently to the audited sections so nested territory groups no longer disappear from navigation.".
You are telling me that "nested territory groups no longer disappear from navigation." That does not sound like anything I reported to you - justify and explain why you stated this (I could be wrong).


In your updated plan, I want all the active *principles* derived, inferred, and articulated in an executive summary at the top. I want to know if you can think in principles.

## User

Also, keep up with the required documents - as per [AGENT.md](.agent/AGENT.md) are you dutifully logging our chat?

## User

Dude. You are framing my feedback here as if the issue is that *you said it*. That is *not* the issue. The issue is that you are using non-semantic, linguistically INCORRECT naming. This is a REAL code violation. "The button is a lower-right floating control rendered by a component named TopBar; it is not literally â€œin the top bar.â€ Iâ€™ll state that cleanly in the revised plan and stop using the component name as a user-facing description."

## User

"implementation-detail names must not leak into user-facing UI structure" Wrong focus. The point is that implementation/code naming should ALSO be semantic, and either match exactly, or be obviously representing the same thing, with differences in casing and grammar.

Economy should remain top level.
Also, Combat Tuning.

You will propose three distinct Settings ontologies, with 2-3 levels of hierarchy:
1. Settings sections (the top level categories)
2. Section sub-sections
3. Sub-sub-sections where appropriate

Territory needs to split into three:
1.  Modes & Transition
2. Tuning & Constraints
3. Styles
* note: you can STILL refactor this ontology in your proposal. What I've stated here is just one of my proposals.

## User

Also FYI, you are on a worktree; today's docs are created already on Master; you should name yours so it is clear to future agents for the merge.

## User

PLEASE IMPLEMENT THIS PLAN:
# Settings UI Audit, Semantic Renaming, and Territory Tuning Repair

## Purpose

Reorganize the **entire Settings UI** into a coherent, intent-first structure; fix semantic naming defects in both code and UI; make `Diagnostics` a single Settings-owned surface with the lower-right launcher preserved; split the current Territory surface into smaller top-level sections; remove duplicated and mode-leaking controls; then fix the actual Power Voronoi tuning, correctness, and compute-lag issues from the cleaned-up UI.

## Executive Summary and Principles

- **Semantic naming is a code requirement.** Internal symbols, component names, config ids, events, section labels, and control labels must either match exactly or obviously represent the same domain thing with only casing/grammar differences.
- **False distinctions are defects.** `Source`, `Invariant`, `Canonical`, `Legacy`, or container-derived names are wrong when they misstate ownership, role, or scope.
- **One setting, one owner.** Every editable setting has one owning location in Settings. Other surfaces may show read-only status, never duplicate editable controls.
- **Settings are organized by player intent.** Existing structure is not sacrosanct; the full IA is open to reorganization.
- **Diagnostics is one thing.** The lower-right launcher remains, but it opens Settings focused on `Diagnostics`. There is no separate parallel Debug/Diagnostics product.
- **Territory is split into three top-level sections.** Modes/transition, tuning/constraints, and styles become separate sections.
- **No selected mode may ever show `unknown`.**
- **Expensive recomputes must be explicit and inspectable.** A toggle click may trigger one heavy compile, but the UI must show compile state and duration.

## Documentation and Merge Protocol

- Master already has unsuffixed `2026-04-28` queue/session/takeaways docs. Worktree docs must therefore be **merge-safe additive documents**, not conflicting duplicates.
- In this worktree, create:
  - `.agent/docs/plans/2026-04-28/FEATURE_AND_TASK_QUEUE_2026-04-28__worktree-c2f3.md`
  - `.agent/docs/sessions/2026-04-28/2026-04-28_Chat__worktree-c2f3.md`
  - `.agent/docs/sessions/2026-04-28/2026-04-28_Session__worktree-c2f3.md`
  - `.agent/docs/sessions/2026-04-28/2026-04-28_Takeaways__worktree-c2f3.md`
  - `.agent/docs/sessions/2026-04-28/2026-04-28_settings-ui-audit-and-territory-tuning-plan__worktree-c2f3.md`
- Each worktree doc must begin with a short merge note stating:
  - source worktree: `c2f3`
  - source commit: current detached HEAD
  - merge intent: fold deltas into the canonical unsuffixed master doc, do not overwrite it
- The chat log must backfill this threadâ€™s human-written inputs losslessly.

## Three Settings Ontologies

### 1. Intent-First Ontology â€” chosen for implementation
- `Match Flow`
  - `Timing`: `Global Rhythm`, `Transition Clock`
  - `Rules`: `Order Persistence`, `Conflict Resolution`
- `Combat Tuning`
  - `Damage Model`: lethality, force ratios, damaged effectiveness
  - `Repair Interaction`: repair rate, suppression, penalties
- `Economy`
  - `Production & Flow`: production, transfer, minimum transfer
  - `Opening Economy`: starting ships, early pressure
- `Travel & Orders`
  - `Travel Model`, `Departure`, `Arrival & Settle`, `Lane Pathing`
- `Conquest & Effects`
  - `Conquest Timing`, `Conquest Motion`, `Conquest FX`
- `Map Options & Tuning`
  - `Background`, `Map Overlays`, `Map Layout`, `Connections`, `Inspector & Labels`
- `Territory Modes & Transition`
  - `Mode Selection`, `Transition Selection`, `Runtime Route`, `Derived Geometry Input` when applicable
- `Territory Tuning & Constraints`
  - `Region Footprint`, `Corridor Virtual Sites`, `Lane Midpoint Pairs`, `Disconnect Gaps`, `Compile Status`
- `Territory Styles`
  - `Surface Fill`, `Borders`, `Mode-Specific Styles`
- `Fleet & Star Visuals`
  - `Stars`, `Ships`, `Halos`, `Order Arrows`, `Labels`, `Interaction`
- `Audio`
  - `Master`, `Event Sounds`, `Conquest Sounds`
- `Diagnostics`
  - `Overlays`, `Measurements`, `Recorder & Bundles`, `Exports`, `Mode Diagnostics`
- `Logging`
  - `Log Channels`
- `AI`
  - `Aggression`, `Evaluation`, `Future Strategies`

### 2. Systems-First Ontology â€” audit alternative
- `Simulation`
  - `Timing`, `Rules`, `Combat Tuning`, `Economy`
- `World Layout`
  - `Background`, `Map Layout`, `Lane Constraints`, `Connections`
- `Territory`
  - `Modes & Runtime`, `Geometry Constraints`, `Styles & Borders`
- `Motion & Effects`
  - `Travel`, `Conquest`, `Fleet/Star Visuals`
- `Operations`
  - `Diagnostics`, `Logging`, `Audio`, `AI`

### 3. Pipeline-First Ontology â€” audit alternative
- `Inputs`
  - `Match Rules`, `Player Count`, `Map Inputs`
- `Ownership & Geometry`
  - `Territory Modes`, `Frontier Constraints`, `Applied Constraints`
- `Transition & Presentation`
  - `Travel`, `Conquest`, `Territory Styles`, `Fleet/Star Visuals`
- `Operations`
  - `Diagnostics`, `Logging`, `Audio`, `AI`

## Chosen IA and Naming Contract

- Implement **Ontology 1**.
- Keep `Economy` and `Combat Tuning` as top-level sections.
- Split current Territory into:
  - `Territory Modes & Transition`
  - `Territory Tuning & Constraints`
  - `Territory Styles`
- Rename `Map & Overlays` to `Map Options & Tuning`.
- Replace `Debug` with `Diagnostics`.
- Remove `Canonical` and `Legacy` from user-facing names.
- Use the chosen hybrid Power Voronoi naming:
  - surface label: `Power Voronoi 0427 (PVV4)`
  - internal ids and symbols use the same semantic stem, e.g. `power_voronoi_0427`, `PowerVoronoi0427...`
- Rename mis-scoped code ownership too:

## User

Here's a single item to look into: from the Runtime subsection "Geometry: Power Voronoi 0427 Â· Fill transition: PVV4 Frontline Â· Border transition: Off"

We are not supposed to have distinct Border/Fill transitions. That's old thinking. Investigate, reflect, and bring your suggestions and findings.

## User

Also, there is a floating "Shell Diag" toggle bar that shows a bunch of info. Assess it's relevance. I never specified it, agent created it based on some past perf work

## User

Yes, do that
  - extract lower-right floating actions out of `TopBar.svelte` into a semantically named HUD/floating-actions component
  - keep `TopBar` for actual top-bar behavior only

## Implementation Changes

- Replace implicit subsection discovery with an explicit Settings registry that defines section ids, subsection ids, labels, icons, render conditions, deep links, and owned setting keys.
- Perform a full ownership audit across all Settings sections and move every duplicated editable control to its single owner.
- Move map-space controls into `Map Options & Tuning`: lane margin, star spacing, transpose, overlay-only toggles, authored measurements visibility.
- Keep territory ownership/render controls only in the three Territory sections.
- Remove non-semantic labels like `Geometry Source`, `Source Constraints`, `Source MSR`, `Territory Invariants`, and similar aliases.
- Hide derived-geometry selectors unless the active mode truly derives visible output from another geometry path.
- Never surface `Power Voronoi 0319` inside `Power Voronoi 0427 (PVV4)` mode.
- Make `Diagnostics` Settings-primary. The lower-right launcher deep-links there on desktop and mobile.
- Remove the separate diagnostics panel as a separate user-facing concept; fold useful functionality into the Settings Diagnostics section.
- Remove filler copy that does not communicate state, warning, or result.
- Gate all Perimeter Field diagnostics and controls strictly by active mode.
- Remove geometry and territory mode selection from Diagnostics.
- Fix recorder bundle visibility using reactive recorder state or explicit recorder events.
- Fix `Ruler OFF` so it clears active and persisted ruler drawings.
- Fix render-status ownership so no selected mode remains `unknown`.
- Centralize territory-tuning-to-compiler settings translation so all relevant Power Voronoi paths receive the same complete settings object.
- Fix lane midpoint pair propagation, expose requested vs applied minimum star margin, and verify DX behavior against visible geometry.
- Treat CX and similar expensive toggles as one-click heavy compile actions with visible `Compilingâ€¦` state and duration.
- Heavy sliders use draft values while dragging and commit on release or short debounce.

## Test Plan

- Documentation tests:
  - all merge-safe worktree docs exist
  - the worktree chat log contains this threadâ€™s human inputs losslessly
- Naming tests:
  - no user-facing `Canonical` or `Legacy` labels remain in the audited settings surfaces
  - no false-ownership labels like `Source Constraints` remain
  - code/UI naming for the new Power Voronoi path uses the same semantic stem
- Registry tests:
  - subsection chips come from explicit metadata, not DOM scans
  - every editable setting key has one owner
  - every deep link target resolves to a real section/subsection
- UI tests:
  - `Economy` and `Combat Tuning` remain top-level
  - Territory is split into the three chosen top-level sections
  - `Map Options & Tuning` and `Diagnostics` render correctly
  - Perimeter Field diagnostics are hidden unless that mode is active
  - no territory geometry selector appears in Diagnostics
- Interaction tests:
  - the lower-right diagnostics launcher opens Settings to `Diagnostics`
  - recorder bundles appear immediately after capture
  - `Ruler OFF` removes all ruler drawings
  - no selected mode displays `unknown`
- Territory tuning tests:
  - lane midpoint pair controls affect geometry
  - DX controls affect geometry in the intended direction
  - requested and applied MSR values are both surfaced when clamping occurs
  - one CX toggle click produces one bounded compile with visible feedback

## Assumptions and Defaults

- `current-settings.json` is a live snapshot only, not the source of truth for Settings structure.
- Ontology 1 is the implementation target; Ontologies 2 and 3 are audit lenses used to catch bad grouping.
- The lower-right diagnostics launcher stays, but it is a launcher into Settings, not a second diagnostics surface.
- Semantic naming refactors apply to code structure as well as UI labels.

