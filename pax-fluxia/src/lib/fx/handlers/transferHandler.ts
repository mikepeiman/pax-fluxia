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
import { isTraceArmed, traceTransferSetup } from '$lib/debug/travelTrace';
import { getDirectedLanePolyline } from '$lib/lanes/lanePolylineCache';
import { trimLanePolylineToStarRims } from '$lib/lanes/laneGeometry';
import {
    assignShipLaneGeometry,
    computeLaneHeadingForNearside,
} from '$lib/lanes/applyLaneTravelPath';

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

        const sourceRef = {
            id: event.sourceId,
            x: source.x,
            y: source.y,
            radius: source.radius,
        };
        const targetRef = {
            id: event.targetId,
            x: target.x,
            y: target.y,
            radius: target.radius,
        };
        const rawPoly = getDirectedLanePolyline(event.sourceId, event.targetId);
        let pretrimmed: [number, number][] | undefined;
        if (rawPoly && rawPoly.length >= 2) {
            const t = trimLanePolylineToStarRims(rawPoly, sourceRef, targetRef, 5);
            if (t.length >= 2) pretrimmed = t;
        }
        const { ndx, ndy } = computeLaneHeadingForNearside(sourceRef, targetRef, pretrimmed);

        // Lane convergence: how tightly ships converge to the lane
        const convergence = GAME_CONFIG.LANE_CONVERGENCE ?? 1.0;
        const convergencePoint = (GAME_CONFIG.LANE_CONVERGENCE_POINT ?? 0) / 100; // 0-1

        // Base / effective lane starts (for trace only when polyline — assignShipLaneGeometry owns real values)
        const baseLaneStartX = source.x + ndx * (source.radius + 5);
        const baseLaneStartY = source.y + ndy * (source.radius + 5);
        const baseLaneEndX = target.x - ndx * (target.radius + 5);
        const baseLaneEndY = target.y - ndy * (target.radius + 5);
        const convStartX = source.x + (target.x - source.x) * convergencePoint;
        const convStartY = source.y + (target.y - source.y) * convergencePoint;
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

            const travelNow = ctx.gameTime;
            if (streamMode) {
                // Stream: evenly-spaced departure across the tick window
                ship.departTime = travelNow + idx * streamInterval;
            } else {
                // Burst (legacy): random jitter
                ship.departTime =
                    travelNow + Math.random() * Math.min(jitterMax, 300 / Math.max(1, shipsToMove));
            }
            ship.travelDuration = travelDuration;
            ship.departDuration = departDuration;

            assignShipLaneGeometry(ship, sourceRef, targetRef, pretrimmed);

            ship.laneOffset = (Math.random() - 0.5) * laneOffsetPx * 2;
            ship.staggerDelay = 0;
            ship.ownerId = event.ownerId;
        }

        // Trace instrumentation — capture full transfer setup when armed
        if (isTraceArmed()) {
            traceTransferSetup({
                sourceId: event.sourceId,
                targetId: event.targetId,
                sourceX: source.x, sourceY: source.y, sourceRadius: source.radius,
                targetX: target.x, targetY: target.y, targetRadius: target.radius,
                laneStartX: departingShips[0]?.laneStartX ?? effectiveLaneStartX,
                laneStartY: departingShips[0]?.laneStartY ?? effectiveLaneStartY,
                laneEndX: departingShips[0]?.laneEndX ?? baseLaneEndX,
                laneEndY: departingShips[0]?.laneEndY ?? baseLaneEndY,
                halfTick, departDuration, travelDuration, departFraction,
                convergencePoint, convergence,
                shipsToMove, streamMode, streamInterval,
                shipDetails: departingShips.map(s => ({
                    id: s.id,
                    departFromX: s.departFromX, departFromY: s.departFromY,
                    laneStartX: s.laneStartX, laneStartY: s.laneStartY,
                    laneEndX: s.laneEndX, laneEndY: s.laneEndY,
                    laneOffset: s.laneOffset,
                    departTime: s.departTime,
                })),
            });
        }

        // Send to travel pipeline via VSM
        ctx.vsm.sendToTravel(departingShips);
    },
};

// Re-export standalone function for backward compatibility during migration
export function handleTransferEvent(event: TransferEvent, ctx: FXContext): void {
    coreTransferHandler.handle(event, ctx);
}
