# Feature And Task Queue - 2026-04-12

## Purpose

Keep one clean, date-scoped execution queue for the active work, separate from the larger and messier historical tracker.

## Completed This Slice

- [x] Fix the renderer breach where a logical curved connection could become invisible if its trimmed curved path collapsed below 2 points.
- [x] Add a straight-line fallback in `LaneRenderer.ts` so logical connections remain visible even when curved-path trimming collapses.
- [x] Add the same straight fallback for order-arrow path resolution so arrows do not silently disappear on the same edge case.
- [x] Audit the full transit-tuning variable surface from surfaced controls first, then active config second.
- [x] Restore curved-lane transit shaping so lane polylines are the motion spine rather than the entire motion model.
- [x] Re-enable `TRAVEL_FOLLOW_LANE_PATHS` as a real runtime gate instead of hardcoding path-following on.
- [x] Reintroduce `TRAVEL_ARC_INTENSITY`, `DEPART_ARC_INTENSITY`, and `ARRIVAL_ARC_INTENSITY` on top of curved lane-path motion.
- [x] Give conquest-travel ships nonzero lane spread so transit shaping variables can express there too.
- [x] Save the transit-tuning post-mortem at `.agent/docs/project/process/POST_MORTEM_2026-04-12_TRANSIT_TUNING_FLATTENED_BY_LANE_FIX.md`.
- [x] Update `.agent/AGENT.md` so the daily queue path lives in the matching dated folder and so motion-surface changes require a full variable audit first.
- [x] Save a dated post-mortem for the directed lane-path regression at `.agent/docs/project/process/POST_MORTEM_2026-04-12_DIRECTED_LANE_PATH_REGRESSION.md`.
- [x] Add a repo rule to auto-save post-mortems for major self-introduced regressions once fixed.
- [x] Move `bezier` travel onto lane polylines when available so curved travel survives the current VFX behavior mode.
- [x] Fix the last undirected transfer-path read in `transferHandler.ts`.
- [x] Smooth the near-full board-fit padding cliff so `boardFit 0.95` is no longer a totally different placement regime from `1.0`.
- [x] Add a directed-lane read path so cached undirected polylines reverse correctly for `B -> A` consumers.
- [x] Add a reusable lane-margin sweep diagnostic at `tools/debug/diagnose-lane-margin.ts` plus the root command `bun run debug:lane-margin`.
- [x] Save a focused evidence note at `.agent/docs/project/implementation-plans/2026-04-12/LANE_MARGIN_DIAGNOSTICS_2026-04-12.md`.
- [x] Save a focused runtime investigation note at `.agent/docs/project/implementation-plans/2026-04-12/MAPGEN_RUNTIME_REGRESSION_ANALYSIS_2026-04-12.md`.
- [x] Correct 100% board fill to use the actual full board instead of the old padded interior area.
- [x] Split contested-lane midpoint virtual stars into a discrete runtime behavior that can stay active even when main CX corridors are off.
- [x] Add lobby-room retry handling for `seat reservation expired` failures and increase `GameRoom` seat reservations to 120 seconds.
- [x] Save the standalone Main Menu parallel-agent handoff at `.agent/docs/project/implementation-plans/2026-04-12/MAIN_MENU_UI_REDESIGN_PLAN_2026-04-12.md`.
- [x] Add an explicit requested-file rule to `.agent/AGENT.md` and document the failure in a post-mortem after the UI handoff file was not saved before being referenced.
- [x] Restore 100% board fill to true corner anchoring instead of corner-ish nearest-hex placement.
- [x] Restore curved-lane semantics to straight-first when the chord is clear, with blocker-aware bend direction when a detour is required.
- [x] Render nonlinear lanes as smooth stroked arcs trimmed to star rims instead of visibly segmented centerline joints.
- [x] Make transport and attack-surge heading use published lane path geometry in the active renderer/runtime path.
- [x] Move conquest travel and arrowhead travel onto published lane-path geometry when nonlinear lanes exist.
- [x] Add a territory toggle for contested-lane midpoint pair virtual stars so cross-owner corridor behavior can be A/B tested.
- [x] Create and standardize the daily `FEATURE_AND_TASK_QUEUE_YYYY-MM-DD.md` workflow.
- [x] Add the daily queue protocol and harness-comparison protocol to `.agent/AGENT.md`.
- [x] Split Main Menu into three primary panels:
  - Map & Game
  - Players
  - Multiplayer
- [x] Add `Custom` beside `Random | Classic` in the map selector.
- [x] Widen the Main Menu layout and compact the slider/control grouping.
- [x] Restyle the `Straight | Curved` lane-path control to match the rest of the menu.
- [x] Consolidate visible player-color setup into one real widget in the Players panel.
- [x] Hide hue nudge behind a compact floating control instead of showing it by default.
- [x] Remove the redundant visible duplicate player-color and AI surfaces from the menu.
- [x] Clean the remaining user-visible Main Menu text corruption and make the palette card the sole color-selection surface.
- [x] Carry the configured palette through MP room creation so lobby/game colors do not fall back to a separate server palette.
- [x] Sort room listings so the public anchor room surfaces first.
- [x] Add a persistent public MP room on server startup and verify it initializes on an alternate port.
- [x] Add a root `bun run dev` / `bun run dev:full` flow that starts both client and `pax-server`.
- [x] Smooth kink-fallback lane paths into true curved published polylines when the smoothed path still clears obstacles.
- [x] Strengthen cross-owner corridor seeding by placing explicit midpoint-adjacent virtual sites for both owners.
- [x] Add targeted fixture maps for cross-owner midpoint corridors and future metaball conquest-lane evaluation.
- [x] Add an opt-in `Metaball fill follows geometry ownership` control for region-masked fill behavior.
- [x] Normalize the Main Menu player palette to even hue spacing with per-player nudges.
- [x] Move BG/audio/global settings into a thin floating topbar above Game Setup.
- [x] Remove the redundant visible player-color indicators from the AI and multiplayer slot rows.
- [x] Make the room browser visible whenever the lobby channel is live, not only after joining a game room.
- [x] Add a seat-reservation-expired retry path when joining MP rooms.
- [x] Bias curved lane generation toward actual curved polylines instead of straight fallbacks when curved mode is active.
- [x] Special-case 100% board fill to anchor corner stars before scaling the rest of the map.
- [x] Replace the old hue-nudge button with a proper `Adjust color` popover that exposes HSL controls and closes on outside click / Escape.
- [x] Remove the redundant duplicate color-indicator surfaces so the palette widget is the single visible player-color representation.
- [x] Move the audio widget into the floating topbar with the BG selector and gear icon instead of leaving it in the Players panel.
- [x] Normalize the Main Menu palette spacing to a simple even division with per-player nudges instead of the earlier glitch-prone spread logic.
- [x] Restore live territory redraw invalidation when player colors change so fills repaint with the selected palette.
- [x] Rebuild the Main Menu into one production command-surface shell with a floating utility topbar, three primary panels, a sticky command band, and live `imperial | neon | mythic` theme switching.
- [x] Split `MainMenu.svelte` into local UI subcomponents for the topbar, Game & Map panel, Players panel, row-anchored color popover, Multiplayer panel, and sticky command bar.
- [x] Rework the `Game & Map` random-mode layout into a 2x2 widget grid with a larger live preview, tighter clustering, and the redundant preview-info row removed.
- [x] Move `Tick Duration` into the `Game & Map` header, right-justified alongside the panel title.
- [x] Move `Number Of Players` out of `Game & Map` and into the top-level selection area of the `Players` panel.
- [x] Make `Scenario Pressure` own `Ships Per Star` with the full label instead of leaving that control in the old bottom row.
- [x] Rework the `Lane Shape` section away from the old stacked utility block into a clearer direct-vs-adaptive control cluster.
- [x] Reframe `Board Fill` as `Asymmetric vs Symmetrical`, with 100% symmetry producing full rectangular board fill.
- [x] Ensure `Start Game` does not open a start-flow interstitial or auto-open the settings surface; in-game settings remain callable from in-game entrypoints only.
- [x] Run a Main Menu consistency pass for heading scale, shared control heights, shared padding, and shared outline treatment across the topbar, Players header tools, and Multiplayer actions.
- [x] Add a top absolute pixel-distance scale ruler inline with the `FPS | shipcount` floater.
- [x] Fix tick-bound timing labels/bindings so `Flash Duration` and related controls no longer misreport tick units and tick bindings survive reload instead of retaining stale duration values.
- [x] Add subsection chips with icons beneath each expanded in-game settings section so long control panels can be filtered by sub-area.
- [x] Restore and expand user-facing arrow-style controls with stepped shaft gradients, arrowhead-shape tuning, arrowhead VFX, and optional intensity scaling relative to attacking force size.
- [x] Update the live arrow renderer so the new arrow-style settings materially affect the actual in-game arrows instead of existing only as dormant controls.

## In Progress

- [ ] Verify the standalone Main Menu redesign in the parallel worktree using the saved handoff doc.
- [ ] Verify 100% board fill in-app across several random seeds now that corner anchors are truly on the full board, not the padded interior.
- [ ] Verify curved lanes now appear again at practical lane settings and only detour outward away from blockers.
- [ ] Verify nonlinear lane rendering is smooth on-screen with no visible joints or star-end overlap artifacts.
- [ ] Verify transport, attack surge, and conquest travel now all follow the same published lane path when nonlinear lanes exist.
- [ ] Verify the contested-lane midpoint toggle behaves independently of main CX and no longer pushes unrelated fronts inward.
- [ ] Verify the room browser actually shows the persistent public room on the default dev port and survives seat-expiry churn.
- [ ] Verify the latest Main Menu padding, outline treatment, control heights, and panel-to-panel spacing now read as one coherent visual language instead of mixed widgets.
- [ ] Verify `Anchor Hue` and the `Strategy` toggle present as cleanly sized, cleanly aligned controls in the Players header row.
- [ ] Verify the new settings subsection-chip pattern is genuinely faster to navigate during real play sessions, not just visually cleaner in static inspection.
- [ ] Verify the new arrow-style controls feel expressive and legible across different ship counts, zoom levels, and background brightness.

## Top Queue

- [x] Re-confirm yesterday's mapgen hardening instead of re-fixing it blindly, and keep the post-`connections.ts` connectivity restoration as a hard constraint.
- [x] Harden lane-margin behavior so topology pruning stays soft, seeded sweeps stay fully connected, and medium/high lane margins no longer collapse the graph.
- [x] Rework the lane-margin diagnostics so "unsafe straight" is measured against the actual chord-length-scaled solver clearance rather than the old full-margin assumption.
- [ ] Verify in-app that no conquest or transfer can now appear to happen across a missing visible connection.
- [ ] Verify in-app that `TRAVEL_ARC_INTENSITY`, `DEPART_ARC_INTENSITY`, and `ARRIVAL_ARC_INTENSITY` visibly affect curved-lane transit again in transfer and conquest flows.
- [ ] Hand the full active transit-variable list to the parallel UI owner so currently-unsurfaced travel/conquest controls can be exposed without drift.
- [ ] Verify in-app that order arrows, issued orders, attack surge, transport travel, and conquest travel all use the corrected directed lane path.
- [ ] Verify in-app that `bezier`-mode travel now visibly rides curved lanes in standard transfer and conquest flows.
- [ ] Continue tuning the remaining `boardFit` interaction now that the worst `0.95 -> 1.0` cliff is reduced (`0` curved -> `86` curved at 0.95 on the same seed).
- [ ] Verify in-app that the new lane-margin hardening reads sensibly on real maps:
  - short/direct lanes staying straight more often
  - medium settings producing visible curves
  - high settings no longer erasing traversal
- [ ] Use `bun run debug:lane-margin` after each lane-solver change to keep the regression measurable.
- [ ] Verify visually that territory fills now repaint live with star ownership colors across the active territory families.
- [ ] Verify the exact-corner 100% board-fill path and restore sub-100% feel if any placement regression remains.
- [ ] Tune the remaining high-margin + max-bias lane case now that the graph stays intact but curve density is intentionally softer.
- [ ] Verify the restored curved-lane semantics on several random seeds and tune bend preference if any inward curves remain.
- [ ] Verify the new smooth nonlinear lane rendering against real generated maps, not just compile/smoke tests.
- [ ] Verify the public room appears in discovery on the default dev port and remains joinable without seat-expiration churn.
- [ ] Evaluate the new opt-in metaball geometry-fill mode in-game and decide whether it should remain optional or become the default.
- [ ] Decide how `Custom` maps should evolve from selector-only into the future custom-map workflow.
- [ ] Continue the Main Menu space-efficiency pass so all four `Game & Map` widgets feel equally intentional and the live preview maintains a true full-fit thumbnail with no obscured content.
- [ ] Design the next-pass DX constraint replacement/refinement after refreshing the exact original intent and current runtime meaning of `DX Distance` / `DX Weight`.
- [ ] Queue contested-lane midpoint-pair tunables for the UI owner after the control-panel refactor settles.
- [ ] Revisit `Lane Shape` again if the new version still feels too utility-heavy once used in motion, not just in a static screenshot.
- [ ] Audit the full in-game controls surface for any remaining mixed padding, mixed heights, mixed outline rules, or subsection-organization misses.
- [ ] Add a preservation discipline around surfaced UI settings so future refactors do not silently remove existing user-facing controls.

## Next Technical Queue

- [ ] Finish any remaining travel holdouts so every conquest mode uses lane-path truth consistently.
- [ ] Order arrows must follow lane paths, including curved lanes.
- [ ] Update CX corridors so competing players also meet across the lane midpoint instead of allowing third-party intrusion.
- [ ] Evaluate and tune the new metaball geometry-fill option so fill respects actual owned region boundaries without losing the desired look.
- [ ] Add further tunables for metaball fill behavior if the new ownership toggle alone is not sufficient.
- [ ] Implement and compare at least two metaball conquest transition options in-game.

## Fixture Maps And Validation

- [ ] Keep growing the curated fixture-map set for lane, corridor, and transition cases.
- [ ] Add loader/validator polish around the new fixture-map foundation.
- [ ] Use fixture maps for renderer comparison instead of ad hoc saved maps.

## Multiplayer / Workflow Queue

- [x] Verify the persistent public room against the live SDK/default dev port path.
- [ ] Verify the combined `bun run dev` flow in normal day-to-day use.
- [ ] Keep running the CLI-Anything vs `atlas-harness` evaluation during real Pax Fluxia work.
- [ ] On every tooling snag, classify the friction explicitly:
  - `atlas-harness`
  - CLI-Anything
  - Pi integration
  - Codex shell/environment
- [ ] Keep logging `atlas-harness` failures, shortcomings, and improvement ideas in the permanent ledger.

## Notes

- `FEATURE_STATUS.md` still contains useful history, but this file is the cleaner active queue for today.
- Dated work now lives in the matching dated folder by rule; this queue is the canonical daily queue location for 2026-04-12.
- The top priority remains color/UI trust first, then lane fidelity, then territory/metaball work.
- As of this round, `atlas-harness` is directly callable in the Codex shell, while CLI-Anything is still gated through Pi and cannot yet be fairly exercised here because Pi command execution is blocked by an inactive provider account.
- This file now also serves as the lossless day-scoped record of user task instructions, feature ideas, suggestions, and comments that arrived during execution.

## Lossless User Instruction Log

1. Main Menu design review brief:
   - "Review the Main Menu for design improvements, thinking from design principles, universal UX patterns, and your own consolidated aesthetic expertise."
   - "Ensure everything is elegant, intuitive, and has a real flair of unique personality to my game."
   - "You can take my game style forward one full step at least."
   - "Produce some ideas, critiques, inspiration, suggestions, and lofi layout mockups, with any hifi samples you want to throw in."
2. UI ownership handoff:
   - "Look at your brother-agent's work here; I've just divided the work so you are now in charge of UI."
   - Canonical referenced handoff doc: `.agent/docs/project/implementation-plans/2026-04-12/MAIN_MENU_UI_REDESIGN_PLAN_2026-04-12.md`
3. Full Main Menu implementation order:
   - "PLEASE IMPLEMENT THIS PLAN"
   - The full pasted plan in chat matched the standalone `MAIN_MENU_UI_REDESIGN_PLAN_2026-04-12.md` handoff and covered the three-panel shell, floating topbar, sticky command band, theme switching, Players-panel color ownership, row-anchored HSL popovers, compact Game & Map regrouping, Multiplayer focus, responsive layout, and the no-backend-change boundary.
4. Screenshot feedback: space use and layout:
   - "First of all, I like the aesthetic, nice work. It's an improvement overall."
   - "However we have significant use-of-space concerns and layout issues. Review image, ask questions as needed."
   - "Rework Lane Shape section. Open to your ideas."
   - "Scenario Pressure should own Ships per star (full label)"
   - "Tick Duration could be at the top, right-justified alongside Game & Map title."
   - "Number Of Players should naturally be relocated to Players panel at the top-level selection."
   - Annotated screenshot directives included:
     - expand the map thumbnail while keeping full-fit sizing so nothing is obscured
     - eliminate the extra info row for space-saving
     - make all widget panels equal-size in a 2x2 grid
     - make the lower-right area a real widget panel instead of a thin row
5. Start flow / modal behavior:
   - "I just noticed that you created an interstitial after I click Start Game."
   - "I do NOT want an interstitial here."
   - "Did you provide a way to call up this modal from in-game?"
   - "Do not interrupt your work, just provide a quick answer and continue."
6. Follow-up UI and controls feedback:
   - "New menu design: good! But you missed some padding, and some elements are not following a coherent style identity: mixed heights, mixed presence/absence of outline, mixed padding"
   - "`Anchor Hue` and `Strategy` toggle are not presenting as cleanly-sized and aligned with Players heading in that row."
   - "All panel headings are too small. They should be bumped up a couple font sizes."
   - "add a scale ruler for px distances, top absolute inline with `FPS | shipcount` floater."
   - "Controls section `Flash Duration` falsely reads unit of measurement as `ticks`, and binding toggle tells a lie of eg. `1400 ticks` (matches tick duration in ms)"
   - "In-game controls UI: each Settings Control Panel needs Sub-Sections with icons (positioned in a row-wrap underneath Section Name in any expanded Section) to expand/collapse sections, as these are long, busy panels."
   - "`Board Fill` setting should really be `Asymmetric vs Symmetrical`, with `100% Summetry` also producing `100% rectangular board fill.`"
   - "`Bind <setting> To Tick` does not produce a real two-way binding; on game reload, settings retain old duration values despite Tick Duration update"
   - "Some prior work removed UI settings again!!! I hate that this is common."
   - "I need"
   - "3. Arrow styles"
   - "Arrow style: a stepped gradient fill, borders, shape controls for arrowhead"
   - "Arrow animation along arrowshaft stepped gradient, VFX on arrowhead, and tunable to have optional intensity relative to attacking force size"
   - "add controls to adjust arrowhead shape (do a quick spot of research for triangle/arrowhead shape SVG variations; )"
7. Queue-discipline request:
   - "Have you been updating `C:\\Users\\mikep\\Desktop\\WebDev\\pax-fluxia\\.agent\\docs\\project\\implementation-plans\\2026-04-12\\FEATURE_AND_TASK_QUEUE_2026-04-12.md`?"
   - "Catch up if you have not; lossless record of ALL my task instructions, feature ideas, suggestions, comments."
