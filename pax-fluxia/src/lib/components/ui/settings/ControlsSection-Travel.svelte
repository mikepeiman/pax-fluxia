<script lang="ts">
  import "./panel-shared.css";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import {
        PaxSettingsRangeRow,
        PaxSettingsSegmentedRow,
        PaxSettingsToggleRow,
    } from "$lib/design-system";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        syncFromConfig?: () => void;
    }

    let { panel, updatePanel, syncFromConfig }: Props = $props();

    const TRAVEL_MODE_OPTIONS = [
        { value: "bezier", label: "Bezier Arc" },
        { value: "lane", label: "Lane Spine" },
    ];

    const TRAVEL_EASING_OPTIONS = [
        { value: "linear", label: "Linear" },
        { value: "easeIn", label: "In" },
        { value: "easeOut", label: "Out" },
        { value: "easeInOut", label: "In-out" },
    ];

    const DEPART_MODE_OPTIONS = [
        { value: "nearside", label: "Nearside" },
        { value: "lifo", label: "LIFO" },
        { value: "fifo", label: "FIFO" },
    ];
</script>

<CategoryThemeBar category="travel" onApply={() => syncFromConfig?.()} />

<h4 class="sub-heading">Travel Model</h4>
<PaxSettingsSegmentedRow
    label="Travel Mode"
    hint="Ship travel path: Bezier Arc (curved) or Lane Spine (follows lane geometry)."
    value={panel.travelMode}
    options={TRAVEL_MODE_OPTIONS}
    settingConfigKey="TRAVEL_MODE"
    onValueChange={(value) => {
        GAME_CONFIG.TRAVEL_MODE = value as any;
        updatePanel("travelMode", value);
    }}
/>

<PaxSettingsSegmentedRow
    label="Travel Easing"
    hint="Easing curve applied to ship travel: Linear, ease In, ease Out, or In-out."
    value={panel.travelEasing}
    options={TRAVEL_EASING_OPTIONS}
    settingConfigKey="TRAVEL_EASING"
    onValueChange={(value) => {
        GAME_CONFIG.TRAVEL_EASING = value as any;
        updatePanel("travelEasing", value);
    }}
/>

<PaxSettingsRangeRow
    label="Easing Power"
    value={panel.travelEasingPower}
    min={0.5}
    max={5}
    step={0.1}
    format="fixed1"
    settingConfigKey="TRAVEL_EASING_POWER"
    onInput={(value) => {
        GAME_CONFIG.TRAVEL_EASING_POWER = value;
        updatePanel("travelEasingPower", value);
    }}
/>

<PaxSettingsRangeRow
    label="Travel Duration"
    value={panel.travelDurationMult}
    min={0.1}
    max={10}
    step={0.1}
    output={`${((panel.travelDurationMult ?? 0) as number).toFixed(2)}x tick`}
    settingConfigKey="TRAVEL_DURATION_MULT"
    onInput={(value) => {
        GAME_CONFIG.TRAVEL_DURATION_MULT = value;
        updatePanel("travelDurationMult", value);
    }}
/>

<PaxSettingsRangeRow
    label="Arc Intensity"
    value={panel.travelArcIntensity}
    min={0}
    max={2}
    step={0.05}
    format="fixed2"
    settingConfigKey="TRAVEL_ARC_INTENSITY"
    onInput={(value) => {
        GAME_CONFIG.TRAVEL_ARC_INTENSITY = value;
        updatePanel("travelArcIntensity", value);
    }}
/>

<PaxSettingsToggleRow
    label="Ships follow lane paths"
    checked={panel.travelFollowLanePaths ??
        GAME_CONFIG.TRAVEL_FOLLOW_LANE_PATHS ??
        false}
    description="Route ships along curved lane geometry when available."
    meta="Curve-aware"
    settingConfigKey="TRAVEL_FOLLOW_LANE_PATHS"
    onChange={(value) => {
        GAME_CONFIG.TRAVEL_FOLLOW_LANE_PATHS = value;
        updatePanel("travelFollowLanePaths", value);
    }}
/>

<h4 class="sub-heading">Departure</h4>
<PaxSettingsSegmentedRow
    label="Depart Mode"
    hint="Departure order: Nearside, LIFO (newest ships leave first), or FIFO (oldest first)."
    value={panel.departMode}
    options={DEPART_MODE_OPTIONS}
    settingConfigKey="DEPART_MODE"
    onValueChange={(value) => {
        GAME_CONFIG.DEPART_MODE = value as "lifo" | "fifo" | "nearside";
        updatePanel("departMode", value);
    }}
/>

<PaxSettingsRangeRow
    label="Depart Fraction"
    value={panel.departFraction ?? GAME_CONFIG.DEPART_FRACTION ?? 0.55}
    min={0}
    max={1}
    step={0.05}
    output={`${Math.round(((panel.departFraction ?? GAME_CONFIG.DEPART_FRACTION ?? 0.55) as number) * 100)}%`}
    settingConfigKey="DEPART_FRACTION"
    onInput={(value) => {
        GAME_CONFIG.DEPART_FRACTION = value;
        updatePanel("departFraction", value);
    }}
/>

<PaxSettingsToggleRow
    label="Stream Departure"
    checked={panel.departStagger}
    description="Space departing ships evenly instead of moving as a single pulse."
    meta="Even"
    settingConfigKey="DEPART_STAGGER"
    onChange={(value) => {
        GAME_CONFIG.DEPART_STAGGER = value;
        updatePanel("departStagger", value);
    }}
/>

<PaxSettingsRangeRow
    label="Depart Arc"
    value={panel.departArcIntensity ?? GAME_CONFIG.DEPART_ARC_INTENSITY ?? 0.1}
    min={0}
    max={1.5}
    step={0.05}
    format="fixed2"
    settingConfigKey="DEPART_ARC_INTENSITY"
    onInput={(value) => {
        GAME_CONFIG.DEPART_ARC_INTENSITY = value;
        updatePanel("departArcIntensity", value);
    }}
/>

<PaxSettingsRangeRow
    label="Depart Jitter"
    value={panel.departJitterMs}
    min={0}
    max={500}
    step={5}
    suffix="ms"
    settingConfigKey="DEPART_JITTER_MS"
    onInput={(value) => {
        GAME_CONFIG.DEPART_JITTER_MS = value;
        updatePanel("departJitterMs", value);
    }}
/>

<h4 class="sub-heading">Arrival &amp; Settle</h4>
<PaxSettingsRangeRow
    label="Settle Duration"
    value={panel.settleDurationMs}
    min={0}
    max={5000}
    step={10}
    suffix="ms"
    settingConfigKey="SETTLE_DURATION_MS"
    onInput={(value) => {
        GAME_CONFIG.SETTLE_DURATION_MS = value;
        updatePanel("settleDurationMs", value);
    }}
/>

<PaxSettingsRangeRow
    label="Arrival Spread"
    value={panel.arrivalSpread}
    min={0}
    max={2}
    step={0.05}
    output={`${((panel.arrivalSpread ?? 0) as number).toFixed(2)}x tick`}
    settingConfigKey="ARRIVAL_SPREAD"
    onInput={(value) => {
        GAME_CONFIG.ARRIVAL_SPREAD = value;
        updatePanel("arrivalSpread", value);
    }}
/>

<PaxSettingsRangeRow
    label="Arrival Arc"
    value={panel.arrivalArcIntensity ?? GAME_CONFIG.ARRIVAL_ARC_INTENSITY ?? 0.1}
    min={0}
    max={1.5}
    step={0.05}
    format="fixed2"
    settingConfigKey="ARRIVAL_ARC_INTENSITY"
    onInput={(value) => {
        GAME_CONFIG.ARRIVAL_ARC_INTENSITY = value;
        updatePanel("arrivalArcIntensity", value);
    }}
/>

<PaxSettingsRangeRow
    label="Wobble Amplitude"
    value={panel.wobbleAmp}
    min={0}
    max={40}
    step={1}
    suffix="px"
    settingConfigKey="WOBBLE_AMP"
    onInput={(value) => {
        GAME_CONFIG.WOBBLE_AMP = value;
        updatePanel("wobbleAmp", value);
    }}
/>

<h4 class="sub-heading">Lane Pathing</h4>
<PaxSettingsRangeRow
    label="Lane Offset"
    value={panel.laneOffsetPx ?? 8}
    min={0}
    max={30}
    step={1}
    suffix="px"
    settingConfigKey="LANE_OFFSET_PX"
    onInput={(value) => {
        GAME_CONFIG.LANE_OFFSET_PX = value;
        updatePanel("laneOffsetPx", value);
    }}
/>

<PaxSettingsRangeRow
    label="Lane Convergence"
    value={panel.laneConvergence ?? 1}
    min={0}
    max={1}
    step={0.05}
    output={`${Math.round(((panel.laneConvergence ?? 1) as number) * 100)}%`}
    settingConfigKey="LANE_CONVERGENCE"
    onInput={(value) => {
        GAME_CONFIG.LANE_CONVERGENCE = value;
        updatePanel("laneConvergence", value);
    }}
/>

<PaxSettingsRangeRow
    label="Convergence Point"
    value={panel.laneConvergencePoint ?? 0}
    min={0}
    max={100}
    step={5}
    format="percent"
    settingConfigKey="LANE_CONVERGENCE_POINT"
    onInput={(value) => {
        GAME_CONFIG.LANE_CONVERGENCE_POINT = value;
        updatePanel("laneConvergencePoint", value);
    }}
/>

<h4 class="sub-heading">Orbit Bias</h4>
<PaxSettingsRangeRow
    label="Orbit Density"
    value={panel.orbitDensity}
    min={1}
    max={4}
    step={0.1}
    format="multiplier"
    settingConfigKey="ORBIT_DENSITY"
    onInput={(value) => {
        GAME_CONFIG.ORBIT_DENSITY = value;
        updatePanel("orbitDensity", value);
    }}
/>

<PaxSettingsRangeRow
    label="Bias Strength"
    value={panel.orbitBiasStrength ?? GAME_CONFIG.ORBIT_BIAS_STRENGTH ?? 0}
    min={0}
    max={1}
    step={0.05}
    format="fixed2"
    settingConfigKey="ORBIT_BIAS_STRENGTH"
    onInput={(value) => {
        GAME_CONFIG.ORBIT_BIAS_STRENGTH = value;
        updatePanel("orbitBiasStrength", value);
    }}
/>

<PaxSettingsToggleRow
    label="Oscillate Bias"
    checked={panel.oscillate ?? GAME_CONFIG.ORBIT_BIAS_OSCILLATE ?? false}
    description="Sweep bias between minimum and maximum values."
    meta="Sweep"
    settingConfigKey="ORBIT_BIAS_OSCILLATE"
    onChange={(value) => {
        GAME_CONFIG.ORBIT_BIAS_OSCILLATE = value;
        updatePanel("oscillate", value);
    }}
/>

{#if panel.oscillate ?? GAME_CONFIG.ORBIT_BIAS_OSCILLATE ?? false}
    <div class="orb-pair">
        <PaxSettingsRangeRow
            label="Bias Min"
            value={panel.oscMin ?? GAME_CONFIG.ORBIT_BIAS_MIN ?? 0}
            min={0}
            max={1}
            step={0.05}
            format="fixed2"
            settingConfigKey="ORBIT_BIAS_MIN"
            onInput={(value) => {
                GAME_CONFIG.ORBIT_BIAS_MIN = value;
                updatePanel("oscMin", value);
            }}
        />
        <PaxSettingsRangeRow
            label="Bias Max"
            value={panel.oscMax ?? GAME_CONFIG.ORBIT_BIAS_MAX ?? 0.95}
            min={0}
            max={1}
            step={0.05}
            format="fixed2"
            settingConfigKey="ORBIT_BIAS_MAX"
            onInput={(value) => {
                GAME_CONFIG.ORBIT_BIAS_MAX = value;
                updatePanel("oscMax", value);
            }}
        />
    </div>

    <PaxSettingsRangeRow
        label="Oscillation Frequency"
        value={panel.oscFreq ?? GAME_CONFIG.ORBIT_BIAS_FREQ ?? 0.25}
        min={0}
        max={4}
        step={0.05}
        output={`${((panel.oscFreq ?? GAME_CONFIG.ORBIT_BIAS_FREQ ?? 0.25) as number).toFixed(2)}x tick`}
        settingConfigKey="ORBIT_BIAS_FREQ"
        onInput={(value) => {
            GAME_CONFIG.ORBIT_BIAS_FREQ = value;
            updatePanel("oscFreq", value);
        }}
    />
{/if}
