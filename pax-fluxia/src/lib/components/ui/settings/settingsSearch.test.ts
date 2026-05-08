import { describe, expect, it } from "vitest";
import { searchSettings } from "./settingsSearch";

describe("settingsSearch", () => {
    it("routes legacy morph-control-point searches to PVV4 transition TVs", () => {
        const results = searchSettings("morph control points");
        const tvResult = results.find(
            (entry) =>
                entry.kind === "setting"
                && entry.configKey === "TERRITORY_MORPH_CONTROL_POINTS",
        );

        expect(tvResult).toBeTruthy();
        expect(tvResult?.sectionId).toBe("pvv4_transition");
        expect(tvResult?.title).toBe("Transition Vertices (TVs)");
    });

    it("keeps territory-engine morph easing distinct from PVV4 TV tuning", () => {
        const results = searchSettings("morph easing");
        const easingResult = results.find(
            (entry) =>
                entry.kind === "setting" && entry.configKey === "DF_MORPH_EASING",
        );

        expect(easingResult).toBeTruthy();
        expect(easingResult?.sectionId).toBe("territory_styles");
        expect(easingResult?.title).toBe("Territory Engine Morph Easing");
    });
});
