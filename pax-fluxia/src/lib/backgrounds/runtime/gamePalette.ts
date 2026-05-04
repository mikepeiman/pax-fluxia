export interface GameBackgroundPalette {
    readonly base: [number, number, number];
    readonly shadow: [number, number, number];
    readonly glow: [number, number, number];
    readonly accent: [number, number, number];
    readonly mist: [number, number, number];
    readonly spark: [number, number, number];
    readonly frontier: [number, number, number];
}

type Rgb = [number, number, number];

function clampChannel(value: number): number {
    return Math.max(0, Math.min(255, Math.round(value)));
}

function mixChannel(a: number, b: number, amount: number): number {
    return clampChannel(a + (b - a) * amount);
}

function mixColor(a: Rgb, b: Rgb, amount: number): Rgb {
    return [
        mixChannel(a[0], b[0], amount),
        mixChannel(a[1], b[1], amount),
        mixChannel(a[2], b[2], amount),
    ];
}

export function rgbToCss(color: Rgb, alpha = 1): string {
    return `rgba(${clampChannel(color[0])}, ${clampChannel(color[1])}, ${clampChannel(color[2])}, ${alpha})`;
}

export function ownerColorToRgb(color: number): Rgb {
    return [
        (color >> 16) & 0xff,
        (color >> 8) & 0xff,
        color & 0xff,
    ];
}

export function buildOwnerPalette(ownerColor: number): GameBackgroundPalette {
    const ownerRgb = ownerColorToRgb(ownerColor);
    const white: Rgb = [255, 255, 255];
    const black: Rgb = [5, 10, 18];
    const ember: Rgb = [255, 156, 90];
    const frost: Rgb = [144, 220, 255];
    const storm: Rgb = [120, 228, 255];

    return {
        base: mixColor(ownerRgb, black, 0.74),
        shadow: mixColor(ownerRgb, black, 0.88),
        glow: mixColor(ownerRgb, white, 0.34),
        accent: mixColor(ownerRgb, ember, 0.25),
        mist: mixColor(ownerRgb, frost, 0.22),
        spark: mixColor(ownerRgb, white, 0.55),
        frontier: mixColor(ownerRgb, storm, 0.2),
    };
}
