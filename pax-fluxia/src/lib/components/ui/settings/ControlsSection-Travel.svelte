<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        syncFromConfig?: () => void;
    }

    let { panel, updatePanel, syncFromConfig }: Props = $props();
</script>

<CategoryThemeBar category="travel" onApply={() => syncFromConfig?.()} />

<h4 class="sub-heading">Travel Model</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Travel Mode</span>
        <span class="val">{panel.travelMode}</span>
    </div>
    <select
        class="mode-select"
        value={panel.travelMode}
        onchange={(event) => {
            const value = (event.target as HTMLSelectElement).value;
            GAME_CONFIG.TRAVEL_MODE = value as any;
            updatePanel("travelMode", value);
        }}
    >
        <option value="bezier">Bezier Arc</option>
        <option value="lane">Lane Spine</option>
    </select>
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Travel Easing</span>
        <span class="val">{panel.travelEasing}</span>
    </div>
    <select
        class="mode-select"
        value={panel.travelEasing}
        onchange={(event) => {
            const value = (event.target as HTMLSelectElement).value;
            GAME_CONFIG.TRAVEL_EASING = value as any;
            updatePanel("travelEasing", value);
        }}
    >
        <option value="linear">Linear</option>
        <option value="easeIn">Ease In</option>
        <option value="easeOut">Ease Out</option>
        <option value="easeInOut">Ease In-Out</option>
    </select>
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Easing Power</span>
        <span class="val">{((panel.travelEasingPower ?? 0) as number).toFixed(1)}</span>
    </div>
    <input
        type="range"
        min="0.5"
        max="5"
        step="0.1"
        value={panel.travelEasingPower}
        oninput={(event) => {
            const value = +(event.target as HTMLInputElement).value;
            GAME_CONFIG.TRAVEL_EASING_POWER = value;
            updatePanel("travelEasingPower", value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Travel Duration</span>
        <span class="val">{((panel.travelDurationMult ?? 0) as number).toFixed(2)}x tick</span>
    </div>
    <input
        type="range"
        min="0.1"
        max="10"
        step="0.1"
        value={panel.travelDurationMult}
        oninput={(event) => {
            const value = +(event.target as HTMLInputElement).value;
            GAME_CONFIG.TRAVEL_DURATION_MULT = value;
            updatePanel("travelDurationMult", value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Arc Intensity</span>
        <span class="val">{((panel.travelArcIntensity ?? 0) as number).toFixed(2)}</span>
    </div>
    <input
        type="range"
        min="0"
        max="2"
        step="0.05"
        value={panel.travelArcIntensity}
        oninput={(event) => {
            const value = +(event.target as HTMLInputElement).value;
            GAME_CONFIG.TRAVEL_ARC_INTENSITY = value;
            updatePanel("travelArcIntensity", value);
        }}
    />
</div>

<label class="toggle-row">
    <input
        type="checkbox"
        checked={panel.travelFollowLanePaths ?? GAME_CONFIG.TRAVEL_FOLLOW_LANE_PATHS ?? false}
        onchange={(event) => {
            const value = (event.target as HTMLInputElement).checked;
            GAME_CONFIG.TRAVEL_FOLLOW_LANE_PATHS = value;
            updatePanel("travelFollowLanePaths", value);
        }}
    />
    <span class="var-name">Ships follow lane paths</span>
    <span class="val">curve-aware</span>
</label>

<h4 class="sub-heading">Departure</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Depart Mode</span>
        <span class="val">{panel.departMode}</span>
    </div>
    <select
        class="mode-select"
        value={panel.departMode}
        onchange={(event) => {
            const value = (event.target as HTMLSelectElement).value;
            GAME_CONFIG.DEPART_MODE = value as "lifo" | "fifo" | "nearside";
            updatePanel("departMode", value);
        }}
    >
        <option value="nearside">Nearside</option>
        <option value="lifo">LIFO (newest)</option>
        <option value="fifo">FIFO (oldest)</option>
    </select>
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Depart Fraction</span>
        <span class="val">{Math.round(((panel.departFraction ?? 0.5) as number) * 100)}%</span>
    </div>
    <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={panel.departFraction ?? GAME_CONFIG.DEPART_FRACTION ?? 0.55}
        oninput={(event) => {
            const value = +(event.target as HTMLInputElement).value;
            GAME_CONFIG.DEPART_FRACTION = value;
            updatePanel("departFraction", value);
        }}
    />
</div>

<label class="toggle-row">
    <input
        type="checkbox"
        checked={panel.departStagger}
        onchange={(event) => {
            const value = (event.target as HTMLInputElement).checked;
            GAME_CONFIG.DEPART_STAGGER = value;
            updatePanel("departStagger", value);
        }}
    />
    <span class="var-name">Stream Departure</span>
    <span class="val">even spacing</span>
</label>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Depart Arc</span>
        <span class="val">{((panel.departArcIntensity ?? 0) as number).toFixed(2)}</span>
    </div>
    <input
        type="range"
        min="0"
        max="1.5"
        step="0.05"
        value={panel.departArcIntensity ?? GAME_CONFIG.DEPART_ARC_INTENSITY ?? 0.1}
        oninput={(event) => {
            const value = +(event.target as HTMLInputElement).value;
            GAME_CONFIG.DEPART_ARC_INTENSITY = value;
            updatePanel("departArcIntensity", value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Depart Jitter</span>
        <span class="val">{panel.departJitterMs}ms</span>
    </div>
    <input
        type="range"
        min="0"
        max="500"
        step="5"
        value={panel.departJitterMs}
        oninput={(event) => {
            const value = +(event.target as HTMLInputElement).value;
            GAME_CONFIG.DEPART_JITTER_MS = value;
            updatePanel("departJitterMs", value);
        }}
    />
</div>

<h4 class="sub-heading">Arrival & Settle</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Settle Duration</span>
        <span class="val">{panel.settleDurationMs}ms</span>
    </div>
    <input
        type="range"
        min="0"
        max="5000"
        step="10"
        value={panel.settleDurationMs}
        oninput={(event) => {
            const value = +(event.target as HTMLInputElement).value;
            GAME_CONFIG.SETTLE_DURATION_MS = value;
            updatePanel("settleDurationMs", value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Arrival Spread</span>
        <span class="val">{((panel.arrivalSpread ?? 0) as number).toFixed(2)}x tick</span>
    </div>
    <input
        type="range"
        min="0"
        max="2"
        step="0.05"
        value={panel.arrivalSpread}
        oninput={(event) => {
            const value = +(event.target as HTMLInputElement).value;
            GAME_CONFIG.ARRIVAL_SPREAD = value;
            updatePanel("arrivalSpread", value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Arrival Arc</span>
        <span class="val">{((panel.arrivalArcIntensity ?? 0) as number).toFixed(2)}</span>
    </div>
    <input
        type="range"
        min="0"
        max="1.5"
        step="0.05"
        value={panel.arrivalArcIntensity ?? GAME_CONFIG.ARRIVAL_ARC_INTENSITY ?? 0.1}
        oninput={(event) => {
            const value = +(event.target as HTMLInputElement).value;
            GAME_CONFIG.ARRIVAL_ARC_INTENSITY = value;
            updatePanel("arrivalArcIntensity", value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Wobble Amplitude</span>
        <span class="val">{panel.wobbleAmp}px</span>
    </div>
    <input
        type="range"
        min="0"
        max="40"
        step="1"
        value={panel.wobbleAmp}
        oninput={(event) => {
            const value = +(event.target as HTMLInputElement).value;
            GAME_CONFIG.WOBBLE_AMP = value;
            updatePanel("wobbleAmp", value);
        }}
    />
</div>

<h4 class="sub-heading">Lane Pathing</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Lane Offset</span>
        <span class="val">{panel.laneOffsetPx ?? 8}px</span>
    </div>
    <input
        type="range"
        min="0"
        max="30"
        step="1"
        value={panel.laneOffsetPx ?? 8}
        oninput={(event) => {
            const value = +(event.target as HTMLInputElement).value;
            GAME_CONFIG.LANE_OFFSET_PX = value;
            updatePanel("laneOffsetPx", value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Lane Convergence</span>
        <span class="val">{Math.round(((panel.laneConvergence ?? 1) as number) * 100)}%</span>
    </div>
    <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={panel.laneConvergence ?? 1}
        oninput={(event) => {
            const value = +(event.target as HTMLInputElement).value;
            GAME_CONFIG.LANE_CONVERGENCE = value;
            updatePanel("laneConvergence", value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Convergence Point</span>
        <span class="val">{panel.laneConvergencePoint ?? 0}%</span>
    </div>
    <input
        type="range"
        min="0"
        max="100"
        step="5"
        value={panel.laneConvergencePoint ?? 0}
        oninput={(event) => {
            const value = +(event.target as HTMLInputElement).value;
            GAME_CONFIG.LANE_CONVERGENCE_POINT = value;
            updatePanel("laneConvergencePoint", value);
        }}
    />
</div>

<h4 class="sub-heading">Orbit Bias</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Orbit Density</span>
        <span class="val">{((panel.orbitDensity ?? 0) as number).toFixed(1)}x</span>
    </div>
    <input
        type="range"
        min="1"
        max="4"
        step="0.1"
        value={panel.orbitDensity}
        oninput={(event) => {
            const value = +(event.target as HTMLInputElement).value;
            GAME_CONFIG.ORBIT_DENSITY = value;
            updatePanel("orbitDensity", value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Bias Strength</span>
        <span class="val">{((panel.orbitBiasStrength ?? 0) as number).toFixed(2)}</span>
    </div>
    <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={panel.orbitBiasStrength ?? GAME_CONFIG.ORBIT_BIAS_STRENGTH ?? 0}
        oninput={(event) => {
            const value = +(event.target as HTMLInputElement).value;
            GAME_CONFIG.ORBIT_BIAS_STRENGTH = value;
            updatePanel("orbitBiasStrength", value);
        }}
    />
</div>

<label class="toggle-row">
    <input
        type="checkbox"
        checked={panel.oscillate ?? GAME_CONFIG.ORBIT_BIAS_OSCILLATE ?? false}
        onchange={(event) => {
            const value = (event.target as HTMLInputElement).checked;
            GAME_CONFIG.ORBIT_BIAS_OSCILLATE = value;
            updatePanel("oscillate", value);
        }}
    />
    <span class="var-name">Oscillate Bias</span>
    <span class="val">min to max sweep</span>
</label>

{#if panel.oscillate ?? GAME_CONFIG.ORBIT_BIAS_OSCILLATE ?? false}
    <div class="orb-pair">
        <div class="var-row compact">
            <div class="row-top">
                <span class="var-name">Bias Min</span>
                <span class="val">{((panel.oscMin ?? 0) as number).toFixed(2)}</span>
            </div>
            <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={panel.oscMin ?? GAME_CONFIG.ORBIT_BIAS_MIN ?? 0}
                oninput={(event) => {
                    const value = +(event.target as HTMLInputElement).value;
                    GAME_CONFIG.ORBIT_BIAS_MIN = value;
                    updatePanel("oscMin", value);
                }}
            />
        </div>
        <div class="var-row compact">
            <div class="row-top">
                <span class="var-name">Bias Max</span>
                <span class="val">{((panel.oscMax ?? 0) as number).toFixed(2)}</span>
            </div>
            <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={panel.oscMax ?? GAME_CONFIG.ORBIT_BIAS_MAX ?? 0.95}
                oninput={(event) => {
                    const value = +(event.target as HTMLInputElement).value;
                    GAME_CONFIG.ORBIT_BIAS_MAX = value;
                    updatePanel("oscMax", value);
                }}
            />
        </div>
    </div>

    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Oscillation Frequency</span>
            <span class="val">{((panel.oscFreq ?? 0) as number).toFixed(2)}x tick</span>
        </div>
        <input
            type="range"
            min="0"
            max="4"
            step="0.05"
            value={panel.oscFreq ?? GAME_CONFIG.ORBIT_BIAS_FREQ ?? 0.25}
            oninput={(event) => {
                const value = +(event.target as HTMLInputElement).value;
                GAME_CONFIG.ORBIT_BIAS_FREQ = value;
                updatePanel("oscFreq", value);
            }}
        />
    </div>
{/if}

<style>
    @import "./panel-shared.css";
</style>
