import type { TerritoryRegionShape } from '$lib/territory/contracts/GeometryContracts';
import type { BackgroundSelection } from '../types';
import { type GameBackgroundPalette, rgbToCss } from './gamePalette';
import {
    clamp01,
    read,
    readAnimationRate,
    readFeatureScale,
    traceRegion,
    type RegionBounds,
} from './gameAmbientUtils';

export function fillRegionBase(
    ctx: CanvasRenderingContext2D,
    region: TerritoryRegionShape,
    palette: GameBackgroundPalette,
    alpha: number,
): void {
    traceRegion(ctx, region);
    ctx.fillStyle = rgbToCss(palette.base, alpha);
    ctx.fill();
}

export function drawNebulaVeil(
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
    const animationRate = 0.25 + readAnimationRate(selection) * 0.75;
    const featureScale = readFeatureScale(selection);
    const time = nowMs * 0.0001 * (0.4 + speed) * animationRate;

    ctx.save();
    ctx.filter = `blur(${Math.round((26 + density * 34) * featureScale)}px)`;
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
        const radius = Math.max(bounds.width, bounds.height) * blob.radius * featureScale;
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

export function drawBannerLight(
    ctx: CanvasRenderingContext2D,
    bounds: RegionBounds,
    selection: BackgroundSelection,
    palette: GameBackgroundPalette,
    nowMs: number,
): void {
    const intensity = clamp01(read(selection, 'intensity', 0.34), 0.34);
    const featureScale = readFeatureScale(selection);
    const sweepWidth = Math.max(0.08, read(selection, 'sweepWidth', 0.25) * featureScale);
    const bandCount = Math.max(1, Math.round(read(selection, 'bandCount', 2)));
    const sweepSpeed = read(selection, 'sweepSpeed', 0.48);
    const angle = (read(selection, 'sweepAngle', -16) * Math.PI) / 180;
    const animationRate = 0.25 + readAnimationRate(selection) * 0.75;
    const time = nowMs * 0.00018 * Math.max(0.2, sweepSpeed) * animationRate;

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
        ctx.fillRect(-bounds.width, -bounds.height, bounds.width * 2, bounds.height * 2);
    }
    ctx.restore();
}

export function drawShadowMist(
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
    const falloff = clamp01(read(selection, 'falloff', 0.58), 0.58);
    const featureScale = readFeatureScale(selection);
    const animationRate = 0.2 + readAnimationRate(selection) * 0.8;
    const time = nowMs * 0.00008 * (0.45 + curl) * animationRate;

    ctx.save();
    ctx.filter = `blur(${Math.round((42 + density * 44) * featureScale)}px)`;
    for (let index = 0; index < 4; index += 1) {
        const centerX =
            bounds.minX +
            bounds.width * (0.15 + index * 0.2) +
            Math.sin(time + index) * bounds.width * 0.08;
        const centerY =
            bounds.minY +
            bounds.height * (0.2 + (index % 2) * 0.28) +
            Math.cos(time * 0.7 + index * 1.3) * bounds.height * 0.06;
        const radius =
            Math.max(bounds.width, bounds.height) *
            (0.22 + density * 0.16 + falloff * 0.1) *
            featureScale;
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, rgbToCss(palette.shadow, 0.08 + intensity * 0.08));
        gradient.addColorStop(0.48 + falloff * 0.34, rgbToCss(palette.base, 0.04 + density * 0.05));
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

export function drawLeylineFlow(
    ctx: CanvasRenderingContext2D,
    bounds: RegionBounds,
    selection: BackgroundSelection,
    palette: GameBackgroundPalette,
    nowMs: number,
): void {
    const intensity = clamp01(read(selection, 'intensity', 0.44), 0.44);
    const lineDensity = clamp01(read(selection, 'lineDensity', 0.3), 0.3);
    const flowSpeed = Math.max(0, read(selection, 'flowSpeed', 0.65));
    const warpAmount = clamp01(read(selection, 'warpAmount', 0.28), 0.28);
    const lineThickness = Math.max(0.1, read(selection, 'lineThickness', 0.24));
    const featureScale = readFeatureScale(selection);
    const animationRate = 0.25 + readAnimationRate(selection) * 0.75;
    const time = nowMs * 0.001 * animationRate * (0.3 + flowSpeed);
    const lineCount = Math.max(3, Math.round(3 + lineDensity * 7));

    ctx.fillStyle = rgbToCss(palette.mist, 0.035 + intensity * 0.05);
    ctx.fillRect(bounds.minX, bounds.minY, bounds.width, bounds.height);

    for (let index = 0; index < lineCount; index += 1) {
        const baseY = bounds.minY + (bounds.height * (index + 1)) / (lineCount + 1);
        const amplitude = bounds.height * (0.04 + warpAmount * 0.1) * featureScale;
        const phase = time * 1.1 + index * 0.72;
        const steps = 12;

        ctx.beginPath();
        for (let step = 0; step <= steps; step += 1) {
            const t = step / steps;
            const x = bounds.minX + bounds.width * t;
            const y =
                baseY +
                Math.sin(phase + t * Math.PI * 2.2) * amplitude +
                Math.cos(phase * 0.65 + t * Math.PI * 4.4) * amplitude * 0.32;
            if (step === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.lineWidth = (0.8 + lineThickness * 2.8) * featureScale;
        ctx.strokeStyle = rgbToCss(
            index % 2 === 0 ? palette.glow : palette.accent,
            0.08 + intensity * 0.14,
        );
        ctx.stroke();
    }
}

export function drawSharedFinish(
    ctx: CanvasRenderingContext2D,
    region: TerritoryRegionShape,
    bounds: RegionBounds,
    selection: BackgroundSelection,
    palette: GameBackgroundPalette,
): void {
    const edgeSoftness = clamp01(read(selection, 'edgeSoftness', 0.55), 0.55);
    const vignette = clamp01(read(selection, 'vignette', 0.12), 0.12);
    const featureScale = readFeatureScale(selection);

    if (edgeSoftness > 0.01) {
        ctx.save();
        ctx.filter = `blur(${Math.round((6 + edgeSoftness * 18) * featureScale)}px)`;
        traceRegion(ctx, region);
        ctx.lineWidth = (4 + edgeSoftness * 14) * featureScale;
        ctx.strokeStyle = rgbToCss(palette.frontier, 0.015 + edgeSoftness * 0.04);
        ctx.stroke();
        ctx.restore();
    }

    if (vignette > 0.01) {
        const centerX = bounds.minX + bounds.width / 2;
        const centerY = bounds.minY + bounds.height / 2;
        const gradient = ctx.createRadialGradient(
            centerX,
            centerY,
            0,
            centerX,
            centerY,
            Math.max(bounds.width, bounds.height) * 0.7 * featureScale,
        );
        gradient.addColorStop(0, rgbToCss(palette.shadow, 0));
        gradient.addColorStop(0.72, rgbToCss(palette.shadow, 0));
        gradient.addColorStop(1, rgbToCss(palette.shadow, 0.08 + vignette * 0.18));
        ctx.fillStyle = gradient;
        ctx.fillRect(bounds.minX, bounds.minY, bounds.width, bounds.height);
    }
}
