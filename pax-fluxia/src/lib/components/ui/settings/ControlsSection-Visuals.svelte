<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { onMount } from "svelte";

    // ControlsSection-VISUALS — In-Game Settings Controls: Map & Grid
    // Extracted from GameSettingsPanel.svelte

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        vis: Record<string, any>;
        updateVisual: (key: string, val: any) => void;
        densityVariables: any[];
        syncFromConfig?: () => void;
    }
    let {
        panel,
        updatePanel,
        vis,
        updateVisual,
        densityVariables,
        syncFromConfig,
    }: Props = $props();
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    // ── Background Image Picker ──
    let bgImages = $state<string[]>([]);

    onMount(() => {
        fetch("/api/backgrounds")
            .then((r) => r.json())
            .then((imgs: string[]) => {
                bgImages = imgs;
            })
            .catch(() => {});
    });

    // Background change uses updateVisual to sync immediately
    function changeBg(img: string) {
        updateVisual("bgImage", img);
    }
</script>

<CategoryThemeBar category="visuals" onApply={() => syncFromConfig?.()} />

<h4 class="sub-heading">Background</h4>
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

<h4 class="sub-heading">Overlays</h4>
<label class="toggle-row"
    ><input
        type="checkbox"
        checked={GAME_CONFIG.SHOW_HEX_GRID}
        onchange={(e) => {
            GAME_CONFIG.SHOW_HEX_GRID = (e.target as HTMLInputElement).checked;
        }}
    />
    <span class="var-name">🔷 Show Hex Grid</span></label
>
<label class="toggle-row"
    ><input
        type="checkbox"
        checked={typeof localStorage !== "undefined" &&
            localStorage.getItem("pax-show-star-info") === "true"}
        onchange={(e) => {
            const v = (e.target as HTMLInputElement).checked;
            localStorage.setItem("pax-show-star-info", v ? "true" : "false");
            window.dispatchEvent(
                new CustomEvent("pax-star-info-toggle", {
                    detail: v,
                }),
            );
        }}
    />
    <span class="var-name">🔍 Star Inspector</span><span
        class="val"
        style="font-size:9px;opacity:0.6">click star to inspect</span
    ></label
>
<h4 class="sub-heading">Connections</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">➡️ Arrow Length</span><span class="val"
            >{Math.round(GAME_CONFIG.ARROW_LENGTH_FRACTION * 100)}%</span
        >
    </div>
    <input
        type="range"
        min="10"
        max="100"
        step="1"
        value={Math.round(GAME_CONFIG.ARROW_LENGTH_FRACTION * 100)}
        oninput={(e) => {
            GAME_CONFIG.ARROW_LENGTH_FRACTION =
                parseInt((e.target as HTMLInputElement).value) / 100;
        }}
    />
</div>
<label class="toggle-row"
    ><input
        type="checkbox"
        checked={GAME_CONFIG.STATIC_ORBITS}
        onchange={(e) => {
            GAME_CONFIG.STATIC_ORBITS = (e.target as HTMLInputElement).checked;
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
        checked={GAME_CONFIG.SHOW_SELECTION_HEX}
        onchange={(e) => {
            GAME_CONFIG.SHOW_SELECTION_HEX = (
                e.target as HTMLInputElement
            ).checked;
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

<style>
    @import "./panel-shared.css";
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
