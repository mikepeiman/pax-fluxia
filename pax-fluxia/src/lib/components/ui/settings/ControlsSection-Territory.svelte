<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";

    // ControlsSection-Territory -- Territory Rendering (Voronoi + Metaball)

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        syncFromConfig?: () => void;
    }

    let { panel, updatePanel, syncFromConfig }: Props = $props();
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    // Bridge compatibility: keep legacy call sites, route to panel writes only.
    function debouncedConfigUpdate(
        _configKey: string,
        panelKey: string,
        value: any,
        _delayMs = 100,
    ) {
        updatePanel(panelKey, value);
    }

    const TERRITORY_KEYS = [
        "territoryVoronoi",
        "territoryModifiedVoronoi",
        "territoryPowerVoronoi",
        "territoryMetaball",
        "territoryPixel",
        "territoryGraph",
        "territoryContour",
        "territoryDistanceField",
    ] as const;
    function selectTerritory(
        chosen: (typeof TERRITORY_KEYS)[number],
        enabled: boolean,
    ) {
        if (enabled) {
            // Turn all off, then enable chosen exclusively
            for (let i = 0; i < TERRITORY_KEYS.length; i++) {
                const isChosen = TERRITORY_KEYS[i] === chosen;
                updatePanel(TERRITORY_KEYS[i], isChosen);
            }
        } else {
            // Allow turning off without forcing another on
            updatePanel(chosen, false);
        }
    }
</script>

<CategoryThemeBar category="territory" onApply={() => syncFromConfig?.()} />

<!-- ── Territory Toggles ── -->
<h4 class="sub-heading">Active Layers</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">🔷 Voronoi</span>
        <label class="toggle-switch">
            <input
                type="checkbox"
                checked={panel.territoryVoronoi ??
                    GAME_CONFIG.TERRITORY_VORONOI}
                onchange={(e) => {
                    selectTerritory(
                        "territoryVoronoi",
                        (e.target as HTMLInputElement).checked,
                    );
                }}
            />
            <span class="toggle-slider"></span>
        </label>
    </div>
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">🫧 Metaball</span>
        <label class="toggle-switch">
            <input
                type="checkbox"
                checked={panel.territoryMetaball ??
                    GAME_CONFIG.TERRITORY_METABALL}
                onchange={(e) => {
                    selectTerritory(
                        "territoryMetaball",
                        (e.target as HTMLInputElement).checked,
                    );
                }}
            />
            <span class="toggle-slider"></span>
        </label>
    </div>
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">🖼️ Pixel (Classic)</span>
        <label class="toggle-switch">
            <input
                type="checkbox"
                checked={panel.territoryPixel ?? GAME_CONFIG.TERRITORY_PIXEL}
                onchange={(e) => {
                    selectTerritory(
                        "territoryPixel",
                        (e.target as HTMLInputElement).checked,
                    );
                }}
            />
            <span class="toggle-slider"></span>
        </label>
    </div>
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">🔗 Lane Territory</span>
        <label class="toggle-switch">
            <input
                type="checkbox"
                checked={panel.territoryGraph ?? GAME_CONFIG.TERRITORY_GRAPH}
                onchange={(e) => {
                    selectTerritory(
                        "territoryGraph",
                        (e.target as HTMLInputElement).checked,
                    );
                }}
            />
            <span class="toggle-slider"></span>
        </label>
    </div>
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">✏️ Contour (Vector)</span>
        <label class="toggle-switch">
            <input
                type="checkbox"
                checked={panel.territoryContour ??
                    GAME_CONFIG.TERRITORY_CONTOUR}
                onchange={(e) => {
                    selectTerritory(
                        "territoryContour",
                        (e.target as HTMLInputElement).checked,
                    );
                }}
            />
            <span class="toggle-slider"></span>
        </label>
    </div>
</div>
<!-- DISABLED: Modified Voronoi freezes game — F-138 needs architecture fix
<div class="var-row">
    <div class="row-top">
        <span class="var-name">🔶 Modified Voronoi</span>
        <label class="toggle-switch">
            <input
                type="checkbox"
                checked={panel.territoryModifiedVoronoi ??
                    GAME_CONFIG.TERRITORY_MODIFIED_VORONOI}
                onchange={(e) => {
                    selectTerritory(
                        "territoryModifiedVoronoi",
                        (e.target as HTMLInputElement).checked,
                    );
                }}
            />
            <span class="toggle-slider"></span>
        </label>
    </div>
</div>
-->
<div class="var-row">
    <div class="row-top">
        <span class="var-name">⚡ Power Voronoi V2</span>
        <label class="toggle-switch">
            <input
                type="checkbox"
                checked={panel.territoryPowerVoronoi ??
                    GAME_CONFIG.TERRITORY_POWER_VORONOI}
                onchange={(e) => {
                    selectTerritory(
                        "territoryPowerVoronoi",
                        (e.target as HTMLInputElement).checked,
                    );
                }}
            />
            <span class="toggle-slider"></span>
        </label>
    </div>
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">🌊 Distance Field</span>
        <label class="toggle-switch">
            <input
                type="checkbox"
                checked={panel.territoryDistanceField ??
                    GAME_CONFIG.TERRITORY_DISTANCE_FIELD}
                onchange={(e) => {
                    selectTerritory(
                        "territoryDistanceField",
                        (e.target as HTMLInputElement).checked,
                    );
                }}
            />
            <span class="toggle-slider"></span>
        </label>
    </div>
</div>

<!-- Cluster Split (applies to any active renderer) -->
<div class="var-row">
    <div class="row-top">
        <span class="var-name">🧩 Cluster Split</span>
        <label class="toggle-switch">
            <input
                type="checkbox"
                checked={panel.territoryClusterSplit ??
                    GAME_CONFIG.TERRITORY_CLUSTER_SPLIT}
                onchange={(e) => {
                    const v = (e.target as HTMLInputElement).checked;
                    updatePanel("territoryClusterSplit", v);
                }}
            />
            <span class="toggle-slider"></span>
        </label>
    </div>
    <div
        class="row-bottom"
        style="font-size: 10px; opacity: 0.6; padding: 2px 4px;"
    >
        Disconnected stars → separate territory blobs
    </div>
</div>

{#if panel.territoryModifiedVoronoi}
    <!-- ── Modified Voronoi Settings (F-138) ── -->
    <h4 class="sub-heading">Modified Voronoi Settings</h4>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">⭐ Star Margin</span><span class="val"
                >{panel.modifiedVoronoiStarMargin ??
                    GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="500"
            step="5"
            value={panel.modifiedVoronoiStarMargin ??
                GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "MODIFIED_VORONOI_STAR_MARGIN",
                    "modifiedVoronoiStarMargin",
                    v,
                );
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">⤴️ Arc Strength</span><span class="val"
                >{(
                    panel.modifiedVoronoiArcStrength ??
                    GAME_CONFIG.MODIFIED_VORONOI_ARC_STRENGTH
                ).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={panel.modifiedVoronoiArcStrength ??
                GAME_CONFIG.MODIFIED_VORONOI_ARC_STRENGTH}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "MODIFIED_VORONOI_ARC_STRENGTH",
                    "modifiedVoronoiArcStrength",
                    v,
                );
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">📐 Arc Threshold</span><span class="val"
                >{panel.modifiedVoronoiArcThreshold ??
                    GAME_CONFIG.MODIFIED_VORONOI_ARC_THRESHOLD}°</span
            >
        </div>
        <input
            type="range"
            min="30"
            max="180"
            step="5"
            value={panel.modifiedVoronoiArcThreshold ??
                GAME_CONFIG.MODIFIED_VORONOI_ARC_THRESHOLD}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "MODIFIED_VORONOI_ARC_THRESHOLD",
                    "modifiedVoronoiArcThreshold",
                    v,
                );
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">🔗 Arc Min Segment</span><span class="val"
                >{panel.modifiedVoronoiArcMinSegment ??
                    GAME_CONFIG.MODIFIED_VORONOI_ARC_MIN_SEGMENT}px</span
            >
        </div>
        <input
            type="range"
            min="1"
            max="20"
            step="1"
            value={panel.modifiedVoronoiArcMinSegment ??
                GAME_CONFIG.MODIFIED_VORONOI_ARC_MIN_SEGMENT}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "MODIFIED_VORONOI_ARC_MIN_SEGMENT",
                    "modifiedVoronoiArcMinSegment",
                    v,
                );
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">🛤️ Corridor Sites</span><span class="val"
                >{GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED
                    ? "ON"
                    : "OFF"}</span
            >
        </div>
        <input
            type="checkbox"
            checked={GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED}
            onchange={(e) => {
                const v = (e.target as HTMLInputElement).checked;
                updatePanel("modifiedVoronoiCorridorEnabled", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">📏 Corridor Spacing</span><span class="val"
                >{panel.modifiedVoronoiCorridorSpacing ??
                    GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING}px</span
            >
        </div>
        <input
            type="range"
            min="20"
            max="200"
            step="5"
            value={panel.modifiedVoronoiCorridorSpacing ??
                GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "MODIFIED_VORONOI_CORRIDOR_SPACING",
                    "modifiedVoronoiCorridorSpacing",
                    v,
                );
            }}
        />
    </div>
{/if}

{#if panel.territoryPowerVoronoi}
    <!-- ── Power Voronoi V2 Settings ── -->
    <h4 class="sub-heading">⚡ Power Voronoi Settings</h4>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">⭐ Star Margin</span><span class="val"
                >{panel.modifiedVoronoiStarMargin ??
                    GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="500"
            step="5"
            value={panel.modifiedVoronoiStarMargin ??
                GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "MODIFIED_VORONOI_STAR_MARGIN",
                    "modifiedVoronoiStarMargin",
                    v,
                );
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">🛤️ Corridor Sites</span><span class="val"
                >{GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED
                    ? "ON"
                    : "OFF"}</span
            >
        </div>
        <input
            type="checkbox"
            checked={GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED}
            onchange={(e) => {
                const v = (e.target as HTMLInputElement).checked;
                updatePanel("modifiedVoronoiCorridorEnabled", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">📏 Corridor Spacing</span><span class="val"
                >{panel.modifiedVoronoiCorridorSpacing ??
                    GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING}px</span
            >
        </div>
        <input
            type="range"
            min="20"
            max="200"
            step="5"
            value={panel.modifiedVoronoiCorridorSpacing ??
                GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "MODIFIED_VORONOI_CORRIDOR_SPACING",
                    "modifiedVoronoiCorridorSpacing",
                    v,
                );
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">🚫 Disconnect Buffer</span><span class="val"
                >{GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED
                    ? "ON"
                    : "OFF"}</span
            >
        </div>
        <input
            type="checkbox"
            checked={GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED}
            onchange={(e) => {
                const v = (e.target as HTMLInputElement).checked;
                updatePanel("modifiedVoronoiDisconnectEnabled", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">📐 Disconnect Distance</span><span
                class="val"
                >{panel.modifiedVoronoiDisconnectDistance ??
                    GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE}px</span
            >
        </div>
        <input
            type="range"
            min="50"
            max="800"
            step="25"
            value={panel.modifiedVoronoiDisconnectDistance ??
                GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "MODIFIED_VORONOI_DISCONNECT_DISTANCE",
                    "modifiedVoronoiDisconnectDistance",
                    v,
                );
            }}
        />
    </div>
    <h4 class="sub-heading">Visual Settings</h4>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">🌊 Morph Speed</span><span class="val"
                >{panel.territoryTransitionMs ??
                    GAME_CONFIG.TERRITORY_TRANSITION_MS}ms</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="2000"
            step="50"
            value={panel.territoryTransitionMs ??
                GAME_CONFIG.TERRITORY_TRANSITION_MS}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "TERRITORY_TRANSITION_MS",
                    "territoryTransitionMs",
                    v,
                );
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">🔀 Boundary Mode</span><span class="val"
                >{panel.territoryBoundaryMode ??
                    GAME_CONFIG.TERRITORY_BOUNDARY_MODE ??
                    "smooth"}</span
            >
        </div>
        <div style="display:flex; gap:4px;">
            <button
                class="mini-btn"
                class:active={(panel.territoryBoundaryMode ??
                    GAME_CONFIG.TERRITORY_BOUNDARY_MODE) === "segment"}
                onclick={() => {
                    debouncedConfigUpdate(
                        "TERRITORY_BOUNDARY_MODE",
                        "territoryBoundaryMode",
                        "segment",
                    );
                }}>Lego</button
            >
            <button
                class="mini-btn"
                class:active={(panel.territoryBoundaryMode ??
                    GAME_CONFIG.TERRITORY_BOUNDARY_MODE) === "smooth"}
                onclick={() => {
                    debouncedConfigUpdate(
                        "TERRITORY_BOUNDARY_MODE",
                        "territoryBoundaryMode",
                        "smooth",
                    );
                }}>Smooth</button
            >
        </div>
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">🎨 Fill Alpha</span><span class="val"
                >{(panel.voronoiAlpha ?? GAME_CONFIG.VORONOI_ALPHA).toFixed(
                    2,
                )}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={panel.voronoiAlpha ?? GAME_CONFIG.VORONOI_ALPHA}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate("VORONOI_ALPHA", "voronoiAlpha", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">📏 Border Width</span><span class="val"
                >{(
                    panel.voronoiBorderWidth ?? GAME_CONFIG.VORONOI_BORDER_WIDTH
                ).toFixed(1)}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="6"
            step="0.5"
            value={panel.voronoiBorderWidth ?? GAME_CONFIG.VORONOI_BORDER_WIDTH}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "VORONOI_BORDER_WIDTH",
                    "voronoiBorderWidth",
                    v,
                );
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">💫 Border Alpha</span><span class="val"
                >{(
                    panel.voronoiBorderAlpha ?? GAME_CONFIG.VORONOI_BORDER_ALPHA
                ).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={panel.voronoiBorderAlpha ?? GAME_CONFIG.VORONOI_BORDER_ALPHA}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "VORONOI_BORDER_ALPHA",
                    "voronoiBorderAlpha",
                    v,
                );
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">🌈 Saturation</span><span class="val"
                >{(
                    panel.voronoiSaturation ?? GAME_CONFIG.VORONOI_SATURATION
                ).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={panel.voronoiSaturation ?? GAME_CONFIG.VORONOI_SATURATION}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "VORONOI_SATURATION",
                    "voronoiSaturation",
                    v,
                );
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">☀️ Lightness</span><span class="val"
                >{(
                    panel.voronoiLightness ?? GAME_CONFIG.VORONOI_LIGHTNESS
                ).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={panel.voronoiLightness ?? GAME_CONFIG.VORONOI_LIGHTNESS}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "VORONOI_LIGHTNESS",
                    "voronoiLightness",
                    v,
                );
            }}
        />
    </div>
{/if}
{#if panel.territoryGraph}
    <!-- ── Lane Territory Controls ── -->
    <h4 class="sub-heading">Lane Territory Settings</h4>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Saturation</span><span class="val"
                >{((panel.graphSaturation ?? 1) as number).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={panel.graphSaturation ?? 1}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("graphSaturation", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Lightness</span><span class="val"
                >{((panel.graphLightness ?? 1) as number).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={panel.graphLightness ?? 1}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("graphLightness", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Alpha</span><span class="val"
                >{(panel.graphAlpha ?? 0.15).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0.02"
            max="0.5"
            step="0.01"
            value={panel.graphAlpha ?? 0.15}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("graphAlpha", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Lane Influence</span><span class="val"
                >{(panel.laneInfluence ?? 5).toFixed(1)}×
                {(panel.laneInfluence ?? 5) <= 2
                    ? "(subtle)"
                    : (panel.laneInfluence ?? 5) <= 5
                      ? "(moderate)"
                      : "(strong)"}</span
            >
        </div>
        <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={panel.laneInfluence ?? 5}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("laneInfluence", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Lane Width</span><span class="val"
                >{panel.laneWidth ?? 60}px</span
            >
        </div>
        <input
            type="range"
            min="20"
            max="200"
            step="5"
            value={panel.laneWidth ?? 60}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("laneWidth", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Direct Falloff</span><span class="val"
                >{(panel.laneDirectFalloff ?? 1.0).toFixed(1)}
                {(panel.laneDirectFalloff ?? 1.0) <= 0.5
                    ? "(far reach)"
                    : (panel.laneDirectFalloff ?? 1.0) <= 1.5
                      ? "(natural)"
                      : "(tight)"}</span
            >
        </div>
        <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={panel.laneDirectFalloff ?? 1.0}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("laneDirectFalloff", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Resolution</span><span class="val"
                >{panel.graphResolution ?? 4}× downsample</span
            >
        </div>
        <input
            type="range"
            min="1"
            max="8"
            step="1"
            value={panel.graphResolution ?? 4}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("graphResolution", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Blur</span><span class="val"
                >{panel.graphBlur ?? 4}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="20"
            step="1"
            value={panel.graphBlur ?? 4}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("graphBlur", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Pressure</span><span class="val"
                >{(panel.graphPressure ?? 0).toFixed(2)}
                {(panel.graphPressure ?? 0) === 0 ? "(off)" : ""}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={panel.graphPressure ?? 0}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("graphPressure", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Edge Fade</span><span class="val"
                >{panel.graphEdgeFade ?? 120}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="500"
            step="10"
            value={panel.graphEdgeFade ?? 120}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("graphEdgeFade", v);
            }}
        />
    </div>
    <div
        class="var-row grayed"
        style="font-size: 10px; padding: 4px 4px 2px; margin-top: 6px; opacity: 0.7;"
    >
        🔲 Borders
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Border Width</span><span class="val"
                >{panel.graphBorderWidth ?? 1}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="4"
            step="1"
            value={panel.graphBorderWidth ?? 1}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("graphBorderWidth", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Border Alpha</span><span class="val"
                >{(panel.graphBorderAlpha ?? 0.6).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={panel.graphBorderAlpha ?? 0.6}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("graphBorderAlpha", v);
            }}
        />
    </div>
    <div
        class="var-row grayed"
        style="font-size: 10px; padding: 4px 4px 2px; margin-top: 6px; opacity: 0.7;"
    >
        🔲 Pattern
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Pattern</span><span class="val"
                >{panel.graphPattern ?? "none"}</span
            >
        </div>
        <select
            class="mode-select"
            value={panel.graphPattern ?? "none"}
            onchange={(e) => {
                const v = (e.target as HTMLSelectElement).value as any;
                updatePanel("graphPattern", v);
            }}
        >
            <option value="none">None</option>
            <option value="stripes">Stripes</option>
            <option value="crosshatch">Crosshatch</option>
            <option value="dots">Dots</option>
        </select>
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Pattern Scale</span><span class="val"
                >{panel.graphPatternScale ?? 14}</span
            >
        </div>
        <input
            type="range"
            min="4"
            max="40"
            step="1"
            value={panel.graphPatternScale ?? 14}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("graphPatternScale", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Pattern Rotation</span><span class="val"
                >{(panel.graphPatternRotation ?? 0).toFixed(1)}
                {(panel.graphPatternRotation ?? 0) === 0 ? "(off)" : ""}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="3"
            step="0.1"
            value={panel.graphPatternRotation ?? 0}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("graphPatternRotation", v);
            }}
        />
    </div>
    <div
        class="var-row grayed"
        style="font-size: 10px; padding: 4px 4px 2px; margin-top: 6px; opacity: 0.7;"
    >
        🎨 Border Feel
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Feel</span><span class="val"
                >{panel.borderFeel ?? "raw"}</span
            >
        </div>
        <select
            class="mode-select"
            value={panel.borderFeel ?? "raw"}
            onchange={(e) => {
                const v = (e.target as HTMLSelectElement).value as any;
                updatePanel("borderFeel", v);
            }}
        >
            <option value="raw">Raw (pixel edges)</option>
            <option value="smooth">Smooth (rounded)</option>
            <option value="angular">Angular (geometric)</option>
        </select>
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Smooth Iterations</span><span class="val"
                >{panel.borderSmooth ?? 0}
                {(panel.borderSmooth ?? 0) === 0
                    ? "(off)"
                    : (panel.borderSmooth ?? 0) <= 2
                      ? "(light)"
                      : "(heavy)"}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="5"
            step="1"
            value={panel.borderSmooth ?? 0}
            disabled={(panel.borderFeel ?? "raw") === "raw"}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("borderSmooth", v);
            }}
        />
    </div>
{/if}

{#if panel.territoryDistanceField}
    <!-- ── Distance Field Controls ── -->
    <h4 class="sub-heading">🌊 Distance Field Settings</h4>

    <!-- General -->
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Resolution</span><span class="val"
                >{panel.dfResolution ?? 4}px</span
            >
        </div>
        <input
            type="range"
            min="1"
            max="8"
            step="1"
            value={panel.dfResolution ?? 4}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("dfResolution", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Blur</span><span class="val"
                >{(panel.dfBlur ?? 2).toFixed(1)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="10"
            step="0.5"
            value={panel.dfBlur ?? 2}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("dfBlur", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Edge Fade</span><span class="val"
                >{(panel.dfEdgeFade ?? 200).toFixed(0)}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="500"
            step="10"
            value={panel.dfEdgeFade ?? 200}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("dfEdgeFade", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Rounding</span><span class="val"
                >{(panel.dfRounding ?? 8).toFixed(0)}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="30"
            step="1"
            value={panel.dfRounding ?? 8}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("dfRounding", v);
            }}
        />
    </div>

    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Territory Map Size</span><span class="val"
                >{(
                    (panel.dfExpansion ?? GAME_CONFIG.DF_EXPANSION) * 100
                ).toFixed(0)}%</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="0.5"
            step="0.05"
            value={panel.dfExpansion ?? GAME_CONFIG.DF_EXPANSION}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("dfExpansion", v);
            }}
        />
    </div>

    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Smoothing</span><span class="val"
                >{(panel.dfSmoothing ?? GAME_CONFIG.DF_SMOOTHING).toFixed(
                    0,
                )}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={panel.dfSmoothing ?? GAME_CONFIG.DF_SMOOTHING}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("dfSmoothing", v);
            }}
        />
    </div>

    <div class="var-row">
        <div class="row-top">
            <span class="var-name">⭐ Min Star Radius</span><span class="val"
                >{(
                    panel.dfMinStarRadius ?? GAME_CONFIG.DF_MIN_STAR_RADIUS
                ).toFixed(0)}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="150"
            step="5"
            value={panel.dfMinStarRadius ?? GAME_CONFIG.DF_MIN_STAR_RADIUS}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("dfMinStarRadius", v);
            }}
        />
    </div>

    <!-- Color (HSLA) -->
    <h4 class="sub-heading">🎨 Color (HSLA)</h4>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Alpha</span><span class="val"
                >{(panel.dfAlpha ?? 0.15).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0.02"
            max="1.0"
            step="0.01"
            value={panel.dfAlpha ?? 0.15}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("dfAlpha", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Hue Shift</span><span class="val"
                >{(panel.dfHue ?? 0).toFixed(0)}°</span
            >
        </div>
        <input
            type="range"
            min="-180"
            max="180"
            step="5"
            value={panel.dfHue ?? 0}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("dfHue", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Saturation</span><span class="val"
                >{(panel.dfSaturation ?? 0.7).toFixed(2)}×</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="3"
            step="0.05"
            value={panel.dfSaturation ?? 0.7}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("dfSaturation", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Lightness</span><span class="val"
                >{(panel.dfLightness ?? 0.5).toFixed(2)}×</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="3"
            step="0.05"
            value={panel.dfLightness ?? 0.5}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("dfLightness", v);
            }}
        />
    </div>

    <!-- Borders -->
    <h4 class="sub-heading">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
            <input
                type="checkbox"
                checked={panel.dfBordersEnabled ?? true}
                onchange={(e) => {
                    const v = (e.target as HTMLInputElement).checked;
                    updatePanel("dfBordersEnabled", v);
                }}
                style="margin:0;width:14px;height:14px"
            />
            BORDERS
        </label>
    </h4>

    {#if panel.dfBordersEnabled ?? true}
        <div class="var-row">
            <div class="row-top">
                <span class="var-name">Border Mode</span>
            </div>
            <div style="display:flex;gap:4px;padding:2px 0">
                {#each [{ id: 0, label: "Gap" }, { id: 1, label: "Even" }, { id: 2, label: "Layered" }] as mode}
                    <button
                        class="mode-btn"
                        class:active={(panel.dfBorderMode ?? 1) === mode.id}
                        onclick={() => {
                            updatePanel("dfBorderMode", mode.id);
                        }}>{mode.label}</button
                    >
                {/each}
            </div>
        </div>
        <div class="var-row">
            <div class="row-top">
                <span class="var-name">Border Width</span><span class="val"
                    >{(panel.dfBorderWidth ?? 15).toFixed(0)}px</span
                >
            </div>
            <input
                type="range"
                min="0"
                max="80"
                step="1"
                value={panel.dfBorderWidth ?? 15}
                oninput={(e) => {
                    const v = +(e.target as HTMLInputElement).value;
                    updatePanel("dfBorderWidth", v);
                }}
            />
        </div>
        <div class="var-row">
            <div class="row-top">
                <span class="var-name">Border Family</span>
            </div>
            <div style="display:flex;gap:4px;padding:2px 0">
                {#each [{ id: "straight", label: "Straight" }, { id: "curved", label: "Curved" }, { id: "segmented", label: "Segmented" }] as family}
                    <button
                        class="mode-btn"
                        class:active={(panel.dfBorderFamily ?? GAME_CONFIG.DF_BORDER_FAMILY ?? "straight") === family.id}
                        onclick={() => {
                            updatePanel("dfBorderFamily", family.id);
                        }}>{family.label}</button
                    >
                {/each}
            </div>
        </div>

        <div class="var-row">
            <div class="row-top">
                <span class="var-name">Border Softness</span><span class="val"
                    >{(panel.dfBorderSoftness ?? 8).toFixed(0)}px</span
                >
            </div>
            <input
                type="range"
                min="0"
                max="40"
                step="1"
                value={panel.dfBorderSoftness ?? 8}
                oninput={(e) => {
                    const v = +(e.target as HTMLInputElement).value;
                    updatePanel("dfBorderSoftness", v);
                }}
            />
        </div>
        <div class="var-row">
            <div class="row-top">
                <span class="var-name">Border Alpha</span><span class="val"
                    >{(panel.dfBorderAlpha ?? 0.8).toFixed(2)}</span
                >
            </div>
            <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={panel.dfBorderAlpha ?? 0.8}
                oninput={(e) => {
                    const v = +(e.target as HTMLInputElement).value;
                    updatePanel("dfBorderAlpha", v);
                }}
            />
        </div>
        <div class="var-row">
            <div class="row-top">
                <span class="var-name">Border Brighten</span><span class="val"
                    >{(panel.dfBorderBrighten ?? 40).toFixed(0)}</span
                >
            </div>
            <input
                type="range"
                min="0"
                max="200"
                step="5"
                value={panel.dfBorderBrighten ?? 40}
                oninput={(e) => {
                    const v = +(e.target as HTMLInputElement).value;
                    updatePanel("dfBorderBrighten", v);
                }}
            />
        </div>

        <div class="var-row">
            <div class="row-top">
                <span class="var-name">High Quality Borders</span><span
                    class="val"
                    >{(panel.dfBorderHqEnabled ??
                    GAME_CONFIG.DF_BORDER_HQ_ENABLED)
                        ? "ON"
                        : "OFF"}</span
                >
            </div>
            <input
                type="checkbox"
                checked={panel.dfBorderHqEnabled ??
                    GAME_CONFIG.DF_BORDER_HQ_ENABLED}
                onchange={(e) => {
                    const v = (e.target as HTMLInputElement).checked;
                    updatePanel("dfBorderHqEnabled", v);
                }}
            />
        </div>

        {#if panel.dfBorderHqEnabled ?? GAME_CONFIG.DF_BORDER_HQ_ENABLED}
            <div class="var-row">
                <div class="row-top">
                    <span class="var-name">HQ Supersample</span><span
                        class="val"
                        >{(
                            panel.dfBorderHqScale ??
                            GAME_CONFIG.DF_BORDER_HQ_SCALE
                        ).toFixed(1)}x</span
                    >
                </div>
                <input
                    type="range"
                    min="1.0"
                    max="4.0"
                    step="0.5"
                    value={panel.dfBorderHqScale ??
                        GAME_CONFIG.DF_BORDER_HQ_SCALE}
                    oninput={(e) => {
                        const v = +(e.target as HTMLInputElement).value;
                        updatePanel("dfBorderHqScale", v);
                    }}
                />
            </div>

            <div class="var-row">
                <div class="row-top">
                    <span class="var-name">HQ Max Texture</span><span
                        class="val"
                        >{panel.dfBorderHqMaxDim ??
                            GAME_CONFIG.DF_BORDER_HQ_MAX_DIM}px</span
                    >
                </div>
                <input
                    type="range"
                    min="4096"
                    max="8192"
                    step="512"
                    value={panel.dfBorderHqMaxDim ??
                        GAME_CONFIG.DF_BORDER_HQ_MAX_DIM}
                    oninput={(e) => {
                        const v = +(e.target as HTMLInputElement).value;
                        updatePanel("dfBorderHqMaxDim", v);
                    }}
                />
            </div>
        {/if}

        <div class="var-row">
            <div class="row-top">
                <span class="var-name">Vector Borders</span><span class="val"
                    >{(panel.dfVectorBordersEnabled ??
                    GAME_CONFIG.DF_VECTOR_BORDERS_ENABLED)
                        ? "ON"
                        : "OFF"}</span
                >
            </div>
            <input
                type="checkbox"
                checked={panel.dfVectorBordersEnabled ??
                    GAME_CONFIG.DF_VECTOR_BORDERS_ENABLED}
                onchange={(e) => {
                    const v = (e.target as HTMLInputElement).checked;
                    updatePanel("dfVectorBordersEnabled", v);
                }}
            />
        </div>

        {#if panel.dfVectorBordersEnabled ?? GAME_CONFIG.DF_VECTOR_BORDERS_ENABLED}
            <div class="var-row">
                <div class="row-top">
                    <span class="var-name">Vector Grid</span><span class="val"
                        >{panel.dfVectorGridResolution ??
                            GAME_CONFIG.DF_VECTOR_GRID_RESOLUTION}px</span
                    >
                </div>
                <input
                    type="range"
                    min="64"
                    max="512"
                    step="16"
                    value={panel.dfVectorGridResolution ??
                        GAME_CONFIG.DF_VECTOR_GRID_RESOLUTION}
                    oninput={(e) => {
                        const v = +(e.target as HTMLInputElement).value;
                        updatePanel("dfVectorGridResolution", v);
                    }}
                />
            </div>

            <div class="var-row">
                <div class="row-top">
                    <span class="var-name">Vector Straighten</span><span
                        class="val"
                        >{panel.dfVectorSmoothing ??
                            GAME_CONFIG.DF_VECTOR_SMOOTHING}</span
                    >
                </div>
                <input
                    type="range"
                    min="0"
                    max="4"
                    step="1"
                    value={panel.dfVectorSmoothing ??
                        GAME_CONFIG.DF_VECTOR_SMOOTHING}
                    oninput={(e) => {
                        const v = +(e.target as HTMLInputElement).value;
                        updatePanel("dfVectorSmoothing", v);
                    }}
                />
            </div>

            <div class="var-row">
                <div class="row-top">
                    <span class="var-name">Vector Simplify</span><span
                        class="val"
                        >{(
                            panel.dfVectorSimplify ??
                            GAME_CONFIG.DF_VECTOR_SIMPLIFY
                        ).toFixed(1)}px</span
                    >
                </div>
                <input
                    type="range"
                    min="0"
                    max="3"
                    step="0.1"
                    value={panel.dfVectorSimplify ??
                        GAME_CONFIG.DF_VECTOR_SIMPLIFY}
                    oninput={(e) => {
                        const v = +(e.target as HTMLInputElement).value;
                        updatePanel("dfVectorSimplify", v);
                    }}
                />
            </div>

            <div class="var-row">
                <div class="row-top">
                    <span class="var-name">Vector Update</span><span class="val"
                        >{panel.dfVectorUpdateMs ??
                            GAME_CONFIG.DF_VECTOR_UPDATE_MS}ms</span
                    >
                </div>
                <input
                    type="range"
                    min="0"
                    max="200"
                    step="5"
                    value={panel.dfVectorUpdateMs ??
                        GAME_CONFIG.DF_VECTOR_UPDATE_MS}
                    oninput={(e) => {
                        const v = +(e.target as HTMLInputElement).value;
                        updatePanel("dfVectorUpdateMs", v);
                    }}
                />
            </div>
        {/if}
    {/if}

    <!-- Influence Weight -->
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Influence Weight</span><span class="val"
                >{(panel.dfInfluenceWeight ?? 1.0).toFixed(2)}×</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="3"
            step="0.05"
            value={panel.dfInfluenceWeight ?? 1.0}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("dfInfluenceWeight", v);
            }}
        />
    </div>

    <!-- Transition Speed -->
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Transition Speed</span><span class="val"
                >{panel.territoryTransitionMs ??
                    GAME_CONFIG.TERRITORY_TRANSITION_MS}ms</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="3000"
            step="50"
            value={panel.territoryTransitionMs ??
                GAME_CONFIG.TERRITORY_TRANSITION_MS}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("territoryTransitionMs", v);
            }}
        />
    </div>

    <!-- ── Corridor Virtual Sites ── -->
    <h4 class="sub-heading">Corridor / Disconnect</h4>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">🔗 Corridor Sites</span><span class="val"
                >{(panel.dfCorridorEnabled ?? GAME_CONFIG.DF_CORRIDOR_ENABLED) ? "ON" : "OFF"}</span
            >
        </div>
        <input
            type="checkbox"
            checked={panel.dfCorridorEnabled ?? GAME_CONFIG.DF_CORRIDOR_ENABLED}
            onchange={(e) => {
                const v = (e.target as HTMLInputElement).checked;
                updatePanel("dfCorridorEnabled", v);
            }}
        />
    </div>

    {#if panel.dfCorridorEnabled ?? GAME_CONFIG.DF_CORRIDOR_ENABLED}
        <!-- Virtual Star Spacing mode: radio + slider side by side -->
        <div
            class="var-row"
            style="opacity: {(panel.dfCorridorMode ?? 'spacing') === 'spacing'
                ? 1
                : 0.4}"
        >
            <div class="row-top">
                <label
                    style="display:flex;align-items:center;gap:4px;cursor:pointer"
                >
                    <input
                        type="radio"
                        name="corridorMode"
                        checked={(panel.dfCorridorMode ?? "spacing") ===
                            "spacing"}
                        onchange={() => {
                            updatePanel("dfCorridorMode", "spacing");
                        }}
                        style="margin:0;width:14px;height:14px"
                    />
                    <span class="var-name" style="font-size:0.82em"
                        >Virtual Star Spacing</span
                    >
                </label>
                <span class="val"
                    >{panel.dfCorridorSpacing ??
                        GAME_CONFIG.DF_CORRIDOR_SPACING}px</span
                >
            </div>
            <input
                type="range"
                min="20"
                max="200"
                step="5"
                disabled={(panel.dfCorridorMode ?? "spacing") !== "spacing"}
                value={panel.dfCorridorSpacing ??
                    GAME_CONFIG.DF_CORRIDOR_SPACING}
                oninput={(e) => {
                    const v = +(e.target as HTMLInputElement).value;
                    updatePanel("dfCorridorSpacing", v);
                }}
            />
        </div>

        <!-- Virtual Stars Per Lane mode: radio + slider side by side -->
        <div
            class="var-row"
            style="opacity: {(panel.dfCorridorMode ?? 'spacing') === 'count'
                ? 1
                : 0.4}"
        >
            <div class="row-top">
                <label
                    style="display:flex;align-items:center;gap:4px;cursor:pointer"
                >
                    <input
                        type="radio"
                        name="corridorMode"
                        checked={(panel.dfCorridorMode ?? "spacing") ===
                            "count"}
                        onchange={() => {
                            updatePanel("dfCorridorMode", "count");
                        }}
                        style="margin:0;width:14px;height:14px"
                    />
                    <span class="var-name" style="font-size:0.82em"
                        >Virtual Stars Per Lane</span
                    >
                </label>
                <span class="val"
                    >{panel.dfCorridorCount ??
                        GAME_CONFIG.DF_CORRIDOR_COUNT}</span
                >
            </div>
            <input
                type="range"
                min="1"
                max="20"
                step="1"
                disabled={(panel.dfCorridorMode ?? "spacing") !== "count"}
                value={panel.dfCorridorCount ?? GAME_CONFIG.DF_CORRIDOR_COUNT}
                oninput={(e) => {
                    const v = +(e.target as HTMLInputElement).value;
                    updatePanel("dfCorridorCount", v);
                }}
            />
        </div>

        <div class="var-row">
            <div class="row-top">
                <span class="var-name">⚖️ Corridor Weight</span><span
                    class="val"
                    >{(
                        panel.dfCorridorWeight ?? GAME_CONFIG.DF_CORRIDOR_WEIGHT
                    ).toFixed(1)}</span
                >
            </div>
            <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.1"
                value={panel.dfCorridorWeight ?? GAME_CONFIG.DF_CORRIDOR_WEIGHT}
                oninput={(e) => {
                    const v = +(e.target as HTMLInputElement).value;
                    updatePanel("dfCorridorWeight", v);
                }}
            />
        </div>
    {/if}

    <div class="var-row">
        <div class="row-top">
            <span class="var-name">✂️ Disconnect Buffer</span><span class="val"
                >{(panel.dfDisconnectEnabled ?? GAME_CONFIG.DF_DISCONNECT_ENABLED) ? "ON" : "OFF"}</span
            >
        </div>
        <input
            type="checkbox"
            checked={panel.dfDisconnectEnabled ?? GAME_CONFIG.DF_DISCONNECT_ENABLED}
            onchange={(e) => {
                const v = (e.target as HTMLInputElement).checked;
                updatePanel("dfDisconnectEnabled", v);
            }}
        />
    </div>

    {#if panel.dfDisconnectEnabled ?? GAME_CONFIG.DF_DISCONNECT_ENABLED}
        <div class="var-row">
            <div class="row-top">
                <span class="var-name">📏 Disconnect Distance</span><span
                    class="val"
                    >{panel.dfDisconnectDistance ??
                        GAME_CONFIG.DF_DISCONNECT_DISTANCE}px</span
                >
            </div>
            <input
                type="range"
                min="100"
                max="800"
                step="25"
                value={panel.dfDisconnectDistance ??
                    GAME_CONFIG.DF_DISCONNECT_DISTANCE}
                oninput={(e) => {
                    const v = +(e.target as HTMLInputElement).value;
                    updatePanel("dfDisconnectDistance", v);
                }}
            />
        </div>

        <div class="var-row">
            <div class="row-top">
                <span class="var-name">⚖️ Disconnect Weight</span><span
                    class="val"
                    >{(
                        panel.dfDisconnectWeight ??
                        GAME_CONFIG.DF_DISCONNECT_WEIGHT
                    ).toFixed(2)}</span
                >
            </div>
            <input
                type="range"
                min="0.05"
                max="2.0"
                step="0.05"
                value={panel.dfDisconnectWeight ??
                    GAME_CONFIG.DF_DISCONNECT_WEIGHT}
                oninput={(e) => {
                    const v = +(e.target as HTMLInputElement).value;
                    updatePanel("dfDisconnectWeight", v);
                }}
            />
        </div>
    {/if}
{/if}

{#if panel.territoryContour}
    <!-- ── Contour Controls ── -->
    <h4 class="sub-heading">Contour (Vector) Settings</h4>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Saturation</span><span class="val"
                >{((panel.contourSaturation ?? 1) as number).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={panel.contourSaturation ?? 1}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("contourSaturation", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Lightness</span><span class="val"
                >{((panel.contourLightness ?? 1) as number).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={panel.contourLightness ?? 1}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("contourLightness", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Fill Alpha</span><span class="val"
                >{(panel.contourFillAlpha ?? 0.15).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0.02"
            max="0.5"
            step="0.01"
            value={panel.contourFillAlpha ?? 0.15}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("contourFillAlpha", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Resolution</span><span class="val"
                >{panel.contourResolution ?? 128}px grid</span
            >
        </div>
        <input
            type="range"
            min="32"
            max="256"
            step="16"
            value={panel.contourResolution ?? 128}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("contourResolution", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Simplify</span><span class="val"
                >{panel.contourSimplify ?? 5}
                {(panel.contourSimplify ?? 5) <= 2
                    ? "(detailed)"
                    : (panel.contourSimplify ?? 5) <= 8
                      ? "(moderate)"
                      : "(coarse)"}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="20"
            step="1"
            value={panel.contourSimplify ?? 5}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("contourSimplify", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Smoothing</span><span class="val"
                >{panel.contourSmooth ?? 0}
                {(panel.contourSmooth ?? 0) === 0
                    ? "(off)"
                    : (panel.contourSmooth ?? 0) <= 1
                      ? "(light)"
                      : "(smooth)"}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="4"
            step="1"
            value={panel.contourSmooth ?? 0}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("contourSmooth", v);
            }}
        />
    </div>
    <div
        class="var-row grayed"
        style="font-size: 10px; padding: 4px 4px 2px; margin-top: 6px; opacity: 0.7;"
    >
        🔲 Borders
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Border Width</span><span class="val"
                >{panel.contourBorderWidth ?? 2}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="8"
            step="0.5"
            value={panel.contourBorderWidth ?? 2}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("contourBorderWidth", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Border Alpha</span><span class="val"
                >{(panel.contourBorderAlpha ?? 0.6).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={panel.contourBorderAlpha ?? 0.6}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("contourBorderAlpha", v);
            }}
        />
    </div>
    <div
        class="var-row grayed"
        style="font-size: 10px; padding: 4px 4px 2px; margin-top: 6px; opacity: 0.7;"
    >
        🔄 Corner Rounding
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Corner Radius</span><span class="val"
                >{panel.contourCornerRadius ?? 3}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="10"
            step="0.5"
            value={panel.contourCornerRadius ?? 3}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("contourCornerRadius", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Corner Threshold</span><span class="val"
                >{panel.contourCornerThreshold ?? 120}°</span
            >
        </div>
        <input
            type="range"
            min="30"
            max="170"
            step="5"
            value={panel.contourCornerThreshold ?? 120}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("contourCornerThreshold", v);
            }}
        />
    </div>
    <div
        class="var-row grayed"
        style="font-size: 10px; padding: 4px 4px 2px; margin-top: 6px; opacity: 0.7;"
    >
        🏔️ Periphery Ownership
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Periphery Strength</span><span class="val"
                >{(panel.contourPeripheryStrength ?? 1).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={panel.contourPeripheryStrength ?? 1}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("contourPeripheryStrength", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Periphery Inset</span><span class="val"
                >{panel.contourPeripheryInset ?? 0}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="50"
            step="5"
            value={panel.contourPeripheryInset ?? 0}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("contourPeripheryInset", v);
            }}
        />
    </div>
    <div
        class="var-row grayed"
        style="font-size: 10px; padding: 4px 4px 2px; margin-top: 6px; opacity: 0.7;"
    >
        🔀 Junction Correction (F-135)
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Junction Correction</span><span class="val"
                >{(panel.contourJunctionCorrection ?? 50).toFixed(0)}
                {(panel.contourJunctionCorrection ?? 50) === 0
                    ? "(off)"
                    : (panel.contourJunctionCorrection ?? 50) <= 20
                      ? "(subtle)"
                      : (panel.contourJunctionCorrection ?? 50) <= 60
                        ? "(moderate)"
                        : "(strong)"}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={panel.contourJunctionCorrection ?? 50}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("contourJunctionCorrection", v);
            }}
        />
    </div>
{/if}

{#if panel.territoryVoronoi}
    <!-- ── Voronoi Controls ── -->
    <h4 class="sub-heading">Voronoi Settings</h4>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Saturation</span><span class="val"
                >{((panel.voronoiSaturation ?? 0.75) as number).toFixed(
                    2,
                )}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={panel.voronoiSaturation ?? 0.75}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("voronoiSaturation", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Lightness</span><span class="val"
                >{((panel.voronoiLightness ?? 0.75) as number).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={panel.voronoiLightness ?? 0.75}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("voronoiLightness", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Alpha</span><span class="val"
                >{((panel.voronoiAlpha ?? 0) as number).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0.02"
            max="0.4"
            step="0.01"
            value={panel.voronoiAlpha}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("voronoiAlpha", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Edge Blur</span><span class="val"
                >{((panel.voronoiBlur ?? 0) as number).toFixed(0)}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="30"
            step="1"
            value={panel.voronoiBlur}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("voronoiBlur", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Smoothing</span><span class="val"
                >{panel.voronoiSmoothing}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="4"
            step="1"
            value={panel.voronoiSmoothing}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("voronoiSmoothing", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Gradient Blend</span>
            <label class="toggle-switch">
                <input
                    type="checkbox"
                    checked={panel.voronoiGradientBlend}
                    onchange={(e) => {
                        const v = (e.target as HTMLInputElement).checked;
                        updatePanel("voronoiGradientBlend", v);
                    }}
                />
                <span class="slider"></span>
            </label>
        </div>
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Blend Width</span><span class="val"
                >{panel.voronoiBlendWidth}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="80"
            step="5"
            value={panel.voronoiBlendWidth}
            disabled={!panel.voronoiGradientBlend}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("voronoiBlendWidth", v);
            }}
        />
    </div>
    <!-- Borders -->
    <div
        class="var-row grayed"
        style="font-size: 10px; padding: 4px 4px 2px; margin-top: 6px; opacity: 0.7;"
    >
        🔲 Borders
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Border Width</span><span class="val"
                >{panel.voronoiBorderWidth}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="8"
            step="0.5"
            value={panel.voronoiBorderWidth}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("voronoiBorderWidth", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Border Alpha</span><span class="val"
                >{((panel.voronoiBorderAlpha ?? 0) as number).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={panel.voronoiBorderAlpha}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("voronoiBorderAlpha", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Border Brighten</span><span class="val"
                >{panel.voronoiBorderBrighten}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="255"
            step="5"
            value={panel.voronoiBorderBrighten}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("voronoiBorderBrighten", v);
            }}
        />
    </div>
{/if}

{#if panel.territoryPixel}
    <!-- ── Pixel (Classic) Controls ── -->
    <h4 class="sub-heading">Pixel (Classic) Settings</h4>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Saturation</span><span class="val"
                >{((panel.pixelSaturation ?? 1) as number).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={panel.pixelSaturation ?? 1}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("pixelSaturation", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Lightness</span><span class="val"
                >{((panel.pixelLightness ?? 1) as number).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={panel.pixelLightness ?? 1}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("pixelLightness", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Alpha</span><span class="val"
                >{(panel.pixelAlpha ?? 0.15).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0.02"
            max="0.5"
            step="0.01"
            value={panel.pixelAlpha ?? 0.15}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("pixelAlpha", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Resolution</span><span class="val"
                >{panel.pixelResolution ?? 4}× downsample</span
            >
        </div>
        <input
            type="range"
            min="1"
            max="8"
            step="1"
            value={panel.pixelResolution ?? 4}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("pixelResolution", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Edge Blend</span><span class="val"
                >{(panel.pixelEdgeBlend ?? 0).toFixed(1)}
                {(panel.pixelEdgeBlend ?? 0) === 0
                    ? "(off)"
                    : "(enemy only)"}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="20"
            step="0.5"
            value={panel.pixelEdgeBlend ?? 0}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("pixelEdgeBlend", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Blur</span><span class="val"
                >{panel.pixelBlur ?? 4}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="20"
            step="1"
            value={panel.pixelBlur ?? 4}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("pixelBlur", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Corridor Boost</span><span class="val"
                >{(panel.pixelCorridorBoost ?? 0.3).toFixed(2)}
                {(panel.pixelCorridorBoost ?? 0.3) === 0
                    ? "(off)"
                    : (panel.pixelCorridorBoost ?? 0.3) <= 0.15
                      ? "(light)"
                      : (panel.pixelCorridorBoost ?? 0.3) <= 0.35
                        ? "(natural)"
                        : (panel.pixelCorridorBoost ?? 0.3) <= 0.6
                          ? "(strong)"
                          : "(extreme)"}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="0.9"
            step="0.05"
            value={panel.pixelCorridorBoost ?? 0.3}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("pixelCorridorBoost", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Lane Constrain</span><span class="val"
                >{(panel.pixelLaneConstrain ?? 0.5).toFixed(2)}
                {(panel.pixelLaneConstrain ?? 0.5) === 0
                    ? "(off)"
                    : (panel.pixelLaneConstrain ?? 0.5) <= 0.3
                      ? "(light)"
                      : (panel.pixelLaneConstrain ?? 0.5) <= 0.6
                        ? "(moderate)"
                        : "(strict)"}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={panel.pixelLaneConstrain ?? 0.5}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("pixelLaneConstrain", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Pressure</span><span class="val"
                >{(panel.pixelPressure ?? 0).toFixed(2)}
                {(panel.pixelPressure ?? 0) === 0
                    ? "(off)"
                    : (panel.pixelPressure ?? 0) <= 0.3
                      ? "(subtle)"
                      : (panel.pixelPressure ?? 0) <= 0.6
                        ? "(moderate)"
                        : "(strong)"}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={panel.pixelPressure ?? 0}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("pixelPressure", v);
            }}
        />
    </div>
    <h4 class="sub-heading">🎨 Hue & Borders</h4>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Hue Shift</span><span class="val"
                >{panel.pixelHueShift ?? 0}°</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="360"
            step="5"
            value={panel.pixelHueShift ?? 0}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("pixelHueShift", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Border Width</span><span class="val"
                >{panel.pixelBorderWidth ?? 1}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="4"
            step="1"
            value={panel.pixelBorderWidth ?? 1}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("pixelBorderWidth", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Border Alpha</span><span class="val"
                >{(panel.pixelBorderAlpha ?? 0.6).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={panel.pixelBorderAlpha ?? 0.6}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("pixelBorderAlpha", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Border Brighten</span><span class="val"
                >{panel.pixelBorderBrighten ?? 80}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="255"
            step="5"
            value={panel.pixelBorderBrighten ?? 80}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("pixelBorderBrighten", v);
            }}
        />
    </div>
    <h4 class="sub-heading">🔲 Pattern</h4>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Pattern</span><span class="val"
                >{panel.pixelPattern ?? "none"}</span
            >
        </div>
        <select
            class="mode-select"
            value={panel.pixelPattern ?? "none"}
            onchange={(e) => {
                const v = (e.target as HTMLSelectElement).value as
                    | "none"
                    | "stripes"
                    | "crosshatch"
                    | "dots";
                updatePanel("pixelPattern", v);
            }}
        >
            <option value="none">None</option>
            <option value="stripes">Stripes</option>
            <option value="crosshatch">Crosshatch</option>
            <option value="dots">Dots</option>
        </select>
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Pattern Scale</span><span class="val"
                >{panel.pixelPatternScale ?? 4}</span
            >
        </div>
        <input
            type="range"
            min="1"
            max="50"
            step="1"
            value={panel.pixelPatternScale ?? 4}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("pixelPatternScale", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Pattern Rotation</span><span class="val"
                >{(panel.pixelPatternRotation ?? 1).toFixed(1)}
                {(panel.pixelPatternRotation ?? 1) === 0 ? "(off)" : ""}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={panel.pixelPatternRotation ?? 1}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("pixelPatternRotation", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Edge Fade</span><span class="val"
                >{panel.pixelEdgeFade ?? 200}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="500"
            step="10"
            value={panel.pixelEdgeFade ?? 200}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("pixelEdgeFade", v);
            }}
        />
    </div>
{/if}

{#if panel.territoryMetaball}
    <!-- ── Metaball Controls ── -->
    <h4 class="sub-heading">Metaball Settings</h4>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Saturation</span><span class="val"
                >{((panel.metaballSaturation ?? 1) as number).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={panel.metaballSaturation ?? 1}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("metaballSaturation", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Lightness</span><span class="val"
                >{((panel.metaballLightness ?? 1) as number).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={panel.metaballLightness ?? 1}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("metaballLightness", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Influence Radius</span><span class="val"
                >{panel.metaballRadius ?? 120}px</span
            >
        </div>
        <input
            type="range"
            min="30"
            max="800"
            step="10"
            value={panel.metaballRadius ?? 120}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("metaballRadius", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Falloff</span>
            <select
                class="mode-select"
                value={panel.metaballFalloff ?? "inverse-square"}
                onchange={(e) => {
                    const v = (e.target as HTMLSelectElement).value as any;
                    updatePanel("metaballFalloff", v);
                }}
            >
                <option value="inverse-square">Inverse Square</option>
                <option value="gaussian">Gaussian</option>
                <option value="smoothstep">Smoothstep</option>
            </select>
        </div>
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Blend Sharpness</span><span class="val"
                >{(panel.metaballSharpness ?? 3.0).toFixed(1)}</span
            >
        </div>
        <input
            type="range"
            min="1"
            max="20"
            step="0.5"
            value={panel.metaballSharpness ?? 3.0}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("metaballSharpness", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Alpha</span><span class="val"
                >{(panel.metaballAlpha ?? 0.5).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0.05"
            max="1.0"
            step="0.05"
            value={panel.metaballAlpha ?? 0.5}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("metaballAlpha", v);
            }}
        />
    </div>
    <!-- Advanced -->
    <div
        class="var-row grayed"
        style="font-size: 10px; padding: 4px 4px 2px; margin-top: 6px; opacity: 0.7;"
    >
        ⚙️ Advanced
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Cell Size</span><span class="val"
                >{panel.metaballCellSize ?? 8}px</span
            >
        </div>
        <input
            type="range"
            min="2"
            max="20"
            step="1"
            value={panel.metaballCellSize ?? 8}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("metaballCellSize", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Threshold</span><span class="val"
                >{(panel.metaballThreshold ?? 0.05).toFixed(3)}</span
            >
        </div>
        <input
            type="range"
            min="0.01"
            max="2.0"
            step="0.01"
            value={panel.metaballThreshold ?? 0.05}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("metaballThreshold", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Strength</span><span class="val"
                >{(panel.metaballStrength ?? 1.0).toFixed(1)}×</span
            >
        </div>
        <input
            type="range"
            min="0.1"
            max="20"
            step="0.1"
            value={panel.metaballStrength ?? 1.0}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("metaballStrength", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Edge Fade</span><span class="val"
                >{(panel.metaballEdgeFade ?? 3.0).toFixed(1)}</span
            >
        </div>
        <input
            type="range"
            min="0.5"
            max="20"
            step="0.5"
            value={panel.metaballEdgeFade ?? 3.0}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("metaballEdgeFade", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Coverage</span><span class="val"
                >{(panel.metaballCoverage ?? 0.3).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="0.5"
            step="0.05"
            value={panel.metaballCoverage ?? 0.3}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("metaballCoverage", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Blur</span><span class="val"
                >{panel.metaballBlur ?? 4}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="20"
            step="1"
            value={panel.metaballBlur ?? 4}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("metaballBlur", v);
            }}
        />
    </div>
    <!-- Borders -->
    <div
        class="var-row grayed"
        style="font-size: 10px; padding: 4px 4px 2px; margin-top: 6px; opacity: 0.7;"
    >
        🔲 Borders
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Border Width</span><span class="val"
                >{(panel.metaballBorderWidth ?? 1.5).toFixed(1)}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="6"
            step="0.5"
            value={panel.metaballBorderWidth ?? 1.5}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("metaballBorderWidth", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Border Alpha</span><span class="val"
                >{(panel.metaballBorderAlpha ?? 0.6).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={panel.metaballBorderAlpha ?? 0.6}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("metaballBorderAlpha", v);
            }}
        />
    </div>
{/if}

<style>
    @import "./panel-shared.css";
    .sub-heading {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #aaa;
        margin: 12px 0 6px;
        padding: 0 4px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        padding-bottom: 3px;
    }
    .mode-btn {
        flex: 1;
        padding: 3px 6px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 3px;
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.7rem;
        cursor: pointer;
        transition: all 0.15s;
    }
    .mode-btn:hover {
        border-color: rgba(100, 200, 255, 0.3);
        color: #93c5fd;
    }
    .mode-btn.active {
        background: rgba(100, 200, 255, 0.15);
        border-color: rgba(100, 200, 255, 0.4);
        color: #93c5fd;
        font-weight: 600;
    }
    .var-row {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 2px 4px;
    }
    .row-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .var-name {
        font-size: 11px;
        color: #ccc;
    }
    .val {
        font-size: 10px;
        color: #888;
        font-family: monospace;
    }
    .mode-select {
        background: rgba(255, 255, 255, 0.08);
        color: #ddd;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 4px;
        font-size: 11px;
        padding: 2px 6px;
        cursor: pointer;
    }
    .mode-select:focus {
        outline: 1px solid rgba(100, 180, 255, 0.5);
    }
    .toggle-switch {
        position: relative;
        display: inline-block;
        width: 28px;
        height: 14px;
    }
    .toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }
    .toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(255, 255, 255, 0.15);
        border-radius: 14px;
        transition: 0.2s;
    }
    .toggle-slider::before {
        position: absolute;
        content: "";
        height: 10px;
        width: 10px;
        left: 2px;
        bottom: 2px;
        background-color: white;
        border-radius: 50%;
        transition: 0.2s;
    }
    .toggle-switch input:checked + .toggle-slider {
        background-color: #4ade80;
    }
    .toggle-switch input:checked + .toggle-slider::before {
        transform: translateX(14px);
    }
    input[type="range"] {
        width: 100%;
        height: 4px;
        appearance: none;
        background: rgba(255, 255, 255, 0.12);
        border-radius: 2px;
        outline: none;
    }
    input[type="range"]::-webkit-slider-thumb {
        appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #4ade80;
        cursor: pointer;
    }
    .grayed {
        color: #888;
    }
</style>

