/**
 * Config import/export — the pure core.
 *
 * Extracted from GameSettingsPanel.svelte (Stage 6). The component keeps the
 * DOM shell (blob download, FileReader, status banner); this module owns what
 * is worth testing: the typed merge that guards an imported JSON against the
 * live config shape, and the markdown serialization.
 *
 * Note on the section table: settingsDefs used to export MD_EXPORT_SECTIONS
 * while exportConfigMD shadowed it with a DIFFERENT hand-rolled copy — two
 * curated grouping tables for one export, already drifted apart. The copy that
 * actually ran (this one) is now the only one.
 */

/** Curated key grouping for the markdown export; anything else lands in Other. */
export const CONFIG_EXPORT_SECTIONS: Readonly<Record<string, readonly string[]>> = {
    Combat: [
        "AGGRESSOR_ADVANTAGE",
        "DAMAGE_PER_SHIP",
        "LETHALITY",
        "FORCE_RATIO_EFFECT",
        "CONQUEST_THRESHOLD",
        "DAMAGED_SHIP_EFFECTIVENESS",
    ],
    "Production & Repair": [
        "BASE_PRODUCTION",
        "REPAIR_RATE",
        "MIN_REPAIR",
        "REPAIR_COMBAT_PENALTY",
    ],
    Transfer: [
        "TRANSFER_RATE",
        "MIN_SHIPS_PER_TRANSFER",
        "MAX_SHIPS_PER_TRANSFER",
        "CONQUEST_TRANSFER_PERCENTAGE",
    ],
    Conquest: [
        "OVERWHELM_THRESHOLD",
        "RETREAT_CAPTURE_RATE",
        "SCATTER_CAPTURE_RATE",
        "SCATTER_DESTROY_RATE",
        "RETREAT_DAMAGED_ACTIVATION_RATE",
        "CONQUEST_DAMAGED_CAPTURE_RATE",
        "CONQUEST_DAMAGED_DESTROY_RATE",
    ],
    AI: [
        "AI_MUST_ATTACK_RATIO",
        "AI_ATTACK_UPPER_BOUNDS",
        "AI_ATTACK_STICKINESS",
        "AI_EVALUATION_FREQUENCY",
        "AI_TACTICAL_AGGRESSION",
        "AI_RANDOM_AGGRESSION",
    ],
    Visual: [
        "SHIP_BASE_SIZE",
        "STAR_RENDER_RADIUS",
        "ORBIT_DENSITY",
        "ATTACK_SURGE_MULT",
        "SETTLE_DURATION_MS",
        "WOBBLE_AMP",
        "ARRIVAL_SPREAD",
    ],
};

/** Markdown snapshot of the whole config, grouped by CONFIG_EXPORT_SECTIONS. */
export function buildConfigMarkdown(
    cfg: Record<string, unknown>,
    now: Date = new Date(),
): string {
    let md = `# Pax Fluxia Config\n_Exported ${now.toISOString()}_\n\n`;

    for (const [section, keys] of Object.entries(CONFIG_EXPORT_SECTIONS)) {
        md += `## ${section}\n| Key | Value |\n|-----|-------|\n`;
        for (const k of keys) {
            if (k in cfg) md += `| \`${k}\` | ${cfg[k]} |\n`;
        }
        md += "\n";
    }

    const listed = new Set(Object.values(CONFIG_EXPORT_SECTIONS).flat());
    const remaining = Object.keys(cfg).filter((k) => !listed.has(k));
    if (remaining.length > 0) {
        md += `## Other\n| Key | Value |\n|-----|-------|\n`;
        for (const k of remaining) md += `| \`${k}\` | ${cfg[k]} |\n`;
    }
    return md;
}

export type ConfigImportResult =
    | {
          ok: true;
          patch: Record<string, unknown>;
          applied: number;
          skipped: number;
          typeErrors: number;
      }
    | { ok: false; error: string };

/**
 * Parse and type-check an imported config JSON against the live config shape.
 * Only keys that exist in `existing` AND match its value type are accepted;
 * numbers must be finite. Unknown keys are counted as skipped, wrong-typed
 * values as typeErrors — the caller reports both without failing the import.
 */
export function parseConfigImport(
    raw: string,
    existing: Record<string, unknown>,
): ConfigImportResult {
    let data: unknown;
    try {
        data = JSON.parse(raw);
    } catch {
        return { ok: false, error: "Invalid JSON - could not parse file" };
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
        return { ok: false, error: "Expected a JSON object with config keys" };
    }

    const incoming = data as Record<string, unknown>;
    let applied = 0;
    let skipped = 0;
    let typeErrors = 0;
    const patch: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(incoming)) {
        if (!(k in existing)) {
            skipped++;
            continue;
        }
        const current = existing[k];
        if (typeof current === "number" && typeof v === "number" && isFinite(v)) {
            patch[k] = v;
            applied++;
        } else if (typeof current === "boolean" && typeof v === "boolean") {
            patch[k] = v;
            applied++;
        } else if (typeof current === "string" && typeof v === "string") {
            patch[k] = v;
            applied++;
        } else {
            typeErrors++;
        }
    }

    return { ok: true, patch, applied, skipped, typeErrors };
}

const PROTECTED_CONTENT_KEYS = new Set([
    "pax_savedMaps",
    "pax_savedGames",
    "pax-game-themes",
    "pax_composedThemes",
    "pax_themePresets",
    "pax_fullConfigPresets",
]);

const PROTECTED_CONTENT_PREFIXES = [
    "pax_categoryThemes_",
    "pax_starredThemes_",
    "pax-map-editor-",
] as const;

export function isProtectedContentStorageKey(key: string): boolean {
    return (
        PROTECTED_CONTENT_KEYS.has(key) ||
        PROTECTED_CONTENT_PREFIXES.some((prefix) => key.startsWith(prefix))
    );
}

export function clearResettableSettingsStorage(
    storage: Pick<Storage, "key" | "length" | "removeItem">,
): { removedKeys: string[]; preservedKeys: string[] } {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
        .filter((key): key is string => key != null);
    const removedKeys: string[] = [];
    const preservedKeys: string[] = [];

    for (const key of keys) {
        if (!key.startsWith("pax") && !key.startsWith("PAX")) continue;
        if (isProtectedContentStorageKey(key)) {
            preservedKeys.push(key);
            continue;
        }
        storage.removeItem(key);
        removedKeys.push(key);
    }

    return {
        removedKeys: removedKeys.sort(),
        preservedKeys: preservedKeys.sort(),
    };
}
