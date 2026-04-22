export type MapEditorDensityPreset = "compact" | "standard" | "expanded";

export type MapEditorPanelId =
    | "place-star"
    | "paint-owner"
    | "paint-force"
    | "connect-lane"
    | "measure"
    | "utilities"
    | "display"
    | "factions"
    | "library"
    | "validation"
    | "duplicate"
    | "selection";

export interface MapEditorUiPrefs {
    density: MapEditorDensityPreset;
    railExpanded: boolean;
    expandedPanels: Partial<Record<MapEditorPanelId, boolean>>;
}

const MAP_EDITOR_UI_PREFS_STORAGE_KEY = "pax-map-editor-ui-prefs-v1";

const defaultPrefs: MapEditorUiPrefs = {
    density: "standard",
    railExpanded: false,
    expandedPanels: {},
};

function clonePrefs(prefs: MapEditorUiPrefs): MapEditorUiPrefs {
    return {
        density: prefs.density,
        railExpanded: prefs.railExpanded,
        expandedPanels: { ...prefs.expandedPanels },
    };
}

function loadPrefs(): MapEditorUiPrefs {
    if (typeof localStorage === "undefined") {
        return clonePrefs(defaultPrefs);
    }

    try {
        const raw = localStorage.getItem(MAP_EDITOR_UI_PREFS_STORAGE_KEY);
        if (!raw) return clonePrefs(defaultPrefs);
        const parsed = JSON.parse(raw) as Partial<MapEditorUiPrefs>;
        return {
            density:
                parsed.density === "compact" || parsed.density === "expanded"
                    ? parsed.density
                    : "standard",
            railExpanded: parsed.railExpanded === true,
            expandedPanels: { ...(parsed.expandedPanels ?? {}) },
        };
    } catch {
        return clonePrefs(defaultPrefs);
    }
}

function persistPrefs(prefs: MapEditorUiPrefs): void {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(MAP_EDITOR_UI_PREFS_STORAGE_KEY, JSON.stringify(prefs));
}

let prefsState = $state<MapEditorUiPrefs>(loadPrefs());
let activeToolPanel = $state<MapEditorPanelId | null>(null);
let activeSheet = $state<MapEditorPanelId | null>(null);

function updatePrefs(updater: (prefs: MapEditorUiPrefs) => MapEditorUiPrefs): void {
    prefsState = updater(clonePrefs(prefsState));
    persistPrefs(prefsState);
}

function setDensity(density: MapEditorDensityPreset): void {
    updatePrefs((prefs) => ({ ...prefs, density }));
}

function setRailExpanded(railExpanded: boolean): void {
    updatePrefs((prefs) => ({ ...prefs, railExpanded }));
}

function toggleRailExpanded(): void {
    setRailExpanded(!prefsState.railExpanded);
}

function toggleToolPanel(panel: Exclude<MapEditorPanelId, "library" | "validation" | "duplicate" | "selection">): void {
    activeToolPanel = activeToolPanel === panel ? null : panel;
}

function closeToolPanel(): void {
    activeToolPanel = null;
}

function openSheet(panel: Extract<MapEditorPanelId, "library" | "validation" | "duplicate">): void {
    activeSheet = panel;
}

function closeSheet(): void {
    activeSheet = null;
}

function togglePanelExpanded(panel: MapEditorPanelId): void {
    updatePrefs((prefs) => ({
        ...prefs,
        expandedPanels: {
            ...prefs.expandedPanels,
            [panel]: !prefs.expandedPanels[panel],
        },
    }));
}

function setPanelExpanded(panel: MapEditorPanelId, expanded: boolean): void {
    updatePrefs((prefs) => ({
        ...prefs,
        expandedPanels: {
            ...prefs.expandedPanels,
            [panel]: expanded,
        },
    }));
}

export const mapEditorUiStore = {
    get prefs() { return prefsState; },
    get density() { return prefsState.density; },
    get railExpanded() { return prefsState.railExpanded; },
    get activeToolPanel() { return activeToolPanel; },
    get activeSheet() { return activeSheet; },
    isPanelExpanded(panel: MapEditorPanelId) {
        return Boolean(prefsState.expandedPanels[panel]);
    },
    setDensity,
    setRailExpanded,
    toggleRailExpanded,
    toggleToolPanel,
    closeToolPanel,
    openSheet,
    closeSheet,
    togglePanelExpanded,
    setPanelExpanded,
};
