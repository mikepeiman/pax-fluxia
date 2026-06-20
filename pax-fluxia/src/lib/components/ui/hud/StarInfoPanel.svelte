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
                            style="color: var(--pax-ui-warning)">⚙{info.prodMult}×</span
                        >{/if}
                    {#if info.repairMult !== 1}<span
                            class="mult"
                            style="color: var(--pax-color-player-purple)">🔧{info.repairMult}×</span
                        >{/if}
                    {#if info.speedMult !== 1}<span
                            class="mult"
                            style="color: var(--pax-color-player-blue)">⚡{info.speedMult}×</span
                        >{/if}
                    {#if info.defenseMult !== 1}<span
                            class="mult"
                            style="color: var(--pax-ui-danger)">🛡{info.defenseMult}×</span
                        >{/if}
                    {#if info.attackMult !== 1}<span
                            class="mult"
                            style="color: var(--pax-ui-success)">⚔{info.attackMult}×</span
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
        background: color-mix(in srgb, var(--pax-color-void) 92%, transparent);
        border: 1px solid rgba(100, 120, 160, 0.3);
        border-radius: 8px;
        padding: var(--pax-gap-sm) var(--pax-space-3);
        font-size: var(--pax-type-xs);
        color: var(--pax-ui-text-strong);
        min-width: 220px;
        max-width: 280px;
        backdrop-filter: blur(8px);
    }

    .panel-header {
        display: flex;
        align-items: center;
        gap: var(--pax-space-2);
        margin-bottom: var(--pax-space-2);
        padding-bottom: var(--pax-gap-xs);
        border-bottom: 1px solid rgba(100, 120, 160, 0.2);
    }

    .type-icon {
        font-size: var(--pax-type-md);
    }

    .star-id {
        font-family: var(--pax-ui-font-data);
        font-size: var(--pax-type-2xs);
        opacity: 0.7;
        flex: 1;
    }

    .type-badge {
        font-size: var(--pax-type-3xs);
        padding: 1px var(--pax-gap-xs);
        border-radius: 4px;
        font-weight: var(--pax-weight-semibold);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .close-btn {
        background: none;
        border: none;
        color: var(--pax-ui-text-dim);
        cursor: pointer;
        font-size: var(--pax-type-sm);
        padding: 0 var(--pax-space-1);
        line-height: 1;
    }
    .close-btn:hover {
        color: var(--pax-ui-text-strong);
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
        color: var(--pax-ui-text-soft);
        font-size: var(--pax-type-2xs);
        min-width: 80px;
    }

    .stat-value {
        font-family: var(--pax-ui-font-data);
        font-size: var(--pax-type-2xs);
        text-align: right;
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
        color: var(--pax-ui-text-soft);
        font-size: var(--pax-type-3xs);
    }

    .mult-list {
        display: flex;
        gap: var(--pax-gap-xs);
        flex-wrap: wrap;
        justify-content: flex-end;
    }

    .mult {
        font-weight: var(--pax-weight-semibold);
        font-size: var(--pax-type-2xs);
    }
    .mult.grey {
        color: var(--pax-ui-text-dim);
    }

    .empty-state {
        color: var(--pax-ui-text-dim);
        font-style: italic;
        text-align: center;
        padding: var(--pax-space-3) 0;
    }
</style>
