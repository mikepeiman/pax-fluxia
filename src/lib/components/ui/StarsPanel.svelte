<script lang="ts">
    import { gameStore } from "$lib/stores/gameStore.svelte";
    import {
        combatLog,
        STAR_TYPE_COLORS,
        type CombatLogEntry,
    } from "$lib/stores/combatLogStore";

    // Star type icons - favicon style with emoji
    const STAR_TYPE_ICONS: Record<string, string> = {
        grey: "⚪",
        yellow: "💰",
        blue: "🚀",
        purple: "🔧",
        red: "🛡️",
        green: "⚔️",
    };

    // Derived: Group stars for display
    const groups = $derived.by(() => {
        const snapshot = gameStore.snapshot;
        if (!snapshot?.stars) return { underAttack: [], mine: [], others: [] };

        const underAttack: any[] = [];
        const mine: any[] = [];
        const others: any[] = [];
        const humanId = "human-player"; // Or derive dynamically if needed

        const stars = [...snapshot.stars];

        // Sort by ID to keep consistent order
        stars.sort(
            (a, b) =>
                parseInt(a.id.split("-")[1]) - parseInt(b.id.split("-")[1]),
        );

        for (const star of stars) {
            const engaged = isEngaged(star.id);
            // "Under Attack" if I own it and it's engaged
            if (engaged && star.ownerId === humanId) {
                underAttack.push(star);
            } else if (star.ownerId === humanId) {
                mine.push(star);
            } else {
                others.push(star);
            }
        }

        return { underAttack, mine, others };
    });

    let logs: CombatLogEntry[] = $state([]);

    // Subscribe to combat logs
    combatLog.subscribe((value) => {
        logs = value;
    });

    // Check if a star is currently engaged (has recent combat logs)
    function isEngaged(starId: string): boolean {
        const recentTick = gameStore.snapshot?.tick ?? 0;
        return logs.some(
            (log) =>
                (log.defender.id === starId || log.attacker.id === starId) &&
                recentTick - log.tick < 5,
        );
    }

    function getStarNumericId(starId: string): string {
        return starId.replace("star-", "");
    }
</script>

<div class="stars-panel">
    <div class="header">
        <div class="title-row">
            <h3>STARS</h3>
            <span class="badgew">{gameStore.snapshot?.stars.length || 0}</span>
        </div>
    </div>

    <div class="panel-content">
        <!-- 1. UNDER ATTACK / ENGAGED -->
        {#if groups.underAttack.length > 0}
            <div class="section-label alert">⚠️ COMBAT ZONE</div>
            <div class="star-grid">
                {#each groups.underAttack as star}
                    <div class="star-card alert">
                        <div class="card-header">
                            <span class="star-id"
                                >#{getStarNumericId(star.id)}</span
                            >
                            <span class="type-icon"
                                >{STAR_TYPE_ICONS[star.starType] || "⚪"}</span
                            >
                            <span class="status-icon">⚔️</span>
                        </div>
                        <div class="card-stats">
                            <div class="stat-row">
                                <span class="label">SHIPS</span>
                                <span class="value"
                                    >{Math.floor(star.activeShips)}</span
                                >
                            </div>
                            <!-- Simple health bar heuristic -->
                            <div class="stat-bar-container">
                                <div
                                    class="stat-bar"
                                    style="width: {Math.min(
                                        100,
                                        (star.activeShips / 100) * 100,
                                    )}%; background: #ef4444;"
                                ></div>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}

        <!-- 2. MY EMPIRE -->
        {#if groups.mine.length > 0}
            <div class="section-label">MY EMPIRE</div>
            <div class="star-grid">
                {#each groups.mine as star}
                    <div
                        class="star-card mine"
                        style="border-left-color: {STAR_TYPE_COLORS[
                            star.starType
                        ] || '#888'}"
                    >
                        <div class="card-header">
                            <span class="star-id"
                                >#{getStarNumericId(star.id)}</span
                            >
                            <span class="type-icon"
                                >{STAR_TYPE_ICONS[star.starType] || "⚪"}</span
                            >
                        </div>
                        <div class="card-body">
                            <div class="metric">
                                <span class="icon">🚀</span>
                                <span class="val"
                                    >{Math.floor(star.activeShips)}</span
                                >
                            </div>
                            {#if star.productionRate > 0}
                                <div class="metric">
                                    <span class="icon">⚡</span>
                                    <span class="val"
                                        >+{star.productionRate}</span
                                    >
                                </div>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        {/if}

        <!-- 3. KNOWN SPACE -->
        {#if groups.others.length > 0}
            <div class="section-label muted">KNOWN SPACE</div>
            <div class="star-grid compact">
                {#each groups.others as star}
                    <div class="star-card other">
                        <div class="card-header-compact">
                            <span class="star-id-small"
                                >#{getStarNumericId(star.id)}</span
                            >
                            <span
                                class="owner-dot"
                                style="background: {star.ownerId.includes('ai')
                                    ? '#f44'
                                    : '#888'}"
                            ></span>
                            <span class="ship-count-small"
                                >{Math.floor(star.activeShips)}</span
                            >
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .stars-panel {
        height: 100%;
        background: #0d0d12;
        display: flex;
        flex-direction: column;
        font-family: "JetBrains Mono", monospace;
        user-select: none;
        overflow: hidden; /* Prevent spill */
    }

    .header {
        padding: 16px;
        background: #15151e;
        border-bottom: 1px solid #2a2a35;
        flex-shrink: 0;
    }

    .title-row {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    h3 {
        margin: 0;
        font-size: 16px;
        color: #fff;
        font-weight: 800;
        letter-spacing: 1px;
    }

    .badgew {
        background: #2a2a35;
        color: #889;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: bold;
    }

    .panel-content {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
    }

    .section-label {
        font-size: 10px;
        font-weight: bold;
        color: #667;
        margin-bottom: 8px;
        margin-top: 16px;
        letter-spacing: 1px;
    }

    .section-label:first-child {
        margin-top: 0;
    }

    .section-label.alert {
        color: #ef4444;
        animation: pulseText 2s infinite;
    }

    .star-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 8px;
    }

    .star-grid.compact {
        grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
    }

    /* CARD STYLES */
    .star-card {
        background: #1a1a25;
        border: 1px solid #2a2a35;
        border-radius: 6px;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        transition:
            transform 0.1s,
            background 0.1s;
    }

    .star-card:hover {
        background: #20202e;
        transform: translateY(-1px);
        border-color: #445;
    }

    .star-card.alert {
        border-color: #ef4444;
        background: rgba(239, 68, 68, 0.05);
        box-shadow: 0 0 10px rgba(239, 68, 68, 0.1);
    }

    .star-card.mine {
        border-left-width: 3px;
    }

    .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .star-id {
        font-size: 14px;
        font-weight: bold;
        color: #fff;
    }

    .card-body {
        display: flex;
        gap: 8px;
    }

    .metric {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        color: #ccc;
    }

    .metric .icon {
        opacity: 0.7;
    }

    .card-stats {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .stat-row {
        display: flex;
        justify-content: space-between;
        font-size: 9px;
        color: #889;
    }

    .stat-bar-container {
        height: 3px;
        background: #2a2a35;
        border-radius: 2px;
        overflow: hidden;
        margin-top: 4px;
    }

    .stat-bar {
        height: 100%;
        transition: width 0.3s ease;
    }

    /* COMPACT CARD */
    .star-card.other {
        padding: 6px;
        background: #111116;
        border-color: #1a1a20;
    }

    .star-card.other:hover {
        background: #1a1a25;
        border-color: #334;
    }

    .card-header-compact {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .star-id-small {
        font-size: 10px;
        color: #667;
        font-weight: bold;
    }

    .ship-count-small {
        font-size: 10px;
        color: #889;
    }

    .owner-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
    }

    @keyframes pulseText {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.7;
        }
    }

    /* Custom Scrollbar for panel content */
    .panel-content::-webkit-scrollbar {
        width: 4px;
    }

    .panel-content::-webkit-scrollbar-track {
        background: #0d0d12;
    }

    .panel-content::-webkit-scrollbar-thumb {
        background: #334;
        border-radius: 2px;
    }
</style>
