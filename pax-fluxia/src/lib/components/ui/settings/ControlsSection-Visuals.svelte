<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { resolveEffectiveLaneMarginPx } from "$lib/lanes/laneMargin";

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

    // ── Background Image Picker ──
    let bgImages = $state<string[]>(BG_IMAGES);

    // Background change uses updateVisual to sync immediately
    function changeBg(img: string) {
        updateVisual("bgImage", img);
    }
</script>

<CategoryThemeBar category="visuals" onApply={() => syncFromConfig?.()} />

<section data-subsection-id="background">
    <h4 class="sub-heading">Background</h4>
    <div class="var-row">
        <div class="row-top">
            <span
                class="var-name"
                data-setting-config-key="BG_IMAGE_URL"
                data-setting-description="Background image asset path displayed behind the battlefield."
                >Background Asset</span
            >
            <span class="val">{vis.bgImage || "none"}</span>
        </div>
    </div>
    <div class="bg-grid">
        <button
            class="bg-thumb"
            class:active={!vis.bgImage}
            onclick={() => changeBg("")}
            title="No background"
        >
            <span class="bg-none-icon">∅</span>
        </button>
        {#each bgImages as img}
            <button
                class="bg-thumb"
                class:active={vis.bgImage === img}
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
        }}
    />
    <span
        class="var-name"
        data-setting-config-key="MAPGEN_LANE_MARGIN_ENABLED"
        data-setting-description="When off, lane clearance and automatic lane reshaping are inactive."
        >Use lane margin</span
    >
    <span class="val">{laneMarginEnabled ? "On" : "Off"}</span>
</label>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Lane margin (mapgen)</span><span class="val"
            >{Math.round(
                panel.mapgenLaneMarginPx ?? GAME_CONFIG.MAPGEN_LANE_MARGIN_PX ?? 0,
            )}px</span
        >
    </div>
    <div class="row-bottom" style="font-size:10px;opacity:0.68;">
        Effective lane clearance: {Math.round(effectiveLaneMarginPx)}px
        {#if !laneMarginEnabled}
            (inactive)
        {/if}
    </div>
    <input
        type="range"
        min="0"
        max="250"
        step="5"
        disabled={!laneMarginEnabled}
        value={panel.mapgenLaneMarginPx ?? GAME_CONFIG.MAPGEN_LANE_MARGIN_PX ?? 0}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.MAPGEN_LANE_MARGIN_PX = v;
            updatePanel("mapgenLaneMarginPx", v);
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
