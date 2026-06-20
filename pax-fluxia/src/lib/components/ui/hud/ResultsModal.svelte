<script lang="ts">
    import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
    import { gameStore } from "$lib/stores/gameStore.svelte";
    import type { GameHistoryEntry } from "$lib/types/game.types";
    import { onMount } from "svelte";
    import { audioManager } from "$lib/services/audioManager.svelte";
    import PaxSettingsToggleRow from "$lib/design-system/components/PaxSettingsToggleRow.svelte";

    // Props
    let { onClose }: { onClose?: () => void } = $props();

    // Tab state
    let activeTab = $state<"overview" | "power" | "territory" | "activity">(
        "power",
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

    // Chart dimensions — much larger now
    const chartWidth = 700;
    const chartHeight = 320;
    const padding = { top: 30, right: 30, bottom: 40, left: 60 };
    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;

    // Downsample history for smoother charts (every 10th tick)
    const sampledHistory = $derived(() => {
        if (history.length <= 80) return history;
        const step = Math.ceil(history.length / 80);
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
        const barWidth = Math.max(3, innerWidth / data.length - 1);

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
        audioManager.play("click");
        activeGameStore.playAgain();
    }

    function handleReturnToMenu() {
        audioManager.play("click");
        activeGameStore.returnToMenu();
    }

    // F-70: Save map
    let saveMapName = $state("");
    let showSaveMapDone = $state(false);
    function handleSaveMap() {
        if (!saveMapName.trim()) return;
        gameStore.saveCurrentMap(saveMapName.trim());
        showSaveMapDone = true;
        setTimeout(() => (showSaveMapDone = false), 2000);
    }

    // F-71: Restart options
    let showRestartOptions = $state(false);
    let reuseMap = $state(true);
    let samePositions = $state(true);
    function handleRestart() {
        activeGameStore.playAgain(reuseMap);
    }

    // Get final scoreboard from last history entry
    const finalScoreboard = $derived.by(() => {
        if (!history || history.length === 0) return [];
        const last = history[history.length - 1];
        if (!last?.players) return [];
        return [...last.players].sort((a, b) => b.totalShips - a.totalShips);
    });

    onMount(() => {
        if (victory) {
            audioManager.play("win");
        } else {
            audioManager.play("lose");
        }
    });
</script>

<div class="modal-backdrop">
    <div class="results-modal animate-slide-up">
        <!-- Ambient glow behind title -->
        <div class="ambient-glow" class:victory class:defeat={!victory}></div>

        <!-- Close button -->
        {#if onClose}
            <button class="results-close" onclick={onClose} title="Close"
                >✕</button
            >
        {/if}

        <!-- Header -->
        <header class="results-header">
            <div class="title-wrapper">
                <h1 class="results-title" class:victory class:defeat={!victory}>
                    {victory ? "VICTORY" : "DEFEAT"}
                </h1>
                <div
                    class="title-underline"
                    class:victory
                    class:defeat={!victory}
                ></div>
            </div>

            {#if winner}
                <p class="winner-name">
                    <span
                        class="winner-dot"
                        style="background-color: {winner.color}; box-shadow: 0 0 12px {winner.color}"
                    ></span>
                    <span class="winner-text">{winner.name}</span>
                    <span class="winner-subtitle">conquers the galaxy</span>
                </p>
            {/if}
        </header>

        <!-- Stats Row - always visible at top -->
        <div class="stats-row">
            <div class="stat-card">
                <span class="stat-icon">⏱</span>
                <span class="stat-value">{elapsedTime}</span>
                <span class="stat-label">Duration</span>
            </div>
            <div class="stat-card">
                <span class="stat-icon">⚡</span>
                <span class="stat-value">{engineStats.totalTicks}</span>
                <span class="stat-label">Ticks</span>
            </div>
            <div class="stat-card">
                <span class="stat-icon">🚀</span>
                <span class="stat-value"
                    >{engineStats.peakFleetSize.toLocaleString()}</span
                >
                <span class="stat-label">Peak Fleet</span>
            </div>
            <div class="stat-card">
                <span class="stat-icon">⭐</span>
                <span class="stat-value">{engineStats.starsCaptured}</span>
                <span class="stat-label">Conquests</span>
            </div>
        </div>

        <!-- Tab Navigation -->
        <nav class="tab-nav">
            <button
                class="tab-btn"
                class:active={activeTab === "overview"}
                onclick={() => (activeTab = "overview")}
            >
                <span class="tab-icon">📊</span>
                Scoreboard
            </button>
            <button
                class="tab-btn"
                class:active={activeTab === "power"}
                onclick={() => (activeTab = "power")}
            >
                <span class="tab-icon">💪</span>
                Power
            </button>
            <button
                class="tab-btn"
                class:active={activeTab === "territory"}
                onclick={() => (activeTab = "territory")}
            >
                <span class="tab-icon">🗺️</span>
                Territory
            </button>
            <button
                class="tab-btn"
                class:active={activeTab === "activity"}
                onclick={() => (activeTab = "activity")}
            >
                <span class="tab-icon">⚔️</span>
                Combat
            </button>
        </nav>

        <!-- Tab Content -->
        <section class="tab-content">
            {#if activeTab === "overview"}
                <!-- Scoreboard -->
                <div class="scoreboard">
                    <div class="scoreboard-header">
                        <span class="sb-rank">#</span>
                        <span class="sb-player">Player</span>
                        <span class="sb-stat">Stars</span>
                        <span class="sb-stat">Ships</span>
                        <span class="sb-stat">Fleet</span>
                    </div>
                    {#each finalScoreboard as player, i}
                        <div
                            class="scoreboard-row"
                            class:winner-row={i === 0}
                            class:you-row={player.id === "human-player" ||
                                player.id === activeGameStore.localPlayerId}
                        >
                            <span class="sb-rank">{i + 1}</span>
                            <span class="sb-player">
                                <span
                                    class="sb-dot"
                                    style="background: {playerColorMap[
                                        player.id
                                    ] ||
                                        '#666'}; box-shadow: 0 0 8px {playerColorMap[
                                        player.id
                                    ] || '#666'}80"
                                ></span>
                                {formatPlayerId(player.id)}
                            </span>
                            <span class="sb-stat">{player.starCount}</span>
                            <span class="sb-stat"
                                >{player.totalShips.toLocaleString()}</span
                            >
                            <span class="sb-stat"
                                >{(
                                    player.totalShips +
                                        (player as any).damagedShips || 0
                                ).toLocaleString()}</span
                            >
                        </div>
                    {:else}
                        <div class="scoreboard-row">
                            <span
                                class="sb-player"
                                style="grid-column: 1 / -1; text-align: center; opacity: 0.5"
                                >No player data available</span
                            >
                        </div>
                    {/each}
                </div>
            {:else if activeTab === "power"}
                <!-- Power Over Time Chart -->
                <div class="chart-container">
                    <h3 class="chart-title">Fleet Strength Over Time</h3>
                    <svg viewBox="0 0 {chartWidth} {chartHeight}" class="chart">
                        <!-- Gradient background -->
                        <defs>
                            <linearGradient
                                id="chartBg"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop
                                    offset="0%"
                                    stop-color="rgba(0,255,255,0.03)"
                                />
                                <stop
                                    offset="100%"
                                    stop-color="rgba(0,0,0,0)"
                                />
                            </linearGradient>
                        </defs>
                        <rect
                            x={padding.left}
                            y={padding.top}
                            width={innerWidth}
                            height={innerHeight}
                            fill="url(#chartBg)"
                            rx="4"
                        />

                        <!-- Grid lines -->
                        <g class="grid">
                            {#each [0, 0.25, 0.5, 0.75, 1] as ratio}
                                <line
                                    x1={padding.left}
                                    y1={padding.top + innerHeight * (1 - ratio)}
                                    x2={padding.left + innerWidth}
                                    y2={padding.top + innerHeight * (1 - ratio)}
                                    stroke="rgba(255,255,255,0.06)"
                                    stroke-dasharray="4,4"
                                />
                            {/each}
                        </g>

                        <!-- Axes -->
                        <line
                            x1={padding.left}
                            y1={padding.top}
                            x2={padding.left}
                            y2={padding.top + innerHeight}
                            stroke="rgba(255,255,255,0.2)"
                        />
                        <line
                            x1={padding.left}
                            y1={padding.top + innerHeight}
                            x2={padding.left + innerWidth}
                            y2={padding.top + innerHeight}
                            stroke="rgba(255,255,255,0.2)"
                        />

                        <!-- Y-axis labels -->
                        <text
                            x={padding.left - 8}
                            y={padding.top + 5}
                            class="axis-label"
                            text-anchor="end"
                            >{Math.round(powerChartData().maxY)}</text
                        >
                        <text
                            x={padding.left - 8}
                            y={padding.top + innerHeight}
                            class="axis-label"
                            text-anchor="end">0</text
                        >

                        <!-- X-axis label -->
                        <text
                            x={padding.left + innerWidth / 2}
                            y={chartHeight - 8}
                            class="axis-label"
                            text-anchor="middle">Tick</text
                        >

                        <!-- Lines with glow -->
                        {#each powerChartData().lines as line}
                            <polyline
                                points={line.points}
                                fill="none"
                                stroke={line.color}
                                stroke-width="3"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                opacity="0.3"
                                filter="blur(4px)"
                            />
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
                                    style="background: {line.color}; box-shadow: 0 0 6px {line.color}"
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
                        <defs>
                            <linearGradient
                                id="chartBg2"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop
                                    offset="0%"
                                    stop-color="rgba(168,85,247,0.03)"
                                />
                                <stop
                                    offset="100%"
                                    stop-color="rgba(0,0,0,0)"
                                />
                            </linearGradient>
                        </defs>
                        <rect
                            x={padding.left}
                            y={padding.top}
                            width={innerWidth}
                            height={innerHeight}
                            fill="url(#chartBg2)"
                            rx="4"
                        />

                        <g class="grid">
                            {#each [0, 0.25, 0.5, 0.75, 1] as ratio}
                                <line
                                    x1={padding.left}
                                    y1={padding.top + innerHeight * (1 - ratio)}
                                    x2={padding.left + innerWidth}
                                    y2={padding.top + innerHeight * (1 - ratio)}
                                    stroke="rgba(255,255,255,0.06)"
                                    stroke-dasharray="4,4"
                                />
                            {/each}
                        </g>

                        <line
                            x1={padding.left}
                            y1={padding.top}
                            x2={padding.left}
                            y2={padding.top + innerHeight}
                            stroke="rgba(255,255,255,0.2)"
                        />
                        <line
                            x1={padding.left}
                            y1={padding.top + innerHeight}
                            x2={padding.left + innerWidth}
                            y2={padding.top + innerHeight}
                            stroke="rgba(255,255,255,0.2)"
                        />

                        <text
                            x={padding.left - 8}
                            y={padding.top + 5}
                            class="axis-label"
                            text-anchor="end"
                            >{Math.round(territoryChartData().maxY)}</text
                        >
                        <text
                            x={padding.left - 8}
                            y={padding.top + innerHeight}
                            class="axis-label"
                            text-anchor="end">0</text
                        >
                        <text
                            x={padding.left + innerWidth / 2}
                            y={chartHeight - 8}
                            class="axis-label"
                            text-anchor="middle">Tick</text
                        >

                        {#each territoryChartData().lines as line}
                            <polyline
                                points={line.points}
                                fill="none"
                                stroke={line.color}
                                stroke-width="3"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                opacity="0.3"
                                filter="blur(4px)"
                            />
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

                    <div class="chart-legend">
                        {#each territoryChartData().lines as line}
                            <div class="legend-item">
                                <span
                                    class="legend-dot"
                                    style="background: {line.color}; box-shadow: 0 0 6px {line.color}"
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
                        <defs>
                            <linearGradient
                                id="barGrad"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop offset="0%" stop-color="#4488ff" />
                                <stop offset="100%" stop-color="#2244aa" />
                            </linearGradient>
                            <linearGradient
                                id="barGradConquest"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop offset="0%" stop-color="#ff4444" />
                                <stop offset="100%" stop-color="#aa2222" />
                            </linearGradient>
                        </defs>

                        <g class="grid">
                            {#each [0, 0.25, 0.5, 0.75, 1] as ratio}
                                <line
                                    x1={padding.left}
                                    y1={padding.top + innerHeight * (1 - ratio)}
                                    x2={padding.left + innerWidth}
                                    y2={padding.top + innerHeight * (1 - ratio)}
                                    stroke="rgba(255,255,255,0.06)"
                                    stroke-dasharray="4,4"
                                />
                            {/each}
                        </g>

                        <line
                            x1={padding.left}
                            y1={padding.top}
                            x2={padding.left}
                            y2={padding.top + innerHeight}
                            stroke="rgba(255,255,255,0.2)"
                        />
                        <line
                            x1={padding.left}
                            y1={padding.top + innerHeight}
                            x2={padding.left + innerWidth}
                            y2={padding.top + innerHeight}
                            stroke="rgba(255,255,255,0.2)"
                        />

                        <text
                            x={padding.left - 8}
                            y={padding.top + 5}
                            class="axis-label"
                            text-anchor="end"
                            >{Math.round(activityChartData().maxY)}</text
                        >
                        <text
                            x={padding.left - 8}
                            y={padding.top + innerHeight}
                            class="axis-label"
                            text-anchor="end">0</text
                        >

                        {#each activityChartData().bars as bar}
                            <rect
                                x={bar.x}
                                y={bar.y}
                                width={bar.width}
                                height={Math.max(0, bar.height)}
                                fill={bar.conquest > 0
                                    ? "url(#barGradConquest)"
                                    : "url(#barGrad)"}
                                opacity="0.85"
                                rx="1"
                            />
                        {/each}
                    </svg>

                    <div class="chart-legend">
                        <div class="legend-item">
                            <span
                                class="legend-dot"
                                style="background: var(--pax-color-player-blue); box-shadow: 0 0 6px var(--pax-color-player-blue)"
                            ></span>
                            <span class="legend-label">Combat</span>
                        </div>
                        <div class="legend-item">
                            <span
                                class="legend-dot"
                                style="background: var(--pax-ui-danger); box-shadow: 0 0 6px var(--pax-ui-danger)"
                            ></span>
                            <span class="legend-label">Conquest</span>
                        </div>
                    </div>
                </div>
            {/if}
        </section>

        <!-- Actions -->
        <section class="results-actions">
            {#if !showRestartOptions}
                <button
                    class="btn btn--primary"
                    onclick={() => (showRestartOptions = true)}
                >
                    <span class="btn-glow"></span>
                    Play Again
                </button>
            {:else}
                <div class="restart-options">
                    <!-- Save Map (F-70) -->
                    <div class="restart-row">
                        <input
                            type="text"
                            class="save-map-input"
                            placeholder="Map name..."
                            bind:value={saveMapName}
                            maxlength="30"
                        />
                        <button
                            class="btn btn--small"
                            onclick={handleSaveMap}
                            disabled={!saveMapName.trim()}
                        >
                            {showSaveMapDone ? "✓ Saved" : "💾 Save Map"}
                        </button>
                    </div>
                    <!-- Restart Options (F-71) -->
                    <div class="restart-row">
                        <PaxSettingsToggleRow
                            label="Reuse this map"
                            checked={reuseMap}
                            onChange={(checked) => (reuseMap = checked)} />
                    </div>
                    <button class="btn btn--primary" onclick={handleRestart}>
                        <span class="btn-glow"></span>
                        RESTART
                    </button>
                </div>
            {/if}
            <button class="btn btn--secondary" onclick={handleReturnToMenu}>
                Main Menu
            </button>
        </section>
    </div>
</div>

<style>
    /* ═══════════════════════════════════════ */
    /*  FULLSCREEN RESULTS MODAL              */
    /* ═══════════════════════════════════════ */

    .modal-backdrop {
        position: absolute;
        inset: 0;
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        backdrop-filter: none;
    }

    .results-close {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 36px;
        height: 36px;
        background: color-mix(in srgb, var(--pax-ui-text-strong) 6%, transparent);
        border: 1px solid color-mix(in srgb, var(--pax-ui-text-strong) 15%, transparent);
        border-radius: 50%;
        color: color-mix(in srgb, var(--pax-ui-text-strong) 60%, transparent);
        font-size: var(--pax-type-base);
        cursor: pointer;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s;
    }
    .results-close:hover {
        background: color-mix(in srgb, var(--pax-ui-danger) 20%, transparent);
        color: var(--pax-ui-danger);
        border-color: color-mix(in srgb, var(--pax-ui-danger) 30%, transparent);
    }

    .results-modal {
        position: relative;
        width: 92vw;
        max-width: 900px;
        max-height: 92vh;
        overflow-y: auto;
        padding: var(--pax-space-12) 56px;
        display: flex;
        flex-direction: column;
        gap: 28px;
        text-align: center;
        background: linear-gradient(
            170deg,
            color-mix(in srgb, var(--pax-color-void) 97%, transparent) 0%,
            color-mix(in srgb, var(--pax-color-void) 98%, transparent) 50%,
            color-mix(in srgb, var(--pax-color-void) 97%, transparent) 100%
        );
        border: 1px solid color-mix(in srgb, var(--pax-ui-text-strong) 8%, transparent);
        border-radius: 20px;
        box-shadow:
            0 0 80px color-mix(in srgb, var(--pax-color-void) 60%, transparent),
            0 0 200px rgba(0, 100, 150, 0.08),
            inset 0 1px 0 color-mix(in srgb, var(--pax-ui-text-strong) 6%, transparent);
    }

    /* Ambient glow behind the title */
    .ambient-glow {
        position: absolute;
        top: -40px;
        left: 50%;
        transform: translateX(-50%);
        width: 400px;
        height: 200px;
        border-radius: 50%;
        pointer-events: none;
        filter: blur(80px);
        opacity: 0.4;
    }
    .ambient-glow.victory {
        background: radial-gradient(circle, var(--pax-ui-success), transparent 70%);
    }
    .ambient-glow.defeat {
        background: radial-gradient(circle, var(--pax-ui-danger), transparent 70%);
    }

    /* Slide-up entrance */
    .animate-slide-up {
        animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(60px) scale(0.95);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    /* ── Header ─────────────────────────── */
    .results-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--pax-space-4);
        position: relative;
        z-index: 1;
    }

    .title-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--pax-space-2);
    }

    .results-title {
        font-size: 4.5rem;
        letter-spacing: 0.25em;
        margin: 0;
        font-family: var(--pax-ui-font-display);
        font-weight: var(--pax-weight-black);
        line-height: 1;
    }
    .results-title.victory {
        color: var(--pax-ui-success);
        text-shadow:
            0 0 40px color-mix(in srgb, var(--pax-ui-success) 60%, transparent),
            0 0 80px color-mix(in srgb, var(--pax-ui-success) 30%, transparent),
            0 2px 4px color-mix(in srgb, var(--pax-color-void) 50%, transparent);
    }
    .results-title.defeat {
        color: var(--pax-ui-danger);
        text-shadow:
            0 0 40px color-mix(in srgb, var(--pax-ui-danger) 60%, transparent),
            0 0 80px color-mix(in srgb, var(--pax-ui-danger) 30%, transparent),
            0 2px 4px color-mix(in srgb, var(--pax-color-void) 50%, transparent);
    }

    .title-underline {
        width: 200px;
        height: 2px;
        border-radius: 2px;
    }
    .title-underline.victory {
        background: linear-gradient(90deg, transparent, var(--pax-ui-success), transparent);
        box-shadow: 0 0 12px color-mix(in srgb, var(--pax-ui-success) 50%, transparent);
    }
    .title-underline.defeat {
        background: linear-gradient(90deg, transparent, var(--pax-ui-danger), transparent);
        box-shadow: 0 0 12px color-mix(in srgb, var(--pax-ui-danger) 50%, transparent);
    }

    .winner-name {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--pax-gap-sm);
        margin: 0;
    }
    .winner-dot {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        flex-shrink: 0;
    }
    .winner-text {
        color: var(--pax-ui-text-strong);
        font-size: var(--pax-type-lg);
        font-weight: var(--pax-weight-bold);
        font-family: var(--pax-ui-font-display);
    }
    .winner-subtitle {
        color: var(--pax-ui-text-dim);
        font-size: var(--pax-type-base);
        font-style: italic;
    }

    /* ── Stats Row ──────────────────────── */
    .stats-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: var(--pax-space-4);
    }
    .stat-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--pax-space-1);
        padding: var(--pax-gap-lg) var(--pax-space-3);
        background: color-mix(in srgb, var(--pax-ui-text-strong) 2.5%, transparent);
        border: 1px solid color-mix(in srgb, var(--pax-ui-text-strong) 5%, transparent);
        border-radius: 14px;
        transition: all 0.3s;
    }
    .stat-card:hover {
        background: color-mix(in srgb, var(--pax-ui-text-strong) 4%, transparent);
        border-color: color-mix(in srgb, var(--pax-ui-accent) 15%, transparent);
        transform: translateY(-2px);
    }
    .stat-icon {
        font-size: var(--pax-type-lg);
        margin-bottom: 2px;
    }
    .stat-value {
        font-size: var(--pax-type-2xl);
        color: var(--pax-ui-accent);
        font-family: var(--pax-ui-font-display);
        font-weight: var(--pax-weight-bold);
        line-height: 1.1;
        text-shadow: 0 0 20px color-mix(in srgb, var(--pax-ui-accent) 30%, transparent);
    }
    .stat-label {
        font-size: var(--pax-type-2xs);
        color: var(--pax-ui-text-dim);
        text-transform: uppercase;
        letter-spacing: 0.15em;
        font-weight: var(--pax-weight-semibold);
    }

    /* ── Tab Navigation ─────────────────── */
    .tab-nav {
        display: flex;
        gap: var(--pax-space-1);
        background: color-mix(in srgb, var(--pax-color-void) 30%, transparent);
        padding: 5px;
        border-radius: 12px;
        border: 1px solid color-mix(in srgb, var(--pax-ui-text-strong) 4%, transparent);
    }
    .tab-btn {
        flex: 1;
        padding: var(--pax-space-3) var(--pax-space-4);
        border: none;
        background: transparent;
        color: var(--pax-ui-text-dim);
        font-size: var(--pax-type-xs-plus);
        font-weight: var(--pax-weight-semibold);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        cursor: pointer;
        border-radius: 9px;
        transition: all 0.25s;
        font-family: var(--pax-ui-font-display);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--pax-gap-xs);
    }
    .tab-btn:hover {
        color: var(--pax-ui-text-soft);
        background: color-mix(in srgb, var(--pax-ui-text-strong) 4%, transparent);
    }
    .tab-btn.active {
        color: var(--pax-ui-accent);
        background: color-mix(in srgb, var(--pax-ui-accent) 8%, transparent);
        box-shadow: 0 0 20px color-mix(in srgb, var(--pax-ui-accent) 5%, transparent);
    }
    .tab-icon {
        font-size: var(--pax-type-sm-plus);
    }

    /* ── Tab Content ────────────────────── */
    .tab-content {
        min-height: 300px;
    }

    /* ── Scoreboard ─────────────────────── */
    .scoreboard {
        display: flex;
        flex-direction: column;
        gap: var(--pax-space-1);
    }
    .scoreboard-header {
        display: grid;
        grid-template-columns: 40px 1fr 80px 80px 80px;
        padding: var(--pax-space-2) var(--pax-space-4);
        font-size: var(--pax-type-3xs);
        color: var(--pax-ui-text-dim);
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-weight: var(--pax-weight-bold);
    }
    .scoreboard-row {
        display: grid;
        grid-template-columns: 40px 1fr 80px 80px 80px;
        padding: var(--pax-gap-md) var(--pax-space-4);
        background: color-mix(in srgb, var(--pax-ui-text-strong) 2%, transparent);
        border-radius: 10px;
        align-items: center;
        transition: all 0.2s;
        border: 1px solid transparent;
    }
    .scoreboard-row:hover {
        background: color-mix(in srgb, var(--pax-ui-text-strong) 4%, transparent);
    }
    .scoreboard-row.winner-row {
        background: color-mix(in srgb, var(--pax-ui-accent) 4%, transparent);
        border-color: color-mix(in srgb, var(--pax-ui-accent) 10%, transparent);
    }
    .scoreboard-row.you-row {
        border-color: color-mix(in srgb, var(--pax-ui-text-strong) 8%, transparent);
    }
    .sb-rank {
        font-size: var(--pax-type-base);
        font-weight: var(--pax-weight-extrabold);
        color: var(--pax-ui-text-dim);
        font-family: var(--pax-ui-font-display);
    }
    .winner-row .sb-rank {
        color: var(--pax-ui-accent);
    }
    .sb-player {
        display: flex;
        align-items: center;
        gap: var(--pax-gap-sm);
        font-size: var(--pax-type-sm-plus);
        font-weight: var(--pax-weight-semibold);
        color: var(--pax-ui-text);
    }
    .sb-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        flex-shrink: 0;
    }
    .sb-stat {
        font-size: var(--pax-type-sm-plus);
        font-family: var(--pax-ui-font-display);
        color: var(--pax-ui-text-dim);
        text-align: center;
        font-weight: var(--pax-weight-semibold);
    }
    .winner-row .sb-stat {
        color: var(--pax-ui-text);
    }

    /* ── Chart Styles ──────────────────── */
    .chart-container {
        display: flex;
        flex-direction: column;
        gap: var(--pax-space-4);
    }
    .chart-title {
        font-size: var(--pax-type-sm);
        color: var(--pax-ui-text-dim);
        text-transform: uppercase;
        letter-spacing: 0.12em;
        margin: 0;
        font-weight: var(--pax-weight-bold);
        font-family: var(--pax-ui-font-display);
    }
    .chart {
        width: 100%;
        height: auto;
    }
    .axis-label {
        font-size: var(--pax-type-3xs);
        fill: var(--pax-ui-text-dim);
        font-family: var(--pax-ui-font-display);
    }
    .chart-legend {
        display: flex;
        justify-content: center;
        gap: var(--pax-space-6);
        flex-wrap: wrap;
    }
    .legend-item {
        display: flex;
        align-items: center;
        gap: var(--pax-space-2);
    }
    .legend-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
    }
    .legend-label {
        font-size: var(--pax-type-xs);
        color: var(--pax-ui-text-dim);
        font-weight: var(--pax-weight-semibold);
    }

    /* ── Action Buttons ────────────────── */
    .results-actions {
        display: flex;
        gap: var(--pax-gap-md);
        justify-content: center;
        margin-top: var(--pax-space-2);
        flex-wrap: wrap;
        align-items: center;
    }
    .restart-options {
        display: flex;
        flex-direction: column;
        gap: var(--pax-gap-sm);
        align-items: center;
        padding: var(--pax-space-3) var(--pax-space-4);
        border: 1px solid color-mix(in srgb, var(--pax-ui-accent) 10%, transparent);
        border-radius: 10px;
        background: color-mix(in srgb, var(--pax-color-void) 30%, transparent);
    }
    .restart-row {
        display: flex;
        gap: var(--pax-space-2);
        align-items: center;
        width: 100%;
    }
    .save-map-input {
        flex: 1;
        background: color-mix(in srgb, var(--pax-color-void) 30%, transparent);
        border: 1px solid color-mix(in srgb, var(--pax-ui-accent) 12%, transparent);
        border-radius: 6px;
        padding: var(--pax-gap-xs) var(--pax-gap-sm);
        color: var(--pax-ui-text-soft);
        font-family: var(--pax-ui-font-techno);
        font-size: var(--pax-type-2xs);
    }
    .save-map-input::placeholder {
        color: color-mix(in srgb, var(--pax-ui-text-strong) 20%, transparent);
    }
    .btn--small {
        padding: var(--pax-gap-xs) var(--pax-gap-md);
        font-size: var(--pax-type-label);
        border-radius: 6px;
        background: color-mix(in srgb, var(--pax-ui-accent) 8%, transparent);
        border: 1px solid color-mix(in srgb, var(--pax-ui-accent) 20%, transparent);
        color: var(--pax-ui-accent);
        cursor: pointer;
        font-family: var(--pax-ui-font-techno);
        letter-spacing: 0.5px;
    }
    .btn--small:hover:not(:disabled) {
        background: color-mix(in srgb, var(--pax-ui-accent) 15%, transparent);
        color: var(--pax-ui-accent-strong);
    }
    .btn--small:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }
    .btn {
        padding: var(--pax-space-4) 40px;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-family: var(--pax-ui-font-display);
        font-weight: var(--pax-weight-bold);
        text-transform: uppercase;
        letter-spacing: 0.12em;
        transition: all 0.3s;
        position: relative;
        overflow: hidden;
    }
    .btn--primary {
        background: linear-gradient(135deg, #00ddcc, #0088cc);
        color: var(--pax-color-void);
        font-size: var(--pax-type-base);
        box-shadow: 0 4px 24px color-mix(in srgb, var(--pax-ui-accent) 25%, transparent);
    }
    .btn--primary:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 40px color-mix(in srgb, var(--pax-ui-accent) 40%, transparent);
    }
    .btn-glow {
        position: absolute;
        inset: 0;
        background: linear-gradient(
            90deg,
            transparent,
            color-mix(in srgb, var(--pax-ui-text-strong) 20%, transparent),
            transparent
        );
        transform: translateX(-100%);
        animation: shimmer 3s infinite;
    }
    @keyframes shimmer {
        0% {
            transform: translateX(-100%);
        }
        100% {
            transform: translateX(100%);
        }
    }
    .btn--secondary {
        background: transparent;
        border: 1px solid color-mix(in srgb, var(--pax-ui-text-strong) 10%, transparent);
        color: var(--pax-ui-text-dim);
        font-size: var(--pax-type-xs-plus);
    }
    .btn--secondary:hover {
        border-color: color-mix(in srgb, var(--pax-ui-text-strong) 20%, transparent);
        color: var(--pax-ui-text-soft);
        background: color-mix(in srgb, var(--pax-ui-text-strong) 3%, transparent);
    }

    /* ── Scrollbar ──────────────────────── */
    .results-modal::-webkit-scrollbar {
        width: 6px;
    }
    .results-modal::-webkit-scrollbar-track {
        background: transparent;
    }
    .results-modal::-webkit-scrollbar-thumb {
        background: color-mix(in srgb, var(--pax-ui-text-strong) 10%, transparent);
        border-radius: 3px;
    }
    .results-modal::-webkit-scrollbar-thumb:hover {
        background: color-mix(in srgb, var(--pax-ui-text-strong) 20%, transparent);
    }
</style>
