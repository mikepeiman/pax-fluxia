<script lang="ts">
    import { PaxSettingsRangeRow } from "$lib/design-system";

    /**
     * SliderRow - reusable settings slider wrapper.
     * The Pax settings primitive owns range styling and mobile nudge controls.
     */
    interface Props {
        label: string;
        value: number;
        min: number;
        max: number;
        step: number;
        /** Display format: raw shows value; percent appends %; fixed2/fixed1 format decimals. */
        format?: "raw" | "percent" | "fixed2" | "fixed1" | "multiplier";
        suffix?: string;
        oninput: (value: number) => void;
    }

    let {
        label,
        value,
        min,
        max,
        step,
        format = "raw",
        suffix = "",
        oninput,
    }: Props = $props();
</script>

<PaxSettingsRangeRow
    {label}
    {value}
    {min}
    {max}
    {step}
    {format}
    {suffix}
    onInput={oninput}
/>
