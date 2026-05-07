export type Audience = "public" | "advanced" | "internal";

export interface AudienceAccess {
    showAdvanced: boolean;
    internalToolsUnlocked: boolean;
    isDev: boolean;
    forcePublicShell: boolean;
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export const SHOW_ADVANCED_STORAGE_KEY = "pax-fluxia-show-advanced";
export const INTERNAL_TOOLS_STORAGE_KEY = "pax-fluxia-internal-tools";
export const FORCE_PUBLIC_SHELL_STORAGE_KEY = "pax-fluxia-force-public-shell";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);
const LEGACY_INTERNAL_QUERY_KEYS = ["bench", "diag", "startupDiag"] as const;

function getStorage(storage?: StorageLike | null): StorageLike | null {
    if (storage !== undefined) {
        return storage;
    }
    if (typeof window === "undefined") {
        return null;
    }
    return window.localStorage;
}

export function parseAudienceFlag(value: string | null | undefined): boolean | null {
    if (value == null) return null;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    if (TRUE_VALUES.has(normalized)) return true;
    if (FALSE_VALUES.has(normalized)) return false;
    return null;
}

export function loadShowAdvanced(storage?: StorageLike | null): boolean {
    const target = getStorage(storage);
    return parseAudienceFlag(target?.getItem(SHOW_ADVANCED_STORAGE_KEY)) ?? false;
}

export function saveShowAdvanced(
    showAdvanced: boolean,
    storage?: StorageLike | null,
): void {
    getStorage(storage)?.setItem(
        SHOW_ADVANCED_STORAGE_KEY,
        showAdvanced ? "1" : "0",
    );
}

export function loadInternalToolsUnlocked(storage?: StorageLike | null): boolean {
    const target = getStorage(storage);
    return parseAudienceFlag(target?.getItem(INTERNAL_TOOLS_STORAGE_KEY)) ?? false;
}

export function saveInternalToolsUnlocked(
    internalToolsUnlocked: boolean,
    storage?: StorageLike | null,
): void {
    getStorage(storage)?.setItem(
        INTERNAL_TOOLS_STORAGE_KEY,
        internalToolsUnlocked ? "1" : "0",
    );
}

export function loadForcePublicShell(storage?: StorageLike | null): boolean {
    const target = getStorage(storage);
    return parseAudienceFlag(target?.getItem(FORCE_PUBLIC_SHELL_STORAGE_KEY)) ?? false;
}

export function saveForcePublicShell(
    forcePublicShell: boolean,
    storage?: StorageLike | null,
): void {
    getStorage(storage)?.setItem(
        FORCE_PUBLIC_SHELL_STORAGE_KEY,
        forcePublicShell ? "1" : "0",
    );
}

export function getAudienceQueryPatch(
    searchParams?: URLSearchParams | null,
): Partial<
    Pick<
        AudienceAccess,
        "showAdvanced" | "internalToolsUnlocked" | "forcePublicShell"
    >
> {
    if (!searchParams) return {};

    const patch: Partial<
        Pick<
            AudienceAccess,
            "showAdvanced" | "internalToolsUnlocked" | "forcePublicShell"
        >
    > = {};
    const publicShell = parseAudienceFlag(searchParams.get("public"));
    if (publicShell != null) {
        patch.forcePublicShell = publicShell;
    }

    const advanced = parseAudienceFlag(searchParams.get("advanced"));
    if (advanced != null) {
        patch.showAdvanced = advanced;
    }

    const explicitInternal = parseAudienceFlag(searchParams.get("internal"));
    if (explicitInternal != null) {
        patch.internalToolsUnlocked = explicitInternal;
        return patch;
    }

    const legacyInternalRequested = LEGACY_INTERNAL_QUERY_KEYS.some(
        (key) => parseAudienceFlag(searchParams.get(key)) === true,
    );
    if (legacyInternalRequested) {
        patch.internalToolsUnlocked = true;
    }

    return patch;
}

export function resolveAudienceAccess(options?: {
    isDev?: boolean;
    searchParams?: URLSearchParams | null;
    storage?: StorageLike | null;
}): AudienceAccess {
    const storage = getStorage(options?.storage);
    const persistedShowAdvanced = loadShowAdvanced(storage);
    const persistedInternalTools = loadInternalToolsUnlocked(storage);
    const persistedForcePublicShell = loadForcePublicShell(storage);
    const queryPatch = getAudienceQueryPatch(options?.searchParams);

    const showAdvanced = queryPatch.showAdvanced ?? persistedShowAdvanced;
    const internalToolsUnlocked =
        queryPatch.internalToolsUnlocked ?? persistedInternalTools;
    const isDev = options?.isDev ?? false;
    const forcePublicShell =
        queryPatch.forcePublicShell ?? persistedForcePublicShell;

    if (queryPatch.showAdvanced != null) {
        saveShowAdvanced(showAdvanced, storage);
    }
    if (queryPatch.internalToolsUnlocked != null) {
        saveInternalToolsUnlocked(internalToolsUnlocked, storage);
    }
    if (queryPatch.forcePublicShell != null) {
        saveForcePublicShell(forcePublicShell, storage);
    }

    return {
        showAdvanced,
        internalToolsUnlocked,
        isDev,
        forcePublicShell,
    };
}

export function canAccessAudience(
    audience: Audience,
    access: AudienceAccess,
): boolean {
    const hasDevShellAccess = access.isDev && !access.forcePublicShell;

    switch (audience) {
        case "public":
            return true;
        case "advanced":
            return (
                access.showAdvanced ||
                access.internalToolsUnlocked ||
                hasDevShellAccess
            );
        case "internal":
            return (
                access.internalToolsUnlocked ||
                hasDevShellAccess
            );
        default:
            return false;
    }
}
