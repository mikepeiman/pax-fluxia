<script lang="ts">
    import { onMount } from "svelte";
    import { fly } from "svelte/transition";
    import type { PlayerConfig } from "./menuDefs";
    import HueDial from "./HueDial.svelte";
    import PlayerColorPopover from "./PlayerColorPopover.svelte";

    interface StrategyOption {
        id: string;
        label: string;
    }

    interface Props {
        playerCount: number;
        playerOptions: number[];
        playerName: string;
        playerConfigs: PlayerConfig[];
        difficultyOptions: string[];
        strategyOptions: StrategyOption[];
        showAIDetails: boolean;
        hueOffset: number;
        colorSat: number;
        colorLig: number;
        playerHueLimit: number;
        getPlayerColorHex: (index: number) => string;
        getPlayerHue: (index: number) => number;
        onPlayerCountChange: (count: number) => void;
        onPlayerNameChange: (value: string) => void;
        onToggleAIDetails: () => void;
        onHueOffsetChange: (value: number) => void;
        onColorSatChange: (value: number) => void;
        onColorLigChange: (value: number) => void;
        onPlayerDifficultyChange: (index: number, value: string) => void;
        onPlayerStrategyChange: (index: number, value: string) => void;
        onPlayerHueNudgeChange: (index: number, value: number) => void;
        onResetPlayerHueNudge: (index: number) => void;
    }

    let {
        playerCount,
        playerOptions,
        playerName,
        playerConfigs,
        difficultyOptions,
        strategyOptions,
        showAIDetails,
        hueOffset,
        colorSat,
        colorLig,
        playerHueLimit,
        getPlayerColorHex,
        getPlayerHue,
        onPlayerCountChange,
        onPlayerNameChange,
        onToggleAIDetails,
        onHueOffsetChange,
        onColorSatChange,
        onColorLigChange,
        onPlayerDifficultyChange,
        onPlayerStrategyChange,
        onPlayerHueNudgeChange,
        onResetPlayerHueNudge,
    }: Props = $props();

    let panelEl: HTMLElement | null = null;
    let openPopoverIndex = $state<number | null>(null);

    function togglePopover(index: number) {
        openPopoverIndex = openPopoverIndex === index ? null : index;
    }

    onMount(() => {
        const handlePointerDown = (event: MouseEvent) => {
            if (openPopoverIndex === null) return;
            const target = event.target as Node | null;
            if (!target) return;
            if (panelEl?.contains(target)) return;
            openPopoverIndex = null;
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                openPopoverIndex = null;
            }
        };

        document.addEventListener("mousedown", handlePointerDown, true);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown, true);
            document.removeEventListener("keydown", handleKeyDown);
        };
    });
</script>

<section bind:this={panelEl} class="menu-panel players-panel">
    <div class="menu-panel__header players-panel__header">
        <div>
            <h2 class="menu-panel__eyebrow">Players</h2>
            <p class="menu-panel__title">Command roster, count, and palette</p>
        </div>

        <div class="players-panel__header-controls">
            <div class="players-panel__knob-block">
                <span class="players-panel__knob-label">Anchor Hue</span>
                <HueDial value={hueOffset} label="Anchor Hue" onChange={onHueOffsetChange} />
            </div>

            <button
                type="button"
                class="players-panel__toggle"
                class:is-active={showAIDetails}
                onclick={onToggleAIDetails}
            >
                <span class="players-panel__toggle-label">Strategy</span>
                <strong>{showAIDetails ? "Expanded" : "Compact"}</strong>
            </button>
        </div>
    </div>

    <div class="players-panel__count-block">
        <span class="players-panel__count-label">Number of Players</span>
        <div class="players-panel__count-row">
            {#each playerOptions as option}
                <button
                    type="button"
                    class="players-panel__count-button"
                    class:is-active={playerCount === option}
                    onclick={() => onPlayerCountChange(option)}
                >
                    {option}
                </button>
            {/each}
        </div>
    </div>

    <div class="players-panel__stack">
        {#each Array.from({ length: playerCount }, (_, index) => index) as index}
            {@const isCommander = index === 0}
            <div class="player-row-block" class:is-open={openPopoverIndex === index}>
                <div class="player-row" class:is-commander={isCommander}>
                    <button
                        type="button"
                        class="player-row__swatch"
                        style={`background:${getPlayerColorHex(index)}`}
                        onclick={() => togglePopover(index)}
                        title={`Adjust Player ${index + 1} color`}
                    ></button>

                    <div class="player-row__identity">
                        <span class="player-row__slot">P{index + 1}</span>
                        <div class="player-row__role">{isCommander ? "Commander" : "AI"}</div>
                    </div>

                    {#if isCommander}
                        <input
                            type="text"
                            class="player-row__name"
                            value={playerName}
                            maxlength="20"
                            placeholder="Commander"
                            oninput={(event) =>
                                onPlayerNameChange(
                                    (event.currentTarget as HTMLInputElement).value,
                                )}
                        />
                    {:else}
                        <div class="player-row__controls">
                            <select
                                class="player-row__select"
                                value={playerConfigs[index]?.difficulty ?? "Normal"}
                                onchange={(event) =>
                                    onPlayerDifficultyChange(
                                        index,
                                        (event.currentTarget as HTMLSelectElement).value,
                                    )}
                            >
                                {#each difficultyOptions as difficulty}
                                    <option value={difficulty}>{difficulty}</option>
                                {/each}
                            </select>

                            {#if showAIDetails}
                                <select
                                    class="player-row__select"
                                    value={playerConfigs[index]?.strategy ?? "default"}
                                    onchange={(event) =>
                                        onPlayerStrategyChange(
                                            index,
                                            (event.currentTarget as HTMLSelectElement).value,
                                        )}
                                >
                                    {#each strategyOptions as strategy}
                                        <option value={strategy.id}>{strategy.label}</option>
                                    {/each}
                                </select>
                            {/if}
                        </div>
                    {/if}
                </div>

                {#if openPopoverIndex === index}
                    <div transition:fly={{ y: -6, duration: 150 }}>
                        <PlayerColorPopover
                            playerLabel={`P${index + 1}`}
                            playerColor={getPlayerColorHex(index)}
                            currentHue={getPlayerHue(index)}
                            hueNudge={playerConfigs[index]?.hueNudge ?? 0}
                            saturation={colorSat}
                            lightness={colorLig}
                            hueLimit={playerHueLimit}
                            onHueNudgeChange={(value) => onPlayerHueNudgeChange(index, value)}
                            onSaturationChange={onColorSatChange}
                            onLightnessChange={onColorLigChange}
                            onReset={() => onResetPlayerHueNudge(index)}
                        />
                    </div>
                {/if}
            </div>
        {/each}
    </div>
</section>

<style>
    .players-panel {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 18px;
    }

    .players-panel__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
    }

    .players-panel__header-controls {
        display: flex;
        align-items: stretch;
        gap: 12px;
    }

    .players-panel__knob-block {
        display: grid;
        justify-items: center;
        gap: 10px;
        min-width: 108px;
        min-height: 110px;
        padding: 12px 14px;
        border-radius: var(--pf-card-radius);
        border: 1px solid var(--pf-border-faint);
        background: var(--pf-surface-card);
    }

    .players-panel__knob-label,
    .players-panel__count-label {
        font-family: var(--pf-font-body);
        font-size: var(--pax-type-xs-plus);
        font-weight: var(--pax-weight-bold);
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--pf-muted);
    }

    .players-panel__toggle,
    .players-panel__count-button {
        min-height: var(--pf-pill-h);
        padding: 0 14px;
        border-radius: var(--pf-pill-radius);
        border: 1px solid var(--pf-border-soft);
        background: var(--pf-surface-pill);
        color: var(--pf-muted-strong);
        font-family: var(--pf-font-body);
        font-size: var(--pax-type-sm);
        font-weight: var(--pax-weight-bold);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        cursor: pointer;
        transition:
            border-color 0.15s ease,
            color 0.15s ease,
            background 0.15s ease;
    }

    .players-panel__toggle {
        display: grid;
        align-content: center;
        justify-items: center;
        gap: 4px;
        min-width: 120px;
        min-height: 110px;
        padding: 12px 16px;
        border-radius: var(--pf-card-radius);
        background: var(--pf-surface-card);
    }

    .players-panel__toggle-label {
        font-size: var(--pax-type-xs);
        letter-spacing: 0.14em;
        color: var(--pf-muted);
    }

    .players-panel__toggle strong {
        font-family: var(--pf-font-display);
        font-size: var(--pax-type-sm-plus);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: currentColor;
    }

    .players-panel__toggle:hover,
    .players-panel__toggle.is-active,
    .players-panel__count-button:hover,
    .players-panel__count-button.is-active {
        border-color: var(--pf-accent-soft);
        color: var(--pf-text);
        background: var(--pf-surface-pill-active);
    }

    .players-panel__count-block {
        display: grid;
        gap: 10px;
        padding: var(--pf-card-pad);
        border-radius: var(--pf-card-radius);
        border: 1px solid var(--pf-border-faint);
        background: var(--pf-surface-card);
    }

    .players-panel__count-row {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 8px;
    }

    .players-panel__count-button {
        min-height: var(--pf-control-h);
        padding-inline: 0;
        border-radius: var(--pf-button-radius);
        font-size: var(--pax-type-sm-plus);
    }

    .players-panel__stack {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .player-row-block {
        position: relative;
    }

    .player-row {
        display: grid;
        grid-template-columns: 42px minmax(64px, auto) minmax(0, 1fr);
        align-items: center;
        gap: 12px;
        min-height: 68px;
        padding: 12px 14px;
        border-radius: var(--pf-card-radius);
        border: 1px solid var(--pf-border-soft);
        background: var(--pf-surface-card);
        transition:
            border-color 0.15s ease,
            background 0.15s ease,
            transform 0.15s ease;
    }

    .player-row:hover,
    .player-row-block.is-open .player-row {
        border-color: var(--pf-accent-soft);
        background: var(--pf-surface-card-hover);
        transform: translateY(-1px);
    }

    .player-row__swatch {
        width: 42px;
        height: 42px;
        border-radius: 999px;
        border: 2px solid var(--pf-border-swatch);
        box-shadow:
            0 0 0 1px color-mix(in srgb, var(--pax-color-void) 22%, transparent),
            var(--pf-shadow-glow);
        cursor: pointer;
        transition:
            transform 0.15s ease,
            border-color 0.15s ease;
    }

    .player-row__swatch:hover {
        transform: scale(1.05);
        border-color: var(--pf-slider-thumb-border);
    }

    .player-row__identity {
        display: grid;
        gap: 2px;
        min-width: 0;
    }

    .player-row__slot {
        font-family: var(--pf-font-display);
        font-size: var(--pax-type-sm);
        font-weight: var(--pax-weight-bold);
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--pf-text);
    }

    .player-row__role {
        font-family: var(--pf-font-body);
        font-size: var(--pax-type-xs-plus);
        font-weight: var(--pax-weight-semibold);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--pf-muted);
    }

    .player-row__name,
    .player-row__select {
        width: 100%;
        min-height: var(--pf-control-h);
        padding: 0 14px;
        border-radius: var(--pf-button-radius);
        border: 1px solid var(--pf-border-soft);
        background: var(--pf-surface-control);
        color: var(--pf-text);
        font-family: var(--pf-font-body);
        font-size: var(--pax-type-base);
        font-weight: var(--pax-weight-semibold);
        outline: none;
    }

    .player-row__name:focus,
    .player-row__select:focus {
        border-color: var(--pf-accent-strong);
        box-shadow: var(--pf-shadow-glow);
    }

    .player-row__controls {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
    }

    @media (max-width: 1024px) {
        .players-panel__header {
            flex-direction: column;
            align-items: stretch;
        }

        .players-panel__header-controls {
            width: 100%;
            justify-content: space-between;
        }
    }

    @media (max-width: 640px) {
        .player-row {
            grid-template-columns: 42px minmax(56px, auto) minmax(0, 1fr);
        }

        .player-row__controls,
        .players-panel__count-row {
            grid-template-columns: 1fr;
        }

        .players-panel__header-controls {
            flex-wrap: wrap;
        }

        .players-panel__knob-block,
        .players-panel__toggle {
            min-height: auto;
            flex: 1 1 180px;
        }
    }
</style>
