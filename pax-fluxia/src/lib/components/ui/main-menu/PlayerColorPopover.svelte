<script lang="ts">
    interface Props {
        playerLabel: string;
        playerColor: string;
        currentHue: number;
        hueNudge: number;
        saturation: number;
        lightness: number;
        hueLimit: number;
        onHueNudgeChange: (value: number) => void;
        onSaturationChange: (value: number) => void;
        onLightnessChange: (value: number) => void;
        onReset: () => void;
    }

    let {
        playerLabel,
        playerColor,
        currentHue,
        hueNudge,
        saturation,
        lightness,
        hueLimit,
        onHueNudgeChange,
        onSaturationChange,
        onLightnessChange,
        onReset,
    }: Props = $props();
</script>

<div class="player-color-popover">
    <div class="player-color-popover__header">
        <div class="player-color-popover__identity">
            <span
                class="player-color-popover__swatch"
                style={`background:${playerColor}`}
            ></span>
            <div>
                <div class="player-color-popover__title">{playerLabel} Color</div>
                <div class="player-color-popover__subtitle">{Math.round(currentHue)} deg anchor</div>
            </div>
        </div>
    </div>

    <div class="player-color-popover__control">
        <span class="player-color-popover__label">Hue Nudge</span>
        <input
            type="range"
            min={-hueLimit}
            max={hueLimit}
            step="1"
            value={hueNudge}
            oninput={(event) =>
                onHueNudgeChange(
                    Number((event.currentTarget as HTMLInputElement).value),
                )}
        />
        <span class="player-color-popover__value">{hueNudge > 0 ? "+" : ""}{hueNudge} deg</span>
    </div>

    <div class="player-color-popover__control">
        <span class="player-color-popover__label">Saturation</span>
        <input
            type="range"
            min="40"
            max="100"
            step="1"
            value={saturation}
            oninput={(event) =>
                onSaturationChange(
                    Number((event.currentTarget as HTMLInputElement).value),
                )}
        />
        <span class="player-color-popover__value">{saturation}%</span>
    </div>

    <div class="player-color-popover__control">
        <span class="player-color-popover__label">Lightness</span>
        <input
            type="range"
            min="30"
            max="70"
            step="1"
            value={lightness}
            oninput={(event) =>
                onLightnessChange(
                    Number((event.currentTarget as HTMLInputElement).value),
                )}
        />
        <span class="player-color-popover__value">{lightness}%</span>
    </div>

    <button
        type="button"
        class="player-color-popover__reset"
        onclick={onReset}
        disabled={hueNudge === 0}
    >
        Reset Nudge
    </button>
</div>

<style>
    .player-color-popover {
        position: absolute;
        top: calc(100% + 10px);
        left: 0;
        z-index: 25;
        min-width: min(320px, 88vw);
        padding: 14px;
        border-radius: 16px;
        background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent 36%),
            rgba(6, 14, 28, 0.96);
        border: 1px solid var(--pf-border-soft);
        box-shadow:
            0 18px 38px rgba(0, 0, 0, 0.36),
            0 0 0 1px rgba(255, 255, 255, 0.02);
        backdrop-filter: blur(18px);
    }

    .player-color-popover__header {
        margin-bottom: 10px;
    }

    .player-color-popover__identity {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .player-color-popover__swatch {
        width: 18px;
        height: 18px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.32);
        box-shadow: 0 0 14px rgba(0, 0, 0, 0.28);
    }

    .player-color-popover__title {
        font-family: "Oxanium", sans-serif;
        font-size: 0.82rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--pf-text);
    }

    .player-color-popover__subtitle {
        font-family: "Rajdhani", sans-serif;
        font-size: 0.8rem;
        color: var(--pf-muted);
    }

    .player-color-popover__control {
        display: grid;
        grid-template-columns: minmax(72px, auto) 1fr auto;
        gap: 10px;
        align-items: center;
        margin-top: 10px;
    }

    .player-color-popover__label {
        font-family: "Rajdhani", sans-serif;
        font-size: 0.84rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        color: var(--pf-muted-strong);
        text-transform: uppercase;
    }

    .player-color-popover__control input {
        width: 100%;
    }

    .player-color-popover__value {
        min-width: 56px;
        text-align: right;
        font-family: "Rajdhani", sans-serif;
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--pf-text);
    }

    .player-color-popover__reset {
        margin-top: 12px;
        width: 100%;
        min-height: 38px;
        border-radius: 10px;
        border: 1px solid var(--pf-border-soft);
        background: rgba(255, 255, 255, 0.03);
        color: var(--pf-muted-strong);
        font-family: "Rajdhani", sans-serif;
        font-size: 0.88rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        cursor: pointer;
        transition:
            border-color 0.15s ease,
            color 0.15s ease,
            background 0.15s ease;
    }

    .player-color-popover__reset:hover:enabled {
        border-color: var(--pf-accent-soft);
        background: rgba(255, 255, 255, 0.06);
        color: var(--pf-text);
    }

    .player-color-popover__reset:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }
</style>
