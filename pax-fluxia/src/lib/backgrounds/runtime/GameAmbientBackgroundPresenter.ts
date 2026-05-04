import * as PIXI from 'pixi.js';
import type { CanonicalGeometrySnapshot, TerritoryRegionShape } from '$lib/territory/contracts/GeometryContracts';
import type { BackgroundModeId, BackgroundSelection } from '../types';
import { buildOwnerPalette, rgbToCss, type GameBackgroundPalette } from './gamePalette';

type OwnerColorResolver = (ownerId: string) => number;

const INITIAL_IMPLEMENTED_MODES = new Set<BackgroundModeId>([
    'nebula_veil',
    'banner_light',
    'shadow_mist',
    'starlit_dust',
]);

interface GameAmbientBackgroundInput {
    selection: BackgroundSelection;
    geometry: CanonicalGeometrySnapshot | null;
    nowMs: number;
    paused: boolean;
    opacity: number;
    originX: number;
    originY: number;
    worldWidth: number;
    worldHeight: number;
}

interface RegionBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
}

function hashString(value: string): number {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function clamp01(value: number | undefined, fallback: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return fallback;
    }
    return Math.max(0, Math.min(1, value));
}

function read(selection: BackgroundSelection, key: string, fallback: number): number {
    const value = selection.tunables[key];
    return typeof value === 'number' && Number.isFinite(value)
        ? value
        : fallback;
}

function computeBounds(region: TerritoryRegionShape): RegionBounds {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const point of region.points) {
        minX = Math.min(minX, point[0]);
        minY = Math.min(minY, point[1]);
        maxX = Math.max(maxX, point[0]);
        maxY = Math.max(maxY, point[1]);
    }
    return {
        minX,
        minY,
        maxX,
        maxY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
    };
}

function traceRegion(ctx: CanvasRenderingContext2D, region: TerritoryRegionShape): void {
    if (region.points.length < 3) return;
    ctx.beginPath();
    ctx.moveTo(region.points[0]![0], region.points[0]![1]);
    for (let index = 1; index < region.points.length; index += 1) {
        const point = region.points[index]!;
        ctx.lineTo(point[0], point[1]);
    }
    ctx.closePath();
}

function fillRegionBase(
    ctx: CanvasRenderingContext2D,
    region: TerritoryRegionShape,
    palette: GameBackgroundPalette,
    alpha: number,
): void {
    traceRegion(ctx, region);
    ctx.fillStyle = rgbToCss(palette.base, alpha);
    ctx.fill();
}

function randomUnit(seed: number): number {
    const next = Math.sin(seed * 91.371) * 43758.5453123;
    return next - Math.floor(next);
}

export class GameAmbientBackgroundPresenter {
    private readonly root = new PIXI.Container();
    private readonly canvas = document.createElement('canvas');
    private readonly context = this.canvas.getContext('2d');
    private readonly texture = PIXI.Texture.from(this.canvas);
    private readonly sprite = new PIXI.Sprite(this.texture);
    private frozenNowMs: number | null = null;

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
            input.selection.modeId === 'legacy_image' ||
            !INITIAL_IMPLEMENTED_MODES.has(input.selection.modeId)
        ) {
            this.clear();
            return false;
        }

        const nowMs = this.resolveNow(input.nowMs, input.paused);
        const renderScale = this.resolveRenderScale(
            input.worldWidth,
            input.worldHeight,
        );
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

        for (const region of input.geometry.territoryRegions) {
            if (!region.ownerId || region.points.length < 3) continue;
            this.drawRegion(ctx, region, input.selection, nowMs);
        }

        this.sprite.width = input.worldWidth;
        this.sprite.height = input.worldHeight;
        this.root.visible = true;
        this.texture.source.update();
        return true;
    }

    private resolveNow(nowMs: number, paused: boolean): number {
        if (!paused) {
            this.frozenNowMs = null;
            return nowMs;
        }
        if (this.frozenNowMs === null) {
            this.frozenNowMs = nowMs;
        }
        return this.frozenNowMs;
    }

    private resolveRenderScale(worldWidth: number, worldHeight: number): number {
        const maxDimension = Math.max(worldWidth, worldHeight);
        if (maxDimension <= 1600) return 1;
        return 1600 / maxDimension;
    }

    private drawRegion(
        ctx: CanvasRenderingContext2D,
        region: TerritoryRegionShape,
        selection: BackgroundSelection,
        nowMs: number,
    ): void {
        const palette = buildOwnerPalette(this.resolveOwnerColor(region.ownerId));
        const bounds = computeBounds(region);

        ctx.save();
        traceRegion(ctx, region);
        ctx.clip();
        fillRegionBase(
            ctx,
            region,
            palette,
            0.05 + clamp01(read(selection, 'intensity', 0.42), 0.42) * 0.04,
        );
        switch (selection.modeId) {
            case 'nebula_veil':
                this.drawNebulaVeil(ctx, bounds, selection, palette, nowMs);
                break;
            case 'banner_light':
                this.drawBannerLight(ctx, bounds, selection, palette, nowMs);
                break;
            case 'shadow_mist':
                this.drawShadowMist(ctx, bounds, selection, palette, nowMs);
                break;
            case 'starlit_dust':
                this.drawStarlitDust(ctx, region, bounds, selection, palette, nowMs);
                break;
            default:
                break;
        }
        ctx.restore();
    }

    private drawNebulaVeil(
        ctx: CanvasRenderingContext2D,
        bounds: RegionBounds,
        selection: BackgroundSelection,
        palette: GameBackgroundPalette,
        nowMs: number,
    ): void {
        const density = clamp01(read(selection, 'density', 0.3), 0.3);
        const intensity = clamp01(read(selection, 'intensity', 0.42), 0.42);
        const speed = read(selection, 'driftSpeed', 0.6);
        const parallax = read(selection, 'parallaxDepth', 0.18);
        const contrast = clamp01(read(selection, 'contrast', 0.2), 0.2);
        const time = nowMs * 0.0001 * (0.4 + speed);

        ctx.save();
        ctx.filter = `blur(${Math.round(26 + density * 34)}px)`;
        const blobs = [
            { phase: 0.7, color: palette.glow, radius: 0.34, x: 0.22, y: 0.28 },
            { phase: 1.5, color: palette.mist, radius: 0.28, x: 0.76, y: 0.34 },
            { phase: 2.2, color: palette.accent, radius: 0.24, x: 0.58, y: 0.72 },
        ];
        for (const blob of blobs) {
            const centerX =
                bounds.minX +
                bounds.width * blob.x +
                Math.sin(time + blob.phase) * bounds.width * 0.06 * parallax;
            const centerY =
                bounds.minY +
                bounds.height * blob.y +
                Math.cos(time * 0.85 + blob.phase) * bounds.height * 0.08 * parallax;
            const radius = Math.max(bounds.width, bounds.height) * blob.radius;
            const gradient = ctx.createRadialGradient(
                centerX,
                centerY,
                0,
                centerX,
                centerY,
                radius,
            );
            gradient.addColorStop(0, rgbToCss(blob.color, 0.16 + intensity * 0.1));
            gradient.addColorStop(0.55, rgbToCss(blob.color, 0.06 + contrast * 0.05));
            gradient.addColorStop(1, rgbToCss(blob.color, 0));
            ctx.fillStyle = gradient;
            ctx.fillRect(bounds.minX, bounds.minY, bounds.width, bounds.height);
        }
        ctx.restore();
    }

    private drawBannerLight(
        ctx: CanvasRenderingContext2D,
        bounds: RegionBounds,
        selection: BackgroundSelection,
        palette: GameBackgroundPalette,
        nowMs: number,
    ): void {
        const intensity = clamp01(read(selection, 'intensity', 0.34), 0.34);
        const sweepWidth = Math.max(0.08, read(selection, 'sweepWidth', 0.25));
        const bandCount = Math.max(1, Math.round(read(selection, 'bandCount', 2)));
        const sweepSpeed = read(selection, 'sweepSpeed', 0.48);
        const angle = (read(selection, 'sweepAngle', -16) * Math.PI) / 180;
        const time = nowMs * 0.00018 * Math.max(0.2, sweepSpeed);

        ctx.save();
        ctx.translate(bounds.minX + bounds.width / 2, bounds.minY + bounds.height / 2);
        ctx.rotate(angle);
        for (let index = 0; index < bandCount; index += 1) {
            const progress = (time + index / bandCount) % 1;
            const width = bounds.width * sweepWidth;
            const x = (progress - 0.5) * bounds.width * 2;
            const gradient = ctx.createLinearGradient(x - width, 0, x + width, 0);
            gradient.addColorStop(0, rgbToCss(palette.shadow, 0));
            gradient.addColorStop(
                0.5,
                rgbToCss(index % 2 === 0 ? palette.glow : palette.accent, 0.12 + intensity * 0.12),
            );
            gradient.addColorStop(1, rgbToCss(palette.shadow, 0));
            ctx.fillStyle = gradient;
            ctx.fillRect(
                -bounds.width,
                -bounds.height,
                bounds.width * 2,
                bounds.height * 2,
            );
        }
        ctx.restore();
    }

    private drawShadowMist(
        ctx: CanvasRenderingContext2D,
        bounds: RegionBounds,
        selection: BackgroundSelection,
        palette: GameBackgroundPalette,
        nowMs: number,
    ): void {
        const density = clamp01(read(selection, 'mistDensity', 0.45), 0.45);
        const curl = read(selection, 'curlAmount', 0.34);
        const intensity = clamp01(read(selection, 'intensity', 0.34), 0.34);
        const glintRate = clamp01(read(selection, 'glintRate', 0.1), 0.1);
        const time = nowMs * 0.00008 * (0.45 + curl);

        ctx.save();
        ctx.filter = `blur(${Math.round(42 + density * 44)}px)`;
        for (let index = 0; index < 4; index += 1) {
            const centerX =
                bounds.minX +
                bounds.width * (0.15 + index * 0.2) +
                Math.sin(time + index) * bounds.width * 0.08;
            const centerY =
                bounds.minY +
                bounds.height * (0.2 + (index % 2) * 0.28) +
                Math.cos(time * 0.7 + index * 1.3) * bounds.height * 0.06;
            const radius = Math.max(bounds.width, bounds.height) * (0.28 + density * 0.12);
            const gradient = ctx.createRadialGradient(
                centerX,
                centerY,
                0,
                centerX,
                centerY,
                radius,
            );
            gradient.addColorStop(0, rgbToCss(palette.shadow, 0.08 + intensity * 0.08));
            gradient.addColorStop(0.7, rgbToCss(palette.base, 0.04 + density * 0.05));
            gradient.addColorStop(1, rgbToCss(palette.shadow, 0));
            ctx.fillStyle = gradient;
            ctx.fillRect(bounds.minX, bounds.minY, bounds.width, bounds.height);
        }
        ctx.restore();

        for (let index = 0; index < 6; index += 1) {
            const phase = (nowMs * 0.0011 + index * 0.19) % 1;
            const alpha = Math.max(0, Math.sin(phase * Math.PI)) * (0.05 + glintRate * 0.08);
            if (alpha <= 0.01) continue;
            ctx.fillStyle = rgbToCss(palette.spark, alpha);
            ctx.beginPath();
            ctx.arc(
                bounds.minX + ((index * 73) % bounds.width),
                bounds.minY + ((index * 41) % bounds.height),
                1.2 + alpha * 5,
                0,
                Math.PI * 2,
            );
            ctx.fill();
        }
    }

    private drawStarlitDust(
        ctx: CanvasRenderingContext2D,
        region: TerritoryRegionShape,
        bounds: RegionBounds,
        selection: BackgroundSelection,
        palette: GameBackgroundPalette,
        nowMs: number,
    ): void {
        const density = clamp01(read(selection, 'particleDensity', 0.3), 0.3);
        const intensity = clamp01(read(selection, 'intensity', 0.46), 0.46);
        const twinkleRate = clamp01(read(selection, 'twinkleRate', 0.28), 0.28);
        const depthSpread = clamp01(read(selection, 'depthSpread', 0.45), 0.45);
        const sizeRange = clamp01(read(selection, 'sizeRange', 0.35), 0.35);
        const area = (bounds.width * bounds.height) / 32000;
        const particleCount = Math.max(5, Math.round(area * (5 + density * 16)));
        const seedBase = hashString(region.regionId);

        ctx.fillStyle = rgbToCss(palette.mist, 0.04 + intensity * 0.04);
        ctx.fillRect(bounds.minX, bounds.minY, bounds.width, bounds.height);

        for (let index = 0; index < particleCount; index += 1) {
            const seed = seedBase + index * 97;
            const x = bounds.minX + bounds.width * randomUnit(seed + 11);
            const y = bounds.minY + bounds.height * randomUnit(seed + 23);
            const phase = nowMs * 0.001 * (0.2 + twinkleRate) + randomUnit(seed + 41) * Math.PI * 2;
            const alpha = (0.08 + intensity * 0.12) * (0.45 + Math.sin(phase) * 0.55);
            const radius =
                0.8 +
                randomUnit(seed + 59) * (1.8 + sizeRange * 2.2) +
                depthSpread * 0.8;
            ctx.fillStyle = rgbToCss(index % 3 === 0 ? palette.spark : palette.glow, alpha);
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
