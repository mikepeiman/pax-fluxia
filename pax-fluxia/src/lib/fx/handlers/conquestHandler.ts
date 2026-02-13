// ============================================================================
// FX Handler — Conquest Events
// ============================================================================
// Processes conquest events: scatter/retreat defender ships, transfer attacker
// ships to conquered star, register delayed color change and flash effect.
// ============================================================================

import type { FXContext } from '../types';
import type { ConquestEvent } from '@pax/common';
import { GAME_CONFIG } from '$lib/config/game.config';
import { executeConquestTransfer } from '$lib/animations/conquest';

/**
 * Handle a conquest event: animate defender scatter/retreat, attacker transfer,
 * delayed color change, and flash effect.
 */
export function handleConquestEvent(event: ConquestEvent, ctx: FXContext): void {
    const conqueredStar = ctx.starsById.get(event.starId);
    if (!conqueredStar) return;

    const ships = ctx.visualShips.get(event.starId) || [];
    // Note: do NOT skip when ships.length === 0 — neutral stars still need
    // attacker transfer animation even with no defender ships

    // ── DEFENDER SHIPS: scatter/retreat/capture ──
    processDefenderShips(event, ctx, ships, conqueredStar);

    // ── ATTACKER SHIPS: Strategy-dispatched conquest transfer ──
    processAttackerTransfer(event, ctx, conqueredStar);

    // ── DELAYED STAR COLOR ──
    {
        const colorDelay = GAME_CONFIG.CONQUEST_COLOR_DELAY_MS ?? 400;
        ctx.pendingConquests.set(event.starId, {
            previousOwner: event.previousOwner,
            transitionTime: ctx.now + colorDelay,
        });
    }

    // ── CONQUEST FLASH ──
    {
        const flashDur = GAME_CONFIG.CONQUEST_FLASH_DURATION_MS ?? 600;
        if (flashDur > 0) {
            ctx.conquestFlashes.set(event.starId, {
                startTime: ctx.now,
                duration: flashDur,
            });
        }
    }

    // ── AUTO-SLOWMO ──
    if (GAME_CONFIG.CONQUEST_SLOWMO_ENABLED) {
        const originalSpeed = GAME_CONFIG.ANIMATION_SPEED_MS;
        GAME_CONFIG.ANIMATION_SPEED_MS =
            originalSpeed * GAME_CONFIG.CONQUEST_SLOWMO_FACTOR;
        setTimeout(() => {
            GAME_CONFIG.ANIMATION_SPEED_MS = originalSpeed;
        }, GAME_CONFIG.CONQUEST_SLOWMO_DURATION_MS);
    }
}

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
                ctx.travelingShips.push(ship);
                shipsAnimated++;
            }
        }
        ships.splice(0, shipsAnimated);
        for (const s of ships) s.ownerId = event.newOwner;
        ctx.visualShips.set(event.starId, ships);

    } else if (event.retreatTargetId) {
        // Single retreat target
        const retreatStar = ctx.starsById.get(event.retreatTargetId);
        if (retreatStar) {
            const escapeCount = Math.min(Math.floor(event.shipsEscaped), ships.length);
            for (let i = 0; i < escapeCount; i++) {
                const ship = ships.pop()!;
                setupDepartingShip(ship, conqueredStar, retreatStar, event.starId, event.retreatTargetId!, event.previousOwner, ctx);
                ctx.travelingShips.push(ship);
            }
            for (const s of ships) s.ownerId = event.newOwner;
            ctx.visualShips.set(event.starId, ships);
        }
    } else {
        // No escape — keep captured ships, update their owner color
        const capturedCount = Math.floor(event.shipsCaptured);
        if (ships.length > capturedCount) {
            ships.length = capturedCount;
        }
        for (const s of ships) s.ownerId = event.newOwner;
        ctx.visualShips.set(event.starId, ships);
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
    ship.departTime = ctx.now + Math.random() * (GAME_CONFIG.DEPART_JITTER_MS ?? 60);

    // Scatter/retreat uses tick-synced timing (urgent — faster depart)
    const halfTick = ctx.effectiveTickMs / 2;
    const departFrac = (GAME_CONFIG.DEPART_FRACTION ?? 0.3) * 0.5;
    ship.departDuration = halfTick * departFrac;
    ship.travelDuration = halfTick * (1 - departFrac);

    ship.laneStartX = fromStar.x + ndx * (fromStar.radius + 5);
    ship.laneStartY = fromStar.y + ndy * (fromStar.radius + 5);
    ship.laneEndX = toStar.x - ndx * (toStar.radius + 5);
    ship.laneEndY = toStar.y - ndy * (toStar.radius + 5);
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
    if (!event.attackerStarId || event.shipsTransferred <= 0) return;

    const attackerStar = ctx.starsById.get(event.attackerStarId);
    if (!attackerStar) return;

    const atkShips = ctx.visualShips.get(event.attackerStarId) || [];
    const transferCount = Math.min(event.shipsTransferred, atkShips.length);

    if (transferCount <= 0) return;

    const result = executeConquestTransfer({
        ships: atkShips,
        attackerStar,
        conqueredStar,
        transferCount,
        newOwner: event.newOwner,
        now: performance.now(),
        effectiveTickMs: ctx.effectiveTickMs,
        attackerStarId: event.attackerStarId,
        conqueredStarId: event.starId,
    });

    // Departing ships enter the travel pipeline
    for (const ship of result.departing) {
        ctx.travelingShips.push(ship);
    }

    // Arriving ships go directly to conquered star orbit (immediate/surge mode)
    if (result.arriving.length > 0) {
        const destShips = ctx.visualShips.get(event.starId) || [];
        for (const ship of result.arriving) {
            ship.targetIndex = destShips.length;
            destShips.push(ship);
        }
        ctx.visualShips.set(event.starId, destShips);
    }

    // Update attacker star with remaining ships
    ctx.visualShips.set(event.attackerStarId, result.remaining);
}
