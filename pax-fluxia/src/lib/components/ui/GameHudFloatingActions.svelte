<script lang="ts">
    interface Props {
        onDiagnosticsClick?: () => void;
        onRulerToggle?: () => void;
        onAuthoredMeasurementsToggle?: () => void;
        onFitViewport?: () => void;
        onHelpClick?: () => void;
        diagnosticsActive?: boolean;
        rulerActive?: boolean;
        authoredMeasurementsActive?: boolean;
        authoredMeasurementsAvailable?: boolean;
    }

    let {
        onDiagnosticsClick,
        onRulerToggle,
        onAuthoredMeasurementsToggle,
        onFitViewport,
        onHelpClick,
        diagnosticsActive = false,
        rulerActive = false,
        authoredMeasurementsActive = false,
        authoredMeasurementsAvailable = false,
    }: Props = $props();
</script>

{#if onDiagnosticsClick}
    <button
        class="hud-fab diagnostics-fab"
        class:active={diagnosticsActive}
        onclick={onDiagnosticsClick}
        title="Diagnostics"
    >
        ◎
    </button>
{/if}

{#if onRulerToggle}
    <button
        class="hud-fab ruler-fab"
        class:active={rulerActive}
        onclick={onRulerToggle}
        title={rulerActive ? "Turn Ruler Off" : "Turn Ruler On"}
    >
        📏
    </button>
{/if}

{#if onAuthoredMeasurementsToggle && authoredMeasurementsAvailable}
    <button
        class="hud-fab measurements-fab"
        class:active={authoredMeasurementsActive}
        onclick={onAuthoredMeasurementsToggle}
        title={authoredMeasurementsActive
            ? "Hide Map Measurements"
            : "Show Map Measurements"}
    >
        ⇄
    </button>
{/if}

{#if onFitViewport}
    <button
        class="hud-fab fit-fab"
        onclick={onFitViewport}
        title="Fit to Viewport (F)"
    >
        ⛶
    </button>
{/if}

{#if onHelpClick}
    <button class="hud-fab help-fab" onclick={onHelpClick} title="Help & Controls">
        ?
    </button>
{/if}

<style>
    .hud-fab {
        position: fixed;
        bottom: 20px;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: color-mix(in srgb, var(--pax-color-void) 70%, transparent);
        backdrop-filter: blur(8px);
        border: 1px solid color-mix(in srgb, var(--pax-ui-text-strong) 15%, transparent);
        color: color-mix(in srgb, var(--pax-ui-text-strong) 40%, transparent);
        cursor: pointer;
        z-index: 200;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .help-fab {
        right: 64px;
        font-family: var(--pax-ui-font-display);
        font-size: var(--pax-type-base);
        font-weight: var(--pax-weight-bold);
    }

    .fit-fab {
        right: 108px;
        font-size: var(--pax-type-base);
    }

    .diagnostics-fab {
        right: 20px;
        font-size: var(--pax-type-base);
    }

    .measurements-fab {
        right: 152px;
        font-size: var(--pax-type-base);
    }

    .ruler-fab {
        right: 196px;
        font-size: var(--pax-type-base);
    }

    .hud-fab:hover {
        color: var(--pax-ui-text-strong);
        border-color: color-mix(in srgb, var(--pax-ui-accent) 40%, transparent);
        background: color-mix(in srgb, var(--pax-color-void) 90%, transparent);
        box-shadow: 0 0 12px color-mix(in srgb, var(--pax-ui-accent) 15%, transparent);
    }

    .hud-fab.active {
        color: var(--pax-ui-accent);
        border-color: color-mix(in srgb, var(--pax-ui-accent) 50%, transparent);
        background: color-mix(in srgb, var(--pax-color-void) 95%, transparent);
        box-shadow: 0 0 14px color-mix(in srgb, var(--pax-ui-accent) 20%, transparent);
    }

    @media (max-width: 1024px) {
        .help-fab,
        .fit-fab {
            display: none !important;
        }
    }
</style>
