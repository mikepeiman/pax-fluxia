# Debug ingest vs game dev server, lane-curve edits, and zoom-off-screen note

**Date:** 2026-04-09  
**Audience:** Future debugging / operator clarity

---

## 1. What “item #1” meant (ingest server ≠ game dev server)

In **Cursor debug mode**, the assistant is instructed to send runtime telemetry to a **separate, local HTTP endpoint** so NDJSON lines can be collected (e.g. under `.cursor/debug-<sessionId>.log`). That endpoint is **not** your Svelte/Vite (or other) **game dev server**.

| Concern | Typical role |
|--------|----------------|
| **Game dev server** (e.g. Vite on 5173) | Serves the app and HMR. |
| **Debug ingest** (`http://127.0.0.1:7669/ingest/...`) | Optional side channel used **only** when instrumentation calls `fetch` to POST JSON. If nothing listens on 7669, the request fails silently (`.catch(() => {})`). |

**Reasoning:** The assistant follows a fixed workflow: log payloads must use the session URL and headers Cursor provides. That is **orthogonal** to how you run the game. Mentioning “ensure ingest is running” was about **collecting debug logs**, not about starting the game twice or a second “game server.”

**Operator takeaway:** You can ignore ingest entirely unless you want those logs; missing ingest does not explain gameplay bugs unless code incorrectly *depends* on the response (the mapgen/metaball snippets do not).

---

## 2. Lines changed in the **uncommitted** lane-curve / mapgen edit (reverted 2026-04-09)

`git status` at revert time showed **only** these source files under `common/` modified relative to `HEAD` (plus unrelated JSON/log files):

- `common/src/mapgen/index.ts`
- `common/src/mapgen/lanePolylines.ts`

Below is the **intent** of each hunk that existed in the working tree before revert.

### 2.1 `common/src/mapgen/index.ts`

| Lines (approx.) | Change | Intent |
|-----------------|--------|--------|
| 51–53 | Comment + `config.mapgenLaneCurveVsPruneBias ?? **0.55**` instead of `?? 0` | Align default bias with client `GAME_CONFIG` when callers omit the field, so Phase 4 straight-lane clearance uses `laneMargin × (1 − bias)` with a curve-leaning default. |
| 67–98 | `#region agent log` … `fetch('http://127.0.0.1:7669/ingest/...')` | Debug-mode telemetry: counts `nCurved` / `nStraight`, logs `phase4StraightLaneClearancePx`, `hypothesisId: 'H1-default-bias'`. |

**Pre-revert snippet (for archive):**

- `curveVsPruneBias` clamped with `?? 0.55`.
- After `attachLaneWaypointsToConnections`, conditional `fetch` when `laneMode === 'curved'` and `typeof fetch !== 'undefined'`.

### 2.2 `common/src/mapgen/lanePolylines.ts`

| Lines (approx.) | Change | Intent |
|-----------------|--------|--------|
| 347–374 | `#region agent log` … `fetch` after waypoint attach loop | Second hook for the same debug session (`hypothesisId: 'H2-attach-cache'`), including paths that call `attachLaneWaypointsToConnections` without going through `generateMap`. |

---

## 3. `MetaballRenderer.ts` ingest (not in this unstaged diff)

A repo search also finds **`fetch('http://127.0.0.1:7669/ingest/...')`** in `pax-fluxia/src/lib/renderers/MetaballRenderer.ts` (around **1131–1190**), with `hypothesisId: 'G_real_geom_agree_blur_fill_only'`. At the time of revert, **`git diff` for that file was empty** — i.e. it was **not** part of the unstaged “lane curve” edit; it may already live on the current branch `HEAD`.

**Intent (inferred):** One-shot diagnostic per render fingerprint (`__metaballDbgLoggedFp`), unrelated to map topology.

---

## 4. Zoomed out → zoom in + drift down until board leaves viewport

**Symptom:** On launch, board starts zoomed out, then simultaneously zooms in and translates downward until content is off-screen. User cleared `localStorage` and hard-reloaded; issue recurred (intermittent history).

### 4.1 Causal link to §2 mapgen edits

**No plausible mechanism** was identified: the mapgen changes only adjust connection pruning default bias and fire **non-blocking** `fetch` to localhost. They do not touch PIXI stage transform, `GameCanvas`, or stores.

**Conclusion:** Treat the zoom bug as **independent** unless future evidence ties a specific commit to camera code.

### 4.2 Likely subsystems to investigate (code anchors)

Primary camera logic lives in **`pax-fluxia/src/lib/components/game/GameCanvas.svelte`**:

| Topic | Location (approx.) | Note |
|-------|-------------------|------|
| Zoom/pan state | 255–270 | `baseScale`, `zoomLevel`, `panOffsetX/Y`, `targetZoom`, `targetPanX/Y`, `cameraAnimating`, `cameraInitialized` |
| First fit vs animated fit | 275–300 | `centerAndFit()`: first call snaps; later calls set `cameraAnimating = true` and lerp toward `targetZoom` / `targetPan*` |
| Per-frame lerp | 337–361 | `stepCameraAnimation()` — `CAMERA_EASE`, snaps when below `CAMERA_EPSILON` |
| Stage transform | 932–964 | `applyZoomTransform()` — `app.stage.scale`, `app.stage.x/y` from content center + pan |
| World bounds from stars | 756–785 | `updateWorldBounds()` — **early return if `currentStars.length === 0`** leaves defaults `contentWidth` / `contentHeight` (**747–750**: 1600×900) |

**Hypotheses worth validating with runtime logs (not yet proven here):**

1. **Empty stars on first `centerAndFit`:** bounds stay at defaults; after stars load, bounds jump; a **second** `centerAndFit` (with `cameraInitialized === true`) **animates** to a new center, looking like “zoom + slide.”
2. **Stale `targetPanY` / `targetZoom`** from a prior `navigateToStar` or resize while animating.
3. **`clampPan` (967–992)** fighting **animated** `panOffsetY` if `contentHeight` or `baseScale` changes mid-animation.
4. **Transpose / orientation** (`transposeStarCoordinates`, ~808+) changing display coords without resetting camera in the same frame.

**Call sites for `centerAndFit`:** `GameContainer.svelte` (~186, 398, 479, 540) — worth tracing order relative to star hydration.

### 4.3 What was *not* shown before

The intermittent nature and lack of pinned **before/after** camera state (bounds, `cameraInitialized`, star count, animation flags) explain why “exact cause” was not demonstrated. Next step is **instrumented** runs on `GameCanvas` (bounds + camera state per frame for first ~2s) or minimal repro video + log correlation.

---

## 5. Revert performed

On 2026-04-09, the working-tree changes to:

- `common/src/mapgen/index.ts`
- `common/src/mapgen/lanePolylines.ts`

were reverted to match **`HEAD`** (restore `?? 0` default for omitted bias; remove all `#region agent log` blocks in those files).

This document is retained as the record of intent and line-level scope.
