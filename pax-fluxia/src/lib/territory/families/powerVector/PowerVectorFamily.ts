/**
 * PowerVectorFamily — the PowerCore vector skin.
 *
 * IDLE: fills from the resolved snapshot's territoryRegions (merged per owner,
 * Chaikin-smoothed → the VORONOI_BORDER_SMOOTH rounding slider WORKS) and
 * borders from its frontier/world polylines. MORPH (kinetic frame active):
 * frozen cells drawn ONCE into a static layer; only the moving bubble cells
 * redraw per frame (jank fix). Conquest shows as pure SHAPE change — the
 * incoming owner's solid region grows (clip-sweep in the kinetic sampler); no
 * color blending, per the conquest spec.
 *
 * Live controls (the unified Territory surface settings — previously dead in
 * this mode): TERRITORY_SURFACE_FILL_ENABLED / SATURATION / LIGHTNESS / ALPHA
 * and TERRITORY_SURFACE_BORDER_ENABLED / WIDTH / SATURATION / LIGHTNESS /
 * ALPHA. Owner hue comes from the player color; sat/light are multipliers via
 * adjustColorHSL (same semantics as the cell-grid family).
 *
 * Coordinate spaces: kinetic cells are MAP coords (offset by −world.min);
 * the resolved snapshot is ALREADY localized by the caller (no offset).
 */

import * as PIXI from 'pixi.js';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import { adjustColorHSL, blendColors } from '$lib/utils/colorUtils';
import {
    getActiveKineticFrame,
} from '../../geometry/powerCore/kineticRuntimeBridge';
import type { PowerCell } from '../../geometry/powerCore/powerCoreTypes';
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
        if (
            yi > y !== yj > y &&
            x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
        ) {
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

const WORLD_OWNER = '__world__';

interface BorderEdge {
    readonly a: readonly [number, number];
    readonly b: readonly [number, number];
    readonly ownerA: string;
    readonly ownerB: string;
}

/**
 * Owner-boundary edges of a cell set: an edge shared by two DIFFERENT owners, or
 * an outer/world edge (reported by a single cell). Used to draw borders from the
 * live kinetic cells during a morph so the frontier moves WITH the fills instead
 * of snapping to the settled snapshot. The conquest split edge (incoming vs old
 * within one cell) is such a boundary → it animates with the sweep.
 */
function ownerBoundaryEdges(cells: readonly PowerCell[]): BorderEdge[] {
    const Q = 100; // 0.01px quantization for exact-share matching
    const map = new Map<
        string,
        { a: readonly [number, number]; b: readonly [number, number]; owners: string[] }
    >();
    for (const cell of cells) {
        const pts = cell.points;
        const n = pts.length;
        if (n < 2) continue;
        for (let i = 0; i < n; i++) {
            const a = pts[i]!;
            const b = pts[(i + 1) % n]!;
            const ka = `${Math.round(a[0] * Q)},${Math.round(a[1] * Q)}`;
            const kb = `${Math.round(b[0] * Q)},${Math.round(b[1] * Q)}`;
            const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
            const e = map.get(key);
            if (e) e.owners.push(cell.ownerId);
            else map.set(key, { a, b, owners: [cell.ownerId] });
        }
    }
    const out: BorderEdge[] = [];
    for (const e of map.values()) {
        if (e.owners.length === 1) {
            out.push({ a: e.a, b: e.b, ownerA: e.owners[0]!, ownerB: WORLD_OWNER });
        } else if (e.owners[0] !== e.owners[1]) {
            out.push({ a: e.a, b: e.b, ownerA: e.owners[0]!, ownerB: e.owners[1]! });
        }
        // same-owner interior edges are dropped.
    }
    return out;
}

export class PowerVectorFamily implements RenderFamily {
    readonly id = 'power_vector';
    readonly label = 'Power Vector';
    readonly tunableKeys: readonly string[] = POWER_VECTOR_TUNABLE_KEYS;

    private readonly root = new PIXI.Container();
    /** Idle fills OR frozen morph cells — redrawn only when its key changes. */
    private readonly staticG = new PIXI.Graphics();
    /** Moving bubble cells — redrawn every morph frame. */
    private readonly dynamicG = new PIXI.Graphics();
    /** Borders (snapshot polylines) — redrawn only when its key changes. */
    private readonly borderG = new PIXI.Graphics();
    private readonly colorUtils: ColorUtils;
    private staticKey: string | null = null;
    private borderKey: string | null = null;
    private fillHexCache = new Map<string, number>();
    private borderHexCache = new Map<string, number>();
    private colorCacheKey = '';

    constructor(colorUtils: ColorUtils) {
        this.colorUtils = colorUtils;
        this.root.addChild(this.staticG, this.dynamicG, this.borderG);
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

    private drawCells(
        g: PIXI.Graphics,
        cells: readonly PowerCell[],
        dx: number,
        dy: number,
        style: SurfaceStyle,
    ): void {
        for (const cell of cells) {
            if (cell.points.length < 3) continue;
            const flat: number[] = [];
            for (const [px, py] of cell.points) flat.push(px + dx, py + dy);
            g.poly(flat).fill({
                color: this.fillColor(cell.ownerId, style),
                alpha: style.fillAlpha,
            });
        }
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

        // ── Fills ───────────────────────────────────────────────────────────
        if (!style.fillEnabled) {
            if (this.staticKey !== 'off') {
                this.staticG.clear();
                this.staticKey = 'off';
            }
            this.dynamicG.clear();
        } else if (frame) {
            // MORPH: frozen once per (morph frame set + style); bubble per frame.
            const frozenKey = `frozen:${sKey}:${frame.frozenCells.length}:${frame.frozenCells === (this as unknown as { _lastFrozen?: unknown })._lastFrozen ? 1 : 0}`;
            // frozenCells is reference-stable for the whole morph (T3), so key
            // on identity via a stashed ref rather than content.
            const self = this as unknown as { _lastFrozen?: readonly PowerCell[] };
            if (self._lastFrozen !== frame.frozenCells || this.staticKey !== frozenKey) {
                self._lastFrozen = frame.frozenCells;
                this.staticG.clear();
                this.drawCells(this.staticG, frame.frozenCells, dx, dy, style);
                this.staticKey = frozenKey;
            }
            this.dynamicG.clear();
            this.drawCells(this.dynamicG, frame.bubbleCells, dx, dy, style);
        } else if (geometry) {
            // IDLE: merged, smoothed regions (rounding slider applies).
            const key = `idle:${sKey}:${geometry.version}`;
            if (this.staticKey !== key) {
                (this as unknown as { _lastFrozen?: unknown })._lastFrozen = undefined;
                this.staticG.clear();
                const regions = geometry.territoryRegions.filter(
                    (r) => r.points.length >= 3,
                );
                for (const region of regions) {
                    const flat: number[] = [];
                    for (const [px, py] of region.points) flat.push(px, py);
                    this.staticG.poly(flat).fill({
                        color: this.fillColor(region.ownerId, style),
                        alpha: style.fillAlpha,
                    });
                    // Cut any DIFFERENT-owner region fully enclosed in this one
                    // so colors stay pure under alpha — the merged region is an
                    // outer ring that would otherwise paint over an enclosed
                    // enemy island (both fills compositing).
                    for (const other of regions) {
                        if (other === region || other.ownerId === region.ownerId) {
                            continue;
                        }
                        if (!regionEnclosedBy(other.points, region.points)) continue;
                        const hole: number[] = [];
                        for (const [px, py] of other.points) hole.push(px, py);
                        this.staticG.poly(hole).cut();
                    }
                }
                this.staticKey = key;
            }
            this.dynamicG.clear();
        }

        // ── Borders ─────────────────────────────────────────────────────────
        if (!style.borderEnabled || !geometry) {
            if (this.borderKey !== 'off') {
                this.borderG.clear();
                this.borderKey = 'off';
            }
        } else if (frame) {
            // MORPH: derive borders from the SAME animating cells as the fills so
            // the frontier moves WITH the sweep (instead of snapping to the
            // settled snapshot). Redraw every frame; batch by color for perf.
            this.borderG.clear();
            const edgeColor = (edge: BorderEdge): number =>
                style.borderBlend && edge.ownerB !== WORLD_OWNER
                    ? blendColors(
                          this.borderColor(edge.ownerA, style),
                          this.borderColor(edge.ownerB, style),
                          0.5,
                      )
                    : this.borderColor(edge.ownerA, style);
            const byColor = new Map<number, BorderEdge[]>();
            for (const edge of ownerBoundaryEdges([
                ...frame.frozenCells,
                ...frame.bubbleCells,
            ])) {
                const c = edgeColor(edge);
                const bucket = byColor.get(c);
                if (bucket) bucket.push(edge);
                else byColor.set(c, [edge]);
            }
            for (const [color, edges] of byColor) {
                for (const edge of edges) {
                    this.borderG.moveTo(edge.a[0] + dx, edge.a[1] + dy);
                    this.borderG.lineTo(edge.b[0] + dx, edge.b[1] + dy);
                }
                this.borderG.stroke({
                    width: style.borderWidth,
                    color,
                    alpha: style.borderAlpha,
                    join: 'round',
                    cap: 'round',
                });
            }
            this.borderKey = 'morph';
        } else {
            const key = `border:${sKey}:${geometry.version}`;
            if (this.borderKey !== key) {
                this.borderG.clear();
                const strokeChain = (
                    points: readonly (readonly [number, number])[],
                    ownerA: string,
                    ownerB: string,
                ) => {
                    if (points.length < 2) return;
                    // Opponent-blended borders: an inter-owner frontier is drawn
                    // in the 50/50 mix of BOTH owners' border colors (a single
                    // shared stroke) instead of just side A. World edges
                    // (ownerB '__world__') keep the single owner color.
                    const color =
                        style.borderBlend && ownerB && ownerB !== '__world__'
                            ? blendColors(
                                  this.borderColor(ownerA, style),
                                  this.borderColor(ownerB, style),
                                  0.5,
                              )
                            : this.borderColor(ownerA, style);
                    this.borderG.moveTo(points[0]![0], points[0]![1]);
                    for (let i = 1; i < points.length; i++) {
                        this.borderG.lineTo(points[i]![0], points[i]![1]);
                    }
                    this.borderG.stroke({
                        width: style.borderWidth,
                        color,
                        alpha: style.borderAlpha,
                        join: 'round',
                        cap: 'round',
                    });
                };
                for (const polyline of geometry.frontierPolylines) {
                    strokeChain(polyline.points, polyline.ownerA, polyline.ownerB);
                }
                for (const polyline of geometry.worldBorderPolylines) {
                    strokeChain(polyline.points, polyline.ownerA, polyline.ownerB);
                }
                this.borderKey = key;
            }
        }

        return { container: this.root };
    }

    dispose(): void {
        this.staticG.destroy();
        this.dynamicG.destroy();
        this.borderG.destroy();
        this.root.destroy({ children: true });
    }
}

export function createPowerVectorFamily(
    colorUtils: ColorUtils,
): PowerVectorFamily {
    return new PowerVectorFamily(colorUtils);
}
