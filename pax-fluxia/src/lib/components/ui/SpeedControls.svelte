<script lang="ts">
    import type { GameSpeed } from "$lib/types/game.types";

    interface Props {
        speed: GameSpeed;
        isPaused: boolean;
        onSpeedChange: (speed: GameSpeed) => void;
        onPause: () => void;
        onResume: () => void;
    }

    let { speed, isPaused, onSpeedChange, onPause, onResume }: Props = $props();

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
</script>

<div class="speed-controls">
    <!-- Pause Button -->
    <button
        class="speed-btn"
        class:speed-btn--active={isPaused}
        onclick={isPaused ? onResume : onPause}
        title={isPaused ? "Resume" : "Pause"}
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

<style>
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
