<script lang="ts">
    /**
     * SliderRow — Reusable slider with mobile-friendly +/- nudge buttons.
     * Wraps the standard var-row pattern. Shows +/- only on mobile (<1024px).
     */
    interface Props {
        label: string;
        value: number;
        min: number;
        max: number;
        step: number;
        /** Display format: 'raw' shows value, 'percent' appends %, 'fixed2' shows 2 decimals, 'fixed1' shows 1 decimal */
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

    function displayValue(v: number): string {
        switch (format) {
            case "percent":
                return `${v}%`;
            case "fixed2":
                return v.toFixed(2);
            case "fixed1":
                return v.toFixed(1);
            case "multiplier":
                return `${v.toFixed(2)}x`;
            default:
                return `${v}${suffix}`;
        }
    }

    function nudge(direction: -1 | 1) {
        const newVal = Math.min(max, Math.max(min, value + step * direction));
        oninput(newVal);
    }
</script>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">{label}</span>
        <span class="val">{displayValue(value)}</span>
    </div>
    <div class="slider-with-nudge">
        <button
            class="nudge-btn"
            onclick={() => nudge(-1)}
            aria-label="Decrease">−</button
        >
        <input
            type="range"
            {min}
            {max}
            {step}
            {value}
            oninput={(e) =>
                oninput(parseFloat((e.target as HTMLInputElement).value))}
        />
        <button class="nudge-btn" onclick={() => nudge(1)} aria-label="Increase"
            >+</button
        >
    </div>
</div>

<style>
    .slider-with-nudge {
        display: flex;
        align-items: center;
        gap: 0;
        width: 100%;
    }
    .slider-with-nudge input[type="range"] {
        flex: 1;
        min-width: 0;
    }
    .nudge-btn {
        display: none; /* hidden on desktop */
    }
    @media (max-width: 1024px) {
        .nudge-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            flex-shrink: 0;
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.06);
            color: rgba(255, 255, 255, 0.8);
            font-size: 1.1rem;
            font-weight: 700;
            cursor: pointer;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
            transition:
                background 0.15s,
                border-color 0.15s;
        }
        .nudge-btn:active {
            background: rgba(0, 255, 255, 0.15);
            border-color: rgba(0, 255, 255, 0.4);
        }
    }
</style>
