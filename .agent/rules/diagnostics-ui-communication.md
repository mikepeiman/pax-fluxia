---
description: UI-anchored communication protocol for user-assisted debugging and diagnostics
trigger: always_on
---

# Diagnostics UI Communication Rule

## Purpose

When asking the user to help debug, the agent must ask for interaction with visible UI and concrete artifacts, not internal code-path reasoning.

## Hard Requirements

1. Always name the exact UI entry path using visible labels.
2. Always state the goal of the interaction in one sentence.
3. Always give a numbered interaction sequence.
4. Always say what the user should expect to see after each important action.
5. Always ask for specific return data and name the format:
   - screenshot
   - screen recording
   - exported diagnostics package
   - copied panel values
   - console error text
6. If asking for copied values, name the exact UI labels the user should read.
7. Prefer exported artifacts over manual transcription when export exists.
8. State what the agent will learn from each requested artifact.
9. Never ask the user to inspect code paths, config keys, types, or architectural concepts unless the user explicitly asked for internals.
10. Never refer to a diagnostics surface only by internal terms like `AF Eval`, `pathUsed`, or `planner outcome` without also naming where it appears in the UI and what values matter.
11. Never ask the user to "reproduce" a specific past event unless the product already exposes a replay or scrub surface for that captured event.
12. If there is no replay surface, ask the user to arm capture first and then trigger a new event.

## Required Response Structure

When requesting diagnostics from the user, the response must contain these sections in this order:

1. `Where To Click`
2. `What To Do`
3. `What You Should See`
4. `What To Send Me`
5. `What I Will Learn`

## Interaction Rules

- Use visible UI labels exactly as rendered in the product.
- Prefer "Open Settings, then Diagnostics" over "inspect the diagnostics panel state."
- Prefer "click `Export All Packages`" over "send me the JSON bundle."
- If the UI includes toggles or buttons added by the current branch, state that explicitly so the user knows what new control to look for.
- If a diagnostic can be captured automatically, ask the user to trigger the scenario and export the result rather than hand-summarize it.
- Do not make manual panel readouts the primary ask when an export package, screenshot, or recording can carry the same truth automatically.
- If a value is only useful during a transient event, say when to look:
  - before conquest
  - during conquest
  - immediately after the snap
  - while paused in scrub mode

## Artifact Priority

Ask for data in this priority order when available:

1. Exported diagnostic package
2. Screen recording
3. Screenshot of the relevant UI panel
4. Exact copied panel values
5. Console error text

Do not ask for a lower-fidelity artifact first if a higher-fidelity one is already available in the UI.

## Anti-Patterns

Do not say:

- "Watch AF Eval and tell me what happens."
- "Check the active-front planner output."
- "See whether the topology path ran."
- "Look at the runtime diagnostics."

Instead say:

- "Open `Settings -> Diagnostics`. In the `Mode Diagnostics` block, watch the row labeled `AF Eval` during a conquest. After the conquest, send me a screenshot of that block or export the package with `Pkg`."

## Minimum Useful Ask

If the agent needs user help and the app already has a diagnostics UI, the minimum acceptable instruction set is:

1. exact UI path
2. exact user action
3. exact expected visible result
4. exact artifact to return
5. exact reason that artifact matters
