<script lang="ts">
    import { PaxHudButton } from "$lib/design-system";
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

    let currentSpeed = $state<GameSpeed>(1);

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
        <PaxHudButton
            class="start-btn"
            icon="play-1"
            iconSize={18}
            label="Start"
            onclick={handleStart}
        />
    {/if}

    <div class="speed-controls">
        <PaxHudButton
            class="speed-btn speed-btn--pause"
            icon="pause"
            iconSize={17}
            active={isPaused}
            pressed={isPaused}
            onclick={isPaused ? onResume : onPause}
            title={isPaused ? "Resume (Spacebar)" : "Pause (Spacebar)"}
        />

        {#each speeds as option}
            <PaxHudButton
                class="speed-btn"
                icon={option.icon}
                iconSize={17}
                active={!isPaused && currentSpeed === option.value}
                pressed={!isPaused && currentSpeed === option.value}
                onclick={() => handleSpeedClick(option.value)}
                title={`${option.label} speed`}
            />
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
        gap: var(--pax-ui-gap-xs);
    }

    .speed-controls-container :global(.start-btn),
    .speed-controls :global(.speed-btn) {
        min-height: 38px;
    }

    .speed-controls-container :global(.start-btn) {
        gap: 8px;
        padding: 0 14px;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.14em;
    }

    .speed-controls {
        gap: 6px;
        padding: 0;
    }

    .speed-controls :global(.speed-btn) {
        width: 42px;
        min-width: 42px;
        padding: 0;
    }

    .speed-controls :global(.speed-btn--pause) {
        margin-right: 2px;
    }

    @media (max-width: 1024px) {
        .speed-controls-container {
            gap: 4px;
            min-width: 0;
        }

        .speed-controls-container :global(.start-btn) {
            min-height: 34px;
            font-size: 0.66rem;
        }

        .speed-controls {
            gap: 4px;
        }

        .speed-controls :global(.speed-btn) {
            width: 36px;
            min-width: 36px;
            min-height: 34px;
        }
    }
</style>
