<script lang="ts">
    interface Props {
        value: number;
        label?: string;
        onChange: (value: number) => void;
    }

    let {
        value,
        label = "Anchor Hue",
        onChange,
    }: Props = $props();

    let dialEl: HTMLButtonElement | null = null;
    let dragging = $state(false);

    function normalize(valueIn: number): number {
        const normalized = Math.round(valueIn) % 360;
        return normalized < 0 ? normalized + 360 : normalized;
    }

    function valueFromPointer(event: PointerEvent): number {
        if (!dialEl) return value;
        const rect = dialEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const angle = Math.atan2(event.clientY - cy, event.clientX - cx);
        const degrees = angle * (180 / Math.PI) + 90;
        return normalize(degrees);
    }

    function updateFromPointer(event: PointerEvent) {
        onChange(valueFromPointer(event));
    }

    function handlePointerDown(event: PointerEvent) {
        if (!dialEl) return;
        dragging = true;
        dialEl.setPointerCapture(event.pointerId);
        updateFromPointer(event);
    }

    function handlePointerMove(event: PointerEvent) {
        if (!dragging) return;
        updateFromPointer(event);
    }

    function handlePointerUp(event: PointerEvent) {
        if (!dialEl) return;
        dragging = false;
        dialEl.releasePointerCapture(event.pointerId);
    }

    function step(amount: number) {
        onChange(normalize(value + amount));
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
            event.preventDefault();
            step(-1);
        } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
            event.preventDefault();
            step(1);
        } else if (event.key === "PageDown") {
            event.preventDefault();
            step(-15);
        } else if (event.key === "PageUp") {
            event.preventDefault();
            step(15);
        } else if (event.key === "Home") {
            event.preventDefault();
            onChange(0);
        } else if (event.key === "End") {
            event.preventDefault();
            onChange(359);
        }
    }

    const rotation = $derived(`rotate(${value}deg)`);
</script>

<button
    bind:this={dialEl}
    type="button"
    class="hue-dial"
    class:is-dragging={dragging}
    aria-label={label}
    aria-valuemin={0}
    aria-valuemax={359}
    aria-valuenow={Math.round(value)}
    role="slider"
    tabindex="0"
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onpointercancel={handlePointerUp}
    onkeydown={handleKeyDown}
>
    <span class="hue-dial__ring"></span>
    <span class="hue-dial__needle" style:transform={rotation}></span>
    <span class="hue-dial__cap"></span>
    <span class="hue-dial__core">
        <span class="hue-dial__value">{Math.round(value)}</span>
        <span class="hue-dial__unit">deg</span>
    </span>
</button>

<style>
    .hue-dial {
        position: relative;
        display: grid;
        place-items: center;
        width: 88px;
        aspect-ratio: 1;
        padding: 0;
        border: none;
        background: none;
        cursor: grab;
        user-select: none;
        touch-action: none;
    }

    .hue-dial.is-dragging {
        cursor: grabbing;
    }

    .hue-dial:focus-visible {
        outline: 2px solid var(--pf-accent-strong);
        outline-offset: 4px;
        border-radius: 999px;
    }

    .hue-dial__ring,
    .hue-dial__needle,
    .hue-dial__cap,
    .hue-dial__core {
        position: absolute;
    }

    .hue-dial__ring {
        inset: 0;
        border-radius: 999px;
        background:
            radial-gradient(circle at center, rgba(0, 0, 0, 0) 45%, rgba(0, 0, 0, 0.3) 46%, rgba(0, 0, 0, 0.3) 47%, rgba(0, 0, 0, 0) 48%),
            conic-gradient(
                from 0deg,
                hsl(0 85% 58%),
                hsl(40 88% 58%),
                hsl(80 84% 56%),
                hsl(140 72% 54%),
                hsl(200 84% 55%),
                hsl(260 82% 62%),
                hsl(320 74% 60%),
                hsl(360 85% 58%)
            );
        box-shadow:
            inset 0 0 0 1px var(--pf-border-soft),
            inset 0 20px 28px rgba(255, 255, 255, 0.08),
            0 12px 30px rgba(0, 0, 0, 0.32);
    }

    .hue-dial__core {
        inset: 16px;
        border-radius: 999px;
        background:
            radial-gradient(circle at 30% 24%, rgba(255, 255, 255, 0.18), transparent 42%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(0, 0, 0, 0.14)),
            var(--pf-control-bg);
        border: 1px solid var(--pf-border-soft);
        display: grid;
        place-items: center;
        gap: 2px;
        color: var(--pf-text);
        font-family: "Rajdhani", sans-serif;
    }

    .hue-dial__needle {
        top: 9px;
        left: 50%;
        width: 2px;
        height: calc(50% - 8px);
        transform-origin: bottom center;
        margin-left: -1px;
    }

    .hue-dial__needle::before {
        content: "";
        display: block;
        width: 100%;
        height: 100%;
        border-radius: 999px;
        background: linear-gradient(180deg, var(--pf-accent-strong), rgba(255, 255, 255, 0.35));
        box-shadow: 0 0 10px color-mix(in srgb, var(--pf-accent-strong) 65%, transparent);
    }

    .hue-dial__cap {
        width: 12px;
        height: 12px;
        border-radius: 999px;
        background: var(--pf-accent-strong);
        box-shadow:
            0 0 0 3px rgba(3, 10, 22, 0.78),
            0 0 16px color-mix(in srgb, var(--pf-accent-strong) 45%, transparent);
    }

    .hue-dial__value {
        font-size: 1.2rem;
        font-weight: 700;
        line-height: 1;
    }

    .hue-dial__unit {
        font-size: 0.58rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--pf-muted);
    }
</style>
