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
import { getActiveKineticFrame } from '../../geometry/powerCore/kineticRuntimeBridge';
import { buildSurfaceFromCells } from '../../geometry/powerCore/buildSurfaceFromCells';
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
    /** Fills (idle: cached by key; morph: redrawn per frame). */
    private readonly fillG = new PIXI.Graphics();
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
        this.root.addChild(this.fillG, this.borderG);
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

    /** Per-cell fills for the MORPH: each cell/region is exactly one owner and the
     *  cells tile the map, so the fill is complete and can NEVER bucket-fill or
     *  leave a captured region unfilled. Fed the SMOOTHED per-cell fills
     *  (owner-boundary edges rounded to match the borders), so no fill/border
     *  discontinuity — while staying single-owner (no fragile face walk). */
    private drawCellFills(
        regions: readonly FillRegion[],
        dx: number,
        dy: number,
        style: SurfaceStyle,
    ): void {
        this.fillG.clear();
        for (const region of regions) {
            if (region.points.length < 3) continue;
            const flat: number[] = [];
            for (const [px, py] of region.points) flat.push(px + dx, py + dy);
            this.fillG.poly(flat).fill({
                color: this.fillColor(region.ownerId, style),
                alpha: style.fillAlpha,
            });
        }
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
            const surface = buildSurfaceFromCells(cells, smoothPasses);

            // Fills: SMOOTHED per-cell (single-owner ⇒ no bucket-fill; owner edges
            // rounded to match the borders ⇒ no fill/border discontinuity).
            if (style.fillEnabled) this.drawCellFills(surface.cellFills, dx, dy, style);
            else this.fillG.clear();

            // Borders: merged + smoothed inter-owner frontiers (same smoothed graph).
            if (style.borderEnabled) {
                this.drawBorders(surface.frontiers, surface.worldBorders, dx, dy, style);
            } else this.borderG.clear();

            // Morph redraws every frame — invalidate the idle caches.
            this.fillKey = 'morph';
            this.borderKey = 'morph';
            return { container: this.root };
        }

        // ── IDLE: draw the resolved snapshot (already smoothed at source). No
        // family re-smoothing — that would double-round.
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
        this.fillG.destroy();
        this.borderG.destroy();
        this.root.destroy({ children: true });
    }
}

export function createPowerVectorFamily(
    colorUtils: ColorUtils,
): PowerVectorFamily {
    return new PowerVectorFamily(colorUtils);
}
