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
import { measurePerf } from '$lib/perf/perfProbe';
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
import { getDirectedLanePolyline } from '$lib/lanes/lanePolylineCache';
import { trimLanePolylineToStarRims } from '$lib/lanes/laneGeometry';
import { computeLaneHeadingForNearside } from '$lib/lanes/applyLaneTravelPath';
import type { ColorUtils, PlayerHSL } from './RenderContext';
import { ORB_DRAW_MODES, type OrbGroup } from './orbModes';

// ── Ship Render State ───────────────────────────────────────────────────────

/** Per-star surge animation state — created from CombatEvent at tick boundary */
export interface SurgeState {
    /** Game time when this surge pulse started */
    startTime: number;
    /** Normalized direction toward target (captured at surge start) */
    dirX: number;
    dirY: number;
}

export interface ShipRenderState {
    /** Ship orbit state per star (mutable — managed by VSM) */
    visualShips: Map<string, VisualShipState[]>;
    /** Damaged ship visual state per star */
    visualDamagedShips: Map<string, VisualShipState[]>;
    /** Ships in flight (mutable array) */
    travelingShips: VisualShipState[];
    /** Stars currently in tick-synced combat (used by VSM, NOT by surge) */
    starsInCombat: Set<string>;
    /** Pending conquest color transitions */
    pendingConquests: Map<string, { previousOwner: string; transitionTime: number }>;
    /** Active surge animations — one per star, created from CombatEvent at tick boundary */
    activeSurges: Map<string, SurgeState>;
    /** Unique ship ID counter */
    nextShipId: number;
    /** Game clock in ms — pause-aware, from FXClock. Use instead of performance.now(). */
    gameNowMs: number;

    /** Whether game is paused */
    isPaused: boolean;
    /** Effective tick duration in ms */
    effectiveTickMs: number;
    /** Tick progress within current tick (0-1) */
    tickProgress: number;
    /** Per-frame counter for arrival batch stagger (reset each frame) */
    _arrivalBatchCount?: number;
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

interface ShipFrameStyle {
    readonly globalScale: number;
    readonly visualRadius: number;
    readonly glowRadius: number;
    readonly glowIntensity: number;
    readonly outlineOn: boolean;
    readonly outlinePx: number;
}

interface IncomingTravelStats {
    count: number;
    sumLaneStartX: number;
    sumLaneStartY: number;
}

interface ShipFrameContext {
    readonly style: ShipFrameStyle;
    readonly incomingByStarId: ReadonlyMap<string, IncomingTravelStats>;
    readonly ownerColorById: Map<string, number>;
    readonly ownerHslById: Map<string, PlayerHSL>;
}

interface CachedAttackHeading {
    readonly ndx: number;
    readonly ndy: number;
}

const attackHeadingCache = new WeakMap<
    ReadonlyArray<readonly [number, number]>,
    Map<string, CachedAttackHeading>
>();

function resolveShipFrameStyle(): ShipFrameStyle {
    return {
        globalScale: GAME_CONFIG.SHIP_SCALE_MULT ?? 1.0,
        visualRadius: GAME_CONFIG.SHIP_VISUAL_RADIUS ?? 3,
        glowRadius: GAME_CONFIG.SHIP_GLOW_RADIUS ?? 0,
        glowIntensity: GAME_CONFIG.SHIP_GLOW_INTENSITY ?? 0,
        outlineOn: GAME_CONFIG.SHIP_OUTLINE_ON !== false,
        outlinePx: GAME_CONFIG.SHIP_OUTLINE_PX ?? 1.0,
    };
}

function buildIncomingTravelStats(travelingShips: readonly VisualShipState[]): Map<string, IncomingTravelStats> {
    const incomingByStarId = new Map<string, IncomingTravelStats>();
    for (const ship of travelingShips) {
        const toStarId = ship.toStarId;
        if (!toStarId) continue;
        let stats = incomingByStarId.get(toStarId);
        if (!stats) {
            stats = { count: 0, sumLaneStartX: 0, sumLaneStartY: 0 };
            incomingByStarId.set(toStarId, stats);
        }
        stats.count += 1;
        stats.sumLaneStartX += ship.laneStartX;
        stats.sumLaneStartY += ship.laneStartY;
    }
    return incomingByStarId;
}

function createShipFrameContext(state: ShipRenderState): ShipFrameContext {
    return {
        style: resolveShipFrameStyle(),
        incomingByStarId: buildIncomingTravelStats(state.travelingShips),
        ownerColorById: new Map<string, number>(),
        ownerHslById: new Map<string, PlayerHSL>(),
    };
}

function getCachedOwnerColor(
    frame: ShipFrameContext,
    colorUtils: ColorUtils,
    ownerId: string | null | undefined,
): number {
    const key = ownerId ?? '';
    const cached = frame.ownerColorById.get(key);
    if (cached !== undefined) return cached;
    const color = colorUtils.getPlayerColor(key);
    frame.ownerColorById.set(key, color);
    return color;
}

function getCachedOwnerHsl(
    frame: ShipFrameContext,
    colorUtils: ColorUtils,
    ownerId: string,
): PlayerHSL {
    const cached = frame.ownerHslById.get(ownerId);
    if (cached) return cached;
    const hsl = colorUtils.getPlayerHSL(ownerId);
    frame.ownerHslById.set(ownerId, hsl);
    return hsl;
}

function getCachedAttackHeading(
    source: StarState,
    target: StarState,
): CachedAttackHeading {
    const rawLane = getDirectedLanePolyline(source.id, target.id);
    if (!rawLane || rawLane.length < 2) {
        return computeLaneHeadingForNearside(source, target, undefined);
    }

    let headingsByShape = attackHeadingCache.get(rawLane);
    if (!headingsByShape) {
        headingsByShape = new Map<string, CachedAttackHeading>();
        attackHeadingCache.set(rawLane, headingsByShape);
    }

    const shapeKey =
        `${source.x}:${source.y}:${source.radius}|` +
        `${target.x}:${target.y}:${target.radius}|5`;
    const cached = headingsByShape.get(shapeKey);
    if (cached) return cached;

    const trimmed = trimLanePolylineToStarRims(rawLane, source, target, 5);
    const heading = computeLaneHeadingForNearside(
        source,
        target,
        trimmed.length >= 2 ? trimmed : undefined,
    );
    headingsByShape.set(shapeKey, heading);
    return heading;
}

// ── drawShip — Low-level particle placement ─────────────────────────────────

/**
 * Draw a single ship via particle pool.
 * Creates outline particle (backing circle) + fill particle + optional damage indicator.
 */
export function drawShip(
    res: ShipRenderResources,
    colorUtils: ColorUtils,
    frame: ShipFrameContext | undefined,
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

    const style = frame?.style ?? resolveShipFrameStyle();
    const pixelSize = style.visualRadius * scale * style.globalScale;
    const spriteScale = (pixelSize * 2) / 128;

    // Ring-based density coloring
    let fillColor = color;
    if (ringTier > 0 && ownerId) {
        const playerHsl = frame
            ? getCachedOwnerHsl(frame, colorUtils, ownerId)
            : colorUtils.getPlayerHSL(ownerId);
        const darken = GAME_CONFIG.DENSITY_DARKEN_ALT && shipIndex % 2 === 1;
        fillColor = colorUtils.getDensityFillColor(playerHsl, ringTier, darken);
    }

    // === Radial glow sprite (F-75 Option 3) ===
    const glowRadius = style.glowRadius;
    const glowIntensity = style.glowIntensity;
    if (glowRadius > 0 && glowIntensity > 0) {
        const glowPixels = pixelSize * glowRadius * 0.5;
        const glowScale = (glowPixels * 2) / 128;
        const glowColor = colorUtils.getLightenedColor(color, glowIntensity);
        let glowP: PIXI.Particle;
        if (res.shipParticleIndex < shipParticlePool.length) {
            glowP = shipParticlePool[res.shipParticleIndex];
        } else {
            glowP = new PIXI.Particle({
                texture: shipCircleTexture,
                anchorX: 0.5,
                anchorY: 0.5,
            });
            shipParticlePool.push(glowP);
            shipParticleContainer.addParticle(glowP);
        }
        glowP.x = x;
        glowP.y = y;
        glowP.scaleX = glowScale;
        glowP.scaleY = glowScale;
        glowP.tint = glowColor;
        glowP.alpha = alpha * glowIntensity;
        res.shipParticleIndex++;
    }

    // === Outline: backing circle (F-75 Option 2: brightened outline) ===
    if (style.outlineOn) {
        const outlinePx = style.outlinePx;
        const outlineScale = ((pixelSize + outlinePx) * 2) / 128;
        // F-75: Lighten outline color by SHIP_GLOW_INTENSITY
        const outlineColor = glowIntensity > 0
            ? colorUtils.getLightenedColor(color, glowIntensity)
            : color;
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
        outlineP.tint = outlineColor;
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
    frame: ShipFrameContext,
): void {
    if (!res.shipParticleContainer) return;

    const now = state.gameNowMs;

    const stillTraveling: VisualShipState[] = [];
    state._arrivalBatchCount = 0; // Reset per-frame batch counter

    // Track conquest ship arrivals per star for post-pass engulf ring distribution
    const conquestArrivals = new Map<string, { ships: VisualShipState[], star: { x: number; y: number } }>();

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
        followLanePath: GAME_CONFIG.TRAVEL_FOLLOW_LANE_PATHS ?? true,
    };

    // Animation speed scaling: multiply elapsed by speedMultiplier
    // so the slider directly controls ship travel/depart visual speed.
    // >1 = faster animations, <1 = slower animations.
    const animSpeedMult = animationStore.speedMultiplier;

    for (const ship of state.travelingShips) {
        const elapsed = now - ship.departTime;

        if (elapsed < 0) {
            stillTraveling.push(ship);
            const color = getCachedOwnerColor(frame, colorUtils, ship.ownerId);
            drawShip(res, colorUtils, frame, ship.x, ship.y, color, ship.scale, ship.alpha, false, 1, ship.ownerId);
            continue;
        }

        const color = getCachedOwnerColor(frame, colorUtils, ship.ownerId);

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
                // Apply force-proportional glow for conquest ships
                const cfs = (ship as any).conquestForceScale ?? 1;
                const drawAlpha = Math.min(1, ship.alpha * cfs);
                const drawScale = ship.scale * (1 + (cfs - 1) * 0.3); // subtle size boost
                drawShip(res, colorUtils, frame, ship.x, ship.y, color, drawScale, drawAlpha, false, cfs, ship.ownerId);
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
                    if (arrivalSpread > 0) {
                        const tickMs = state.effectiveTickMs || 1000;
                        const staggerWindow = tickMs * arrivalSpread;
                        // Use ship's arrival index within THIS batch (not total orbit count)
                        // to spread settle starts across the stagger window
                        const batchIdx: number = state._arrivalBatchCount ?? 0;
                        state._arrivalBatchCount = (batchIdx + 1);
                        const batchSpacing = Math.min(staggerWindow / Math.max(1, batchIdx + 1), 50);
                        staggerOffset = batchIdx * batchSpacing;
                    }
                    ship.settleStartTime = state.gameNowMs + staggerOffset;
                    ship.settleStartAngle = arrAngle;
                    const arrivalArcExtra =
                        (phaseCtx.arrivalArcIntensity ?? 0) *
                        Math.max(6, Math.abs(ship.laneOffset || 0));
                    ship.settleStartRadius = arrR + arrivalArcExtra;
                    ship.x =
                        destStar.x +
                        Math.cos(ship.settleStartAngle) *
                            ship.settleStartRadius;
                    ship.y =
                        destStar.y +
                        Math.sin(ship.settleStartAngle) *
                            ship.settleStartRadius;
                    if (isTrackedShip(ship.id)) {
                        traceTravelToOrbit(
                            ship.id,
                            ship.x,
                            ship.y,
                            arrAngle,
                            ship.settleStartRadius,
                            destStar.x,
                            destStar.y,
                        );
                    }
                    destShips.push(ship);
                    state.visualShips.set(destStar.id, destShips);

                    // Track conquest arrivals for post-pass engulf ring distribution
                    if ((ship as any).conquestSettle) {
                        let list = conquestArrivals.get(destStar.id);
                        if (!list) {
                            list = { ships: [], star: destStar };
                            conquestArrivals.set(destStar.id, list);
                        }
                        list.ships.push(ship);
                    }
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
                    const cfs = (ship as any).conquestForceScale ?? 1;
                    const drawAlpha = Math.min(1, ship.alpha * cfs);
                    const drawScale = ship.scale * (1 + (cfs - 1) * 0.3);
                    drawShip(res, colorUtils, frame, ship.x, ship.y, color, drawScale, drawAlpha, false, cfs, ship.ownerId);
                }
                stillTraveling.push(ship);
            }
        }
    }

    // ── Post-pass: distribute conquest arrivals evenly around engulf ring ──
    // This runs AFTER all ships have arrived, so we know the exact count
    // and can use a consistent denominator for even 2π distribution.
    for (const [starId, { ships: cShips, star: cStar }] of conquestArrivals) {
        const n = cShips.length;
        if (n <= 1) continue;
        // Base angle: direction from first ship's arrival (preserved from arrAngle)
        const baseAngle = cShips[0].settleStartAngle;
        for (let i = 0; i < n; i++) {
            const angle = baseAngle + (i / n) * (2 * Math.PI);
            const r = cShips[i].settleStartRadius;
            cShips[i].settleStartAngle = angle;
            cShips[i].x = cStar.x + Math.cos(angle) * r;
            cShips[i].y = cStar.y + Math.sin(angle) * r;
        }
    }

    // Draw orbs using the selected draw mode
    if (GAME_CONFIG.ORB_TRAVEL && orbGroups.size > 0 && res.orbGraphics) {
        const drawMode = ORB_DRAW_MODES[GAME_CONFIG.ORB_DRAW_MODE] || ORB_DRAW_MODES.mode1;
        for (const [, group] of orbGroups) {
            const orbGroup: OrbGroup = {
                cx: group.sumX / group.count,
                cy: group.sumY / group.count,
                count: group.count,
                color: group.color,
                ownerId: group.ownerId,
            };
            drawMode.draw(orbGroup, res.orbGraphics, GAME_CONFIG);
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
    const frame = measurePerf('game.renderFrame.ships.context', () =>
        createShipFrameContext(state),
    );

    measurePerf('game.renderFrame.ships.orbitals', () => {
        stars.forEach((star) => {
        // Delayed star color
        let effectiveOwner = star.ownerId;
        const pending = state.pendingConquests.get(star.id);
        if (pending) {
            const conquestCheckNow = state.gameNowMs;
            if (conquestCheckNow < pending.transitionTime) {
                effectiveOwner = pending.previousOwner;
            } else {
                state.pendingConquests.delete(star.id);
            }
        }
        const color = getCachedOwnerColor(frame, colorUtils, effectiveOwner);

        // 1. Manage Active Ships State
        let ships = state.visualShips.get(star.id) || [];
        const incomingTravelStats = frame.incomingByStarId.get(star.id);
        const inFlightToStar = incomingTravelStats?.count ?? 0;
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
                const now = state.gameNowMs;
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
                    settleStartTime: -1e9,  // Already settled — no animation for initial spawns
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
            const targetStar = hasTarget && star.targetId ? (starsById.get(star.targetId) ?? null) : null;
            const isAttack = hasTarget && targetStar && targetStar.ownerId !== star.ownerId;

            let dirX = 0, dirY = 0;
            if (targetStar) {
                const heading = getCachedAttackHeading(star, targetStar);
                dirX = heading.ndx;
                dirY = heading.ndy;
            }

            ships.forEach((ship, i) => {
                if (ship.targetIndex !== i) {
                    ship.settleStartTime = state.gameNowMs;
                    ship.settleStartAngle = Math.atan2(ship.y - star.y, ship.x - star.x);
                    ship.settleStartRadius = Math.sqrt((ship.x - star.x) ** 2 + (ship.y - star.y) ** 2);
                }
                ship.targetIndex = i;

                const shipPhase = (ship.id % 17) / 17;

                // Orbit slot
                const orbitTime = GAME_CONFIG.STATIC_ORBITS ? 0
                    : (state.gameNowMs / 1000);
                const biasAngle = targetStar
                    ? Math.atan2(targetStar.y - star.y, targetStar.x - star.x)
                    : undefined;

                let biasStrength: number;
                if (!targetStar) {
                    biasStrength = 0;
                } else if (GAME_CONFIG.ORBIT_BIAS_OSCILLATE) {
                    const freq = GAME_CONFIG.ORBIT_BIAS_FREQ ?? 1.0;
                    const effectiveTick = state.effectiveTickMs;
                    const orbitFxTime = GAME_CONFIG.STATIC_ORBITS ? 0
                        : (state.gameNowMs / 1000);
                    const phase = Math.sin((orbitFxTime / effectiveTick) * freq * Math.PI * 2);
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

                // ATTACK SURGE V2 — per-tick event-driven discrete pulse
                // Triggered by CombatEvent at tick boundary, plays for SURGE_DURATION_MS,
                // always completes. Render-only offset (not baked into ship.x/ship.y).
                let surgeOffsetX = 0;
                let surgeOffsetY = 0;
                const surge = state.activeSurges.get(star.id);
                if (surge && isAttack && targetStar) {
                    // Speed-scale surge timing
                    const surgeSpeedScale = (state.effectiveTickMs || GAME_CONFIG.BASE_TICK_MS) / GAME_CONFIG.BASE_TICK_MS;
                    const surgeDur = (GAME_CONFIG.SURGE_PULSE_DURATION_MS || GAME_CONFIG.BASE_TICK_MS) * surgeSpeedScale;
                    const elapsed = state.gameNowMs - surge.startTime;
                    const progress = Math.min(1, elapsed / surgeDur);

                    // Ramp: first N ms ramp from 0→1 (cubic ease-out)
                    const rampMs = (GAME_CONFIG.ATTACK_SURGE_RAMP_MS ?? 300) * surgeSpeedScale;
                    const rampFactor = rampMs > 0
                        ? 1 - Math.pow(1 - Math.min(1, elapsed / rampMs), 3)
                        : 1;

                    // Pulse: single sine half-wave (0→1→0)
                    const rawPulse = Math.sin(progress * Math.PI);
                    const surgeShape = GAME_CONFIG.ATTACK_SURGE_SHAPE ?? 1;
                    const surgePulse = surgeShape === 1 ? rawPulse : Math.pow(rawPulse, surgeShape);

                    // Per-ship facing factor: ships facing enemy pulse more
                    const shipDx = slot.x - star.x;
                    const shipDy = slot.y - star.y;
                    const shipDist = Math.sqrt(shipDx * shipDx + shipDy * shipDy) || 1;
                    const facingFactor = (shipDx / shipDist) * surge.dirX + (shipDy / shipDist) * surge.dirY;
                    const surgeFactor = Math.max(0, facingFactor) ** 1.5;

                    // Per-ship phase variation: ±25% amplitude
                    const phaseAmplitude = 0.75 + 0.25 * Math.sin(shipPhase * Math.PI * 2);

                    // Amplitude
                    let surgeMax = star.radius * (GAME_CONFIG.ATTACK_SURGE_MULT ?? 0.4);
                    if (GAME_CONFIG.ATTACK_SURGE_PROPORTIONAL && targetStar) {
                        const ratio = (star.activeShips || 1) / (targetStar.activeShips || 1);
                        const cofactor = GAME_CONFIG.ATTACK_SURGE_FORCE_COFACTOR ?? 0.5;
                        const forceBoost = 1 + Math.log2(Math.max(0.25, ratio)) * cofactor;
                        surgeMax *= Math.max(0.2, forceBoost);
                    }

                    surgeOffsetX = surge.dirX * surgePulse * phaseAmplitude * surgeMax * surgeFactor * rampFactor;
                    surgeOffsetY = surge.dirY * surgePulse * phaseAmplitude * surgeMax * surgeFactor * rampFactor;

                    // Clean up completed surges (only need to check once per star, not per ship)
                    if (progress >= 1 && i === 0) {
                        state.activeSurges.delete(star.id);
                    }
                }

                // Time-based polar arc interpolation
                const now = state.gameNowMs;
                const elapsed = now - ship.settleStartTime;
                const isArrowSettle = ship.arrowSpiralDeg !== undefined && ship.arrowSpiralDeg !== 0;
                // Speed-scale: compress settle/spiral durations by game speed
                const speedScale = (state.effectiveTickMs || GAME_CONFIG.BASE_TICK_MS) / GAME_CONFIG.BASE_TICK_MS;
                const settleDur = (isArrowSettle
                    ? (GAME_CONFIG.ARROW_SPIRAL_DURATION_MS ?? 800)
                    : (ship as any).conquestSettle
                        ? (GAME_CONFIG.CONQUEST_SETTLE_MS ?? 500)
                        : GAME_CONFIG.SETTLE_DURATION_MS || 150) * speedScale;

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

                // Apply surge offset at render time only — ship.x/ship.y remain at clean orbit position
                drawShip(res, colorUtils, frame, ship.x + surgeOffsetX, ship.y + surgeOffsetY, color, ship.scale, ship.alpha, false, shipMultiplier, effectiveOwner, ringTier, i);
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
                const now = state.gameNowMs;
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

        let dangerDx = 0, dangerDy = 0;
        if (GAME_CONFIG.DAMAGED_ORBIT_EVADE) {
            // Add vector towards target if attacking
            if (star.targetId !== null) {
                const targetStar = starsById.get(star.targetId);
                if (targetStar) {
                    dangerDx += targetStar.x - star.x;
                    dangerDy += targetStar.y - star.y;
                }
            }
            // Add vectors from incoming ships
            if (incomingTravelStats) {
                dangerDx += incomingTravelStats.sumLaneStartX - star.x * incomingTravelStats.count;
                dangerDy += incomingTravelStats.sumLaneStartY - star.y * incomingTravelStats.count;
            }
        }

        const hasDanger = dangerDx !== 0 || dangerDy !== 0;
        const safeAngle = hasDanger ? Math.atan2(-dangerDy, -dangerDx) : 0;

        damagedShips.forEach((ship, i) => {
            const damageTime = GAME_CONFIG.STATIC_ORBITS ? 0
                : (state.gameNowMs / 1000);

            let angle = 0;
            if (GAME_CONFIG.DAMAGED_ORBIT_EVADE && hasDanger) {
                // Cluster on the safe side, wavering slightly
                const spread = Math.PI * 0.8; // 144 degrees spread
                const offset = (i / Math.max(damagedShips.length - 1, 1) - 0.5) * spread;
                const waver = Math.sin(damageTime * 2 + i) * 0.15;
                angle = safeAngle + offset + waver;
            } else {
                // Normal spinning orbit
                angle = damageTime * 0.5 + (i * Math.PI * 2) / Math.max(damagedShips.length, 1);
            }

            const radius = GAME_CONFIG.DAMAGED_ORBIT_RADIUS ?? 15;
            const tx = star.x + Math.cos(angle) * radius;
            const ty = star.y + Math.sin(angle) * radius;

            ship.x = lerp(ship.x, tx, 0.05);
            ship.y = lerp(ship.y, ty, 0.05);
            ship.scale = lerp(ship.scale, GAME_CONFIG.DAMAGED_SHIP_SCALE ?? 0.7, 0.1);
            ship.alpha = lerp(ship.alpha, 0.8, 0.1);

            drawShip(res, colorUtils, frame, ship.x, ship.y, color, ship.scale, ship.alpha, true, 1, effectiveOwner);
        });
        });
    });

    // Render in-flight ships
    measurePerf('game.renderFrame.ships.travel', () => {
        renderTravelingShips(stars, starsById, state, res, colorUtils, frame);
    });

}

// ── renderFleets — Legacy fleet overlay ─────────────────────────────────────

/**
 * Render legacy fleet sprites (cluster of ships interpolated along lane).
 */
export function renderFleets(
    stars: StarState[],
    fleets: FleetState[],
    tickProgress: number,
    gameNowMs: number,
    res: ShipRenderResources,
    colorUtils: ColorUtils,
): void {
    if (!res.shipParticleContainer) return;

    const animTime = gameNowMs / 1000; // Derive seconds from canonical clock
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
            const jitterX = Math.sin(animTime * 10 + i) * 5;
            const jitterY = Math.cos(animTime * 10 + i) * 5;

            drawShip(res, colorUtils, undefined, lx + jitterX, ly + jitterY, color, 1.0, 1.0, false, 1, fleet.ownerId);
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
