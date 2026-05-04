# Feature And Task Queue - 2026-04-30

## Active
- Verify the latest settings-surface cleanup in the live UI, especially the master Theme widget, the render-mode quick-chip strip, the restored Attack Surge bind-to-tick toggle, and the lane-under-stars layering.
- Verify that entering the main menu from the landing page no longer triggers a dev-only hot-reload loop.
- Decide whether the hidden compatibility-only territory transition keys should remain as internal engine/theme-loading support or be deleted outright.
- Evaluate whether the master Theme widget needs a second visual pass beyond full-width + overwrite-confirmation.

## Completed
- Removed the duplicate Territory `Derived Geometry Input` UI and the shared source-tuning component.
- Split Territory top-level ownership into `Territory System`, `Frontier Topology`, and `Render Families`.
- Moved `Frontier Resolution` into the canonical topology cluster.
- Removed the stray Match Flow ownership note and renamed the top-level panel back to `Timing`.
- Removed the separate Rules settings surface and pinned chained-orders/anti-opposing-order behavior in runtime code.
- Removed the surfaced Territory runtime selector and pinned the architecture router to `clean`.
- Reworked the old fill-only transition surface into the combined `Frontier Transition` card with paired fill/border controls.
- Removed hidden settings/theme plumbing entries for the expunged runtime and order-rule options.
- Consolidated the game-theme controls into one reusable in-game widget and removed the redundant Theme selector from the top of Settings.
- Added a Settings search header that searches labels, helper text, config keys, and panel-key metadata, then jumps to matching controls.
- Removed the failed `Frontier Transition` subsection from `Render Families`.
- Moved territory-engine trace controls into Diagnostics and created `pax-fluxia/src/lib/components/ui/settings/TerritoryEngineTraceDiagnostics.svelte`.
- Removed the duplicate territory transition tuning surface from Metaball and the duplicate shared territory transition duration from Perimeter Field.
- Moved config import/export out of `Logging` and into the Settings utility row.
- Removed dead AI roadmap UI and the debug-only ship-count override from Ships.
- Simplified generated setting tooltips and rebuilt section search so they no longer depend on raw Svelte source text.
- Split `Conquest & Effects` into separate `Conquest` and `Effects` top-level settings sections.
- Removed the `Geometry` card from `Territory System` and surfaced quick territory render-mode chips directly under the Settings icon toolbar.
- Promoted the current Phase Field settings snapshot into the app default config baseline and a new built-in theme named `Phase Field Default`.
- Restored an explicit Attack Surge pulse-duration bind-to-tick toggle and changed lane container ordering so lanes render beneath stars and ships.
- Fixed the landing-page -> main-menu dev loop by decoupling `Phase Field Default` from the live `current-settings.json` dump file and removing the startup auto-apply mutation from `themeStore`.
- Corrected the Phase Field defaulting model by removing the startup snapshot overlay, promoting those values into the real owner config defaults, deleting `phase-field-default.json`, and deriving the built-in `Phase Field Default` theme from `DEFAULT_GAME_CONFIG`.

## Next
- Confirm the master menu Theme widget now stretches full-width and shows the requested overwrite-confirmation flow on `Update`.
- Confirm the new render-mode quick chips are useful in practice and do not need pruning/relabeling.
- Confirm lanes are visually under stars and ships in dense systems and while order arrows remain readable.
- Confirm the menu-theme widget still presents the right initial state now that startup no longer auto-applies a theme on shell mount.
- If search misses useful copy after the raw-source removal, add explicit metadata instead of falling back to source scraping.

