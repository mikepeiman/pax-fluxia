import { describe, expect, it } from "vitest";
import {
    canAccessAudience,
    getAudienceQueryPatch,
    loadForcePublicShell,
    loadInternalToolsUnlocked,
    loadShowAdvanced,
    parseAudienceFlag,
    saveForcePublicShell,
    resolveAudienceAccess,
    saveInternalToolsUnlocked,
    saveShowAdvanced,
} from "./audience";

function createStorage(seed?: Record<string, string>) {
    const values = new Map(Object.entries(seed ?? {}));
    return {
        getItem(key: string) {
            return values.get(key) ?? null;
        },
        setItem(key: string, value: string) {
            values.set(key, value);
        },
    };
}

describe("audience shell policy", () => {
    it("parses supported boolean query values", () => {
        expect(parseAudienceFlag("1")).toBe(true);
        expect(parseAudienceFlag("true")).toBe(true);
        expect(parseAudienceFlag("0")).toBe(false);
        expect(parseAudienceFlag("off")).toBe(false);
        expect(parseAudienceFlag("maybe")).toBeNull();
        expect(parseAudienceFlag(null)).toBeNull();
    });

    it("reads and writes persisted audience preferences", () => {
        const storage = createStorage();
        expect(loadShowAdvanced(storage)).toBe(false);
        expect(loadInternalToolsUnlocked(storage)).toBe(false);
        expect(loadForcePublicShell(storage)).toBe(false);

        saveShowAdvanced(true, storage);
        saveInternalToolsUnlocked(true, storage);
        saveForcePublicShell(true, storage);

        expect(loadShowAdvanced(storage)).toBe(true);
        expect(loadInternalToolsUnlocked(storage)).toBe(true);
        expect(loadForcePublicShell(storage)).toBe(true);
    });

    it("treats legacy diagnostics and benchmark params as internal deep links", () => {
        expect(
            getAudienceQueryPatch(new URLSearchParams("diag=1")),
        ).toEqual({ internalToolsUnlocked: true });
        expect(
            getAudienceQueryPatch(new URLSearchParams("bench=1")),
        ).toEqual({ internalToolsUnlocked: true });
        expect(
            getAudienceQueryPatch(new URLSearchParams("startupDiag=1")),
        ).toEqual({ internalToolsUnlocked: true });
    });

    it("supports a persisted public-shell preview override", () => {
        expect(
            getAudienceQueryPatch(new URLSearchParams("public=1")),
        ).toEqual({ forcePublicShell: true });
        expect(
            getAudienceQueryPatch(new URLSearchParams("public=0")),
        ).toEqual({ forcePublicShell: false });
    });

    it("lets explicit internal=0 override legacy compatibility params", () => {
        expect(
            getAudienceQueryPatch(new URLSearchParams("diag=1&internal=0")),
        ).toEqual({ internalToolsUnlocked: false });
    });

    it("persists query overrides into resolved audience access", () => {
        const storage = createStorage();
        const access = resolveAudienceAccess({
            storage,
            searchParams: new URLSearchParams("advanced=1&internal=1"),
        });

        expect(access.showAdvanced).toBe(true);
        expect(access.internalToolsUnlocked).toBe(true);
        expect(loadShowAdvanced(storage)).toBe(true);
        expect(loadInternalToolsUnlocked(storage)).toBe(true);
    });

    it("grants dev-shell access without persisting an internal unlock", () => {
        const access = resolveAudienceAccess({
            isDev: true,
            storage: createStorage(),
        });

        expect(access.internalToolsUnlocked).toBe(false);
        expect(canAccessAudience("public", access)).toBe(true);
        expect(canAccessAudience("advanced", access)).toBe(true);
        expect(canAccessAudience("internal", access)).toBe(true);
    });

    it("suppresses dev-only internal access when public-shell preview is forced", () => {
        const access = resolveAudienceAccess({
            isDev: true,
            storage: createStorage(),
            searchParams: new URLSearchParams("public=1"),
        });

        expect(access.forcePublicShell).toBe(true);
        expect(canAccessAudience("advanced", access)).toBe(false);
        expect(canAccessAudience("internal", access)).toBe(false);
    });

    it("treats internal access as a superset of advanced access", () => {
        const access = resolveAudienceAccess({
            storage: createStorage({ "pax-fluxia-internal-tools": "1" }),
        });

        expect(canAccessAudience("advanced", access)).toBe(true);
        expect(canAccessAudience("internal", access)).toBe(true);
    });
});
