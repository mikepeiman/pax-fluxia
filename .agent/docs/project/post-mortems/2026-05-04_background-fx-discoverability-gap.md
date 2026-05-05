# Post-Mortem: 2026-05-04 - Background FX Discoverability Gap

## What Happened

I reported the background-mode system as implemented, but in practice the user saw no new background effects and no obvious new controls. The code path existed, yet the gameplay default remained `legacy_image`, and the live-mode picker was buried under the `Map Options & Tuning` section instead of surfacing as an explicit feature entry point.

## Root Cause

- I treated the existence of a working internal control path as equivalent to a shipped user-facing surface.
- I preserved legacy-image defaults for safety, but I failed to pair that with an explicit activation prompt.
- I did not account for the settings panel being able to open with only the icon toolbar visible, which made a buried subsection easy to miss.

## Impact

- A user could run the branch and reasonably conclude that nothing had been added.
- The feature required obscure navigation and manual interpretation rather than presenting itself clearly.
- My previous guidance was too dependent on internal file structure and not specific enough about the visible UI path.

## Corrective Actions

- Added a dedicated top-level `Background FX` section to the gameplay settings panel.
- Made `Background FX` the default first-open section when no prior section layout is stored.
- Split the old `Map Options & Tuning` surface so background controls are no longer buried inside it.
- Added an explicit callout when gameplay is still on `Legacy Image`, including a one-click action to enable the recommended live mode on supported runtimes.

## Lessons

- A feature is not done when its internal state path works; it is done when the intended user can find and activate it without guesswork.
- Backward compatibility defaults must be paired with explicit promotion or activation cues, or they will read as “nothing changed.”
- Final guidance should name the actual visible surface the user should look at, not just the implementation area.
