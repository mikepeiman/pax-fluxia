import type { SettingsSectionId } from "./settingsRegistry";
import { SETTINGS_SECTIONS } from "./settingsRegistry";
import type { SearchableSettingRecord } from "./settingMetadata";
import { getSearchableSettingRecords } from "./settingMetadata";

type SearchResultKind = "setting" | "section";

export type SettingsSearchResult = {
    id: string;
    kind: SearchResultKind;
    sectionId: SettingsSectionId;
    subsectionId?: string;
    sectionLabel: string;
    title: string;
    snippet: string;
    configKey?: string;
    panelKey?: string;
    anchorText?: string;
};

type SearchIndexEntry = SettingsSearchResult & {
    normalizedText: string;
    normalizedTitle: string;
    normalizedSection: string;
    normalizedConfig: string;
    priority: number;
    sourceText: string;
};

const SECTION_LABEL_BY_ID = Object.fromEntries(
    SETTINGS_SECTIONS.map((section) => [section.id, section.label]),
) as Record<SettingsSectionId, string>;

function normalizeSearchText(value: string): string {
    return value
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/[^\p{L}\p{N}\s.]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function makeSnippet(sourceText: string, query: string, fallback: string): string {
    if (!sourceText) return fallback;
    const sourceLower = sourceText.toLowerCase();
    const queryLower = query.toLowerCase();
    const matchIndex = sourceLower.indexOf(queryLower);
    if (matchIndex < 0) {
        return sourceText.slice(0, 180).trim();
    }
    const start = Math.max(0, matchIndex - 64);
    const end = Math.min(sourceText.length, matchIndex + Math.max(query.length, 24) + 96);
    const snippet = sourceText.slice(start, end).trim();
    return `${start > 0 ? "…" : ""}${snippet}${end < sourceText.length ? "…" : ""}`;
}

function isTerritoryTopologyRecord(record: SearchableSettingRecord): boolean {
    const key = record.key;
    const label = record.label.toLowerCase();
    return (
        key === "FRONTIER_RESOLUTION" ||
        key === "CHAIKIN_BOUNDARY_PAD" ||
        key.startsWith("MODIFIED_VORONOI_") ||
        key.startsWith("TERRITORY_CX_") ||
        key.startsWith("TERRITORY_DX_") ||
        label.includes("margin") ||
        label.includes("corridor") ||
        label.includes("disconnect") ||
        label.includes("midpoint") ||
        label.includes("frontier resolution") ||
        label.includes("extent")
    );
}

function isTerritoryRenderModeRecord(record: SearchableSettingRecord): boolean {
    const key = record.key;
    const label = record.label.toLowerCase();
    return key === "TERRITORY_RENDER_MODE" || label.includes("render mode");
}

function isTerritoryRuntimeRecord(record: SearchableSettingRecord): boolean {
    const key = record.key;
    const label = record.label.toLowerCase();
    return (
        key === "TERRITORY_GEOMETRY_MODE" ||
        key === "TERRITORY_ENGINE_MODE" ||
        key === "TERRITORY_ENGINE_STATIC_METHOD" ||
        key === "TERRITORY_ENGINE_DYNAMIC_METHOD" ||
        key === "TERRITORY_ENGINE_HYBRID_PLAN" ||
        key === "TERRITORY_FILL_TRANSITION_MODE" ||
        key === "TERRITORY_FILL_TRANSITION" ||
        key === "TERRITORY_BORDER_TRANSITION_MODE" ||
        key === "TERRITORY_BORDER_TRANSITION" ||
        key === "VS_TRANSITION_MODE" ||
        label.includes("geometry mode") ||
        label.includes("engine mode") ||
        label.includes("fill transition") ||
        label.includes("border transition") ||
        label.includes("transition mode")
    );
}

function isTerritoryFrontierFxRecord(record: SearchableSettingRecord): boolean {
    const key = record.key;
    const label = record.label.toLowerCase();
    return key.startsWith("TERRITORY_FRONTIER_FX_") || label.includes("frontier fx");
}

function isTerritoryFrontierRecord(record: SearchableSettingRecord): boolean {
    const key = record.key;
    const label = record.label.toLowerCase();
    return (
        key.startsWith("TERRITORY_FRONTIER_") &&
        !key.startsWith("TERRITORY_FRONTIER_FX_")
    ) || label.includes("frontier technique")
        || label.includes("phase sampling")
        || label.includes("blur passes")
        || label.includes("triangle diagonal")
        || label.includes("frontier chaikin")
        || label.includes("shader softness")
        || label.includes("band width")
        || label.includes("outer border")
        || label.includes("junction render")
        || label.includes("junction radius");
}

function resolveSectionTarget(
    record: SearchableSettingRecord,
    activeTerritoryRenderMode?: string | null,
): {
    sectionId: SettingsSectionId;
    subsectionId?: string;
} | null {
    switch (record.scope) {
        case "ai":
            return { sectionId: "ai" };
        case "audio":
            return { sectionId: "audio" };
        case "battle":
            return { sectionId: "combat_tuning" };
        case "conquest":
            return { sectionId: "conquest" };
        case "debug":
        case "diagnostics":
            return { sectionId: "diagnostics" };
        case "economy":
            return { sectionId: "economy" };
        case "logging":
            return { sectionId: "logging" };
        case "players":
            return { sectionId: "players" };
        case "ships":
            return { sectionId: "fleet_star_visuals" };
        case "surge":
            return { sectionId: "effects" };
        case "territory":
            if (isTerritoryTopologyRecord(record)) {
                return { sectionId: "territory_tuning" };
            }
            if (isTerritoryRenderModeRecord(record)) {
                return { sectionId: "transition" };
            }
            if (isTerritoryFrontierFxRecord(record)) {
                return { sectionId: "frontier_fx" };
            }
            if (isTerritoryRuntimeRecord(record)) {
                return { sectionId: "territory_tuning" };
            }
            if (isTerritoryFrontierRecord(record)) {
                return {
                    sectionId: "territory_styles",
                    subsectionId: "ember_lattice",
                };
            }
            if (record.key.startsWith("CELL_GRID_PHASE_FIELD_")) {
                return {
                    sectionId: "territory_styles",
                    subsectionId: "phase_field",
                };
            }
            if (record.key.startsWith("GRID_GRADIENT_")) {
                return { sectionId: "territory_styles", subsectionId: "all" };
            }
            // UNIFIED SURFACE: cell-grid / metaball / voronoi / power-vector
            // surface records. Route to the Styles section with the "all"
            // subsection so resolveActiveStyleId() follows the LIVE render mode
            // (not whatever per-mode chip was last open) — otherwise clicking a
            // result leaves you on a stale mode's card and the control is absent.
            return { sectionId: "territory_styles", subsectionId: "all" };
        case "timing":
        case "rules":
            return { sectionId: "match_flow" };
        case "travel":
            return { sectionId: "travel_orders" };
        case "visuals":
            return { sectionId: "map_options" };
        default:
            return { sectionId: "match_flow" };
    }
}

type ResolvedSettingRecord = SearchableSettingRecord & {
    sectionId: SettingsSectionId;
    subsectionId?: string;
    sectionLabel: string;
};

function getResolvedSettingRecords(
    activeTerritoryRenderMode?: string | null,
): ResolvedSettingRecord[] {
    return getSearchableSettingRecords().flatMap((record) => {
        const target = resolveSectionTarget(record, activeTerritoryRenderMode);
        if (!target) return [];
        return [
            {
                ...record,
                sectionId: target.sectionId,
                subsectionId: target.subsectionId,
                sectionLabel: SECTION_LABEL_BY_ID[target.sectionId],
            },
        ];
    });
}

function buildSettingEntries(
    activeTerritoryRenderMode?: string | null,
): SearchIndexEntry[] {
    return getResolvedSettingRecords(activeTerritoryRenderMode).map((record) => {
        const searchText = [
            record.sectionLabel,
            record.label,
            record.key,
            record.key.replace(/_/g, " "),
            record.panelKey,
            record.panelKey.replace(/([A-Z])/g, " $1"),
            record.description ?? "",
        ]
            .filter(Boolean)
            .join(" ");

        return {
            id: `setting:${record.sectionId}:${record.key}:${record.label}`,
            kind: "setting",
            sectionId: record.sectionId,
            subsectionId: record.subsectionId,
            sectionLabel: record.sectionLabel,
            title: record.label,
            snippet: record.description || record.key.replace(/_/g, " "),
            configKey: record.key,
            panelKey: record.panelKey,
            anchorText: record.label,
            normalizedText: normalizeSearchText(searchText),
            normalizedTitle: normalizeSearchText(record.label),
            normalizedSection: normalizeSearchText(record.sectionLabel),
            normalizedConfig: normalizeSearchText(
                `${record.key} ${record.key.replace(/_/g, " ")} ${record.panelKey}`,
            ),
            priority: 3,
            sourceText: [
                record.label,
                record.description ?? "",
                record.key,
                record.key.replace(/_/g, " "),
                record.panelKey,
            ]
                .filter(Boolean)
                .join(" "),
        };
    });
}

function buildSectionEntries(
    activeTerritoryRenderMode?: string | null,
): SearchIndexEntry[] {
    const resolvedRecords = getResolvedSettingRecords(activeTerritoryRenderMode);
    // UNIFIED SURFACE: territory sections are a stable set that never changes
    // with the active render mode, so search surfaces all of them regardless of
    // the live mode (matching the always-present chip nav). No per-mode gating.
    return SETTINGS_SECTIONS.flatMap((section) => {
        const subsectionLabels = (section.subsections ?? []).map((subsection) => subsection.label);
        const sectionRecords = resolvedRecords.filter((record) => record.sectionId === section.id);
        const sectionText = [
            section.label,
            ...subsectionLabels,
            ...sectionRecords.flatMap((record) => [
                record.label,
                record.description ?? "",
                record.key,
                record.key.replace(/_/g, " "),
            ]),
        ]
            .filter(Boolean)
            .join(" ");
        const snippet =
            subsectionLabels.join(" · ")
            || sectionRecords.slice(0, 4).map((record) => record.label).join(" · ")
            || section.label;

        return [
            {
                id: `section:${section.id}`,
                kind: "section" as const,
                sectionId: section.id,
                sectionLabel: section.label,
                title: section.label,
                snippet,
                normalizedText: normalizeSearchText(sectionText),
                normalizedTitle: normalizeSearchText(section.label),
                normalizedSection: normalizeSearchText(section.label),
                normalizedConfig: "",
                priority: 1,
                sourceText: sectionText,
            },
        ];
    });
}

function scoreEntry(entry: SearchIndexEntry, query: string, tokens: string[]): number {
    let score = entry.priority * 100;
    if (entry.normalizedTitle === query) score += 90;
    if (entry.normalizedTitle.includes(query)) score += 45;
    if (entry.normalizedConfig.includes(query)) score += 35;
    if (entry.normalizedSection.includes(query)) score += 20;
    const tokenBoost = tokens.reduce(
        (total, token) => total + (entry.normalizedText.includes(token) ? 4 : 0),
        0,
    );
    return score + tokenBoost;
}

export function searchSettings(
    query: string,
    limit = 24,
    activeTerritoryRenderMode?: string | null,
): SettingsSearchResult[] {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return [];

    const tokens = normalizedQuery.split(" ").filter(Boolean);
    const searchIndex = [
        ...buildSettingEntries(activeTerritoryRenderMode),
        ...buildSectionEntries(activeTerritoryRenderMode),
    ];
    return searchIndex.filter((entry) =>
        tokens.every((token) => entry.normalizedText.includes(token))
    )
        .map((entry) => ({
            ...entry,
            snippet: makeSnippet(entry.sourceText, normalizedQuery, entry.snippet),
            score: scoreEntry(entry, normalizedQuery, tokens),
        }))
        .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
        .slice(0, limit)
        .map(({ normalizedText: _normalizedText, normalizedTitle: _normalizedTitle, normalizedSection: _normalizedSection, normalizedConfig: _normalizedConfig, priority: _priority, sourceText: _sourceText, score: _score, ...result }) => result);
}
