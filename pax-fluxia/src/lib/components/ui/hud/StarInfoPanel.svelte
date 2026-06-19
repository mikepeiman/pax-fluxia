<script lang="ts">
    import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
    import { selectedStarStore } from "$lib/stores/selectedStarStore.svelte";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { getStarProductionPerTick, STAR_TYPE_STATS } from "@pax/common";
    import type { StarType } from "@pax/common";

    // Star type → icon name and shape
    const TYPE_INFO: Record<
        string,
        { label: string; shape: string; sides: number; color: string }
    > = {
        green: { label: "Attack", shape: "▲", sides: 3, color: "#22c55e" },
        red: { label: "Defense", shape: "◼", sides: 4, color: "#ef4444" },
        yellow: { label: "Prod", shape: "⬠", sides: 5, color: "#fbbf24" },
        purple: { label: "Repair", shape: "⬡", sides: 6, color: "#a855f7" },
        blue: { label: "Move", shape: "⬡", sides: 7, color: "#3b82f6" },
        grey: { label: "Balanced", shape: "●", sides: 0, color: "#8899aa" },
    };

    // Derive the selected star from store
    let star = $derived.by(() => {
        const id = selectedStarStore.id;
        if (!id) return null;
        return activeGameStore.stars.find((s: any) => s.id === id) ?? null;
    });

    let info = $derived.by(() => {
        if (!star) return null;
        const type = (star.starType || "grey") as string;
        const stats =
            STAR_TYPE_STATS[type as StarType] ?? STAR_TYPE_STATS["grey"];
        const typeInfo = TYPE_INFO[type] ?? TYPE_INFO["grey"];
        return {
            id: star.id,
            type,
            typeLabel: typeInfo.label,
            typeShape: typeInfo.shape,
            typeColor: typeInfo.color,
            owner: star.ownerId || "neutral",
            activeShips: star.activeShips,
            damagedShips: star.damagedShips,
            totalShips: star.activeShips + star.damagedShips,
            productionRate: star.productionRate,
            productionPerTick: getStarProductionPerTick(star, {
                BASE_PRODUCTION: GAME_CONFIG.BASE_PRODUCTION,
            }),
            baseProduction: GAME_CONFIG.BASE_PRODUCTION,
            repairRate: star.repairRate,
            transferRate: star.transferRate,
            defenseStrength: star.defenseStrength,
            // Effective stats (base × type multiplier)
            prodMult: stats.prod,
            repairMult: stats.repair,
            speedMult: stats.speed,
            defenseMult: stats.defense,
            attackMult: stats.attack,
            // State
            hasTarget: !!star.targetId,
            targetId: star.targetId,
            lastCombatTick: star.lastCombatTick,
            productionOverflow: star.productionOverflow,
            repairOverflow: star.repairOverflow,
        };
    });
</script>

<div class="star-info-panel">
    {#if info}
        <div class="panel-header">
            <span class="type-icon" style="color: {info.typeColor}"
                >{info.typeShape}</span
            >
            <span class="star-id">{info.id}</span>
            <span
                class="type-badge"
                style="background: {info.typeColor}20; color: {info.typeColor}; border: 1px solid {info.typeColor}"
                >{info.typeLabel}</span
            >
            <button
                class="close-btn"
                onclick={() => selectedStarStore.deselect()}>✕</button
            >
        </div>

        <div class="stats-grid">
            <!-- Ships -->
            <div class="stat-row">
                <span class="stat-label">Ships</span>
                <span class="stat-value">
                    <span class="active">{info.activeShips}</span>
                    {#if info.damagedShips > 0}
                        <span class="damaged">+ {info.damagedShips} dmg</span>
                    {/if}
                    <span class="total">= {info.totalShips}</span>
                </span>
            </div>

            <!-- Type multipliers (only show non-1x) -->
            <div class="stat-row multipliers">
                <span class="stat-label">Multipliers</span>
                <span class="stat-value mult-list">
                    {#if info.prodMult !== 1}<span
                            class="mult"
                            style="color: #fbbf24">⚙{info.prodMult}×</span
                        >{/if}
                    {#if info.repairMult !== 1}<span
                            class="mult"
                            style="color: #a855f7">🔧{info.repairMult}×</span
                        >{/if}
                    {#if info.speedMult !== 1}<span
                            class="mult"
                            style="color: #3b82f6">⚡{info.speedMult}×</span
                        >{/if}
                    {#if info.defenseMult !== 1}<span
                            class="mult"
                            style="color: #ef4444">🛡{info.defenseMult}×</span
                        >{/if}
                    {#if info.attackMult !== 1}<span
                            class="mult"
                            style="color: #22c55e">⚔{info.attackMult}×</span
                        >{/if}
                    {#if info.prodMult === 1 && info.repairMult === 1 && info.speedMult === 1 && info.defenseMult === 1 && info.attackMult === 1}
                        <span class="mult grey">all 1×</span>
                    {/if}
                </span>
            </div>

            <!-- Rates -->
            <div class="stat-row">
                <span class="stat-label">Prod / Tick</span>
                <span class="stat-value"
                    >{info.productionPerTick.toFixed(2)}</span
                >
            </div>
            <div class="stat-row">
                <span class="stat-label">Prod Inputs</span>
                <span class="stat-value"
                    >{info.productionRate.toFixed(2)} × {info.baseProduction.toFixed(
                        2,
                    )} × {info.prodMult}x</span
                >
            </div>
            <div class="stat-row">
                <span class="stat-label">Prod Overflow</span>
                <span class="stat-value">{info.productionOverflow.toFixed(2)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Repair Rate</span>
                <span class="stat-value"
                    >{info.repairRate.toFixed(2)} (overflow: {info.repairOverflow.toFixed(
                        2,
                    )})</span
                >
            </div>
            <div class="stat-row">
                <span class="stat-label">Transfer Rate</span>
                <span class="stat-value">{info.transferRate.toFixed(2)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Defense</span>
                <span class="stat-value">{info.defenseStrength.toFixed(1)}</span
                >
            </div>

            <!-- Orders -->
            <div class="stat-row">
                <span class="stat-label">Target</span>
                <span class="stat-value"
                    >{info.hasTarget ? info.targetId : "–"}</span
                >
            </div>
            <div class="stat-row">
                <span class="stat-label">Last Combat</span>
                <span class="stat-value"
                    >{info.lastCombatTick >= 0
                        ? `tick ${info.lastCombatTick}`
                        : "none"}</span
                >
            </div>
        </div>
    {:else}
        <div class="empty-state">Click a star to inspect</div>
    {/if}
</div>

<style>
    .star-info-panel {
        background: rgba(10, 14, 20, 0.92);
        border: 1px solid rgba(100, 120, 160, 0.3);
        border-radius: 8px;
        padding: 10px 12px;
        font-size: 12px;
        color: #c8d0e0;
        min-width: 220px;
        max-width: 280px;
        backdrop-filter: blur(8px);
    }

    .panel-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        padding-bottom: 6px;
        border-bottom: 1px solid rgba(100, 120, 160, 0.2);
    }

    .type-icon {
        font-size: 18px;
    }

    .star-id {
        font-family: var(--pax-ui-font-data);
        font-size: 11px;
        opacity: 0.7;
        flex: 1;
    }

    .type-badge {
        font-size: 10px;
        padding: 1px 6px;
        border-radius: 4px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .close-btn {
        background: none;
        border: none;
        color: #667;
        cursor: pointer;
        font-size: 14px;
        padding: 0 4px;
        line-height: 1;
    }
    .close-btn:hover {
        color: #fff;
    }

    .stats-grid {
        display: flex;
        flex-direction: column;
        gap: 3px;
    }

    .stat-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 2px 0;
    }

    .stat-label {
        color: #7888a0;
        font-size: 11px;
        min-width: 80px;
    }

    .stat-value {
        font-family: var(--pax-ui-font-data);
        font-size: 11px;
        text-align: right;
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
        color: #94a3b8;
        font-size: 10px;
    }

    .mult-list {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        justify-content: flex-end;
    }

    .mult {
        font-weight: 600;
        font-size: 11px;
    }
    .mult.grey {
        color: #667;
    }

    .empty-state {
        color: #556;
        font-style: italic;
        text-align: center;
        padding: 12px 0;
    }
</style>
