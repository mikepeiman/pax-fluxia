<script lang="ts">
    import { selectedStarStore } from "$lib/stores/selectedStarStore.svelte";
    import type { PlayerState, StarState } from "$lib/types/game.types";
    import { getStarProductionPerTick, STAR_TYPE_STATS, type StarType } from "@pax/common";
    import HudIcon from "./HudIcon.svelte";

    interface Props {
        stars: StarState[];
        players?: PlayerState[];
        localPlayerId?: string;
        onNavigateToStar: (starId: string) => void;
        onCenterFit: () => void;
    }

    type TypeInfo = {
        label: string;
        icon: string;
        color: string;
    };

    const TYPE_INFO: Record<StarType, TypeInfo> = {
        grey: { label: "Balanced", icon: "grey", color: "#a8b6cf" },
        yellow: { label: "Production", icon: "yellow", color: "#ffd166" },
        blue: { label: "Transit", icon: "blue", color: "#70b7ff" },
        purple: { label: "Repair", icon: "purple", color: "#c7a8ff" },
        red: { label: "Defense", icon: "red", color: "#ff8a94" },
        green: { label: "Attack", icon: "green", color: "#6be7a4" },
        portal: { label: "Portal", icon: "portal", color: "#8b9cff" },
    };

    let { stars, players = [], localPlayerId, onNavigateToStar, onCenterFit }: Props = $props();

    function resolveStarType(starType?: string | null): StarType {
        if (!starType) return "grey";
        return (starType in STAR_TYPE_STATS ? starType : "grey") as StarType;
    }

    function getTypeInfo(star: StarState): TypeInfo {
        return TYPE_INFO[resolveStarType(star.starType)];
    }

    function getOwner(star: StarState): PlayerState | null {
        return players.find((player) => player.id === star.ownerId) ?? null;
    }

    function getStarLabel(star: StarState): string {
        return `Star ${star.id.replace(/^star-/, "")}`;
    }

    function formatDecimal(value: number): string {
        return Number.isInteger(value) ? String(value) : value.toFixed(1);
    }

    const ownedStars = $derived(
        stars.filter((star) => star.ownerId === localPlayerId),
    );

    let currentIndex = $state(0);

    const selectedStar = $derived(
        selectedStarStore.id
            ? stars.find((star) => star.id === selectedStarStore.id) ?? null
            : null,
    );

    $effect(() => {
        if (ownedStars.length === 0) {
            currentIndex = 0;
            return;
        }

        if (selectedStar) {
            const selectedIndex = ownedStars.findIndex((star) => star.id === selectedStar.id);
            if (selectedIndex >= 0) {
                currentIndex = selectedIndex;
                return;
            }
        }

        if (currentIndex >= ownedStars.length) {
            currentIndex = ownedStars.length - 1;
        }
    });

    const displayedStar = $derived(
        selectedStar ?? (ownedStars.length > 0 ? ownedStars[currentIndex] : null),
    );

    const displayedStarDetails = $derived.by(() => {
        const star = displayedStar;
        if (!star) return null;

        const typeInfo = getTypeInfo(star);
        const owner = getOwner(star);
        const target = star.targetId
            ? stars.find((candidate) => candidate.id === star.targetId) ?? null
            : null;
        const incoming = stars.filter(
            (candidate) => candidate.targetId === star.id && candidate.id !== star.id,
        );

        return {
            star,
            label: getStarLabel(star),
            typeInfo,
            owner,
            target,
            incoming,
            totalShips: (star.activeShips ?? 0) + (star.damagedShips ?? 0),
            productionPerTick: getStarProductionPerTick(star),
            repairRate: star.repairRate ?? 0,
            transferRate: star.transferRate ?? 0,
            activationRate: star.activationRate ?? 0,
        };
    });

    function prev() {
        if (ownedStars.length === 0) return;
        currentIndex = (currentIndex - 1 + ownedStars.length) % ownedStars.length;
        const star = ownedStars[currentIndex];
        selectedStarStore.select(star.id);
        onNavigateToStar(star.id);
    }

    function next() {
        if (ownedStars.length === 0) return;
        currentIndex = (currentIndex + 1) % ownedStars.length;
        const star = ownedStars[currentIndex];
        selectedStarStore.select(star.id);
        onNavigateToStar(star.id);
    }

    function navigateDisplayedStar() {
        if (!displayedStarDetails) return;
        onNavigateToStar(displayedStarDetails.star.id);
    }
</script>

<section class="star-nav-card" aria-label="Star view">
    <div class="star-nav-card__header">
        <div class="star-nav-card__identity">
            <span class="star-nav-card__eyebrow">Star View</span>

            {#if displayedStarDetails}
                <div class="star-nav-card__title-row">
                    <span
                        class="star-nav-card__type"
                        style={`color:${displayedStarDetails.typeInfo.color}; --star-type-color:${displayedStarDetails.typeInfo.color};`}
                    >
                        <HudIcon name={displayedStarDetails.typeInfo.icon} size={20} />
                    </span>
                    <div class="star-nav-card__title-block">
                        <span class="star-nav-card__title">{displayedStarDetails.label}</span>
                        <span class="star-nav-card__subtitle">
                            {displayedStarDetails.typeInfo.label}
                        </span>
                    </div>
                </div>
            {:else}
                <div class="star-nav-card__title-row">
                    <span class="star-nav-card__type">
                        <HudIcon name="grey" size={20} />
                    </span>
                    <div class="star-nav-card__title-block">
                        <span class="star-nav-card__title">No Star Selected</span>
                        <span class="star-nav-card__subtitle">Choose a star on the map</span>
                    </div>
                </div>
            {/if}
        </div>

        <div class="star-nav-controls">
            <button
                class="sn-btn"
                onclick={prev}
                disabled={ownedStars.length === 0}
                title="Previous owned star"
                aria-label="Previous owned star"
            >
                <HudIcon name="chevron-left" size={15} />
            </button>
            <button
                class="sn-btn sn-btn--center"
                onclick={navigateDisplayedStar}
                disabled={!displayedStarDetails}
                title="Center selected star"
                aria-label="Center selected star"
            >
                <HudIcon name="fit" size={16} />
            </button>
            <button
                class="sn-btn"
                onclick={next}
                disabled={ownedStars.length === 0}
                title="Next owned star"
                aria-label="Next owned star"
            >
                <HudIcon name="chevron-right" size={15} />
            </button>
        </div>
    </div>

    {#if displayedStarDetails}
        <div class="star-nav-body">
            <div
                class="star-orb"
                style={`--star-type-color:${displayedStarDetails.typeInfo.color};`}
                aria-hidden="true"
            >
                <span class="star-orb__ring"></span>
                <span class="star-orb__core"></span>
                <span class="star-orb__axis"></span>
            </div>

            <div class="star-identity-grid">
                <div class="star-field">
                    <span class="star-field__label">Owner</span>
                    <span class="star-field__value star-field__value--player">
                        <span
                            class="star-field__dot"
                            style={`background:${displayedStarDetails.owner?.color ?? "rgba(148,163,184,0.7)"};`}
                        ></span>
                        {displayedStarDetails.owner?.name ?? displayedStarDetails.star.ownerId}
                    </span>
                </div>
                <div class="star-field">
                    <span class="star-field__label">Type</span>
                    <span class="star-field__value">{displayedStarDetails.typeInfo.label}</span>
                </div>
                <div class="star-field">
                    <span class="star-field__label">
                        <HudIcon name="ship-active" size={13} /> Active
                    </span>
                    <span class="star-field__value font-hud-data">
                        {displayedStarDetails.star.activeShips}
                    </span>
                </div>
                <div class="star-field">
                    <span class="star-field__label">
                        <HudIcon name="ship-damaged" size={13} /> Damaged
                    </span>
                    <span class="star-field__value font-hud-data">
                        {displayedStarDetails.star.damagedShips}
                    </span>
                </div>
            </div>
        </div>

        <div class="star-rate-grid">
            <div class="star-rate">
                <span class="star-rate__label">Production</span>
                <span class="star-rate__value font-hud-data">
                    +{formatDecimal(displayedStarDetails.productionPerTick)}
                </span>
            </div>
            <div class="star-rate">
                <span class="star-rate__label">Repair</span>
                <span class="star-rate__value font-hud-data">
                    {displayedStarDetails.repairRate}%
                </span>
            </div>
            <div class="star-rate">
                <span class="star-rate__label">Transfer</span>
                <span class="star-rate__value font-hud-data">
                    {displayedStarDetails.transferRate}%
                </span>
            </div>
            <div class="star-rate">
                <span class="star-rate__label">Activation</span>
                <span class="star-rate__value font-hud-data">
                    {displayedStarDetails.activationRate}%
                </span>
            </div>
        </div>

        <div class="star-route-strip">
            <span class="star-route-chip font-hud-data">
                {selectedStar ? "Selected" : `${currentIndex + 1} / ${ownedStars.length || 1}`}
            </span>
            <span class="star-route-chip">
                <HudIcon name="travel" size={13} />
                {#if displayedStarDetails.target}
                    Target {displayedStarDetails.target.id.replace(/^star-/, "")}
                {:else}
                    No target
                {/if}
            </span>
            <span class="star-route-chip">
                <HudIcon name="focus" size={13} />
                {displayedStarDetails.incoming.length} inbound
            </span>
            <button
                class="star-route-fit"
                type="button"
                onclick={onCenterFit}
                title="Fit full map"
                aria-label="Fit full map"
            >
                <HudIcon name="fit" size={15} />
            </button>
        </div>
    {:else}
        <div class="star-nav-card__empty">
            Click a star to inspect it, or cycle through owned stars with the side controls.
        </div>
    {/if}
</section>

<style>
    .star-nav-card {
        display: grid;
        gap: 14px;
        padding: var(--pax-ui-pad-md);
        border: 1px solid var(--pax-ui-border);
        border-radius: var(--pax-ui-radius-md);
        background: var(--pax-ui-panel-bg);
        box-shadow: var(--pax-ui-shadow-soft);
    }

    .star-nav-card__header,
    .star-nav-card__title-row,
    .star-nav-controls,
    .star-field__label,
    .star-field__value--player,
    .star-route-strip,
    .star-route-chip,
    .star-route-fit {
        display: flex;
        align-items: center;
    }

    .star-nav-card__header {
        justify-content: space-between;
        gap: 12px;
        padding-bottom: 10px;
        border-bottom: 1px solid var(--pax-ui-divider);
    }

    .star-nav-card__identity {
        min-width: 0;
        display: grid;
        gap: 8px;
    }

    .star-nav-card__eyebrow {
        color: var(--pax-ui-accent);
        font-family: var(--pax-ui-font-ui);
        font-size: var(--pax-type-4xs);
        font-weight: var(--pax-weight-extrabold);
        letter-spacing: 0.18em;
        text-transform: uppercase;
    }

    .star-nav-card__title-row {
        gap: 10px;
        min-width: 0;
    }

    .star-nav-card__type {
        width: 38px;
        height: 38px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        border: 1px solid color-mix(in srgb, var(--star-type-color, var(--pax-ui-accent)) 48%, transparent);
        background:
            radial-gradient(circle, color-mix(in srgb, var(--star-type-color, var(--pax-ui-accent)) 18%, transparent), transparent 62%),
            color-mix(in srgb, var(--pax-ui-text-strong) 3%, transparent);
    }

    .star-nav-card__title-block {
        min-width: 0;
        display: grid;
        gap: 2px;
    }

    .star-nav-card__title {
        color: var(--pax-ui-text-strong);
        font-family: var(--pax-ui-font-ui);
        font-size: var(--pax-type-base);
        font-weight: var(--pax-weight-extrabold);
        letter-spacing: 0.04em;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .star-nav-card__subtitle {
        color: var(--pax-ui-text-soft);
        font-family: var(--pax-ui-font-ui);
        font-size: var(--pax-type-3xs);
        font-weight: var(--pax-weight-extrabold);
        letter-spacing: 0.14em;
        text-transform: uppercase;
    }

    .star-nav-controls {
        gap: 6px;
    }

    .sn-btn,
    .star-route-fit {
        width: 38px;
        height: 38px;
        justify-content: center;
        border-radius: 12px;
        border: 1px solid var(--pax-ui-border);
        background: var(--pax-ui-button-bg);
        color: var(--pax-ui-text);
        cursor: pointer;
        transition:
            border-color 0.16s ease,
            background 0.16s ease,
            color 0.16s ease,
            transform 0.16s ease;
    }

    .sn-btn:hover:not(:disabled),
    .star-route-fit:hover {
        border-color: var(--pax-ui-border-strong);
        background: var(--pax-ui-button-bg-hover);
        color: var(--pax-ui-text-strong);
        transform: translateY(-1px);
    }

    .sn-btn:disabled {
        opacity: 0.4;
        cursor: default;
    }

    .sn-btn--center,
    .star-route-fit {
        color: var(--pax-ui-accent);
    }

    .star-nav-body {
        display: grid;
        grid-template-columns: 86px minmax(0, 1fr);
        gap: 14px;
        align-items: stretch;
    }

    .star-orb {
        position: relative;
        min-height: 86px;
        border-radius: 18px;
        border: 1px solid color-mix(in srgb, var(--star-type-color, var(--pax-ui-accent)) 28%, transparent);
        background:
            radial-gradient(circle at center, color-mix(in srgb, var(--star-type-color, var(--pax-ui-accent)) 28%, transparent), transparent 44%),
            radial-gradient(circle at center, color-mix(in srgb, var(--pax-ui-text-strong) 8%, transparent), transparent 62%),
            color-mix(in srgb, var(--pax-color-void) 78%, transparent);
        overflow: hidden;
    }

    .star-orb__ring,
    .star-orb__core,
    .star-orb__axis {
        position: absolute;
        inset: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
    }

    .star-orb__ring {
        width: 64px;
        height: 64px;
        border: 1px solid color-mix(in srgb, var(--star-type-color, var(--pax-ui-accent)) 64%, transparent);
        border-radius: 50%;
        box-shadow:
            inset 0 0 18px color-mix(in srgb, var(--star-type-color, var(--pax-ui-accent)) 24%, transparent),
            0 0 22px color-mix(in srgb, var(--star-type-color, var(--pax-ui-accent)) 22%, transparent);
    }

    .star-orb__core {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: var(--star-type-color, var(--pax-ui-accent));
        box-shadow:
            0 0 14px var(--star-type-color, var(--pax-ui-accent)),
            0 0 34px var(--star-type-color, var(--pax-ui-accent));
    }

    .star-orb__axis {
        width: 88px;
        height: 1px;
        background: linear-gradient(90deg, transparent, var(--star-type-color, var(--pax-ui-accent)), transparent);
    }

    .star-identity-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
    }

    .star-field,
    .star-rate {
        min-width: 0;
        display: grid;
        gap: 5px;
        padding: 10px;
        border-radius: 12px;
        border: 1px solid rgba(112, 142, 186, 0.16);
        background: color-mix(in srgb, var(--pax-color-void) 78%, transparent);
    }

    .star-field__label,
    .star-rate__label {
        gap: 6px;
        color: var(--pax-ui-text-soft);
        font-family: var(--pax-ui-font-ui);
        font-size: var(--pax-type-4xs);
        font-weight: var(--pax-weight-extrabold);
        letter-spacing: 0.13em;
        line-height: 1;
        text-transform: uppercase;
    }

    .star-field__value,
    .star-rate__value {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--pax-ui-text-strong);
        font-family: var(--pax-ui-font-ui);
        font-size: var(--pax-type-xs);
        font-weight: var(--pax-weight-bold);
    }

    .star-field__dot {
        width: 8px;
        height: 8px;
        flex: 0 0 auto;
        border-radius: 50%;
        box-shadow: 0 0 10px currentColor;
    }

    .star-rate-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
    }

    .star-rate__value {
        color: var(--pax-ui-accent-strong);
        font-size: var(--pax-type-sm);
    }

    .star-route-strip {
        gap: 8px;
        min-width: 0;
        padding-top: 2px;
    }

    .star-route-chip {
        min-width: 0;
        min-height: 28px;
        gap: 6px;
        padding: 0 10px;
        border-radius: 999px;
        background: color-mix(in srgb, var(--pax-color-void) 88%, transparent);
        color: var(--pax-ui-text-soft);
        font-family: var(--pax-ui-font-ui);
        font-size: var(--pax-type-label);
        font-weight: var(--pax-weight-bold);
        white-space: nowrap;
    }

    .star-route-fit {
        width: 34px;
        height: 34px;
        margin-left: auto;
    }

    .star-nav-card__empty {
        min-height: 126px;
        display: grid;
        place-items: center;
        padding: 18px;
        border-radius: var(--pax-ui-radius-sm);
        border: 1px dashed rgba(112, 142, 186, 0.24);
        color: var(--pax-ui-text-soft);
        font-family: var(--pax-ui-font-ui);
        font-size: var(--pax-type-xs-plus);
        text-align: center;
    }

    @media (max-width: 1024px) {
        .star-nav-card {
            gap: 10px;
            padding: var(--pax-ui-pad-sm);
        }

        .star-nav-body {
            grid-template-columns: 72px minmax(0, 1fr);
            gap: 10px;
        }

        .star-orb {
            min-height: 72px;
        }

        .star-rate-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }
</style>
