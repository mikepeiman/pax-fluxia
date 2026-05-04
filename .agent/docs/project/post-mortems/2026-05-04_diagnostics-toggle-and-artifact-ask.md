# Post-Mortem: 2026-05-04 - Diagnostics Toggle And Artifact Ask

## What Happened

I reported that `Show underlying geometry` had been restored in the in-game Diagnostics UI, but in the user's actual PVV4 workflow the toggle did not visibly do anything. I also asked the user to inspect textual diagnostics in the panel and to "reproduce" a conquest in a way that was not grounded in the actual UI and capture surfaces available.

## Root Cause

- I verified the presence of the UI control and the config write path, but I did not verify the active render-path consumer for the user's current mode.
- The toggle was only consumed by the perimeter-field debug overlay path. PVV4 uses the canonical runtime path, which had no geometry-overlay consumer for that same setting.
- I allowed internal diagnostic concepts such as `AF Eval` to leak into the user instructions instead of asking for the highest-value artifact the UI can produce.
- I used "reproduce" imprecisely for an already-happened conquest instead of distinguishing between replaying a captured event and arming capture before triggering a new one.

## Impact

- The user was told a feature was back when it was not functionally restored for the active mode they were using.
- The diagnostics workflow imposed translation work on the user instead of producing cleaner artifacts for the agent.
- Exported diagnostics were also still defaulting into `Downloads`, creating unnecessary clutter.

## Corrective Actions

- Wire `Show underlying geometry` to the canonical PVV4 runtime geometry path, not just perimeter-field.
- Add a dedicated diagnostics communication rule requiring:
  - visible UI entry points
  - exact click paths
  - explicit artifact requests
  - explanation of what the artifact will tell the agent
- Add a rule forbidding "reproduce the past event" language unless an actual replay/scrub surface exists.
- Prefer exported packages, screenshots, and recordings over manual panel value transcription.
- Add configurable diagnostics export folders so artifacts do not dump into `Downloads`.

## Lessons

- Restoring a control is not the same as restoring the feature. The consumer path for the active mode must be verified.
- In this project, user-facing diagnostics requests must be artifact-first and UI-anchored. Internal labels are for implementation and analysis, not for primary user instructions.
- When the user works visually and the agent does not, a poor diagnostics ask is itself a product bug in the debugging workflow.
