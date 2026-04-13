<script lang="ts">
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
        }>;
        connections: Array<{
            sourceId: string;
            targetId: string;
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

    $effect(() => {
        onMinLinksChange(dualMin);
        onMaxLinksChange(dualMax);
    });

    function getBoardFitLabel(value: number): string {
        if (value >= 0.95) return "Symmetrical";
        if (value >= 0.7) return "Balanced";
        return "Asymmetric";
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
                            <RangeDual bind:min={dualMin} bind:max={dualMax} minLimit={1} maxLimit={8} />
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
                                    <line
                                        x1={src.x}
                                        y1={src.y}
                                        x2={tgt.x}
                                        y2={tgt.y}
                                        stroke={isSelected ? "rgba(120,200,255,0.68)" : "rgba(84,112,164,0.56)"}
                                        stroke-width={Math.max(1, vw * 0.006)}
                                    />
                                {/if}
                            {/each}
                            {#each map.stars as star, starIndex}
                                <circle
                                    cx={star.x}
                                    cy={star.y}
                                    r={Math.max(2, vw * 0.015)}
                                    fill={star.ownerId === "neutral"
                                        ? "#666"
                                        : `hsl(${(starIndex * 60) % 360}, 70%, 60%)`}
                                    opacity={isSelected ? 1 : 0.72}
                                />
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
        background: rgba(255, 255, 255, 0.03);
    }

    .tick-chip__label,
    .range-field span,
    .preview-well__label {
        font-family: "Rajdhani", sans-serif;
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
        font-family: "Rajdhani", sans-serif;
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
        background: rgba(255, 255, 255, 0.03);
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
        border-radius: 12px;
        font-family: "Rajdhani", sans-serif;
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
        background: rgba(255, 255, 255, 0.06);
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
        background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 45%),
            rgba(255, 255, 255, 0.02);
    }

    .control-cluster__title,
    .control-cluster__value {
        font-family: "Oxanium", sans-serif;
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
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.04);
    }

    .preview-well {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: var(--pf-card-pad);
        border-radius: var(--pf-card-radius);
        border: 1px solid var(--pf-border-soft);
        background:
            radial-gradient(circle at top, rgba(255, 255, 255, 0.06), transparent 40%),
            rgba(255, 255, 255, 0.025);
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
        border-radius: 999px;
        font-family: "Rajdhani", sans-serif;
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
        border: 1px solid rgba(255, 255, 255, 0.06);
        background:
            radial-gradient(circle at 50% 50%, rgba(86, 214, 255, 0.08), transparent 55%),
            rgba(3, 10, 20, 0.72);
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
        border-radius: 18px;
        color: var(--pf-muted);
        font-family: "Rajdhani", sans-serif;
        font-size: 1rem;
        text-align: center;
        background: rgba(255, 255, 255, 0.02);
        border: 1px dashed var(--pf-border-soft);
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
        border-radius: 12px;
        background: rgba(3, 10, 20, 0.65);
    }

    .saved-map-card__title {
        font-family: "Oxanium", sans-serif;
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--pf-text);
    }

    .saved-map-card__meta {
        font-family: "Rajdhani", sans-serif;
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
