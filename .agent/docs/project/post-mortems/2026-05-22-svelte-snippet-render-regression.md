# Post-Mortem: 2026-05-22 - Svelte Snippet Render Regression

## What Happened

The `/dev/ui-test` HUD mockup route could throw Svelte's `invalid_snippet_arguments` runtime error. `HudLayoutTestMockup.svelte` defined reusable snippets but rendered them with component syntax such as `<InfoCard ... />` and `<ControlCard ... />`.

## Root Cause

I treated Svelte 5 snippets like components during the adaptation of the external mockup. In Svelte 5, snippets must be invoked with `{@render ...}`.

## Impact

The UI test route could fail at runtime even though the surrounding route and build wiring were present. That directly reduced the usefulness of the UI test surface for visual review.

## Corrective Actions

- Replaced component-style snippet calls with `{@render InfoCard(...)}` and `{@render ControlCard(...)}`.
- Re-ran `bun run --cwd pax-fluxia build` after the fix.
- Recorded the regression in the session docs and task queue.

## Lessons

- For Svelte 5, distinguish component imports from local snippets before adapting external UI code.
- Runtime-only Svelte errors require browser or build validation plus a scan of snippet invocation syntax.
