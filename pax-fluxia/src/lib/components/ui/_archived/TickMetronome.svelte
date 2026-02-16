<script lang="ts">
    interface Props {
        progress: number; // 0-1
    }

    let { progress = 0 }: Props = $props();
</script>

<div class="metronome">
    <div class="metronome__label font-data">TICK</div>
    <div class="metronome__track">
        <div class="metronome__fill" style="width: {progress * 100}%"></div>
    </div>
</div>

<style>
    .metronome {
        display: flex;
        align-items: center;
        gap: var(--space-3);
    }

    .metronome__label {
        font-size: var(--text-xs);
        color: var(--color-text-muted);
        min-width: 32px;
    }

    .metronome__track {
        flex: 1;
        height: 6px;
        background: var(--color-void-light);
        border-radius: 3px;
        overflow: hidden;
    }

    .metronome__fill {
        height: 100%;
        background: linear-gradient(
            90deg,
            var(--color-accent-cyan),
            var(--color-accent-green)
        );
        border-radius: 3px;
        transition: width 50ms linear;
        box-shadow: 0 0 8px var(--color-accent-cyan);
    }
</style>
