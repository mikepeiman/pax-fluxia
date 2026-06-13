# PaxSettingsToggleRow Callback Alias Regression

Date: 2026-06-12

## Cause

During the `ControlsSection-Ships.svelte` primitive migration, several toggles were wired with `onToggle={...}` while `PaxSettingsToggleRow.svelte` only invoked an `onChange` prop.

## Mistaken Reasoning

The migration assumed the shared toggle row used the same callback naming as nearby picker/accordion-style controls. Svelte accepted the unknown `onToggle` prop, so production build did not expose the runtime behavior gap.

## Diagnostic Method

While preparing the Territory migration, the primitive API was re-read and searched against call sites. The search found `onToggle` usages in Ships against a component that only called `onChange`.

## Fix

`PaxSettingsToggleRow.svelte` now accepts both optional callback names and invokes both if provided:

- `onChange`
- `onToggle`

## Derived Rule

When migrating controls to shared primitives, verify the primitive prop contract directly before committing and run a targeted search for callback-name variants. Build success is not enough for Svelte component prop correctness when unknown props are accepted.
