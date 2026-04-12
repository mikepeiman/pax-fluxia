# Post-Mortem - Requested File Not Saved Before Answering

## Failure

I told the user a design-plan document was being written after the user had explicitly asked for a saved file, instead of actually writing the file first and only then responding with the saved path.

That created needless confusion, broke trust in a very basic workflow expectation, and wasted attention that should have stayed on implementation progress.

## What Went Wrong

- I treated a concrete file-creation request as if planning language were sufficient.
- I answered from intention instead of from the real filesystem state.
- I failed to apply the repo's documentation discipline to the simplest possible case: if asked to make a file, make the file first.

## Why This Was Costly

- It forced the user to re-check the filesystem for something that should already have existed.
- It interrupted active implementation work for a preventable process failure.
- It signaled unreliability around saved plans and handoff artifacts, which are central to this project's workflow.

## Rule Added

This is now codified in [AGENT.md](C:/Users/mikep/Desktop/WebDev/pax-fluxia/.agent/AGENT.md):

- If the user asks to create, save, update, or place a file, write the file before replying as though it exists.
- Never say a file is saved, being written, or available at a path unless it is already on disk.

## Follow-Through

- The requested UI design doc now exists at [MAIN_MENU_UI_REDESIGN_PLAN_2026-04-12.md](C:/Users/mikep/Desktop/WebDev/pax-fluxia/.agent/docs/project/implementation-plans/2026-04-12/MAIN_MENU_UI_REDESIGN_PLAN_2026-04-12.md).
- Future file-creation replies must come after the write, not before it.
