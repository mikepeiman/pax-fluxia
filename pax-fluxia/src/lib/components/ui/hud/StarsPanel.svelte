<script lang="ts">
    import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
    import { selectedStarStore } from "$lib/stores/selectedStarStore.svelte";
    import { STAR_TYPE_STATS } from "@pax/common";
    import type { StarType } from "@pax/common";
    import { GAME_CONFIG } from "$lib/config/game.config";

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

        // Force calculations
        const activeShips = selectedStar.activeShips;
        const damagedShips = selectedStar.damagedShips;
        const absolute = activeShips; // raw active ships
        const damagedBonus = Math.floor(
            damagedShips * (GAME_CONFIG.DAMAGED_SHIP_EFFECTIVENESS ?? 0.14),
        );
        const derivedDefense = Math.floor(
            (activeShips + damagedBonus) * stats.defense,
        );
        const derivedAttack = Math.floor(activeShips * stats.attack);

        // Relative: find target or attackers to compute ratio
        let relativeRatio: number | null = null;
        let relativeLabel = "";
        const allStars = activeGameStore.stars as any[];
        if (selectedStar.targetId) {
            // This star is attacking — compare our attack force vs target's defense
            const target = allStars.find(
                (s: any) => s.id === selectedStar.targetId,
            );
            if (target) {
                const tStats =
                    STAR_TYPE_STATS[(target.starType || "grey") as StarType] ??
                    STAR_TYPE_STATS["grey"];
                const tDamagedBonus = Math.floor(
                    target.damagedShips *
                        (GAME_CONFIG.DAMAGED_SHIP_EFFECTIVENESS ?? 0.14),
                );
                const tDefense = Math.floor(
                    (target.activeShips + tDamagedBonus) * tStats.defense,
                );
                relativeRatio =
                    tDefense > 0 ? derivedAttack / tDefense : Infinity;
                relativeLabel = `vs ${target.id}`;
            }
        } else {
            // Check if anyone is attacking this star
            const attackers = allStars.filter(
                (s: any) =>
                    s.targetId === selectedStar.id &&
                    s.ownerId !== selectedStar.ownerId,
            );
            if (attackers.length > 0) {
                let totalAttackForce = 0;
                attackers.forEach((a: any) => {
                    const aStats =
                        STAR_TYPE_STATS[(a.starType || "grey") as StarType] ??
                        STAR_TYPE_STATS["grey"];
                    totalAttackForce += Math.floor(
                        a.activeShips * aStats.attack,
                    );
                });
                relativeRatio =
                    totalAttackForce > 0
                        ? derivedDefense / totalAttackForce
                        : Infinity;
                relativeLabel = `vs ${attackers.length} attacker${attackers.length > 1 ? "s" : ""}`;
            }
        }

        return {
            id: selectedStar.id,
            type,
            typeLabel: ti.label,
            typeShape: ti.shape,
            typeColor: ti.color,
            owner: selectedStar.ownerId || "neutral",
            ownerColor: getPlayerColor(selectedStar.ownerId),
            activeShips,
            damagedShips,
            totalShips: activeShips + damagedShips,
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
            // Force values
            absolute,
            derivedAttack,
            derivedDefense,
            damagedBonus,
            relativeRatio,
            relativeLabel,
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
                                    >│ {selectedInfo.damagedShips} dmg</span
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
                                    style="color: var(--pax-ui-warning)"
                                    >⚙{selectedInfo.prodMult}×</span
                                >{/if}
                            {#if selectedInfo.repairMult !== 1}<span
                                    style="color: var(--pax-color-player-purple)"
                                    >🔧{selectedInfo.repairMult}×</span
                                >{/if}
                            {#if selectedInfo.speedMult !== 1}<span
                                    style="color: var(--pax-color-player-blue)"
                                    >⚡{selectedInfo.speedMult}×</span
                                >{/if}
                            {#if selectedInfo.defenseMult !== 1}<span
                                    style="color: var(--pax-ui-danger)"
                                    >🛡{selectedInfo.defenseMult}×</span
                                >{/if}
                            {#if selectedInfo.attackMult !== 1}<span
                                    style="color: var(--pax-ui-success)"
                                    >⚔{selectedInfo.attackMult}×</span
                                >{/if}
                            {#if selectedInfo.prodMult === 1 && selectedInfo.repairMult === 1 && selectedInfo.speedMult === 1 && selectedInfo.defenseMult === 1 && selectedInfo.attackMult === 1}
                                <span style="color: var(--pax-ui-text-dim)">all 1×</span>
                            {/if}
                        </span>
                    </div>

                    <div class="detail-row">
                        <span class="label">Force</span>
                        <span class="value force-row">
                            <span
                                class="force-abs"
                                title="Absolute: raw active ships"
                                >{selectedInfo.absolute}</span
                            >
                            <span class="force-sep">→</span>
                            <span
                                class="force-atk"
                                title="Derived Attack: active × ATK mult"
                                >⚔{selectedInfo.derivedAttack}</span
                            >
                            <span
                                class="force-def"
                                title="Derived Defense: (active + dmg bonus) × DEF mult"
                                >🛡{selectedInfo.derivedDefense}</span
                            >
                        </span>
                    </div>

                    {#if selectedInfo.relativeRatio !== null}
                        <div class="detail-row">
                            <span class="label">Ratio</span>
                            <span class="value">
                                <span
                                    class="force-ratio"
                                    class:favorable={selectedInfo.relativeRatio >=
                                        1}
                                    class:unfavorable={selectedInfo.relativeRatio <
                                        1}
                                >
                                    {selectedInfo.relativeRatio === Infinity
                                        ? "∞"
                                        : selectedInfo.relativeRatio.toFixed(2)}
                                </span>
                                <span class="force-vs"
                                    >{selectedInfo.relativeLabel}</span
                                >
                            </span>
                        </div>
                    {/if}

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
                {@const repaired = (s as any).repairedThisTick ?? 0}
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
                    <span class="row-active">{s.activeShips}</span>
                    <span class="row-damaged"
                        >{s.damagedShips > 0 ? `│${s.damagedShips}` : ""}</span
                    >
                    <span class="row-repaired"
                        >{repaired > 0 ? `+${repaired}` : ""}</span
                    >
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
        font-size: var(--pax-type-xs);
        color: var(--pax-ui-text-strong);
        background: color-mix(in srgb, var(--pax-color-void) 92%, transparent);
        border: 1px solid rgba(100, 120, 160, 0.3);
        border-radius: 8px;
        backdrop-filter: blur(8px);
        overflow: hidden;
    }

    .section-title {
        font-family: var(--pax-ui-font-display);
        font-size: var(--pax-type-2xs);
        font-weight: var(--pax-weight-bold);
        text-transform: uppercase;
        letter-spacing: 1px;
        color: var(--pax-ui-text-soft);
        padding: 6px 10px 4px;
        border-bottom: 1px solid rgba(100, 120, 160, 0.15);
    }
    .section-title .count {
        font-weight: var(--pax-weight-regular);
        color: var(--pax-ui-text-dim);
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
        font-size: var(--pax-type-base);
    }
    .star-name {
        font-family: var(--pax-ui-font-data);
        font-size: var(--pax-type-xs);
        font-weight: var(--pax-weight-semibold);
        flex: 1;
    }
    .type-chip {
        font-size: var(--pax-type-3xs);
        padding: 1px 5px;
        border-radius: 3px;
        font-weight: var(--pax-weight-bold);
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
        color: var(--pax-ui-text-dim);
        cursor: pointer;
        font-size: var(--pax-type-xs-plus);
        padding: 0 2px;
        line-height: 1;
    }
    .close-btn:hover {
        color: var(--pax-ui-text-strong);
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
        color: var(--pax-ui-text-soft);
        font-size: var(--pax-type-3xs);
        min-width: 55px;
    }
    .detail-row .value {
        font-family: var(--pax-ui-font-data);
        font-size: var(--pax-type-3xs);
        text-align: right;
    }
    .detail-row .overflow {
        color: var(--pax-ui-text-dim);
        font-size: var(--pax-type-3xs);
    }
    .detail-row.combat-active {
        background: color-mix(in srgb, var(--pax-ui-danger) 8%, transparent);
        border-radius: 3px;
        padding: 2px 4px;
    }
    .detail-row.combat-active .label {
        color: var(--pax-ui-danger);
    }

    .mult-row {
        display: flex;
        gap: 4px;
        font-weight: var(--pax-weight-semibold);
    }

    .active {
        color: var(--pax-ui-success);
        font-weight: var(--pax-weight-semibold);
    }
    .damaged {
        color: var(--pax-ui-danger);
        font-size: var(--pax-type-3xs);
    }
    .total {
        color: var(--pax-ui-text-dim);
        font-size: var(--pax-type-3xs);
    }

    .empty-hint {
        color: var(--pax-ui-text-dim);
        font-style: italic;
        text-align: center;
        padding: 10px 0;
        font-size: var(--pax-type-2xs);
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
        display: grid;
        grid-template-columns: 6px 14px 7ch 40px 1fr 5ch 4ch;
        align-items: center;
        gap: 4px;
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
        border-left: 2px solid var(--pax-ui-text-soft);
    }

    .row-owner {
        width: 6px;
        height: 6px;
        border-radius: 50%;
    }
    .row-type {
        font-size: var(--pax-type-xs);
        text-align: center;
    }
    .row-id {
        font-family: var(--pax-ui-font-data);
        font-size: var(--pax-type-3xs);
        color: var(--pax-ui-text-soft);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .row-chip {
        font-size: var(--pax-type-4xs);
        padding: 0 4px;
        border-radius: 2px;
        font-weight: var(--pax-weight-bold);
        letter-spacing: 0.3px;
    }
    .row-active {
        font-family: var(--pax-ui-font-data);
        font-size: var(--pax-type-3xs);
        text-align: right;
        color: var(--pax-ui-success);
        font-weight: var(--pax-weight-semibold);
    }
    .row-damaged {
        font-family: var(--pax-ui-font-data);
        font-size: var(--pax-type-3xs);
        text-align: right;
        color: var(--pax-ui-danger);
    }
    .row-repaired {
        font-family: var(--pax-ui-font-data);
        font-size: var(--pax-type-3xs);
        text-align: right;
        color: var(--pax-color-player-purple);
        font-weight: var(--pax-weight-semibold);
    }

    /* ── Force Display ── */
    .force-row {
        display: flex;
        gap: 3px;
        align-items: center;
    }
    .force-abs {
        color: var(--pax-ui-text-strong);
        font-weight: var(--pax-weight-semibold);
    }
    .force-sep {
        color: var(--pax-ui-text-dim);
        font-size: var(--pax-type-3xs);
    }
    .force-atk {
        color: var(--pax-ui-success);
        font-size: var(--pax-type-3xs);
    }
    .force-def {
        color: var(--pax-ui-danger);
        font-size: var(--pax-type-3xs);
    }
    .force-ratio {
        font-weight: var(--pax-weight-bold);
        font-size: var(--pax-type-2xs);
    }
    .force-ratio.favorable {
        color: var(--pax-ui-success);
    }
    .force-ratio.unfavorable {
        color: var(--pax-ui-danger);
    }
    .force-vs {
        color: var(--pax-ui-text-dim);
        font-size: var(--pax-type-3xs);
        margin-left: 3px;
    }
</style>
