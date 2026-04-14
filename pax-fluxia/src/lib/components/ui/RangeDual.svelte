<script lang="ts">
    let {
        min = $bindable(),
        max = $bindable(),
        minLimit = 1,
        maxLimit = 10,
        onChange,
    } = $props();

    function onMinChange(e: Event) {
        let newMin = parseInt((e.target as HTMLInputElement).value, 10);
        if (newMin > max) {
            newMin = max; // clamp
            (e.target as HTMLInputElement).value = newMin.toString();
        }
        min = newMin;
        onChange?.(min, max);
    }

    function onMaxChange(e: Event) {
        let newMax = parseInt((e.target as HTMLInputElement).value, 10);
        if (newMax < min) {
            newMax = min; // clamp
            (e.target as HTMLInputElement).value = newMax.toString();
        }
        max = newMax;
        onChange?.(min, max);
    }
</script>

<div class="dual-range">
    <input
        class="range-left"
        type="range"
        min={minLimit}
        max={maxLimit}
        value={min}
        oninput={onMinChange}
    />
    <input
        class="range-right"
        type="range"
        min={minLimit}
        max={maxLimit}
        value={max}
        oninput={onMaxChange}
    />
    <div class="track">
        <div
            class="track-fill"
            style:left="{((min - minLimit) / (maxLimit - minLimit)) * 100}%"
            style:width="{((max - min) / (maxLimit - minLimit)) * 100}%"
        ></div>
    </div>
</div>

<style>
    .dual-range {
        position: relative;
        width: 100%;
        height: 24px;
        display: flex;
        align-items: center;
    }

    .track {
        position: absolute;
        width: 100%;
        height: 4px;
        background: rgba(0, 255, 255, 0.1);
        border-radius: 2px;
        z-index: 1;
        pointer-events: none;
    }

    .track-fill {
        position: absolute;
        height: 100%;
        background: var(--color-accent-cyan, #00ffff);
        opacity: 0.6;
        border-radius: 2px;
    }

    input[type="range"] {
        position: absolute;
        width: 100%;
        height: 100%;
        margin: 0;
        appearance: none;
        -webkit-appearance: none;
        background: transparent;
        pointer-events: none; /* Let clicks pass through except on thumb */
        z-index: 2;
    }

    /* Thumb pointer events need to be enabled */
    input[type="range"]::-webkit-slider-thumb {
        appearance: none;
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--color-accent-cyan, #00ffff);
        cursor: pointer;
        pointer-events: auto;
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
        border: 2px solid var(--color-void-deep, #0a0a12);
    }

    input[type="range"]::-moz-range-thumb {
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--color-accent-cyan, #00ffff);
        cursor: pointer;
        pointer-events: auto;
        border: 2px solid var(--color-void-deep, #0a0a12);
    }
</style>
