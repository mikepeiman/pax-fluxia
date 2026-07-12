/**
 * PowerVectorFamily — the PowerCore vector skin.
 *
 * ONE representation for idle AND morph: per-owner region rings (fills) + chained
 * frontier / world-border polylines (borders), all Chaikin-smoothed from a SINGLE
 * source (the shared-edge graph). A conquest sweep is NOT drawn as raw moving
 * cells — each frame's cell set (frozen + moving bubble) is run through
 * buildSurfaceFromCells (the same buildSharedEdgeGraph → smoothSharedEdges →
 * walkRegionLoops assembly the idle snapshot uses), so every transition frame is
 * a complete, watertight, owner-MERGED, ROUNDED map. Fills and borders read the
 * identical smoothed boundary, so they cannot tear or mismatch — and any VFX that
 * works on the idle surface works on the sweep, because they are the same thing.
 *
 * IDLE takes the resolved snapshot (already smoothed at source by the kernel's
 * chain-aware smoothSharedEdges) and draws it raw — no family-level re-smoothing
 * (that would double-round). MORPH rebuilds + smooths the surface per frame.
 *
 * Live controls (unified Territory surface): TERRITORY_SURFACE_FILL_ENABLED /
 * SATURATION / LIGHTNESS / ALPHA, TERRITORY_SURFACE_BORDER_ENABLED / WIDTH /
 * SATURATION / LIGHTNESS / ALPHA / BORDER_BLEND, and VORONOI_BORDER_SMOOTH
 * (corner rounding — applied at source for idle, per-frame for morph).
 *
 * Coordinate spaces: kinetic cells are WORLD coords; the resolved snapshot is
 * ALREADY localized by the caller. dx/dy = −world.min localizes the morph cells.
 */

import * as PIXI from 'pixi.js';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import { adjustColorHSL, blendColors } from '$lib/utils/colorUtils';
import {
    getActiveKineticFrame,
    getEndSnapFixMode,
    getSettledSurfaceForConverge,
} from '../../geometry/powerCore/kineticRuntimeBridge';
import {
    buildSurfaceFromCells,
    convergeSurface,
    cutSurfaceByFront,
} from '../../geometry/powerCore/buildSurfaceFromCells';
import { conquestConvergeBlend } from '../../geometry/powerCore/sampleKineticFrame';
import {
    WORLD_OWNER,
    type PowerCell,
} from '../../geometry/powerCore/powerCoreTypes';
import {
    readTunableBoolean,
    readTunableNumber,
} from '../metaball/metaballSceneBase';
import type {
    RenderFamily,
    RenderFamilyInput,
    RenderFamilyOutput,
} from '../RenderFamilyTypes';

interface SurfaceStyle {
    fillEnabled: boolean;
    fillSat: number;
    fillLight: number;
    fillAlpha: number;
    borderEnabled: boolean;
    borderWidth: number;
    borderSat: number;
    borderLight: number;
    borderAlpha: number;
    borderBlend: boolean;
}

function readSurfaceStyle(input: RenderFamilyInput): SurfaceStyle {
    return {
        fillEnabled: readTunableBoolean(input, 'TERRITORY_SURFACE_FILL_ENABLED', true),
        fillSat: readTunableNumber(input, 'TERRITORY_SURFACE_SATURATION', 1.05),
        fillLight: readTunableNumber(input, 'TERRITORY_SURFACE_LIGHTNESS', 0.65),
        fillAlpha: Math.max(0, Math.min(1, readTunableNumber(input, 'TERRITORY_SURFACE_ALPHA', 0.5))),
        borderEnabled: readTunableBoolean(input, 'TERRITORY_SURFACE_BORDER_ENABLED', true),
        borderWidth: Math.max(0, readTunableNumber(input, 'TERRITORY_SURFACE_BORDER_WIDTH', 3)),
        borderSat: readTunableNumber(input, 'TERRITORY_SURFACE_BORDER_SATURATION', 1),
        borderLight: readTunableNumber(input, 'TERRITORY_SURFACE_BORDER_LIGHTNESS', 1),
        borderAlpha: Math.max(0, Math.min(1, readTunableNumber(input, 'TERRITORY_SURFACE_BORDER_ALPHA', 1))),
        borderBlend: readTunableBoolean(input, 'TERRITORY_SURFACE_BORDER_BLEND', false),
    };
}

function styleKey(style: SurfaceStyle): string {
    return [
        style.fillEnabled ? 1 : 0, style.fillSat, style.fillLight, style.fillAlpha,
        style.borderEnabled ? 1 : 0, style.borderWidth, style.borderSat,
        style.borderLight, style.borderAlpha, style.borderBlend ? 1 : 0,
    ].join(':');
}

/** Corner-rounding passes (VORONOI_BORDER_SMOOTH), clamped to a sane range. */
function readSmoothPasses(input: RenderFamilyInput): number {
    return Math.max(0, Math.min(6, Math.round(readTunableNumber(input, 'VORONOI_BORDER_SMOOTH', 0))));
}

const POWER_VECTOR_TUNABLE_KEYS = [
    'TERRITORY_SURFACE_FILL_ENABLED',
    'TERRITORY_SURFACE_SATURATION',
    'TERRITORY_SURFACE_LIGHTNESS',
    'TERRITORY_SURFACE_ALPHA',
    'TERRITORY_SURFACE_BORDER_ENABLED',
    'TERRITORY_SURFACE_BORDER_WIDTH',
    'TERRITORY_SURFACE_BORDER_SATURATION',
    'TERRITORY_SURFACE_BORDER_LIGHTNESS',
    'TERRITORY_SURFACE_BORDER_ALPHA',
    'TERRITORY_SURFACE_BORDER_BLEND',
    'VORONOI_BORDER_SMOOTH',
] as const;

type Ring = readonly (readonly [number, number])[];

/** Ray-cast point-in-polygon test. */
function pointInRing(x: number, y: number, ring: Ring): boolean {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i]![0];
        const yi = ring[i]![1];
        const xj = ring[j]![0];
        const yj = ring[j]![1];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
            inside = !inside;
        }
    }
    return inside;
}

/** True iff EVERY vertex of `inner` lies inside `outer` (fully enclosed). */
function regionEnclosedBy(inner: Ring, outer: Ring): boolean {
    if (inner.length === 0) return false;
    for (const [x, y] of inner) {
        if (!pointInRing(x, y, outer)) return false;
    }
    return true;
}

/** FNV-1a hash of a ring at 1/64px precision — stable frame-to-frame for a cell
 *  whose geometry is unchanged (static), different the moment it moves (swept).
 *  Used to skip re-tessellating the static cells every morph frame. */
function hashRing(points: Ring): number {
    let h = 2166136261;
    for (const p of points) {
        const qx = (p[0] * 64) | 0;
        const qy = (p[1] * 64) | 0;
        h = Math.imul(h ^ (qx & 0xffff), 16777619);
        h = Math.imul(h ^ ((qx >>> 16) & 0xffff), 16777619);
        h = Math.imul(h ^ (qy & 0xffff), 16777619);
        h = Math.imul(h ^ ((qy >>> 16) & 0xffff), 16777619);
    }
    return (Math.imul(h ^ points.length, 16777619)) >>> 0;
}

/** Minimal shapes the draw methods accept (idle snapshot + morph surface). */
interface FillRegion {
    readonly ownerId: string;
    readonly points: Ring;
}
interface BorderLine {
    readonly ownerA: string;
    readonly ownerB: string;
    readonly points: Ring;
}

export class PowerVectorFamily implements RenderFamily {
    readonly id = 'power_vector';
    readonly label = 'Power Vector';
    readonly tunableKeys: readonly string[] = POWER_VECTOR_TUNABLE_KEYS;

    private readonly root = new PIXI.Container();
    /** Idle fills (single cached Graphics; rebuilt only on geometry/style change). */
    private readonly fillG = new PIXI.Graphics();
    /** Morph fills: ONE small Graphics per cell, pooled by geometry+owner hash.
     *  Per frame only the changed cells are added/removed — O(changed), never a
     *  full rebuild (the old static-layer scheme re-tessellated the WHOLE map
     *  twice at every conquest start: frame 1 all-dynamic, frame 2 static-set
     *  rebuild — a large part of the conquest-event lag spike). */
    private readonly morphFillC = new PIXI.Container();
    private readonly morphFillPool = new Map<number, PIXI.Graphics>();
    private morphFillFrameKey: string | null = null;
    /** Borders (idle: cached by key; morph: redrawn per frame). */
    private readonly borderG = new PIXI.Graphics();
    private readonly colorUtils: ColorUtils;
    private fillKey: string | null = null;
    private borderKey: string | null = null;
    private fillHexCache = new Map<string, number>();
    private borderHexCache = new Map<string, number>();
    private colorCacheKey = '';

    constructor(colorUtils: ColorUtils) {
        this.colorUtils = colorUtils;
        // z-order: idle fills, morph fill pool, then borders on top.
        this.root.addChild(this.fillG, this.morphFillC, this.borderG);
    }

    get displayRoot(): PIXI.Container {
        return this.root;
    }

    private fillColor(ownerId: string, style: SurfaceStyle): number {
        let hex = this.fillHexCache.get(ownerId);
        if (hex === undefined) {
            hex = adjustColorHSL(this.colorUtils.getPlayerColor(ownerId), style.fillSat, style.fillLight);
            this.fillHexCache.set(ownerId, hex);
        }
        return hex;
    }

    private borderColor(ownerId: string, style: SurfaceStyle): number {
        let hex = this.borderHexCache.get(ownerId);
        if (hex === undefined) {
            hex = adjustColorHSL(this.colorUtils.getPlayerColor(ownerId), style.borderSat, style.borderLight);
            this.borderHexCache.set(ownerId, hex);
        }
        return hex;
    }

    /** Fills each region + cuts any different-owner region fully enclosed in it,
     *  so colours stay pure under alpha (rounded island inside rounded outer). */
    private drawFills(
        regions: readonly FillRegion[],
        dx: number,
        dy: number,
        style: SurfaceStyle,
    ): void {
        this.fillG.clear();
        const valid = regions.filter((r) => r.points.length >= 3);
        for (const region of valid) {
            const flat: number[] = [];
            for (const [px, py] of region.points) flat.push(px + dx, py + dy);
            this.fillG.poly(flat).fill({
                color: this.fillColor(region.ownerId, style),
                alpha: style.fillAlpha,
            });
            for (const other of valid) {
                if (other === region || other.ownerId === region.ownerId) continue;
                if (!regionEnclosedBy(other.points, region.points)) continue;
                const hole: number[] = [];
                for (const [px, py] of other.points) hole.push(px + dx, py + dy);
                this.fillG.poly(hole).cut();
            }
        }
    }

    /** FNV string hash (for the owner id, mixed into the cell-fill key). */
    private static hashStr(s: string): number {
        let h = 2166136261;
        for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
        return h >>> 0;
    }

    /** Pooled morph fills: one small Graphics per cell fill, keyed by geometry+
     *  owner hash. Unchanged cells keep their already-tessellated Graphics;
     *  changed cells are the only earcut work — O(changed) per frame with NO
     *  full-map rebuilds (each fill is a single simple polygon, so earcut stays
     *  linear; batching many contours into one fill() was the O(n²) trap). */
    private drawCellFillsPooled(
        regions: readonly FillRegion[],
        dx: number,
        dy: number,
        sKey: string,
        style: SurfaceStyle,
    ): void {
        const frameKey = `${sKey}:${Math.round(dx * 16)}:${Math.round(dy * 16)}`;
        if (this.morphFillFrameKey !== frameKey) {
            // Style or offset changed (colours/positions are baked in) — reset.
            this.resetMorphFillPool();
            this.morphFillFrameKey = frameKey;
        }
        const seen = new Set<number>();
        for (const region of regions) {
            if (region.points.length < 3) continue;
            const h = (hashRing(region.points) ^ PowerVectorFamily.hashStr(region.ownerId)) >>> 0;
            if (seen.has(h)) continue; // exact duplicate — one draw is enough
            seen.add(h);
            if (this.morphFillPool.has(h)) continue; // already tessellated
            const g = new PIXI.Graphics();
            const flat: number[] = [];
            for (const [px, py] of region.points) flat.push(px + dx, py + dy);
            g.poly(flat).fill({
                color: this.fillColor(region.ownerId, style),
                alpha: style.fillAlpha,
            });
            this.morphFillPool.set(h, g);
            this.morphFillC.addChild(g);
        }
        // Drop cells that vanished this frame.
        for (const [h, g] of this.morphFillPool) {
            if (seen.has(h)) continue;
            this.morphFillC.removeChild(g);
            g.destroy();
            this.morphFillPool.delete(h);
        }
    }

    private resetMorphFillPool(): void {
        for (const g of this.morphFillPool.values()) {
            this.morphFillC.removeChild(g);
            g.destroy();
        }
        this.morphFillPool.clear();
    }

    /** Strokes inter-owner frontiers (optionally 50/50 opponent-blended) and
     *  owner↔world borders (single owner colour). One stroke per polyline. */
    private drawBorders(
        frontiers: readonly BorderLine[],
        worldBorders: readonly BorderLine[],
        dx: number,
        dy: number,
        style: SurfaceStyle,
    ): void {
        this.borderG.clear();
        const strokeOne = (line: BorderLine) => {
            const pts = line.points;
            if (pts.length < 2) return;
            const color =
                style.borderBlend && line.ownerB && line.ownerB !== WORLD_OWNER
                    ? blendColors(
                          this.borderColor(line.ownerA, style),
                          this.borderColor(line.ownerB, style),
                          0.5,
                      )
                    : this.borderColor(line.ownerA, style);
            this.borderG.moveTo(pts[0]![0] + dx, pts[0]![1] + dy);
            for (let i = 1; i < pts.length; i++) {
                this.borderG.lineTo(pts[i]![0] + dx, pts[i]![1] + dy);
            }
            this.borderG.stroke({
                width: style.borderWidth,
                color,
                alpha: style.borderAlpha,
                join: 'round',
                cap: 'round',
            });
        };
        for (const f of frontiers) strokeOne(f);
        for (const w of worldBorders) strokeOne(w);
    }

    update(input: RenderFamilyInput): RenderFamilyOutput {
        const style = readSurfaceStyle(input);
        const sKey = styleKey(style);
        if (sKey !== this.colorCacheKey) {
            this.fillHexCache.clear();
            this.borderHexCache.clear();
            this.colorCacheKey = sKey;
        }

        const frame = getActiveKineticFrame();
        const geometry = input.geometry ?? null;
        const dx = -(input.world.minX ?? 0);
        const dy = -(input.world.minY ?? 0);
        const smoothPasses = readSmoothPasses(input);

        if (frame) {
            // ── MORPH: one smoothed surface per frame (same assembly as idle),
            // so the sweep is a complete, watertight, rounded, owner-merged map.
            // buildSurfaceFromCells derives the clip rect from the cells' own
            // bbox (the live kinetic clip is PADDED past input.world — passing the
            // frame here would classify no world edges ⇒ empty regions ⇒ fills
            // vanish mid-morph). dx/dy still localizes rendering to the container.
            const cells: PowerCell[] = [...frame.frozenCells, ...frame.bubbleCells];
            // END_SNAP_FIX_EVAL: three-way switch (topbar SNAPFIX toggle).
            //  off      — today's pipeline (split-then-round; known ~9px end-snap)
            //  converge — project the final approach onto the SETTLED surface
            //             (like-to-like: per-siteId fills, per-pair frontiers)
            //  round_cut— cells arrived UNSPLIT (idle-identical rounding); apply
            //             the conquest cut AFTER rounding (field classification)
            const endSnapMode = getEndSnapFixMode();
            let surface = buildSurfaceFromCells(cells, smoothPasses);
            if (endSnapMode === 'converge') {
                const settled = getSettledSurfaceForConverge(smoothPasses);
                const blend = settled ? conquestConvergeBlend(frame.p) : 0;
                if (settled && blend > 0) {
                    surface = convergeSurface(surface, { settled, blend });
                }
            } else if (endSnapMode === 'round_cut' && frame.conquestCuts?.length) {
                surface = cutSurfaceByFront(surface, frame.conquestCuts);
            }

            // Fills: SMOOTHED per-cell (single-owner ⇒ no bucket-fill; owner edges
            // rounded to match the borders). POOLED: unchanged cells keep their
            // tessellation; only changed cells earcut — O(changed) per frame.
            if (this.fillKey !== 'morph') {
                // Entering the morph: the idle Graphics would double-darken under
                // the pool (alpha fills) — clear it once.
                this.fillG.clear();
            }
            if (style.fillEnabled) {
                this.drawCellFillsPooled(surface.cellFills, dx, dy, sKey, style);
            } else {
                this.resetMorphFillPool();
            }

            // Borders: merged + smoothed inter-owner frontiers (same smoothed graph).
            if (style.borderEnabled) {
                this.drawBorders(surface.frontiers, surface.worldBorders, dx, dy, style);
            } else this.borderG.clear();

            // The idle caches are now stale (fillG holds morph static content).
            this.fillKey = 'morph';
            this.borderKey = 'morph';
            return { container: this.root };
        }

        // ── IDLE: draw the resolved snapshot (already smoothed at source). No
        // family re-smoothing — that would double-round.
        // Leaving a morph: drop the pooled morph fills (fillG is rebuilt with the
        // idle regions below via the stale 'morph' fillKey).
        if (this.morphFillFrameKey !== null) {
            this.resetMorphFillPool();
            this.morphFillFrameKey = null;
        }
        if (!style.fillEnabled || !geometry) {
            if (this.fillKey !== 'off') {
                this.fillG.clear();
                this.fillKey = 'off';
            }
        } else {
            const key = `idle:${sKey}:${geometry.version}`;
            if (this.fillKey !== key) {
                this.drawFills(geometry.territoryRegions, 0, 0, style);
                this.fillKey = key;
            }
        }

        if (!style.borderEnabled || !geometry) {
            if (this.borderKey !== 'off') {
                this.borderG.clear();
                this.borderKey = 'off';
            }
        } else {
            const key = `border:${sKey}:${geometry.version}`;
            if (this.borderKey !== key) {
                this.drawBorders(
                    geometry.frontierPolylines,
                    geometry.worldBorderPolylines,
                    0,
                    0,
                    style,
                );
                this.borderKey = key;
            }
        }

        return { container: this.root };
    }

    dispose(): void {
        this.resetMorphFillPool();
        this.fillG.destroy();
        this.morphFillC.destroy({ children: true });
        this.borderG.destroy();
        this.root.destroy({ children: true });
    }
}

export function createPowerVectorFamily(
    colorUtils: ColorUtils,
): PowerVectorFamily {
    return new PowerVectorFamily(colorUtils);
}
