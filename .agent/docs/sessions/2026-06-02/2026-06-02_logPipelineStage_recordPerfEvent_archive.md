---
title: logPipelineStage and recordPerfEvent Archive
date: 2026-06-02
status: complete
---

# logPipelineStage and recordPerfEvent Archive

This archive preserves removed telemetry calls from the active project source/tooling. Generated output, dependency folders, and parallel worktrees are excluded.

## Summary

- Active roots: pax-fluxia/src, tools, common/src, common/test, common/tests
- Active code files scanned: 585
- Active code LOC scanned: 188501
- logPipelineStage calls: 82
- recordPerfEvent calls: 40
- Files with archived calls: 17

## File Counts

| File | logPipelineStage | recordPerfEvent |
|---|---:|---:|
| pax-fluxia/src/lib/components/game/GameCanvas.svelte | 18 | 23 |
| pax-fluxia/src/lib/components/ui/main-menu/MainMenu.svelte | 0 | 1 |
| pax-fluxia/src/lib/perf/perfProbe.ts | 0 | 6 |
| pax-fluxia/src/lib/perf/pipelineTelemetry.ts | 0 | 1 |
| pax-fluxia/src/lib/renderers/MetaballRenderer.ts | 8 | 2 |
| pax-fluxia/src/lib/stores/gameStore.svelte.ts | 26 | 6 |
| pax-fluxia/src/lib/territory/families/buildFamilyGeometry.ts | 4 | 0 |
| pax-fluxia/src/lib/territory/families/buildRenderFamilyInput.ts | 1 | 0 |
| pax-fluxia/src/lib/territory/families/metaball/buildMetaballScene.ts | 2 | 0 |
| pax-fluxia/src/lib/territory/families/metaball/MetaballFamily.ts | 2 | 0 |
| pax-fluxia/src/lib/territory/families/metaball/metaballSceneBase.ts | 1 | 0 |
| pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridPhaseEdgesFamily.ts | 0 | 1 |
| pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts | 4 | 0 |
| pax-fluxia/src/lib/territory/families/perimeterField/PerimeterFieldFamily.ts | 3 | 0 |
| pax-fluxia/src/lib/territory/families/perimeterField/perimeterFieldPlanEngine.ts | 3 | 0 |
| pax-fluxia/src/lib/territory/layers/geometry/compiler_UnifiedVectorGeometry.ts | 8 | 0 |
| pax-fluxia/src/lib/utils/mainMenuPreview.ts | 2 | 0 |

## pax-fluxia/src/lib/components/game/GameCanvas.svelte

### 1. recordPerfEvent at pax-fluxia/src/lib/components/game/GameCanvas.svelte:449

- event: `input.${kind}.handled`
- event name kind: template

```svelte
        recordPerfEvent(`input.${kind}.handled`, {
            queueDelayMs,
            eventTimeStampMs: event.timeStamp,
            button: "button" in event ? event.button : undefined,
            pointerType:
                "pointerType" in event ? event.pointerType : "mouse",
            clientX: event.clientX,
            clientY: event.clientY,
        });
```

### 2. recordPerfEvent at pax-fluxia/src/lib/components/game/GameCanvas.svelte:465

- event: `input.orderPath.${step}`
- event name kind: template

```svelte
        recordPerfEvent(`input.orderPath.${step}`, detail);
```

### 3. recordPerfEvent at pax-fluxia/src/lib/components/game/GameCanvas.svelte:601

- event: "input.interaction.visualAcknowledgment"
- event name kind: literal

```svelte
        recordPerfEvent("input.interaction.visualAcknowledgment", detail);
```

### 4. logPipelineStage at pax-fluxia/src/lib/components/game/GameCanvas.svelte:602

- context: GameCanvas
- stage: interaction_visual_acknowledgment
- purpose: Confirm the command or selection has reached a visible UI surface
- perfEventName: none

```svelte
        logPipelineStage({
            channel: "renderer",
            context: "GameCanvas",
            stage: "interaction_visual_acknowledgment",
            from: "Optimistic interaction state",
            to: "Visible order or selection overlay",
            purpose:
                "Confirm the command or selection has reached a visible UI surface",
            summary:
                `requestId=${acknowledgment.requestId} kind=${acknowledgment.kind} path=${acknowledgment.path} ` +
                `visualLagMs=${detail.visualLagMs.toFixed(3)} reason=${reason}`,
            detail,
        });
```

### 5. recordPerfEvent at pax-fluxia/src/lib/components/game/GameCanvas.svelte:686

- event: "input.interaction.localAcknowledgment"
- event name kind: literal

```svelte
        recordPerfEvent("input.interaction.localAcknowledgment", detail);
```

### 6. logPipelineStage at pax-fluxia/src/lib/components/game/GameCanvas.svelte:687

- context: GameCanvas
- stage: interaction_local_acknowledgment
- purpose: Acknowledge command or selection intent before heavyweight rendering catches up
- perfEventName: none

```svelte
        logPipelineStage({
            channel: "input",
            context: "GameCanvas",
            stage: "interaction_local_acknowledgment",
            from: "Pointer handler",
            to: "Optimistic local interaction state",
            purpose:
                "Acknowledge command or selection intent before heavyweight rendering catches up",
            summary:
                `requestId=${requestId} kind=${params.kind} path=${params.path} ` +
                `source=${params.sourceId ?? "null"} target=${params.targetId ?? "null"} ` +
                `active=${params.activeStarId ?? "null"}`,
            detail,
        });
```

### 7. recordPerfEvent at pax-fluxia/src/lib/components/game/GameCanvas.svelte:773

- event: "input.orderQueue.flushed"
- event name kind: literal

```svelte
        recordPerfEvent("input.orderQueue.flushed", {
            mutationCount: mutations.length,
            kinds: mutations.map((mutation) => mutation.kind),
            requestIds: mutations.map((mutation) => mutation.requestId),
            queueDelayMs: lastOrderMutationQueueDelayMs,
            flushMs:
                lastOrderQueueFlushFinishedAtMs - lastOrderQueueFlushStartedAtMs,
        });
```

### 8. recordPerfEvent at pax-fluxia/src/lib/components/game/GameCanvas.svelte:787

- event: "input.orderQueue.scheduled"
- event name kind: literal

```svelte
        recordPerfEvent("input.orderQueue.scheduled", {
            mutationCount: queuedOrderMutations.length,
        });
```

### 9. recordPerfEvent at pax-fluxia/src/lib/components/game/GameCanvas.svelte:852

- event: "input.orderMutation.immediate"
- event name kind: literal

```svelte
            recordPerfEvent("input.orderMutation.immediate", {
                kind: mutation.kind,
                requestId,
            });
```

### 10. recordPerfEvent at pax-fluxia/src/lib/components/game/GameCanvas.svelte:860

- event: "input.orderQueue.enqueued"
- event name kind: literal

```svelte
        recordPerfEvent("input.orderQueue.enqueued", {
            kind: mutation.kind,
            mutationCount: queuedOrderMutations.length,
            requestId,
            path: mutation.path,
        });
```

### 11. recordPerfEvent at pax-fluxia/src/lib/components/game/GameCanvas.svelte:890

- event: `input.${kind}`
- event name kind: template

```svelte
            recordPerfEvent(`input.${kind}`, { durationMs });
```

### 12. recordPerfEvent at pax-fluxia/src/lib/components/game/GameCanvas.svelte:976

- event: "game.renderFrame.inputYield"
- event name kind: literal

```svelte
        recordPerfEvent("game.renderFrame.inputYield", {
            stage,
            reason: yieldState.reason,
            elapsedMs: yieldState.elapsedMs,
            queuedOrderMutations: queuedOrderMutations.length,
            pendingInteractionVisualAcknowledgments: pendingInteractionVisualAcknowledgments.length,
            activePointers: activePointers.size,
            isDragging,
            isPanning,
            isPinching,
        });
```

### 13. recordPerfEvent at pax-fluxia/src/lib/components/game/GameCanvas.svelte:1028

- event: "game.ships.defer.stop"
- event name kind: literal

```svelte
        recordPerfEvent("game.ships.defer.stop", {
            deferredFrames: deferredShipRenderFrameCount,
            cadenceSkips: shipRenderCadenceSkipCount,
            lastShipRenderCostMs,
            reason: deferredShipRenderReason,
            cadenceMs: shipScheduler.cadenceMs,
            staleMs: shipScheduler.staleMs,
        });
```

### 14. logPipelineStage at pax-fluxia/src/lib/components/game/GameCanvas.svelte:1036

- context: GameCanvas
- stage: ship_render_defer_stop
- purpose: Resume heavier ship rendering after interaction pressure subsides
- perfEventName: none

```svelte
        logPipelineStage({
            channel: "input",
            context: "GameCanvas",
            stage: "ship_render_defer_stop",
            from: "Ship render scheduler",
            to: "Normal ship cadence",
            purpose:
                "Resume heavier ship rendering after interaction pressure subsides",
            summary:
                `deferredFrames=${deferredShipRenderFrameCount} ` +
                `cadenceSkips=${shipRenderCadenceSkipCount} ` +
                `reason=${deferredShipRenderReason} ` +
                `lastShipRenderMs=${lastShipRenderCostMs.toFixed(3)}`,
        });
```

### 15. recordPerfEvent at pax-fluxia/src/lib/components/game/GameCanvas.svelte:1086

- event: "game.ships.defer.start"
- event name kind: literal

```svelte
                recordPerfEvent("game.ships.defer.start", {
                    lastShipRenderCostMs,
                    reason: shipScheduler.reason,
                    cadenceMs: shipScheduler.cadenceMs,
                    staleMs: shipScheduler.staleMs,
                });
```

### 16. logPipelineStage at pax-fluxia/src/lib/components/game/GameCanvas.svelte:1092

- context: GameCanvas
- stage: ship_render_defer_start
- purpose: Prioritize command input and camera interaction over heavy ship rendering
- perfEventName: none

```svelte
                logPipelineStage({
                    channel: "input",
                    context: "GameCanvas",
                    stage: "ship_render_defer_start",
                    from: "Input pressure window",
                    to: "Ship render scheduler",
                    purpose:
                        "Prioritize command input and camera interaction over heavy ship rendering",
                    summary:
                        `reason=${shipScheduler.reason} ` +
                        `lastShipRenderMs=${lastShipRenderCostMs.toFixed(3)} ` +
                        `cadenceMs=${shipScheduler.cadenceMs} ` +
                        `staleMs=${shipScheduler.staleMs.toFixed(3)}`,
                });
```

### 17. logPipelineStage at pax-fluxia/src/lib/components/game/GameCanvas.svelte:1162

- context: GameCanvas
- stage: ships_present
- purpose: Project orbital, damaged, and traveling ships into the visible fleet presentation layers
- perfEventName: game.renderFrame.shipsPresent

```svelte
        logPipelineStage({
            channel: "renderer",
            context: "GameCanvas",
            stage: "ships_present",
            from: "Visual ship state + travel animation snapshot",
            to: "Pixi ship, glow, orb, and particle layers",
            purpose:
                "Project orbital, damaged, and traveling ships into the visible fleet presentation layers",
            summary:
                `${summarizeStars(params.stars)} ` +
                `traveling=${shipState.travelingShips.length} ` +
                `pendingConquests=${shipState.pendingConquests.size}`,
            perfEventName: "game.renderFrame.shipsPresent",
            perfDetail: {
                travelingShips: shipState.travelingShips.length,
                pendingConquests: shipState.pendingConquests.size,
                context: params.context,
                reason: lastShipRenderReason,
            },
        });
```

### 18. logPipelineStage at pax-fluxia/src/lib/components/game/GameCanvas.svelte:2023

- context: GameCanvas
- stage: ownership_snapshot
- purpose: Provide ownership state for family geometry and scene builders
- perfEventName: game.renderFrame.ownershipSnapshot

```svelte
        logPipelineStage({
            channel: "state",
            context: "GameCanvas",
            stage: "ownership_snapshot",
            from: "Active stars + transition overlay",
            to: "Render-family ownership snapshot",
            purpose: "Provide ownership state for family geometry and scene builders",
            summary:
                `${summarizeStars(stars)} ${summarizeOwnership(snapshot)}`,
            perfEventName: "game.renderFrame.ownershipSnapshot",
        });
```

### 19. logPipelineStage at pax-fluxia/src/lib/components/game/GameCanvas.svelte:2728

- context: GameCanvas
- stage: geometry_cache_refresh
- purpose: Refresh geometry only when world topology or ownership changes
- perfEventName: game.renderFrame.geometryCacheRefresh

```svelte
            logPipelineStage({
                channel: "renderer",
                context: "GameCanvas",
                stage: "geometry_cache_refresh",
                from: "Stars + lane topology",
                to: "Cached render-family geometry",
                purpose: "Refresh geometry only when world topology or ownership changes",
                summary:
                    `${summarizeStars(stars)} ${summarizeConnections(lanes)} ` +
                    summarizeGeometry(renderFamilyGeometryCache),
                perfEventName: "game.renderFrame.geometryCacheRefresh",
            });
```

### 20. recordPerfEvent at pax-fluxia/src/lib/components/game/GameCanvas.svelte:2821

- event: "territory.renderFamily.prevFrame"
- event name kind: literal

```svelte
                recordPerfEvent("territory.renderFamily.prevFrame", {
                    source: "presented_frame_cache",
                    transitionKey: key,
                    geometryVersion: renderFamilyStableGeometry.version,
                    ownershipVersion: renderFamilyStableOwnership.version,
                });
```

### 21. recordPerfEvent at pax-fluxia/src/lib/components/game/GameCanvas.svelte:2855

- event: "territory.renderFamily.prevFrame"
- event name kind: literal

```svelte
                recordPerfEvent("territory.renderFamily.prevFrame", {
                    source: "transition_rebuild",
                    transitionKey: key,
                    geometryVersion: geometry.version,
                    ownershipVersion: ownership.version,
                });
```

### 22. recordPerfEvent at pax-fluxia/src/lib/components/game/GameCanvas.svelte:4743

- event: "game.territory.async.yield"
- event name kind: literal

```svelte
                    recordPerfEvent("game.territory.async.yield", {
                        requestId: request.requestId,
                        activeMode: request.activeMode,
                        requestAgeMs: decision.requestAgeMs,
                        reason: decision.reason,
                        queuedOrderMutations: queuedOrderMutations.length,
                        pendingVisualAcknowledgments: pendingInteractionVisualAcknowledgments.length,
                    });
```

### 23. logPipelineStage at pax-fluxia/src/lib/components/game/GameCanvas.svelte:4751

- context: GameCanvas
- stage: territory_async_yield
- purpose: Keep heavy territory presentation off the current main-thread turn while input pressure is active
- perfEventName: none

```svelte
                    logPipelineStage({
                        channel: "input",
                        context: "GameCanvas",
                        stage: "territory_async_yield",
                        from: "Territory presentation queue",
                        to: "Delayed async territory retry",
                        purpose:
                            "Keep heavy territory presentation off the current main-thread turn while input pressure is active",
                        summary:
                            `requestId=${request.requestId} mode=${request.activeMode} ` +
                            `reason=${decision.reason} ageMs=${decision.requestAgeMs.toFixed(3)}`,
                        detail: {
                            requestId: request.requestId,
                            activeMode: request.activeMode,
                            requestAgeMs: decision.requestAgeMs,
                            reason: decision.reason,
                            queuedOrderMutations: queuedOrderMutations.length,
                            pendingVisualAcknowledgments:
                                pendingInteractionVisualAcknowledgments.length,
                        },
                    });
```

### 24. recordPerfEvent at pax-fluxia/src/lib/components/game/GameCanvas.svelte:4785

- event: "game.territory.async.start"
- event name kind: literal

```svelte
                recordPerfEvent("game.territory.async.start", {
                    requestId: request.requestId,
                    activeMode: request.activeMode,
                    queueWaitMs: territoryPresentationLastQueueWaitMs,
                    cadenceMs: request.territoryScheduler.cadenceMs,
                    staleMs: request.territoryScheduler.staleMs,
                });
```

### 25. logPipelineStage at pax-fluxia/src/lib/components/game/GameCanvas.svelte:4792

- context: GameCanvas
- stage: territory_async_start
- purpose: Run heavy territory presentation work outside the pointer-handling turn
- perfEventName: none

```svelte
                logPipelineStage({
                    channel: "input",
                    context: "GameCanvas",
                    stage: "territory_async_start",
                    from: "Territory presentation queue",
                    to: "Territory renderer commit",
                    purpose:
                        "Run heavy territory presentation work outside the pointer-handling turn",
                    summary:
                        `requestId=${request.requestId} mode=${request.activeMode} ` +
                        `queueWaitMs=${territoryPresentationLastQueueWaitMs.toFixed(3)}`,
                });
```

### 26. recordPerfEvent at pax-fluxia/src/lib/components/game/GameCanvas.svelte:4820

- event: "game.territory.async.finish"
- event name kind: literal

```svelte
                recordPerfEvent("game.territory.async.finish", {
                    requestId: request.requestId,
                    activeMode: request.activeMode,
                    queueWaitMs: territoryPresentationLastQueueWaitMs,
                    commitLagMs: territoryPresentationLastCommitLagMs,
                    lastTerritoryUpdateCostMs,
                    supersededCount: territoryPresentationSupersededCount,
                });
```

### 27. logPipelineStage at pax-fluxia/src/lib/components/game/GameCanvas.svelte:4828

- context: GameCanvas
- stage: territory_async_finish
- purpose: Record the final async territory presentation cost and commit lag for the current render mode
- perfEventName: none

```svelte
                logPipelineStage({
                    channel: "renderer",
                    context: "GameCanvas",
                    stage: "territory_async_finish",
                    from: "Territory renderer commit",
                    to: "Visible territory layer",
                    purpose:
                        "Record the final async territory presentation cost and commit lag for the current render mode",
                    summary:
                        `requestId=${request.requestId} mode=${request.activeMode} ` +
                        `commitLagMs=${territoryPresentationLastCommitLagMs.toFixed(3)} ` +
                        `updateMs=${lastTerritoryUpdateCostMs.toFixed(3)}`,
                    detail: {
                        requestId: request.requestId,
                        activeMode: request.activeMode,
                        queueWaitMs: territoryPresentationLastQueueWaitMs,
                        commitLagMs: territoryPresentationLastCommitLagMs,
                        lastTerritoryUpdateCostMs,
                        supersededCount: territoryPresentationSupersededCount,
                    },
                });
```

### 28. recordPerfEvent at pax-fluxia/src/lib/components/game/GameCanvas.svelte:4890

- event: "game.territory.async.deduped"
- event name kind: literal

```svelte
            recordPerfEvent("game.territory.async.deduped", {
                pendingRequestId: territoryPresentationPendingRequest.requestId,
                activeMode: nextRequest.activeMode,
            });
```

### 29. logPipelineStage at pax-fluxia/src/lib/components/game/GameCanvas.svelte:4894

- context: GameCanvas
- stage: territory_async_deduped
- purpose: Keep one pending territory presentation for the same semantic scene state instead of churning identical replacements
- perfEventName: none

```svelte
            logPipelineStage({
                channel: "input",
                context: "GameCanvas",
                stage: "territory_async_deduped",
                from: "Queued territory request",
                to: "Existing territory request",
                purpose:
                    "Keep one pending territory presentation for the same semantic scene state instead of churning identical replacements",
                summary:
                    `pending=${territoryPresentationPendingRequest.requestId} ` +
                    `mode=${nextRequest.activeMode}`,
                detail: {
                    pendingRequestId: territoryPresentationPendingRequest.requestId,
                    activeMode: nextRequest.activeMode,
                    cadenceMs: request.territoryScheduler.cadenceMs,
                    staleMs: request.territoryScheduler.staleMs,
                    reason: request.territoryScheduler.reason,
                },
            });
```

### 30. recordPerfEvent at pax-fluxia/src/lib/components/game/GameCanvas.svelte:4919

- event: "game.territory.async.replaced"
- event name kind: literal

```svelte
            recordPerfEvent("game.territory.async.replaced", {
                replacedRequestId: territoryPresentationPendingRequest.requestId,
                nextRequestId: nextRequest.requestId,
                activeMode: nextRequest.activeMode,
            });
```

### 31. logPipelineStage at pax-fluxia/src/lib/components/game/GameCanvas.svelte:4924

- context: GameCanvas
- stage: territory_async_replace
- purpose: Replace an older queued territory presentation with a fresher scene snapshot
- perfEventName: none

```svelte
            logPipelineStage({
                channel: "input",
                context: "GameCanvas",
                stage: "territory_async_replace",
                from: "Queued territory request",
                to: "Newer territory request",
                purpose:
                    "Replace an older queued territory presentation with a fresher scene snapshot",
                summary:
                    `replaced=${territoryPresentationPendingRequest.requestId} ` +
                    `next=${nextRequest.requestId} mode=${nextRequest.activeMode}`,
                detail: {
                    replacedRequestId:
                        territoryPresentationPendingRequest.requestId,
                    nextRequestId: nextRequest.requestId,
                    activeMode: nextRequest.activeMode,
                    cadenceMs: request.territoryScheduler.cadenceMs,
                    staleMs: request.territoryScheduler.staleMs,
                    reason: request.territoryScheduler.reason,
                },
            });
```

### 32. recordPerfEvent at pax-fluxia/src/lib/components/game/GameCanvas.svelte:4946

- event: "game.territory.async.queued"
- event name kind: literal

```svelte
            recordPerfEvent("game.territory.async.queued", {
                requestId: nextRequest.requestId,
                activeMode: nextRequest.activeMode,
                cadenceMs: request.territoryScheduler.cadenceMs,
                staleMs: request.territoryScheduler.staleMs,
            });
```

### 33. logPipelineStage at pax-fluxia/src/lib/components/game/GameCanvas.svelte:4952

- context: GameCanvas
- stage: territory_async_queue
- purpose: Queue heavy territory presentation so input and order mutation work can stay responsive
- perfEventName: none

```svelte
            logPipelineStage({
                channel: "input",
                context: "GameCanvas",
                stage: "territory_async_queue",
                from: "Render-frame territory request",
                to: "Territory presentation queue",
                purpose:
                    "Queue heavy territory presentation so input and order mutation work can stay responsive",
                summary:
                    `requestId=${nextRequest.requestId} mode=${nextRequest.activeMode} ` +
                    `cadenceMs=${request.territoryScheduler.cadenceMs} ` +
                    `staleMs=${request.territoryScheduler.staleMs.toFixed(3)}`,
                detail: {
                    requestId: nextRequest.requestId,
                    activeMode: nextRequest.activeMode,
                    cadenceMs: request.territoryScheduler.cadenceMs,
                    staleMs: request.territoryScheduler.staleMs,
                    reason: request.territoryScheduler.reason,
                },
            });
```

### 34. logPipelineStage at pax-fluxia/src/lib/components/game/GameCanvas.svelte:5003

- context: GameCanvas
- stage: interaction_overlay_present
- purpose: Project active orders, selection, and drag intent into a lightweight overlay that can update independently of the Pixi scene
- perfEventName: game.renderFrame.interactionOverlayPresent

```svelte
        logPipelineStage({
            channel: "renderer",
            context: "GameCanvas",
            stage: "interaction_overlay_present",
            from: "Confirmed + optimistic order state",
            to: "2D interaction overlay canvas",
            purpose:
                "Project active orders, selection, and drag intent into a lightweight overlay that can update independently of the Pixi scene",
            summary:
                `pending=${pendingOrders.size} deferred=${deferredOrders.size} ` +
                summarizeStars(stars),
            perfEventName: "game.renderFrame.interactionOverlayPresent",
            perfDetail: {
                pendingOrders: pendingOrders.size,
                deferredOrders: deferredOrders.size,
                activeStarId,
                dragSourceId,
            },
        });
```

### 35. recordPerfEvent at pax-fluxia/src/lib/components/game/GameCanvas.svelte:5278

- event: "game.territory.defer.start"
- event name kind: literal

```svelte
                        recordPerfEvent("game.territory.defer.start", {
                            lastTerritoryUpdateCostMs,
                            reason: territoryScheduler.reason,
                            cadenceMs: territoryScheduler.cadenceMs,
                            staleMs: territoryScheduler.staleMs,
                        });
```

### 36. logPipelineStage at pax-fluxia/src/lib/components/game/GameCanvas.svelte:5284

- context: GameCanvas
- stage: territory_defer_start
- purpose: Prioritize order input and camera interaction over heavy territory updates
- perfEventName: none

```svelte
                        logPipelineStage({
                            channel: "input",
                            context: "GameCanvas",
                            stage: "territory_defer_start",
                            from: "Input pressure window",
                            to: "Territory renderer scheduler",
                            purpose: "Prioritize order input and camera interaction over heavy territory updates",
                            summary:
                                `reason=${territoryScheduler.reason} ` +
                                `lastTerritoryUpdateMs=${lastTerritoryUpdateCostMs.toFixed(3)} ` +
                                `cadenceMs=${territoryScheduler.cadenceMs} ` +
                                `staleMs=${territoryScheduler.staleMs.toFixed(3)}`,
                        });
```

### 37. recordPerfEvent at pax-fluxia/src/lib/components/game/GameCanvas.svelte:5300

- event: "game.territory.defer.stop"
- event name kind: literal

```svelte
                        recordPerfEvent("game.territory.defer.stop", {
                            deferredFrames: deferredTerritoryFrameCount,
                            cadenceSkips: territoryCadenceSkipCount,
                            lastTerritoryUpdateCostMs,
                            reason: deferredTerritoryReason,
                            cadenceMs: territoryScheduler.cadenceMs,
                            staleMs: territoryScheduler.staleMs,
                        });
```

### 38. logPipelineStage at pax-fluxia/src/lib/components/game/GameCanvas.svelte:5308

- context: GameCanvas
- stage: territory_defer_stop
- purpose: Resume heavier territory updates after interactive pressure subsides
- perfEventName: none

```svelte
                        logPipelineStage({
                            channel: "input",
                            context: "GameCanvas",
                            stage: "territory_defer_stop",
                            from: "Territory renderer scheduler",
                            to: "Normal territory cadence",
                            purpose: "Resume heavier territory updates after interactive pressure subsides",
                            summary:
                                `deferredFrames=${deferredTerritoryFrameCount} ` +
                                `cadenceSkips=${territoryCadenceSkipCount} ` +
                                `reason=${deferredTerritoryReason} ` +
                                `lastTerritoryUpdateMs=${lastTerritoryUpdateCostMs.toFixed(3)}`,
                        });
```

### 39. recordPerfEvent at pax-fluxia/src/lib/components/game/GameCanvas.svelte:5336

- event: "game.territory.schedule.run"
- event name kind: literal

```svelte
            recordPerfEvent("game.territory.schedule.run", {
                mode: activeTerritoryMode,
                cadenceMs: territoryScheduler.cadenceMs,
                staleMs: territoryScheduler.staleMs,
                lastTerritoryUpdateCostMs,
            });
```

### 40. logPipelineStage at pax-fluxia/src/lib/components/game/GameCanvas.svelte:6540

- context: GameCanvas
- stage: stars_present
- purpose: Project star ownership, ship counts, and conquest effects into visible star sprites
- perfEventName: game.renderFrame.starsPresent

```svelte
            logPipelineStage({
                channel: "renderer",
                context: "GameCanvas",
                stage: "stars_present",
                from: "Star state snapshot",
                to: "Pixi star + label layers",
                purpose:
                    "Project star ownership, ship counts, and conquest effects into visible star sprites",
                summary: summarizeStars(stars),
                perfEventName: "game.renderFrame.starsPresent",
                perfDetail: {
                    activeStarId,
                    dragSourceId,
                    pendingConquests: pendingConquests.size,
                    cadenceMs: starsScheduler.cadenceMs,
                    staleMs: starsScheduler.staleMs,
                    reason: starsScheduler.reason,
                },
            });
```

### 41. logPipelineStage at pax-fluxia/src/lib/components/game/GameCanvas.svelte:6601

- context: GameCanvas
- stage: connections_present
- purpose: Project stable connection truth into the visible lane network layer
- perfEventName: game.renderFrame.connectionsPresent

```svelte
                logPipelineStage({
                    channel: "renderer",
                    context: "GameCanvas",
                    stage: "connections_present",
                    from: "Lane topology snapshot",
                    to: "Pixi connection graphics",
                    purpose:
                        "Project stable connection truth into the visible lane network layer",
                    summary: summarizeConnections(connections),
                    perfEventName: "game.renderFrame.connectionsPresent",
                    perfDetail: {
                        connectionCount: connections.length,
                        cadenceMs: connectionsScheduler.cadenceMs,
                        staleMs: connectionsScheduler.staleMs,
                        reason: connectionsScheduler.reason,
                        },
                    });
```

## pax-fluxia/src/lib/components/ui/main-menu/MainMenu.svelte

### 42. recordPerfEvent at pax-fluxia/src/lib/components/ui/main-menu/MainMenu.svelte:745

- event: "menu.startGame.requested"
- event name kind: literal

```svelte
        recordPerfEvent("menu.startGame.requested");
```

## pax-fluxia/src/lib/perf/perfProbe.ts

### 43. recordPerfEvent at pax-fluxia/src/lib/perf/perfProbe.ts:208

- event: "browser.longtask"
- event name kind: literal

```ts
        recordPerfEvent("browser.longtask", {
            durationMs: entry.duration,
            startTimeMs: entry.startTime,
            name: entry.name,
            entryType: entry.entryType,
        });
```

### 44. recordPerfEvent at pax-fluxia/src/lib/perf/perfProbe.ts:217

- event: "browser.paint"
- event name kind: literal

```ts
        recordPerfEvent("browser.paint", {
            durationMs: entry.duration,
            startTimeMs: entry.startTime,
            name: entry.name,
        });
```

### 45. recordPerfEvent at pax-fluxia/src/lib/perf/perfProbe.ts:230

- event: "browser.layoutShift"
- event name kind: literal

```ts
        recordPerfEvent("browser.layoutShift", {
            durationMs: entry.duration,
            startTimeMs: entry.startTime,
            value: typeof shift.value === "number" ? shift.value : 0,
            hadRecentInput: Boolean(shift.hadRecentInput),
            sourceCount: Array.isArray(shift.sources) ? shift.sources.length : 0,
        });
```

### 46. recordPerfEvent at pax-fluxia/src/lib/perf/perfProbe.ts:246

- event: "browser.lcp"
- event name kind: literal

```ts
        recordPerfEvent("browser.lcp", {
            startTimeMs: entry.startTime,
            renderTimeMs:
                typeof lcp.renderTime === "number" ? lcp.renderTime : 0,
            loadTimeMs: typeof lcp.loadTime === "number" ? lcp.loadTime : 0,
            size: typeof lcp.size === "number" ? lcp.size : 0,
            url: typeof lcp.url === "string" ? lcp.url : null,
        });
```

### 47. recordPerfEvent at pax-fluxia/src/lib/perf/perfProbe.ts:261

- event: "browser.longAnimationFrame"
- event name kind: literal

```ts
        recordPerfEvent("browser.longAnimationFrame", {
            durationMs: entry.duration,
            startTimeMs: entry.startTime,
            blockingDurationMs:
                typeof longFrame.blockingDuration === "number"
                    ? longFrame.blockingDuration
                    : 0,
            scriptCount: Array.isArray(longFrame.scripts)
                ? longFrame.scripts.length
                : 0,
            topScriptUrl:
                Array.isArray(longFrame.scripts) &&
                typeof longFrame.scripts[0]?.sourceURL === "string"
                    ? longFrame.scripts[0].sourceURL
                    : null,
        });
```

### 48. recordPerfEvent at pax-fluxia/src/lib/perf/perfProbe.ts:283

- event: "browser.eventTiming"
- event name kind: literal

```ts
        recordPerfEvent("browser.eventTiming", {
            name: detail.name,
            durationMs: detail.duration,
            startTimeMs: detail.startTime,
            processingStartMs: detail.processingStart,
            processingEndMs: detail.processingEnd,
            interactionId: typeof detail.interactionId === "number"
                ? detail.interactionId
                : undefined,
        });
```

## pax-fluxia/src/lib/perf/pipelineTelemetry.ts

### 49. recordPerfEvent at pax-fluxia/src/lib/perf/pipelineTelemetry.ts:165

- event: params.perfEventName
- event name kind: expression

```ts
        recordPerfEvent(params.perfEventName, {
            stage: params.stage,
            from: params.from,
            to: params.to,
            purpose: params.purpose,
            summary: params.summary,
            ...(params.perfDetail ?? params.detail ?? {}),
        });
```

## pax-fluxia/src/lib/renderers/MetaballRenderer.ts

### 50. recordPerfEvent at pax-fluxia/src/lib/renderers/MetaballRenderer.ts:1266

- event: 'territory.metaballRenderer.workerError'
- event name kind: literal

```ts
        recordPerfEvent('territory.metaballRenderer.workerError', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
        });
```

### 51. logPipelineStage at pax-fluxia/src/lib/renderers/MetaballRenderer.ts:1410

- context: MetaballRenderer
- stage: worker_request_queued
- purpose: Hold the newest metaball solve request while a previous worker solve is still active
- perfEventName: territory.metaballRenderer.workerRequestQueued

```ts
        logPipelineStage({
            channel: 'renderer',
            context: 'MetaballRenderer',
            stage: 'worker_request_queued',
            from: 'MetaballSceneInput',
            to: 'Queued worker request',
            purpose: 'Hold the newest metaball solve request while a previous worker solve is still active',
            perfEventName: 'territory.metaballRenderer.workerRequestQueued',
            perfDetail: {
                requestId: request.requestId,
                fingerprint: request.fingerprint,
                staticSampleCount: request.staticSamples?.length ?? 0,
                dynamicSampleCount: request.dynamicSamples.length,
            },
            logDetail: {
                requestId: request.requestId,
                fingerprint: request.fingerprint,
                staticFieldFingerprint: request.staticFieldFingerprint,
                dynamicFieldFingerprint: request.dynamicFieldFingerprint,
                config: request.config,
                staticSamples: request.staticSamples,
                dynamicSamples: request.dynamicSamples,
                ownedStars: request.ownedStars,
            },
        });
```

### 52. logPipelineStage at pax-fluxia/src/lib/renderers/MetaballRenderer.ts:1442

- context: MetaballRenderer
- stage: worker_request_posted
- purpose: Dispatch the latest cached scene field to the worker for async solve and stroke extraction
- perfEventName: territory.metaballRenderer.workerRequestPosted

```ts
    logPipelineStage({
        channel: 'renderer',
        context: 'MetaballRenderer',
        stage: 'worker_request_posted',
        from: 'MetaballSceneInput',
        to: 'Metaball grid worker',
        purpose: 'Dispatch the latest cached scene field to the worker for async solve and stroke extraction',
        perfEventName: 'territory.metaballRenderer.workerRequestPosted',
        perfDetail: {
            requestId: request.requestId,
            fingerprint: request.fingerprint,
            staticSampleCount: request.staticSamples?.length ?? 0,
            dynamicSampleCount: request.dynamicSamples.length,
        },
        logDetail: {
            requestId: request.requestId,
            fingerprint: request.fingerprint,
            staticFieldFingerprint: request.staticFieldFingerprint,
            dynamicFieldFingerprint: request.dynamicFieldFingerprint,
            config: request.config,
            playerColors: request.playerColors,
            clusterShips: request.clusterShips,
            ownedStars: request.ownedStars,
            staticSamples: request.staticSamples,
            dynamicSamples: request.dynamicSamples,
        },
    });
```

### 53. logPipelineStage at pax-fluxia/src/lib/renderers/MetaballRenderer.ts:1520

- context: MetaballRenderer
- stage: worker_response_commit
- purpose: Commit the solved worker field into the Pixi fill texture and stroke layer
- perfEventName: territory.metaballRenderer.workerResponseCommitted

```ts
    logPipelineStage({
        channel: 'renderer',
        context: 'MetaballRenderer',
        stage: 'worker_response_commit',
        from: 'Metaball grid worker',
        to: 'Texture upload + border graphics',
        purpose: 'Commit the solved worker field into the Pixi fill texture and stroke layer',
        summary: summarizeRendererMetrics(metrics),
        perfEventName: 'territory.metaballRenderer.workerResponseCommitted',
        perfDetail: {
            requestId: response.requestId,
            fingerprint: response.fingerprint,
            cellCount: response.cellCount,
            staticCacheHit: response.staticCacheHit,
            textureUploadMs: metrics.textureUploadMs,
            borderMs: metrics.borderMs,
            solveMs: metrics.solveMs,
        },
        logDetail: {
            requestId: response.requestId,
            fingerprint: response.fingerprint,
            cols: response.cols,
            rows: response.rows,
            cellSize: response.cellSize,
            gridOriginX: response.gridOriginX,
            gridOriginY: response.gridOriginY,
            cellCount: response.cellCount,
            numPlayers: response.numPlayers,
            staticSampleCount: response.staticSampleCount,
            dynamicSampleCount: response.dynamicSampleCount,
            staticCacheHit: response.staticCacheHit,
            staticBuildMs: response.staticBuildMs,
            dynamicBuildMs: response.dynamicBuildMs,
            classificationMs: response.classificationMs,
            strokeBuildMs: response.strokeBuildMs,
            metrics,
            strokes: response.strokes.map((stroke) => ({
                color: stroke.color,
                alpha: stroke.alpha,
                width: stroke.width,
                pathCount: stroke.paths.length,
            })),
        },
    });
```

### 54. logPipelineStage at pax-fluxia/src/lib/renderers/MetaballRenderer.ts:1680

- context: MetaballRenderer
- stage: render_skip
- purpose: Reuse cached metaball presentation when scene fingerprint is unchanged
- perfEventName: territory.metaball.rendererSkipped

```ts
        logPipelineStage({
            channel: 'renderer',
            context: 'MetaballRenderer',
            stage: 'render_skip',
            from: 'Scene fingerprint',
            to: 'Existing GPU resources',
            purpose: 'Reuse cached metaball presentation when scene fingerprint is unchanged',
            summary:
                `${summarizeScene(sceneInput ?? {})} ` +
                summarizeRendererMetrics(metrics),
            perfEventName: 'territory.metaball.rendererSkipped',
        });
```

### 55. logPipelineStage at pax-fluxia/src/lib/renderers/MetaballRenderer.ts:1704

- context: MetaballRenderer
- stage: render_empty
- purpose: Skip render work when there are no owned stars to visualize
- perfEventName: territory.metaball.rendererEmpty

```ts
        logPipelineStage({
            channel: 'renderer',
            context: 'MetaballRenderer',
            stage: 'render_empty',
            from: 'Scene input',
            to: 'Hidden territory layer',
            purpose: 'Skip render work when there are no owned stars to visualize',
            summary: summarizeScene(sceneInput ?? {}),
            perfEventName: 'territory.metaball.rendererEmpty',
        });
```

### 56. recordPerfEvent at pax-fluxia/src/lib/renderers/MetaballRenderer.ts:1953

- event: 'territory.metaballRenderer.workerSolve'
- event name kind: literal

```ts
            recordPerfEvent('territory.metaballRenderer.workerSolve', {
                staticCacheHit: readyResponse.staticCacheHit,
                staticBuildMs: readyResponse.staticBuildMs,
                dynamicBuildMs: readyResponse.dynamicBuildMs,
                classificationMs: readyResponse.classificationMs,
                strokeBuildMs: readyResponse.strokeBuildMs,
                solveMs: readyResponse.solveMs,
                borderMs: readyResponse.borderMs,
                workerRequestMs: metrics.workerRequestMs,
                workerPostMs: metrics.workerPostMs,
                workerCommitMs: metrics.workerCommitMs,
                staticSamples: readyResponse.staticSampleCount,
                dynamicSamples: readyResponse.dynamicSampleCount,
            });
```

### 57. logPipelineStage at pax-fluxia/src/lib/renderers/MetaballRenderer.ts:1967

- context: MetaballRenderer
- stage: render_commit
- purpose: Commit worker-solved territory presentation on the main thread
- perfEventName: territory.metaball.rendererCommitted

```ts
            logPipelineStage({
                channel: 'renderer',
                context: 'MetaballRenderer',
                stage: 'render_commit',
                from: 'MetaballSceneInput',
                to: 'Texture sprite + border graphics',
                purpose: 'Commit worker-solved territory presentation on the main thread',
                summary:
                    `${summarizeScene(sceneInput ?? {})} ` +
                    summarizeRendererMetrics(metrics),
                perfEventName: 'territory.metaball.rendererCommitted',
                detail: {
                    worldWidth,
                    worldHeight,
                    workerSolve: 1,
                    cellCount: readyResponse.cellCount,
                    staticSamples: readyResponse.staticSampleCount,
                    dynamicSamples: readyResponse.dynamicSampleCount,
                },
            });
```

### 58. logPipelineStage at pax-fluxia/src/lib/renderers/MetaballRenderer.ts:1991

- context: MetaballRenderer
- stage: render_deferred
- purpose: Defer expensive metaball solve to a worker so input and UI remain responsive
- perfEventName: none

```ts
        logPipelineStage({
            channel: 'renderer',
            context: 'MetaballRenderer',
            stage: 'render_deferred',
            from: 'MetaballSceneInput',
            to: 'Worker solve queue',
            purpose: 'Defer expensive metaball solve to a worker so input and UI remain responsive',
            summary:
                `${summarizeScene(sceneInput ?? {})} ` +
                summarizeRendererMetrics(metrics),
            detail: {
                worldWidth,
                worldHeight,
                activeRequestId: workerState.activeRequestId,
                queuedFingerprint: workerState.queuedRequest?.fingerprint ?? null,
            },
        });
```

### 59. logPipelineStage at pax-fluxia/src/lib/renderers/MetaballRenderer.ts:2407

- context: MetaballRenderer
- stage: render_commit
- purpose: Solve grid ownership field and upload visual presentation
- perfEventName: territory.metaball.rendererCommitted

```ts
    logPipelineStage({
        channel: 'renderer',
        context: 'MetaballRenderer',
        stage: 'render_commit',
        from: 'MetaballSceneInput',
        to: 'Texture sprite + border graphics',
        purpose: 'Solve grid ownership field and upload visual presentation',
        summary:
            `${summarizeScene(sceneInput ?? {})} ` +
            summarizeRendererMetrics(metrics),
        perfEventName: 'territory.metaball.rendererCommitted',
        detail: {
            worldWidth,
            worldHeight,
        },
    });
```

## pax-fluxia/src/lib/stores/gameStore.svelte.ts

### 60. logPipelineStage at pax-fluxia/src/lib/stores/gameStore.svelte.ts:302

- context: GameStore
- stage: schema_snapshot
- purpose: Publish UI-readable simulation state
- perfEventName: game.snapshot.publish

```ts
    logPipelineStage({
        context: 'GameStore',
        stage: 'schema_snapshot',
        from: 'GameRoomState',
        to: 'GameState',
        purpose: 'Publish UI-readable simulation state',
        summary:
            `${summarizeStars(stars)} ${summarizeConnections(connections)} ` +
            `players=${players.length} phase=${String(s.phase)}`,
        perfEventName: 'game.snapshot.publish',
        detail: {
            tick: s.tick,
            phase: s.phase,
            paused: s.isPaused,
            players: players.length,
        },
    });
```

### 61. logPipelineStage at pax-fluxia/src/lib/stores/gameStore.svelte.ts:394

- context: GameStore
- stage: not stated
- purpose: not stated
- perfEventName: none

```ts
        logPipelineStage({
            channel: 'input',
            context: 'GameStore',
            stage: params.stage,
            from: params.from,
            to: params.to,
            purpose: params.purpose,
            detail: {
                ...params.detail,
                publishMode: 'patched',
                patchedStars: uniqueStarIds,
            },
        });
```

### 62. logPipelineStage at pax-fluxia/src/lib/stores/gameStore.svelte.ts:423

- context: GameStore
- stage: not stated
- purpose: not stated
- perfEventName: none

```ts
    logPipelineStage({
        channel: 'input',
        context: 'GameStore',
        stage: params.stage,
        from: params.from,
        to: params.to,
        purpose: params.purpose,
        detail: {
            ...params.detail,
            publishMode: 'full',
            patchedStars: uniqueStarIds,
        },
    });
```

### 63. recordPerfEvent at pax-fluxia/src/lib/stores/gameStore.svelte.ts:594

- event: 'game.tick.completed'
- event name kind: literal

```ts
    recordPerfEvent('game.tick.completed', {
        tick: state.tick,
        totalMs: lastTickTotalMs,
        configMs: lastTickConfigMs,
        aiMs: lastTickAiMs,
        engineMs: lastTickEngineMs,
        eventPushMs: lastTickEventPushMs,
        historyMs: lastTickHistoryMs,
        snapshotMs: lastTickSnapshotMs,
        audioMs: lastTickAudioMs,
        statsMs: lastTickStatsMs,
        tickIntervalMs,
        overBudgetMs: lastTickOverBudgetMs,
        stars: lastTickStarCount,
        connections: lastTickConnectionCount,
        ...lastTickEventCounts,
    });
```

### 64. recordPerfEvent at pax-fluxia/src/lib/stores/gameStore.svelte.ts:612

- event: 'game.tick.overBudget'
- event name kind: literal

```ts
        recordPerfEvent('game.tick.overBudget', {
            tick: state.tick,
            totalMs: lastTickTotalMs,
            overBudgetMs: lastTickOverBudgetMs,
            tickIntervalMs,
            aiMs: lastTickAiMs,
            engineMs: lastTickEngineMs,
            snapshotMs: lastTickSnapshotMs,
        });
```

### 65. recordPerfEvent at pax-fluxia/src/lib/stores/gameStore.svelte.ts:842

- event: 'game.lanePolylineWorker.complete'
- event name kind: literal

```ts
        recordPerfEvent('game.lanePolylineWorker.complete', {
            requestId,
            sessionId: sessionAtDispatch,
            reason: params.reason,
            elapsedMs: result.elapsedMs,
            nodes: params.nodes.length,
            connections: params.connections.length,
            mode: params.mode,
            clearancePx: params.clearancePx,
        });
```

### 66. logPipelineStage at pax-fluxia/src/lib/stores/gameStore.svelte.ts:852

- context: GameStore
- stage: lane_polyline_worker_complete
- purpose: Hydrate authored lane paths without blocking the game start or config-change critical path
- perfEventName: none

```ts
        logPipelineStage({
            channel: 'worker',
            context: 'GameStore',
            stage: 'lane_polyline_worker_complete',
            from: 'Lane polyline worker',
            to: 'Runtime lane cache + snapshot',
            purpose:
                'Hydrate authored lane paths without blocking the game start or config-change critical path',
            summary:
                `reason=${params.reason} elapsedMs=${result.elapsedMs.toFixed(1)} ` +
                `nodes=${params.nodes.length} connections=${params.connections.length} ` +
                `mode=${params.mode}`,
        });
```

### 67. recordPerfEvent at pax-fluxia/src/lib/stores/gameStore.svelte.ts:869

- event: 'game.lanePolylineWorker.error'
- event name kind: literal

```ts
        recordPerfEvent('game.lanePolylineWorker.error', {
            requestId,
            sessionId: sessionAtDispatch,
            reason: params.reason,
            message: event.message,
        });
```

### 68. recordPerfEvent at pax-fluxia/src/lib/stores/gameStore.svelte.ts:886

- event: 'game.lanePolylineWorker.start'
- event name kind: literal

```ts
    recordPerfEvent('game.lanePolylineWorker.start', {
        requestId,
        sessionId: sessionAtDispatch,
        reason: params.reason,
        nodes: params.nodes.length,
        connections: params.connections.length,
        mode: params.mode,
        clearancePx: params.clearancePx,
    });
```

### 69. logPipelineStage at pax-fluxia/src/lib/stores/gameStore.svelte.ts:910

- context: GameStore
- stage: lane_cache_refresh
- purpose: Rebuild authored lane paths after configuration changes
- perfEventName: game.laneCache.refreshed

```ts
        logPipelineStage({
            context: 'GameStore',
            stage: 'lane_cache_refresh',
            from: 'Live lane settings + current runtime map',
            to: 'Lane polyline cache',
            purpose: 'Rebuild authored lane paths after configuration changes',
            summary:
                `nodes=${nodes.length} connections=${uni.length} ` +
                `mode=${String(GAME_CONFIG.MAPGEN_LANE_MODE ?? 'curved')}`,
            perfEventName: 'game.laneCache.refreshed',
            detail: {
                nodes,
                connections: uni,
                laneMode: GAME_CONFIG.MAPGEN_LANE_MODE ?? 'curved',
                laneMarginPx: laneDClearancePx(),
            },
        });
```

### 70. logPipelineStage at pax-fluxia/src/lib/stores/gameStore.svelte.ts:962

- context: GameStore
- stage: connection_rebuild
- purpose: Recompute connectivity and lane paths from current map layout
- perfEventName: game.connections.rebuilt

```ts
    logPipelineStage({
        context: 'GameStore',
        stage: 'connection_rebuild',
        from: 'Runtime star positions',
        to: 'Runtime connections + lane cache',
        purpose: 'Recompute connectivity and lane paths from current map layout',
        summary:
            `nodes=${nodes.length} connections=${uni.length} ` +
            `mode=${String(GAME_CONFIG.MAPGEN_LANE_MODE ?? 'curved')}`,
        perfEventName: 'game.connections.rebuilt',
        detail: {
            nodes,
            connections: uni,
            laneMode: GAME_CONFIG.MAPGEN_LANE_MODE ?? 'curved',
            laneMarginPx: laneDClearancePx(),
            minLinksPerStar: minL,
            maxLinksPerStar: maxL,
        },
    });
```

### 71. logPipelineStage at pax-fluxia/src/lib/stores/gameStore.svelte.ts:1087

- context: GameStore
- stage: map_preview
- purpose: Generate representative map preview payload
- perfEventName: game.mapPreview.generated

```ts
    logPipelineStage({
        context: 'GameStore',
        stage: 'map_preview',
        from: 'MainMenu settings',
        to: 'MainMenu preview canvas',
        purpose: 'Generate representative map preview payload',
        summary:
            `${summarizeStars(preview.stars)} ${summarizeConnections(preview.connections)}`,
        perfEventName: 'game.mapPreview.generated',
        detail: {
            width: mapW,
            height: mapH,
            playerCount: opts.playerCount,
            starsPerPlayer: opts.starsPerPlayer,
        },
    });
```

### 72. logPipelineStage at pax-fluxia/src/lib/stores/gameStore.svelte.ts:1134

- context: GameStore
- stage: map_generation
- purpose: Materialize new procedural match topology
- perfEventName: game.map.generated

```ts
    logPipelineStage({
        context: 'GameStore',
        stage: 'map_generation',
        from: '@pax/common.generateMap',
        to: 'GameStore.initStandardMap',
        purpose: 'Materialize new procedural match topology',
        summary:
            `positions=${result.positions.length} connections=${result.connections.length} ` +
            `world=${result.width}x${result.height}`,
        perfEventName: 'game.map.generated',
        detail: {
            width: result.width,
            height: result.height,
            hexRadius: result.hexRadius,
            paddingX: result.paddingX,
            paddingY: result.paddingY,
            playerCount: playerIds.length,
        },
        logDetail: {
            width: result.width,
            height: result.height,
            hexRadius: result.hexRadius,
            paddingX: result.paddingX,
            paddingY: result.paddingY,
            playerCount: playerIds.length,
            positions: result.positions,
            connections: result.connections,
        },
    });
```

### 73. logPipelineStage at pax-fluxia/src/lib/stores/gameStore.svelte.ts:1227

- context: GameStore
- stage: map_ownership_assignment
- purpose: Assign owners, ship counts, and star types before topology enters the live match
- perfEventName: game.map.ownershipAssigned

```ts
    logPipelineStage({
        context: 'GameStore',
        stage: 'map_ownership_assignment',
        from: 'Generated positions + shuffled owner pool',
        to: 'Runtime star ownership/state',
        purpose: 'Assign owners, ship counts, and star types before topology enters the live match',
        summary:
            `${summarizeStars(Array.from(state!.stars.values()))} ` +
            `ownerPool=${ownerIds.length} capitals=${hasCapital.size}`,
        perfEventName: 'game.map.ownershipAssigned',
        detail: {
            ownerIds,
            stars: Array.from(state!.stars.values()).map((star) => ({
                id: star.id,
                x: star.x,
                y: star.y,
                ownerId: star.ownerId,
                starType: star.starType,
                activeShips: star.activeShips,
                damagedShips: star.damagedShips,
            })),
        },
    });
```

### 74. logPipelineStage at pax-fluxia/src/lib/stores/gameStore.svelte.ts:1258

- context: GameStore
- stage: lane_cache_seed
- purpose: Seed authored lane geometry before territory and ship renderers consume the map
- perfEventName: game.laneCache.seeded

```ts
    logPipelineStage({
        context: 'GameStore',
        stage: 'lane_cache_seed',
        from: 'Map generation lane-aware connections',
        to: 'Lane polyline cache',
        purpose: 'Seed authored lane geometry before territory and ship renderers consume the map',
        summary:
            `${summarizeConnections(result.connections)} ` +
            `mode=${String(GAME_CONFIG.MAPGEN_LANE_MODE ?? 'curved')}`,
        perfEventName: 'game.laneCache.seeded',
        detail: {
            laneConnections: result.connections,
            laneMode: GAME_CONFIG.MAPGEN_LANE_MODE ?? 'curved',
            laneMarginPx: laneDClearancePx(),
        },
    });
```

### 75. logPipelineStage at pax-fluxia/src/lib/stores/gameStore.svelte.ts:1274

- context: GameStore
- stage: map_init
- purpose: Seed runtime stars, connections, and authored lane geometry
- perfEventName: game.map.runtimeInitialized

```ts
    logPipelineStage({
        context: 'GameStore',
        stage: 'map_init',
        from: 'Map generation output',
        to: 'GameRoomState + lane cache',
        purpose: 'Seed runtime stars, connections, and authored lane geometry',
        summary:
            `${summarizeStars(Array.from(state!.stars.values()))} ` +
            `${summarizeConnections(result.connections)}`,
        perfEventName: 'game.map.runtimeInitialized',
        detail: {
            stars: Array.from(state!.stars.values()).map((star) => ({
                id: star.id,
                x: star.x,
                y: star.y,
                ownerId: star.ownerId,
                starType: star.starType,
                activeShips: star.activeShips,
                damagedShips: star.damagedShips,
            })),
            laneConnections: result.connections,
        },
        perfDetail: {
            starCount: state!.stars.size,
            laneConnectionCount: result.connections.length,
        },
    });
```

### 76. logPipelineStage at pax-fluxia/src/lib/stores/gameStore.svelte.ts:1419

- context: GameStore
- stage: filesystem_map_merge
- purpose: Merge discovered filesystem maps into the local saved-map catalog
- perfEventName: game.maps.filesystemMerged

```ts
            logPipelineStage({
                context: 'GameStore',
                stage: 'filesystem_map_merge',
                from: '/__maps response',
                to: 'savedMaps cache',
                purpose: 'Merge discovered filesystem maps into the local saved-map catalog',
                summary: `added=${added} total=${savedMaps.length}`,
                perfEventName: 'game.maps.filesystemMerged',
                detail: {
                    discovered: fsMaps.map((map) => ({
                        name: map.metadata.name,
                        version: map.metadata.version,
                    })),
                },
            });
```

### 77. logPipelineStage at pax-fluxia/src/lib/stores/gameStore.svelte.ts:1456

- context: GameStore
- stage: builtin_map_merge
- purpose: Merge built-in authored maps into the local saved-map catalog
- perfEventName: game.maps.builtinMerged

```ts
            logPipelineStage({
                context: 'GameStore',
                stage: 'builtin_map_merge',
                from: '/maps catalog',
                to: 'savedMaps cache',
                purpose: 'Merge built-in authored maps into the local saved-map catalog',
                summary: `added=${added} total=${savedMaps.length}`,
                perfEventName: 'game.maps.builtinMerged',
                detail: {
                    discovered: builtins.map((map) => ({
                        name: map.metadata.name,
                        version: map.metadata.version,
                    })),
                },
            });
```

### 78. logPipelineStage at pax-fluxia/src/lib/stores/gameStore.svelte.ts:1660

- context: GameStore
- stage: map_export
- purpose: Serialize current match topology and ownership snapshot
- perfEventName: game.map.exported

```ts
    logPipelineStage({
        context: 'GameStore',
        stage: 'map_export',
        from: 'GameRoomState',
        to: 'MapDefinition',
        purpose: 'Serialize current match topology and ownership snapshot',
        summary:
            `${summarizeStars(stars)} ${summarizeConnections(connections)}`,
        perfEventName: 'game.map.exported',
        detail: {
            tick: state.tick,
            version: mapDefinition.metadata.version,
        },
    });
```

### 79. logPipelineStage at pax-fluxia/src/lib/stores/gameStore.svelte.ts:1731

- context: GameStore
- stage: map_queue
- purpose: Select next topology to load on start
- perfEventName: game.savedMap.queued

```ts
    logPipelineStage({
        context: 'GameStore',
        stage: 'map_queue',
        from: 'Saved map library',
        to: 'Pending saved map slot',
        purpose: 'Select next topology to load on start',
        summary:
            `${summarizeStars(map.stars)} ${summarizeConnections(map.connections)}`,
        perfEventName: 'game.savedMap.queued',
        detail: {
            name: map.metadata.name,
            version: map.metadata.version,
        },
    });
```

### 80. logPipelineStage at pax-fluxia/src/lib/stores/gameStore.svelte.ts:1786

- context: GameStore
- stage: saved_map_remap
- purpose: Resolve saved ownership IDs into current player slots
- perfEventName: game.savedMap.remapped

```ts
    logPipelineStage({
        context: 'GameStore',
        stage: 'saved_map_remap',
        from: 'MapDefinition factions',
        to: 'Runtime player identities',
        purpose: 'Resolve saved ownership IDs into current player slots',
        summary: summarizeSavedMapRemap({
            factions: Array.from(mapFactions),
            playerIds,
            remap: factionRemap,
            isMidGameSave,
        }),
        perfEventName: 'game.savedMap.remapped',
        detail: {
            factions: Array.from(mapFactions),
            playerIds,
            remap: Object.fromEntries(factionRemap.entries()),
        },
    });
```

### 81. logPipelineStage at pax-fluxia/src/lib/stores/gameStore.svelte.ts:1918

- context: GameStore
- stage: saved_map_init
- purpose: Restore authored map topology into runtime state
- perfEventName: game.savedMap.runtimeInitialized

```ts
    logPipelineStage({
        context: 'GameStore',
        stage: 'saved_map_init',
        from: 'MapDefinition',
        to: 'GameRoomState + lane cache',
        purpose: 'Restore authored map topology into runtime state',
        summary:
            `${summarizeStars(Array.from(state!.stars.values()))} ` +
            `${summarizeConnections(map.connections)}`,
        perfEventName: 'game.savedMap.runtimeInitialized',
        detail: {
            name: map.metadata.name,
            version: map.metadata.version,
        },
    });
```

### 82. logPipelineStage at pax-fluxia/src/lib/stores/gameStore.svelte.ts:1965

- context: GameStore
- stage: player_init
- purpose: Instantiate runtime player roster and palette
- perfEventName: game.players.initialized

```ts
    logPipelineStage({
        context: 'GameStore',
        stage: 'player_init',
        from: 'Menu settings',
        to: 'GameRoomState.players',
        purpose: 'Instantiate runtime player roster and palette',
        summary: `players=${playerIds.length} ai=${Math.max(0, playerIds.length - 1)}`,
        perfEventName: 'game.players.initialized',
        detail: {
            playerIds,
        },
    });
```

### 83. logPipelineStage at pax-fluxia/src/lib/stores/gameStore.svelte.ts:1990

- context: GameStore
- stage: default_map_autoload
- purpose: Start the match from the preferred authored map
- perfEventName: game.maps.defaultAutoloaded

```ts
                logPipelineStage({
                    context: 'GameStore',
                    stage: 'default_map_autoload',
                    from: 'Default map preference',
                    to: 'Saved map initialization',
                    purpose: 'Start the match from the preferred authored map',
                    summary: summarizeMapDefinition(defaultMap),
                    perfEventName: 'game.maps.defaultAutoloaded',
                });
```

### 84. logPipelineStage at pax-fluxia/src/lib/stores/gameStore.svelte.ts:2018

- context: GameStore
- stage: normalize_unowned
- purpose: Repair unowned stars so ownership, geometry, and rendering remain valid
- perfEventName: game.state.unownedNormalized

```ts
        logPipelineStage({
            channel: 'state',
            context: 'GameStore',
            stage: 'normalize_unowned',
            from: 'Imported star ownership',
            to: 'Neutral-owned runtime stars',
            purpose: 'Repair unowned stars so ownership, geometry, and rendering remain valid',
            summary: `normalized=${normalizedUnownedCount}`,
            perfEventName: 'game.state.unownedNormalized',
            detail: {
                normalizedUnownedCount,
            },
        });
```

### 85. logPipelineStage at pax-fluxia/src/lib/stores/gameStore.svelte.ts:2051

- context: GameStore
- stage: state_init
- purpose: Finalize runtime state before first lobby frame
- perfEventName: game.state.initialized

```ts
    logPipelineStage({
        context: 'GameStore',
        stage: 'state_init',
        from: 'GameRoomState setup',
        to: 'Paused lobby-ready match state',
        purpose: 'Finalize runtime state before first lobby frame',
        summary:
            `${summarizeStars(Array.from(state!.stars.values()))} ` +
            `${summarizeConnections(Array.from(state!.connections))}`,
        perfEventName: 'game.state.initialized',
        detail: {
            players: state!.players.size,
            tick: state!.tick,
        },
    });
```

### 86. recordPerfEvent at pax-fluxia/src/lib/stores/gameStore.svelte.ts:2119

- event: 'game.startGame.requested'
- event name kind: literal

```ts
    recordPerfEvent('game.startGame.requested');
```

### 87. logPipelineStage at pax-fluxia/src/lib/stores/gameStore.svelte.ts:2121

- context: GameStore
- stage: start_request
- purpose: Transition into a fresh playable match state
- perfEventName: game.startGame.pipelineStarted

```ts
        logPipelineStage({
            context: 'GameStore',
            stage: 'start_request',
            from: 'Menu or benchmark command',
            to: 'Game initialization pipeline',
            purpose: 'Transition into a fresh playable match state',
            perfEventName: 'game.startGame.pipelineStarted',
            detail: {
                currentView,
                hasStarted,
            },
        });
```

### 88. logPipelineStage at pax-fluxia/src/lib/stores/gameStore.svelte.ts:2147

- context: GameStore
- stage: start_complete
- purpose: Expose initialized match to the UI
- perfEventName: game.startGame.completed

```ts
        logPipelineStage({
            context: 'GameStore',
            stage: 'start_complete',
            from: 'Game initialization pipeline',
            to: 'GameContainer lobby view',
            purpose: 'Expose initialized match to the UI',
            summary:
                `${summarizeStars(snapshot?.stars ?? [])} ` +
                `${summarizeConnections(snapshot?.connections ?? [])}`,
            perfEventName: 'game.startGame.completed',
            detail: {
                currentView,
                hasStarted,
            },
        });
```

### 89. logPipelineStage at pax-fluxia/src/lib/stores/gameStore.svelte.ts:2289

- context: GameStore
- stage: issue_order
- purpose: Push a live player order into the engine and refresh UI immediately
- perfEventName: game.order.issued

```ts
    logPipelineStage({
        channel: 'input',
        context: 'GameStore',
        stage: 'issue_order',
        from: `Star ${sourceId}`,
        to: `Star ${targetId}`,
        purpose: 'Push a live player order into the engine and refresh UI immediately',
        perfEventName: 'game.order.issued',
        detail: {
            persistAfterConquest: Boolean(persistAfterConquest),
            localPlayerId: HUMAN_PLAYER_ID,
            accepted,
            publishMode: publishResult.mode,
        },
    });
```

### 90. logPipelineStage at pax-fluxia/src/lib/stores/gameStore.svelte.ts:2338

- context: GameStore
- stage: cancel_order
- purpose: Remove a live player order and refresh UI immediately
- perfEventName: game.order.cancelled

```ts
    logPipelineStage({
        channel: 'input',
        context: 'GameStore',
        stage: 'cancel_order',
        from: `Star ${starId}`,
        to: 'Engine order queue',
        purpose: 'Remove a live player order and refresh UI immediately',
        perfEventName: 'game.order.cancelled',
        detail: {
            localPlayerId: HUMAN_PLAYER_ID,
            accepted,
            publishMode: publishResult.mode,
        },
    });
```

### 91. logPipelineStage at pax-fluxia/src/lib/stores/gameStore.svelte.ts:2387

- context: GameStore
- stage: deferred_order
- purpose: Queue a conquest-follow-up order and refresh the local deferred-order preview immediately
- perfEventName: game.order.deferred

```ts
    logPipelineStage({
        channel: 'input',
        context: 'GameStore',
        stage: 'deferred_order',
        from: `Star ${enemyStarId}`,
        to: `Star ${nextTargetId}`,
        purpose: 'Queue a conquest-follow-up order and refresh the local deferred-order preview immediately',
        perfEventName: 'game.order.deferred',
        detail: {
            localPlayerId: HUMAN_PLAYER_ID,
            accepted,
            publishMode: publishResult.mode,
        },
    });
```

## pax-fluxia/src/lib/territory/families/buildFamilyGeometry.ts

### 92. logPipelineStage at pax-fluxia/src/lib/territory/families/buildFamilyGeometry.ts:38

- context: RenderFamilyGeometry
- stage: ownership_snapshot
- purpose: Normalize owner assignments for geometry and scene builders
- perfEventName: territory.ownership.snapshotBuilt

```ts
    logPipelineStage({
        channel: 'state',
        context: 'RenderFamilyGeometry',
        stage: 'ownership_snapshot',
        from: 'Live stars',
        to: 'OwnershipSnapshot',
        purpose: 'Normalize owner assignments for geometry and scene builders',
        summary: `${summarizeStars(stars)} ${summarizeOwnership(snapshot)}`,
        perfEventName: 'territory.ownership.snapshotBuilt',
        perfDetail: {
            starCount: stars.length,
            ownedStarCount: snapshot.starOwners.size,
        },
        logDetail: {
            stars,
            starOwners: Object.fromEntries(snapshot.starOwners.entries()),
            contestedLaneIds: snapshot.contestedLaneIds,
            conquestEvents: snapshot.conquestEvents,
            virtualStars: snapshot.virtualStars,
        },
    });
```

### 93. logPipelineStage at pax-fluxia/src/lib/territory/families/buildFamilyGeometry.ts:87

- context: RenderFamilyGeometry
- stage: vector_geometry
- purpose: Build render-family geometry for vector-driven territory families
- perfEventName: territory.geometry.vectorBuilt

```ts
    logPipelineStage({
        channel: 'renderer',
        context: 'RenderFamilyGeometry',
        stage: 'vector_geometry',
        from: 'Ownership snapshot + live topology',
        to: 'ResolvedGeometrySnapshot',
        purpose: 'Build render-family geometry for vector-driven territory families',
        summary:
            `${summarizeStars(params.stars)} ${summarizeConnections(params.lanes)} ` +
            summarizeGeometry(geometry),
        perfEventName: 'territory.geometry.vectorBuilt',
        perfDetail: {
            starCount: params.stars.length,
            laneCount: params.lanes.length,
            regionCount: geometry.territoryRegions.length,
            frontierCount: geometry.frontierPolylines.length,
            shellLoopCount: geometry.shellLoops.length,
        },
        logDetail: {
            stars: params.stars,
            lanes: params.lanes,
            ownership:
                params.ownership == null
                    ? null
                    : {
                          version: params.ownership.version,
                          starOwners: Object.fromEntries(
                              params.ownership.starOwners.entries(),
                          ),
                          contestedLaneIds: params.ownership.contestedLaneIds,
                          conquestEvents: params.ownership.conquestEvents,
                          virtualStars: params.ownership.virtualStars,
                      },
            geometry,
        },
    });
```

### 94. logPipelineStage at pax-fluxia/src/lib/territory/families/buildFamilyGeometry.ts:229

- context: RenderFamilyGeometry
- stage: perimeter_geometry_authority
- purpose: Resolve one shared-boundary geometry seam for all 0319 live consumers
- perfEventName: territory.geometry.perimeterBuilt

```ts
        logPipelineStage({
            channel: 'renderer',
            context: 'RenderFamilyGeometry',
            stage: 'perimeter_geometry_authority',
            from: 'Geometry_0319 raw shared frontiers/world borders',
            to: 'ResolvedGeometrySnapshot',
            purpose: 'Resolve one shared-boundary geometry seam for all 0319 live consumers',
            summary:
                `${summarizeStars(params.stars)} ${summarizeConnections(params.lanes)} ` +
                summarizeGeometry(adapted),
            perfEventName: 'territory.geometry.perimeterBuilt',
            detail: {
                geometrySource,
                requestedGeometrySource,
                authorityStage:
                    adapted.diagnostics.stageLadder?.authoritativeSeamFingerprint ??
                    null,
                displayStage:
                    adapted.diagnostics.stageLadder?.displayBorderFingerprint ??
                    null,
            },
        });
```

### 95. logPipelineStage at pax-fluxia/src/lib/territory/families/buildFamilyGeometry.ts:266

- context: RenderFamilyGeometry
- stage: perimeter_geometry_fallback
- purpose: Fallback perimeter-field geometry compilation path
- perfEventName: territory.geometry.perimeterFallbackBuilt

```ts
    logPipelineStage({
        channel: 'renderer',
        context: 'RenderFamilyGeometry',
        stage: 'perimeter_geometry_fallback',
        from: 'Live topology',
        to: 'ResolvedGeometrySnapshot',
        purpose: 'Fallback perimeter-field geometry compilation path',
        summary:
            `${summarizeStars(params.stars)} ${summarizeConnections(params.lanes)} ` +
            summarizeGeometry(geometry),
        perfEventName: 'territory.geometry.perimeterFallbackBuilt',
        detail: {
            geometrySource,
            requestedGeometrySource,
        },
    });
```

## pax-fluxia/src/lib/territory/families/buildRenderFamilyInput.ts

### 96. logPipelineStage at pax-fluxia/src/lib/territory/families/buildRenderFamilyInput.ts:92

- context: RenderFamilyInput
- stage: family_input
- purpose: Freeze stars, lanes, ownership, geometry, and tunables into a single family update payload
- perfEventName: territory.renderFamily.inputBuilt

```ts
    logPipelineStage({
        channel: 'renderer',
        context: 'RenderFamilyInput',
        stage: 'family_input',
        from: 'GameCanvas frame state',
        to: 'Render-family contract',
        purpose: 'Freeze stars, lanes, ownership, geometry, and tunables into a single family update payload',
        summary:
            `${summarizeStars(input.stars)} ${summarizeConnections(input.lanes)} ` +
            `${input.ownership ? summarizeOwnership(input.ownership) : 'ownership=null'} ` +
            `${summarizeGeometry(input.geometry)} prev=${summarizeGeometry(input.prevGeometry ?? null)} ` +
            `${summarizeTunables(tunables)}`,
        perfEventName: 'territory.renderFamily.inputBuilt',
        detail: {
            nowMs: input.nowMs,
            paused: input.paused,
            gameTick: input.gameTick ?? null,
            activeTransitionEvents: input.activeTransition?.events.length ?? 0,
            transitionSessions: input.transitionSessions?.length ?? 0,
        },
        logDetail: {
            nowMs: input.nowMs,
            paused: input.paused,
            gameTick: input.gameTick ?? null,
            world: input.world,
            stars: input.stars,
            lanes: input.lanes,
            ownership: input.ownership,
            geometry: input.geometry,
            prevGeometry: input.prevGeometry,
            tunables: Object.fromEntries(tunables.entries()),
            configSource: input.configSource,
            renderer: input.renderer,
            activeTransition: input.activeTransition,
            transitionSessions: input.transitionSessions,
        },
    });
```

## pax-fluxia/src/lib/territory/families/metaball/buildMetaballScene.ts

### 97. logPipelineStage at pax-fluxia/src/lib/territory/families/metaball/buildMetaballScene.ts:87

- context: MetaballScene
- stage: static_scene
- purpose: Freeze stable owned-star and corridor sample field
- perfEventName: territory.metaball.staticSceneBuilt

```ts
    logPipelineStage({
        channel: 'renderer',
        context: 'MetaballScene',
        stage: 'static_scene',
        from: 'Metaball base context',
        to: 'Cached static scene',
        purpose: 'Freeze stable owned-star and corridor sample field',
        summary: summarizeScene({
            staticSamples: staticScene.staticSamples,
            dynamicSamples: [],
            samples: staticScene.staticSamples,
            sceneFingerprint: staticScene.staticFingerprint,
            ownedStars: staticScene.baseContext.ownedStars,
            clusterShips: staticScene.baseContext.clusterShips,
        }),
        perfEventName: 'territory.metaball.staticSceneBuilt',
        perfDetail: {
            staticSampleCount: staticScene.staticSamples.length,
            ownedStarCount: staticScene.baseContext.ownedStars.length,
            clusterCount: staticScene.baseContext.clusterMap.size,
        },
        logDetail: {
            baseContext: staticScene.baseContext,
            staticSamples: staticScene.staticSamples,
            staticFingerprint: staticScene.staticFingerprint,
        },
    });
```

### 98. logPipelineStage at pax-fluxia/src/lib/territory/families/metaball/buildMetaballScene.ts:176

- context: MetaballScene
- stage: scene_build
- purpose: Assemble renderer-ready sample field for metaball grid solve
- perfEventName: territory.metaball.sceneBuilt

```ts
    logPipelineStage({
        channel: 'renderer',
        context: 'MetaballScene',
        stage: 'scene_build',
        from: 'Static scene + transition deltas',
        to: 'MetaballSceneInput',
        purpose: 'Assemble renderer-ready sample field for metaball grid solve',
        summary: summarizeScene(sceneInput),
        perfEventName: 'territory.metaball.sceneBuilt',
        perfDetail: {
            staticSampleCount: sceneInput.staticSamples.length,
            dynamicSampleCount: sceneInput.dynamicSamples.length,
            sampleCount: sceneInput.samples.length,
        },
        logDetail: {
            staticFingerprint: sceneInput.staticFingerprint,
            dynamicFingerprint: sceneInput.dynamicFingerprint,
            sceneFingerprint: sceneInput.sceneFingerprint,
            ownedStars: sceneInput.ownedStars,
            clusterMap: Object.fromEntries(
                [...sceneInput.clusterMap.entries()].map(([starId, cluster]) => [
                    starId,
                    cluster,
                ]),
            ),
            playerColors: sceneInput.playerColors,
            clusterShips: sceneInput.clusterShips,
            staticSamples: sceneInput.staticSamples,
            dynamicSamples: sceneInput.dynamicSamples,
            samples: sceneInput.samples,
        },
    });
```

## pax-fluxia/src/lib/territory/families/metaball/MetaballFamily.ts

### 99. logPipelineStage at pax-fluxia/src/lib/territory/families/metaball/MetaballFamily.ts:154

- context: MetaballFamily
- stage: family_scene
- purpose: Hand off stable and dynamic sample fields to the grid renderer
- perfEventName: territory.metaball.familySceneReady

```ts
            logPipelineStage({
                channel: 'renderer',
                context: 'MetaballFamily',
                stage: 'family_scene',
                from: 'RenderFamilyInput',
                to: 'MetaballSceneInput',
                purpose: 'Hand off stable and dynamic sample fields to the grid renderer',
                summary: summarizeScene(sceneInput),
                perfEventName: 'territory.metaball.familySceneReady',
                perfDetail: {
                    staticSceneCacheHit,
                    conquestCacheEntries: this.conquestCache.size,
                    staticSceneKeyLength: staticSceneKey.length,
                },
                logDetail: {
                    renderInput: {
                        world: input.world,
                        gameTick: input.gameTick,
                        nowMs: input.nowMs,
                        paused: input.paused,
                        activeTransition: input.activeTransition,
                        ownershipVersion: input.ownership?.version ?? null,
                        geometryVersion: input.geometry?.version ?? null,
                    },
                    staticSceneCacheHit,
                    staticSceneKey,
                    conquestCacheKeys: [...this.conquestCache.keys()],
                    sceneInput,
                },
            });
```

### 100. logPipelineStage at pax-fluxia/src/lib/territory/families/metaball/MetaballFamily.ts:207

- context: MetaballFamily
- stage: family_render
- purpose: Upload metaball texture and borders for presentation
- perfEventName: territory.metaball.familyRendered

```ts
            logPipelineStage({
                channel: 'renderer',
                context: 'MetaballFamily',
                stage: 'family_render',
                from: 'MetaballSceneInput',
                to: 'PIXI display root',
                purpose: 'Upload metaball texture and borders for presentation',
                summary: summarizeRendererMetrics(renderMetrics),
                perfEventName: 'territory.metaball.familyRendered',
                perfDetail: {
                    sceneFingerprint: sceneInput.sceneFingerprint,
                    staticSceneCacheHit,
                },
                logDetail: {
                    sceneFingerprint: sceneInput.sceneFingerprint,
                    staticSceneCacheHit,
                    renderMetrics,
                },
            });
```

## pax-fluxia/src/lib/territory/families/metaball/metaballSceneBase.ts

### 101. logPipelineStage at pax-fluxia/src/lib/territory/families/metaball/metaballSceneBase.ts:430

- context: MetaballSceneBase
- stage: base_context
- purpose: Build stable owner clusters, strengths, palette, and influence samples for metaball scenes
- perfEventName: territory.metaball.baseContextBuilt

```ts
    logPipelineStage({
        channel: 'renderer',
        context: 'MetaballSceneBase',
        stage: 'base_context',
        from: 'Stars + lanes + overrides',
        to: 'Clustered metaball sample field',
        purpose: 'Build stable owner clusters, strengths, palette, and influence samples for metaball scenes',
        summary:
            `${summarizeStars(input.stars)} ${summarizeConnections(input.lanes)} ` +
            summarizeMetaballBaseContext(context),
        perfEventName: 'territory.metaball.baseContextBuilt',
        perfDetail: {
            actualStars: actualStars.length,
            effectiveStars: effectiveStars.length,
            ownedStars: ownedStars.length,
            overrides: overrides?.size ?? 0,
        },
        logDetail: {
            stars: input.stars,
            lanes: input.lanes,
            actualStars,
            effectiveStars,
            ownedStars,
            overrides: Object.fromEntries(overrides?.entries() ?? []),
            clusterMap: Object.fromEntries(context.clusterMap.entries()),
            starStrengthById: Object.fromEntries(
                context.starStrengthById.entries(),
            ),
            playerColors: context.playerColors,
            clusterShips: context.clusterShips,
            samples: context.samples,
        },
    });
```

## pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridPhaseEdgesFamily.ts

### 102. recordPerfEvent at pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridPhaseEdgesFamily.ts:3022

- event: 'territory.phaseEdges.capturedSessionPlanRebuild'
- event name kind: literal

```ts
                    recordPerfEvent('territory.phaseEdges.capturedSessionPlanRebuild', {
                        sessionKey: session.sessionKey,
                        cause: sessionPlan ? 'plan_key_changed' : 'cache_miss',
                        planKey: sessionPlanKey,
                        eventCount: session.events.length,
                    });
```

## pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts

### 103. logPipelineStage at pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts:99

- context: PerimeterFieldScene
- stage: scene_build
- purpose: Assemble shared renderer scene for perimeter-field mode
- perfEventName: territory.perimeterField.sceneBuilt

```ts
    logPipelineStage({
        channel: 'renderer',
        context: 'PerimeterFieldScene',
        stage: 'scene_build',
        from: 'Perimeter samples + transition state',
        to: 'MetaballSceneInput',
        purpose: 'Assemble shared renderer scene for perimeter-field mode',
        summary: summarizeScene(builtScene.sceneInput),
        perfEventName: 'territory.perimeterField.sceneBuilt',
        detail,
    });
```

### 104. logPipelineStage at pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts:471

- context: PerimeterFieldScene
- stage: source_cache_hit
- purpose: Reuse stable perimeter sampling output when geometry and tunables are unchanged
- perfEventName: territory.perimeterField.sourceCacheHit

```ts
        logPipelineStage({
            channel: 'renderer',
            context: 'PerimeterFieldScene',
            stage: 'source_cache_hit',
            from: 'Geometry + perimeter sampling tunables',
            to: 'Cached perimeter source samples',
            purpose: 'Reuse stable perimeter sampling output when geometry and tunables are unchanged',
            summary: summarizePerimeterSourceData(cached),
            perfEventName: 'territory.perimeterField.sourceCacheHit',
            detail: {
                cacheKey,
                geometryVersion: params.geometry.version,
                debugState: params.debugState,
            },
            logDetail: {
                cacheKey,
                geometry: params.geometry,
                ownerToCluster: Object.fromEntries(params.ownerToCluster.entries()),
                spacing: params.spacing,
                offsetPx: params.offsetPx,
                strength: params.strength,
                debugState: params.debugState,
                cachedSources: cached.sources,
                cachedSampleSets: cached.sampleSets,
                cachedFlattenedSamples: cached.flattenedSamples,
            },
        });
```

### 105. logPipelineStage at pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts:517

- context: PerimeterFieldScene
- stage: source_cache_miss
- purpose: Sample perimeter-field region loops into reusable source sets for scene construction
- perfEventName: territory.perimeterField.sourceCacheMiss

```ts
    logPipelineStage({
        channel: 'renderer',
        context: 'PerimeterFieldScene',
        stage: 'source_cache_miss',
        from: 'Geometry + perimeter sampling tunables',
        to: 'New perimeter source samples',
        purpose: 'Sample perimeter-field region loops into reusable source sets for scene construction',
        summary: summarizePerimeterSourceData(built),
        perfEventName: 'territory.perimeterField.sourceCacheMiss',
        detail: {
            cacheKey,
            geometryVersion: params.geometry.version,
            debugState: params.debugState,
        },
        logDetail: {
            cacheKey,
            geometry: params.geometry,
            ownerToCluster: Object.fromEntries(params.ownerToCluster.entries()),
            spacing: params.spacing,
            offsetPx: params.offsetPx,
            strength: params.strength,
            debugState: params.debugState,
            sources,
            sampleSets,
            flattenedSamples: built.flattenedSamples,
        },
    });
```

### 106. logPipelineStage at pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts:798

- context: PerimeterFieldScene
- stage: plan_scene_input
- purpose: Assemble plan-engine V-set inputs before shared renderer scene construction
- perfEventName: territory.perimeterField.planSceneInputBuilt

```ts
    logPipelineStage({
        channel: 'renderer',
        context: 'PerimeterFieldScene',
        stage: 'plan_scene_input',
        from: 'Geometry + transition plan',
        to: 'Perimeter plan-scene sampling',
        purpose: 'Assemble plan-engine V-set inputs before shared renderer scene construction',
        summary:
            `${summarizePerimeterVSet(currentVs)} ` +
            summarizeTransitionPlan(params.transitionPlan ?? {}),
        perfEventName: 'territory.perimeterField.planSceneInputBuilt',
        detail: {
            geometryVersion: params.geometry.version,
            hasTransitionPlan: Boolean(params.transitionPlan),
            freezeBase: params.freezeBase,
            geometrySource: params.geometrySource,
        },
        logDetail: {
            geometry: params.geometry,
            geometrySource: params.geometrySource,
            freezeBase: params.freezeBase,
            transitionPlan: params.transitionPlan,
            currentVs,
            clusterScene: {
                ownedStars: clusterScene.ownedStars,
                clusterMap: Object.fromEntries(clusterScene.clusterMap.entries()),
                ownerToCluster: Object.fromEntries(clusterScene.ownerToCluster.entries()),
                playerColors: clusterScene.playerColors,
                clusterShips: clusterScene.clusterShips,
            },
        },
    });
```

## pax-fluxia/src/lib/territory/families/perimeterField/PerimeterFieldFamily.ts

### 107. logPipelineStage at pax-fluxia/src/lib/territory/families/perimeterField/PerimeterFieldFamily.ts:224

- context: PerimeterFieldFamily
- stage: geometry_input
- purpose: Receive current territory geometry for sample-field planning
- perfEventName: territory.perimeterField.geometryReceived

```ts
            logPipelineStage({
                channel: 'renderer',
                context: 'PerimeterFieldFamily',
                stage: 'geometry_input',
                from: 'RenderFamilyInput.geometry',
                to: 'PerimeterField family pipeline',
                purpose: 'Receive current territory geometry for sample-field planning',
                summary: summarizeGeometry(currentGeometry),
                perfEventName: 'territory.perimeterField.geometryReceived',
                logDetail: {
                    geometry: currentGeometry,
                },
            });
```

### 108. logPipelineStage at pax-fluxia/src/lib/territory/families/perimeterField/PerimeterFieldFamily.ts:343

- context: PerimeterFieldFamily
- stage: family_scene
- purpose: Translate perimeter samples into renderer-ready influence fields
- perfEventName: territory.perimeterField.familySceneReady

```ts
            logPipelineStage({
                channel: 'renderer',
                context: 'PerimeterFieldFamily',
                stage: 'family_scene',
                from: 'Geometry + transition plan',
                to: 'MetaballSceneInput',
                purpose: 'Translate perimeter samples into renderer-ready influence fields',
                summary: summarizeScene(builtScene.sceneInput),
                perfEventName: 'territory.perimeterField.familySceneReady',
                perfDetail: {
                    displayStars: displayStars.length,
                    oldGeometryCacheHit,
                    transitionPlanCacheHit,
                    geometrySource,
                    transitionEngine,
                },
                logDetail: {
                    renderInput: {
                        world: input.world,
                        gameTick: input.gameTick,
                        nowMs: input.nowMs,
                        paused: input.paused,
                        activeTransition: input.activeTransition,
                        ownershipVersion: input.ownership?.version ?? null,
                        geometryVersion: currentGeometry.version,
                        geometrySource,
                        transitionEngine,
                    },
                    oldGeometryCacheHit,
                    transitionPlanCacheHit,
                    oldGeometry: this.oldGeometry,
                    transitionPlan: this.transitionPlan,
                    displayStars,
                    debugSnapshot: builtScene.debug,
                    sceneInput: builtScene.sceneInput,
                },
            });
```

### 109. logPipelineStage at pax-fluxia/src/lib/territory/families/perimeterField/PerimeterFieldFamily.ts:404

- context: PerimeterFieldFamily
- stage: family_render
- purpose: Render perimeter-field sample solve through the shared metaball substrate
- perfEventName: territory.perimeterField.familyRendered

```ts
            logPipelineStage({
                channel: 'renderer',
                context: 'PerimeterFieldFamily',
                stage: 'family_render',
                from: 'MetaballSceneInput',
                to: 'PIXI display root',
                purpose: 'Render perimeter-field sample solve through the shared metaball substrate',
                summary: summarizeRendererMetrics(renderMetrics),
                perfEventName: 'territory.perimeterField.familyRendered',
                perfDetail: {
                    geometrySource,
                    transitionEngine,
                    oldGeometryCacheHit,
                    transitionPlanCacheHit,
                },
                logDetail: {
                    geometrySource,
                    transitionEngine,
                    oldGeometryCacheHit,
                    transitionPlanCacheHit,
                    renderMetrics,
                    sceneFingerprint: builtScene.sceneInput.sceneFingerprint,
                },
            });
```

## pax-fluxia/src/lib/territory/families/perimeterField/perimeterFieldPlanEngine.ts

### 110. logPipelineStage at pax-fluxia/src/lib/territory/families/perimeterField/perimeterFieldPlanEngine.ts:288

- context: PerimeterFieldPlanEngine
- stage: vset_cache_hit
- purpose: Reuse perimeter-field sample points without resampling unchanged topology
- perfEventName: territory.perimeterField.vsetCacheHit

```ts
        logPipelineStage({
            channel: 'renderer',
            context: 'PerimeterFieldPlanEngine',
            stage: 'vset_cache_hit',
            from: 'Geometry + sampling options',
            to: 'Cached perimeter V-set',
            purpose: 'Reuse perimeter-field sample points without resampling unchanged topology',
            summary: summarizePerimeterVSet(cached as readonly PerimeterV[]),
            perfEventName: 'territory.perimeterField.vsetCacheHit',
            detail: {
                cacheKey,
                geometryVersion: params.geometry.version,
            },
            logDetail: {
                cacheKey,
                geometry: params.geometry,
                options: {
                    spacing: params.options.spacing,
                    offsetPx: params.options.offsetPx,
                    strength: params.options.strength,
                    ownerToCluster: Object.fromEntries(
                        params.options.ownerToCluster.entries(),
                    ),
                },
                cachedVSet: cached,
            },
        });
```

### 111. logPipelineStage at pax-fluxia/src/lib/territory/families/perimeterField/perimeterFieldPlanEngine.ts:386

- context: PerimeterFieldPlanEngine
- stage: vset_cache_miss
- purpose: Sample perimeter-field frontier loops into cached V points for rendering and transition planning
- perfEventName: territory.perimeterField.vsetCacheMiss

```ts
    logPipelineStage({
        channel: 'renderer',
        context: 'PerimeterFieldPlanEngine',
        stage: 'vset_cache_miss',
        from: 'Geometry + sampling options',
        to: 'New perimeter V-set',
        purpose: 'Sample perimeter-field frontier loops into cached V points for rendering and transition planning',
        summary: summarizePerimeterVSet(vs),
        perfEventName: 'territory.perimeterField.vsetCacheMiss',
        detail: {
            cacheKey,
            geometryVersion: geometry.version,
            topologySections: topology.sections.size,
            topologyLoops: topology.loops.length,
        },
        logDetail: {
            cacheKey,
            geometry,
            options: {
                spacing: options.spacing,
                offsetPx: options.offsetPx,
                strength: options.strength,
                ownerToCluster: Object.fromEntries(options.ownerToCluster.entries()),
            },
            sampledVSet: vs,
        },
    });
```

### 112. logPipelineStage at pax-fluxia/src/lib/territory/families/perimeterField/perimeterFieldPlanEngine.ts:1051

- context: PerimeterFieldPlanEngine
- stage: transition_plan
- purpose: Match preserved sections and build movers, appearing, and disappearing boundary samples
- perfEventName: territory.perimeterField.transitionPlanBuilt

```ts
    logPipelineStage({
        channel: 'renderer',
        context: 'PerimeterFieldPlanEngine',
        stage: 'transition_plan',
        from: 'Previous + next perimeter V-sets',
        to: 'Perimeter transition plan',
        purpose: 'Match preserved sections and build movers, appearing, and disappearing boundary samples',
        summary:
            `${summarizePerimeterVSet(params.prevVSet)} ` +
            `${summarizePerimeterVSet(params.nextVSet)} ` +
            summarizeTransitionPlan(plan),
        perfEventName: 'territory.perimeterField.transitionPlanBuilt',
        detail: {
            conquestKey: params.conquestKey,
            prevGeometryVersion: params.prevGeometry.version,
            nextGeometryVersion: params.nextGeometry.version,
        },
    });
```

## pax-fluxia/src/lib/territory/layers/geometry/compiler_UnifiedVectorGeometry.ts

### 113. logPipelineStage at pax-fluxia/src/lib/territory/layers/geometry/compiler_UnifiedVectorGeometry.ts:113

- context: UnifiedVectorGeometry
- stage: compile_input
- purpose: Accept gameplay topology and ownership as the resolved geometry build request
- perfEventName: territory.geometry.compileInput

```ts
    logPipelineStage({
        channel: 'renderer',
        context: 'UnifiedVectorGeometry',
        stage: 'compile_input',
        from: 'Ownership + live topology',
        to: 'Vector geometry compiler',
        purpose: 'Accept gameplay topology and ownership as the resolved geometry build request',
        summary:
            `${summarizeStars(input.stars)} ${summarizeConnections(input.lanes)} ` +
            summarizeOwnership(input.ownership),
        perfEventName: 'territory.geometry.compileInput',
        perfDetail: {
            worldWidth: input.world.width,
            worldHeight: input.world.height,
            styleMode: input.styleMode,
        },
        logDetail: {
            world: input.world,
            styleMode: input.styleMode,
            tunables: serializeTunables(input.tunables),
            stars: input.stars,
            lanes: input.lanes,
            ownership: {
                version: input.ownership.version,
                starOwners: Object.fromEntries(
                    input.ownership.starOwners?.entries() ?? [],
                ),
                contestedLaneIds: input.ownership.contestedLaneIds ?? [],
                conquestEvents: input.ownership.conquestEvents ?? [],
                virtualStars: input.ownership.virtualStars ?? [],
            },
        },
    });
```

### 114. logPipelineStage at pax-fluxia/src/lib/territory/layers/geometry/compiler_UnifiedVectorGeometry.ts:169

- context: UnifiedVectorGeometry
- stage: generator_output
- purpose: Capture the direct geometry compiler output before resolved adaptation
- perfEventName: territory.geometry.generatorOutput

```ts
    logPipelineStage({
        channel: 'renderer',
        context: 'UnifiedVectorGeometry',
        stage: 'generator_output',
        from: 'Power-Voronoi geometry generator',
        to: 'Raw territory geometry',
        purpose: 'Capture the direct geometry compiler output before resolved adaptation',
        summary:
            `mergedTerritories=${geometry.mergedTerritories.length} ` +
            `sharedPolylines=${geometry.sharedPolylines.length} ` +
            `worldBorders=${geometry.worldBorderPolylines.length}`,
        perfEventName: 'territory.geometry.generatorOutput',
        perfDetail: {
            fingerprint: geometry.fingerprint,
        },
        logDetail: {
            fingerprint: geometry.fingerprint,
            mergedTerritories: geometry.mergedTerritories,
            sharedPolylines: geometry.sharedPolylines,
            worldBorderPolylines: geometry.worldBorderPolylines,
        },
    });
```

### 115. logPipelineStage at pax-fluxia/src/lib/territory/layers/geometry/compiler_UnifiedVectorGeometry.ts:198

- context: UnifiedVectorGeometry
- stage: frontier_polylines
- purpose: Normalize inter-owner and world-border frontiers into stable polyline records
- perfEventName: territory.geometry.frontiersBuilt

```ts
    logPipelineStage({
        channel: 'renderer',
        context: 'UnifiedVectorGeometry',
        stage: 'frontier_polylines',
        from: 'Raw geometry polylines',
        to: 'Resolved frontier polylines',
        purpose: 'Normalize inter-owner and world-border frontiers into stable polyline records',
        summary:
            `interOwner=${allInterOwnerPolylines.length} worldBorders=${worldBorderPolylines.length}`,
        perfEventName: 'territory.geometry.frontiersBuilt',
        logDetail: {
            frontierPolylines: allInterOwnerPolylines,
            worldBorderPolylines,
        },
    });
```

### 116. logPipelineStage at pax-fluxia/src/lib/territory/layers/geometry/compiler_UnifiedVectorGeometry.ts:216

- context: UnifiedVectorGeometry
- stage: territory_regions
- purpose: Assign stable region identity to owner polygons for downstream sampling and rendering
- perfEventName: territory.geometry.regionsBuilt

```ts
    logPipelineStage({
        channel: 'renderer',
        context: 'UnifiedVectorGeometry',
        stage: 'territory_regions',
        from: 'Merged raw territories',
        to: 'Territory regions',
        purpose: 'Assign stable region identity to owner polygons for downstream sampling and rendering',
        summary: `regions=${territoryRegions.length}`,
        perfEventName: 'territory.geometry.regionsBuilt',
        logDetail: {
            territoryRegions,
        },
    });
```

### 117. logPipelineStage at pax-fluxia/src/lib/territory/layers/geometry/compiler_UnifiedVectorGeometry.ts:232

- context: UnifiedVectorGeometry
- stage: shared_frontier_map
- purpose: Group frontiers by owner pair for topology and border consumers
- perfEventName: territory.geometry.sharedFrontierMapBuilt

```ts
    logPipelineStage({
        channel: 'renderer',
        context: 'UnifiedVectorGeometry',
        stage: 'shared_frontier_map',
        from: 'Resolved frontier polylines',
        to: 'Owner-pair frontier multimap',
        purpose: 'Group frontiers by owner pair for topology and border consumers',
        summary: `ownerPairs=${sharedFrontierMap.size}`,
        perfEventName: 'territory.geometry.sharedFrontierMapBuilt',
        logDetail: {
            sharedFrontierMap: serializeSharedFrontierMap(sharedFrontierMap),
        },
    });
```

### 118. logPipelineStage at pax-fluxia/src/lib/territory/layers/geometry/compiler_UnifiedVectorGeometry.ts:248

- context: UnifiedVectorGeometry
- stage: frontier_topology
- purpose: Build vertices, sections, loops, and adjacency for geometric reasoning
- perfEventName: territory.geometry.topologyBuilt

```ts
    logPipelineStage({
        channel: 'renderer',
        context: 'UnifiedVectorGeometry',
        stage: 'frontier_topology',
        from: 'Frontier multimap + TMAP',
        to: 'Resolved frontier topology',
        purpose: 'Build vertices, sections, loops, and adjacency for geometric reasoning',
        summary: frontierTopology
            ? `vertices=${frontierTopology.vertices.size} sections=${frontierTopology.sections.size} loops=${frontierTopology.loops.length}`
            : 'topology=missing',
        perfEventName: 'territory.geometry.topologyBuilt',
        logDetail: frontierTopology
            ? {
                  topology: {
                      vertices: Object.fromEntries(
                          frontierTopology.vertices.entries(),
                      ),
                      sections: Object.fromEntries(
                          frontierTopology.sections.entries(),
                      ),
                      loops: frontierTopology.loops,
                  },
              }
            : {
                  topology: null,
              },
    });
```

### 119. logPipelineStage at pax-fluxia/src/lib/territory/layers/geometry/compiler_UnifiedVectorGeometry.ts:278

- context: UnifiedVectorGeometry
- stage: shell_classification
- purpose: Classify outer and hole loops for shell-aware territory consumers
- perfEventName: territory.geometry.shellsBuilt

```ts
    logPipelineStage({
        channel: 'renderer',
        context: 'UnifiedVectorGeometry',
        stage: 'shell_classification',
        from: 'Territory regions',
        to: 'Shells + shell loops',
        purpose: 'Classify outer and hole loops for shell-aware territory consumers',
        summary: `shells=${shells.length} shellLoops=${shellLoops.length}`,
        perfEventName: 'territory.geometry.shellsBuilt',
        logDetail: {
            shells,
            shellLoops,
        },
    });
```

### 120. logPipelineStage at pax-fluxia/src/lib/territory/layers/geometry/compiler_UnifiedVectorGeometry.ts:322

- context: UnifiedVectorGeometry
- stage: resolved_snapshot
- purpose: Publish the full geometry contract consumed by render families and diagnostics
- perfEventName: territory.geometry.snapshotBuilt

```ts
    logPipelineStage({
        channel: 'renderer',
        context: 'UnifiedVectorGeometry',
        stage: 'resolved_snapshot',
        from: 'Resolved geometry sub-artifacts',
        to: 'ResolvedGeometrySnapshot',
        purpose: 'Publish the full geometry contract consumed by render families and diagnostics',
        summary:
            `regions=${snapshot.territoryRegions.length} frontiers=${snapshot.frontierPolylines.length} ` +
            `worldBorders=${snapshot.worldBorderPolylines.length} shells=${snapshot.shells.length}`,
        perfEventName: 'territory.geometry.snapshotBuilt',
        perfDetail: {
            version: snapshot.version,
            ownershipVersion: snapshot.ownershipVersion,
        },
        logDetail: {
            snapshot,
        },
    });
```

## pax-fluxia/src/lib/utils/mainMenuPreview.ts

### 121. logPipelineStage at pax-fluxia/src/lib/utils/mainMenuPreview.ts:53

- context: MainMenuPreview
- stage: preview_map_generation
- purpose: Generate a lightweight map topology preview before thumbnail rendering and game start
- perfEventName: game.mainMenuPreview.mapGenerated

```ts
    logPipelineStage({
        channel: "data",
        context: "MainMenuPreview",
        stage: "preview_map_generation",
        from: "@pax/common.generateMap",
        to: "Main menu preview topology",
        purpose:
            "Generate a lightweight map topology preview before thumbnail rendering and game start",
        summary:
            `positions=${result.positions.length} connections=${result.connections.length} ` +
            `world=${request.width}x${request.height}`,
        perfEventName: "game.mainMenuPreview.mapGenerated",
        detail: {
            width: request.width,
            height: request.height,
            playerCount: request.playerCount,
            starsPerPlayer: request.starsPerPlayer,
            neutralStarCount: request.neutralStarCount,
        },
        logDetail: {
            request,
            positions: result.positions,
            connections: result.connections,
        },
    });
```

### 122. logPipelineStage at pax-fluxia/src/lib/utils/mainMenuPreview.ts:123

- context: MainMenuPreview
- stage: preview_scene
- purpose: Package main-menu preview ownership, star types, and lane geometry for thumbnail rendering
- perfEventName: game.mainMenuPreview.sceneBuilt

```ts
    logPipelineStage({
        channel: "data",
        context: "MainMenuPreview",
        stage: "preview_scene",
        from: "Preview topology + randomized ownership",
        to: "Thumbnail-ready preview stars and connections",
        purpose:
            "Package main-menu preview ownership, star types, and lane geometry for thumbnail rendering",
        summary:
            `${summarizeStars(stars)} ${summarizeConnections(previewConnections)}`,
        perfEventName: "game.mainMenuPreview.sceneBuilt",
        detail: {
            ownerPool: ownerIds,
            capitals: [...hasCapital],
        },
        logDetail: {
            request,
            ownerIds,
            capitals: [...hasCapital],
            stars,
            connections: previewConnections,
        },
    });
```
