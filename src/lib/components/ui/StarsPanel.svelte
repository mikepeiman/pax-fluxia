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

    // Player colors (must match GameCanvas)
    const PLAYER_COLORS: Record<string, string> = {
        "human-player": "#0088ff",
        "ai-1": "#ff4444",
        "ai-2": "#44ff44",
        "ai-3": "#ffff44",
        "ai-4": "#aa66ff",
        "ai-5": "#ff8844",
    };

    // Local state
    let expandedPlayers: Set<string> = $state(new Set(["human-player"]));
    let expandedStars: Set<string> = $state(new Set());
    let logs: CombatLogEntry[] = $state([]);
    let showEngagedOnly: boolean = $state(false);
    let sortNewestFirst: boolean = $state(true);

    // Subscribe to combat logs
    combatLog.subscribe((value) => {
        logs = value;
    });

    // Derived: Group stars by owner
    const starsByPlayer = $derived(() => {
        const snapshot = gameStore.snapshot;
        if (!snapshot?.stars) return new Map<string, any[]>();

        const grouped = new Map<string, any[]>();

        for (const star of snapshot.stars) {
            const ownerId = star.ownerId;
            if (!grouped.has(ownerId)) {
                grouped.set(ownerId, []);
            }
            grouped.get(ownerId)!.push(star);
        }

        return grouped;
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

    // Check if star has ANY combat history (for persistent logs)
    function hasHistory(starId: string): boolean {
        return logs.some(
            (log) => log.defender.id === starId || log.attacker.id === starId,
        );
    }

    // Get combat logs for a specific star (sorted by timestamp)
    function getLogsForStar(starId: string): CombatLogEntry[] {
        const starLogs = logs.filter(
            (log) => log.defender.id === starId || log.attacker.id === starId,
        );
        const sorted = sortNewestFirst
            ? starLogs.sort((a, b) => b.timestamp - a.timestamp)
            : starLogs.sort((a, b) => a.timestamp - b.timestamp);
        return sorted.slice(0, 20);
    }

    // Get player display info with engaged count
    function getPlayerInfo(playerId: string) {
        const player = gameStore.snapshot?.players.find(
            (p) => p.id === playerId,
        );
        const playerStars = starsByPlayer()?.get(playerId) || [];
        const engagedCount = playerStars.filter((s: any) =>
            isEngaged(s.id),
        ).length;

        return {
            name: player?.isAI ? `AI-${playerId.replace("ai-", "")}` : "You",
            color: PLAYER_COLORS[playerId] || "#888888",
            starCount: playerStars.length,
            totalShips: player?.totalShips || 0,
            engagedCount,
        };
    }

    // Filter stars based on showEngagedOnly
    function filterStars(stars: any[]): any[] {
        if (!showEngagedOnly) return stars;
        return stars.filter(
            (star) => isEngaged(star.id) || hasHistory(star.id),
        );
    }

    function togglePlayer(playerId: string) {
        if (expandedPlayers.has(playerId)) {
            expandedPlayers.delete(playerId);
        } else {
            expandedPlayers.add(playerId);
        }
        expandedPlayers = new Set(expandedPlayers);
    }

    function toggleStar(starId: string) {
        if (expandedStars.has(starId)) {
            expandedStars.delete(starId);
        } else {
            expandedStars.add(starId);
        }
        expandedStars = new Set(expandedStars);
    }

    function getStarNumericId(starId: string): string {
        return starId.replace("star-", "");
    }

    function formatTime(timestamp: number): string {
        const date = new Date(timestamp);
        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        });
    }
</script>

<div class="stars-panel">
    <div class="header">
        <h3>⭐ STARS</h3>
        <div class="header-controls">
            <button
                class="filter-btn"
                class:active={showEngagedOnly}
                onclick={() => (showEngagedOnly = !showEngagedOnly)}
            >
                {showEngagedOnly ? "⚔️ Engaged" : "🌐 All"}
            </button>
            <span class="count">{gameStore.snapshot?.stars.length || 0}</span>
        </div>
    </div>

    <div class="panel-content">
        {#each Array.from(starsByPlayer()?.entries() || []) as [playerId, stars]}
            {@const info = getPlayerInfo(playerId)}
            <div class="player-group">
                <button
                    class="player-header"
                    onclick={() => togglePlayer(playerId)}
                    style="border-left-color: {info.color}"
                >
                    <span class="expand-icon"
                        >{expandedPlayers.has(playerId) ? "▼" : "►"}</span
                    >
                    <span class="player-name" style="color: {info.color}"
                        >{info.name}</span
                    >
                    <span class="player-stats">
                        {info.starCount}⭐ {info.totalShips}🚀
                        {#if info.engagedCount > 0}
                            <span class="engaged-count"
                                >⚔️{info.engagedCount}</span
                            >
                        {/if}
                    </span>
                </button>

                {#if expandedPlayers.has(playerId)}
                    <div class="star-list">
                        {#each filterStars(stars).sort((a, b) => b.activeShips - a.activeShips) as star}
                            {@const engaged = isEngaged(star.id)}
                            {@const hasLogs = hasHistory(star.id)}
                            {@const starLogs = getLogsForStar(star.id)}
                            <div
                                class="star-row"
                                class:engaged
                                class:has-history={hasLogs && !engaged}
                            >
                                <button
                                    class="star-info"
                                    onclick={() =>
                                        hasLogs && toggleStar(star.id)}
                                    disabled={!hasLogs}
                                >
                                    <!-- Star Type Icon (favicon style) -->
                                    <span
                                        class="type-icon"
                                        style="background: {STAR_TYPE_COLORS[
                                            star.starType
                                        ] || '#888'}"
                                    >
                                        {STAR_TYPE_ICONS[star.starType] || "⚪"}
                                    </span>

                                    <!-- Star ID -->
                                    <span class="star-id"
                                        >#{getStarNumericId(star.id)}</span
                                    >

                                    <!-- Ship counts -->
                                    <span class="ships">
                                        <span class="active"
                                            >{star.activeShips}</span
                                        >
                                        {#if star.damagedShips > 0}
                                            <span class="damaged"
                                                >+{star.damagedShips}🤕</span
                                            >
                                        {/if}
                                    </span>

                                    <!-- Status badges -->
                                    {#if engaged}
                                        <span class="engaged-badge">⚔️</span>
                                    {:else if hasLogs}
                                        <span class="history-badge">📜</span>
                                    {/if}
                                </button>

                                <!-- Expanded battle logs (show for any star with history) -->
                                {#if hasLogs && expandedStars.has(star.id)}
                                    <div
                                        class="battle-logs"
                                        class:active={engaged}
                                    >
                                        <div class="logs-header">
                                            <span>Battle History</span>
                                            <button
                                                class="sort-btn"
                                                onclick={() =>
                                                    (sortNewestFirst =
                                                        !sortNewestFirst)}
                                            >
                                                {sortNewestFirst
                                                    ? "↓ Newest"
                                                    : "↑ Oldest"}
                                            </button>
                                        </div>
                                        {#each starLogs as log}
                                            <div class="log-entry">
                                                <span class="tick"
                                                    >T{log.tick}</span
                                                >
                                                <span
                                                    class="type-icon mini"
                                                    style="background: {STAR_TYPE_COLORS[
                                                        log.attacker.starType
                                                    ]}"
                                                    >{STAR_TYPE_ICONS[
                                                        log.attacker.starType
                                                    ]}</span
                                                >
                                                <span class="attacker"
                                                    >#{log.attacker.id.replace(
                                                        "star-",
                                                        "",
                                                    )} ({log.attacker
                                                        .ships})</span
                                                >
                                                <span class="arrow">→</span>
                                                <span
                                                    class="type-icon mini"
                                                    style="background: {STAR_TYPE_COLORS[
                                                        log.defender.starType
                                                    ]}"
                                                    >{STAR_TYPE_ICONS[
                                                        log.defender.starType
                                                    ]}</span
                                                >
                                                <span class="defender"
                                                    >#{log.defender.id.replace(
                                                        "star-",
                                                        "",
                                                    )} ({log.defender
                                                        .ships})</span
                                                >
                                                <span
                                                    class="result {log.result.toLowerCase()}"
                                                    >{log.result}</span
                                                >
                                            </div>
                                        {/each}
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        {/each}
    </div>
</div>

<style>
    .stars-panel {
        height: 100%;
        background: rgba(10, 10, 15, 0.95);
        border-right: 1px solid #334;
        color: #eee;
        font-family: "Consolas", "Monaco", monospace;
        font-size: 11px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .header {
        padding: 12px;
        background: #1a1a25;
        border-bottom: 1px solid #334;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: bold;
    }

    .header-controls {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .filter-btn {
        padding: 4px 8px;
        background: #334;
        border: none;
        border-radius: 4px;
        color: #aaa;
        font-size: 10px;
        cursor: pointer;
        font-family: inherit;
    }

    .filter-btn:hover {
        background: #445;
    }

    .filter-btn.active {
        background: #ff6b35;
        color: #fff;
    }

    .engaged-count {
        color: #ff6b35;
        margin-left: 4px;
    }

    .history-badge {
        margin-left: auto;
        opacity: 0.6;
    }

    .star-row.has-history {
        background: rgba(100, 100, 255, 0.08);
        border-radius: 4px;
    }

    .logs-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
        padding-bottom: 4px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        font-size: 9px;
        color: #888;
    }

    .sort-btn {
        padding: 2px 6px;
        background: #334;
        border: none;
        border-radius: 3px;
        color: #aaa;
        font-size: 9px;
        cursor: pointer;
        font-family: inherit;
    }

    .sort-btn:hover {
        background: #445;
    }

    .timestamp {
        color: #666;
        font-size: 9px;
        margin-right: 4px;
    }

    .count {
        background: #334;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 10px;
    }

    .panel-content {
        flex: 1;
        overflow-y: auto;
        padding: 4px;
    }

    .player-group {
        margin-bottom: 4px;
    }

    .player-header {
        width: 100%;
        padding: 8px 10px;
        background: #1a1a25;
        border: none;
        border-left: 3px solid;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        color: #eee;
        font-family: inherit;
        font-size: 11px;
    }

    .player-header:hover {
        background: #252530;
    }

    .expand-icon {
        font-size: 8px;
        width: 10px;
    }

    .player-name {
        font-weight: bold;
    }

    .player-stats {
        margin-left: auto;
        color: #888;
        font-size: 10px;
    }

    .star-list {
        padding-left: 8px;
        border-left: 1px solid #334;
        margin-left: 4px;
    }

    .star-row {
        margin: 2px 0;
    }

    .star-row.engaged {
        background: rgba(255, 100, 50, 0.1);
        border-radius: 4px;
    }

    .star-info {
        width: 100%;
        padding: 6px 8px;
        background: transparent;
        border: none;
        cursor: default;
        display: flex;
        align-items: center;
        gap: 6px;
        color: #eee;
        font-family: inherit;
        font-size: 11px;
    }

    .star-info:not(:disabled) {
        cursor: pointer;
    }

    .star-info:not(:disabled):hover {
        background: rgba(255, 255, 255, 0.05);
    }

    .type-icon {
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 3px;
        font-size: 10px;
    }

    .type-icon.mini {
        width: 12px;
        height: 12px;
        font-size: 8px;
    }

    .star-id {
        font-weight: bold;
        width: 28px;
    }

    .ships {
        display: flex;
        gap: 4px;
    }

    .ships .active {
        color: #4ade80;
    }

    .ships .damaged {
        color: #f97316;
        font-size: 9px;
    }

    .engaged-badge {
        margin-left: auto;
        animation: pulse 1s ease-in-out infinite;
    }

    @keyframes pulse {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
    }

    .battle-logs {
        padding: 6px 8px;
        margin-left: 22px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 4px;
        border-left: 2px solid #ff6b35;
    }

    .log-entry {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 3px 0;
        font-size: 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .log-entry:last-child {
        border-bottom: none;
    }

    .tick {
        color: #888;
        width: 30px;
    }

    .arrow {
        color: #666;
    }

    .attacker {
        color: #f97316;
    }

    .defender {
        color: #60a5fa;
    }

    .result {
        margin-left: auto;
        padding: 1px 4px;
        border-radius: 2px;
        font-size: 9px;
        font-weight: bold;
    }

    .result.defense {
        background: #22c55e;
        color: #000;
    }

    .result.falling {
        background: #f97316;
        color: #000;
    }

    .result.conquered {
        background: #ef4444;
        color: #fff;
    }
</style>
