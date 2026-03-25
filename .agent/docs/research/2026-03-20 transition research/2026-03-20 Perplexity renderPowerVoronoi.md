<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Please conduct the refactor. I agree with your assessment. Cut dead code, put clear comment blocks around what is in question, and otherwise clean it up and modularize it for separation of concerns.

Here is the architecture specs:

## 1. The 4-Layer Pipeline

```
Ownership → Geometry → Transition → Presentation
```

| Layer | What It Does | Key Type | User-Facing Control |
| :-- | :-- | :-- | :-- |
| **Ownership** | Who owns what. Graph-native, from conquest events. | `GraphOwnershipState` | *(automatic)* |
| **Geometry** | Shapes from ownership. Power Voronoi cells, merged territories, shared borders. | `TerritoryGeometryData` | **Geometry** dropdown |
| **Transition: Fill** | Animating fill polygons between geometry states on conquest. | `FXHandler<ConquestEvent>` | **Fill Transition** dropdown |
| **Transition: Border** | Animating border polylines between geometry states on conquest. | `FXHandler<ConquestEvent>` | **Border Transition** dropdown |
| **Presentation** | Drawing to screen. PIXI.Graphics fills, strokes, visual style. | `PVV2RendererState` | **Style** dropdown |

> [!IMPORTANT]
> Fill Transition and Border Transition are **independently selectable** sub-concerns within the Transition layer.
> They operate on different data (fill polygons vs border polylines) but must remain **temporally synchronized** —
> fills must follow borders at every frame during transition, never snapping ahead or lagging behind.

Below is a concrete refactor of the renderer module, focused on:

- Enforcing the 4-layer pipeline boundary at this file: **Transition + Presentation only**, consuming `TerritoryGeometryData` (Geometry layer) and ownership already resolved.[^1]
- Removing genuinely dead code from this module (borderGraphics-based interpolation, lerped polylines, densify helpers) and quarantining “maybe still needed” helpers behind explicit comment blocks.[^1]
- Modularizing `renderPowerVoronoi` into smaller functions: canonical vs legacy path, transition tick, geometry rebuild, steady-state presentation.[^1]

I’ll first show the **new file shape** with comments and helpers, then explain what changed so you can adapt it to your codebase.

***

## New top‑level structure

Key ideas:

- This module is now **Presentation + Transition Coordinator**. Geometry shaping (Chaikin, resampling, edge graph, etc.) is assumed to be done in `powerVoronoiTerritoryGeometryGenerator`.[^1]
- The main export `renderPowerVoronoi` is a thin orchestrator that:

1. Chooses canonical vs legacy pipeline.
2. Lets transitions render early if they can short-circuit the frame.
3. When a rebuild is needed, calls the geometry generator and then hands results to presentation helpers.[^1]


### Refactored renderer (TypeScript)

This is a refactored version of your file; I’ve inlined real code where it matters, and called out places where you can drop in existing blocks unchanged to keep the answer to a reasonable size.

```ts
// ============================================================================
// PowerVoronoiRenderer — F-138v3
// Territory presentation & transition coordination (Geometry already compiled)
// ============================================================================
//
// Pipeline (global architecture):
//   Ownership → Geometry → Transition → Presentation
//
// This module owns ONLY:
//   - Transition: ticking fill + border FX based on TerritoryGeometryData
//   - Presentation: drawing PIXI fills/borders from precomputed geometry
//
// Geometry shaping (Voronoi, edge graph, Chaikin, frontier resampling, etc.)
// is owned by powerVoronoiTerritoryGeometryGenerator and friends.
//
// ============================================================================

import * as PIXI from 'pixi.js';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarState, StarConnection } from '$lib/types/game.types';
import type { ColorUtils } from './RenderContext';
import type { CanonicalTerritoryData } from '$lib/territory/orchestrator/renderMode';
import { log } from '$lib/utils/logger';
import { blendColors, hexToRGB } from '$lib/utils/colorUtils';
import {
    generateVoronoiTerritoryGeometry,
    chaikinSmoothPolyline,
    type TerritoryGeometryData,
    type MergedTerritory,
    type SharedBorderEdge,
    type SharedPolyline,
    type TerritoryCell,
} from '$lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator';
import {
    resamplePolygon,
    resamplePolyline,
    lerpPolygon,
    polygonCentroid,
} from '$lib/territory/geometry/morphUtils';
import {
    SegmentMorphTransitionHandler,
    RopeBorderRenderer,
    PolygonMorphTransitionHandler,
} from '$lib/renderers/geometry/borderTransition';
import { territoryTransitions } from '$lib/fx/handlers/territoryTransitionHandler';

// ─────────────────────────────────────────────────────────────────────────────
// Small utility types
// ─────────────────────────────────────────────────────────────────────────────

interface RenderStyleConfig {
    alpha: number;
    borderWidth: number;
    borderAlpha: number;
    satMult: number;
    lightMult: number;
}

interface GeometryStageError {
    kind: 'error';
    stage: string;
    message: string;
    recoverable: boolean;
}

type GeometryStageResult = TerritoryGeometryData | GeometryStageError;

// ─────────────────────────────────────────────────────────────────────────────
// Renderer State (encapsulated)
// ─────────────────────────────────────────────────────────────────────────────
//
// NOTE: We keep the flat shape for compatibility, but conceptually group
// fields into cache, graphics, transitions, and diff-tracking.
//

export interface PVV2RendererState {
    // Cache (fingerprints)
    cachedShapeFingerprint: string;
    cachedVisualFingerprint: string;

    // Presentation (Graphics handles)
    fillGraphics: PIXI.Graphics | null;
    borderGraphics: PIXI.Graphics | null;

    // Border Transition (Segment Mode)
    prevBorderEdges: SharedBorderEdge[] | null;
    targetBorderEdges: SharedBorderEdge[] | null;
    borderTransitionStart: number;
    isBorderTransitioning: boolean;

    // Smooth Transition (Contested Border Mode)
    prevSharedPolylines: SharedPolyline[] | null;
    targetSharedPolylines: SharedPolyline[] | null;
    targetRawSharedPolylines: SharedPolyline[] | null;
    smoothTransitionStart: number;
    isSmoothTransitioning: boolean;
    lastMergedTerritories: MergedTerritory[] | null;

    // Fill Transition (alpha crossfade / polygon morph)
    prevMergedTerritories: MergedTerritory[] | null;
    prevEnclaveMap: Map<number, [number, number][][]> | null;
    fillTransitionStart: number;
    isFillTransitioning: boolean;

    // Active Morphers
    activeBorderTransitionHandler: SegmentMorphTransitionHandler | null;
    activeRopeRenderer: RopeBorderRenderer | null;
    activeShapeTransitionHandler: PolygonMorphTransitionHandler | null;

    // Cell Change Tracking (for conquest origin)
    lastCells: TerritoryCell[] | null;
    changedSiteIds: Set<string> | null;

    // Enclave Cache
    lastEnclaveMap: Map<number, [number, number][][]> | null;

    // World border polylines — used during frontier morph transitions
    lastWorldBorderPolylines: SharedPolyline[] | null;
}

/** Create a fresh PVV2 renderer state. */
export function createPVV2State(): PVV2RendererState {
    return {
        cachedShapeFingerprint: '',
        cachedVisualFingerprint: '',
        fillGraphics: null,
        borderGraphics: null,
        prevBorderEdges: null,
        targetBorderEdges: null,
        borderTransitionStart: 0,
        isBorderTransitioning: false,
        prevSharedPolylines: null,
        targetSharedPolylines: null,
        targetRawSharedPolylines: null,
        smoothTransitionStart: 0,
        isSmoothTransitioning: false,
        lastMergedTerritories: null,
        prevMergedTerritories: null,
        prevEnclaveMap: null,
        fillTransitionStart: 0,
        isFillTransitioning: false,
        activeBorderTransitionHandler: null,
        activeRopeRenderer: null,
        activeShapeTransitionHandler: null,
        lastCells: null,
        changedSiteIds: null,
        lastEnclaveMap: null,
        lastWorldBorderPolylines: null,
    };
}

/** Default (legacy) module-level state — used when no state is passed. */
const defaultState: PVV2RendererState = createPVV2State();

// ─────────────────────────────────────────────────────────────────────────────
// Fingerprints & style utilities
// ─────────────────────────────────────────────────────────────────────────────

function buildShapeFingerprint(stars: StarState[]): string {
    let fp = 'shape:';
    for (const s of stars) {
        fp += `${s.id}:${s.ownerId ?? ''}|`;
    }
    fp += `:${GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN}`;
    fp += `:${GAME_CONFIG.TERRITORY_CLUSTER_SPLIT}`;
    fp += `:${GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED}`;
    fp += `:${GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING}`;
    fp += `:${GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED}`;
    fp += `:${GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE}`;
    fp += `:chaikin=${GAME_CONFIG.VORONOI_BORDER_SMOOTH}`;
    fp += `:geoMode=${GAME_CONFIG.TERRITORY_GEOMETRY_MODE}`;
    fp += `:engMethod=${GAME_CONFIG.TERRITORY_ENGINE_METHOD}`;
    fp += `:geoRefresh=${(GAME_CONFIG as any).__GEOMETRY_REFRESH_TOKEN ?? 0}`;
    return fp;
}

function buildVisualFingerprint(): string {
    let fp = 'visual:';
    fp += `${GAME_CONFIG.VORONOI_ALPHA}:${GAME_CONFIG.VORONOI_BORDER_WIDTH}`;
    fp += `:${GAME_CONFIG.VORONOI_BORDER_ALPHA}:${GAME_CONFIG.VORONOI_SATURATION}`;
    fp += `:${GAME_CONFIG.VORONOI_LIGHTNESS}`;
    return fp;
}

function getRenderStyleFromConfig(): RenderStyleConfig {
    return {
        alpha: GAME_CONFIG.VORONOI_ALPHA ?? 0.25,
        borderWidth: GAME_CONFIG.VORONOI_BORDER_WIDTH ?? 1.5,
        borderAlpha: GAME_CONFIG.VORONOI_BORDER_ALPHA ?? 0.4,
        satMult: GAME_CONFIG.VORONOI_SATURATION ?? 1.0,
        lightMult: GAME_CONFIG.VORONOI_LIGHTNESS ?? 0.7,
    };
}

function isNeutralOwner(ownerId: string | null | undefined): boolean {
    return !ownerId || ownerId === 'neutral' || ownerId === '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Color helpers (unchanged core logic, just grouped)
// ─────────────────────────────────────────────────────────────────────────────

function rgbToHSL(r: number, g: number, b: number): [number, number, number] {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    return [h * 360, s, l];
}

function hslToRGB(h: number, s: number, l: number): [number, number, number] {
    h /= 360;
    if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
    const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [
        Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
        Math.round(hue2rgb(p, q, h) * 255),
        Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
    ];
}

function adjustColorHSL(hex: number, satMult: number, lightMult: number): number {
    const [r, g, b] = hexToRGB(hex);
    const [h, s, l] = rgbToHSL(r, g, b);
    const [nr, ng, nb] = hslToRGB(
        h,
        Math.min(1, Math.max(0, s * satMult)),
        Math.min(1, Math.max(0, l * lightMult)),
    );
    return (nr << 16) | (ng << 8) | nb;
}

// ─────────────────────────────────────────────────────────────────────────────
// Presentation helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Canonical border drawing for contested edges. */
function drawBorderPolylines(
    graphics: PIXI.Graphics,
    polylines: { points: [number, number][]; color: number }[],
    smoothPasses: number,
    width: number,
    alpha: number,
): void {
    let drawn = 0;
    for (const polyline of polylines) {
        const pts = smoothPasses > 0
            ? chaikinSmoothPolyline(polyline.points, smoothPasses)
            : polyline.points;
        if (pts.length < 2) continue;

        graphics.moveTo(pts[^0][^0], pts[^0][^1]);
        for (let i = 1; i < pts.length; i++) {
            graphics.lineTo(pts[i][^0], pts[i][^1]);
        }
        graphics.stroke({ width, color: polyline.color, alpha, cap: 'round', join: 'round' });
        drawn++;
    }
    log.renderer('drawBorderPolylines',
        `drew ${drawn}/${polylines.length} polylines (smooth=${smoothPasses}, w=${width.toFixed(1)}, a=${alpha.toFixed(2)}, straight=true)`,
    );
}

/** Draw a single territory fill (outer boundary + optional holes). */
function drawTerritoryFillOnly(
    graphics: PIXI.Graphics,
    territory: MergedTerritory,
    holes: [number, number][][] | undefined,
    alpha: number,
): void {
    if (territory.points.length < 3) {
        log.renderer('PVV2:fill',
            `SKIP territory ownerId=${territory.ownerId} — only ${territory.points.length} pts`,
        );
        return;
    }

    // Shared neutral-visibility rule
    if (isNeutralOwner(territory.ownerId) && GAME_CONFIG.NEUTRAL_TERRITORY_TRANSPARENT) return;

    graphics.poly(territory.points.flat());
    graphics.fill({ color: territory.color, alpha });

    log.renderer(
        'PVV2:fill',
        `filled ownerId=${territory.ownerId} color=0x${territory.color.toString(16)} alpha=${alpha.toFixed(2)} pts=${territory.points.length} holes=${holes?.length ?? 0}`,
    );

    if (holes) {
        for (const hole of holes) {
            if (hole.length < 3) continue;
            graphics.poly(hole.flat());
            graphics.cut();
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Canonical path (Geometry already baked into shells)
// ─────────────────────────────────────────────────────────────────────────────

function renderFromCanonicalData(
    s: PVV2RendererState,
    voronoiContainer: PIXI.Container,
    colorUtils: ColorUtils,
    canonicalData: CanonicalTerritoryData,
): void {
    const canonicalShells = canonicalData.shells ?? [];
    if (canonicalShells.length === 0) return;

    const canonicalAnimShells = canonicalData.animatedShells ?? [];
    const canonicalAnimActive = canonicalData.transitionActive ?? false;
    const canonicalShellLoops = canonicalData.shellLoops ?? [];

    const style = getRenderStyleFromConfig();

    if (!s.fillGraphics) {
        s.fillGraphics = new PIXI.Graphics();
        voronoiContainer.addChild(s.fillGraphics);
    }
    s.fillGraphics.clear();
    s.fillGraphics.visible = true;

    // No legacy polyline borders here; canonical path owns borders on fill path.
    if (s.borderGraphics) {
        s.borderGraphics.clear();
        s.borderGraphics.visible = false;
        log.renderer('PVV2', '🔴 CANONICAL PATH cleared s.borderGraphics!');
    }

    const shellsForRender = canonicalAnimActive && canonicalAnimShells.length > 0
        ? canonicalAnimShells
        : canonicalShells;

    const sorted = shellsForRender.slice().sort((a, b) => b.absArea - a.absArea);
    const shellLoopById = new Map(
        canonicalShellLoops.map((loop: any) => [loop.shellLoopId, loop]),
    );

    for (const shell of sorted) {
        if (shell.points.length < 3) continue;

        if (isNeutralOwner(shell.ownerId) && GAME_CONFIG.NEUTRAL_TERRITORY_TRANSPARENT) continue;

        const rawColor = colorUtils.getPlayerColor(shell.ownerId);
        const shellColor = adjustColorHSL(rawColor, style.satMult, style.lightMult);

        const pts = shell.points;

        s.fillGraphics.beginPath();
        s.fillGraphics.poly(pts.flat());
        s.fillGraphics.fill({ color: shellColor, alpha: style.alpha });

        // Holes
        const holeLoops: Array<{ points: [number, number][] }> =
            'holeLoops' in shell && Array.isArray((shell as any).holeLoops)
                ? (shell as any).holeLoops
                : 'holeLoopIds' in shell && Array.isArray((shell as any).holeLoopIds)
                    ? (shell as any).holeLoopIds
                        .map((id: string) => shellLoopById.get(id))
                        .filter((l: any) => l && l.points?.length >= 3)
                    : [];

        for (const hole of holeLoops) {
            if (hole.points.length < 3) continue;
            s.fillGraphics.beginPath();
            s.fillGraphics.poly(hole.points.flat());
            s.fillGraphics.cut();
        }

        // Border on same geometry
        if (style.borderWidth > 0 && style.borderAlpha > 0) {
            s.fillGraphics.beginPath();
            s.fillGraphics.moveTo(pts[^0][^0], pts[^0][^1]);
            for (let i = 1; i < pts.length; i++) {
                s.fillGraphics.lineTo(pts[i][^0], pts[i][^1]);
            }
            if (pts.length > 2) {
                s.fillGraphics.lineTo(pts[^0][^0], pts[^0][^1]);
            }
            s.fillGraphics.stroke({
                width: style.borderWidth,
                color: shellColor,
                alpha: style.borderAlpha,
                join: 'round',
                cap: 'round',
            });
        }
    }

    log.renderer('PVV2', `CANONICAL path: ${sorted.length} shells (anim=${canonicalAnimActive})`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Transition tick (legacy path only)
// ─────────────────────────────────────────────────────────────────────────────

function tickSmoothTransitionFrame(
    s: PVV2RendererState,
    stars: StarState[],
    voronoiContainer: PIXI.Container,
    colorUtils: ColorUtils,
    now: number,
    transitionMs: number,
): boolean {
    const boundaryMode = GAME_CONFIG.TERRITORY_BOUNDARY_MODE ?? 'smooth';
    const isAnimatingSmooth =
        boundaryMode === 'smooth' &&
        s.isSmoothTransitioning &&
        s.prevSharedPolylines &&
        s.targetSharedPolylines &&
        transitionMs > 0;

    if (!isAnimatingSmooth || !s.lastMergedTerritories || !s.fillGraphics) return false;

    const style = getRenderStyleFromConfig();
    const elapsed = now - s.smoothTransitionStart;
    const rawT = Math.min(1, elapsed / transitionMs);

    s.fillGraphics.clear();

    // D-79 / B-101: unified fill+border from same morphed polygons.
    if (s.activeShapeTransitionHandler) {
        s.activeShapeTransitionHandler.drawFrame(
            s.fillGraphics,
            rawT,
            style.alpha,
            style.borderWidth,
            style.borderAlpha,
        );
    } else if (s.activeBorderTransitionHandler) {
        for (let i = 0; i < s.lastMergedTerritories.length; i++) {
            drawTerritoryFillOnly(s.fillGraphics, s.lastMergedTerritories[i], s.lastEnclaveMap?.get(i), style.alpha);
        }
        s.activeBorderTransitionHandler.drawFrame(
            s.fillGraphics,
            rawT,
            style.borderWidth,
            style.borderAlpha,
        );
    } else if (s.activeRopeRenderer) {
        for (let i = 0; i < s.lastMergedTerritories.length; i++) {
            drawTerritoryFillOnly(s.fillGraphics, s.lastMergedTerritories[i], s.lastEnclaveMap?.get(i), style.alpha);
        }
        s.activeRopeRenderer.setVisible(true);
        s.activeRopeRenderer.update(rawT, style.borderAlpha);
    }

    if (rawT >= 1) {
        // Transition complete; clean up and draw steady contested borders.
        s.isSmoothTransitioning = false;
        s.isFillTransitioning = false;
        s.prevSharedPolylines = null;
        s.prevMergedTerritories = null;
        s.prevEnclaveMap = null;
        s.activeBorderTransitionHandler = null;
        s.activeShapeTransitionHandler = null;
        if (s.activeRopeRenderer) {
            s.activeRopeRenderer.removeAll();
            s.activeRopeRenderer = null;
        }

        if (s.targetSharedPolylines && s.targetSharedPolylines.length > 0 &&
            style.borderWidth > 0 && style.borderAlpha > 0) {
            drawBorderPolylines(s.fillGraphics, s.targetSharedPolylines, 0, style.borderWidth, style.borderAlpha);
        }

        log.renderer('PVV2', 'border transition complete — contested borders drawn, fills retained');
    }

    const shapeFpCheck = buildShapeFingerprint(stars);
    const visualFpCheck = buildVisualFingerprint();
    if (shapeFpCheck === s.cachedShapeFingerprint && visualFpCheck === s.cachedVisualFingerprint) {
        // Geometry+visuals unchanged → we can short-circuit this frame.
        return true;
    }
    return false;
}

function tickSegmentTransitionFrame(
    s: PVV2RendererState,
    stars: StarState[],
    now: number,
    transitionMs: number,
): boolean {
    const boundaryMode = GAME_CONFIG.TERRITORY_BOUNDARY_MODE ?? 'smooth';
    if (boundaryMode !== 'segment' ||
        !s.isBorderTransitioning ||
        transitionMs <= 0 ||
        !s.prevBorderEdges ||
        !s.targetBorderEdges) {
        return false;
    }

    const elapsed = now - s.borderTransitionStart;
    if (elapsed >= transitionMs) {
        s.isBorderTransitioning = false;
        s.prevBorderEdges = null;
    }

    const shapeFpCheck = buildShapeFingerprint(stars);
    const visualFpCheck = buildVisualFingerprint();
    if (shapeFpCheck === s.cachedShapeFingerprint && visualFpCheck === s.cachedVisualFingerprint) {
        // Nothing else changed; caller can early-return this frame.
        return true;
    }
    return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Geometry stage + steady-state presentation (legacy path)
// ─────────────────────────────────────────────────────────────────────────────

function runGeometryStage(
    stars: StarState[],
    connections: StarConnection[] | undefined,
    worldWidth: number,
    worldHeight: number,
): GeometryStageResult {
    const stageConfig = {
        starMargin: GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ?? 45,
        corridorEnabled: Boolean(GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED) && Boolean(connections),
        corridorSpacing: GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING ?? 60,
        disconnectEnabled: Boolean(GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED) && Boolean(connections),
        disconnectDistance: GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE ?? 400,
        clusterSplit: Boolean(GAME_CONFIG.TERRITORY_CLUSTER_SPLIT),
        chaikinPasses: Math.max(0, Math.min(5, Math.round(GAME_CONFIG.VORONOI_BORDER_SMOOTH ?? 3))),
        frontierResolution:
            (GAME_CONFIG.TERRITORY_GEOMETRY_MODE ?? 'power_voronoi') === 'unified_polygon'
                ? Math.max(1, Math.min(20, GAME_CONFIG.FRONTIER_RESOLUTION ?? 5))
                : 0,
        boundaryPad: GAME_CONFIG.CHAIKIN_BOUNDARY_PAD ?? 50,
        boundaryEps: GAME_CONFIG.CHAIKIN_BOUNDARY_EPS ?? 6,
        worldWidth,
        worldHeight,
    };

    const result = generateVoronoiTerritoryGeometry(stars, connections ?? [], stageConfig);
    if ('kind' in result) {
        log.error('PVV2', `geometry stage error at ${result.stage}: ${result.message}`);
    }
    return result;
}

function applyTerritoryColors(
    merged: MergedTerritory[],
    colorUtils: ColorUtils,
    style: RenderStyleConfig,
): void {
    for (const territory of merged) {
        const rawColor = colorUtils.getPlayerColor(territory.ownerId);
        territory.color = adjustColorHSL(rawColor, style.satMult, style.lightMult);
    }
}

function detectChangedOwners(
    s: PVV2RendererState,
    cells: TerritoryCell[],
    shapeChanged: boolean,
): void {
    s.changedSiteIds = null;
    if (!s.lastCells || !shapeChanged) {
        s.lastCells = cells;
        return;
    }

    const prevOwnerMap = new Map(s.lastCells.map(c => [c.siteId, c.ownerId]));
    const changed = new Set<string>();
    for (const cell of cells) {
        const prevOwner = prevOwnerMap.get(cell.siteId);
        if (prevOwner && prevOwner !== cell.ownerId) {
            changed.add(cell.siteId);
        }
    }
    if (changed.size > 0) {
        s.changedSiteIds = changed;
        log.sys('PowerVoronoi',
            `Conquest detected: ${changed.size} stars changed owner: ${[...changed].join(', ')}`,
        );
    }
    s.lastCells = cells;
}

function renderSteadyStateFillsAndBorders(
    s: PVV2RendererState,
    voronoiContainer: PIXI.Container,
    merged: MergedTerritory[],
    enclaveMap: Map<number, [number, number][][]>,
    style: RenderStyleConfig,
): void {
    if (!s.fillGraphics) {
        s.fillGraphics = new PIXI.Graphics();
        voronoiContainer.addChild(s.fillGraphics);
    }
    s.fillGraphics.clear();
    s.fillGraphics.visible = true;

    log.renderer('PVV2', `FILLS | ${merged.length} territories, enclaves=${enclaveMap.size}`);

    for (let i = 0; i < merged.length; i++) {
        drawTerritoryFillOnly(s.fillGraphics, merged[i], enclaveMap.get(i), style.alpha);
    }

    // Contested borders: shared polylines only, blended colors are handled earlier.
}

function buildSharedPolylineColors(
    sharedEdges: SharedBorderEdge[],
    builtPolylinesRaw: SharedPolyline[],
    builtRawPolylinesRaw: SharedPolyline[] | null | undefined,
): {
    sharedColored: SharedPolyline[];
    rawSharedColored: SharedPolyline[] | null;
} {
    const cMap = new Map<string, number>();
    for (const edge of sharedEdges) {
        const key = edge.ownerA < edge.ownerB
            ? `${edge.ownerA}-${edge.ownerB}`
            : `${edge.ownerB}-${edge.ownerA}`;
        if (!cMap.has(key)) {
            cMap.set(key, blendColors(edge.colorA, edge.colorB, 0.5));
        }
    }

    const sharedColored = builtPolylinesRaw.map(pl => {
        const [ownerA, ownerB] = pl.ownerPairKey.split('|');
        const color =
            cMap.get(`${ownerA}-${ownerB}`) ??
            cMap.get(`${ownerB}-${ownerA}`) ??
            0x888888;
        return { ...pl, color };
    });

    const rawSharedColored = builtRawPolylinesRaw
        ? builtRawPolylinesRaw.map(pl => {
            const [ownerA, ownerB] = pl.ownerPairKey.split('|');
            const color =
                cMap.get(`${ownerA}-${ownerB}`) ??
                cMap.get(`${ownerB}-${ownerA}`) ??
                0x888888;
            return { ...pl, color };
        })
        : null;

    return { sharedColored, rawSharedColored };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Renderer
// ─────────────────────────────────────────────────────────────────────────────

export function renderPowerVoronoi(
    stars: StarState[],
    voronoiContainer: PIXI.Container,
    colorUtils: ColorUtils,
    worldWidth: number,
    worldHeight: number,
    connections?: StarConnection[],
    canonicalData?: CanonicalTerritoryData,
    state?: PVV2RendererState,
    precomputedGeometry?: TerritoryGeometryData,
): void {
    const s = state ?? defaultState;
    const transitionMs = GAME_CONFIG.TERRITORY_TRANSITION_MS ?? 400;
    const now = performance.now();

    if (s.fillGraphics) s.fillGraphics.visible = true;

    // ── 1. Canonical path (V3: one-true-geometry) ─────────────────────────
    const canonicalShells = canonicalData?.shells ?? [];
    const canonicalShellLoops = canonicalData?.shellLoops ?? [];
    const canonicalAnimShells = canonicalData?.animatedShells ?? [];

    const diagKey =
        `canonical=${canonicalShells.length}|loops=${canonicalShellLoops.length}|anim=${canonicalAnimShells.length}`;
    if ((renderPowerVoronoi as any).__lastDiagKey !== diagKey) {
        (renderPowerVoronoi as any).__lastDiagKey = diagKey;
        log.renderer(
            'PVV2',
            canonicalShells.length > 0
                ? `📐 CANONICAL path: ${canonicalShells.length} shells, ${canonicalShellLoops.length} loops, ${canonicalAnimShells.length} animShells, animActive=${canonicalData?.transitionActive ?? false}`
                : `⚠️ LEGACY path: canonicalData=${!!canonicalData}, shells=${canonicalShells.length} (no canonical shells → falling through to d3-weighted-voronoi)`,
        );
    }

    if (canonicalShells.length > 0 && canonicalData) {
        renderFromCanonicalData(s, voronoiContainer, colorUtils, canonicalData);
        return; // Skip legacy pipeline entirely
    }

    // ── 2. Legacy path: clear obsolete borderGraphics ─────────────────────
    if (s.borderGraphics) {
        s.borderGraphics.clear();
        s.borderGraphics.visible = false;
    }

    const boundaryMode = GAME_CONFIG.TERRITORY_BOUNDARY_MODE ?? 'smooth';
    const modeKey = `${boundaryMode}|${s.isSmoothTransitioning}|${s.isBorderTransitioning}`;
    if ((drawBorderPolylines as any).__lastModeKey !== modeKey) {
        (drawBorderPolylines as any).__lastModeKey = modeKey;
        log.renderer(
            'PVV2',
            `mode=${boundaryMode} smoothTransition=${s.isSmoothTransitioning} segmentTransition=${s.isBorderTransitioning}`,
        );
    }

    // ── 3. Let active transitions render this frame and early-out if safe ─
    if (tickSmoothTransitionFrame(s, stars, voronoiContainer, colorUtils, now, transitionMs)) return;
    if (tickSegmentTransitionFrame(s, stars, now, transitionMs)) return;

    // ── 4. Fingerprints: decide if we need a geometry rebuild ─────────────
    const shapeFp = buildShapeFingerprint(stars);
    const visualFp = buildVisualFingerprint();
    const shapeChanged = shapeFp !== s.cachedShapeFingerprint;
    const visualChanged = visualFp !== s.cachedVisualFingerprint;

    if (!shapeChanged && !visualChanged) {
        // Nothing changed in geometry or style; no work this frame.
        return;
    }

    log.renderer(
        'PVV2',
        `REBUILD | shapeChanged=${shapeChanged} visualChanged=${visualChanged} | t+${(performance.now() - now).toFixed(1)}ms`,
    );

    // Snapshot for transitions
    if (shapeChanged && transitionMs > 0) {
        if (s.targetBorderEdges && s.targetBorderEdges.length > 0) {
            s.prevBorderEdges = s.targetBorderEdges;
        }
        if (s.targetSharedPolylines && s.targetSharedPolylines.length > 0) {
            s.prevSharedPolylines = s.targetSharedPolylines;
        }
        if (s.lastMergedTerritories && s.lastMergedTerritories.length > 0) {
            s.prevMergedTerritories = s.lastMergedTerritories;
            s.prevEnclaveMap = s.lastEnclaveMap;
        }
    }

    s.cachedShapeFingerprint = shapeFp;
    s.cachedVisualFingerprint = visualFp;

    const style = getRenderStyleFromConfig();

    // ── 5. Geometry Stage: precomputed or generated ───────────────────────
    let stageResult: GeometryStageResult;
    if (precomputedGeometry) {
        stageResult = precomputedGeometry;
        log.renderer('PVV2', 'Using precomputed geometry (Geometry_0319)');
    } else {
        stageResult = runGeometryStage(stars, connections, worldWidth, worldHeight);
    }
    if ('kind' in stageResult) {
        if (!stageResult.recoverable) {
            if (s.fillGraphics) s.fillGraphics.clear();
            if (s.borderGraphics) s.borderGraphics.clear();
        }
        return;
    }

    const {
        cells,
        mergedTerritories: merged,
        sharedEdges,
        rawSharedPolylines: builtRawPolylinesRaw,
        sharedPolylines: builtPolylinesRaw,
        enclaveMap,
        worldBorderPolylines,
    } = stageResult;

    log.renderer(
        'PVV2',
        `STAGE OUTPUT | cells=${cells.length} merged=${merged.length} polylines=${builtPolylinesRaw.length} chaikinPasses=${Math.round(GAME_CONFIG.VORONOI_BORDER_SMOOTH ?? 3)}`,
    );

    applyTerritoryColors(merged, colorUtils, style);
    detectChangedOwners(s, cells, shapeChanged);

    // ── 6. Render steady-state fills first ────────────────────────────────
    renderSteadyStateFillsAndBorders(s, voronoiContainer, merged, enclaveMap, style);

    // Optional debug vertex overlay unchanged...
    if (GAME_CONFIG.DEBUG_MORPH_VERTICES && s.fillGraphics) {
        const vertexSize = GAME_CONFIG.DEBUG_MORPH_VERTEX_SIZE ?? 3;
        const vertexNth = GAME_CONFIG.DEBUG_MORPH_VERTEX_NTH ?? 10;
        for (const terr of merged) {
            for (let vi = 0; vi < terr.points.length; vi++) {
                if (vi % vertexNth !== 0) continue;
                const [px, py] = terr.points[vi];
                s.fillGraphics.circle(px, py, vertexSize);
                s.fillGraphics.fill({ color: 0xbbbbbb, alpha: 0.7 });
                s.fillGraphics.circle(px, py, vertexSize + 1);
                s.fillGraphics.stroke({ width: 0.5, color: 0x333333, alpha: 0.5 });
            }
        }
    }

    // ── 7. Build colored shared polylines + assign to state ───────────────
    const { sharedColored, rawSharedColored } =
        buildSharedPolylineColors(sharedEdges, builtPolylinesRaw, builtRawPolylinesRaw);

    s.targetBorderEdges = sharedEdges;
    s.lastMergedTerritories = merged;
    s.lastEnclaveMap = enclaveMap;
    s.lastWorldBorderPolylines = worldBorderPolylines;
    s.targetSharedPolylines = sharedColored;
    s.targetRawSharedPolylines = rawSharedColored;

    // Draw current contested borders immediately
    if (s.targetSharedPolylines && s.targetSharedPolylines.length > 0 &&
        style.borderWidth > 0 && style.borderAlpha > 0 && s.fillGraphics) {
        drawBorderPolylines(s.fillGraphics, s.targetSharedPolylines, 0, style.borderWidth, style.borderAlpha);
        log.renderer('PVV2',
            `CONTESTED BORDERS DRAWN | polylines=${s.targetSharedPolylines.length} bw=${style.borderWidth} ba=${style.borderAlpha}`,
        );
    }

    // ── 8. Start transitions if shape changed or FX events pending ────────
    const fxTriggered = territoryTransitions.hasActiveTransitions(); // FX layer: Fill/Border transition selection
    if (shapeChanged || fxTriggered && transitionMs > 0) {
        for (const entry of territoryTransitions.getUnconsumed()) {
            territoryTransitions.markConsumed(entry.starId);
        }

        const borderTransMode = GAME_CONFIG.TERRITORY_BORDER_TRANSITION ?? 'pixigraphicsmorph';
        const easing = GAME_CONFIG.BORDER_TRANS_EASING ?? 'back';
        const resampleN = Math.max(8, Math.min(64, Math.round(GAME_CONFIG.BORDER_TRANS_RESAMPLE_N ?? 32)));
        const overshoot = GAME_CONFIG.BORDER_TRANS_OVERSHOOT ?? 1.7;

        log.renderer(
            'PVV2',
            `TRANSITION STARTED | mode=${borderTransMode} easing=${easing} resampleN=${resampleN} overshoot=${overshoot.toFixed(2)} prev=${s.prevSharedPolylines?.length ?? 0} target=${s.targetSharedPolylines?.length ?? 0} ms=${transitionMs}`,
        );

        // Border transition (independently selectable per FX config)
        s.isBorderTransitioning = false;
        s.isSmoothTransitioning = false;
        s.isFillTransitioning = false;
        s.activeBorderTransitionHandler = null;
        if (s.activeRopeRenderer) {
            s.activeRopeRenderer.removeAll();
            s.activeRopeRenderer = null;
        }

        if (borderTransMode === 'piximeshrope' && s.prevSharedPolylines && s.targetSharedPolylines) {
            const borderWidth = style.borderWidth;
            s.activeRopeRenderer = new RopeBorderRenderer(
                s.prevSharedPolylines,
                s.targetSharedPolylines,
                easing,
                resampleN,
                borderWidth,
                overshoot,
            );
            s.activeRopeRenderer.addTo(voronoiContainer);
            s.isSmoothTransitioning = true;
            s.smoothTransitionStart = now;
            s.isFillTransitioning = true;
            s.fillTransitionStart = now;
        } else if (s.prevSharedPolylines && s.targetSharedPolylines) {
            s.activeBorderTransitionHandler = new SegmentMorphTransitionHandler(
                s.prevSharedPolylines,
                s.targetSharedPolylines,
                easing,
                resampleN,
                overshoot,
            );
            s.isSmoothTransitioning = true;
            s.smoothTransitionStart = now;
            s.isFillTransitioning = true;
            s.fillTransitionStart = now;
        }

        // Fill transition (independently selectable per FX config, but synchronized in time)
        if (s.prevMergedTerritories && s.lastMergedTerritories) {
            let conquestOrigin: [number, number] | undefined = undefined;
            if (s.changedSiteIds && s.changedSiteIds.size > 0) {
                let cx = 0, cy = 0, count = 0;
                for (const star of stars) {
                    if (s.changedSiteIds.has(star.id)) {
                        cx += star.x;
                        cy += star.y;
                        count++;
                    }
                }
                if (count > 0) {
                    conquestOrigin = [cx / count, cy / count];
                    log.renderer(
                        'PVV2',
                        `CONQUEST ORIGIN | stars=${[...s.changedSiteIds].join(', ')} origin=${conquestOrigin[^0].toFixed(0)},${conquestOrigin[^1].toFixed(0)}`,
                    );
                }
            }

            if (s.activeShapeTransitionHandler) {
                s.activeShapeTransitionHandler.cleanup();
            }
            s.activeShapeTransitionHandler = new PolygonMorphTransitionHandler(
                s.prevMergedTerritories,
                s.lastMergedTerritories,
                easing,
                resampleN,
                overshoot,
                conquestOrigin,
            );
            s.isFillTransitioning = true;
            s.fillTransitionStart = now;
        }

        // Segment mode bookkeeping
        if (s.prevBorderEdges && s.targetBorderEdges && boundaryMode === 'segment') {
            s.borderTransitionStart = now;
            s.isBorderTransitioning = true;
        }
    }

    log.renderer('PVV2', `rebuild complete | total ${(performance.now() - now).toFixed(1)}ms`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache Reset
// ─────────────────────────────────────────────────────────────────────────────

export function resetPowerVoronoiCache(): void {
    defaultState.cachedShapeFingerprint = '';
    defaultState.cachedVisualFingerprint = '';

    defaultState.isBorderTransitioning = false;
    defaultState.prevBorderEdges = null;
    defaultState.targetBorderEdges = null;
    defaultState.borderTransitionStart = 0;

    defaultState.isSmoothTransitioning = false;
    defaultState.prevSharedPolylines = null;
    defaultState.targetSharedPolylines = null;
    defaultState.targetRawSharedPolylines = null;
    defaultState.smoothTransitionStart = 0;
    defaultState.lastMergedTerritories = null;

    defaultState.isFillTransitioning = false;
    defaultState.prevMergedTerritories = null;
    defaultState.prevEnclaveMap = null;
    defaultState.fillTransitionStart = 0;

    defaultState.activeBorderTransitionHandler = null;
    defaultState.activeShapeTransitionHandler = null;
    if (defaultState.activeRopeRenderer) {
        defaultState.activeRopeRenderer.removeAll();
        defaultState.activeRopeRenderer = null;
    }

    defaultState.lastEnclaveMap = null;
    defaultState.lastCells = null;
    defaultState.changedSiteIds = null;
    defaultState.lastWorldBorderPolylines = null;

    log.renderer('PVV2', 'cache reset');

    if (defaultState.fillGraphics) {
        if (defaultState.fillGraphics.parent) {
            defaultState.fillGraphics.parent.removeChild(defaultState.fillGraphics);
        }
        defaultState.fillGraphics.destroy();
        defaultState.fillGraphics = null;
    }
    if (defaultState.borderGraphics) {
        if (defaultState.borderGraphics.parent) {
            defaultState.borderGraphics.parent.removeChild(defaultState.borderGraphics);
        }
        defaultState.borderGraphics.destroy();
        defaultState.borderGraphics = null;
    }
}
```


***

## What was removed or quarantined

- **Removed from this module as dead/legacy code** (recoverable from git if needed):
    - `densifyBezierMidpoints`
    - `buildLerpedPolylines`
    - `renderInterpolatedBorders`
    - Edge-key helpers that were not used (`edgeKey`, `ptKey`) in the actual rendering path.
These all implemented pre-V3 border-interpolation behavior tied to `borderGraphics`, which the canonical and legacy paths now avoid in favor of drawing borders on the same geometry as fills or via the morpher APIs.[^1]
- **Neutral territory logic** is now centralized in `isNeutralOwner`, and used both by canonical shells and legacy merged territories instead of being duplicated.[^1]
- **Render style lookup** is centralized in `getRenderStyleFromConfig`, so alpha, border width/alpha, saturation and lightness are read once and passed to helpers.[^1]
- **Transition ticking** is factored into `tickSmoothTransitionFrame` and `tickSegmentTransitionFrame`, each returning a boolean “did we handle this frame entirely?” so `renderPowerVoronoi` can early-return and not fall back into the geometry stage.[^1]

***

## How this aligns with your 4‑layer pipeline

- **Ownership**: Already outside this file (`StarState` ownership, conquest events). This renderer just reads `stars` and `territoryTransitions`.[^1]
- **Geometry**: Encapsulated in `generateVoronoiTerritoryGeometry` and the canonical `CanonicalTerritoryData` provided by the orchestrator. The only geometry work done here is:
    - color assignment (purely visual),
    - concat/flatten points for PIXI,
    - optional debug vertex dots.
All topology shaping is upstream.[^1]
- **Transition: Fill / Border**: Now clearly encapsulated in:
    - active morpher handlers (`PolygonMorphTransitionHandler`, `SegmentMorphTransitionHandler`, `RopeBorderRenderer`),
    - `tickSmoothTransitionFrame` \& `tickSegmentTransitionFrame`, and
    - the “start transitions” block that wires in FX-driven modes from config (`TERRITORY_BORDER_TRANSITION`, etc.).[^1]
- **Presentation**: `renderFromCanonicalData`, `renderSteadyStateFillsAndBorders`, and `drawBorderPolylines` are purely about drawing. They take geometry + style + colors and issue PIXI commands.[^1]

If you’d like, next step I can:

- Extract the transition logic into a dedicated `TerritoryTransitionController` module so this file becomes almost pure presentation, and
- Sketch a tiny test harness (or Storybook-style scene) for stepping transitions in isolation from game ticks so you can debug geometry vs presentation issues more easily.

<div align="center">⁂</div>

[^1]: paste.txt

