// ============================================================================
// FX Handler — Conquest Events (V2, uses VSM + gameTime)
// ============================================================================
// Processes conquest events: scatter/retreat defender ships, transfer attacker
// ships to conquered star, register delayed color change and flash effect.
// All mutation goes through VSM, all timing uses gameTime.
// ============================================================================

import type { FXContext } from '../types';
import type { ConquestEvent } from '@pax/common';
import { GAME_CONFIG } from '$lib/config/game.config';
import { animationStore } from '$lib/stores/animationStore.svelte';
import { executeConquestTransfer } from '$lib/animations/conquest';
import type { FXHandler } from '../FXRegistry';

/** Guard: prevent compounding slowmo when multiple conquests fire rapidly */
let conquestSlowmoActive = false;

/**
 * Core conquest handler — animates defender scatter/retreat, attacker transfer,
 * delayed color change, and flash effect via VSM.
 */
export const coreConquestHandler: FXHandler<ConquestEvent> = {
    id: 'core:conquest',
    priority: 100,

    handle(event: ConquestEvent, ctx: FXContext): void {
        const conqueredStar = ctx.starsById.get(event.starId);
        if (!conqueredStar) return;

        // Speed-scale factor: compress animation timing proportionally with game speed.
        // At 1x → 1.0, at 2x → 0.5, at 4x → 0.25, etc.
        const speedScale = ctx.effectiveTickMs / GAME_CONFIG.BASE_TICK_MS;

        const ships = ctx.vsm.getOrbitShips(event.starId);

        // ── DEFENDER SHIPS: scatter/retreat/capture ──
        processDefenderShips(event, ctx, ships, conqueredStar);

        // ── ATTACKER SHIPS: Strategy-dispatched conquest transfer ──
        processAttackerTransfer(event, ctx, conqueredStar);

        // ── DELAYED STAR COLOR ──
        // Duration in ticks × effectiveTickMs auto-scales with game speed
        {
            const colorDelay = (GAME_CONFIG.CONQUEST_COLOR_DELAY_TICKS ?? 2) * ctx.effectiveTickMs;
            const conquestNow = ctx.gameTime;
            ctx.vsm.addPendingConquest(event.starId, {
                previousOwner: event.previousOwner,
                transitionTime: conquestNow + colorDelay,
            });
        }

        // ── CONQUEST FLASH ──
        // Duration in ticks × effectiveTickMs auto-scales with game speed
        {
            const flashDur = (GAME_CONFIG.CONQUEST_FLASH_TICKS ?? 3) * ctx.effectiveTickMs;
            if (flashDur > 0) {
                const conquestNow = ctx.gameTime;
                ctx.vsm.addConquestFlash(event.starId, {
                    startTime: conquestNow,
                    duration: flashDur,
                });
            }
        }

        // ── AUTO-SLOWMO (guarded against compounding) ──
        if (GAME_CONFIG.CONQUEST_SLOWMO_ENABLED && !conquestSlowmoActive) {
            conquestSlowmoActive = true;
            const originalSpeed = animationStore.speedMs;
            animationStore.setAnimationSpeed(
                originalSpeed * GAME_CONFIG.CONQUEST_SLOWMO_FACTOR);
            setTimeout(() => {
                animationStore.setAnimationSpeed(originalSpeed);
                conquestSlowmoActive = false;
            }, (GAME_CONFIG.CONQUEST_SLOWMO_DURATION_MS) * speedScale);
        }
    },
};

// ────────────────────────────────────────────────────────────────────────────
// Internal: Process defender ships (scatter / retreat / capture)
// ────────────────────────────────────────────────────────────────────────────

interface StarRef { x: number; y: number; radius: number; }

function processDefenderShips(
    event: ConquestEvent,
    ctx: FXContext,
    ships: ReturnType<Map<string, any[]>['get']> & any[],
    conqueredStar: StarRef,
): void {
    if (event.scatterTargetIds && event.scatterTargetIds.length > 0) {
        // Scatter to multiple targets
        let shipsAnimated = 0;
        for (let t = 0; t < event.scatterTargetIds.length; t++) {
            const targetId = event.scatterTargetIds[t];
            const targetStar = ctx.starsById.get(targetId);
            if (!targetStar) continue;

            const shipCount = event.scatterShipCounts?.[t] ?? 1;
            const count = Math.min(shipCount, ships.length - shipsAnimated);

            for (let i = 0; i < count; i++) {
                if (shipsAnimated >= ships.length) break;
                const ship = ships[shipsAnimated];
                setupDepartingShip(ship, conqueredStar, targetStar, event.starId, targetId, event.previousOwner, ctx);
                shipsAnimated++;
            }
        }
        // Move animated ships to travel, keep rest
        const departing = ships.splice(0, shipsAnimated);
        ctx.vsm.sendToTravel(departing);
        ctx.vsm.recolorOrbit(event.starId, event.newOwner);
        ctx.vsm.setOrbitShips(event.starId, ships);

    } else if (event.retreatTargetId) {
        // Single retreat target
        const retreatStar = ctx.starsById.get(event.retreatTargetId);
        if (retreatStar) {
            const escapeCount = Math.min(Math.floor(event.shipsEscaped), ships.length);
            const retreating = ctx.vsm.removeFromOrbitEnd(event.starId, escapeCount);
            for (const ship of retreating) {
                setupDepartingShip(ship, conqueredStar, retreatStar, event.starId, event.retreatTargetId!, event.previousOwner, ctx);
            }
            ctx.vsm.sendToTravel(retreating);
            ctx.vsm.recolorOrbit(event.starId, event.newOwner);
        }
    } else {
        // No escape — keep captured ships, update their owner color
        const capturedCount = Math.floor(event.shipsCaptured);
        ctx.vsm.truncateOrbit(event.starId, capturedCount);
        ctx.vsm.recolorOrbit(event.starId, event.newOwner);
    }
}

/**
 * Configure a ship for departing state (scatter/retreat).
 * Uses urgent (half-speed) timing for conquest evacuations.
 */
function setupDepartingShip(
    ship: any,
    fromStar: StarRef,
    toStar: StarRef,
    fromStarId: string,
    toStarId: string,
    ownerId: string,
    ctx: FXContext,
): void {
    const dx = toStar.x - fromStar.x;
    const dy = toStar.y - fromStar.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const ndx = dx / dist;
    const ndy = dy / dist;

    ship.state = 'departing';
    ship.departFromX = ship.x;
    ship.departFromY = ship.y;
    ship.fromStarId = fromStarId;
    ship.toStarId = toStarId;
    const travelNow = ctx.gameTime;
    ship.departTime = travelNow + Math.random() * ((GAME_CONFIG.DEPART_JITTER_MS ?? 60) * (ctx.effectiveTickMs / GAME_CONFIG.BASE_TICK_MS));

    // Scatter/retreat uses tick-synced timing (urgent — faster depart)
    const halfTick = ctx.effectiveTickMs / 2;
    const departFrac = (GAME_CONFIG.DEPART_FRACTION ?? 0.3) * 0.5;
    ship.departDuration = halfTick * departFrac;
    ship.travelDuration = halfTick * (1 - departFrac);

    // Lane convergence
    const convergence = GAME_CONFIG.LANE_CONVERGENCE ?? 1.0;
    const convergencePoint = (GAME_CONFIG.LANE_CONVERGENCE_POINT ?? 0) / 100;

    const baseLaneStartX = fromStar.x + ndx * (fromStar.radius + 5);
    const baseLaneStartY = fromStar.y + ndy * (fromStar.radius + 5);
    const baseLaneEndX = toStar.x - ndx * (toStar.radius + 5);
    const baseLaneEndY = toStar.y - ndy * (toStar.radius + 5);

    // Shift start toward convergence point along the lane
    const convStartX = fromStar.x + (toStar.x - fromStar.x) * convergencePoint;
    const convStartY = fromStar.y + (toStar.y - fromStar.y) * convergencePoint;
    const effectiveLaneStartX = baseLaneStartX + (convStartX - baseLaneStartX) * convergencePoint;
    const effectiveLaneStartY = baseLaneStartY + (convStartY - baseLaneStartY) * convergencePoint;

    if (convergence >= 1) {
        ship.laneStartX = effectiveLaneStartX;
        ship.laneStartY = effectiveLaneStartY;
        ship.laneEndX = baseLaneEndX;
        ship.laneEndY = baseLaneEndY;
    } else {
        const spreadAngle = ((ship.id % 12) / 12) * Math.PI * 2;
        const spreadEndX = toStar.x + Math.cos(spreadAngle) * (toStar.radius + 5);
        const spreadEndY = toStar.y + Math.sin(spreadAngle) * (toStar.radius + 5);
        ship.laneStartX = effectiveLaneStartX * convergence + ship.departFromX * (1 - convergence);
        ship.laneStartY = effectiveLaneStartY * convergence + ship.departFromY * (1 - convergence);
        ship.laneEndX = baseLaneEndX * convergence + spreadEndX * (1 - convergence);
        ship.laneEndY = baseLaneEndY * convergence + spreadEndY * (1 - convergence);
    }
    ship.laneOffset = (Math.random() - 0.5) * (GAME_CONFIG.LANE_OFFSET_PX ?? 8) * 2;
    ship.staggerDelay = 0;
    ship.ownerId = ownerId;
}

// ────────────────────────────────────────────────────────────────────────────
// Internal: Process attacker ships (conquest transfer)
// ────────────────────────────────────────────────────────────────────────────

function processAttackerTransfer(
    event: ConquestEvent,
    ctx: FXContext,
    conqueredStar: StarRef & { id?: string },
): void {
    if (event.shipsTransferred <= 0) return;

    // Multi-star transfer: loop over all contributing attacker stars
    const starIds = event.attackerStarIds?.length ? event.attackerStarIds : [event.attackerStarId];
    const shipCounts = event.attackerShipTransfers?.length ? event.attackerShipTransfers : [event.shipsTransferred];

    for (let i = 0; i < starIds.length; i++) {
        const atkStarId = starIds[i];
        const transferForThisStar = shipCounts[i] ?? 0;
        if (!atkStarId || transferForThisStar <= 0) continue;

        const attackerStar = ctx.starsById.get(atkStarId);
        if (!attackerStar) continue;

        const atkShips = ctx.vsm.getOrbitShips(atkStarId);
        const transferCount = Math.min(transferForThisStar, atkShips.length);
        if (transferCount <= 0) continue;

        const result = executeConquestTransfer({
            ships: atkShips,
            attackerStar,
            conqueredStar,
            transferCount,
            newOwner: event.newOwner,
            now: ctx.gameTime,
            effectiveTickMs: ctx.effectiveTickMs,
            attackerStarId: atkStarId,
            conqueredStarId: event.starId,
        });

        // Departing ships enter the travel pipeline via VSM
        ctx.vsm.sendToTravel(result.departing);

        // Arriving ships go directly to conquered star orbit via VSM
        if (result.arriving.length > 0) {
            ctx.vsm.addToOrbit(event.starId, result.arriving);
        }

        // Update attacker star with remaining ships via VSM
        ctx.vsm.setOrbitShips(atkStarId, result.remaining);
    }
}

// Re-export standalone function for backward compatibility during migration
export function handleConquestEvent(event: ConquestEvent, ctx: FXContext): void {
    coreConquestHandler.handle(event, ctx);
}
