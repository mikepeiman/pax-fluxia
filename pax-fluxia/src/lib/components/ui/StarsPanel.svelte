<script lang="ts">
    import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
    import { selectedStarStore } from "$lib/stores/selectedStarStore.svelte";
    import { STAR_TYPE_STATS } from "@pax/common";
    import type { StarType } from "@pax/common";

    const TYPE_INFO: Record<
        string,
        { label: string; shape: string; color: string }
    > = {
        green: { label: "ATK", shape: "▲", color: "#22c55e" },
        red: { label: "DEF", shape: "◼", color: "#ef4444" },
        yellow: { label: "PROD", shape: "⬠", color: "#fbbf24" },
        purple: { label: "REPAIR", shape: "⬡", color: "#a855f7" },
        blue: { label: "MOVE", shape: "⬡", color: "#3b82f6" },
        grey: { label: "BAL", shape: "●", color: "#8899aa" },
    };

    // Player color lookup
    function getPlayerColor(ownerId: string | null): string {
        if (!ownerId) return "#557";
        const players = activeGameStore.players as any[];
        const player = players.find((p: any) => p.id === ownerId);
        return player?.color || "#557";
    }

    // Selected star detail
    let selectedStar = $derived.by(() => {
        const id = selectedStarStore.id;
        if (!id) return null;
        return activeGameStore.stars.find((s: any) => s.id === id) ?? null;
    });

    let selectedInfo = $derived.by(() => {
        if (!selectedStar) return null;
        const type = (selectedStar.starType || "grey") as string;
        const stats =
            STAR_TYPE_STATS[type as StarType] ?? STAR_TYPE_STATS["grey"];
        const ti = TYPE_INFO[type] ?? TYPE_INFO["grey"];
        return {
            id: selectedStar.id,
            type,
            typeLabel: ti.label,
            typeShape: ti.shape,
            typeColor: ti.color,
            owner: selectedStar.ownerId || "neutral",
            ownerColor: getPlayerColor(selectedStar.ownerId),
            activeShips: selectedStar.activeShips,
            damagedShips: selectedStar.damagedShips,
            totalShips: selectedStar.activeShips + selectedStar.damagedShips,
            prodMult: stats.prod,
            repairMult: stats.repair,
            speedMult: stats.speed,
            defenseMult: stats.defense,
            attackMult: stats.attack,
            hasTarget: !!selectedStar.targetId,
            targetId: selectedStar.targetId,
            lastCombatTick: selectedStar.lastCombatTick,
            productionOverflow: selectedStar.productionOverflow,
            repairOverflow: selectedStar.repairOverflow,
        };
    });

    // All stars list sorted by type then id
    let allStars = $derived.by(() => {
        const stars = activeGameStore.stars as any[];
        return [...stars].sort((a: any, b: any) => {
            // Sort by type, then by id
            if (a.starType !== b.starType)
                return a.starType.localeCompare(b.starType);
            return a.id.localeCompare(b.id);
        });
    });

    function selectStar(id: string) {
        selectedStarStore.select(id);
    }
</script>

<div class="stars-panel">
    <!-- SELECTED STAR DETAIL -->
    <div class="selected-section">
        <div class="section-title">Selected Star</div>
        {#if selectedInfo}
            <div class="selected-detail">
                <div class="detail-header">
                    <span
                        class="type-icon"
                        style="color: {selectedInfo.typeColor}"
                        >{selectedInfo.typeShape}</span
                    >
                    <span class="star-name">{selectedInfo.id}</span>
                    <span
                        class="type-chip"
                        style="background: {selectedInfo.typeColor}22; color: {selectedInfo.typeColor}; border: 1px solid {selectedInfo.typeColor}44"
                        >{selectedInfo.typeLabel}</span
                    >
                    <span
                        class="owner-dot"
                        style="background: {selectedInfo.ownerColor}"
                    ></span>
                    <button
                        class="close-btn"
                        onclick={() => selectedStarStore.deselect()}>✕</button
                    >
                </div>

                <div class="detail-stats">
                    <div class="detail-row">
                        <span class="label">Ships</span>
                        <span class="value">
                            <span class="active"
                                >{selectedInfo.activeShips}</span
                            >
                            {#if selectedInfo.damagedShips > 0}
                                <span class="damaged"
                                    >+{selectedInfo.damagedShips} dmg</span
                                >
                            {/if}
                            <span class="total"
                                >= {selectedInfo.totalShips}</span
                            >
                        </span>
                    </div>

                    <div class="detail-row">
                        <span class="label">Mults</span>
                        <span class="value mult-row">
                            {#if selectedInfo.prodMult !== 1}<span
                                    style="color: #fbbf24"
                                    >⚙{selectedInfo.prodMult}×</span
                                >{/if}
                            {#if selectedInfo.repairMult !== 1}<span
                                    style="color: #a855f7"
                                    >🔧{selectedInfo.repairMult}×</span
                                >{/if}
                            {#if selectedInfo.speedMult !== 1}<span
                                    style="color: #3b82f6"
                                    >⚡{selectedInfo.speedMult}×</span
                                >{/if}
                            {#if selectedInfo.defenseMult !== 1}<span
                                    style="color: #ef4444"
                                    >🛡{selectedInfo.defenseMult}×</span
                                >{/if}
                            {#if selectedInfo.attackMult !== 1}<span
                                    style="color: #22c55e"
                                    >⚔{selectedInfo.attackMult}×</span
                                >{/if}
                            {#if selectedInfo.prodMult === 1 && selectedInfo.repairMult === 1 && selectedInfo.speedMult === 1 && selectedInfo.defenseMult === 1 && selectedInfo.attackMult === 1}
                                <span style="color: #556">all 1×</span>
                            {/if}
                        </span>
                    </div>

                    <div class="detail-row">
                        <span class="label">Target</span>
                        <span class="value"
                            >{selectedInfo.hasTarget
                                ? selectedInfo.targetId
                                : "–"}</span
                        >
                    </div>

                    <div class="detail-row">
                        <span class="label">Overflow</span>
                        <span class="value overflow"
                            >prod:{selectedInfo.productionOverflow.toFixed(2)} rep:{selectedInfo.repairOverflow.toFixed(
                                2,
                            )}</span
                        >
                    </div>

                    {#if selectedInfo.lastCombatTick >= 0}
                        <div class="detail-row combat-active">
                            <span class="label">⚔ Combat</span>
                            <span class="value"
                                >tick {selectedInfo.lastCombatTick}</span
                            >
                        </div>
                    {/if}
                </div>
            </div>
        {:else}
            <div class="empty-hint">Click a star to inspect</div>
        {/if}
    </div>

    <!-- ALL STARS LIST -->
    <div class="list-section">
        <div class="section-title">
            All Stars <span class="count">({allStars.length})</span>
        </div>
        <div class="star-list">
            {#each allStars as s (s.id)}
                {@const type = (s.starType || "grey") as string}
                {@const ti = TYPE_INFO[type] ?? TYPE_INFO["grey"]}
                {@const isSelected = selectedStarStore.id === s.id}
                {@const ownerColor = getPlayerColor(s.ownerId)}
                <button
                    class="star-row"
                    class:selected={isSelected}
                    onclick={() => selectStar(s.id)}
                >
                    <span class="row-owner" style="background: {ownerColor}"
                    ></span>
                    <span class="row-type" style="color: {ti.color}"
                        >{ti.shape}</span
                    >
                    <span class="row-id">{s.id}</span>
                    <span
                        class="row-chip"
                        style="background: {ti.color}20; color: {ti.color}"
                        >{ti.label}</span
                    >
                    <span class="row-ships">
                        <span class="active">{s.activeShips}</span>
                        {#if s.damagedShips > 0}
                            <span class="damaged">+{s.damagedShips}</span>
                        {/if}
                    </span>
                </button>
            {/each}
        </div>
    </div>
</div>

<style>
    .stars-panel {
        display: flex;
        flex-direction: column;
        max-height: calc(100vh - 100px);
        width: 280px;
        gap: 0;
        font-size: 12px;
        color: #c8d0e0;
        background: rgba(10, 14, 20, 0.92);
        border: 1px solid rgba(100, 120, 160, 0.3);
        border-radius: 8px;
        backdrop-filter: blur(8px);
        overflow: hidden;
    }

    .section-title {
        font-family: "Exo", sans-serif;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #6478a0;
        padding: 6px 10px 4px;
        border-bottom: 1px solid rgba(100, 120, 160, 0.15);
    }
    .section-title .count {
        font-weight: 400;
        color: #445;
    }

    /* ── SELECTED STAR DETAIL ── */
    .selected-section {
        flex-shrink: 0;
        border-bottom: 1px solid rgba(100, 120, 160, 0.2);
        padding-bottom: 4px;
    }

    .selected-detail {
        padding: 6px 10px;
    }

    .detail-header {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 6px;
    }

    .type-icon {
        font-size: 16px;
    }
    .star-name {
        font-family: "JetBrains Mono", "Exo", monospace;
        font-size: 12px;
        font-weight: 600;
        flex: 1;
    }
    .type-chip {
        font-size: 9px;
        padding: 1px 5px;
        border-radius: 3px;
        font-weight: 700;
        letter-spacing: 0.5px;
    }
    .owner-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
    }
    .close-btn {
        background: none;
        border: none;
        color: #556;
        cursor: pointer;
        font-size: 13px;
        padding: 0 2px;
        line-height: 1;
    }
    .close-btn:hover {
        color: #fff;
    }

    .detail-stats {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1px 0;
    }

    .detail-row .label {
        color: #6478a0;
        font-size: 10px;
        min-width: 55px;
    }
    .detail-row .value {
        font-family: "JetBrains Mono", monospace;
        font-size: 10px;
        text-align: right;
    }
    .detail-row .overflow {
        color: #556;
        font-size: 9px;
    }
    .detail-row.combat-active {
        background: rgba(239, 68, 68, 0.08);
        border-radius: 3px;
        padding: 2px 4px;
    }
    .detail-row.combat-active .label {
        color: #f87171;
    }

    .mult-row {
        display: flex;
        gap: 4px;
        font-weight: 600;
    }

    .active {
        color: #4ade80;
        font-weight: 600;
    }
    .damaged {
        color: #f87171;
        font-size: 10px;
    }
    .total {
        color: #667;
        font-size: 10px;
    }

    .empty-hint {
        color: #445;
        font-style: italic;
        text-align: center;
        padding: 10px 0;
        font-size: 11px;
    }

    /* ── ALL STARS LIST ── */
    .list-section {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
    }

    .star-list {
        flex: 1;
        overflow-y: auto;
        padding: 2px 0;
    }

    .star-list::-webkit-scrollbar {
        width: 4px;
    }
    .star-list::-webkit-scrollbar-track {
        background: transparent;
    }
    .star-list::-webkit-scrollbar-thumb {
        background: rgba(100, 120, 160, 0.3);
        border-radius: 2px;
    }

    .star-row {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 3px 10px;
        cursor: pointer;
        border: none;
        background: transparent;
        color: inherit;
        font: inherit;
        width: 100%;
        text-align: left;
        transition: background 0.1s;
    }
    .star-row:hover {
        background: rgba(100, 120, 160, 0.1);
    }
    .star-row.selected {
        background: rgba(100, 120, 160, 0.18);
        border-left: 2px solid #6478a0;
    }

    .row-owner {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        flex-shrink: 0;
    }
    .row-type {
        font-size: 12px;
        flex-shrink: 0;
        width: 14px;
        text-align: center;
    }
    .row-id {
        font-family: "JetBrains Mono", monospace;
        font-size: 10px;
        color: #8899aa;
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .row-chip {
        font-size: 8px;
        padding: 0 4px;
        border-radius: 2px;
        font-weight: 700;
        letter-spacing: 0.3px;
        flex-shrink: 0;
    }
    .row-ships {
        font-family: "JetBrains Mono", monospace;
        font-size: 10px;
        text-align: right;
        min-width: 40px;
        flex-shrink: 0;
    }
</style>
