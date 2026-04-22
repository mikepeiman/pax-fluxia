<script lang="ts">
    import { STAR_TYPE_STATS, type StarType } from "@pax/common";
    import { getPortalGroupCssColor, getPortalGroupLabel } from "$lib/utils/portalStyling";
    import RangeDual from "../RangeDual.svelte";

    type MapMode = "random" | "classic" | "custom";
    type LaneMode = "straight" | "curved";
    type SavedMap = {
        metadata: { name: string };
        stars: Array<{
            id: string;
            x: number;
            y: number;
            ownerId?: string;
            starType?: string;
            portalGroup?: string;
        }>;
        connections: Array<{
            sourceId: string;
            targetId: string;
            laneWaypoints?: [number, number][];
        }>;
    };

    interface Props {
        mapMode: MapMode;
        selectedClassicMap: string | null;
        selectedCustomMap: string | null;
        starsPerPlayer: number;
        shipsPerStar: number;
        minLinks: number;
        maxLinks: number;
        starSpacing: number;
        mapBoardFit: number;
        menuStarMargin: number;
        menuLaneMargin: number;
        menuCurveVsPruneBias: number;
        menuLaneMode: LaneMode;
        neutralStarCount: number;
        neutralShipsPerStar: number;
        specialStarPercentage: number;
        tickDuration: number;
        thumbnailUrl: string;
        classicMaps: SavedMap[];
        customMaps: SavedMap[];
        onMapModeChange: (mode: MapMode) => void;
        onClassicMapSelect: (name: string) => void;
        onCustomMapSelect: (name: string) => void;
        onStarsPerPlayerChange: (value: number) => void;
        onShipsPerStarChange: (value: number) => void;
        onMinLinksChange: (value: number) => void;
        onMaxLinksChange: (value: number) => void;
        onStarSpacingChange: (value: number) => void;
        onMapBoardFitChange: (value: number) => void;
        onLaneModeChange: (value: LaneMode) => void;
        onStarMarginChange: (value: number) => void;
        onLaneMarginChange: (value: number) => void;
        onCurveVsPruneBiasChange: (value: number) => void;
        onSpecialStarPercentageChange: (value: number) => void;
        onNeutralStarCountChange: (value: number) => void;
        onNeutralShipsPerStarChange: (value: number) => void;
        onTickDurationChange: (value: number) => void;
        onReshuffle: () => void;
    }

    let {
        mapMode,
        selectedClassicMap,
        selectedCustomMap,
        starsPerPlayer,
        shipsPerStar,
        minLinks,
        maxLinks,
        starSpacing,
        mapBoardFit,
        menuStarMargin,
        menuLaneMargin,
        menuCurveVsPruneBias,
        menuLaneMode,
        neutralStarCount,
        neutralShipsPerStar,
        specialStarPercentage,
        tickDuration,
        thumbnailUrl,
        classicMaps,
        customMaps,
        onMapModeChange,
        onClassicMapSelect,
        onCustomMapSelect,
        onStarsPerPlayerChange,
        onShipsPerStarChange,
        onMinLinksChange,
        onMaxLinksChange,
        onStarSpacingChange,
        onMapBoardFitChange,
        onLaneModeChange,
        onStarMarginChange,
        onLaneMarginChange,
        onCurveVsPruneBiasChange,
        onSpecialStarPercentageChange,
        onNeutralStarCountChange,
        onNeutralShipsPerStarChange,
        onTickDurationChange,
        onReshuffle,
    }: Props = $props();

    let dualMin = $state(0);
    let dualMax = $state(0);

    $effect(() => {
        if (dualMin !== minLinks) dualMin = minLinks;
        if (dualMax !== maxLinks) dualMax = maxLinks;
    });

    function getBoardFitLabel(value: number): string {
        if (value >= 0.95) return "Symmetrical";
        if (value >= 0.7) return "Balanced";
        return "Asymmetric";
    }

    function getSavedMapOwnerColor(ownerId: string | undefined, starIndex: number): string {
        return ownerId === "neutral" || !ownerId
            ? "var(--pf-muted)"
            : `hsl(${(starIndex * 60) % 360}, 70%, 60%)`;
    }

    function getSavedMapStarTypeColor(starType: string | undefined): string {
        if (starType && STAR_TYPE_STATS[starType as StarType]) {
            return `#${STAR_TYPE_STATS[starType as StarType].color.toString(16).padStart(6, "0")}`;
        }
        return "#8899aa";
    }

    function getSavedMapPortalColor(portalGroup: string | undefined): string {
        return getPortalGroupCssColor(portalGroup);
    }

    function getSavedMapPortalLabel(portalGroup: string | undefined): string {
        return getPortalGroupLabel(portalGroup);
    }
</script>

<section class="menu-panel game-map-panel">
    <div class="menu-panel__header game-map-panel__header">
        <div>
            <h2 class="menu-panel__eyebrow">Game &amp; Map</h2>
            <p class="menu-panel__title">Tune the battlefield before launch</p>
        </div>

        <label class="tick-chip">
            <span class="tick-chip__label">Tick Duration</span>
            <div class="tick-chip__controls">
                <input
                    type="range"
                    min="0"
                    max="3000"
                    step="250"
                    value={tickDuration}
                    oninput={(event) =>
                        onTickDurationChange(
                            Number((event.currentTarget as HTMLInputElement).value),
                        )}
                />
                <strong>{(tickDuration / 1000).toFixed(1)}s</strong>
            </div>
        </label>
    </div>

    <div class="game-map-panel__tabs">
        <button
            type="button"
            class="game-map-panel__tab"
            class:is-active={mapMode === "random"}
            onclick={() => onMapModeChange("random")}
        >
            Random
        </button>
        <button
            type="button"
            class="game-map-panel__tab"
            class:is-active={mapMode === "classic"}
            onclick={() => onMapModeChange("classic")}
        >
            Classic
        </button>
        <button
            type="button"
            class="game-map-panel__tab"
            class:is-active={mapMode === "custom"}
            onclick={() => onMapModeChange("custom")}
        >
            Custom
        </button>
    </div>

    {#if mapMode === "random"}
        <div class="game-map-panel__random-grid">
            <div class="control-cluster">
                <div class="control-cluster__title">Map Density</div>

                <div class="control-grid">
                    <label class="range-field">
                        <span>Stars / Player</span>
                        <input
                            type="range"
                            min="1"
                            max="20"
                            value={starsPerPlayer}
                            oninput={(event) =>
                                onStarsPerPlayerChange(
                                    Number((event.currentTarget as HTMLInputElement).value),
                                )}
                        />
                        <strong>{starsPerPlayer}</strong>
                    </label>

                    <label class="range-field">
                        <span>Spacing</span>
                        <input
                            type="range"
                            min="0.5"
                            max="5"
                            step="0.1"
                            value={starSpacing}
                            oninput={(event) =>
                                onStarSpacingChange(
                                    Number((event.currentTarget as HTMLInputElement).value),
                                )}
                        />
                        <strong>{starSpacing.toFixed(1)}x</strong>
                    </label>

                    <label class="range-field range-field--wide">
                        <span>Links [{dualMin}-{dualMax}]</span>
                        <div class="dual-range-shell">
                            <RangeDual
                                bind:min={dualMin}
                                bind:max={dualMax}
                                minLimit={1}
                                maxLimit={8}
                                onChange={(
                                    nextMin: number,
                                    nextMax: number,
                                ) => {
                                    onMinLinksChange(nextMin);
                                    onMaxLinksChange(nextMax);
                                }}
                            />
                        </div>
                    </label>

                    <label class="range-field range-field--wide">
                        <span>Asymmetric vs Symmetrical</span>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={mapBoardFit}
                            oninput={(event) =>
                                onMapBoardFitChange(
                                    Number((event.currentTarget as HTMLInputElement).value),
                                )}
                        />
                        <strong>{getBoardFitLabel(mapBoardFit)} · {Math.round(mapBoardFit * 100)}%</strong>
                    </label>
                </div>
            </div>

            <aside class="preview-well">
                <div class="preview-well__header">
                    <span class="preview-well__label">Live Preview</span>
                    <button type="button" class="preview-well__reshuffle" onclick={onReshuffle}>
                        Reshuffle
                    </button>
                </div>

                <div class="preview-well__frame">
                    {#if thumbnailUrl}
                        <img src={thumbnailUrl} alt="Generated map preview" class="preview-well__image" />
                    {:else}
                        <div class="preview-well__placeholder">Generating map preview...</div>
                    {/if}
                </div>
            </aside>

            <div class="control-cluster control-cluster--lane">
                <div class="control-cluster__title-row">
                    <div class="control-cluster__title">Lane Shape</div>
                    <span class="control-cluster__value">
                        {menuLaneMode === "straight" ? "Direct" : "Adaptive"}
                    </span>
                </div>

                <div class="lane-mode">
                    <button
                        type="button"
                        class="lane-mode__button"
                        class:is-active={menuLaneMode === "straight"}
                        onclick={() => onLaneModeChange("straight")}
                    >
                        Direct
                    </button>
                    <button
                        type="button"
                        class="lane-mode__button"
                        class:is-active={menuLaneMode === "curved"}
                        onclick={() => onLaneModeChange("curved")}
                    >
                        Adaptive
                    </button>
                </div>

                <div class="metric-grid">
                    <label class="metric-field">
                        <span>Star Clearance</span>
                        <strong>{menuStarMargin}px</strong>
                        <input
                            type="range"
                            min="0"
                            max="500"
                            step="5"
                            value={menuStarMargin}
                            oninput={(event) =>
                                onStarMarginChange(
                                    Number((event.currentTarget as HTMLInputElement).value),
                                )}
                        />
                    </label>

                    <label class="metric-field">
                        <span>Lane Clearance</span>
                        <strong>{menuLaneMargin}px</strong>
                        <input
                            type="range"
                            min="0"
                            max="250"
                            step="5"
                            value={menuLaneMargin}
                            oninput={(event) =>
                                onLaneMarginChange(
                                    Number((event.currentTarget as HTMLInputElement).value),
                                )}
                        />
                    </label>
                </div>

                <label class="range-field range-field--wide">
                    <span>Curvature Bias</span>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={menuCurveVsPruneBias}
                        oninput={(event) =>
                            onCurveVsPruneBiasChange(
                                Number((event.currentTarget as HTMLInputElement).value),
                            )}
                    />
                    <strong>{menuCurveVsPruneBias.toFixed(2)}</strong>
                </label>
            </div>

            <div class="control-cluster">
                <div class="control-cluster__title">Scenario Pressure</div>

                <div class="control-grid">
                    <label class="range-field">
                        <span>Special Stars</span>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={specialStarPercentage}
                            oninput={(event) =>
                                onSpecialStarPercentageChange(
                                    Number((event.currentTarget as HTMLInputElement).value),
                                )}
                        />
                        <strong>{specialStarPercentage}%</strong>
                    </label>

                    <label class="range-field">
                        <span>Neutral Stars</span>
                        <input
                            type="range"
                            min="0"
                            max="50"
                            step="1"
                            value={neutralStarCount}
                            oninput={(event) =>
                                onNeutralStarCountChange(
                                    Number((event.currentTarget as HTMLInputElement).value),
                                )}
                        />
                        <strong>{neutralStarCount}</strong>
                    </label>

                    <label class="range-field">
                        <span>Ships Per Star</span>
                        <input
                            type="range"
                            min="10"
                            max="200"
                            step="10"
                            value={shipsPerStar}
                            oninput={(event) =>
                                onShipsPerStarChange(
                                    Number((event.currentTarget as HTMLInputElement).value),
                                )}
                        />
                        <strong>{shipsPerStar}</strong>
                    </label>

                    <label class="range-field" class:is-disabled={neutralStarCount === 0}>
                        <span>Neutral Ships</span>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={neutralShipsPerStar}
                            disabled={neutralStarCount === 0}
                            oninput={(event) =>
                                onNeutralShipsPerStarChange(
                                    Number((event.currentTarget as HTMLInputElement).value),
                                )}
                        />
                        <strong>{neutralShipsPerStar}</strong>
                    </label>
                </div>
            </div>
        </div>
    {:else}
        <div class="saved-mode-layout">
            <div class="saved-map-grid">
                {#each (mapMode === "classic" ? classicMaps : customMaps) as map}
                    {@const xs = map.stars.map((star) => star.x)}
                    {@const ys = map.stars.map((star) => star.y)}
                    {@const pad = 20}
                    {@const minX = Math.min(...xs) - pad}
                    {@const minY = Math.min(...ys) - pad}
                    {@const maxX = Math.max(...xs) + pad}
                    {@const maxY = Math.max(...ys) + pad}
                    {@const vw = maxX - minX || 100}
                    {@const vh = maxY - minY || 100}
                    {@const starMap = Object.fromEntries(map.stars.map((star) => [star.id, star]))}
                    {@const isSelected = mapMode === "classic"
                        ? selectedClassicMap === map.metadata.name
                        : selectedCustomMap === map.metadata.name}

                    <button
                        type="button"
                        class="saved-map-card"
                        class:is-selected={isSelected}
                        onclick={() =>
                            mapMode === "classic"
                                ? onClassicMapSelect(map.metadata.name)
                                : onCustomMapSelect(map.metadata.name)}
                    >
                        <svg
                            class="saved-map-card__thumb"
                            viewBox="{minX} {minY} {vw} {vh}"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            {#each map.connections as connection}
                                {@const src = starMap[connection.sourceId]}
                                {@const tgt = starMap[connection.targetId]}
                                {#if src && tgt}
                                    {#if connection.laneWaypoints && connection.laneWaypoints.length > 2}
                                        <polyline
                                            points={connection.laneWaypoints.map(([x, y]) => `${x},${y}`).join(" ")}
                                            fill="none"
                                            stroke={isSelected ? "var(--pf-accent-soft)" : "var(--pf-divider)"}
                                            stroke-width={Math.max(1, vw * 0.006)}
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                        />
                                    {:else}
                                        <line
                                            x1={src.x}
                                            y1={src.y}
                                            x2={tgt.x}
                                            y2={tgt.y}
                                            stroke={isSelected ? "var(--pf-accent-soft)" : "var(--pf-divider)"}
                                            stroke-width={Math.max(1, vw * 0.006)}
                                        />
                                    {/if}
                                {/if}
                            {/each}
                            {#each map.stars as star, starIndex}
                                {@const ownerColor = getSavedMapOwnerColor(star.ownerId, starIndex)}
                                {@const typeColor = getSavedMapStarTypeColor(star.starType)}
                                {@const portalColor = getSavedMapPortalColor(star.portalGroup)}
                                {@const portalLabel = getSavedMapPortalLabel(star.portalGroup)}
                                {@const isPortal = star.starType === "portal"}
                                {@const starRadius = Math.max(2.4, vw * 0.015)}
                                {#if isPortal}
                                    <circle
                                        cx={star.x}
                                        cy={star.y}
                                        r={starRadius + Math.max(1.8, vw * 0.008)}
                                        fill={ownerColor}
                                        opacity={isSelected ? 0.22 : 0.14}
                                    />
                                    <circle
                                        cx={star.x}
                                        cy={star.y}
                                        r={starRadius + Math.max(0.5, vw * 0.002)}
                                        fill="#050816"
                                        opacity="0.98"
                                    />
                                    <circle
                                        cx={star.x}
                                        cy={star.y}
                                        r={starRadius + Math.max(0.5, vw * 0.002)}
                                        fill="none"
                                        stroke={portalColor}
                                        stroke-width={Math.max(1.3, vw * 0.005)}
                                        opacity={isSelected ? 1 : 0.92}
                                    />
                                    <circle
                                        cx={star.x}
                                        cy={star.y}
                                        r={starRadius * 0.66}
                                        fill="#0b1120"
                                        opacity="0.96"
                                    />
                                    <circle
                                        cx={star.x}
                                        cy={star.y}
                                        r={starRadius * 0.22}
                                        fill={portalColor}
                                        opacity="0.28"
                                    />
                                    <circle
                                        cx={star.x}
                                        cy={star.y}
                                        r={starRadius * 0.12}
                                        fill="#010308"
                                        opacity="0.94"
                                    />
                                    <text
                                        x={star.x}
                                        y={star.y}
                                        fill={portalColor}
                                        text-anchor="middle"
                                        dominant-baseline="middle"
                                        font-size={Math.max(4.5, vw * 0.013)}
                                        font-weight="700"
                                    >
                                        {portalLabel}
                                    </text>
                                {:else}
                                    <circle
                                        cx={star.x}
                                        cy={star.y}
                                        r={starRadius + Math.max(1.6, vw * 0.008)}
                                        fill={ownerColor}
                                        opacity={isSelected ? 0.22 : 0.14}
                                    />
                                    <circle
                                        cx={star.x}
                                        cy={star.y}
                                        r={starRadius}
                                        fill={typeColor}
                                        opacity={isSelected ? 1 : 0.9}
                                    />
                                    <circle
                                        cx={star.x}
                                        cy={star.y}
                                        r={starRadius}
                                        fill="none"
                                        stroke={ownerColor}
                                        stroke-width={Math.max(1.1, vw * 0.005)}
                                        opacity={isSelected ? 1 : 0.82}
                                    />
                                {/if}
                            {/each}
                        </svg>

                        <span class="saved-map-card__title">{map.metadata.name}</span>
                        <span class="saved-map-card__meta">{map.stars.length} stars</span>
                    </button>
                {/each}

                {#if (mapMode === "classic" ? classicMaps : customMaps).length === 0}
                    <div class="saved-map-empty">
                        {mapMode === "classic"
                            ? "No classic maps loaded yet."
                            : "No custom maps saved yet."}
                    </div>
                {/if}
            </div>

            <div class="control-cluster">
                <div class="control-cluster__title">Scenario Pressure</div>

                <div class="control-grid">
                    <label class="range-field">
                        <span>Special Stars</span>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={specialStarPercentage}
                            oninput={(event) =>
                                onSpecialStarPercentageChange(
                                    Number((event.currentTarget as HTMLInputElement).value),
                                )}
                        />
                        <strong>{specialStarPercentage}%</strong>
                    </label>

                    <label class="range-field">
                        <span>Neutral Stars</span>
                        <input
                            type="range"
                            min="0"
                            max="50"
                            step="1"
                            value={neutralStarCount}
                            oninput={(event) =>
                                onNeutralStarCountChange(
                                    Number((event.currentTarget as HTMLInputElement).value),
                                )}
                        />
                        <strong>{neutralStarCount}</strong>
                    </label>

                    <label class="range-field">
                        <span>Ships Per Star</span>
                        <input
                            type="range"
                            min="10"
                            max="200"
                            step="10"
                            value={shipsPerStar}
                            oninput={(event) =>
                                onShipsPerStarChange(
                                    Number((event.currentTarget as HTMLInputElement).value),
                                )}
                        />
                        <strong>{shipsPerStar}</strong>
                    </label>

                    <label class="range-field" class:is-disabled={neutralStarCount === 0}>
                        <span>Neutral Ships</span>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={neutralShipsPerStar}
                            disabled={neutralStarCount === 0}
                            oninput={(event) =>
                                onNeutralShipsPerStarChange(
                                    Number((event.currentTarget as HTMLInputElement).value),
                                )}
                        />
                        <strong>{neutralShipsPerStar}</strong>
                    </label>
                </div>
            </div>
        </div>
    {/if}
</section>

<style>
    .game-map-panel {
        display: flex;
        flex-direction: column;
        gap: 18px;
    }

    .game-map-panel__header {
        align-items: center;
    }

    .tick-chip {
        display: grid;
        gap: 8px;
        min-width: min(260px, 100%);
        min-height: 74px;
        padding: 12px 16px;
        border-radius: var(--pf-card-radius);
        border: 1px solid var(--pf-border-soft);
        background: var(--pf-surface-card);
    }

    .tick-chip__label,
    .range-field span,
    .preview-well__label {
        font-family: var(--pf-font-body);
        font-size: 0.82rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--pf-muted);
    }

    .tick-chip__controls {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 12px;
        align-items: center;
    }

    .tick-chip__controls strong,
    .range-field strong,
    .metric-field strong {
        font-family: var(--pf-font-body);
        font-size: 0.96rem;
        font-weight: 700;
        color: var(--pf-text);
    }

    .game-map-panel__tabs {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
    }

    .game-map-panel__tab,
    .lane-mode__button,
    .preview-well__reshuffle,
    .saved-map-card {
        border: 1px solid var(--pf-border-soft);
        background: var(--pf-surface-pill);
        color: var(--pf-muted-strong);
        cursor: pointer;
        transition:
            border-color 0.15s ease,
            background 0.15s ease,
            color 0.15s ease,
            transform 0.15s ease;
    }

    .game-map-panel__tab,
    .lane-mode__button {
        min-height: var(--pf-control-h);
        border-radius: var(--pf-button-radius);
        font-family: var(--pf-font-body);
        font-size: 0.92rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    .game-map-panel__tab:hover,
    .game-map-panel__tab.is-active,
    .lane-mode__button:hover,
    .lane-mode__button.is-active,
    .preview-well__reshuffle:hover,
    .saved-map-card:hover,
    .saved-map-card.is-selected {
        border-color: var(--pf-accent-soft);
        color: var(--pf-text);
        background: var(--pf-surface-pill-active);
        transform: translateY(-1px);
    }

    .game-map-panel__random-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
        align-items: stretch;
    }

    .control-cluster,
    .preview-well {
        min-height: 248px;
    }

    .control-cluster {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: var(--pf-card-pad);
        border-radius: var(--pf-card-radius);
        border: 1px solid var(--pf-border-soft);
        background: var(--pf-surface-card);
    }

    .control-cluster__title,
    .control-cluster__value {
        font-family: var(--pf-font-display);
        font-size: 0.92rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
    }

    .control-cluster__title {
        color: var(--pf-heading);
    }

    .control-cluster__value {
        color: var(--pf-text);
    }

    .control-cluster__title-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
    }

    .control-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
    }

    .lane-mode {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
    }

    .metric-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
    }

    .range-field,
    .metric-field {
        display: grid;
        gap: 8px;
        align-content: start;
    }

    .range-field--wide {
        grid-column: 1 / -1;
    }

    .range-field.is-disabled {
        opacity: 0.45;
    }

    .dual-range-shell {
        padding-inline: 4px;
    }

    .metric-field {
        padding: 12px 14px;
        border-radius: var(--pf-button-radius);
        background: var(--pf-surface-control);
        border: 1px solid var(--pf-border-faint);
    }

    .preview-well {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: var(--pf-card-pad);
        border-radius: var(--pf-card-radius);
        border: 1px solid var(--pf-border-soft);
        background: var(--pf-surface-card);
    }

    .preview-well__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
    }

    .preview-well__reshuffle {
        min-height: var(--pf-pill-h);
        padding: 0 12px;
        border-radius: var(--pf-pill-radius);
        font-family: var(--pf-font-body);
        font-size: 0.84rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    .preview-well__frame {
        display: grid;
        place-items: center;
        flex: 1;
        min-height: 0;
        padding: 12px;
        border-radius: calc(var(--pf-card-radius) - 2px);
        overflow: hidden;
        border: 1px solid var(--pf-border-faint);
        background: var(--pf-surface-preview);
        box-shadow: inset 0 0 0 1px var(--pf-border-faint), 0 0 28px var(--pf-preview-glow);
    }

    .preview-well__image {
        width: 100%;
        height: 100%;
        object-fit: contain;
        object-position: center;
        display: block;
    }

    .preview-well__placeholder,
    .saved-map-empty {
        display: grid;
        place-items: center;
        min-height: 100%;
        padding: 24px;
        border-radius: var(--pf-card-radius);
        color: var(--pf-muted);
        font-family: var(--pf-font-body);
        font-size: 1rem;
        text-align: center;
        background: var(--pf-surface-field);
        border: 1px dashed var(--pf-border-strong);
    }

    .saved-mode-layout {
        display: grid;
        gap: 14px;
    }

    .saved-map-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(156px, 1fr));
        gap: 12px;
    }

    .saved-map-card {
        display: grid;
        gap: 8px;
        padding: 12px;
        border-radius: var(--pf-card-radius);
        text-align: left;
    }

    .saved-map-card__thumb {
        width: 100%;
        aspect-ratio: 1.35;
        border-radius: var(--pf-button-radius);
        background: var(--pf-surface-preview);
    }

    .saved-map-card__title {
        font-family: var(--pf-font-display);
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--pf-text);
    }

    .saved-map-card__meta {
        font-family: var(--pf-font-body);
        font-size: 0.85rem;
        color: var(--pf-muted);
    }

    @media (max-width: 1199px) {
        .game-map-panel__random-grid {
            grid-template-columns: 1fr;
        }
    }

    @media (max-width: 767px) {
        .game-map-panel__header {
            align-items: stretch;
        }

        .control-grid,
        .metric-grid,
        .tick-chip__controls {
            grid-template-columns: 1fr;
        }
    }
</style>
