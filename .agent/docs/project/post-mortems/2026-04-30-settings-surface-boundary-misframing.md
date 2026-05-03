# Post-Mortem: 2026-04-30 - Settings Surface Boundary Misframing

## What Happened

During the settings UX review, I repeatedly collapsed three different UI
surfaces into one discussion:

- the one master theme widget in the main menu column before the Settings
  panel opens
- the intentional per-section theming system inside settings panels
- the unrelated `Frontier Transition` subsection inside `Render Families`

The user explicitly separated these surfaces, but I kept answering screenshot
feedback about `Frontier Transition` as if it were still feedback about theme
placement and category theme controls.

## Root Cause

- I did not hold the surface boundary steady after the user corrected the
  earlier theme assumption.
- I generalized the phrase "Theme widget" to every theming-related control in
  the app instead of tracing the exact mounted surface the user named.
- I treated one screenshot as one problem instead of isolating which visible
  region the user was actually calling out.

## Impact

- I gave the wrong UX diagnosis.
- I risked changing the wrong system.
- I forced the user to restate an already-correct distinction multiple times.

## Corrective Actions

- Treat the master theme widget, per-section theming, and Territory renderer
  subsections as separate audited surfaces.
- Do not propose changes to per-section theming unless the user explicitly
  asks for that system.
- When a screenshot contains multiple adjacent systems, identify the exact
  target surface before explaining what is wrong.

## Lessons

- "Same domain" is not "same surface." Adjacent controls can belong to
  different ownership and UX discussions.
- When the user narrows scope, restate that narrowed scope exactly and use it
  as a hard boundary.
- Screenshot feedback must be answered against the named subsection, not the
  nearest related concept.
