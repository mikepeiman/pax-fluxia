---
date created: 2026-05-28
last updated: 2026-05-28
last updated by: AI
relevant prior docs:
  - .agent/AGENT.md
  - pax-fluxia/src/lib/components/game/GameCanvas.svelte
  - pax-fluxia/src/lib/perf/pipelineTelemetry.ts
superseding docs: None
---

# GameCanvas logPipelineStage Purpose Review

## What This Reviews

This reviews every `logPipelineStage` call inside `pax-fluxia/src/lib/components/game/GameCanvas.svelte`.

The review is only about the `purpose` text in each call. The question is: if a human reads that purpose line, does it honestly explain why that log entry exists and what the code is doing at that point?

For each entry:
- `intent` means whether the purpose sentence makes sense.
- `matters` means whether that purpose is important enough to log.
- `effectiveness` means whether the code actually does what the purpose says.
- `value` means whether the log entry is worth keeping.

## Plain-English Summary

Most purpose lines are directionally correct. The best ones describe a direct drawing step: stars drawn, ships drawn, connections drawn, interaction overlay drawn.

The weakest purpose lines are the ones about delaying or resuming drawing work. Several of them say the game is delaying work because the player is interacting. That is sometimes true, but not always. The same code can also delay work simply because it is limiting how often expensive drawing work runs.

One purpose line is clearly too narrow: `geometry_cache_refresh`. It says geometry refreshes only when world connections or ownership changes. The code also refreshes geometry when drawing settings, size, render mode, or other geometry controls change.

## 1. `interaction_visual_acknowledgment`

Location: `GameCanvas.svelte`, around line 602.

Purpose in code:

> Confirm the command or selection has reached a visible UI surface

Plain meaning:

The player did something, such as selecting a star or issuing an order. This log is supposed to confirm that the game has drawn visible feedback for that action.

What the code actually does:

The code waits until the interaction overlay contains the expected visible state. For example, it checks whether an order line, cancelled order, deferred order, or selected star is now represented in the overlay state. Then it records how long that took.

How well the purpose matches:

It mostly matches. The only weakness is the phrase "visible UI surface." The code confirms that the overlay state was updated and drawn by the game code. It does not prove the browser has physically painted that update to the monitor.

Ratings:
- intent: 9
- matters: 8
- effectiveness: 8
- value: 8

Recommendation:

Keep it, but make the purpose more concrete: "Confirm the command or selection was drawn into the interaction overlay."

## 2. `interaction_local_acknowledgment`

Location: `GameCanvas.svelte`, around line 687.

Purpose in code:

> Acknowledge command or selection intent before heavyweight rendering catches up

Plain meaning:

When the player gives a command or changes selection, the game records that intent immediately instead of waiting for slower drawing work to finish.

What the code actually does:

The pointer handler records the local interaction, starts a short period where input gets priority, and queues a follow-up check to confirm that visible feedback appears. It also tries to draw that feedback immediately.

How well the purpose matches:

This is accurate. It describes the practical goal: fast feedback for the player's action.

Ratings:
- intent: 10
- matters: 9
- effectiveness: 9
- value: 9

Recommendation:

Keep it. The purpose is clear and important.

## 3. `ship_render_defer_stop`

Location: `GameCanvas.svelte`, around line 1036.

Purpose in code:

> Resume heavier ship rendering after interaction pressure subsides

Plain meaning:

The game had been skipping expensive ship drawing because the player was interacting, and now it is going back to normal ship drawing.

What the code actually does:

The game was skipping ship drawing. This log is written when the code decides to stop skipping it. That can happen because player interaction has calmed down, but it can also happen because ships have gone too long without being redrawn, because the game is paused, because a fresh draw is required, or because moving ships need attention.

How well the purpose matches:

It only partly matches. It names one common reason for resuming ship drawing, but the code has several other reasons.

Ratings:
- intent: 7
- matters: 7
- effectiveness: 5
- value: 6

Recommendation:

Keep the log, but rewrite the purpose: "Record that skipped ship drawing has ended and ships will be drawn again."

## 4. `ship_render_defer_start`

Location: `GameCanvas.svelte`, around line 1092.

Purpose in code:

> Prioritize command input and camera interaction over heavy ship rendering

Plain meaning:

The game is choosing to keep controls responsive instead of spending time drawing ships right now.

What the code actually does:

The code skips ship drawing for this frame when its timing rules say to wait. This can be because the player is interacting, but it can also be ordinary rate limiting after ship drawing was expensive.

How well the purpose matches:

The purpose is useful, but too narrow. It says the reason is input and camera interaction. That is not always the reason.

Ratings:
- intent: 8
- matters: 8
- effectiveness: 6
- value: 7

Recommendation:

Keep it, but rewrite the purpose: "Skip ship drawing for now to protect responsiveness and avoid drawing ships too often."

## 5. `ships_present`

Location: `GameCanvas.svelte`, around line 1162.

Purpose in code:

> Project orbital, damaged, and traveling ships into the visible fleet presentation layers

Plain meaning:

Draw all visible ship-related graphics.

What the code actually does:

The code draws ships around stars, damaged ships, moving ships, ship glow, travel effects, and related particles. It also updates the stored moving-ship state after drawing.

How well the purpose matches:

It matches well. The wording is a little technical, but the meaning is correct.

Ratings:
- intent: 9
- matters: 8
- effectiveness: 9
- value: 8

Recommendation:

Keep it. A clearer version would be: "Draw visible ships, ship damage, ship movement, glow, and particles."

## 6. `ownership_snapshot`

Location: `GameCanvas.svelte`, around line 2023.

Purpose in code:

> Provide ownership state for family geometry and scene builders

Plain meaning:

Give the territory-drawing code the current answer to "who owns each star?"

What the code actually does:

The code builds a small data object that lists each owned star and its owner. It also includes active conquest changes so territory drawing can react while ownership is changing.

How well the purpose matches:

The purpose is correct, but it assumes the reader already knows what "family geometry" and "scene builders" mean. It should be plain enough to understand without knowing the territory renderer internals.

Ratings:
- intent: 9
- matters: 9
- effectiveness: 8
- value: 8

Recommendation:

Keep it, but rewrite the purpose: "Give territory drawing code the current star ownership and active conquest changes."

## 7. `geometry_cache_refresh`

Location: `GameCanvas.svelte`, around line 2728.

Purpose in code:

> Refresh geometry only when world topology or ownership changes

Plain meaning:

Rebuild stored territory shape data only when star ownership or star connections change.

What the code actually does:

The code rebuilds stored territory shape data when many things change: map size, geometry settings, render mode, territory method, visual refresh marker, star ownership, star position, and lane connections.

How well the purpose matches:

This is the weakest purpose line. It is not wrong that ownership and connections can cause a refresh, but the word "only" makes the sentence inaccurate. The code has many more refresh triggers.

Ratings:
- intent: 8
- matters: 9
- effectiveness: 5
- value: 8

Recommendation:

Keep the log, but rewrite the purpose: "Refresh stored territory geometry when map structure, ownership, size, render mode, or geometry settings change."

## 8. `territory_async_yield`

Location: `GameCanvas.svelte`, around line 4751.

Purpose in code:

> Keep heavy territory presentation off the current main-thread turn while input pressure is active

Plain meaning:

If the player is actively interacting, delay expensive territory drawing instead of doing it right now.

What the code actually does:

The code checks whether territory drawing can wait. If the player is dragging, panning, pinching, issuing orders, or there is input waiting, and the territory update is not urgent, it delays the territory draw and tries again shortly after.

How well the purpose matches:

It matches well. This log is specifically written when the code chooses to wait because input should stay responsive.

Ratings:
- intent: 10
- matters: 9
- effectiveness: 9
- value: 9

Recommendation:

Keep it. A plainer version would be: "Delay expensive territory drawing while player input needs priority."

## 9. `territory_async_start`

Location: `GameCanvas.svelte`, around line 4792.

Purpose in code:

> Run heavy territory presentation work outside the pointer-handling turn

Plain meaning:

Do expensive territory drawing after the immediate click or pointer work has finished.

What the code actually does:

The code starts a queued territory drawing request. Most of the time, that request has been handed off so it runs after input handling. However, one mode can bypass the delay and run it immediately.

How well the purpose matches:

It mostly matches, but it sounds absolute. The code usually does what it says, but not in every mode.

Ratings:
- intent: 8
- matters: 8
- effectiveness: 7
- value: 8

Recommendation:

Keep it, but rewrite the purpose: "Start a queued territory draw, usually after pointer handling has had a chance to finish."

## 10. `territory_async_finish`

Location: `GameCanvas.svelte`, around line 4828.

Purpose in code:

> Record the final async territory presentation cost and commit lag for the current render mode

Plain meaning:

After territory drawing finishes, record how long it took and how long the queued request waited.

What the code actually does:

The code runs the territory drawing request, then records the total wait time, the drawing cost, and the active territory render mode.

How well the purpose matches:

The purpose is accurate, but the wording is not plain. "Commit lag" means the delay from when the request was queued to when drawing finished.

Ratings:
- intent: 8
- matters: 8
- effectiveness: 9
- value: 8

Recommendation:

Keep it, but rewrite the purpose: "Record that queued territory drawing finished, how long it waited, and how long it took."

## 11. `territory_async_deduped`

Location: `GameCanvas.svelte`, around line 4894.

Purpose in code:

> Keep one pending territory presentation for the same semantic scene state instead of churning identical replacements

Plain meaning:

If the same territory draw is already waiting, do not add another copy of it.

What the code actually does:

The code compares the new territory drawing request to the one already waiting. If they represent the same territory state, it keeps the existing request and drops the duplicate.

How well the purpose matches:

The idea is correct, but the wording is too dense. "Semantic scene state" and "churning" are not helpful to a reader who just wants to know what happens.

Ratings:
- intent: 9
- matters: 8
- effectiveness: 9
- value: 8

Recommendation:

Keep it, but rewrite the purpose: "Avoid queueing a duplicate territory draw when the same draw is already waiting."

## 12. `territory_async_replace`

Location: `GameCanvas.svelte`, around line 4924.

Purpose in code:

> Replace an older queued territory presentation with a fresher scene snapshot

Plain meaning:

If an old territory draw is waiting and a newer one arrives, keep the newer one.

What the code actually does:

The code records that the old waiting request was replaced, then stores the newer request as the one to draw next.

How well the purpose matches:

It matches well. "Scene snapshot" is a little technical, but the meaning is understandable.

Ratings:
- intent: 9
- matters: 8
- effectiveness: 9
- value: 8

Recommendation:

Keep it. A clearer version would be: "Replace an older queued territory draw with a newer one."

## 13. `territory_async_queue`

Location: `GameCanvas.svelte`, around line 4952.

Purpose in code:

> Queue heavy territory presentation so input and order mutation work can stay responsive

Plain meaning:

Put expensive territory drawing in a waiting slot so clicks, camera movement, and order changes are not blocked.

What the code actually does:

The code stores a territory drawing request and schedules it to run. In the normal path, this helps input stay responsive. In a smoothness-first mode, the request can run immediately.

How well the purpose matches:

It matches the normal behavior, but not every mode. The purpose should admit that queueing is the usual path, not an absolute delay.

Ratings:
- intent: 9
- matters: 9
- effectiveness: 8
- value: 9

Recommendation:

Keep it, but rewrite the purpose: "Queue territory drawing in the normal path so input and order changes can stay responsive."

## 14. `interaction_overlay_present`

Location: `GameCanvas.svelte`, around line 5003.

Purpose in code:

> Project active orders, selection, and drag intent into a lightweight overlay that can update independently of the Pixi scene

Plain meaning:

Draw order arrows, selection state, and drag preview on a separate simple canvas, instead of waiting for the main game graphics layer.

What the code actually does:

The code draws the interaction overlay on a dedicated two-dimensional canvas. This overlay can update separately from Pixi, which is the main graphics system used by the game.

How well the purpose matches:

It matches well. The purpose explains why this path exists: visible command feedback should be quick.

Ratings:
- intent: 10
- matters: 9
- effectiveness: 9
- value: 9

Recommendation:

Keep it. A slightly plainer version would be: "Draw orders, selection, and drag preview on a separate overlay so command feedback can update quickly."

## 15. `territory_defer_start`

Location: `GameCanvas.svelte`, around line 5284.

Purpose in code:

> Prioritize order input and camera interaction over heavy territory updates

Plain meaning:

Skip expensive territory drawing right now so player input stays responsive.

What the code actually does:

The code skips territory drawing for this frame when its timing rules say to wait. That can be because the player is interacting, but it can also be ordinary rate limiting after territory drawing was expensive.

How well the purpose matches:

The purpose is important but too narrow. It gives one reason for skipping territory drawing, not all reasons.

Ratings:
- intent: 8
- matters: 10
- effectiveness: 7
- value: 8

Recommendation:

Keep it, but rewrite the purpose: "Skip territory drawing for now to protect responsiveness and avoid drawing territory too often."

## 16. `territory_defer_stop`

Location: `GameCanvas.svelte`, around line 5308.

Purpose in code:

> Resume heavier territory updates after interactive pressure subsides

Plain meaning:

The game had been skipping expensive territory drawing because the player was interacting, and now it is going back to normal territory drawing.

What the code actually does:

The code was skipping territory drawing. This log is written when the code decides to stop skipping it. That can happen because player interaction calmed down, but it can also happen because the territory view needs a fresh draw, the render mode changed, the game is paused, a conquest is pending, or the existing territory drawing is old enough that it must be refreshed.

How well the purpose matches:

It partly matches, but it is too narrow. It says resuming is caused by interaction pressure ending, while the code has several other reasons.

Ratings:
- intent: 7
- matters: 9
- effectiveness: 6
- value: 7

Recommendation:

Keep it, but rewrite the purpose: "Record that skipped territory drawing has ended and territory will be drawn again."

## 17. `stars_present`

Location: `GameCanvas.svelte`, around line 6540.

Purpose in code:

> Project star ownership, ship counts, and conquest effects into visible star sprites

Plain meaning:

Draw the visible stars, including who owns them, how many ships they show, and conquest effects.

What the code actually does:

The code draws star graphics and labels. It includes active selection, drag source, pending conquests, conquest flashes, game time, and current zoom scale.

How well the purpose matches:

It matches well. The purpose says what the player-facing result is.

Ratings:
- intent: 9
- matters: 7
- effectiveness: 9
- value: 7

Recommendation:

Keep it. A clearer version would be: "Draw visible stars, labels, ownership, ship counts, and conquest effects."

## 18. `connections_present`

Location: `GameCanvas.svelte`, around line 6601.

Purpose in code:

> Project stable connection truth into the visible lane network layer

Plain meaning:

Draw the visible lines between connected stars.

What the code actually does:

The code reads the current star connections from the game state and draws the lane network.

How well the purpose matches:

The purpose is accurate, but the phrase "stable connection truth" is unclear. The game has current connections; the log should say that directly.

Ratings:
- intent: 8
- matters: 7
- effectiveness: 9
- value: 7

Recommendation:

Keep it, but rewrite the purpose: "Draw the current lane connections between stars."

## Best Purpose Rewrites

These are the highest-value wording fixes:

1. `geometry_cache_refresh`: "Refresh stored territory geometry when map structure, ownership, size, render mode, or geometry settings change."
2. `territory_defer_start`: "Skip territory drawing for now to protect responsiveness and avoid drawing territory too often."
3. `territory_defer_stop`: "Record that skipped territory drawing has ended and territory will be drawn again."
4. `ship_render_defer_start`: "Skip ship drawing for now to protect responsiveness and avoid drawing ships too often."
5. `ship_render_defer_stop`: "Record that skipped ship drawing has ended and ships will be drawn again."
6. `connections_present`: "Draw the current lane connections between stars."
