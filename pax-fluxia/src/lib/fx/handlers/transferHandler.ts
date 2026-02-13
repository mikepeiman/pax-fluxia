// ============================================================================
// FX Handler — Transfer Events
// ============================================================================
// Processes ship transfer events: selects departing ships from the source
// star's visual pool, computes lane geometry, and pushes them into the
// traveling ships pipeline with departure timing.
// ============================================================================

import type { FXContext } from '../types';
import type { TransferEvent } from '@pax/common';
import { GAME_CONFIG } from '$lib/config/game.config';
import { getOrbitSlot } from '$lib/utils/render.utils';

/**
 * Handle a transfer event: select ships from source orbit, set up departure
 * state (lane geometry, timing, offsets), and push to travelingShips.
 */
export function handleTransferEvent(event: TransferEvent, ctx: FXContext): void {
    const source = ctx.starsById.get(event.sourceId);
    const target = ctx.starsById.get(event.targetId);
    if (!source || !target) return;

    const count = Math.floor(event.shipCount);
    const ships = ctx.visualShips.get(event.sourceId) || [];

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

    // Tick-synchronized timing: all ships arrive at half-tick regardless of distance
    const halfTick = ctx.effectiveTickMs / 2;
    const departFraction = GAME_CONFIG.DEPART_FRACTION ?? 0.3;
    const departDuration = halfTick * departFraction;
    const travelDuration = halfTick * (1 - departFraction);
    const jitterMax = GAME_CONFIG.DEPART_JITTER_MS ?? 80;
    const laneOffsetPx = GAME_CONFIG.LANE_OFFSET_PX ?? 8;

    const shipsToMove = Math.min(count, ships.length);

    // === Departure selection based on DEPART_MODE ===
    const mode = GAME_CONFIG.DEPART_MODE || 'nearside';
    let departingShips: typeof ships;

    if (mode === 'lifo') {
        // LIFO: newest ships depart first (splice from end)
        departingShips = ships.splice(ships.length - shipsToMove, shipsToMove);
    } else if (mode === 'fifo') {
        // FIFO: oldest ships depart first (sort by id ascending, take lowest)
        ships.sort((a, b) => a.id - b.id);
        departingShips = ships.splice(0, shipsToMove);
    } else {
        // NEARSIDE: use orbit SLOT positions for dot product, not mid-settle ship.x/y
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
        departingShips = ships.splice(0, shipsToMove);
    }

    // Re-index remaining ships' targetIndex after splice
    for (let j = 0; j < ships.length; j++) {
        ships[j].targetIndex = j;
    }

    for (const ship of departingShips) {
        ship.departFromX = ship.x;
        ship.departFromY = ship.y;
        ship.state = 'departing';
        ship.fromStarId = event.sourceId;
        ship.toStarId = event.targetId;
        ship.departTime =
            ctx.now + Math.random() * Math.min(jitterMax, 300 / Math.max(1, shipsToMove));
        ship.travelDuration = travelDuration;
        ship.departDuration = departDuration;
        ship.laneStartX = laneStartX;
        ship.laneStartY = laneStartY;
        ship.laneEndX = laneEndX;
        ship.laneEndY = laneEndY;
        ship.laneOffset = (Math.random() - 0.5) * laneOffsetPx * 2;
        ship.staggerDelay = 0;
        ship.ownerId = event.ownerId;
        ctx.travelingShips.push(ship);
    }
    ctx.visualShips.set(event.sourceId, ships);
}
