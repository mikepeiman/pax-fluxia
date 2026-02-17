// ============================================================================
// FX Handler — Transfer Events (V2, uses VSM + gameTime)
// ============================================================================
// Processes ship transfer events: selects departing ships from the source
// star's visual pool, computes lane geometry, and sends them into the
// traveling ships pipeline via VSM.
// ============================================================================

import type { FXContext } from '../types';
import type { TransferEvent } from '@pax/common';
import { GAME_CONFIG } from '$lib/config/game.config';
import { getOrbitSlot } from '$lib/utils/render.utils';
import type { FXHandler } from '../FXRegistry';

/**
 * Core transfer handler — selects ships from source orbit, configures departure,
 * and sends them to the travel pipeline via VSM.
 */
export const coreTransferHandler: FXHandler<TransferEvent> = {
    id: 'core:transfer',
    priority: 100,

    handle(event: TransferEvent, ctx: FXContext): void {
        const source = ctx.starsById.get(event.sourceId);
        const target = ctx.starsById.get(event.targetId);
        if (!source || !target) return;

        const count = Math.floor(event.shipCount);
        const ships = ctx.vsm.getOrbitShips(event.sourceId);

        // Calculate lane geometry
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const ndx = dx / dist;
        const ndy = dy / dist;

        // Lane convergence: how tightly ships converge to the lane
        const convergence = GAME_CONFIG.LANE_CONVERGENCE ?? 1.0;
        const convergencePoint = (GAME_CONFIG.LANE_CONVERGENCE_POINT ?? 0) / 100; // 0-1

        // Compute convergence start position (lerp from source center to target center)
        const convStartX = source.x + (target.x - source.x) * convergencePoint;
        const convStartY = source.y + (target.y - source.y) * convergencePoint;
        // Convergence end = target circumference (baseline lane endpoint)
        const baseLaneEndX = target.x - ndx * (target.radius + 5);
        const baseLaneEndY = target.y - ndy * (target.radius + 5);

        // When convergencePoint > 0, shift laneStart toward the convergence point
        const baseLaneStartX = source.x + ndx * (source.radius + 5);
        const baseLaneStartY = source.y + ndy * (source.radius + 5);
        const effectiveLaneStartX = baseLaneStartX + (convStartX - baseLaneStartX) * convergencePoint;
        const effectiveLaneStartY = baseLaneStartY + (convStartY - baseLaneStartY) * convergencePoint;

        // Tick-synchronized timing
        const halfTick = ctx.effectiveTickMs / 2;
        const departFraction = GAME_CONFIG.DEPART_FRACTION ?? 0.3;
        const departDuration = halfTick * departFraction;
        const travelDuration = halfTick * (1 - departFraction);
        const jitterMax = GAME_CONFIG.DEPART_JITTER_MS ?? 80;
        const laneOffsetPx = GAME_CONFIG.LANE_OFFSET_PX ?? 8;

        const shipsToMove = Math.min(count, ships.length);

        // === Departure selection based on DEPART_MODE ===
        const mode = GAME_CONFIG.DEPART_MODE || 'nearside';

        if (mode === 'lifo') {
            ships.sort((a, b) => b.id - a.id);
        } else if (mode === 'fifo') {
            ships.sort((a, b) => a.id - b.id);
        } else {
            // NEARSIDE: use orbit SLOT positions for nearest-to-target selection
            ships.forEach((s) => {
                const slot = getOrbitSlot(
                    s.targetIndex,
                    source.x,
                    source.y,
                    source.radius,
                    0,
                    Math.atan2(ndy, ndx),
                    GAME_CONFIG.ORBIT_BIAS_STRENGTH ?? 0.6,
                );
                const slotDx = slot.x - source.x;
                const slotDy = slot.y - source.y;
                const dot = slotDx * ndx + slotDy * ndy;
                const layerWeight = 1 + s.targetIndex / Math.max(1, ships.length);
                (s as any)._departScore = dot * layerWeight;
            });
            ships.sort((a, b) => (b as any)._departScore - (a as any)._departScore);
        }

        // Remove ships from orbit via VSM (handles re-indexing)
        const departingShips = ctx.vsm.removeFromOrbit(event.sourceId, shipsToMove);

        // Configure departure state on each ship
        const streamMode = GAME_CONFIG.DEPART_STAGGER ?? false;
        const streamInterval = streamMode && shipsToMove > 1
            ? halfTick / shipsToMove
            : 0;

        for (let idx = 0; idx < departingShips.length; idx++) {
            const ship = departingShips[idx];
            ship.departFromX = ship.x;
            ship.departFromY = ship.y;
            ship.state = 'departing';
            ship.fromStarId = event.sourceId;
            ship.toStarId = event.targetId;

            if (streamMode) {
                // Stream: evenly-spaced departure across the tick window
                ship.departTime = performance.now() + idx * streamInterval;
            } else {
                // Burst (legacy): random jitter
                ship.departTime =
                    performance.now() + Math.random() * Math.min(jitterMax, 300 / Math.max(1, shipsToMove));
            }
            ship.travelDuration = travelDuration;
            ship.departDuration = departDuration;

            // Apply convergence: blend between lane point and per-ship spread
            if (convergence >= 1) {
                // Full convergence (default) — standard lane behavior
                ship.laneStartX = effectiveLaneStartX;
                ship.laneStartY = effectiveLaneStartY;
                ship.laneEndX = baseLaneEndX;
                ship.laneEndY = baseLaneEndY;
            } else {
                // Partial convergence: ships spread out proportionally
                // Per-ship "spread" target = point on target circumference based on ship's slot
                const spreadAngle = ((ship.id % 12) / 12) * Math.PI * 2;
                const spreadEndX = target.x + Math.cos(spreadAngle) * (target.radius + 5);
                const spreadEndY = target.y + Math.sin(spreadAngle) * (target.radius + 5);

                // Start: blend between lane start and ship's current orbit position
                ship.laneStartX = effectiveLaneStartX * convergence + ship.departFromX * (1 - convergence);
                ship.laneStartY = effectiveLaneStartY * convergence + ship.departFromY * (1 - convergence);
                // End: blend between lane end and spread destination
                ship.laneEndX = baseLaneEndX * convergence + spreadEndX * (1 - convergence);
                ship.laneEndY = baseLaneEndY * convergence + spreadEndY * (1 - convergence);
            }

            ship.laneOffset = (Math.random() - 0.5) * laneOffsetPx * 2;
            ship.staggerDelay = 0;
            ship.ownerId = event.ownerId;
        }

        // Send to travel pipeline via VSM
        ctx.vsm.sendToTravel(departingShips);
    },
};

// Re-export standalone function for backward compatibility during migration
export function handleTransferEvent(event: TransferEvent, ctx: FXContext): void {
    coreTransferHandler.handle(event, ctx);
}
