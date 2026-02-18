// ============================================================================
// ShipRenderer — Orbiting ships, traveling ships, fleets, particle management
// ============================================================================
import { isTrackedShip, traceDepartFrame, traceDepartToTravel, traceTravelFrame, traceTravelToOrbit, traceSettleFrame } from '$lib/debug/travelTrace';
//
// Extracted from GameCanvas.svelte ~lines 1452-2452.
// This is the largest renderer module (~900 LOC in source).
//
// Renders:
//   1. Orbiting ships per star (spawn/despawn, settle arcs, attack surge)
//   2. Traveling ships (depart → travel → arrive lifecycle)
//   3. Orb grouping mode for traveling ships
//   4. Fleet overlay (legacy)
//   5. Star glow sprites
//   6. Damaged ship indicators
//
// Drawn into:
//   - shipParticleContainer (all ship particles)
//   - orbGraphics (orb travel glow)
//   - glowContainer (star glow sprites)
// ============================================================================

import * as PIXI from 'pixi.js';
import type { StarState, FleetState } from '$lib/types/game.types';
import { GAME_CONFIG } from '$lib/config/game.config';
import { animationStore } from '$lib/stores/animationStore.svelte';
import {
    getOrbitSlot,
    getOuterOrbitRadius,
    lerp,
    type VisualShipState,
} from '$lib/utils/render.utils';
import {
    DEPART_BEHAVIORS,
    TRAVEL_BEHAVIORS,
} from '$lib/fx/phases/behaviors';
import type { PhaseContext } from '$lib/fx/phases/travelTypes';
import type { ColorUtils } from './RenderContext';

// ── Ship Render State ───────────────────────────────────────────────────────

export interface ShipRenderState {
    /** Ship orbit state per star (mutable — managed by VSM) */
    visualShips: Map<string, VisualShipState[]>;
    /** Damaged ship visual state per star */
    visualDamagedShips: Map<string, VisualShipState[]>;
    /** Ships in flight (mutable array) */
    travelingShips: VisualShipState[];
    /** Stars currently in tick-synced combat */
    starsInCombat: Set<string>;
    /** Pending conquest color transitions */
    pendingConquests: Map<string, { previousOwner: string; transitionTime: number }>;
    /** Per-star attack ramp-in progress (0→1) */
    attackRampProgress: Map<string, number>;
    /** Direction lock for mid-surge target changes */
    surgeLockedDir: Map<string, { x: number; y: number; targetId: string }>;
    /** Last frame time for surge delta calc */
    lastSurgeFrameTime: number;
    /** Unique ship ID counter */
    nextShipId: number;
    /** Animation time (seconds, monotonic) */
    animationTime: number;
    /** Whether game is paused */
    isPaused: boolean;
    /** Effective tick duration in ms */
    effectiveTickMs: number;
    /** Tick progress within current tick (0-1) */
    tickProgress: number;
}

export interface ShipRenderResources {
    /** Ship circle texture */
    shipCircleTexture: PIXI.Texture;
    /** Glow texture for star glow */
    glowTexture: PIXI.Texture;
    /** Particle container for ship sprites */
    shipParticleContainer: PIXI.ParticleContainer;
    /** Orb glow graphics */
    orbGraphics: PIXI.Graphics;
    /** Glow container */
    glowContainer: PIXI.Container;
    /** Particle pool for recycling */
    shipParticlePool: PIXI.Particle[];
    /** Current index into particle pool */
    shipParticleIndex: number;
    /** Glow sprites cache per star */
    glowSprites: Map<string, PIXI.Sprite>;
}

// ── drawShip — Low-level particle placement ─────────────────────────────────

/**
 * Draw a single ship via particle pool.
 * Creates outline particle (backing circle) + fill particle + optional damage indicator.
 */
export function drawShip(
    res: ShipRenderResources,
    colorUtils: ColorUtils,
    x: number,
    y: number,
    color: number,
    scale: number,
    alpha: number,
    isDamaged: boolean,
    multiplier: number = 1,
    ownerId: string = '',
    ringTier: number = 0,
    shipIndex: number = 0,
): void {
    const { shipParticleContainer, shipCircleTexture, shipParticlePool } = res;
    if (!shipParticleContainer || !shipCircleTexture) return;

    const globalScale = GAME_CONFIG.SHIP_SCALE_MULT ?? 1.0;
    const visualRadius = GAME_CONFIG.SHIP_VISUAL_RADIUS ?? 3;
    const pixelSize = visualRadius * scale * globalScale;
    const spriteScale = (pixelSize * 2) / 128;

    // Ring-based density coloring
    let fillColor = color;
    if (ringTier > 0 && ownerId) {
        const playerHsl = colorUtils.getPlayerHSL(ownerId);
        const darken = GAME_CONFIG.DENSITY_DARKEN_ALT && shipIndex % 2 === 1;
        fillColor = colorUtils.getDensityFillColor(playerHsl, ringTier, darken);
    }

    // === Outline: backing circle ===
    if (GAME_CONFIG.SHIP_OUTLINE_ON !== false) {
        const outlinePx = GAME_CONFIG.SHIP_OUTLINE_PX ?? 1.0;
        const outlineScale = ((pixelSize + outlinePx) * 2) / 128;
        let outlineP: PIXI.Particle;
        if (res.shipParticleIndex < shipParticlePool.length) {
            outlineP = shipParticlePool[res.shipParticleIndex];
        } else {
            outlineP = new PIXI.Particle({
                texture: shipCircleTexture,
                anchorX: 0.5,
                anchorY: 0.5,
            });
            shipParticlePool.push(outlineP);
            shipParticleContainer.addParticle(outlineP);
        }
        outlineP.x = x;
        outlineP.y = y;
        outlineP.scaleX = outlineScale;
        outlineP.scaleY = outlineScale;
        outlineP.tint = color;
        outlineP.alpha = alpha;
        res.shipParticleIndex++;
    }

    // === Fill circle ===
    let particle: PIXI.Particle;
    if (res.shipParticleIndex < shipParticlePool.length) {
        particle = shipParticlePool[res.shipParticleIndex];
    } else {
        particle = new PIXI.Particle({
            texture: shipCircleTexture,
            anchorX: 0.5,
            anchorY: 0.5,
        });
        shipParticlePool.push(particle);
        shipParticleContainer.addParticle(particle);
    }
    particle.x = x;
    particle.y = y;
    particle.scaleX = spriteScale;
    particle.scaleY = spriteScale;
    particle.tint = fillColor;
    particle.alpha = alpha;
    res.shipParticleIndex++;

    // === Damaged indicator ===
    if (isDamaged) {
        const dmgScale = ((pixelSize + 2) * 2) / 128;
        let dmgP: PIXI.Particle;
        if (res.shipParticleIndex < shipParticlePool.length) {
            dmgP = shipParticlePool[res.shipParticleIndex];
        } else {
            dmgP = new PIXI.Particle({
                texture: shipCircleTexture,
                anchorX: 0.5,
                anchorY: 0.5,
            });
            shipParticlePool.push(dmgP);
            shipParticleContainer.addParticle(dmgP);
        }
        dmgP.x = x;
        dmgP.y = y;
        dmgP.scaleX = dmgScale;
        dmgP.scaleY = dmgScale;
        dmgP.tint = 0x222222;
        dmgP.alpha = 0.5;
        res.shipParticleIndex++;
    }
}

// ── renderTravelingShips — In-flight lifecycle ──────────────────────────────

/**
 * Render ships in depart → travel → arrive lifecycle.
 * Mutates state.travelingShips to remove arrived ships.
 */
export function renderTravelingShips(
    stars: StarState[],
    starsById: Map<string, StarState>,
    state: ShipRenderState,
    res: ShipRenderResources,
    colorUtils: ColorUtils,
): void {
    if (!res.shipParticleContainer) return;

    const now = performance.now();

    // When paused, shift all departTimes forward so ships freeze in place
    if (state.isPaused) {
        const dt = now - ((renderTravelingShips as any)._lastNow ?? now);
        if (dt > 0) {
            for (const ship of state.travelingShips) {
                ship.departTime += dt;
            }
        }
    }
    (renderTravelingShips as any)._lastNow = now;

    const stillTraveling: VisualShipState[] = [];

    // Orb grouping
    const orbGroups: Map<string, {
        ships: VisualShipState[];
        sumX: number;
        sumY: number;
        count: number;
        color: number;
        ownerId: string;
    }> = new Map();

    // Phase context for behavior registry
    const phaseCtx: PhaseContext = {
        now,
        elapsed: 0,
        travelEasing: GAME_CONFIG.TRAVEL_EASING ?? 'easeInOut',
        travelEasingPower: GAME_CONFIG.TRAVEL_EASING_POWER ?? 2,
        travelDurationMult: GAME_CONFIG.TRAVEL_DURATION_MULT ?? 1,
        travelArcIntensity: GAME_CONFIG.TRAVEL_ARC_INTENSITY ?? 0.5,
        departArcIntensity: GAME_CONFIG.DEPART_ARC_INTENSITY ?? 0,
        arrivalArcIntensity: GAME_CONFIG.ARRIVAL_ARC_INTENSITY ?? 0,
        wobbleAmp: GAME_CONFIG.WOBBLE_AMP ?? 12,
    };

    // Animation speed scaling: multiply elapsed by speedMultiplier
    // so the slider directly controls ship travel/depart visual speed.
    // >1 = faster animations, <1 = slower animations.
    const animSpeedMult = animationStore.speedMultiplier;

    for (const ship of state.travelingShips) {
        const elapsed = now - ship.departTime;

        if (elapsed < 0) {
            stillTraveling.push(ship);
            const color = colorUtils.getPlayerColor(ship.ownerId);
            drawShip(res, colorUtils, ship.x, ship.y, color, ship.scale, ship.alpha, false, 1, ship.ownerId);
            continue;
        }

        const color = colorUtils.getPlayerColor(ship.ownerId);

        if (ship.state === 'departing') {
            const departMode = GAME_CONFIG.ORB_TRAVEL ? 'orb' : (GAME_CONFIG.TRAVEL_MODE || 'lane');
            const departBehavior = DEPART_BEHAVIORS[departMode] || DEPART_BEHAVIORS.lane;

            const result = departBehavior.interpolate(ship, elapsed, phaseCtx);
            ship.x = result.x;
            ship.y = result.y;
            ship.scale = result.scale;
            ship.alpha = result.alpha;

            // Trace: depart frame
            if (isTrackedShip(ship.id)) {
                const dp = Math.min(1, elapsed / (ship.departDuration || 150));
                traceDepartFrame(ship.id, elapsed, dp, ship.x, ship.y, ship.scale, ship.alpha);
            }

            if (result.done) {
                if (departMode === 'bezier') {
                    // Bezier covers full journey in depart phase — snap to end
                    ship.x = ship.laneEndX;
                    ship.y = ship.laneEndY;
                    ship.state = 'traveling';
                    // Set departTime so elapsed immediately exceeds scaled duration
                    const scaledDur = ship.travelDuration * (phaseCtx.travelDurationMult ?? 1);
                    ship.departTime = now - scaledDur - 1;
                    if (isTrackedShip(ship.id)) traceDepartToTravel(ship.id, ship.x, ship.y, 'bezier', { scaledDur });
                } else {
                    ship.x = ship.laneStartX;
                    ship.y = ship.laneStartY;
                    if (departMode !== 'orb') {
                        ship.laneStartX = ship.x;
                        ship.laneStartY = ship.y;
                    }
                    ship.state = 'traveling';
                    ship.departTime = now;
                    if (isTrackedShip(ship.id)) traceDepartToTravel(ship.id, ship.x, ship.y, departMode);
                }
            }

            if (GAME_CONFIG.ORB_TRAVEL && ship.alpha <= 0.01) {
                stillTraveling.push(ship);
            } else {
                drawShip(res, colorUtils, ship.x, ship.y, color, ship.scale, ship.alpha, false, 1, ship.ownerId);
                stillTraveling.push(ship);
            }
        } else if (ship.state === 'traveling') {
            const travelMode = GAME_CONFIG.ORB_TRAVEL ? 'orb' : 'lane';
            const travelBehavior = TRAVEL_BEHAVIORS[travelMode] || TRAVEL_BEHAVIORS.lane;

            const result = travelBehavior.interpolate(ship, elapsed, phaseCtx);
            ship.x = result.x;
            ship.y = result.y;
            ship.scale = result.scale;
            ship.alpha = result.alpha;

            // Trace: travel frame
            if (isTrackedShip(ship.id)) {
                const tp = Math.min(1, elapsed / (ship.travelDuration * (phaseCtx.travelDurationMult ?? 1)));
                traceTravelFrame(ship.id, elapsed, tp, ship.x, ship.y, ship.scale, ship.alpha, {
                    laneOffset: ship.laneOffset,
                    edgeFade: Math.min(tp * 4, (1 - tp) * 4, 1),
                });
            }

            // Use the behavior's own completion signal — it accounts for travelDurationMult
            if (result.done) {
                // Arrive at destination
                const destStar = starsById.get(ship.toStarId!);
                if (destStar) {
                    const destShips = state.visualShips.get(destStar.id) || [];
                    // Ship is already at its travel-end position (laneEndX/Y on star edge).
                    // Don't reposition — let the settle animation handle the transition to orbit slot.

                    ship.state = 'orbiting';
                    ship.fromStarId = null;
                    ship.toStarId = null;
                    ship.arriveStarId = null;
                    // Keep travel-phase visuals — orbit settle will interpolate to final values
                    // (previously hard-jumped to alpha:0.5, scale:0.3 causing visual disjoint)
                    ship.alpha = 1;
                    ship.scale = 0.9;
                    ship.targetIndex = destShips.length;

                    const arrAngle = Math.atan2(ship.y - destStar.y, ship.x - destStar.x);
                    const arrR = Math.sqrt((ship.x - destStar.x) ** 2 + (ship.y - destStar.y) ** 2);
                    // ARRIVAL_SPREAD=0: settle immediately, >0: stagger settle over fraction of tick
                    const arrivalSpread = GAME_CONFIG.ARRIVAL_SPREAD ?? 0;
                    let staggerOffset = 0;
                    if (arrivalSpread > 0 && destShips.length > 0) {
                        const tickMs = state.effectiveTickMs || 1000;
                        const staggerWindow = tickMs * arrivalSpread;
                        staggerOffset = (destShips.length / Math.max(1, destShips.length + 1)) * staggerWindow;
                    }
                    ship.settleStartTime = performance.now() + staggerOffset;
                    ship.settleStartAngle = arrAngle;
                    ship.settleStartRadius = arrR;
                    if (isTrackedShip(ship.id)) traceTravelToOrbit(ship.id, ship.x, ship.y, arrAngle, arrR, destStar.x, destStar.y);
                    destShips.push(ship);
                    state.visualShips.set(destStar.id, destShips);
                } else {
                    ship.x = ship.laneEndX;
                    ship.y = ship.laneEndY;
                }
                // Don't push to stillTraveling — now in orbit
            } else {
                if (GAME_CONFIG.ORB_TRAVEL) {
                    const routeKey = `${ship.fromStarId}->${ship.toStarId}`;
                    let group = orbGroups.get(routeKey);
                    if (!group) {
                        group = { ships: [], sumX: 0, sumY: 0, count: 0, color, ownerId: ship.ownerId };
                        orbGroups.set(routeKey, group);
                    }
                    group.ships.push(ship);
                    group.sumX += ship.x;
                    group.sumY += ship.y;
                    group.count++;
                } else {
                    drawShip(res, colorUtils, ship.x, ship.y, color, ship.scale, ship.alpha, false, 1, ship.ownerId);
                }
                stillTraveling.push(ship);
            }
        }
    }

    // Draw orbs for grouped traveling ships
    if (GAME_CONFIG.ORB_TRAVEL && orbGroups.size > 0 && res.orbGraphics) {
        const G = GAME_CONFIG;
        for (const [, group] of orbGroups) {
            const cx = group.sumX / group.count;
            const cy = group.sumY / group.count;
            const shipCount = group.count;

            const baseRadius = G.ORB_BASE_RADIUS + Math.sqrt(shipCount) * G.ORB_RADIUS_SCALE;
            const intensity = Math.min(1.0, 0.4 + Math.sqrt(shipCount) * 0.06) * G.ORB_GLOW_MULT;

            const glowRadius = baseRadius * G.ORB_OUTER_SCALE;
            res.orbGraphics.circle(cx, cy, glowRadius);
            res.orbGraphics.fill({ color: group.color, alpha: intensity * G.ORB_OUTER_ALPHA });

            const midRadius = baseRadius * G.ORB_MID_SCALE;
            res.orbGraphics.circle(cx, cy, midRadius);
            res.orbGraphics.fill({ color: group.color, alpha: intensity * G.ORB_MID_ALPHA });

            res.orbGraphics.circle(cx, cy, baseRadius);
            res.orbGraphics.fill({ color: 0xffffff, alpha: intensity * G.ORB_CORE_ALPHA });

            const coreRadius = baseRadius * G.ORB_CORE_SCALE;
            res.orbGraphics.circle(cx, cy, coreRadius);
            res.orbGraphics.fill({ color: group.color, alpha: intensity * 0.9 });

            const dotRadius = Math.max(1.5, baseRadius * 0.3);
            res.orbGraphics.circle(cx, cy, dotRadius);
            res.orbGraphics.fill({ color: 0xffffff, alpha: Math.min(1, intensity * G.ORB_CENTER_ALPHA) });
        }
    }

    state.travelingShips = stillTraveling;
}

// ── renderShips — Main per-star orbit + spawn/despawn ───────────────────────

/**
 * Render all orbiting ships, damaged ships, star glow, and call renderTravelingShips.
 */
export function renderShips(
    stars: StarState[],
    starsById: Map<string, StarState>,
    state: ShipRenderState,
    res: ShipRenderResources,
    colorUtils: ColorUtils,
): void {
    if (!res.shipParticleContainer) return;

    stars.forEach((star) => {
        // Delayed star color
        let effectiveOwner = star.ownerId;
        const pending = state.pendingConquests.get(star.id);
        if (pending) {
            if (performance.now() < pending.transitionTime) {
                effectiveOwner = pending.previousOwner;
            } else {
                state.pendingConquests.delete(star.id);
            }
        }
        const color = colorUtils.getPlayerColor(effectiveOwner);

        // 1. Manage Active Ships State
        let ships = state.visualShips.get(star.id) || [];
        let inFlightToStar = 0;
        for (const ts of state.travelingShips) {
            if (ts.toStarId === star.id) inFlightToStar++;
        }
        const actualCount = Math.max(0, star.activeShips - inFlightToStar);
        const maxVisual = GAME_CONFIG.MAX_VISUAL_SHIPS ?? 100;
        const targetCount = Math.min(actualCount, maxVisual);
        const starMultiplier = targetCount > 0 ? actualCount / targetCount : 1;

        // SPAWN
        if (ships.length < targetCount) {
            const diff = targetCount - ships.length;
            for (let i = 0; i < diff; i++) {
                const spawnIndex = ships.length;
                const spawnAngle = Math.random() * Math.PI * 2;
                const spawnR = star.radius + 8;
                const now = performance.now();
                ships.push({
                    id: state.nextShipId++,
                    x: star.x + Math.cos(spawnAngle) * spawnR,
                    y: star.y + Math.sin(spawnAngle) * spawnR,
                    vx: 0, vy: 0,
                    targetIndex: spawnIndex,
                    scale: 0.3, alpha: 0.5,
                    spawnTime: now,
                    state: 'orbiting' as const,
                    fromStarId: null, toStarId: null,
                    departTime: 0, travelDuration: 0, departDuration: 0,
                    laneStartX: 0, laneStartY: 0,
                    laneEndX: 0, laneEndY: 0,
                    departFromX: 0, departFromY: 0,
                    arriveToX: 0, arriveToY: 0,
                    arriveStarId: null,
                    laneOffset: 0, staggerDelay: 0,
                    ownerId: star.ownerId,
                    settleStartTime: now,
                    settleStartAngle: spawnAngle,
                    settleStartRadius: spawnR,
                });
            }
        } else if (ships.length > targetCount) {
            ships.length = targetCount;
        }
        state.visualShips.set(star.id, ships);

        // Star Glow
        if (
            GAME_CONFIG.STAR_GLOW_ON &&
            res.glowTexture &&
            res.glowContainer &&
            star.ownerId &&
            ships.length > 0
        ) {
            let glowSprite = res.glowSprites.get(star.id);
            if (!glowSprite) {
                glowSprite = new PIXI.Sprite(res.glowTexture);
                glowSprite.anchor.set(0.5, 0.5);
                res.glowContainer.addChild(glowSprite);
                res.glowSprites.set(star.id, glowSprite);
            }
            const outerR = getOuterOrbitRadius(star.radius, targetCount);
            const glowR = outerR * (GAME_CONFIG.STAR_GLOW_RADIUS_MULT ?? 1.3);
            const glowDiameter = glowR * 2;
            const spriteScale = glowDiameter / 256;
            glowSprite.x = star.x;
            glowSprite.y = star.y;
            glowSprite.scale.set(spriteScale);
            glowSprite.tint = color;
            glowSprite.alpha = GAME_CONFIG.STAR_GLOW_INTENSITY ?? 0.25;
            glowSprite.visible = true;
        } else {
            const glowSprite = res.glowSprites.get(star.id);
            if (glowSprite) glowSprite.visible = false;
        }

        // 2. Physics & Render Loop for Active Ships
        if (ships.length > 0) {
            const hasTarget = star.targetId !== null;
            const targetStar = hasTarget ? stars.find((s) => s.id === star.targetId) : null;
            const isAttack = hasTarget && targetStar && targetStar.ownerId !== star.ownerId;

            let dirX = 0, dirY = 0;
            if (targetStar) {
                dirX = targetStar.x - star.x;
                dirY = targetStar.y - star.y;
                const dist = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
                dirX /= dist;
                dirY /= dist;
            }

            ships.forEach((ship, i) => {
                if (ship.targetIndex !== i) {
                    ship.settleStartTime = performance.now();
                    ship.settleStartAngle = Math.atan2(ship.y - star.y, ship.x - star.x);
                    ship.settleStartRadius = Math.sqrt((ship.x - star.x) ** 2 + (ship.y - star.y) ** 2);
                }
                ship.targetIndex = i;

                const shipPhase = (ship.id % 17) / 17;

                // Orbit slot
                const orbitTime = GAME_CONFIG.STATIC_ORBITS ? 0 : state.animationTime;
                const biasAngle = targetStar
                    ? Math.atan2(targetStar.y - star.y, targetStar.x - star.x)
                    : undefined;

                let biasStrength: number;
                if (!targetStar) {
                    biasStrength = 0;
                } else if (GAME_CONFIG.ORBIT_BIAS_OSCILLATE) {
                    const freq = GAME_CONFIG.ORBIT_BIAS_FREQ ?? 1.0;
                    const effectiveTick = state.effectiveTickMs;
                    const phase = Math.sin((state.animationTime / effectiveTick) * freq * Math.PI * 2);
                    const min = GAME_CONFIG.ORBIT_BIAS_MIN ?? 0;
                    const max = GAME_CONFIG.ORBIT_BIAS_MAX ?? 1;
                    biasStrength = min + (max - min) * (phase * 0.5 + 0.5);
                } else {
                    biasStrength = GAME_CONFIG.ORBIT_BIAS_STRENGTH ?? 0.6;
                }

                const slot = getOrbitSlot(
                    ship.targetIndex, star.x, star.y, star.radius,
                    orbitTime, biasAngle, biasStrength,
                );
                let targetX = slot.x;
                let targetY = slot.y;
                const shipMultiplier = slot.multiplier * starMultiplier;

                // ATTACK SURGE
                if (isAttack && targetStar && state.starsInCombat.has(star.id)) {
                    const gamePaused = state.isPaused;

                    let useDirX = dirX, useDirY = dirY;
                    const lockedDir = state.surgeLockedDir.get(star.id);

                    if (lockedDir && lockedDir.targetId !== star.targetId) {
                        if (state.tickProgress < 0.1) {
                            state.surgeLockedDir.set(star.id, { x: dirX, y: dirY, targetId: star.targetId! });
                        } else {
                            useDirX = lockedDir.x;
                            useDirY = lockedDir.y;
                        }
                    } else if (!lockedDir) {
                        state.surgeLockedDir.set(star.id, { x: dirX, y: dirY, targetId: star.targetId! });
                    }

                    if (!state.attackRampProgress.has(star.id)) {
                        state.attackRampProgress.set(star.id, 0);
                    }

                    const rampDuration = GAME_CONFIG.ATTACK_SURGE_RAMP_MS ?? 300;
                    let rampFactor = 1;
                    if (rampDuration > 0) {
                        let rampVal = state.attackRampProgress.get(star.id)!;
                        if (!gamePaused && state.lastSurgeFrameTime > 0) {
                            const frameDelta = performance.now() - state.lastSurgeFrameTime;
                            rampVal = Math.min(1, rampVal + frameDelta / rampDuration);
                            state.attackRampProgress.set(star.id, rampVal);
                        }
                        rampFactor = 1 - Math.pow(1 - rampVal, 3);
                    }

                    const shipDx = slot.x - star.x;
                    const shipDy = slot.y - star.y;
                    const shipDist = Math.sqrt(shipDx * shipDx + shipDy * shipDy) || 1;
                    const shipNormX = shipDx / shipDist;
                    const shipNormY = shipDy / shipDist;
                    const facingFactor = shipNormX * useDirX + shipNormY * useDirY;
                    const surgeFactor = Math.max(0, facingFactor) ** 1.5;

                    const rawPulse = Math.sin(state.tickProgress * Math.PI);
                    const surgeShape = GAME_CONFIG.ATTACK_SURGE_SHAPE ?? 1;
                    const surgePulse = surgeShape === 1 ? rawPulse : Math.pow(rawPulse, surgeShape);
                    const phaseAmplitude = 0.75 + 0.25 * Math.sin(shipPhase * Math.PI * 2);

                    let surgeMax = star.radius * (GAME_CONFIG.ATTACK_SURGE_MULT ?? 0.4);

                    if (GAME_CONFIG.ATTACK_SURGE_PROPORTIONAL && targetStar) {
                        const myShips = star.activeShips || 1;
                        const theirShips = targetStar.activeShips || 1;
                        const ratio = myShips / theirShips;
                        const cofactor = GAME_CONFIG.ATTACK_SURGE_FORCE_COFACTOR ?? 0.5;
                        const forceBoost = 1 + Math.log2(Math.max(0.25, ratio)) * cofactor;
                        surgeMax *= Math.max(0.2, forceBoost);
                    }

                    targetX += useDirX * surgePulse * phaseAmplitude * surgeMax * surgeFactor * rampFactor;
                    targetY += useDirY * surgePulse * phaseAmplitude * surgeMax * surgeFactor * rampFactor;
                } else {
                    state.attackRampProgress.delete(star.id);
                    state.surgeLockedDir.delete(star.id);
                }

                // Time-based polar arc interpolation
                const now = performance.now();
                const elapsed = now - ship.settleStartTime;
                const isArrowSettle = ship.arrowSpiralDeg !== undefined && ship.arrowSpiralDeg !== 0;
                const settleDur = isArrowSettle
                    ? (GAME_CONFIG.ARROW_SPIRAL_DURATION_MS ?? 800)
                    : (ship as any).conquestSettle
                        ? (GAME_CONFIG.CONQUEST_SETTLE_MS ?? 500)
                        : GAME_CONFIG.SETTLE_DURATION_MS || 150;

                // Duration 0 = instant snap to orbit
                if (settleDur <= 0) {
                    ship.x = targetX;
                    ship.y = targetY;
                    ship.scale = 0.8;
                    ship.alpha = 1;
                    if (isArrowSettle) {
                        ship.arrowSpiralDeg = undefined;
                        ship.arrowWedgeOffset = undefined;
                    }
                } else {
                    const t = Math.max(0, Math.min(1, elapsed / settleDur));
                    const ease = 1 - Math.pow(1 - t, 3);

                    if (t < 1) {
                        const targetAngle = Math.atan2(targetY - star.y, targetX - star.x);
                        const targetRadius = Math.sqrt((targetX - star.x) ** 2 + (targetY - star.y) ** 2);
                        const curRadius = ship.settleStartRadius + (targetRadius - ship.settleStartRadius) * ease;
                        let angleDelta = targetAngle - ship.settleStartAngle;
                        while (angleDelta > Math.PI) angleDelta -= 2 * Math.PI;
                        while (angleDelta < -Math.PI) angleDelta += 2 * Math.PI;

                        // Spiral revolutions: add extra rotations beyond shortest arc
                        if (isArrowSettle) {
                            const extraRad = (ship.arrowSpiralDeg! * Math.PI) / 180;
                            angleDelta += extraRad;
                        }

                        const curAngle = ship.settleStartAngle + angleDelta * ease;

                        ship.x = star.x + Math.cos(curAngle) * curRadius;
                        ship.y = star.y + Math.sin(curAngle) * curRadius;
                        if (isTrackedShip(ship.id)) traceSettleFrame(ship.id, elapsed, t, ship.x, ship.y, targetX, targetY);
                        ship.scale = 0.8;
                        ship.alpha = 1.0;
                    } else {
                        ship.x = targetX;
                        ship.y = targetY;
                        ship.scale = 0.8;
                        ship.alpha = 1;
                        // Clear arrowhead metadata after settle completes
                        if (isArrowSettle) {
                            ship.arrowSpiralDeg = undefined;
                            ship.arrowWedgeOffset = undefined;
                        }
                    }
                } // close the else block for settleDur > 0

                const baseTier = shipMultiplier > 1 ? Math.floor(Math.log2(shipMultiplier)) : 0;
                const ringTier = Math.max(0, baseTier - slot.layer);

                drawShip(res, colorUtils, ship.x, ship.y, color, ship.scale, ship.alpha, false, shipMultiplier, effectiveOwner, ringTier, i);
            });
        }

        // 3. Damaged Ships
        let damagedShips = state.visualDamagedShips.get(star.id) || [];
        const damageCount = star.damagedShips;

        if (damagedShips.length < damageCount) {
            const diff = damageCount - damagedShips.length;
            for (let i = 0; i < diff; i++) {
                const spawnAngle = Math.random() * Math.PI * 2;
                const spawnR = star.radius + 6;
                const now = performance.now();
                damagedShips.push({
                    id: state.nextShipId++,
                    x: star.x + Math.cos(spawnAngle) * spawnR,
                    y: star.y + Math.sin(spawnAngle) * spawnR,
                    vx: 0, vy: 0,
                    targetIndex: i,
                    scale: 0.1, alpha: 0,
                    spawnTime: now,
                    state: 'orbiting' as const,
                    fromStarId: null, toStarId: null,
                    departTime: 0, travelDuration: 0, departDuration: 0,
                    laneStartX: 0, laneStartY: 0,
                    laneEndX: 0, laneEndY: 0,
                    departFromX: 0, departFromY: 0,
                    arriveToX: 0, arriveToY: 0,
                    arriveStarId: null,
                    laneOffset: 0, staggerDelay: 0,
                    ownerId: star.ownerId,
                    settleStartTime: now,
                    settleStartAngle: spawnAngle,
                    settleStartRadius: spawnR,
                });
            }
        } else if (damagedShips.length > damageCount) {
            damagedShips.length = damageCount;
        }
        state.visualDamagedShips.set(star.id, damagedShips);

        damagedShips.forEach((ship, i) => {
            const damageTime = GAME_CONFIG.STATIC_ORBITS ? 0 : state.animationTime;
            const angle = damageTime * 0.5 + (i * Math.PI * 2) / Math.max(damagedShips.length, 1);
            const radius = 15;
            const tx = star.x + Math.cos(angle) * radius;
            const ty = star.y + Math.sin(angle) * radius;

            ship.x = lerp(ship.x, tx, 0.05);
            ship.y = lerp(ship.y, ty, 0.05);
            ship.scale = lerp(ship.scale, 0.7, 0.1);
            ship.alpha = lerp(ship.alpha, 0.8, 0.1);

            drawShip(res, colorUtils, ship.x, ship.y, color, ship.scale, ship.alpha, true, 1, effectiveOwner);
        });
    });

    // Render in-flight ships
    renderTravelingShips(stars, starsById, state, res, colorUtils);

    // Update frame timestamp for surge ramp delta
    state.lastSurgeFrameTime = performance.now();
}

// ── renderFleets — Legacy fleet overlay ─────────────────────────────────────

/**
 * Render legacy fleet sprites (cluster of ships interpolated along lane).
 */
export function renderFleets(
    stars: StarState[],
    fleets: FleetState[],
    tickProgress: number,
    animationTime: number,
    res: ShipRenderResources,
    colorUtils: ColorUtils,
): void {
    if (!res.shipParticleContainer) return;

    fleets.forEach((fleet) => {
        const source = stars.find((s) => s.id === fleet.sourceId);
        const target = stars.find((s) => s.id === fleet.targetId);
        if (!source || !target) return;

        const color = colorUtils.getPlayerColor(fleet.ownerId);
        const count = fleet.shipCount;
        const visualCount = Math.min(count, 5);

        for (let i = 0; i < visualCount; i++) {
            const lag = i * 0.02;
            const localProgress = Math.max(0, Math.min(1, tickProgress - lag));
            const lx = lerp(source.x, target.x, localProgress);
            const ly = lerp(source.y, target.y, localProgress);
            const jitterX = Math.sin(animationTime * 10 + i) * 5;
            const jitterY = Math.cos(animationTime * 10 + i) * 5;

            drawShip(res, colorUtils, lx + jitterX, ly + jitterY, color, 1.0, 1.0, false, 1, fleet.ownerId);
        }
    });
}

// ── Easing utilities ────────────────────────────────────────────────────────

/** Configurable easing for travel arcs */
export function applyTravelEasing(
    t: number,
    type: 'easeInOut' | 'easeIn' | 'easeOut' | 'linear',
    power: number,
): number {
    switch (type) {
        case 'linear': return t;
        case 'easeIn': return Math.pow(t, power);
        case 'easeOut': return 1 - Math.pow(1 - t, power);
        case 'easeInOut':
        default:
            if (t < 0.5) return Math.pow(2, power - 1) * Math.pow(t, power);
            return 1 - Math.pow(-2 * t + 2, power) / 2;
    }
}

/** Cubic ease in-out */
export function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
