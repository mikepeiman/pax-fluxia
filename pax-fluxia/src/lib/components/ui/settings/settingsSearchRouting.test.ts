import { describe, it, expect } from "vitest";
import { searchSettings } from "./settingsSearch";

/**
 * Proves the registry-driven search routing: a search result for a
 * render-mode-gated control now carries the section + subsection (render mode)
 * that actually MOUNTS the control, and the control's real rendered label —
 * the fix for "search lands on a mode where the control isn't there / shows the
 * wrong label" (the Chaikin / Max Cells cases).
 */
describe("registry-driven search routing", () => {
    const findSetting = (query: string, key: string) =>
        searchSettings(query, 24).find((r) => r.kind === "setting" && r.configKey === key);

    it("routes Border Chaikin Passes to a cell-grid render mode that mounts it", () => {
        const hit = findSetting("border chaikin", "CELL_GRID_BORDER_CHAIKIN_PASSES");
        expect(hit).toBeDefined();
        expect(hit!.sectionId).toBe("territory_styles");
        expect(hit!.subsectionId).toBe("phase_edges");
        expect(hit!.title).toBe("Border Chaikin Passes");
    });

    it("routes Frontier Chaikin to phase_edges with its rendered label", () => {
        const hit = findSetting("frontier chaikin", "TERRITORY_FRONTIER_CHAIKIN_PASSES");
        expect(hit).toBeDefined();
        expect(hit!.sectionId).toBe("territory_styles");
        expect(hit!.subsectionId).toBe("phase_edges");
        expect(hit!.title).toBe("Frontier Chaikin");
    });

    it("keeps grid-gradient Max Cells distinct from cell-grid Max Cells", () => {
        const results = searchSettings("max cells", 24).filter((r) => r.kind === "setting");
        const gg = results.find((r) => r.configKey === "GRID_GRADIENT_MAX_CELLS");
        expect(gg).toBeDefined();
        expect(gg!.subsectionId).toBe("grid_gradient");
        expect(gg!.title).toBe("Max Cells");
        // The cell-grid one still surfaces too (legacy), so both are findable.
        expect(results.some((r) => r.configKey === "CELL_GRID_MAX_CELLS")).toBe(true);
    });

    it("shows the rendered label for Border Rounding (transition)", () => {
        const hit = findSetting("border rounding", "VORONOI_BORDER_SMOOTH");
        expect(hit).toBeDefined();
        expect(hit!.sectionId).toBe("transition");
        expect(hit!.title).toBe("Border Rounding (Chaikin passes)");
    });
});
