<script lang="ts">
    import {
        BACKGROUND_MODE_CATALOG,
        buildLegacyImageSelection,
        getSupportedBackgroundModeIdsForRenderMode,
        normalizeBackgroundSelection,
        type BackgroundModeDefinition,
        type BackgroundSelection,
        type BackgroundTunableDef,
    } from "$lib/backgrounds";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { resolveEffectiveLaneMarginPx } from "$lib/lanes/laneMargin";
    import { gameStore } from "$lib/stores/gameStore.svelte";

    // ControlsSection-VISUALS — In-Game Settings Controls: Map & Grid
    // Extracted from GameSettingsPanel.svelte

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        vis: Record<string, any>;
        updateVisual: (key: string, val: any) => void;
        syncFromConfig?: () => void;
    }
    let {
        panel,
        updatePanel,
        vis,
        updateVisual,
        syncFromConfig,
    }: Props = $props();
    import { BG_IMAGES } from "$lib/config/bgManifest";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    let lanePathUiMode = $derived(
        (panel.mapgenLaneMode ?? GAME_CONFIG.MAPGEN_LANE_MODE ?? "curved") as
            | "straight"
            | "curved",
    );
    const mapConfig = GAME_CONFIG as typeof GAME_CONFIG & {
        MAPGEN_LANE_MARGIN_ENABLED?: boolean;
    };
    let laneMarginEnabled = $derived(
        (panel.mapgenLaneMarginEnabled ??
            mapConfig.MAPGEN_LANE_MARGIN_ENABLED ??
            true) as boolean,
    );
    let effectiveLaneMarginPx = $derived(
        resolveEffectiveLaneMarginPx({
            MAPGEN_LANE_MARGIN_ENABLED: laneMarginEnabled,
            MAPGEN_LANE_MARGIN_PX:
                panel.mapgenLaneMarginPx ??
                GAME_CONFIG.MAPGEN_LANE_MARGIN_PX ??
                75,
            MODIFIED_VORONOI_STAR_MARGIN:
                panel.starMargin ??
                GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ??
                45,
        }),
    );

    // ── Background Image Picker ──
    let bgImages = $state<string[]>(BG_IMAGES);
    let gameplayBackgroundModes = $derived(
        BACKGROUND_MODE_CATALOG.filter(
            (definition) => definition.primary && definition.supportsGame,
        ),
    );
    let activeGameplayRenderMode = $derived(
        (panel.territoryRenderMode ??
            GAME_CONFIG.TERRITORY_RENDER_MODE ??
            "none") as string,
    );
    let supportedGameplayModeIds = $derived(
        getSupportedBackgroundModeIdsForRenderMode(activeGameplayRenderMode),
    );
    let supportedGameplayModeIdSet = $derived(
        new Set(supportedGameplayModeIds),
    );
    let currentBackgroundSelection = $derived(
        normalizeBackgroundSelection(vis.backgroundSelection, {
            surface: "game",
            fallbackLegacyImage: vis.bgImage,
        }),
    );
    let currentBackgroundDefinition = $derived(
        gameplayBackgroundModes.find(
            (definition) => definition.id === currentBackgroundSelection.modeId,
        ) ?? null,
    );
    let sharedTunables = $derived(
        currentBackgroundDefinition?.sharedTunables ?? [],
    );
    let modeTunables = $derived(
        currentBackgroundDefinition?.modeTunables ?? [],
    );
    let currentLiveBackgroundSupported = $derived(
        currentBackgroundSelection.modeId === "legacy_image" ||
            supportedGameplayModeIdSet.has(currentBackgroundSelection.modeId),
    );
    let supportedGameplayModeLabels = $derived(
        gameplayBackgroundModes
            .filter((definition) => supportedGameplayModeIdSet.has(definition.id))
            .map((definition) => definition.label),
    );

    function isGameplayModeSupported(modeId: string): boolean {
        return supportedGameplayModeIdSet.has(modeId);
    }

    function formatTunableValue(tunable: BackgroundTunableDef): string {
        const value =
            currentBackgroundSelection.tunables[tunable.key] ??
            tunable.defaultValue;
        return tunable.step < 1 ? value.toFixed(2) : value.toFixed(0);
    }

    function modeSwatchStyle(modeId: string): string {
        switch (modeId) {
            case "nebula_veil":
                return "background: radial-gradient(circle at 28% 30%, rgba(96, 194, 255, 0.9), transparent 44%), radial-gradient(circle at 72% 34%, rgba(169, 102, 255, 0.75), transparent 42%), linear-gradient(180deg, #061320, #13284a);";
            case "banner_light":
                return "background: linear-gradient(120deg, #07101d 0%, #102442 34%, #ffd67c 50%, #163056 68%, #08111e 100%);";
            case "shadow_mist":
                return "background: radial-gradient(circle at 52% 22%, rgba(132, 164, 255, 0.26), transparent 38%), linear-gradient(180deg, #060914, #13162a 45%, #05070d 100%);";
            case "starlit_dust":
                return "background: radial-gradient(circle at 24% 30%, rgba(255, 255, 255, 0.8) 0 2px, transparent 3px), radial-gradient(circle at 68% 44%, rgba(144, 224, 255, 0.86) 0 2px, transparent 3px), linear-gradient(180deg, #071525, #0f2540);";
            case "leyline_flow":
                return "background: linear-gradient(180deg, #071721, #0f3142), repeating-linear-gradient(165deg, rgba(120, 235, 255, 0.2) 0 2px, transparent 2px 14px), radial-gradient(circle at 58% 44%, rgba(91, 216, 255, 0.28), transparent 44%);";
            case "ember_kingdom":
                return "background: radial-gradient(circle at 50% 76%, rgba(255, 169, 82, 0.8), transparent 34%), radial-gradient(circle at 28% 38%, rgba(255, 231, 160, 0.24), transparent 26%), linear-gradient(180deg, #1c0b05, #3d160a 58%, #090305 100%);";
            case "frost_veins":
                return "background: linear-gradient(180deg, #071724, #143449), repeating-linear-gradient(150deg, rgba(194, 242, 255, 0.22) 0 2px, transparent 2px 18px), radial-gradient(circle at 32% 30%, rgba(218, 247, 255, 0.6), transparent 30%);";
            case "storm_current":
                return "background: linear-gradient(180deg, #06151f, #102d3e), repeating-linear-gradient(135deg, rgba(123, 229, 255, 0.18) 0 3px, transparent 3px 16px), radial-gradient(circle at 74% 30%, rgba(201, 249, 255, 0.55), transparent 24%);";
            default:
                return "background: linear-gradient(180deg, #0b1120, #111827);";
        }
    }

    // Background change uses updateVisual to sync immediately
    function setBackgroundSelection(selection: BackgroundSelection) {
        updateVisual(
            "backgroundSelection",
            normalizeBackgroundSelection(selection, {
                surface: "game",
                fallbackLegacyImage: vis.bgImage,
            }),
        );
    }

    function selectBackgroundMode(mode: BackgroundModeDefinition) {
        if (!isGameplayModeSupported(mode.id)) return;
        setBackgroundSelection({
            modeId: mode.id,
            tunables:
                currentBackgroundSelection.modeId === mode.id
                    ? currentBackgroundSelection.tunables
                    : {},
        });
    }

    function changeBg(img: string) {
        setBackgroundSelection(buildLegacyImageSelection(img));
    }

    function updateBackgroundTunable(
        tunable: BackgroundTunableDef,
        value: number,
    ) {
        setBackgroundSelection({
            ...currentBackgroundSelection,
            tunables: {
                ...currentBackgroundSelection.tunables,
                [tunable.key]: value,
            },
        });
    }

    function resetBackgroundModeDefaults() {
        if (!currentBackgroundDefinition) return;
        setBackgroundSelection({
            modeId: currentBackgroundDefinition.id,
            tunables: {},
        });
    }
</script>

<CategoryThemeBar category="visuals" onApply={() => syncFromConfig?.()} />

<section data-subsection-id="background">
    <h4 class="sub-heading">Background</h4>
    <p class="future-desc" style="margin:0 0 8px;font-size:11px;opacity:0.75">
        Regional ambient backgrounds currently target the maintained territory
        modes only: PVV4 plus the Phase Edges, Ember Lattice, and Phase Field
        metaball-grid variants. Shared tunables shape the whole mode; the
        mode-specific sliders below are where each family earns its identity.
    </p>
    <div class="var-row">
        <div class="row-top">
            <span
                class="var-name"
                data-setting-config-key="BG_IMAGE_URL"
                data-setting-description="Background selection for gameplay, including live regional ambience or the legacy static image path."
                >Background Mode</span
            >
            <span class="val"
                >{currentBackgroundDefinition?.label ??
                    (currentBackgroundSelection.modeId === "legacy_image"
                        ? "Legacy Image"
                        : currentBackgroundSelection.modeId)}</span
            >
        </div>
    </div>
    <p class="future-desc background-support-note">
        Territory runtime: <strong>{activeGameplayRenderMode}</strong>.
        {#if supportedGameplayModeLabels.length > 0}
            Supported live modes here: {supportedGameplayModeLabels.join(", ")}.
        {:else}
            This runtime currently exposes no live regional background modes; use
            the legacy image fallback.
        {/if}
    </p>
    {#if currentBackgroundSelection.modeId !== "legacy_image" &&
        !currentLiveBackgroundSupported}
        <div class="background-warning">
            The stored live selection is preserved, but the current territory
            render mode cannot render it. Switch to a supported live mode or use
            the legacy image fallback.
        </div>
    {/if}
    <div class="background-mode-grid">
        {#each gameplayBackgroundModes as mode}
            <button
                type="button"
                class="background-mode-card"
                class:active={currentBackgroundSelection.modeId === mode.id}
                disabled={!isGameplayModeSupported(mode.id)}
                onclick={() => selectBackgroundMode(mode)}
                title={isGameplayModeSupported(mode.id)
                    ? mode.description
                    : `${mode.label} is not supported on ${activeGameplayRenderMode}.`}
            >
                <span
                    class="background-mode-card__swatch"
                    style={modeSwatchStyle(mode.id)}
                ></span>
                <span class="background-mode-card__title">{mode.label}</span>
                <span class="background-mode-card__copy">{mode.description}</span>
            </button>
        {/each}
    </div>
    {#if currentBackgroundDefinition}
        <div
            class="background-tuning-panel"
            class:background-tuning-panel--disabled={!currentLiveBackgroundSupported}
        >
            <div class="row-top background-tuning-panel__header">
                <span class="var-name">Live Tuning</span>
                <div class="background-tuning-panel__actions">
                    <span class="val">{currentBackgroundDefinition.label}</span>
                    <button
                        type="button"
                        class="background-tuning-panel__reset"
                        disabled={!currentLiveBackgroundSupported}
                        onclick={resetBackgroundModeDefaults}
                    >
                        Reset Mode
                    </button>
                </div>
            </div>
            <div class="background-tuning-panel__group-label">Shared</div>
            {#each sharedTunables as tunable}
                <div class="var-row">
                    <div class="row-top">
                        <span class="var-name">{tunable.label}</span>
                        <span class="val">{formatTunableValue(tunable)}</span>
                    </div>
                    <input
                        type="range"
                        min={tunable.min}
                        max={tunable.max}
                        step={tunable.step}
                        disabled={!currentLiveBackgroundSupported}
                        value={currentBackgroundSelection.tunables[tunable.key] ??
                            tunable.defaultValue}
                        oninput={(e) =>
                            updateBackgroundTunable(
                                tunable,
                                parseFloat(
                                    (e.target as HTMLInputElement).value,
                                ),
                            )}
                    />
                </div>
            {/each}
            {#if modeTunables.length > 0}
                <div class="background-tuning-panel__group-label">
                    {currentBackgroundDefinition.label}
                </div>
                {#each modeTunables as tunable}
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">{tunable.label}</span>
                            <span class="val">{formatTunableValue(tunable)}</span>
                        </div>
                        <input
                            type="range"
                            min={tunable.min}
                            max={tunable.max}
                            step={tunable.step}
                            disabled={!currentLiveBackgroundSupported}
                            value={currentBackgroundSelection.tunables[
                                tunable.key
                            ] ?? tunable.defaultValue}
                            oninput={(e) =>
                                updateBackgroundTunable(
                                    tunable,
                                    parseFloat(
                                        (e.target as HTMLInputElement).value,
                                    ),
                                )}
                        />
                    </div>
                {/each}
            {/if}
        </div>
    {/if}
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Legacy Image Fallback</span>
            <span class="val">{vis.bgImage || "none"}</span>
        </div>
    </div>
    <div class="bg-grid">
        <button
            class="bg-thumb"
            class:active={currentBackgroundSelection.modeId === "legacy_image" &&
                !vis.bgImage}
            onclick={() => changeBg("")}
            title="No background"
        >
            <span class="bg-none-icon">∅</span>
        </button>
        {#each bgImages as img}
            <button
                class="bg-thumb"
                class:active={currentBackgroundSelection.modeId === "legacy_image" &&
                    vis.bgImage === img}
                onclick={() => changeBg(img)}
                title={img
                    .replace(/\.(png|jpe?g|webp|avif)$/i, "")
                    .replace(/^pax-fluxia-/, "")}
            >
                <img
                    src="/assets/{img}"
                    alt={img}
                    class="bg-thumb-img"
                    loading="lazy"
                />
            </button>
        {/each}
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">🌌 BG Opacity</span><span class="val"
                >{(
                    (panel.bgImageAlpha ??
                        GAME_CONFIG.BG_IMAGE_ALPHA ??
                        0.35) as number
                ).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={panel.bgImageAlpha ?? GAME_CONFIG.BG_IMAGE_ALPHA ?? 0.35}
            oninput={(e) => {
                const v = parseFloat((e.target as HTMLInputElement).value);
                GAME_CONFIG.BG_IMAGE_ALPHA = v;
                updatePanel("bgImageAlpha", v);
                window.dispatchEvent(
                    new CustomEvent("pax-bg-alpha-change", { detail: v }),
                );
            }}
        />
    </div>
</section>

<section data-subsection-id="map-layout">
    <h4 class="sub-heading">Map Layout</h4>
    <p class="future-desc" style="margin:0 0 8px;font-size:11px;opacity:0.75">
        <strong>Lane margin</strong> — dedicated minimum distance from a non-endpoint star
        center to the nearest point on a lane. <strong>Reshape bias</strong> — how hard the solver
        tries to reshape a violating connection before removing it during connectivity recompute.
    </p>
<label class="toggle-row">
    <input
        type="checkbox"
        checked={laneMarginEnabled}
        onchange={(e) => {
            const v = (e.target as HTMLInputElement).checked;
            mapConfig.MAPGEN_LANE_MARGIN_ENABLED = v;
            updatePanel("mapgenLaneMarginEnabled", v);
            (gameStore as any).rebuildLaneConstraintsFromConfig?.();
        }}
    />
    <span
        class="var-name"
        data-setting-config-key="MAPGEN_LANE_MARGIN_ENABLED"
        data-setting-description="When off, curved-lane clearance falls back to the active territory minimum star margin instead of MAPGEN_LANE_MARGIN_PX."
        >Use dedicated lane margin</span
    >
    <span class="val">{laneMarginEnabled ? "On" : `Fallback (${Math.round(effectiveLaneMarginPx)}px)`}</span>
</label>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Lane margin (mapgen)</span><span class="val"
            >{Math.round(
                panel.mapgenLaneMarginPx ?? GAME_CONFIG.MAPGEN_LANE_MARGIN_PX ?? 75,
            )}px</span
        >
    </div>
    <div class="row-bottom" style="font-size:10px;opacity:0.68;">
        Effective lane clearance: {Math.round(effectiveLaneMarginPx)}px
        {#if !laneMarginEnabled}
            (falling back to the active territory minimum star margin)
        {/if}
    </div>
    <input
        type="range"
        min="0"
        max="250"
        step="5"
        disabled={!laneMarginEnabled}
        value={panel.mapgenLaneMarginPx ?? GAME_CONFIG.MAPGEN_LANE_MARGIN_PX ?? 75}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.MAPGEN_LANE_MARGIN_PX = v;
            updatePanel("mapgenLaneMarginPx", v);
            (gameStore as any).rebuildLaneConstraintsFromConfig?.();
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Reshape bias</span><span class="val"
            >{(
                panel.mapgenLaneCurveVsPruneBias ??
                GAME_CONFIG.MAPGEN_LANE_CURVE_VS_PRUNE_BIAS ??
                0.55
            ).toFixed(2)}</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={panel.mapgenLaneCurveVsPruneBias ??
            GAME_CONFIG.MAPGEN_LANE_CURVE_VS_PRUNE_BIAS ??
            0.55}
        title="0 = remove violating connections during connectivity recompute; 1 = exhaust reshaping first"
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.MAPGEN_LANE_CURVE_VS_PRUNE_BIAS = v;
            updatePanel("mapgenLaneCurveVsPruneBias", v);
            (gameStore as any).rebuildLaneConstraintsFromConfig?.();
        }}
    />
</div>
<label class="toggle-row"
    ><input
        type="checkbox"
        checked={panel.mapgenRecomputeConnectivityOnAuthoredMaps ??
            (GAME_CONFIG as any).MAPGEN_RECOMPUTE_CONNECTIVITY_ON_AUTHORED_MAPS ??
            false}
        onchange={(e) => {
            const v = (e.target as HTMLInputElement).checked;
            (GAME_CONFIG as any).MAPGEN_RECOMPUTE_CONNECTIVITY_ON_AUTHORED_MAPS = v;
            updatePanel("mapgenRecomputeConnectivityOnAuthoredMaps", v);
            (gameStore as any).rebuildLaneConstraintsFromConfig?.();
        }}
    />
    <span class="var-name">Recompute connectivity</span><span
        class="val"
        style="font-size:9px;opacity:0.6"
        >{(panel.mapgenRecomputeConnectivityOnAuthoredMaps ??
            (GAME_CONFIG as any).MAPGEN_RECOMPUTE_CONNECTIVITY_ON_AUTHORED_MAPS ??
            false)
            ? "authored maps: recompute on"
            : "authored maps: off reshapes only"}</span
    ></label
>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Lane path</span>
        <div
            class="map-lane-mode-segment"
            role="group"
            aria-label="Lane path: straight chords or curved when needed"
        >
            <button
                type="button"
                class="map-lane-mode-segment__btn"
                class:map-lane-mode-segment__btn--active={lanePathUiMode === "straight"}
                title="Chord only between linked stars"
                aria-pressed={lanePathUiMode === "straight"}
                onclick={() => {
                    updatePanel("mapgenLaneMode", "straight");
                    (gameStore as any).rebuildLaneConstraintsFromConfig?.();
                }}>Straight</button
            >
            <button
                type="button"
                class="map-lane-mode-segment__btn"
                class:map-lane-mode-segment__btn--active={lanePathUiMode === "curved"}
                title="Satisfy lane margin with chord or, if needed, curve/kink vs stars and other lanes"
                aria-pressed={lanePathUiMode === "curved"}
                onclick={() => {
                    updatePanel("mapgenLaneMode", "curved");
                    (gameStore as any).rebuildLaneConstraintsFromConfig?.();
                }}>Curve if needed</button
            >
        </div>
    </div>
</div>
</section>

<section data-subsection-id="labels-inspector">
<h4 class="sub-heading">Labels & inspector</h4>
<!-- Label Number Animation Mode -->
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Label Anim Mode</span>
        <select
            class="val"
            style="background:#111;color:#ccc;border:1px solid #444;border-radius:3px;font-size:11px;padding:1px 4px;"
            value={GAME_CONFIG.LABEL_ANIM_MODE ?? "rolling"}
            onchange={(e) => {
                const v = (e.target as HTMLSelectElement).value;
                GAME_CONFIG.LABEL_ANIM_MODE = v as
                    | "rolling"
                    | "fade"
                    | "instant";
                updatePanel("labelAnimMode", v);
            }}
        >
            <option value="rolling">Rolling (lerp)</option>
            <option value="fade">Fade (snap + flash)</option>
            <option value="instant">Instant</option>
        </select>
    </div>
</div>
<!-- Label Transition Duration -->
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Label Transition</span><span class="val"
            >{panel.numberTransitionMs ?? 120}ms</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="500"
        step="10"
        value={panel.numberTransitionMs ?? 120}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.NUMBER_TRANSITION_MS = v;
            updatePanel("numberTransitionMs", v);
        }}
    />
</div>

 </section>

<section data-subsection-id="connections">
<h4 class="sub-heading">Connections</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">➡️ Arrow Length</span><span class="val"
            >{Math.round(((panel.arrowLengthFraction ?? 0.5) as number) * 100)}%</span
        >
    </div>
    <input
        type="range"
        min="10"
        max="100"
        step="1"
        value={Math.round(((panel.arrowLengthFraction ?? 0.5) as number) * 100)}
        oninput={(e) => {
            const v = parseInt((e.target as HTMLInputElement).value) / 100;
            GAME_CONFIG.ARROW_LENGTH_FRACTION = v;
            updatePanel("arrowLengthFraction", v);
        }}
    />
</div>
<label class="toggle-row"
    ><input
        type="checkbox"
        checked={panel.orderArrowsFollowLanePaths ??
            GAME_CONFIG.ORDER_ARROWS_FOLLOW_LANE_PATHS ??
            false}
        onchange={(e) => {
            const v = (e.target as HTMLInputElement).checked;
            GAME_CONFIG.ORDER_ARROWS_FOLLOW_LANE_PATHS = v;
            updatePanel("orderArrowsFollowLanePaths", v);
        }}
    />
    <span class="var-name">🧭 Arrows follow lane paths</span><span
        class="val"
        style="font-size:9px;opacity:0.6">straight or curved to match lane</span
    ></label
>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Arrow Path Padding</span><span class="val"
            >{Math.round(
                panel.arrowPathPadding ?? GAME_CONFIG.ARROW_PATH_PADDING ?? 0,
            )}px</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="40"
        step="1"
        value={panel.arrowPathPadding ?? GAME_CONFIG.ARROW_PATH_PADDING ?? 0}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.ARROW_PATH_PADDING = v;
            updatePanel("arrowPathPadding", v);
        }}
    />
</div>
<label class="toggle-row"
    ><input
        type="checkbox"
        checked={panel.staticOrbits}
        onchange={(e) => {
            const v = (e.target as HTMLInputElement).checked;
            GAME_CONFIG.STATIC_ORBITS = v;
            updatePanel("staticOrbits", v);
        }}
    />
    <span class="var-name">🛑 Static Orbits</span><span
        class="val"
        style="font-size:9px;opacity:0.6">No rotation</span
    ></label
>
<label class="toggle-row"
    ><input
        type="checkbox"
        checked={panel.showSelectionHex}
        onchange={(e) => {
            const v = (e.target as HTMLInputElement).checked;
            GAME_CONFIG.SHOW_SELECTION_HEX = v;
            updatePanel("showSelectionHex", v);
        }}
    />
    <span class="var-name">⬡ Selection Hex</span><span
        class="val"
        style="font-size:9px;opacity:0.6">Hex border on active star</span
    ></label
>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Lane Width</span><span class="val"
            >{vis.laneWidth.toFixed(1)}</span
        >
    </div>
    <input
        type="range"
        min={0.5}
        max={8}
        step={0.5}
        value={vis.laneWidth}
        oninput={(e) =>
            updateVisual(
                "laneWidth",
                parseFloat((e.target as HTMLInputElement).value),
            )}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Lane Opacity</span><span class="val"
            >{vis.laneAlpha.toFixed(2)}</span
        >
    </div>
    <input
        type="range"
        min={0.05}
        max={1}
        step={0.05}
        value={vis.laneAlpha}
        oninput={(e) =>
            updateVisual(
                "laneAlpha",
                parseFloat((e.target as HTMLInputElement).value),
            )}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Shadow Width</span><span class="val"
            >{vis.shadowWidth.toFixed(1)}</span
        >
    </div>
    <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={vis.shadowWidth}
        oninput={(e) =>
            updateVisual(
                "shadowWidth",
                parseFloat((e.target as HTMLInputElement).value),
            )}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Shadow Opacity</span><span class="val"
            >{vis.shadowAlpha.toFixed(2)}</span
        >
    </div>
    <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={vis.shadowAlpha}
        oninput={(e) =>
            updateVisual(
                "shadowAlpha",
                parseFloat((e.target as HTMLInputElement).value),
            )}
    />
</div>
</section>

<style>
    @import "./panel-shared.css";
    .map-lane-mode-segment {
        display: inline-flex;
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.14);
        background: rgba(0, 0, 0, 0.35);
    }
    .map-lane-mode-segment__btn {
        margin: 0;
        padding: 6px 12px;
        min-height: 30px;
        min-width: 0;
        flex: 1 1 0;
        font-size: 11px;
        font-weight: 500;
        color: #9aa;
        background: transparent;
        border: none;
        cursor: pointer;
        transition:
            background 0.12s,
            color 0.12s;
    }
    .map-lane-mode-segment__btn:hover {
        color: #e2e8f0;
        background: rgba(255, 255, 255, 0.06);
    }
    .map-lane-mode-segment__btn--active {
        color: #ecfdf5;
        background: rgba(74, 222, 128, 0.22);
    }
    .map-lane-mode-segment__btn + .map-lane-mode-segment__btn {
        border-left: 1px solid rgba(255, 255, 255, 0.1);
    }
    .bg-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 8px;
    }
    .background-mode-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 8px;
        margin-bottom: 10px;
    }
    .background-mode-card {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.04);
        color: #d7e2f0;
        cursor: pointer;
        text-align: left;
        transition:
            border-color 0.15s,
            transform 0.15s,
            background 0.15s;
    }
    .background-mode-card:hover {
        border-color: rgba(125, 211, 252, 0.4);
        background: rgba(125, 211, 252, 0.08);
        transform: translateY(-1px);
    }
    .background-mode-card:disabled {
        opacity: 0.46;
        cursor: not-allowed;
        transform: none;
        border-color: rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.025);
    }
    .background-mode-card:disabled:hover {
        transform: none;
        border-color: rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.025);
    }
    .background-mode-card.active {
        border-color: rgba(74, 222, 128, 0.72);
        background: rgba(74, 222, 128, 0.14);
        box-shadow: 0 0 0 1px rgba(74, 222, 128, 0.14);
    }
    .background-mode-card.active:disabled {
        opacity: 0.72;
        border-color: rgba(245, 158, 11, 0.68);
        background: rgba(245, 158, 11, 0.12);
        box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.12);
    }
    .background-mode-card__swatch {
        display: block;
        width: 100%;
        height: 72px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .background-mode-card__title {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: #f8fafc;
    }
    .background-mode-card__copy {
        font-size: 10px;
        line-height: 1.45;
        color: rgba(207, 220, 235, 0.82);
    }
    .background-tuning-panel {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px;
        margin-bottom: 10px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        background: rgba(11, 17, 32, 0.55);
    }
    .background-tuning-panel--disabled {
        opacity: 0.56;
    }
    .background-tuning-panel__header {
        align-items: center;
    }
    .background-tuning-panel__actions {
        display: inline-flex;
        align-items: center;
        gap: 8px;
    }
    .background-tuning-panel__reset {
        margin: 0;
        padding: 4px 8px;
        min-height: 0;
        font-size: 10px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #d7e2f0;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 999px;
        cursor: pointer;
    }
    .background-tuning-panel__reset:hover {
        background: rgba(125, 211, 252, 0.14);
        border-color: rgba(125, 211, 252, 0.32);
    }
    .background-tuning-panel__group-label {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(199, 223, 245, 0.72);
    }
    .background-support-note {
        margin: 0 0 10px;
        color: rgba(207, 220, 235, 0.72);
    }
    .background-warning {
        margin-bottom: 10px;
        padding: 8px 10px;
        border-left: 3px solid rgba(245, 158, 11, 0.95);
        border-radius: 6px;
        background: rgba(245, 158, 11, 0.1);
        color: #fde68a;
        font-size: 10px;
        line-height: 1.45;
    }
    .bg-thumb {
        width: 48px;
        height: 32px;
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        overflow: hidden;
        cursor: pointer;
        background: #111;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        transition: border-color 0.15s;
    }
    .bg-thumb:hover {
        border-color: rgba(255, 255, 255, 0.35);
    }
    .bg-thumb.active {
        border-color: #4ade80;
        box-shadow: 0 0 6px rgba(74, 222, 128, 0.3);
    }
    .bg-thumb-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    .bg-none-icon {
        font-size: 16px;
        color: #666;
    }
</style>
