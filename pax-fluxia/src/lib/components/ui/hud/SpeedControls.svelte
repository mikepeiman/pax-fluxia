<script lang="ts">
    import HudIcon from "./HudIcon.svelte";
    import type { GameSpeed } from "$lib/types/game.types";

    interface Props {
        speed: GameSpeed;
        isPaused: boolean;
        hasStarted: boolean;
        onSpeedChange: (speed: GameSpeed) => void;
        onPause: () => void;
        onResume: () => void;
        onStart: () => void;
        onCenterFit?: () => void;
        isMuted?: boolean;
        onToggleMute?: () => void;
    }

    let {
        speed,
        isPaused,
        hasStarted,
        onSpeedChange,
        onPause,
        onResume,
        onStart,
    }: Props = $props();

    let currentSpeed = $state<GameSpeed>(speed || 1);

    $effect(() => {
        if (speed > 0) {
            currentSpeed = speed;
        }
    });

    const speeds: { value: GameSpeed; icon: string; label: string }[] = [
        { value: 1, icon: "play-1", label: "1x" },
        { value: 2, icon: "play-2", label: "2x" },
        { value: 4, icon: "play-4", label: "4x" },
    ];

    function handleSpeedClick(newSpeed: GameSpeed) {
        currentSpeed = newSpeed;
        if (isPaused) {
            onResume();
        }
        onSpeedChange(newSpeed);
    }

    function handleStart() {
        onStart();
    }
</script>

<div class="speed-controls-container">
    {#if !hasStarted}
        <button class="start-btn" onclick={handleStart}>
            <HudIcon name="play-1" size={18} />
            <span>Start</span>
        </button>
    {/if}

    <div class="speed-controls">
        <button
            class="speed-btn speed-btn--pause"
            class:speed-btn--active={isPaused}
            onclick={isPaused ? onResume : onPause}
            title={isPaused ? "Resume (Spacebar)" : "Pause (Spacebar)"}
        >
            <HudIcon name="pause" size={17} />
        </button>

        {#each speeds as option}
            <button
                class="speed-btn"
                class:speed-btn--active={!isPaused && currentSpeed === option.value}
                onclick={() => handleSpeedClick(option.value)}
                title={`${option.label} speed`}
            >
                <HudIcon name={option.icon} size={17} />
            </button>
        {/each}
    </div>
</div>

<style>
    .speed-controls-container,
    .speed-controls {
        display: flex;
        align-items: center;
    }

    .speed-controls-container {
        flex-direction: column;
        align-items: stretch;
        gap: var(--hud-gap-xs);
    }

    .start-btn,
    .speed-btn {
        min-height: 38px;
        border-radius: 12px;
        border: 1px solid var(--hud-border);
        background: var(--hud-button-bg);
        color: var(--hud-text);
        cursor: pointer;
        transition:
            border-color 0.16s ease,
            background 0.16s ease,
            color 0.16s ease,
            transform 0.16s ease;
    }

    .start-btn:hover,
    .speed-btn:hover {
        border-color: var(--hud-border-strong);
        background: var(--hud-button-bg-hover);
        color: var(--hud-text-strong);
        transform: translateY(-1px);
    }

    .start-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 0 14px;
        font-family: var(--hud-font-ui);
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--hud-accent-warm);
    }

    .speed-controls {
        gap: 6px;
        padding: 0;
    }

    .speed-btn {
        width: 42px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
    }

    .speed-btn--pause {
        margin-right: 2px;
    }

    .speed-btn--active {
        border-color: var(--hud-border-strong);
        background: var(--hud-button-bg-active);
        color: var(--hud-accent);
        box-shadow: inset 0 0 0 1px rgba(94, 230, 255, 0.14);
    }

    .speed-btn--active:hover {
        color: var(--hud-accent-strong);
    }

    @media (max-width: 1024px) {
        .speed-controls-container {
            gap: 4px;
            min-width: 0;
        }

        .start-btn {
            min-height: 34px;
            font-size: 0.66rem;
        }

        .speed-controls {
            gap: 4px;
        }

        .speed-btn {
            width: 36px;
            min-width: 36px;
            min-height: 34px;
        }
    }
</style>
