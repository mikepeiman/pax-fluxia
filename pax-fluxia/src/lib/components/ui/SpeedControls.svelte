<script lang="ts">
    import type { GameSpeed } from "$lib/types/game.types";

    interface Props {
        speed: GameSpeed;
        isPaused: boolean;
        hasStarted: boolean;
        onSpeedChange: (speed: GameSpeed) => void;
        onPause: () => void;
        onResume: () => void;
        onStart: () => void;
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

    // Local state to track current speed for UI highlighting
    let currentSpeed = $state<GameSpeed>(speed || 1);

    // Sync with prop changes
    $effect(() => {
        if (speed > 0) {
            currentSpeed = speed;
        }
    });

    const speeds: { value: GameSpeed; label: string }[] = [
        { value: 1, label: "▶" },
        { value: 2, label: "▶▶" },
        { value: 4, label: "▶▶▶" },
        { value: 10, label: "⚡" },
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
    <!-- START Button (before game starts) -->
    {#if !hasStarted}
        <button class="start-btn" onclick={handleStart}> ▶ START </button>
    {/if}

    <div class="speed-controls">
        <!-- Pause Button -->
        <button
            class="speed-btn"
            class:speed-btn--active={isPaused}
            onclick={isPaused ? onResume : onPause}
            title={isPaused ? "Resume (Spacebar)" : "Pause (Spacebar)"}
        >
            ⏸
        </button>

        <!-- Speed Buttons -->
        {#each speeds as { value, label }}
            <button
                class="speed-btn"
                class:speed-btn--active={!isPaused && currentSpeed === value}
                onclick={() => handleSpeedClick(value)}
                title="{value}x Speed"
            >
                {label}
            </button>
        {/each}
    </div>
</div>

<style>
    .speed-controls-container {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
    }

    .start-btn {
        width: 100%;
        padding: var(--space-3) var(--space-4);
        font-size: var(--text-lg);
        font-weight: bold;
        background: linear-gradient(
            135deg,
            var(--color-accent-cyan),
            var(--color-player-human)
        );
        color: var(--color-void-deep);
        border: none;
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: all var(--transition-normal);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        box-shadow: 0 4px 20px rgba(0, 255, 255, 0.3);
    }

    .start-btn:hover {
        transform: scale(1.02);
        box-shadow: 0 6px 30px rgba(0, 255, 255, 0.5);
    }

    .speed-controls {
        display: flex;
        gap: var(--space-1);
        background: var(--color-void-mid);
        padding: var(--space-1);
        border-radius: var(--radius-md);
    }

    .speed-btn {
        width: 40px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        color: var(--color-text-muted);
        border: none;
        border-radius: var(--radius-sm);
        font-size: var(--text-sm);
        cursor: pointer;
        transition: all var(--transition-fast);
    }

    .speed-btn:hover {
        color: var(--color-text-primary);
        background: rgba(255, 255, 255, 0.05);
    }

    .speed-btn--active {
        background: var(--color-accent-cyan);
        color: var(--color-void-deep);
    }

    .speed-btn--active:hover {
        background: var(--color-accent-cyan);
        color: var(--color-void-deep);
    }
</style>
