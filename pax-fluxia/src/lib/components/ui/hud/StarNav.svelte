<script lang="ts">
    import type { StarState } from "$lib/types/game.types";
    import { logFlags } from "$lib/utils/logger";

    interface Props {
        stars: StarState[];
        localPlayerId?: string;
        onNavigateToStar: (starId: string) => void;
        onCenterFit: () => void;
    }

    let { stars, localPlayerId, onNavigateToStar, onCenterFit }: Props =
        $props();

    // Only cycle through stars the local player owns
    const ownedStars = $derived(
        stars.filter((s) => s.ownerId === localPlayerId),
    );

    let currentIndex = $state(0);
    let lastNavInfo = $state("");

    // Clamp index when owned stars change
    $effect(() => {
        if (ownedStars.length === 0) {
            currentIndex = 0;
        } else if (currentIndex >= ownedStars.length) {
            currentIndex = ownedStars.length - 1;
        }
    });

    function prev() {
        if (ownedStars.length === 0) return;
        currentIndex =
            (currentIndex - 1 + ownedStars.length) % ownedStars.length;
        const star = ownedStars[currentIndex];
        lastNavInfo = `→${star.id} own=${star.ownerId} idx=${currentIndex}/${ownedStars.length}`;
        onNavigateToStar(star.id);
    }

    function next() {
        if (ownedStars.length === 0) return;
        currentIndex = (currentIndex + 1) % ownedStars.length;
        const star = ownedStars[currentIndex];
        lastNavInfo = `→${star.id} own=${star.ownerId} idx=${currentIndex}/${ownedStars.length}`;
        onNavigateToStar(star.id);
    }
</script>

<fieldset class="star-nav-fieldset">
    <legend class="star-nav-legend">Star View</legend>
    <button
        class="sn-btn"
        onclick={prev}
        disabled={ownedStars.length === 0}
        title="Previous star">◂</button
    >
    <button
        class="sn-btn sn-center"
        onclick={onCenterFit}
        title="Center & Fit map">⌖</button
    >
    <button
        class="sn-btn"
        onclick={next}
        disabled={ownedStars.length === 0}
        title="Next star">▸</button
    >
</fieldset>

{#if logFlags.canvas}
    <div class="sn-debug">
        <div>
            pid={localPlayerId ?? "null"} owned={ownedStars.length}/{stars.length}
        </div>
        {#if lastNavInfo}<div>{lastNavInfo}</div>{/if}
    </div>
{/if}

<style>
    .star-nav-fieldset {
        margin: 0;
        padding: 4px 6px 6px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        display: flex;
        gap: 2px;
        align-items: center;
    }
    .star-nav-legend {
        font-family: "Montserrat", sans-serif;
        font-size: 0.55rem;
        font-weight: 600;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.35);
        padding: 0 6px;
    }
    .sn-btn {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        border-radius: 4px;
        color: rgba(255, 255, 255, 0.7);
        font-size: 1.2rem;
        cursor: pointer;
        transition: all 0.12s ease;
    }
    .sn-btn:active:not(:disabled) {
        background: rgba(0, 255, 255, 0.15);
        color: #0ff;
    }
    .sn-btn:disabled {
        opacity: 0.25;
        cursor: default;
    }
    .sn-center {
        color: rgba(0, 255, 255, 0.6);
        font-size: 1.3rem;
    }
    .sn-debug {
        font-family: monospace;
        font-size: 0.55rem;
        color: rgba(0, 200, 255, 0.7);
        background: rgba(0, 0, 0, 0.5);
        padding: 2px 6px;
        border-radius: 4px;
        margin-top: 2px;
        line-height: 1.3;
    }
</style>
