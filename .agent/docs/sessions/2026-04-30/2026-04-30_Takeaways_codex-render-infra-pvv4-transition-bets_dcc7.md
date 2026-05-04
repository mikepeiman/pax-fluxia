# Takeaways - 2026-04-30

- `Derived Geometry Input` had implementation utility, not product utility; removing it from Territory clarified the panel immediately.
- Topology needed to become its own first-class Territory panel before any renderer cleanup could feel coherent.
- â€œRemoved from UIâ€ was not sufficient for the rules/runtime cleanup; theme and settings-plumbing references also needed to be cut so the options were truly expunged.
- `Frontier Resolution` is not legacy noise; it is still a live geometry control and now sits under the right ownership boundary.
- The `Frontier Transition` card was a bad surface boundary: it exposed too little meaningful player choice, leaked internal implementation language, and did not justify a first-class subsection.
- The master menu theme widget must be evaluated separately from the intentional per-section theming system; collapsing them into one discussion caused repeated audit errors.
- Settings search should not index raw Svelte source. It should index curated section labels, subsection labels, setting labels, descriptions, keys, and related metadata so search remains useful without surfacing internal commentary.
- The correct theme cleanup was not â€œdelete extra dropdowns,â€ but â€œpromote one full-capability theme manager to the game menu and remove the Settings-panel copy entirely.â€
- Diagnostics belongs in Diagnostics, even when the underlying renderer is being tuned elsewhere. Trace tools in `Render Families` created the same ownership confusion as dead transition controls.
- Removing dead UI is not enough if the surrounding tooltips/search layer still leaks internal language. The metadata/search pass has to be part of the cleanup.
- When a â€œcurrent settingsâ€ baseline has effectively become the product default, it should be promoted once into both config startup defaults and the named built-in theme instead of being left as an implicit local state snapshot.
- Render-order regressions are easy to miss in settings-focused passes; container hierarchy assertions need to be rechecked whenever UI work touches renderer-adjacent code.
- A live dev dump file cannot also be a runtime default source. If UI mount-time saves write that file and the app imports it, Vite will treat normal UI startup as a source change and hot-reload the route in a loop.
- Startup theme selection must be state-only unless explicitly requested; auto-applying a theme during shell boot creates hidden config writes and can trip unrelated side effects.
- When the user asks to make current settings the new defaults, the correct fix is to update the owner default modules, not to overlay a captured snapshot at startup.
- A built-in theme can mirror factory defaults, but it should derive from the same default source rather than creating a second source of truth.

