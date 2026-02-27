<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";

    // ControlsSection-TRAVEL â€” In-Game Settings Controls: Path & Easing
    // Extracted from GameSettingsPanel.svelte

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        syncFromConfig?: () => void;
    }
    let { panel, updatePanel, syncFromConfig }: Props = $props();
    import CategoryThemeBar from "./CategoryThemeBar.svelte";
</script>

<CategoryThemeBar category="travel" onApply={() => syncFromConfig?.()} />

<h4 class="sub-heading">Mode & Easing</h4>
<!-- Travel Animation Mode -->
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Travel Mode</span><span class="val"
            >{panel.travelMode}</span
        >
    </div>
    <select
        value={panel.travelMode}
        onchange={(e) => {
            const v = (e.target as HTMLSelectElement).value;
            GAME_CONFIG.TRAVEL_MODE = v as any;
            updatePanel("travelMode", v);
        }}
        style="width:100%;background:#1a1e2a;color:#fff;border:1px solid #333;padding:4px;border-radius:4px;font-size:0.7rem;"
    >
        <option value="bezier">Bezier Arc</option>
        <option value="lane">Lane (Classic)</option>
    </select>
</div>
<!-- Travel Easing Controls -->
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Travel Easing</span><span class="val"
            >{panel.travelEasing}</span
        >
    </div>
    <select
        value={panel.travelEasing}
        onchange={(e) => {
            const v = (e.target as HTMLSelectElement).value;
            GAME_CONFIG.TRAVEL_EASING = v as any;
            updatePanel("travelEasing", v);
        }}
        style="width:100%;background:#1a1e2a;color:#fff;border:1px solid #333;padding:4px;border-radius:4px;font-size:0.7rem;"
    >
        <option value="linear">Linear</option>
        <option value="easeIn">Ease In</option>
        <option value="easeOut">Ease Out</option>
        <option value="easeInOut">Ease In-Out</option>
    </select>
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Easing Power</span><span class="val"
            >{((panel.travelEasingPower ?? 0) as number).toFixed(1)}</span
        >
    </div>
    <input
        type="range"
        min="0.5"
        max="5"
        step="0.1"
        value={panel.travelEasingPower}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.TRAVEL_EASING_POWER = v;
            updatePanel("travelEasingPower", v);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Travel Duration</span><span class="val"
            >{((panel.travelDurationMult ?? 0) as number).toFixed(1)}×</span
        >
    </div>
    <input
        type="range"
        min="0.2"
        max="3"
        step="0.1"
        value={panel.travelDurationMult}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.TRAVEL_DURATION_MULT = v;
            updatePanel("travelDurationMult", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Arc Intensity</span><span class="val"
            >{((panel.travelArcIntensity ?? 0) as number).toFixed(2)}</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="2"
        step="0.05"
        value={panel.travelArcIntensity}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.TRAVEL_ARC_INTENSITY = v;
            updatePanel("travelArcIntensity", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <label class="toggle-label"
            ><span class="var-name">Depart Mode</span>
            <select
                value={panel.departMode}
                onchange={(e) => {
                    const val = (e.target as HTMLSelectElement).value;
                    GAME_CONFIG.DEPART_MODE = val as
                        | "lifo"
                        | "fifo"
                        | "nearside";
                    updatePanel("departMode", val as any);
                }}
                style="margin-left:8px; background:#222; color:#fff; border:1px solid #555; padding:2px 4px; font-size:0.75rem;"
            >
                <option value="nearside">Nearside</option>
                <option value="lifo">LIFO (newest)</option>
                <option value="fifo">FIFO (oldest)</option>
            </select>
        </label>
    </div>
</div>
<label class="toggle-row" style="margin-top:2px;">
    <input
        type="checkbox"
        checked={panel.departStagger}
        onchange={(e) => {
            const v = (e.target as HTMLInputElement).checked;
            GAME_CONFIG.DEPART_STAGGER = v;
            updatePanel("departStagger", v);
        }}
    />
    <span class="log-label" style="font-size:9px;"
        >Stream Departure (even spacing)</span
    >
</label>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Settle Time</span><span class="val"
            >{panel.settleDuration}ms</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="2000"
        step="10"
        value={panel.settleDuration}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.SETTLE_DURATION_MS = v;
            updatePanel("settleDuration", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Arrival Spread</span><span class="val"
            >{((panel.arrivalSpread ?? 0) as number).toFixed(1)}×</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="2"
        step="0.1"
        value={panel.arrivalSpread}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.ARRIVAL_SPREAD = v;
            updatePanel("arrivalSpread", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Wobble Amp</span><span class="val"
            >{panel.wobbleAmp}px</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="40"
        step="1"
        value={panel.wobbleAmp}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.WOBBLE_AMP = v;
            updatePanel("wobbleAmp", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Depart Jitter</span><span class="val"
            >{panel.departJitter}ms</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="200"
        step="5"
        value={panel.departJitter}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.DEPART_JITTER_MS = v;
            updatePanel("departJitter", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Lane Offset</span><span class="val"
            >{panel.laneOffsetPx ?? 8}px</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="30"
        step="1"
        value={panel.laneOffsetPx ?? 8}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.LANE_OFFSET_PX = v;
            updatePanel("laneOffsetPx", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Lane Convergence</span><span class="val"
            >{Math.round(((panel.laneConvergence ?? 1) as number) * 100)}%</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={panel.laneConvergence ?? 1}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.LANE_CONVERGENCE = v;
            updatePanel("laneConvergence", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Convergence Point</span><span class="val"
            >{panel.laneConvergencePoint ?? 0}%</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="100"
        step="5"
        value={panel.laneConvergencePoint ?? 0}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.LANE_CONVERGENCE_POINT = v;
            updatePanel("laneConvergencePoint", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Orbit Density</span><span class="val"
            >{((panel.orbitDensity ?? 0) as number).toFixed(1)}×</span
        >
    </div>
    <input
        type="range"
        min="1.0"
        max="4.0"
        step="0.1"
        value={panel.orbitDensity}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.ORBIT_DENSITY = v;
            updatePanel("orbitDensity", v);
        }}
    />
</div>

<style>
    @import "./panel-shared.css";
</style>
