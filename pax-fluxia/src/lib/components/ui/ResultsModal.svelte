<script lang="ts">
    import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
    import type { GameHistoryEntry } from "$lib/types/game.types";

    // Tab state
    let activeTab = $state<"overview" | "power" | "territory" | "activity">(
        "overview",
    );

    // All state from unified store
    const winner = $derived(activeGameStore.getWinner());
    const humanPlayer = $derived(activeGameStore.getHumanPlayer());
    const victory = $derived(activeGameStore.isVictory());
    const engineStats = $derived(activeGameStore.getStats());
    const history = $derived(
        activeGameStore.getHistory() as GameHistoryEntry[],
    );

    // Build player colors from store data
    const playerColorMap = $derived.by(() => {
        const map: Record<string, string> = {};
        for (const p of activeGameStore.players) {
            if (p.color) map[p.id] = p.color;
            if ((p as any).sessionId && p.color) {
                map[(p as any).sessionId] = p.color;
            }
        }
        return map;
    });

    // Format elapsed time
    function formatTime(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, "0")}`;
    }

    const elapsedTime = $derived(formatTime(engineStats.elapsedMs));

    // Chart dimensions
    const chartWidth = 380;
    const chartHeight = 180;
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;

    // Downsample history for smoother charts (every 10th tick)
    const sampledHistory = $derived(() => {
        if (history.length <= 50) return history;
        const step = Math.ceil(history.length / 50);
        return history.filter(
            (_, i) => i % step === 0 || i === history.length - 1,
        );
    });

    // Power chart data (total ships per player)
    const powerChartData = $derived(() => {
        const data = sampledHistory();
        if (data.length === 0) return { lines: [], maxY: 100, maxX: 100 };

        const playerIds = [
            ...new Set(data.flatMap((d) => d.players.map((p) => p.id))),
        ];
        const maxShips = Math.max(
            ...data.flatMap((d) => d.players.map((p) => p.totalShips)),
            10,
        );
        const maxTick = Math.max(...data.map((d) => d.tick), 1);

        const lines = playerIds.map((playerId) => {
            const points = data
                .map((entry) => {
                    const player = entry.players.find((p) => p.id === playerId);
                    if (!player) return null;
                    const x =
                        padding.left + (entry.tick / maxTick) * innerWidth;
                    const y =
                        padding.top +
                        innerHeight -
                        (player.totalShips / maxShips) * innerHeight;
                    return `${x},${y}`;
                })
                .filter(Boolean)
                .join(" ");
            return {
                playerId,
                points,
                color: playerColorMap[playerId] || "#888",
            };
        });

        return { lines, maxY: maxShips, maxX: maxTick };
    });

    // Territory chart data (star count per player)
    const territoryChartData = $derived(() => {
        const data = sampledHistory();
        if (data.length === 0) return { lines: [], maxY: 10, maxX: 100 };

        const playerIds = [
            ...new Set(data.flatMap((d) => d.players.map((p) => p.id))),
        ];
        const maxStars = Math.max(
            ...data.flatMap((d) => d.players.map((p) => p.starCount)),
            1,
        );
        const maxTick = Math.max(...data.map((d) => d.tick), 1);

        const lines = playerIds.map((playerId) => {
            const points = data
                .map((entry) => {
                    const player = entry.players.find((p) => p.id === playerId);
                    if (!player) return null;
                    const x =
                        padding.left + (entry.tick / maxTick) * innerWidth;
                    const y =
                        padding.top +
                        innerHeight -
                        (player.starCount / maxStars) * innerHeight;
                    return `${x},${y}`;
                })
                .filter(Boolean)
                .join(" ");
            return {
                playerId,
                points,
                color: playerColorMap[playerId] || "#888",
            };
        });

        return { lines, maxY: maxStars, maxX: maxTick };
    });

    // Activity chart data (combat events over time)
    const activityChartData = $derived(() => {
        const data = sampledHistory();
        if (data.length === 0) return { bars: [], maxY: 1, maxX: 100 };

        const maxCombat = Math.max(
            ...data.map((d) => (d as any).totalCombatEvents || 0),
            1,
        );
        const maxTick = Math.max(...data.map((d) => d.tick), 1);
        const barWidth = Math.max(2, innerWidth / data.length - 1);

        const bars = data.map((entry, i) => {
            const x = padding.left + (i / data.length) * innerWidth;
            const height =
                (((entry as any).totalCombatEvents || 0) / maxCombat) *
                innerHeight;
            const y = padding.top + innerHeight - height;
            const conquest = (entry as any).conquestsThisTick || 0;
            return {
                x,
                y,
                width: barWidth,
                height,
                conquest,
                tick: entry.tick,
            };
        });

        return { bars, maxY: maxCombat, maxX: maxTick };
    });

    function formatPlayerId(id: string): string {
        if (id === "human-player") return "You";
        if (id.startsWith("ai-")) return `AI ${id.split("-")[1]}`;
        const localId = activeGameStore.localPlayerId;
        if (id === localId) return "You";
        const player = activeGameStore.players.find(
            (p) => p.id === id || (p as any).sessionId === id,
        );
        return player?.name || id;
    }

    function handlePlayAgain() {
        activeGameStore.playAgain();
    }

    function handleReturnToMenu() {
        activeGameStore.returnToMenu();
    }
</script>

<div class="modal-backdrop">
    <div class="results-modal glass-panel glass-panel--accent animate-slide-up">
        <!-- Header -->
        <header class="results-header">
            <h1
                class="results-title font-display"
                class:victory
                class:defeat={!victory}
            >
                {victory ? "VICTORY" : "DEFEAT"}
            </h1>

            {#if winner}
                <p class="winner-name">
                    <span
                        class="winner-dot"
                        style="background-color: {winner.color}"
                    ></span>
                    {winner.name} conquers the galaxy
                </p>
            {/if}
        </header>

        <!-- Tab Navigation -->
        <nav class="tab-nav">
            <button
                class="tab-btn"
                class:active={activeTab === "overview"}
                onclick={() => (activeTab = "overview")}
            >
                Overview
            </button>
            <button
                class="tab-btn"
                class:active={activeTab === "power"}
                onclick={() => (activeTab = "power")}
            >
                Power
            </button>
            <button
                class="tab-btn"
                class:active={activeTab === "territory"}
                onclick={() => (activeTab = "territory")}
            >
                Territory
            </button>
            <button
                class="tab-btn"
                class:active={activeTab === "activity"}
                onclick={() => (activeTab = "activity")}
            >
                Activity
            </button>
        </nav>

        <!-- Tab Content -->
        <section class="tab-content">
            {#if activeTab === "overview"}
                <!-- Stats Grid -->
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-value font-data">{elapsedTime}</span>
                        <span class="stat-label">Time Elapsed</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value font-data"
                            >{engineStats.totalTicks}</span
                        >
                        <span class="stat-label">Total Ticks</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value font-data"
                            >{engineStats.peakFleetSize.toLocaleString()}</span
                        >
                        <span class="stat-label">Peak Fleet</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value font-data"
                            >{engineStats.starsCaptured}</span
                        >
                        <span class="stat-label">Stars Captured</span>
                    </div>
                </div>
            {:else if activeTab === "power"}
                <!-- Power Over Time Chart -->
                <div class="chart-container">
                    <h3 class="chart-title">Fleet Strength Over Time</h3>
                    <svg viewBox="0 0 {chartWidth} {chartHeight}" class="chart">
                        <!-- Grid lines -->
                        <g class="grid">
                            {#each [0, 0.25, 0.5, 0.75, 1] as ratio}
                                <line
                                    x1={padding.left}
                                    y1={padding.top + innerHeight * (1 - ratio)}
                                    x2={padding.left + innerWidth}
                                    y2={padding.top + innerHeight * (1 - ratio)}
                                    stroke="rgba(255,255,255,0.1)"
                                />
                            {/each}
                        </g>

                        <!-- Axes -->
                        <line
                            x1={padding.left}
                            y1={padding.top}
                            x2={padding.left}
                            y2={padding.top + innerHeight}
                            stroke="rgba(255,255,255,0.3)"
                        />
                        <line
                            x1={padding.left}
                            y1={padding.top + innerHeight}
                            x2={padding.left + innerWidth}
                            y2={padding.top + innerHeight}
                            stroke="rgba(255,255,255,0.3)"
                        />

                        <!-- Y-axis labels -->
                        <text
                            x={padding.left - 5}
                            y={padding.top + 5}
                            class="axis-label"
                            text-anchor="end"
                        >
                            {Math.round(powerChartData().maxY)}
                        </text>
                        <text
                            x={padding.left - 5}
                            y={padding.top + innerHeight}
                            class="axis-label"
                            text-anchor="end"
                        >
                            0
                        </text>

                        <!-- X-axis label -->
                        <text
                            x={padding.left + innerWidth / 2}
                            y={chartHeight - 5}
                            class="axis-label"
                            text-anchor="middle"
                        >
                            Tick
                        </text>

                        <!-- Lines -->
                        {#each powerChartData().lines as line}
                            <polyline
                                points={line.points}
                                fill="none"
                                stroke={line.color}
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                        {/each}
                    </svg>

                    <!-- Legend -->
                    <div class="chart-legend">
                        {#each powerChartData().lines as line}
                            <div class="legend-item">
                                <span
                                    class="legend-dot"
                                    style="background: {line.color}"
                                ></span>
                                <span class="legend-label"
                                    >{formatPlayerId(line.playerId)}</span
                                >
                            </div>
                        {/each}
                    </div>
                </div>
            {:else if activeTab === "territory"}
                <!-- Territory Control Chart -->
                <div class="chart-container">
                    <h3 class="chart-title">Territory Control Over Time</h3>
                    <svg viewBox="0 0 {chartWidth} {chartHeight}" class="chart">
                        <!-- Grid lines -->
                        <g class="grid">
                            {#each [0, 0.25, 0.5, 0.75, 1] as ratio}
                                <line
                                    x1={padding.left}
                                    y1={padding.top + innerHeight * (1 - ratio)}
                                    x2={padding.left + innerWidth}
                                    y2={padding.top + innerHeight * (1 - ratio)}
                                    stroke="rgba(255,255,255,0.1)"
                                />
                            {/each}
                        </g>

                        <!-- Axes -->
                        <line
                            x1={padding.left}
                            y1={padding.top}
                            x2={padding.left}
                            y2={padding.top + innerHeight}
                            stroke="rgba(255,255,255,0.3)"
                        />
                        <line
                            x1={padding.left}
                            y1={padding.top + innerHeight}
                            x2={padding.left + innerWidth}
                            y2={padding.top + innerHeight}
                            stroke="rgba(255,255,255,0.3)"
                        />

                        <!-- Y-axis labels -->
                        <text
                            x={padding.left - 5}
                            y={padding.top + 5}
                            class="axis-label"
                            text-anchor="end"
                        >
                            {Math.round(territoryChartData().maxY)}
                        </text>
                        <text
                            x={padding.left - 5}
                            y={padding.top + innerHeight}
                            class="axis-label"
                            text-anchor="end"
                        >
                            0
                        </text>

                        <!-- X-axis label -->
                        <text
                            x={padding.left + innerWidth / 2}
                            y={chartHeight - 5}
                            class="axis-label"
                            text-anchor="middle"
                        >
                            Tick
                        </text>

                        <!-- Lines -->
                        {#each territoryChartData().lines as line}
                            <polyline
                                points={line.points}
                                fill="none"
                                stroke={line.color}
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                        {/each}
                    </svg>

                    <!-- Legend -->
                    <div class="chart-legend">
                        {#each territoryChartData().lines as line}
                            <div class="legend-item">
                                <span
                                    class="legend-dot"
                                    style="background: {line.color}"
                                ></span>
                                <span class="legend-label"
                                    >{formatPlayerId(line.playerId)}</span
                                >
                            </div>
                        {/each}
                    </div>
                </div>
            {:else if activeTab === "activity"}
                <!-- Combat Activity Chart -->
                <div class="chart-container">
                    <h3 class="chart-title">Combat Intensity Over Time</h3>
                    <svg viewBox="0 0 {chartWidth} {chartHeight}" class="chart">
                        <!-- Grid lines -->
                        <g class="grid">
                            {#each [0, 0.25, 0.5, 0.75, 1] as ratio}
                                <line
                                    x1={padding.left}
                                    y1={padding.top + innerHeight * (1 - ratio)}
                                    x2={padding.left + innerWidth}
                                    y2={padding.top + innerHeight * (1 - ratio)}
                                    stroke="rgba(255,255,255,0.1)"
                                />
                            {/each}
                        </g>

                        <!-- Axes -->
                        <line
                            x1={padding.left}
                            y1={padding.top}
                            x2={padding.left}
                            y2={padding.top + innerHeight}
                            stroke="rgba(255,255,255,0.3)"
                        />
                        <line
                            x1={padding.left}
                            y1={padding.top + innerHeight}
                            x2={padding.left + innerWidth}
                            y2={padding.top + innerHeight}
                            stroke="rgba(255,255,255,0.3)"
                        />

                        <!-- Y-axis labels -->
                        <text
                            x={padding.left - 5}
                            y={padding.top + 5}
                            class="axis-label"
                            text-anchor="end"
                        >
                            {Math.round(activityChartData().maxY)}
                        </text>
                        <text
                            x={padding.left - 5}
                            y={padding.top + innerHeight}
                            class="axis-label"
                            text-anchor="end"
                        >
                            0
                        </text>

                        <!-- Bars -->
                        {#each activityChartData().bars as bar}
                            <rect
                                x={bar.x}
                                y={bar.y}
                                width={bar.width}
                                height={Math.max(0, bar.height)}
                                fill={bar.conquest > 0 ? "#ef4444" : "#4488ff"}
                                opacity="0.7"
                            />
                        {/each}
                    </svg>

                    <!-- Legend -->
                    <div class="chart-legend">
                        <div class="legend-item">
                            <span class="legend-dot" style="background: #4488ff"
                            ></span>
                            <span class="legend-label">Combat</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-dot" style="background: #ef4444"
                            ></span>
                            <span class="legend-label">Conquest</span>
                        </div>
                    </div>
                </div>
            {/if}
        </section>

        <!-- Actions -->
        <section class="results-actions">
            <button class="btn btn--primary btn--lg" onclick={handlePlayAgain}>
                Play Again
            </button>
            <button class="btn btn--secondary" onclick={handleReturnToMenu}>
                Main Menu
            </button>
        </section>
    </div>
</div>

<style>
    .results-modal {
        width: 100%;
        max-width: 450px;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        text-align: center;
        background: rgba(10, 15, 25, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }

    .results-header {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .results-title {
        font-size: 2rem;
        letter-spacing: 0.15em;
        margin: 0;
        font-family: "Exo", sans-serif;
    }

    .results-title.victory {
        color: #22c55e;
        text-shadow: 0 0 30px rgba(34, 197, 94, 0.5);
    }

    .results-title.defeat {
        color: #ef4444;
        text-shadow: 0 0 30px rgba(239, 68, 68, 0.5);
    }

    .winner-name {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        color: #888;
        font-size: 14px;
        margin: 0;
    }

    .winner-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
    }

    /* Tab Navigation */
    .tab-nav {
        display: flex;
        gap: 4px;
        background: rgba(0, 0, 0, 0.3);
        padding: 4px;
        border-radius: 8px;
    }

    .tab-btn {
        flex: 1;
        padding: 8px 12px;
        border: none;
        background: transparent;
        color: #666;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        cursor: pointer;
        border-radius: 6px;
        transition: all 0.2s;
        font-family: inherit;
    }

    .tab-btn:hover {
        color: #aaa;
        background: rgba(255, 255, 255, 0.05);
    }

    .tab-btn.active {
        color: #00ffff;
        background: rgba(0, 255, 255, 0.1);
    }

    /* Tab Content */
    .tab-content {
        min-height: 200px;
    }

    /* Stats Grid */
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
    }

    .stat-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
    }

    .stat-value {
        font-size: 1.5rem;
        color: #00ffff;
        font-family: "Exo", sans-serif;
    }

    .stat-label {
        font-size: 10px;
        color: #666;
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    /* Chart Styles */
    .chart-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .chart-title {
        font-size: 12px;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin: 0;
        font-weight: 600;
    }

    .chart {
        width: 100%;
        height: auto;
    }

    .axis-label {
        font-size: 9px;
        fill: #666;
        font-family: monospace;
    }

    .chart-legend {
        display: flex;
        justify-content: center;
        gap: 16px;
        flex-wrap: wrap;
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .legend-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
    }

    .legend-label {
        font-size: 11px;
        color: #888;
    }

    /* Actions */
    .results-actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 8px;
    }

    .btn {
        padding: 12px 20px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-family: "Exo", sans-serif;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        transition: all 0.2s;
    }

    .btn--primary {
        background: linear-gradient(180deg, #00cccc, #0088aa);
        color: #000;
        font-size: 14px;
    }

    .btn--primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 0 20px rgba(0, 204, 204, 0.4);
    }

    .btn--secondary {
        background: transparent;
        border: 1px solid #445;
        color: #888;
        font-size: 12px;
    }

    .btn--secondary:hover {
        border-color: #667;
        color: #ccc;
    }
</style>
