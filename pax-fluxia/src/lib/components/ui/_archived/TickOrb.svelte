<script lang="ts">
    interface Props {
        progress: number; // 0.0 to 1.0 (1.0 = Tick)
        class?: string;
    }

    let { progress, class: className = "" } = $props();

    // Hybrid Pulse Design
    // We map progress (linear 0->1) to a heartbeat curve for visual pump
    // progress 0.0 -> 0.8: Slow build
    // progress 0.8 -> 0.95: Rapid expansion (Systole)
    // progress 0.95 -> 1.0: Contraction/Snap (Diastole)

    // Non-linear visual scale
    const visualScale = $derived(
        progress < 0.8
            ? 0.8 + progress * 0.1 // 0.8 -> 0.88
            : progress < 0.95
              ? 0.88 + (progress - 0.8) * 1.5 // 0.88 -> 1.15
              : 1.15 - (progress - 0.95) * 3, // 1.15 -> 1.0
    );

    // Dynamic CSS variables for high-performance animation
    const style = $derived(`
        --orb-scale: ${visualScale};
        --orb-opacity: ${0.6 + progress * 0.4};
        --orb-angle: ${progress * 360}deg;
        --orb-glow: ${progress * 25}px;
    `);
</script>

<div class="orb-container {className}" {style}>
    <div class="orb-core">
        <div class="orb-inner"></div>
    </div>
    <div class="orb-glow"></div>
</div>

<style>
    .orb-container {
        position: relative;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        /* Hardware acceleration hint */
        will-change: transform;
    }

    .orb-core {
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: conic-gradient(
            from var(--orb-angle),
            rgba(0, 255, 255, 0.1),
            rgba(0, 255, 255, 0.8),
            rgba(0, 255, 255, 0.1)
        );
        transform: scale(var(--orb-scale));
        box-shadow: 0 0 var(--orb-glow) rgba(0, 255, 255, 0.4);
        /* Smooth out the derived updates */
        transition:
            transform 0.05s linear,
            box-shadow 0.05s linear;
    }

    /* Inner bright core that stays stable */
    .orb-inner {
        position: absolute;
        inset: 25%;
        border-radius: 50%;
        background: radial-gradient(circle at 30% 30%, #ffffff, #00ffff);
        box-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
        opacity: var(--orb-opacity);
    }

    /* Outer subtle ring */
    .orb-glow {
        position: absolute;
        inset: -10%;
        border-radius: 50%;
        border: 1px solid rgba(0, 255, 255, 0.1);
        transform: scale(calc(var(--orb-scale) * 1.2));
        transition: transform 0.1s ease-out;
    }
</style>
