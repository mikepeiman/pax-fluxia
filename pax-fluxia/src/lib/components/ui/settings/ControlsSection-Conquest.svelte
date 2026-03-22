<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { ANIM_SLIDERS } from "../settingsDefs";

    // ControlsSection-CONQUEST — In-Game Settings Controls: Conquest
    // Extracted from GameSettingsPanel.svelte

    // VS Transition sliders filtered from ANIM_SLIDERS
    const VS_SLIDERS = ANIM_SLIDERS.filter((s) => s.group === "VS Transition");

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        syncFromConfig?: () => void;
        animLockModes: Record<string, any>;
        animLockRatios: Record<string, any>;
        animValues: Record<string, number>;
        getAnimValue: (key: string) => number;
        setAnimValue: (key: string, val: number) => void;
        formatAnimValue: (val: number, unit: string) => string;
        pinValueToTickDuration: (key: string) => void;
        lockRatioToTick: (key: string) => void;
        lockRatioToAnimSpeed: (key: string) => void;
    }
    let {
        panel,
        updatePanel,
        syncFromConfig,
        animLockModes,
        animLockRatios,
        animValues,
        getAnimValue,
        setAnimValue,
        formatAnimValue,
        pinValueToTickDuration,
        lockRatioToTick,
        lockRatioToAnimSpeed,
    }: Props = $props();
    import CategoryThemeBar from "./CategoryThemeBar.svelte";
</script>

<CategoryThemeBar category="conquest" onApply={() => syncFromConfig?.()} />

<h4 class="sub-heading">Animation</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Conquest Mode</span><span class="val"
            >{panel.conquestAnimMode}</span
        >
    </div>
    <select
        class="mode-select"
        value={panel.conquestAnimMode}
        onchange={(e) => {
            const v = (e.target as HTMLSelectElement).value as
                | "immediate"
                | "surge"
                | "travel"
                | "arrowhead";
            GAME_CONFIG.CONQUEST_ANIMATION_MODE = v;
            updatePanel("conquestAnimMode", v);
        }}
    >
        <option value="immediate">Immediate</option>
        <option value="surge">Surge</option>
        <option value="travel">Travel</option>
        <option value="arrowhead">Arrowhead</option>
    </select>
</div>

{#if panel.conquestAnimMode === "arrowhead"}
    <h4 class="sub-heading">Arrowhead Formation</h4>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Taper</span><span class="val"
                >{((panel.arrowTaper ?? 0) as number).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={panel.arrowTaper}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.ARROW_TAPER = v;
                updatePanel("arrowTaper", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Width</span><span class="val"
                >{panel.arrowWidth === 0
                    ? "auto"
                    : `${panel.arrowWidth}px`}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="200"
            step="5"
            value={panel.arrowWidth}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.ARROW_WIDTH = v;
                updatePanel("arrowWidth", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Speed</span><span class="val"
                >{((panel.arrowSpeed ?? 0) as number).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={panel.arrowSpeed}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.ARROW_SPEED = v;
                updatePanel("arrowSpeed", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Easing</span><span class="val"
                >{panel.arrowEasing}</span
            >
        </div>
        <select
            class="mode-select"
            value={panel.arrowEasing}
            onchange={(e) => {
                const v = (e.target as HTMLSelectElement).value as
                    | "easeIn"
                    | "easeInOut"
                    | "linear";
                GAME_CONFIG.ARROW_EASING = v;
                updatePanel("arrowEasing", v);
            }}
        >
            <option value="easeIn">Ease In (accelerate)</option>
            <option value="easeInOut">Ease In/Out</option>
            <option value="linear">Linear</option>
        </select>
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Tick-Bound</span>
            <label class="toggle-switch">
                <input
                    type="checkbox"
                    checked={panel.arrowStaggerAuto}
                    onchange={(e) => {
                        const v = (e.target as HTMLInputElement).checked;
                        GAME_CONFIG.ARROW_STAGGER_AUTO = v;
                        updatePanel("arrowStaggerAuto", v);
                    }}
                />
                <span class="slider"></span>
            </label>
        </div>
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Stagger</span><span class="val"
                >{panel.arrowStaggerAuto
                    ? "auto"
                    : `${panel.arrowStaggerMs}ms`}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={panel.arrowStaggerMs}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.ARROW_STAGGER_MS = v;
                updatePanel("arrowStaggerMs", v);
            }}
        />
    </div>
{/if}

<h4 class="sub-heading">Engulf</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Engulf Mode</span><span class="val"
            >{panel.arrowEngulfMode}</span
        >
    </div>
    <select
        class="mode-select"
        value={panel.arrowEngulfMode}
        onchange={(e) => {
            const v = (e.target as HTMLSelectElement).value as
                | "fan"
                | "collapse"
                | "ring"
                | "swarm";
            GAME_CONFIG.ARROW_ENGULF_MODE = v;
            updatePanel("arrowEngulfMode", v);
        }}
    >
        <option value="fan">Fan (surround)</option>
        <option value="collapse">Collapse (pile on)</option>
        <option value="ring">Ring (encircle)</option>
        <option value="swarm">Swarm (scatter)</option>
    </select>
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Engulf Radius</span><span class="val"
            >{panel.arrowEngulfRadius}px</span
        >
    </div>
    <input
        type="range"
        min="10"
        max="200"
        step="5"
        value={panel.arrowEngulfRadius}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.ARROW_ENGULF_RADIUS = v;
            updatePanel("arrowEngulfRadius", v);
        }}
    />
</div>

<h4 class="sub-heading">Spiral Settle</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Min Degrees</span><span class="val"
            >{panel.arrowSpiralMinDeg}°</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="1080"
        step="30"
        value={panel.arrowSpiralMinDeg}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.ARROW_SPIRAL_MIN_DEG = v;
            updatePanel("arrowSpiralMinDeg", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Max Degrees</span><span class="val"
            >{panel.arrowSpiralMaxDeg}°</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="1080"
        step="30"
        value={panel.arrowSpiralMaxDeg}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.ARROW_SPIRAL_MAX_DEG = v;
            updatePanel("arrowSpiralMaxDeg", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Random Spiral</span><span class="val"
            >{panel.arrowSpiralRandom ? "On" : "Off"}</span
        >
    </div>
    <input
        type="checkbox"
        checked={panel.arrowSpiralRandom as boolean}
        onchange={(e) => {
            const v = (e.target as HTMLInputElement).checked;
            GAME_CONFIG.ARROW_SPIRAL_RANDOM = v;
            updatePanel("arrowSpiralRandom", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Spiral Duration</span><span class="val"
            >{panel.arrowSpiralDurationMs}ms</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="3000"
        step="50"
        value={panel.arrowSpiralDurationMs}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.ARROW_SPIRAL_DURATION_MS = v;
            updatePanel("arrowSpiralDurationMs", v);
        }}
    />
</div>

<!-- ── Conquest Timing ── -->
<h4 class="sub-heading">Timing</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Color Delay</span><span class="val"
            >{panel.conquestColorDelayTicks} ticks</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="10"
        step="0.5"
        value={panel.conquestColorDelayTicks}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.CONQUEST_COLOR_DELAY_TICKS = v;
            updatePanel("conquestColorDelayTicks", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Flash Duration</span><span class="val"
            >{panel.conquestFlashTicks} ticks</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="10"
        step="0.5"
        value={panel.conquestFlashTicks}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.CONQUEST_FLASH_TICKS = v;
            updatePanel("conquestFlashTicks", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Lerp Delay</span><span class="val"
            >{panel.conquestLerpDelayMs}ms</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="5000"
        step="10"
        value={panel.conquestLerpDelayMs}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.CONQUEST_LERP_DELAY_MS = v;
            updatePanel("conquestLerpDelayMs", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Travel Speed</span><span class="val"
            >{((panel.conquestTravelSpeed ?? 0) as number).toFixed(2)}×</span
        >
    </div>
    <input
        type="range"
        min="0.01"
        max="2"
        step="0.01"
        value={panel.conquestTravelSpeed}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.CONQUEST_TRAVEL_SPEED = v;
            updatePanel("conquestTravelSpeed", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Settle Duration</span><span class="val"
            >{panel.conquestSettleMs}ms</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="5000"
        step="10"
        value={panel.conquestSettleMs}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.CONQUEST_SETTLE_MS = v;
            updatePanel("conquestSettleMs", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Surge Stagger</span><span class="val"
            >{panel.conquestSurgeStaggerMs}ms</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="200"
        step="5"
        value={panel.conquestSurgeStaggerMs}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.CONQUEST_SURGE_STAGGER_MS = v;
            updatePanel("conquestSurgeStaggerMs", v);
        }}
    />
</div>

<!-- ── VS Transition (F-165) — per-slider lock icons ── -->
<h4 class="sub-heading">VS Transition</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Ghost Mode</span><span class="val"
            >{panel.vsTransitionMode ?? "no_loser"}</span
        >
    </div>
    <select
        class="mode-select"
        value={panel.vsTransitionMode ?? "no_loser"}
        onchange={(e) => {
            const v = (e.target as HTMLSelectElement).value;
            GAME_CONFIG.VS_TRANSITION_MODE = v as any;
            updatePanel("vsTransitionMode", v);
        }}
    >
        <option value="dual_ghost">Dual Ghost (vic+loser)</option>
        <option value="no_loser">No Loser Ghost</option>
        <option value="no_ghosts">No Ghosts (ramp only)</option>
        <option value="matched_ease">Matched Ease (easeInOut)</option>
        <option value="sequential">Sequential (loser→victor)</option>
        <option value="linear">Linear (all linear)</option>
    </select>
</div>
{#each VS_SLIDERS as slider}
    <div class="var-row" class:locked={animLockModes[slider.key] != null}>
        <div class="row-top">
            <span class="var-name" title={slider.desc ?? ""}
                >{slider.label}</span
            >
            <span class="val-group">
                <span class="val"
                    >{formatAnimValue(
                        getAnimValue(slider.key),
                        slider.unit ?? "",
                    )}</span
                >
                <button
                    class="lock-btn"
                    class:active={animLockModes[slider.key] === "pinned"}
                    title={animLockModes[slider.key] === "pinned"
                        ? "Pinned to tick duration — click to unpin"
                        : "Pin value = tick duration"}
                    onclick={() => pinValueToTickDuration(slider.key)}
                    >🕐</button
                >
                <button
                    class="lock-btn"
                    class:active={animLockModes[slider.key] === "ratio"}
                    title={animLockModes[slider.key] === "ratio"
                        ? `Locked at ${(animLockRatios[slider.key] ?? 0).toFixed(3)}×tick — click to unlock`
                        : "Lock current ratio to tick"}
                    onclick={() => lockRatioToTick(slider.key)}>◆</button
                >
                <button
                    class="lock-btn"
                    class:active={animLockModes[slider.key] === "animSpeed"}
                    title={animLockModes[slider.key] === "animSpeed"
                        ? `Locked at ${(animLockRatios[slider.key] ?? 0).toFixed(3)}×anim — click to unlock`
                        : "Lock current ratio to animation speed"}
                    onclick={() => lockRatioToAnimSpeed(slider.key)}>⚡</button
                >
            </span>
        </div>
        <input
            type="range"
            min={slider.min}
            max={slider.max}
            step={slider.step}
            value={getAnimValue(slider.key)}
            disabled={animLockModes[slider.key] != null}
            oninput={(e) => {
                const v = parseFloat((e.target as HTMLInputElement).value);
                setAnimValue(slider.key, v);
            }}
        />
    </div>
{/each}

<style>
    @import "./panel-shared.css";
</style>
