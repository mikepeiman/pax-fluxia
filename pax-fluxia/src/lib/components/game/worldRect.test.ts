import { describe, expect, it } from "vitest";

import { resolveViewportWorldRect } from "$lib/components/game/worldRect";

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
