import { describe, expect, it } from "vitest";

import {
    resolveCenteredViewportFrame,
    resolveContentFitWorldRect,
    resolveViewportWorldRect,
} from "$lib/components/game/worldRect";

describe("resolveViewportWorldRect", () => {
    it("prefers configured map extents when they already cover the star field", () => {
        const rect = resolveViewportWorldRect({
            points: [
                { x: 120, y: 140 },
                { x: 1320, y: 760 },
            ],
            configuredWidth: 1600,
            configuredHeight: 900,
        });

        expect(rect.minX).toBe(0);
        expect(rect.minY).toBe(0);
        expect(rect.width).toBe(1600);
        expect(rect.height).toBe(900);
        expect(rect.source).toBe("configured_map");
    });

    it("expands past stale configured extents instead of clipping the live star field", () => {
        const rect = resolveViewportWorldRect({
            points: [
                { x: 120, y: 140 },
                { x: 1680, y: 980 },
            ],
            configuredWidth: 1600,
            configuredHeight: 900,
        });

        expect(rect.width).toBe(1760);
        expect(rect.height).toBe(1060);
        expect(rect.requiredWidth).toBe(1760);
        expect(rect.requiredHeight).toBe(1060);
        expect(rect.source).toBe("expanded_configured_map");
    });

    it("falls back to star extents when no configured map rectangle exists", () => {
        const rect = resolveViewportWorldRect({
            points: [
                { x: 220, y: 160 },
                { x: 1180, y: 640 },
            ],
        });

        expect(rect.width).toBe(1260);
        expect(rect.height).toBe(720);
        expect(rect.source).toBe("derived_star_extents");
    });
});

describe("resolveContentFitWorldRect", () => {
    it("tracks the star field instead of forcing fit to the authored world rect", () => {
        const rect = resolveContentFitWorldRect([
            { x: 220, y: 160 },
            { x: 1180, y: 640 },
        ]);

        expect(rect.minX).toBe(140);
        expect(rect.minY).toBe(80);
        expect(rect.width).toBe(1120);
        expect(rect.height).toBe(640);
        expect(rect.centerX).toBe(700);
        expect(rect.centerY).toBe(400);
    });
});

describe("resolveCenteredViewportFrame", () => {
    it("centers a viewport-sized fill frame around the fitted content center", () => {
        const rect = resolveCenteredViewportFrame({
            centerX: 700,
            centerY: 400,
            viewportWidthPx: 1800,
            viewportHeightPx: 900,
            scale: 1.5,
        });

        expect(rect.width).toBe(1200);
        expect(rect.height).toBe(600);
        expect(rect.minX).toBe(100);
        expect(rect.minY).toBe(100);
        expect(rect.centerX).toBe(700);
        expect(rect.centerY).toBe(400);
    });
});
