<script lang="ts">
    import { gameStore } from "$lib/stores/gameStore.svelte";
    import { fly, fade } from "svelte/transition";

    // --- Types & Config ---
    type Tab = "frontline" | "core" | "all";

    // --- State ---
    let currentTab: Tab = $state("frontline");
    let selectedStarId: string | null = $state(null);

    // --- Stats & Derived Data ---
    const stats = $derived.by(() => {
        const snapshot = gameStore.snapshot;
        if (!snapshot?.stars) return { ships: 0, production: 0, stars: 0 };

        const myStars = snapshot.stars.filter(
            (s) => s.ownerId === "human-player",
        );
        return {
            ships: myStars.reduce(
                (acc, s) => acc + Math.floor(s.activeShips),
                0,
            ),
            production: myStars.reduce(
                (acc, s) => acc + (s.productionRate || 0),
                0,
            ),
            stars: myStars.length,
        };
    });

    // Grouping
    const groups = $derived.by(() => {
        const snapshot = gameStore.snapshot;
        if (!snapshot?.stars) return { frontline: [], core: [], all: [] };

        const myStars = snapshot.stars.filter(
            (s) => s.ownerId === "human-player",
        );

        // Frontline logic placeholder (All for now, or just military)
        return {
            frontline: myStars,
            core: myStars.filter((s) => (s.productionRate || 0) > 0),
            all: myStars,
        };
    });

    const activeList = $derived(groups[currentTab]);

    function selectStar(id: string) {
        selectedStarId = id;
    }

    // --- Visual Helpers ---
    function getGradient(starType: string) {
        // Subtle gradients based on type for CARD BACKGROUND
        const colors: Record<string, string> = {
            yellow: "linear-gradient(135deg, rgba(234, 179, 8, 0.1), rgba(234, 179, 8, 0.0))",
            blue: "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.0))",
            red: "linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.0))",
            green: "linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.0))",
            purple: "linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(168, 85, 247, 0.0))",
            grey: "linear-gradient(135deg, rgba(156, 163, 175, 0.1), rgba(156, 163, 175, 0.0))",
        };
        return colors[starType] || colors.grey;
    }

    function getTypeColor(starType: string) {
        // Solid colors for CIRCLE ICON
        const colors: Record<string, string> = {
            yellow: "#eab308",
            blue: "#3b82f6",
            red: "#ef4444",
            green: "#22c55e",
            purple: "#a855f7",
            grey: "#9ca3af",
        };
        return colors[starType] || "#ffffff";
    }
</script>

<div class="stars-panel">
    <!-- 1. SMART HEADER -->
    <div class="header">
        <div class="empire-stats">
            <div class="stat-item">
                <span class="label">EMPIRE</span>
                <span class="value"
                    >{stats.stars} <span class="dim">STARS</span></span
                >
            </div>
            <div class="stat-item">
                <span class="label">FLEET</span>
                <span class="value">{stats.ships}</span>
            </div>
            <div class="stat-item highlight">
                <span class="label">INCOME</span>
                <span class="value">+{stats.production}</span>
            </div>
        </div>
    </div>

    <!-- 2. TABS -->
    <div class="tabs">
        <button
            class="tab-btn"
            class:active={currentTab === "frontline"}
            onclick={() => (currentTab = "frontline")}
        >
            FRONTLINE
        </button>
        <button
            class="tab-btn"
            class:active={currentTab === "core"}
            onclick={() => (currentTab = "core")}
        >
            CORE
        </button>
        <button
            class="tab-btn"
            class:active={currentTab === "all"}
            onclick={() => (currentTab = "all")}
        >
            ALL
        </button>
    </div>

    <!-- 3. CONTENT LIST -->
    <div class="list-container">
        {#each activeList as star (star.id)}
            <div
                class="star-card"
                class:selected={selectedStarId === star.id}
                style="background: {getGradient(star.starType)}"
                onclick={() => selectStar(star.id)}
                role="button"
                tabindex="0"
                onkeydown={(e) => e.key === "Enter" && selectStar(star.id)}
            >
                <div class="card-left">
                    <!-- Solid Circle Icon -->
                    <div
                        class="star-circle"
                        style="background-color: {getTypeColor(star.starType)}"
                    ></div>

                    <div class="star-identity">
                        <span class="id">#{star.id.replace("star-", "")}</span>
                        {#if star.activeShips < 10}
                            <span class="status-alert">WEAK</span>
                        {/if}
                    </div>
                </div>

                <div class="card-center">
                    <span class="ship-count"
                        >{Math.floor(star.activeShips)}</span
                    >
                </div>

                <div class="card-right">
                    {#if (star.productionRate || 0) > 0}
                        <div class="metric prod">
                            <span class="icon">⚡</span>
                            <span>+{star.productionRate}</span>
                        </div>
                    {/if}
                    <div class="metric def">
                        <span class="icon">🛡️</span>
                        <span>{Math.floor(star.activeShips * 0.5)}</span>
                    </div>
                </div>

                <!-- Selection Indicator -->
                <div class="selection-bar"></div>
            </div>
        {/each}

        {#if activeList.length === 0}
            <div class="empty-state">No stars in this category.</div>
        {/if}
    </div>
</div>

<style>
    .stars-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: transparent;
        font-family: "JetBrains Mono", monospace;
    }

    /* HEADER */
    .header {
        padding: 12px;
        background: rgba(0, 0, 0, 0.2);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .empire-stats {
        display: flex;
        justify-content: space-between;
    }

    .stat-item {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .stat-item .label {
        font-size: 8px;
        color: #667;
        letter-spacing: 1px;
        font-weight: bold;
    }

    .stat-item .value {
        font-size: 14px;
        color: #fff;
        font-weight: bold;
    }
    .stat-item.highlight .value {
        color: #fbbf24;
    }
    .dim {
        font-size: 10px;
        color: #556;
    }

    /* TABS */
    .tabs {
        display: flex;
        padding: 8px 12px;
        gap: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .tab-btn {
        flex: 1;
        background: transparent;
        border: 1px solid #334;
        color: #667;
        padding: 6px;
        font-size: 10px;
        font-weight: bold;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s;
    }

    .tab-btn:hover {
        border-color: #556;
        color: #889;
    }

    .tab-btn.active {
        background: #2a2a35;
        border-color: #4488ff;
        color: #fff;
    }

    /* LIST */
    .list-container {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .list-container::-webkit-scrollbar {
        width: 4px;
    }
    .list-container::-webkit-scrollbar-thumb {
        background: #334;
        border-radius: 2px;
    }

    /* CARDS */
    .star-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        position: relative;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.2s;
    }

    .star-card:hover {
        border-color: rgba(255, 255, 255, 0.2);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .star-card.selected {
        border-color: #4488ff;
        background: rgba(68, 136, 255, 0.1) !important;
    }

    .card-left {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .star-circle {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.8);
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
    }

    .star-identity {
        display: flex;
        flex-direction: column;
    }

    .star-identity .id {
        font-size: 12px;
        color: #fff;
        font-weight: bold;
    }

    .status-alert {
        font-size: 8px;
        color: #ef4444;
        font-weight: bold;
    }

    .card-center {
        flex: 1;
        display: flex;
        justify-content: center;
    }

    .ship-count {
        font-size: 20px;
        font-weight: 900;
        color: #fff;
        font-family: "Orbitron", sans-serif; /* Tech feel */
        text-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
    }

    .card-right {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;
    }

    .metric {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 10px;
        color: #ccc;
    }

    .metric.prod {
        color: #fbbf24;
    }
    .metric.def {
        color: #60a5fa;
    }

    .selection-bar {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: #4488ff;
        opacity: 0;
        transition: opacity 0.2s;
    }

    .star-card.selected .selection-bar {
        opacity: 1;
    }

    .empty-state {
        text-align: center;
        padding: 20px;
        color: #556;
        font-size: 12px;
        font-style: italic;
    }
</style>
