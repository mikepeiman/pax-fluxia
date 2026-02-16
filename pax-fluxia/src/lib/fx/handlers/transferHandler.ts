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

        const laneStartX = source.x + ndx * (source.radius + 5);
        const laneStartY = source.y + ndy * (source.radius + 5);
        const laneEndX = target.x - ndx * (target.radius + 5);
        const laneEndY = target.y - ndy * (target.radius + 5);

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
        for (const ship of departingShips) {
            ship.departFromX = ship.x;
            ship.departFromY = ship.y;
            ship.state = 'departing';
            ship.fromStarId = event.sourceId;
            ship.toStarId = event.targetId;
            ship.departTime =
                performance.now() + Math.random() * Math.min(jitterMax, 300 / Math.max(1, shipsToMove));
            ship.travelDuration = travelDuration;
            ship.departDuration = departDuration;
            ship.laneStartX = laneStartX;
            ship.laneStartY = laneStartY;
            ship.laneEndX = laneEndX;
            ship.laneEndY = laneEndY;
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
