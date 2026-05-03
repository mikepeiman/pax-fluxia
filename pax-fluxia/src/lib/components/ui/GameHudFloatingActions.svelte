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
        background: rgba(20, 20, 30, 0.7);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: rgba(255, 255, 255, 0.4);
        cursor: pointer;
        z-index: 200;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .help-fab {
        right: 64px;
        font-family: "Exo", sans-serif;
        font-size: 1rem;
        font-weight: 700;
    }

    .fit-fab {
        right: 108px;
        font-size: 1rem;
    }

    .diagnostics-fab {
        right: 20px;
        font-size: 1rem;
    }

    .measurements-fab {
        right: 152px;
        font-size: 1rem;
    }

    .ruler-fab {
        right: 196px;
        font-size: 1rem;
    }

    .hud-fab:hover {
        color: #fff;
        border-color: rgba(0, 255, 255, 0.4);
        background: rgba(20, 20, 30, 0.9);
        box-shadow: 0 0 12px rgba(0, 255, 255, 0.15);
    }

    .hud-fab.active {
        color: #57f8ff;
        border-color: rgba(87, 248, 255, 0.5);
        background: rgba(20, 20, 30, 0.95);
        box-shadow: 0 0 14px rgba(87, 248, 255, 0.2);
    }

    @media (max-width: 1024px) {
        .help-fab,
        .fit-fab {
            display: none !important;
        }
    }
</style>
