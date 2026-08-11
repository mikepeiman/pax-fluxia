import { describe, expect, it } from "vitest";
import { resolveCategoryOpenState } from "./settingsNav";

const CHIPS = ["match_flow", "economy", "players"];

describe("opening a settings category", () => {
    it("shows ALL sections when the user has never chosen one (the reported bug)", () => {
        // Was: fell back to chips[0], so a category always opened on its first
        // section and the rest were hidden behind a choice nobody made.
        expect(resolveCategoryOpenState(CHIPS, undefined)).toEqual({
            showAll: true,
            sectionId: null,
        });
    });

    it("restores the section the user last chose in that category", () => {
        expect(resolveCategoryOpenState(CHIPS, "economy")).toEqual({
            showAll: false,
            sectionId: "economy",
        });
    });

    it("keeps a deliberately collapsed body collapsed", () => {
        expect(resolveCategoryOpenState(CHIPS, null)).toEqual({
            showAll: false,
            sectionId: null,
        });
    });

    it("falls back to All — not the first chip — when the remembered section is gone", () => {
        expect(resolveCategoryOpenState(CHIPS, "a_section_that_was_removed")).toEqual({
            showAll: true,
            sectionId: null,
        });
    });

    it("opens the only section of a single-chip category (no All chip to return from)", () => {
        expect(resolveCategoryOpenState(["ui_help"], undefined)).toEqual({
            showAll: false,
            sectionId: "ui_help",
        });
    });

    it("handles an empty category without inventing a section", () => {
        expect(resolveCategoryOpenState([], undefined)).toEqual({
            showAll: false,
            sectionId: null,
        });
    });
});
