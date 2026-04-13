<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { ANIM_SLIDERS } from "../settingsDefs";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    const VS_SLIDERS = ANIM_SLIDERS.filter((slider) => slider.group === "VS Transition");

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
</script>

<CategoryThemeBar category="conquest" onApply={() => syncFromConfig?.()} />

<h4 class="sub-heading">Animation Mode</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Conquest Mode</span>
        <span class="val">{panel.conquestAnimMode}</span>
    </div>
    <select
        class="mode-select"
        value={panel.conquestAnimMode}
        onchange={(event) => {
            const value = (event.target as HTMLSelectElement).value as
                | "immediate"
                | "surge"
                | "travel"
                | "arrowhead";
            GAME_CONFIG.CONQUEST_ANIMATION_MODE = value;
            updatePanel("conquestAnimMode", value);
        }}
    >
        <option value="immediate">Immediate</option>
        <option value="surge">Surge</option>
        <option value="travel">Travel</option>
        <option value="arrowhead">Arrowhead</option>
    </select>
</div>

<h4 class="sub-heading">Resolution Timing</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Color Delay</span>
        <span class="val">{panel.conquestColorDelayTicks} ticks</span>
    </div>
    <input
        type="range"
        min="0"
        max="10"
        step="0.5"
        value={panel.conquestColorDelayTicks}
        oninput={(event) => {
            const value = +(event.target as HTMLInputElement).value;
            GAME_CONFIG.CONQUEST_COLOR_DELAY_TICKS = value;
            updatePanel("conquestColorDelayTicks", value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Flash Duration</span>
        <span class="val">{panel.conquestFlashTicks} ticks</span>
    </div>
    <input
        type="range"
        min="0"
        max="10"
        step="0.5"
        value={panel.conquestFlashTicks}
        oninput={(event) => {
            const value = +(event.target as HTMLInputElement).value;
            GAME_CONFIG.CONQUEST_FLASH_TICKS = value;
            updatePanel("conquestFlashTicks", value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Lerp Delay</span>
        <span class="val">{panel.conquestLerpDelayMs}ms</span>
    </div>
    <input
        type="range"
        min="0"
        max="5000"
        step="10"
        value={panel.conquestLerpDelayMs}
        oninput={(event) => {
            const value = +(event.target as HTMLInputElement).value;
            GAME_CONFIG.CONQUEST_LERP_DELAY_MS = value;
            updatePanel("conquestLerpDelayMs", value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Travel Speed</span>
        <span class="val">{((panel.conquestTravelSpeed ?? 0) as number).toFixed(2)}x</span>
    </div>
    <input
        type="range"
        min="0.01"
        max="2"
        step="0.01"
        value={panel.conquestTravelSpeed}
        oninput={(event) => {
            const value = +(event.target as HTMLInputElement).value;
            GAME_CONFIG.CONQUEST_TRAVEL_SPEED = value;
            updatePanel("conquestTravelSpeed", value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Settle Duration</span>
        <span class="val">{panel.conquestSettleMs}ms</span>
    </div>
    <input
        type="range"
        min="0"
        max="5000"
        step="10"
        value={panel.conquestSettleMs}
        oninput={(event) => {
            const value = +(event.target as HTMLInputElement).value;
            GAME_CONFIG.CONQUEST_SETTLE_MS = value;
            updatePanel("conquestSettleMs", value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Surge Stagger</span>
        <span class="val">{panel.conquestSurgeStaggerMs}ms</span>
    </div>
    <input
        type="range"
        min="0"
        max="200"
        step="5"
        value={panel.conquestSurgeStaggerMs}
        oninput={(event) => {
            const value = +(event.target as HTMLInputElement).value;
            GAME_CONFIG.CONQUEST_SURGE_STAGGER_MS = value;
            updatePanel("conquestSurgeStaggerMs", value);
        }}
    />
</div>

<h4 class="sub-heading">Force Glow</h4>
<label class="toggle-row">
    <input
        type="checkbox"
        checked={panel.conquestForceGlow ?? GAME_CONFIG.CONQUEST_FORCE_GLOW ?? true}
        onchange={(event) => {
            const value = (event.target as HTMLInputElement).checked;
            GAME_CONFIG.CONQUEST_FORCE_GLOW = value;
            updatePanel("conquestForceGlow", value);
        }}
    />
    <span class="var-name">Scale Glow With Force</span>
    <span class="val">attacker size aware</span>
</label>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Glow Multiplier</span>
        <span class="val">{((panel.conquestForceGlowMult ?? 0) as number).toFixed(2)}</span>
    </div>
    <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={panel.conquestForceGlowMult ?? GAME_CONFIG.CONQUEST_FORCE_GLOW_MULT ?? 0.15}
        oninput={(event) => {
            const value = +(event.target as HTMLInputElement).value;
            GAME_CONFIG.CONQUEST_FORCE_GLOW_MULT = value;
            updatePanel("conquestForceGlowMult", value);
        }}
    />
</div>

{#if panel.conquestAnimMode === "arrowhead"}
    <h4 class="sub-heading">Arrowhead Formation</h4>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Taper</span>
            <span class="val">{((panel.arrowTaper ?? 0) as number).toFixed(2)}</span>
        </div>
        <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={panel.arrowTaper}
            oninput={(event) => {
                const value = +(event.target as HTMLInputElement).value;
                GAME_CONFIG.ARROW_TAPER = value;
                updatePanel("arrowTaper", value);
            }}
        />
    </div>

    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Formation Width</span>
            <span class="val">{panel.arrowWidth === 0 ? "auto" : `${panel.arrowWidth}px`}</span>
        </div>
        <input
            type="range"
            min="0"
            max="200"
            step="5"
            value={panel.arrowWidth}
            oninput={(event) => {
                const value = +(event.target as HTMLInputElement).value;
                GAME_CONFIG.ARROW_WIDTH = value;
                updatePanel("arrowWidth", value);
            }}
        />
    </div>

    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Arrowhead Speed</span>
            <span class="val">{((panel.arrowSpeed ?? 0) as number).toFixed(2)}x</span>
        </div>
        <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={panel.arrowSpeed}
            oninput={(event) => {
                const value = +(event.target as HTMLInputElement).value;
                GAME_CONFIG.ARROW_SPEED = value;
                updatePanel("arrowSpeed", value);
            }}
        />
    </div>

    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Arrowhead Easing</span>
            <span class="val">{panel.arrowEasing}</span>
        </div>
        <select
            class="mode-select"
            value={panel.arrowEasing}
            onchange={(event) => {
                const value = (event.target as HTMLSelectElement).value as
                    | "easeIn"
                    | "easeInOut"
                    | "linear";
                GAME_CONFIG.ARROW_EASING = value;
                updatePanel("arrowEasing", value);
            }}
        >
            <option value="easeIn">Ease In</option>
            <option value="easeInOut">Ease In / Out</option>
            <option value="linear">Linear</option>
        </select>
    </div>

    <label class="toggle-row">
        <input
            type="checkbox"
            checked={panel.arrowStaggerAuto}
            onchange={(event) => {
                const value = (event.target as HTMLInputElement).checked;
                GAME_CONFIG.ARROW_STAGGER_AUTO = value;
                updatePanel("arrowStaggerAuto", value);
            }}
        />
        <span class="var-name">Auto Stagger</span>
        <span class="val">tick-bound</span>
    </label>

    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Arrowhead Stagger</span>
            <span class="val">{panel.arrowStaggerAuto ? "auto" : `${panel.arrowStaggerMs}ms`}</span>
        </div>
        <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={panel.arrowStaggerMs}
            oninput={(event) => {
                const value = +(event.target as HTMLInputElement).value;
                GAME_CONFIG.ARROW_STAGGER_MS = value;
                updatePanel("arrowStaggerMs", value);
            }}
        />
    </div>

    <h4 class="sub-heading">Arrival Pattern</h4>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Engulf Mode</span>
            <span class="val">{panel.arrowEngulfMode}</span>
        </div>
        <select
            class="mode-select"
            value={panel.arrowEngulfMode}
            onchange={(event) => {
                const value = (event.target as HTMLSelectElement).value as
                    | "fan"
                    | "collapse"
                    | "ring"
                    | "swarm";
                GAME_CONFIG.ARROW_ENGULF_MODE = value;
                updatePanel("arrowEngulfMode", value);
            }}
        >
            <option value="fan">Fan</option>
            <option value="collapse">Collapse</option>
            <option value="ring">Ring</option>
            <option value="swarm">Swarm</option>
        </select>
    </div>

    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Engulf Radius</span>
            <span class="val">{panel.arrowEngulfRadius}px</span>
        </div>
        <input
            type="range"
            min="10"
            max="200"
            step="5"
            value={panel.arrowEngulfRadius}
            oninput={(event) => {
                const value = +(event.target as HTMLInputElement).value;
                GAME_CONFIG.ARROW_ENGULF_RADIUS = value;
                updatePanel("arrowEngulfRadius", value);
            }}
        />
    </div>

    <div class="orb-pair">
        <div class="var-row compact">
            <div class="row-top">
                <span class="var-name">Min Degrees</span>
                <span class="val">{panel.arrowSpiralMinDeg}deg</span>
            </div>
            <input
                type="range"
                min="0"
                max="1080"
                step="30"
                value={panel.arrowSpiralMinDeg}
                oninput={(event) => {
                    const value = +(event.target as HTMLInputElement).value;
                    GAME_CONFIG.ARROW_SPIRAL_MIN_DEG = value;
                    updatePanel("arrowSpiralMinDeg", value);
                }}
            />
        </div>
        <div class="var-row compact">
            <div class="row-top">
                <span class="var-name">Max Degrees</span>
                <span class="val">{panel.arrowSpiralMaxDeg}deg</span>
            </div>
            <input
                type="range"
                min="0"
                max="1080"
                step="30"
                value={panel.arrowSpiralMaxDeg}
                oninput={(event) => {
                    const value = +(event.target as HTMLInputElement).value;
                    GAME_CONFIG.ARROW_SPIRAL_MAX_DEG = value;
                    updatePanel("arrowSpiralMaxDeg", value);
                }}
            />
        </div>
    </div>

    <label class="toggle-row">
        <input
            type="checkbox"
            checked={panel.arrowSpiralRandom as boolean}
            onchange={(event) => {
                const value = (event.target as HTMLInputElement).checked;
                GAME_CONFIG.ARROW_SPIRAL_RANDOM = value;
                updatePanel("arrowSpiralRandom", value);
            }}
        />
        <span class="var-name">Random Spiral</span>
        <span class="val">per conquest</span>
    </label>

    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Spiral Duration</span>
            <span class="val">{panel.arrowSpiralDurationMs}ms</span>
        </div>
        <input
            type="range"
            min="0"
            max="3000"
            step="50"
            value={panel.arrowSpiralDurationMs}
            oninput={(event) => {
                const value = +(event.target as HTMLInputElement).value;
                GAME_CONFIG.ARROW_SPIRAL_DURATION_MS = value;
                updatePanel("arrowSpiralDurationMs", value);
            }}
        />
    </div>
{/if}

<h4 class="sub-heading">VS Transition</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Ghost Mode</span>
        <span class="val">{panel.vsTransitionMode ?? "no_loser"}</span>
    </div>
    <select
        class="mode-select"
        value={panel.vsTransitionMode ?? "no_loser"}
        onchange={(event) => {
            const value = (event.target as HTMLSelectElement).value;
            GAME_CONFIG.VS_TRANSITION_MODE = value as any;
            updatePanel("vsTransitionMode", value);
        }}
    >
        <option value="dual_ghost">Dual Ghost</option>
        <option value="no_loser">No Loser Ghost</option>
        <option value="no_ghosts">No Ghosts</option>
        <option value="matched_ease">Matched Ease</option>
        <option value="sequential">Sequential</option>
        <option value="linear">Linear</option>
    </select>
</div>

{#each VS_SLIDERS as slider}
    <div class="var-row" class:locked={animLockModes[slider.key] != null}>
        <div class="row-top">
            <span class="var-name" title={slider.desc ?? ""}>{slider.label}</span>
            <span class="val-group">
                <span class="val">{formatAnimValue(getAnimValue(slider.key), slider.unit ?? "")}</span>
                <button
                    class="lock-btn"
                    class:active={animLockModes[slider.key] === "pinned"}
                    title={animLockModes[slider.key] === "pinned"
                        ? "Pinned to tick duration - click to unpin"
                        : "Pin value = tick duration"}
                    onclick={() => pinValueToTickDuration(slider.key)}>P</button
                >
                <button
                    class="lock-btn"
                    class:active={animLockModes[slider.key] === "ratio"}
                    title={animLockModes[slider.key] === "ratio"
                        ? `Locked at ${(animLockRatios[slider.key] ?? 0).toFixed(3)}x tick - click to unlock`
                        : "Lock current ratio to tick"}
                    onclick={() => lockRatioToTick(slider.key)}>R</button
                >
                <button
                    class="lock-btn"
                    class:active={animLockModes[slider.key] === "animSpeed"}
                    title={animLockModes[slider.key] === "animSpeed"
                        ? `Locked at ${(animLockRatios[slider.key] ?? 0).toFixed(3)}x animation speed - click to unlock`
                        : "Lock current ratio to animation speed"}
                    onclick={() => lockRatioToAnimSpeed(slider.key)}>A</button
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
            oninput={(event) => {
                const value = parseFloat((event.target as HTMLInputElement).value);
                setAnimValue(slider.key, value);
            }}
        />
    </div>
{/each}

<style>
    @import "./panel-shared.css";
</style>
