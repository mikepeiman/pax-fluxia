<script lang="ts">
  import "./panel-shared.css";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { BG_IMAGES } from "$lib/config/bgManifest";
    import { resolveEffectiveLaneMarginPx } from "$lib/lanes/laneMargin";
    import { gameStore } from "$lib/stores/gameStore.svelte";
    import {
        PaxHudButton,
        PaxHudSegmentedControl,
        PaxSettingsRangeRow,
        PaxSettingsSegmentedRow,
        PaxSettingsToggleRow,
        type PaxHudSegmentedOption,
    } from "$lib/design-system";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    // ControlsSection-VISUALS - In-Game Settings Controls: Map & Grid

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        /** Normalizes, writes config, notifies the canvas, and persists. */
        updateBgImage: (rawPath: string) => void;
        syncFromConfig?: () => void;
    }

    let { panel, updatePanel, updateBgImage, syncFromConfig }: Props = $props();

    // Lane + background values are ordinary panel keys (2026-07-15 audit): they
    // used to come from a parallel `vis` store that persisted the same five
    // values under a second set of key names.
    let laneWidth = $derived(panel.connectionWidth ?? GAME_CONFIG.CONNECTION_WIDTH);
    let laneAlpha = $derived(panel.connectionAlpha ?? GAME_CONFIG.CONNECTION_ALPHA);
    let shadowWidth = $derived(
        panel.connectionShadowWidth ?? GAME_CONFIG.CONNECTION_SHADOW_WIDTH,
    );
    let shadowAlpha = $derived(
        panel.connectionShadowAlpha ?? GAME_CONFIG.CONNECTION_SHADOW_ALPHA,
    );
    let bgImage = $derived(panel.bgImageUrl ?? GAME_CONFIG.BG_IMAGE_URL);

    function updateLaneValue(configKey: string, panelKey: string, value: number) {
        (GAME_CONFIG as any)[configKey] = value;
        updatePanel(panelKey, value);
    }

    const bgImages = BG_IMAGES;
    const mapConfig = GAME_CONFIG as typeof GAME_CONFIG & {
        MAPGEN_LANE_MARGIN_ENABLED?: boolean;
    };

    const LABEL_ANIM_OPTIONS = [
        { value: "rolling", label: "Rolling" },
        { value: "fade", label: "Fade" },
        { value: "instant", label: "Instant" },
    ];

    const LANE_PATH_OPTIONS: PaxHudSegmentedOption[] = [
        {
            value: "straight",
            label: "Straight",
            title: "Chord only between linked stars",
        },
        {
            value: "curved",
            label: "Curve if needed",
            title: "Satisfy lane margin with chord or, if needed, curve/kink vs stars and other lanes",
        },
    ];

    let lanePathUiMode = $derived(
        (panel.mapgenLaneMode ?? GAME_CONFIG.MAPGEN_LANE_MODE ?? "curved") as
            | "straight"
            | "curved",
    );
    let laneMarginEnabled = $derived(
        (panel.mapgenLaneMarginEnabled ??
            mapConfig.MAPGEN_LANE_MARGIN_ENABLED ??
            false) as boolean,
    );
    let effectiveLaneMarginPx = $derived(
        resolveEffectiveLaneMarginPx({
            MAPGEN_LANE_MARGIN_ENABLED: laneMarginEnabled,
            MAPGEN_LANE_MARGIN_PX:
                panel.mapgenLaneMarginPx ??
                GAME_CONFIG.MAPGEN_LANE_MARGIN_PX ??
                0,
        }),
    );

    function rebuildLaneConstraints() {
        (gameStore as any).rebuildLaneConstraintsFromConfig?.();
    }

    function changeBg(img: string) {
        updateBgImage(img);
    }

    function updateBgAlpha(value: number) {
        GAME_CONFIG.BG_IMAGE_ALPHA = value;
        updatePanel("bgImageAlpha", value);
        window.dispatchEvent(
            new CustomEvent("pax-bg-alpha-change", { detail: value }),
        );
    }

    function updateLaneMarginEnabled(value: boolean) {
        mapConfig.MAPGEN_LANE_MARGIN_ENABLED = value;
        updatePanel("mapgenLaneMarginEnabled", value);
        rebuildLaneConstraints();
    }

    function updateLaneMarginPx(value: number) {
        GAME_CONFIG.MAPGEN_LANE_MARGIN_PX = value;
        updatePanel("mapgenLaneMarginPx", value);
        rebuildLaneConstraints();
    }

    function updateReshapeBias(value: number) {
        GAME_CONFIG.MAPGEN_LANE_CURVE_VS_PRUNE_BIAS = value;
        updatePanel("mapgenLaneCurveVsPruneBias", value);
        rebuildLaneConstraints();
    }

    function updateLanePath(value: string) {
        const next = value === "straight" ? "straight" : "curved";
        updatePanel("mapgenLaneMode", next);
        rebuildLaneConstraints();
    }

    function updateLabelAnimMode(value: string) {
        const next = value === "fade" || value === "instant" ? value : "rolling";
        GAME_CONFIG.LABEL_ANIM_MODE = next;
        updatePanel("labelAnimMode", next);
    }

    function updateNumberTransitionMs(value: number) {
        GAME_CONFIG.NUMBER_TRANSITION_MS = value;
        updatePanel("numberTransitionMs", value);
    }

    function updateOrderArrowsFollowLanePaths(value: boolean) {
        GAME_CONFIG.ORDER_ARROWS_FOLLOW_LANE_PATHS = value;
        updatePanel("orderArrowsFollowLanePaths", value);
    }

    function updateArrowPathPadding(value: number) {
        GAME_CONFIG.ARROW_PATH_PADDING = value;
        updatePanel("arrowPathPadding", value);
    }

    function updateStaticOrbits(value: boolean) {
        GAME_CONFIG.STATIC_ORBITS = value;
        updatePanel("staticOrbits", value);
    }

    function updateSelectionHex(value: boolean) {
        GAME_CONFIG.SHOW_SELECTION_HEX = value;
        updatePanel("showSelectionHex", value);
    }
</script>

<CategoryThemeBar category="visuals" onApply={() => syncFromConfig?.()} />

<section data-subsection-id="background" class="visuals-section">
    <h4 class="sub-heading">Background</h4>
    <div class="visuals-summary">
        <span
            data-setting-config-key="BG_IMAGE_URL"
            data-setting-description="Background image asset path displayed behind the battlefield."
        >
            Background Asset
        </span>
        <strong>{bgImage || "none"}</strong>
    </div>

    <div class="visuals-bg-grid">
        <PaxHudButton
            class="visuals-bg-thumb"
            active={!bgImage}
            title="No background"
            onclick={() => changeBg("")}
        >
            <span class="visuals-bg-none">None</span>
        </PaxHudButton>
        {#each bgImages as img}
            <PaxHudButton
                class="visuals-bg-thumb"
                active={bgImage === img}
                title={img
                    .replace(/\.(png|jpe?g|webp|avif)$/i, "")
                    .replace(/^pax-fluxia-/, "")}
                onclick={() => changeBg(img)}
            >
                <img
                    src="/assets/{img}"
                    alt={img}
                    class="visuals-bg-thumb__img"
                    loading="lazy"
                />
            </PaxHudButton>
        {/each}
    </div>

    <PaxSettingsRangeRow
        label="BG Opacity"
        value={panel.bgImageAlpha ?? GAME_CONFIG.BG_IMAGE_ALPHA ?? 0.35}
        min={0}
        max={1}
        step={0.05}
        format="fixed2"
        settingConfigKey="BG_IMAGE_ALPHA"
        onInput={updateBgAlpha}
    />
</section>

<section data-subsection-id="map-layout" class="visuals-section">
    <h4 class="sub-heading">Map Layout</h4>

    <PaxSettingsToggleRow
        label="Use dedicated lane margin"
        checked={laneMarginEnabled}
        description="When off, curved-lane clearance falls back to the active territory minimum star margin."
        meta={laneMarginEnabled ? "On" : `Fallback ${Math.round(effectiveLaneMarginPx)}px`}
        settingConfigKey="MAPGEN_LANE_MARGIN_ENABLED"
        onChange={updateLaneMarginEnabled}
    />

    <PaxSettingsRangeRow
        label="Lane margin (mapgen)"
        note={`Effective lane clearance: ${Math.round(effectiveLaneMarginPx)}px${!laneMarginEnabled ? " using territory star margin fallback" : ""}`}
        value={panel.mapgenLaneMarginPx ?? GAME_CONFIG.MAPGEN_LANE_MARGIN_PX ?? 75}
        min={0}
        max={250}
        step={5}
        suffix="px"
        disabled={!laneMarginEnabled}
        settingConfigKey="MAPGEN_LANE_MARGIN_PX"
        onInput={updateLaneMarginPx}
    />

    <PaxSettingsRangeRow
        label="Reshape bias"
        note="0 removes violating connections during connectivity recompute; 1 exhausts reshaping first."
        value={panel.mapgenLaneCurveVsPruneBias ??
            GAME_CONFIG.MAPGEN_LANE_CURVE_VS_PRUNE_BIAS ??
            0.55}
        min={0}
        max={1}
        step={0.05}
        format="fixed2"
        settingConfigKey="MAPGEN_LANE_CURVE_VS_PRUNE_BIAS"
        onInput={updateReshapeBias}
    />

    <div class="visuals-control-card">
        <span class="visuals-control-card__label">Lane path</span>
        <PaxHudSegmentedControl
            value={lanePathUiMode}
            options={LANE_PATH_OPTIONS}
            ariaLabel="Lane path: straight chords or curved when needed"
            onValueChange={updateLanePath}
        />
    </div>
</section>

<section data-subsection-id="labels-inspector" class="visuals-section">
    <h4 class="sub-heading">Labels &amp; Inspector</h4>

    <div class="visuals-control-card">
        <PaxSettingsSegmentedRow
            label="Label Anim Mode"
            hint="How star labels update: Rolling (lerp), Fade (snap + flash), or Instant."
            settingConfigKey="LABEL_ANIM_MODE"
            value={panel.labelAnimMode ?? GAME_CONFIG.LABEL_ANIM_MODE ?? "rolling"}
            options={LABEL_ANIM_OPTIONS}
            onValueChange={updateLabelAnimMode}
        />
    </div>

    <PaxSettingsRangeRow
        label="Label Transition"
        value={panel.numberTransitionMs ?? 120}
        min={0}
        max={500}
        step={10}
        suffix="ms"
        settingConfigKey="NUMBER_TRANSITION_MS"
        onInput={updateNumberTransitionMs}
    />
</section>

<section data-subsection-id="connections" class="visuals-section">
    <h4 class="sub-heading">Connections</h4>

    <PaxSettingsToggleRow
        label="Arrows follow lane paths"
        checked={panel.orderArrowsFollowLanePaths ??
            GAME_CONFIG.ORDER_ARROWS_FOLLOW_LANE_PATHS ??
            false}
        description="Match arrows to straight or curved lane geometry."
        meta="Lane"
        settingConfigKey="ORDER_ARROWS_FOLLOW_LANE_PATHS"
        onChange={updateOrderArrowsFollowLanePaths}
    />

    <PaxSettingsRangeRow
        label="Arrow Length"
        value={panel.arrowLengthFraction ?? GAME_CONFIG.ARROW_LENGTH ?? 0.5}
        min={0.1}
        max={1.0}
        step={0.05}
        format="fixed2"
        settingConfigKey="ARROW_LENGTH"
        onInput={(value) => {
            GAME_CONFIG.ARROW_LENGTH = value;
            updatePanel("arrowLengthFraction", value);
        }}
    />

    <PaxSettingsRangeRow
        label="Arrow Path Padding"
        value={panel.arrowPathPadding ?? GAME_CONFIG.ARROW_PATH_PADDING ?? 0}
        min={0}
        max={40}
        step={1}
        suffix="px"
        settingConfigKey="ARROW_PATH_PADDING"
        onInput={updateArrowPathPadding}
    />

    <PaxSettingsToggleRow
        label="Static Orbits"
        checked={panel.staticOrbits}
        description="Disable orbital rotation."
        meta={panel.staticOrbits ? "Static" : "Motion"}
        settingConfigKey="STATIC_ORBITS"
        onChange={updateStaticOrbits}
    />

    <PaxSettingsToggleRow
        label="Selection Hex"
        checked={panel.showSelectionHex}
        description="Show a hex border on the active star."
        meta={panel.showSelectionHex ? "On" : "Off"}
        settingConfigKey="SHOW_SELECTION_HEX"
        onChange={updateSelectionHex}
    />

    <!-- settingConfigKey added with the vis-store fold-in: these four rows had
         none, so settings-search could match them but never scroll to or flash
         them. -->
    <PaxSettingsRangeRow
        label="Lane Width"
        value={laneWidth}
        min={0.5}
        max={8}
        step={0.5}
        format="fixed1"
        settingConfigKey="CONNECTION_WIDTH"
        onInput={(value) => updateLaneValue("CONNECTION_WIDTH", "connectionWidth", value)}
    />

    <PaxSettingsRangeRow
        label="Lane Opacity"
        value={laneAlpha}
        min={0.05}
        max={1}
        step={0.05}
        format="fixed2"
        settingConfigKey="CONNECTION_ALPHA"
        onInput={(value) => updateLaneValue("CONNECTION_ALPHA", "connectionAlpha", value)}
    />

    <PaxSettingsRangeRow
        label="Shadow Width"
        value={shadowWidth}
        min={0}
        max={10}
        step={1}
        format="fixed1"
        settingConfigKey="CONNECTION_SHADOW_WIDTH"
        onInput={(value) =>
            updateLaneValue("CONNECTION_SHADOW_WIDTH", "connectionShadowWidth", value)}
    />

    <PaxSettingsRangeRow
        label="Shadow Opacity"
        value={shadowAlpha}
        min={0}
        max={1}
        step={0.05}
        format="fixed2"
        settingConfigKey="CONNECTION_SHADOW_ALPHA"
        onInput={(value) =>
            updateLaneValue("CONNECTION_SHADOW_ALPHA", "connectionShadowAlpha", value)}
    />
</section>

<style>

    .visuals-section {
        display: flex;
        flex-direction: column;
        gap: var(--pax-gap-sm);
    }


    .visuals-summary,
    .visuals-control-card {
        min-width: 0;
        display: grid;
        gap: var(--pax-space-2);
        padding: var(--pax-gap-sm);
        border: 1px solid transparent;
        border-radius: var(--pax-ui-radius-sm);
        clip-path: var(--pax-ui-rounded-corner-sm);
        background:
            linear-gradient(180deg, color-mix(in srgb, var(--pax-color-void) 78%, transparent), color-mix(in srgb, var(--pax-color-void) 90%, transparent)) padding-box,
            var(--pax-ui-control-border-gradient) border-box;
    }

    .visuals-summary {
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
    }

    .visuals-summary span,
    .visuals-control-card__label {
        min-width: 0;
        overflow: hidden;
        color: var(--pax-ui-text-soft);
        font-family: var(--pax-ui-font-ui);
        font-size: calc(0.72rem * var(--pax-ui-type-scale, 1));
        font-weight: var(--pax-weight-extrabold);
        letter-spacing: 0.06em;
        text-overflow: ellipsis;
        text-transform: uppercase;
        white-space: nowrap;
    }

    .visuals-summary strong {
        max-width: 160px;
        overflow: hidden;
        color: var(--pax-ui-accent-warm-strong);
        font-family: var(--pax-ui-font-data);
        font-size: calc(0.68rem * var(--pax-ui-data-scale, 1));
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .visuals-bg-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(54px, 1fr));
        gap: var(--pax-space-2);
    }

    :global(.visuals-bg-thumb) {
        width: 100%;
        height: 38px;
        min-height: 38px;
        padding: 0;
        overflow: hidden;
    }

    .visuals-bg-thumb__img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .visuals-bg-none {
        color: var(--pax-ui-text-soft);
        font-family: var(--pax-ui-font-ui);
        font-size: calc(0.66rem * var(--pax-ui-type-scale, 1));
        font-weight: var(--pax-weight-extrabold);
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }
</style>
