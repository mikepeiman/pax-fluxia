import type { BackgroundSelection } from '../types';
import type { MenuBackgroundPalette } from './menuPalette';

interface MenuBackgroundRenderInput {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    nowMs: number;
    selection: BackgroundSelection;
    palette: MenuBackgroundPalette;
}

function clamp01(value: number | undefined, fallback: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return fallback;
    }
    return Math.min(1, Math.max(0, value));
}

function read(selection: BackgroundSelection, key: string, fallback: number): number {
    return typeof selection.tunables[key] === 'number'
        ? selection.tunables[key]!
        : fallback;
}

function withAlpha(hex: string, alpha: number): string {
    const normalized = hex.replace('#', '').trim();
    const expanded = normalized.length === 3
        ? normalized
              .split('')
              .map((digit) => digit + digit)
              .join('')
        : normalized;
    const r = Number.parseInt(expanded.slice(0, 2), 16);
    const g = Number.parseInt(expanded.slice(2, 4), 16);
    const b = Number.parseInt(expanded.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawBackdrop(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    palette: MenuBackgroundPalette,
): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, palette.base);
    gradient.addColorStop(1, palette.shadow);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(
        width * 0.5,
        height * 0.18,
        0,
        width * 0.5,
        height * 0.18,
        Math.max(width, height) * 0.55,
    );
    glow.addColorStop(0, withAlpha(palette.glow, 0.08));
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
}

function drawNebulaVeil(input: MenuBackgroundRenderInput): void {
    const { ctx, width, height, nowMs, selection, palette } = input;
    drawBackdrop(ctx, width, height, palette);
    const density = clamp01(read(selection, 'density', 0.38), 0.38);
    const intensity = clamp01(read(selection, 'intensity', 0.48), 0.48);
    const speed = read(selection, 'driftSpeed', 0.55);
    const parallax = read(selection, 'parallaxDepth', 0.24);
    const time = nowMs * 0.00008 * speed;

    const blobs = [
        { x: 0.18, y: 0.28, radius: 0.28, color: palette.glow, phase: 0.9 },
        { x: 0.72, y: 0.22, radius: 0.24, color: palette.accent, phase: 1.6 },
        { x: 0.62, y: 0.7, radius: 0.3, color: palette.mist, phase: 2.1 },
        { x: 0.28, y: 0.78, radius: 0.22, color: palette.accent, phase: 3.4 },
    ];

    ctx.save();
    ctx.filter = `blur(${Math.round(48 + density * 38)}px)`;
    for (const blob of blobs) {
        const offsetX = Math.sin(time + blob.phase) * width * 0.04 * parallax;
        const offsetY =
            Math.cos(time * 0.7 + blob.phase) * height * 0.05 * parallax;
        const radius = Math.max(width, height) * blob.radius;
        const gradient = ctx.createRadialGradient(
            width * blob.x + offsetX,
            height * blob.y + offsetY,
            0,
            width * blob.x + offsetX,
            height * blob.y + offsetY,
            radius,
        );
        gradient.addColorStop(0, withAlpha(blob.color, 0.16 * intensity));
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
}

function drawBannerLight(input: MenuBackgroundRenderInput): void {
    const { ctx, width, height, nowMs, selection, palette } = input;
    drawBackdrop(ctx, width, height, palette);
    const intensity = clamp01(read(selection, 'intensity', 0.38), 0.38);
    const bandCount = Math.max(1, Math.round(read(selection, 'bandCount', 3)));
    const sweepWidth = Math.max(0.08, read(selection, 'sweepWidth', 0.36));
    const sweepSpeed = read(selection, 'sweepSpeed', 0.42);
    const angle = (read(selection, 'sweepAngle', -12) * Math.PI) / 180;
    const time = nowMs * 0.00014 * sweepSpeed;

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(angle);
    for (let index = 0; index < bandCount; index += 1) {
        const progress = (time + index / bandCount) % 1;
        const x = (progress - 0.5) * width * 1.8;
        const bandWidth = width * sweepWidth;
        const gradient = ctx.createLinearGradient(
            x - bandWidth,
            0,
            x + bandWidth,
            0,
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(0.5, withAlpha(index % 2 === 0 ? palette.glow : palette.accent, 0.16 * intensity));
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(
            -width,
            -height,
            width * 2,
            height * 2,
        );
    }
    ctx.restore();
}

function drawShadowMist(input: MenuBackgroundRenderInput): void {
    const { ctx, width, height, nowMs, selection, palette } = input;
    drawBackdrop(ctx, width, height, palette);
    const density = clamp01(read(selection, 'mistDensity', 0.52), 0.52);
    const curl = read(selection, 'curlAmount', 0.38);
    const glintRate = clamp01(read(selection, 'glintRate', 0.15), 0.15);
    const intensity = clamp01(read(selection, 'intensity', 0.44), 0.44);
    const time = nowMs * 0.00006 * (0.45 + curl);

    ctx.save();
    ctx.filter = `blur(${Math.round(70 + density * 54)}px)`;
    for (let index = 0; index < 5; index += 1) {
        const x =
            width * (0.15 + index * 0.17) +
            Math.sin(time + index) * width * 0.07;
        const y =
            height * (0.2 + (index % 3) * 0.22) +
            Math.cos(time * 0.9 + index * 1.3) * height * 0.05;
        const radius = Math.max(width, height) * (0.18 + density * 0.14);
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, withAlpha(palette.mist, 0.07 * intensity));
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();

    const glintAlpha = 0.1 + 0.18 * glintRate;
    for (let index = 0; index < 10; index += 1) {
        const phase = (nowMs * 0.0012 + index * 0.71) % 1;
        const alpha = Math.max(0, Math.sin(phase * Math.PI)) * glintAlpha;
        if (alpha <= 0.02) continue;
        const x = ((index * 97) % width) + Math.sin(time + index) * 12;
        const y = ((index * 53) % height) + Math.cos(time * 0.7 + index) * 18;
        ctx.fillStyle = withAlpha(palette.glow, alpha);
        ctx.beginPath();
        ctx.arc(x, y, 1.2 + alpha * 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

export function renderMenuBackground(
    input: MenuBackgroundRenderInput,
): boolean {
    const { ctx, width, height, selection } = input;
    ctx.clearRect(0, 0, width, height);

    switch (selection.modeId) {
        case 'nebula_veil':
            drawNebulaVeil(input);
            return true;
        case 'banner_light':
            drawBannerLight(input);
            return true;
        case 'shadow_mist':
            drawShadowMist(input);
            return true;
        default:
            drawBackdrop(ctx, width, height, input.palette);
            return false;
    }
}
