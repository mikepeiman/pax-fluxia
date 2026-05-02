<script lang="ts">
    import { GAME_CONFIG } from '$lib/config/game.config';
    import { bumpTerritoryVisualConfig } from '$lib/territory/bumpTerritoryVisualConfig';
    import { getTerritoryRenderModeLabel } from '$lib/territory/ui/territoryRenderModeCatalog';

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
    }

    let { panel, updatePanel }: Props = $props();

    function writeConfig(configKey: string, panelKey: string, value: unknown): void {
        (GAME_CONFIG as Record<string, unknown>)[configKey] = value;
        updatePanel(panelKey, value);
        bumpTerritoryVisualConfig();
    }

    function activeRenderMode(): string {
        return (
            panel.territoryRenderMode ??
            GAME_CONFIG.TERRITORY_RENDER_MODE ??
            'territory_canonical'
        ) as string;
    }
</script>

<div class="mode-tuning-shell">
    <div class="mode-card">
        <div class="mode-card__header">
            <h4 class="axis-card-title">Perimeter Field</h4>
            <p class="mode-card__intro">
                Dedicated mode-only tuning. This section intentionally owns only the
                star-centered metaball contribution so shared topology, geometry-source,
                and perimeter-shell controls stay in their existing homes.
            </p>
        </div>

        {#if activeRenderMode() !== 'perimeter_field'}
            <div class="axis-note">
                Applies when the active territory render mode is <strong>Perimeter Field</strong>.
                Current mode: {getTerritoryRenderModeLabel(activeRenderMode())}.
            </div>
        {/if}

        <div class="var-row">
            <div class="row-top">
                <span
                    class="var-name"
                    title="Strength of the real star-centered metaballs mixed back into Perimeter Field. Set to 0 to disable the star-site contribution."
                >
                    Star Metaball Power
                </span>
                <span class="val">
                    {(panel.perimeterFieldStarMetaballWeight ??
                        GAME_CONFIG.PERIMETER_FIELD_STAR_METABALL_WEIGHT ??
                        4.3).toFixed(2)}
                </span>
            </div>
            <div class="var-desc">
                Real stars add their own metaball cores back into the field. This uses the
                same displayed radius as <strong>Perimeter Vstar Radius</strong> in the
                <strong>Territory Renderer Tuning</strong> section, but with a
                separate strength control.
            </div>
            <input
                type="range"
                min="0"
                max="8"
                step="0.05"
                value={panel.perimeterFieldStarMetaballWeight ??
                    GAME_CONFIG.PERIMETER_FIELD_STAR_METABALL_WEIGHT ??
                    4.3}
                oninput={(event) => {
                    const value = parseFloat((event.target as HTMLInputElement).value);
                    writeConfig(
                        'PERIMETER_FIELD_STAR_METABALL_WEIGHT',
                        'perimeterFieldStarMetaballWeight',
                        value,
                    );
                }}
            />
        </div>
    </div>
</div>

<style>
    @import "./panel-shared.css";

    .mode-tuning-shell {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin: 0 0 16px;
    }

    .mode-card {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 12px;
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.025)),
            rgba(16, 22, 34, 0.7);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    }

    .mode-card__header {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .mode-card__intro {
        margin: 0;
        font-size: 11px;
        line-height: 1.45;
        color: rgba(188, 207, 224, 0.72);
    }

    .axis-card-title {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: rgba(236, 242, 249, 0.92);
        margin: 0;
        padding-bottom: 6px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .axis-note,
    .var-desc {
        font-size: 10px;
        line-height: 1.4;
        color: rgba(188, 207, 224, 0.72);
    }
</style>
