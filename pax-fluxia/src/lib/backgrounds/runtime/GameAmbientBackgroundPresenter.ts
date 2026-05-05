import * as PIXI from 'pixi.js';
import type {
    CanonicalGeometrySnapshot,
    TerritoryRegionShape,
} from '$lib/territory/contracts/GeometryContracts';
import type {
    BackgroundModeId,
    BackgroundSelection,
    BackgroundSelectionMap,
} from '../types';
import { buildOwnerPalette } from './gamePalette';
import {
    computeBounds,
    clampAlpha,
    readStrength,
    traceRegion,
} from './gameAmbientUtils';
import {
    drawBannerLight,
    drawLeylineFlow,
    drawNebulaVeil,
    drawShadowMist,
    drawSharedFinish,
    fillRegionBase,
} from './gameAmbientInteriorDrawers';
import {
    drawEmberKingdom,
    drawFrostVeins,
    drawStarlitDust,
    drawStormCurrent,
} from './gameAmbientParticleDrawers';

type OwnerColorResolver = (ownerId: string) => number;

const IMPLEMENTED_MODES = new Set<BackgroundModeId>([
    'nebula_veil',
    'banner_light',
    'shadow_mist',
    'starlit_dust',
    'leyline_flow',
    'ember_kingdom',
    'frost_veins',
    'storm_current',
]);

interface GameAmbientBackgroundInput {
    selection: BackgroundSelection;
    affectAllTerritory?: boolean;
    playerSelections?: BackgroundSelectionMap;
    geometry: CanonicalGeometrySnapshot | null;
    nowMs: number;
    opacity: number;
    originX: number;
    originY: number;
    worldWidth: number;
    worldHeight: number;
}

export class GameAmbientBackgroundPresenter {
    private readonly root = new PIXI.Container();
    private readonly canvas = document.createElement('canvas');
    private readonly context = this.canvas.getContext('2d');
    private readonly texture = PIXI.Texture.from(this.canvas);
    private readonly sprite = new PIXI.Sprite(this.texture);

    constructor(
        parent: PIXI.Container,
        private readonly resolveOwnerColor: OwnerColorResolver,
    ) {
        this.root.visible = false;
        this.root.eventMode = 'none';
        this.sprite.eventMode = 'none';
        this.root.addChild(this.sprite);
        parent.addChildAt(this.root, Math.min(1, parent.children.length));
    }

    clear(): void {
        this.root.visible = false;
    }

    reset(): void {
        this.clear();
        this.texture.destroy(true);
        this.root.destroy({ children: true });
    }

    present(input: GameAmbientBackgroundInput): boolean {
        this.root.x = input.originX;
        this.root.y = input.originY;
        this.root.alpha = input.opacity;

        if (
            !this.context ||
            !input.geometry ||
            (
                input.selection.modeId === 'legacy_image' &&
                !Object.values(input.playerSelections ?? {}).some(
                    (selection) => selection.modeId !== 'legacy_image',
                )
            )
        ) {
            this.clear();
            return false;
        }

        const renderScale = this.resolveRenderScale(input.worldWidth, input.worldHeight);
        const pixelWidth = Math.max(1, Math.round(input.worldWidth * renderScale));
        const pixelHeight = Math.max(1, Math.round(input.worldHeight * renderScale));

        if (this.canvas.width !== pixelWidth) this.canvas.width = pixelWidth;
        if (this.canvas.height !== pixelHeight) this.canvas.height = pixelHeight;

        const scaleX = this.canvas.width / Math.max(1, input.worldWidth);
        const scaleY = this.canvas.height / Math.max(1, input.worldHeight);
        const ctx = this.context;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

        let drewAnyRegion = false;
        for (const region of input.geometry.territoryRegions) {
            if (!region.ownerId || region.points.length < 3) continue;
            const selection = this.resolveSelectionForRegion(
                region.ownerId,
                input.selection,
                input.affectAllTerritory !== false,
                input.playerSelections ?? {},
            );
            if (!selection) continue;
            this.drawRegion(ctx, region, selection, input.nowMs);
            drewAnyRegion = true;
        }

        if (!drewAnyRegion) {
            this.clear();
            return false;
        }

        this.sprite.width = input.worldWidth;
        this.sprite.height = input.worldHeight;
        this.root.visible = true;
        this.texture.source.update();
        return true;
    }

    private resolveRenderScale(worldWidth: number, worldHeight: number): number {
        const maxDimension = Math.max(worldWidth, worldHeight);
        if (maxDimension <= 1600) return 1;
        return 1600 / maxDimension;
    }

    private resolveSelectionForRegion(
        ownerId: string,
        globalSelection: BackgroundSelection,
        affectAllTerritory: boolean,
        playerSelections: BackgroundSelectionMap,
    ): BackgroundSelection | null {
        if (affectAllTerritory) {
            return IMPLEMENTED_MODES.has(globalSelection.modeId)
                ? globalSelection
                : null;
        }

        const playerSelection = playerSelections[ownerId];
        if (playerSelection && IMPLEMENTED_MODES.has(playerSelection.modeId)) {
            return playerSelection;
        }

        return IMPLEMENTED_MODES.has(globalSelection.modeId)
            ? globalSelection
            : null;
    }

    private drawRegion(
        ctx: CanvasRenderingContext2D,
        region: TerritoryRegionShape,
        selection: BackgroundSelection,
        nowMs: number,
    ): void {
        const palette = buildOwnerPalette(this.resolveOwnerColor(region.ownerId));
        const bounds = computeBounds(region);
        const intensity = readStrength(selection, 'intensity', 0.42);

        ctx.save();
        traceRegion(ctx, region);
        ctx.clip();
        fillRegionBase(
            ctx,
            region,
            palette,
            clampAlpha(0.03 + intensity * 0.05),
        );

        switch (selection.modeId) {
            case 'nebula_veil':
                drawNebulaVeil(ctx, bounds, selection, palette, nowMs);
                break;
            case 'banner_light':
                drawBannerLight(ctx, bounds, selection, palette, nowMs);
                break;
            case 'shadow_mist':
                drawShadowMist(ctx, bounds, selection, palette, nowMs);
                break;
            case 'starlit_dust':
                drawStarlitDust(ctx, region, bounds, selection, palette, nowMs);
                break;
            case 'leyline_flow':
                drawLeylineFlow(ctx, bounds, selection, palette, nowMs);
                break;
            case 'ember_kingdom':
                drawEmberKingdom(ctx, bounds, selection, palette, nowMs);
                break;
            case 'frost_veins':
                drawFrostVeins(ctx, bounds, selection, palette, nowMs);
                break;
            case 'storm_current':
                drawStormCurrent(ctx, region, bounds, selection, palette, nowMs);
                break;
            default:
                break;
        }

        drawSharedFinish(ctx, region, bounds, selection, palette);
        ctx.restore();
    }
}
