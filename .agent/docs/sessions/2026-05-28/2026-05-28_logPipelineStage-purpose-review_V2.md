---
date created: 2026-05-28
last updated: 2026-05-28
last updated by: AI
relevant prior docs:
  - .agent/docs/sessions/2026-05-28/2026-05-28_logPipelineStage-purpose-review.md
  - pax-fluxia/src/lib/components/game/GameCanvas.svelte
  - pax-fluxia/src/lib/perf/pipelineTelemetry.ts
superseding docs: None
---

# GameCanvas logPipelineStage Purpose Review V2

## Correction To The First Review

The first review used the wrong standard.

`logPipelineStage` does not make the game draw faster, delay work, resume work, update the screen, or confirm player feedback in any product-facing way. It writes a log message, and sometimes writes a named timing record. That is all.

So this review judges each call as logging, not as gameplay or rendering behavior.

In this document:
- `intent` means whether the purpose sentence is understandable.
- `matters` means whether that log would matter to a human debugging the game.
- `effectiveness` means whether the log record itself helps that human understand something.
- `value` means whether the log is worth keeping, assuming nobody reads it unless they are deliberately investigating a problem.

My revised baseline: a log that nobody reads has little or no value, even when the surrounding code is important.

## Overall Judgment

Most of these logs are weak as permanent logs.

The best candidates to keep are the interaction feedback logs, because they can answer a user-facing question: "When I clicked, how long did it take before the game showed feedback?"

Most render-step logs are low-value because they repeatedly say that normal drawing happened. They only become useful during a specific performance investigation. If they are kept, they should probably be behind an explicit diagnostic switch, sampled, or moved into a tool that is actually used during performance work.

## 1. `interaction_visual_acknowledgment`

Purpose says: confirm the command or selection has reached a visible UI surface.

Plain meaning: after the player does something, record when the game has drawn visible feedback for it.

What this log actually contributes: it records a timing point for visible interaction feedback. This can help measure whether clicks feel delayed.

Problem: the log does not prove the player actually saw the feedback. It only proves the code reached the point where feedback should have been drawn.

Ratings:
- intent: 7
- matters: 6
- effectiveness: 5
- value: 5

Recommendation: keep only if input-latency tools actively read it. Otherwise remove it or put it behind a diagnostic switch.

## 2. `interaction_local_acknowledgment`

Purpose says: acknowledge command or selection intent before heavyweight rendering catches up.

Plain meaning: record that the game accepted the player's click immediately, before slower drawing work finishes.

What this log actually contributes: it gives a starting point for measuring how long feedback takes after a click.

Problem: by itself, the log is not useful. It needs to be paired with the visible-feedback log, and someone has to compare the two records.

Ratings:
- intent: 8
- matters: 6
- effectiveness: 5
- value: 5

Recommendation: keep only as part of a real input-latency measurement path. If no tool reads it, remove it.

## 3. `ship_render_defer_stop`

Purpose says: resume heavier ship rendering after interaction pressure subsides.

Plain meaning: record that the game stopped skipping ship drawing.

What this log actually contributes: it records that a ship-drawing skip period ended.

Problem: this is mostly internal scheduler noise. It is only useful if someone is specifically debugging why ships are not updating often enough. The purpose also gives an incomplete reason; the skip can end for reasons other than player interaction calming down.

Ratings:
- intent: 5
- matters: 3
- effectiveness: 3
- value: 2

Recommendation: remove from normal logging. Keep only in a focused ship-drawing diagnostic mode.

## 4. `ship_render_defer_start`

Purpose says: prioritize command input and camera interaction over heavy ship rendering.

Plain meaning: record that ship drawing is being skipped so the game can stay responsive.

What this log actually contributes: it records that ship drawing was skipped for this frame.

Problem: the player cannot act on this, and a developer only needs it during a narrow performance investigation. The stated reason is also too narrow, because the skip can be ordinary draw-rate limiting rather than active player input.

Ratings:
- intent: 6
- matters: 3
- effectiveness: 3
- value: 2

Recommendation: remove from normal logging. If retained, gate it behind an explicit performance diagnostic.

## 5. `ships_present`

Purpose says: project orbital, damaged, and traveling ships into the visible fleet presentation layers.

Plain meaning: record that ships were drawn.

What this log actually contributes: it records normal ship drawing, plus counts for stars, moving ships, and pending conquests.

Problem: this is routine frame work. A log saying "ships were drawn" is not valuable unless a tool is comparing cost or frequency over time.

Ratings:
- intent: 6
- matters: 3
- effectiveness: 3
- value: 2

Recommendation: remove from normal logging. Prefer a performance summary tool when investigating ship drawing.

## 6. `ownership_snapshot`

Purpose says: provide ownership state for family geometry and scene builders.

Plain meaning: record that territory drawing was given current star ownership.

What this log actually contributes: it records a count summary for owned stars and conquest events.

Problem: it does not show the actual ownership details. It is too broad to prove correctness and too frequent to be pleasant as routine logging.

Ratings:
- intent: 6
- matters: 4
- effectiveness: 3
- value: 3

Recommendation: remove from normal logging. Keep ownership inspection in a targeted territory-debug tool instead.

## 7. `geometry_cache_refresh`

Purpose says: refresh geometry only when world topology or ownership changes.

Plain meaning: record that stored territory shape data was rebuilt.

What this log actually contributes: it marks when territory shape data was rebuilt and gives summary counts.

Problem: the purpose is inaccurate. The rebuild can also happen because drawing settings, size, render mode, or geometry controls changed. The log may be useful during territory performance work, but the current purpose sentence misleads the reader.

Ratings:
- intent: 5
- matters: 5
- effectiveness: 4
- value: 4

Recommendation: keep only if territory performance work actively uses it. Rewrite the purpose before keeping it.

## 8. `territory_async_yield`

Purpose says: keep heavy territory presentation off the current main-thread turn while input pressure is active.

Plain meaning: record that territory drawing was delayed because player input needed priority.

What this log actually contributes: it explains why a territory draw was postponed.

Problem: this is one of the more useful logs, but only when debugging input delay or territory update delay. It is not useful as everyday logging.

Ratings:
- intent: 8
- matters: 6
- effectiveness: 6
- value: 5

Recommendation: keep only in an input-performance diagnostic path. It has some real diagnostic value, but not as always-on logging.

## 9. `territory_async_start`

Purpose says: run heavy territory presentation work outside the pointer-handling turn.

Plain meaning: record that queued territory drawing is starting after the immediate click-handling work.

What this log actually contributes: it marks the start of a queued territory draw.

Problem: it is only useful when paired with the matching finish log. Alone, it is another "work started" message. Also, some modes can run without the delay implied by the purpose.

Ratings:
- intent: 6
- matters: 4
- effectiveness: 3
- value: 3

Recommendation: remove from normal logging. If kept, keep it only with the finish log in a timing tool.

## 10. `territory_async_finish`

Purpose says: record the final async territory presentation cost and commit lag for the current render mode.

Plain meaning: record that queued territory drawing finished, how long it waited, and how long it took.

What this log actually contributes: this is a real timing record for territory drawing cost and waiting time.

Problem: it is useful only if someone is looking at territory drawing performance. It is not useful for normal play or ordinary logs.

Ratings:
- intent: 7
- matters: 6
- effectiveness: 6
- value: 5

Recommendation: keep only in a territory-performance diagnostic path. This is one of the more defensible logs, but still should not be routine noise.

## 11. `territory_async_deduped`

Purpose says: keep one pending territory presentation for the same semantic scene state instead of churning identical replacements.

Plain meaning: record that the game ignored a duplicate territory draw request.

What this log actually contributes: it says a duplicate queued territory draw was dropped.

Problem: the idea is legitimate, but the wording is not plain. Also, this only matters when debugging why a territory draw did or did not happen. It is not useful as normal logging.

Ratings:
- intent: 5
- matters: 4
- effectiveness: 4
- value: 3

Recommendation: remove from normal logging. Keep as a counter in a territory scheduler diagnostic if needed.

## 12. `territory_async_replace`

Purpose says: replace an older queued territory presentation with a fresher scene snapshot.

Plain meaning: record that a newer territory draw replaced an older waiting one.

What this log actually contributes: it explains why an older queued territory draw will never run.

Problem: useful only during a specific investigation into skipped territory updates. Otherwise it is scheduler noise.

Ratings:
- intent: 7
- matters: 4
- effectiveness: 4
- value: 3

Recommendation: remove from normal logging. Keep as part of a territory queue diagnostic if that diagnostic is actually used.

## 13. `territory_async_queue`

Purpose says: queue heavy territory presentation so input and order mutation work can stay responsive.

Plain meaning: record that territory drawing was put in a waiting slot instead of being run directly.

What this log actually contributes: it marks that a territory draw was queued.

Problem: this is useful only when debugging responsiveness or the territory queue. It is otherwise a repeated internal status message.

Ratings:
- intent: 7
- matters: 5
- effectiveness: 4
- value: 4

Recommendation: remove from normal logging. Keep only in a queue-performance diagnostic path.

## 14. `interaction_overlay_present`

Purpose says: project active orders, selection, and drag intent into a lightweight overlay that can update independently of the Pixi scene.

Plain meaning: record that order arrows, selection, and drag preview were drawn on the separate interaction overlay.

What this log actually contributes: it confirms the interaction overlay draw path ran.

Problem: this is important behavior, but the log itself is not very valuable unless paired with input timing records. If the overlay is broken, a visual test or screenshot is usually more useful than this log.

Ratings:
- intent: 7
- matters: 5
- effectiveness: 4
- value: 4

Recommendation: keep only if input-feedback timing tools read it. Otherwise remove from normal logging.

## 15. `territory_defer_start`

Purpose says: prioritize order input and camera interaction over heavy territory updates.

Plain meaning: record that territory drawing is being skipped for now.

What this log actually contributes: it records the start of a period where territory drawing is skipped.

Problem: this is scheduler noise unless someone is debugging input delay or stale territory visuals. The stated reason is also incomplete, because the skip can be ordinary draw-rate limiting.

Ratings:
- intent: 6
- matters: 4
- effectiveness: 3
- value: 2

Recommendation: remove from normal logging. Use a focused diagnostic counter if skipped territory drawing becomes a real investigation target.

## 16. `territory_defer_stop`

Purpose says: resume heavier territory updates after interactive pressure subsides.

Plain meaning: record that skipped territory drawing has ended.

What this log actually contributes: it records that the game will resume territory drawing.

Problem: the purpose names only one possible reason. The skip can end because the game needs a fresh territory draw for several reasons. As normal logging, this is mostly noise.

Ratings:
- intent: 5
- matters: 4
- effectiveness: 3
- value: 2

Recommendation: remove from normal logging. If retained for diagnostics, rewrite the purpose.

## 17. `stars_present`

Purpose says: project star ownership, ship counts, and conquest effects into visible star sprites.

Plain meaning: record that stars were drawn.

What this log actually contributes: it records normal star drawing and a summary of star counts.

Problem: this is routine drawing work. A log entry for every normal draw has little value unless someone is measuring render cost.

Ratings:
- intent: 6
- matters: 3
- effectiveness: 3
- value: 2

Recommendation: remove from normal logging. Use performance summaries or visual tests instead.

## 18. `connections_present`

Purpose says: project stable connection truth into the visible lane network layer.

Plain meaning: record that star connection lines were drawn.

What this log actually contributes: it records normal lane drawing and the number of connections.

Problem: the wording is unclear, and the log is routine draw noise. If connections are wrong, the useful evidence is the actual map and rendered lanes, not this repeated message.

Ratings:
- intent: 4
- matters: 3
- effectiveness: 2
- value: 1

Recommendation: remove from normal logging. Replace with targeted lane diagnostics only when investigating connection rendering.

## Practical Recommendation

Do not keep all of these as always-on logs.

Suggested split:

Keep only in targeted input-performance tooling:
- `interaction_local_acknowledgment`
- `interaction_visual_acknowledgment`
- `interaction_overlay_present`

Keep only in targeted territory-performance tooling:
- `territory_async_yield`
- `territory_async_start`
- `territory_async_finish`
- `territory_async_deduped`
- `territory_async_replace`
- `territory_async_queue`
- `geometry_cache_refresh`

Remove or gate behind a rarely used render scheduler diagnostic:
- `ship_render_defer_start`
- `ship_render_defer_stop`
- `ships_present`
- `ownership_snapshot`
- `territory_defer_start`
- `territory_defer_stop`
- `stars_present`
- `connections_present`
