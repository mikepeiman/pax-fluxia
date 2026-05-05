import type { TerritoryRegionShape } from '$lib/territory/contracts/GeometryContracts';
import type { BackgroundSelection } from '../types';
import { type GameBackgroundPalette, rgbToCss } from './gamePalette';
import {
    clampAlpha,
    hashString,
    randomUnit,
    read,
    readAnimationRate,
    readFeatureScale,
    readStrength,
    samplePolylinePoint,
    type RegionBounds,
} from './gameAmbientUtils';

export function drawStarlitDust(
    ctx: CanvasRenderingContext2D,
    region: TerritoryRegionShape,
    bounds: RegionBounds,
    selection: BackgroundSelection,
    palette: GameBackgroundPalette,
    nowMs: number,
): void {
    const density = readStrength(selection, 'particleDensity', 0.3);
    const intensity = readStrength(selection, 'intensity', 0.46);
    const twinkleRate = readStrength(selection, 'twinkleRate', 0.28);
    const depthSpread = readStrength(selection, 'depthSpread', 0.45);
    const sizeRange = readStrength(selection, 'sizeRange', 0.35);
    const featureScale = readFeatureScale(selection);
    const animationRate = 0.25 + readAnimationRate(selection) * 0.75;
    const area = (bounds.width * bounds.height) / 32000;
    const particleCount = Math.max(
        5,
        Math.min(
            720,
            Math.round(
                area *
                    ((5 + density * 28) / Math.max(0.55, featureScale * 0.75)),
            ),
        ),
    );
    const seedBase = hashString(region.regionId);

    ctx.fillStyle = rgbToCss(palette.mist, clampAlpha(0.02 + intensity * 0.03));
    ctx.fillRect(bounds.minX, bounds.minY, bounds.width, bounds.height);

    for (let index = 0; index < particleCount; index += 1) {
        const seed = seedBase + index * 97;
        const drift = nowMs * 0.00012 * animationRate * (0.3 + twinkleRate);
        const x = bounds.minX + bounds.width * ((randomUnit(seed + 11) + drift * 0.12) % 1);
        const y = bounds.minY + bounds.height * ((randomUnit(seed + 23) + drift * 0.07) % 1);
        const phase =
            nowMs * 0.001 * animationRate * (0.2 + twinkleRate) +
            randomUnit(seed + 41) * Math.PI * 2;
        const alpha =
            clampAlpha(0.04 + intensity * 0.05) *
            (0.45 + Math.sin(phase) * 0.55);
        const radius =
            0.8 +
            randomUnit(seed + 59) * (1.8 + sizeRange * 1.6) * featureScale +
            depthSpread * 0.45;
        ctx.fillStyle = rgbToCss(index % 3 === 0 ? palette.spark : palette.glow, alpha);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

export function drawEmberKingdom(
    ctx: CanvasRenderingContext2D,
    bounds: RegionBounds,
    selection: BackgroundSelection,
    palette: GameBackgroundPalette,
    nowMs: number,
): void {
    const intensity = readStrength(selection, 'intensity', 0.5);
    const emberDensity = readStrength(selection, 'emberDensity', 0.28);
    const riseSpeed = Math.max(0, read(selection, 'riseSpeed', 0.75));
    const heatDistortion = readStrength(selection, 'heatDistortion', 0.2);
    const sparkLifetime = Math.max(0.1, read(selection, 'sparkLifetime', 0.4));
    const featureScale = readFeatureScale(selection);
    const animationRate = 0.25 + readAnimationRate(selection) * 0.75;
    const time = nowMs * 0.001 * animationRate * (0.35 + riseSpeed);
    const area = (bounds.width * bounds.height) / 34000;
    const emberCount = Math.max(
        6,
        Math.min(
            720,
            Math.round(
                area *
                    ((5 + emberDensity * 24) / Math.max(0.6, featureScale * 0.75)),
            ),
        ),
    );

    const glowGradient = ctx.createLinearGradient(bounds.minX, bounds.maxY, bounds.minX, bounds.minY);
    glowGradient.addColorStop(0, rgbToCss(palette.accent, clampAlpha(0.06 + intensity * 0.06)));
    glowGradient.addColorStop(
        0.45,
        rgbToCss(palette.glow, clampAlpha(0.03 + heatDistortion * 0.04)),
    );
    glowGradient.addColorStop(1, rgbToCss(palette.shadow, 0));
    ctx.fillStyle = glowGradient;
    ctx.fillRect(bounds.minX, bounds.minY, bounds.width, bounds.height);

    ctx.save();
    ctx.filter = `blur(${Math.round((12 + heatDistortion * 24) * featureScale)}px)`;
    for (let index = 0; index < 3; index += 1) {
        const centerX =
            bounds.minX +
            bounds.width * (0.18 + index * 0.26) +
            Math.sin(time * 0.7 + index) * bounds.width * 0.04;
        const centerY =
            bounds.maxY - bounds.height * (0.14 + index * 0.12) -
            Math.cos(time * 0.5 + index) * bounds.height * 0.03;
        const radius =
            Math.max(bounds.width, bounds.height) *
            (0.14 + heatDistortion * 0.05);
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, rgbToCss(palette.accent, clampAlpha(0.04 + intensity * 0.05)));
        gradient.addColorStop(1, rgbToCss(palette.shadow, 0));
        ctx.fillStyle = gradient;
        ctx.fillRect(bounds.minX, bounds.minY, bounds.width, bounds.height);
    }
    ctx.restore();

    const seedBase = hashString(`${bounds.minX}:${bounds.minY}:${bounds.maxX}`);
    for (let index = 0; index < emberCount; index += 1) {
        const seed = seedBase + index * 131;
        const lane = randomUnit(seed + 7);
        const travel = ((time * 0.2 + lane * sparkLifetime) % 1 + 1) % 1;
        const x =
            bounds.minX +
            bounds.width * randomUnit(seed + 17) +
            Math.sin(time * 0.9 + index) * bounds.width * 0.02 * heatDistortion;
        const y = bounds.maxY - travel * bounds.height;
        const alpha =
            clampAlpha(0.05 + intensity * 0.07) *
            (0.35 + Math.sin((1 - travel) * Math.PI) * 0.65);
        const radius = 0.9 + randomUnit(seed + 29) * (1.4 + featureScale * 1.6);
        ctx.fillStyle = rgbToCss(index % 4 === 0 ? palette.spark : palette.accent, alpha);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

export function drawFrostVeins(
    ctx: CanvasRenderingContext2D,
    bounds: RegionBounds,
    selection: BackgroundSelection,
    palette: GameBackgroundPalette,
    nowMs: number,
): void {
    const intensity = readStrength(selection, 'intensity', 0.42);
    const flakeDensity = readStrength(selection, 'flakeDensity', 0.24);
    const glintFrequency = readStrength(selection, 'glintFrequency', 0.22);
    const crystalSharpness = readStrength(selection, 'crystalSharpness', 0.4);
    const pulseSoftness = readStrength(selection, 'pulseSoftness', 0.62);
    const featureScale = readFeatureScale(selection);
    const animationRate = 0.25 + readAnimationRate(selection) * 0.75;
    const time = nowMs * 0.001 * animationRate;
    const pulse =
        0.4 +
        Math.max(0.12, 0.6 - pulseSoftness * 0.08) *
            (0.5 + Math.sin(time * (0.7 + glintFrequency * 0.8)) * 0.5);

    const wash = ctx.createLinearGradient(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY);
    wash.addColorStop(0, rgbToCss(palette.mist, clampAlpha(0.04 + intensity * 0.05)));
    wash.addColorStop(0.55, rgbToCss(palette.glow, clampAlpha(0.02 + pulse * 0.05)));
    wash.addColorStop(1, rgbToCss(palette.shadow, 0));
    ctx.fillStyle = wash;
    ctx.fillRect(bounds.minX, bounds.minY, bounds.width, bounds.height);

    const veinCount = Math.max(2, Math.min(80, Math.round(2 + crystalSharpness * 5)));
    for (let index = 0; index < veinCount; index += 1) {
        const baseX = bounds.minX + (bounds.width * (index + 0.5)) / (veinCount + 0.2);
        const phase = time * 0.8 + index * 0.9;

        ctx.beginPath();
        for (let step = 0; step <= 10; step += 1) {
            const t = step / 10;
            const x =
                baseX +
                Math.sin(phase + t * Math.PI * 3.4) * bounds.width * 0.05 * featureScale;
            const y = bounds.minY + bounds.height * t;
            if (step === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.lineWidth = 0.8 + crystalSharpness * 1.8;
        ctx.strokeStyle = rgbToCss(palette.spark, clampAlpha(0.03 + pulse * 0.08));
        ctx.stroke();
    }

    const area = (bounds.width * bounds.height) / 36000;
    const flakeCount = Math.max(
        4,
        Math.min(
            720,
            Math.round(
                area *
                    ((4 + flakeDensity * 26) / Math.max(0.6, featureScale * 0.75)),
            ),
        ),
    );
    const seedBase = hashString(`${bounds.minX}:${bounds.maxY}:${bounds.width}`);
    for (let index = 0; index < flakeCount; index += 1) {
        const seed = seedBase + index * 157;
        const x = bounds.minX + bounds.width * randomUnit(seed + 11);
        const y = bounds.minY + bounds.height * randomUnit(seed + 23);
        const phase = time * (1.1 + glintFrequency * 1.4) + randomUnit(seed + 47) * Math.PI * 2;
        const alpha =
            clampAlpha(0.04 + intensity * 0.05) *
            (0.35 + Math.sin(phase) * 0.65);
        const radius = 0.8 + randomUnit(seed + 61) * (1.2 + crystalSharpness * 1.6);
        ctx.fillStyle = rgbToCss(index % 2 === 0 ? palette.spark : palette.mist, alpha);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

export function drawStormCurrent(
    ctx: CanvasRenderingContext2D,
    region: TerritoryRegionShape,
    bounds: RegionBounds,
    selection: BackgroundSelection,
    palette: GameBackgroundPalette,
    nowMs: number,
): void {
    const intensity = readStrength(selection, 'intensity', 0.48);
    const chargeDensity = readStrength(selection, 'chargeDensity', 0.3);
    const arcFrequency = readStrength(selection, 'arcFrequency', 0.22);
    const crawlSpeed = Math.max(0, read(selection, 'crawlSpeed', 0.75));
    const frontierWidth = Math.max(0.1, read(selection, 'frontierWidth', 0.32));
    const featureScale = readFeatureScale(selection);
    const animationRate = 0.25 + readAnimationRate(selection) * 0.75;
    const time = nowMs * 0.001 * animationRate;

    ctx.fillStyle = rgbToCss(palette.mist, clampAlpha(0.02 + intensity * 0.04));
    ctx.fillRect(bounds.minX, bounds.minY, bounds.width, bounds.height);

    const area = (bounds.width * bounds.height) / 34000;
    const chargeCount = Math.max(
        4,
        Math.min(
            720,
            Math.round(
                area *
                    ((4 + chargeDensity * 22) / Math.max(0.6, featureScale * 0.75)),
            ),
        ),
    );
    const seedBase = hashString(region.regionId);
    for (let index = 0; index < chargeCount; index += 1) {
        const seed = seedBase + index * 173;
        const x = bounds.minX + bounds.width * randomUnit(seed + 11);
        const y = bounds.minY + bounds.height * randomUnit(seed + 31);
        const phase =
            time * (1.2 + crawlSpeed * 0.4) + randomUnit(seed + 59) * Math.PI * 2;
        const alpha =
            clampAlpha(0.04 + intensity * 0.05) *
            (0.35 + Math.sin(phase) * 0.65);
        ctx.fillStyle = rgbToCss(index % 2 === 0 ? palette.spark : palette.frontier, alpha);
        ctx.beginPath();
        ctx.arc(x, y, 0.8 + randomUnit(seed + 71) * 2.4, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.save();
    ctx.filter = `blur(${Math.round((3 + frontierWidth * 6) * featureScale)}px)`;
    ctx.beginPath();
    ctx.moveTo(region.points[0]![0], region.points[0]![1]);
    for (let index = 1; index < region.points.length; index += 1) {
        const point = region.points[index]!;
        ctx.lineTo(point[0], point[1]);
    }
    ctx.closePath();
    ctx.lineWidth = (3 + frontierWidth * 8) * featureScale;
    ctx.strokeStyle = rgbToCss(palette.frontier, clampAlpha(0.04 + intensity * 0.05));
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(region.points[0]![0], region.points[0]![1]);
    for (let index = 1; index < region.points.length; index += 1) {
        const point = region.points[index]!;
        ctx.lineTo(point[0], point[1]);
    }
    ctx.closePath();
    const dashLength = (12 + frontierWidth * 18) * featureScale;
    const gapLength = Math.max(2, (14 - Math.min(12, arcFrequency)) * featureScale);
    ctx.setLineDash([dashLength, gapLength]);
    ctx.lineDashOffset = -time * (14 + crawlSpeed * 32);
    ctx.lineWidth = (1.4 + frontierWidth * 4) * featureScale;
    ctx.strokeStyle = rgbToCss(palette.spark, clampAlpha(0.08 + intensity * 0.06));
    ctx.stroke();
    ctx.restore();

    const sparkCount = Math.max(2, Math.min(96, Math.round(2 + arcFrequency * 6)));
    for (let index = 0; index < sparkCount; index += 1) {
        const sparkProgress = ((time * (0.08 + crawlSpeed * 0.04)) + index / sparkCount) % 1;
        const [x, y] = samplePolylinePoint(region.points, sparkProgress);
        ctx.fillStyle = rgbToCss(palette.spark, clampAlpha(0.06 + intensity * 0.06));
        ctx.beginPath();
        ctx.arc(x, y, 1.4 + frontierWidth * 3.2, 0, Math.PI * 2);
        ctx.fill();
    }
}
