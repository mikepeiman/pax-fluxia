<script lang="ts">
    import { GAME_CONFIG } from '$lib/config/game.config';
    import { bumpTerritoryVisualConfig } from '$lib/territory/bumpTerritoryVisualConfig';
    import {
        beginTerritoryTuningCompile,
        territoryTuningStatus,
    } from '$lib/stores/territoryTuningStatusStore';

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
    }

    let { panel, updatePanel }: Props = $props();

    let cxOn = $derived(
        panel.corridorEnabled ??
            GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED ??
            true,
    );
    let dxOn = $derived(
        panel.disconnectEnabled ??
            GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED ??
            false,
    );

    const topologyCommitFrames = new Map<string, number>();
    const topologyCommitTimeouts = new Map<string, number>();

    function clearScheduledTopologyCommit(configKey: string): void {
        const pendingFrame = topologyCommitFrames.get(configKey);
        if (
            pendingFrame !== undefined &&
            typeof cancelAnimationFrame === 'function'
        ) {
            cancelAnimationFrame(pendingFrame);
        }
        topologyCommitFrames.delete(configKey);

        const pendingTimeout = topologyCommitTimeouts.get(configKey);
        if (pendingTimeout !== undefined) {
            clearTimeout(pendingTimeout);
        }
        topologyCommitTimeouts.delete(configKey);
    }

    function queueTopologyToggleUpdate(
        configKey: string,
        panelKey: string,
        value: any,
        label: string,
    ): void {
        clearScheduledTopologyCommit(configKey);
        updatePanel(panelKey, value);
        beginTerritoryTuningCompile(label);

        if (typeof requestAnimationFrame === 'function') {
            const frameId = requestAnimationFrame(() => {
                topologyCommitFrames.delete(configKey);
                (GAME_CONFIG as any)[configKey] = value;
                bumpTerritoryVisualConfig();
            });
            topologyCommitFrames.set(configKey, frameId);
            return;
        }

        const timeoutId = window.setTimeout(() => {
            topologyCommitTimeouts.delete(configKey);
            (GAME_CONFIG as any)[configKey] = value;
            bumpTerritoryVisualConfig();
        }, 0);
        topologyCommitTimeouts.set(configKey, timeoutId);
    }

    function queueTopologySliderUpdate(
        configKey: string,
        panelKey: string,
        value: any,
        label: string,
        delayMs = 120,
    ): void {
        clearScheduledTopologyCommit(configKey);
        updatePanel(panelKey, value);
        beginTerritoryTuningCompile(label);

        const timeoutId = window.setTimeout(() => {
            topologyCommitTimeouts.delete(configKey);
            (GAME_CONFIG as any)[configKey] = value;
            bumpTerritoryVisualConfig();
        }, delayMs);
        topologyCommitTimeouts.set(configKey, timeoutId);
    }
</script>

<div class="topology-shell">
    <div class="engine-control-group topology-card">
        <div class="topology-card__header">
            <h4 class="axis-card-title">Topology Rules</h4>
            <p class="topology-card__intro">
                Set the minimum owned footprint and the shared connection rules
                that determine how territory geometry stays linked or deliberately
                splits apart before renderer-specific styling.
            </p>
        </div>

        <div class="axis-note">
            {#if $territoryTuningStatus.pending}
                <strong>Compiling…</strong>
                {$territoryTuningStatus.label}
            {:else if $territoryTuningStatus.lastDurationMs !== null}
                <strong>Last compile:</strong>
                {$territoryTuningStatus.lastDurationMs} ms
                {#if $territoryTuningStatus.lastCompletedLabel}
                    · {$territoryTuningStatus.lastCompletedLabel}
                {/if}
            {/if}
        </div>

        <h5 class="territory-inline-heading">Minimum Footprint</h5>

        <div
            class="var-row"
            title="Metaball: each cell inside this radius of a real star is assigned to that star’s cluster (nearest star wins), so every owned star keeps a disc of territory. Voronoi and engine paths use the same value for geometric margins."
        >
            <div class="row-top">
                <span class="var-name">Minimum Star Margin</span>
                <span class="val">
                    {panel.starMargin ??
                        GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ??
                        45}px
                </span>
            </div>
            <input
                type="range"
                min="0"
                max="500"
                step="5"
                value={panel.starMargin ??
                    GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ??
                    45}
                oninput={(e) => {
                    const v = +(e.target as HTMLInputElement).value;
                    queueTopologySliderUpdate(
                        'MODIFIED_VORONOI_STAR_MARGIN',
                        'starMargin',
                        v,
                        'Minimum Star Margin',
                    );
                }}
            />
        </div>

        <h5 class="territory-inline-heading">Corridors</h5>

        <div class="var-row">
            <div class="row-top">
                <span class="var-name">Corridor Virtual Sites (CX)</span>
                <label class="lock-toggle">
                    <input
                        type="checkbox"
                        checked={panel.corridorEnabled ??
                            GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED ??
                            true}
                        onchange={(e) => {
                            const v = (e.target as HTMLInputElement).checked;
                            queueTopologyToggleUpdate(
                                'MODIFIED_VORONOI_CORRIDOR_ENABLED',
                                'corridorEnabled',
                                v,
                                'Corridor Virtual Sites (CX)',
                            );
                        }}
                    />
                    {(panel.corridorEnabled ??
                    GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED ??
                    true)
                        ? 'On'
                        : 'Off'}
                </label>
            </div>
        </div>

        <div class="var-row indent">
            <div class="row-top">
                <span class="var-name">Lane Midpoint Pairs</span>
                <label class="lock-toggle">
                    <input
                        type="checkbox"
                        checked={panel.cxContestMidpointVstars ??
                            GAME_CONFIG.TERRITORY_CX_CONTEST_MIDPOINT_VSTARS ??
                            true}
                        onchange={(e) => {
                            const v = (e.target as HTMLInputElement).checked;
                            queueTopologyToggleUpdate(
                                'TERRITORY_CX_CONTEST_MIDPOINT_VSTARS',
                                'cxContestMidpointVstars',
                                v,
                                'Lane Midpoint Pairs',
                            );
                        }}
                    />
                    {(panel.cxContestMidpointVstars ??
                    GAME_CONFIG.TERRITORY_CX_CONTEST_MIDPOINT_VSTARS ??
                    true)
                        ? 'On'
                        : 'Off'}
                </label>
            </div>
        </div>

        <div
            class="var-row indent"
            class:disabled={!cxOn}
            title={!cxOn ? 'Turn Corridor Virtual Sites on to edit these values.' : ''}
        >
            <div class="row-top">
                <span class="var-name">Lane Midpoint Pair Count</span>
                <span class="val">
                    {panel.cxContestPairCount ??
                        GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_COUNT ??
                        1}
                </span>
            </div>
            <input
                type="range"
                min="1"
                max="10"
                step="1"
                disabled={!cxOn}
                value={panel.cxContestPairCount ??
                    GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_COUNT ??
                    1}
                oninput={(e) => {
                    const v = +(e.target as HTMLInputElement).value;
                    queueTopologySliderUpdate(
                        'TERRITORY_CX_CONTEST_PAIR_COUNT',
                        'cxContestPairCount',
                        v,
                        'Lane Midpoint Pair Count',
                    );
                }}
            />
        </div>

        <div
            class="var-row indent"
            class:disabled={!cxOn}
            title={!cxOn ? 'Turn Corridor Virtual Sites on to edit these values.' : ''}
        >
            <div class="row-top">
                <span class="var-name">Lane Midpoint Pair Weight</span>
                <span class="val">
                    {(
                        panel.cxContestPairWeight ??
                        GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_WEIGHT ??
                        0.5
                    ).toFixed(2)}
                </span>
            </div>
            <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                disabled={!cxOn}
                value={panel.cxContestPairWeight ??
                    GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_WEIGHT ??
                    0.5}
                oninput={(e) => {
                    const v = +(e.target as HTMLInputElement).value;
                    queueTopologySliderUpdate(
                        'TERRITORY_CX_CONTEST_PAIR_WEIGHT',
                        'cxContestPairWeight',
                        v,
                        'Lane Midpoint Pair Weight',
                    );
                }}
            />
        </div>

        <div
            class="var-row indent"
            class:disabled={!cxOn}
            title={!cxOn ? 'Turn Corridor Virtual Sites on to edit these values.' : ''}
        >
            <div class="row-top">
                <span class="var-name">Corridor Sample Count</span>
                <span class="val">
                    {(panel.cxCount ?? GAME_CONFIG.TERRITORY_CX_COUNT ?? 0) === 0
                        ? 'Auto'
                        : (panel.cxCount ?? GAME_CONFIG.TERRITORY_CX_COUNT)}
                </span>
            </div>
            <input
                type="range"
                min="0"
                max="20"
                step="1"
                disabled={!cxOn}
                value={panel.cxCount ?? GAME_CONFIG.TERRITORY_CX_COUNT ?? 0}
                oninput={(e) => {
                    const v = +(e.target as HTMLInputElement).value;
                    queueTopologySliderUpdate(
                        'TERRITORY_CX_COUNT',
                        'cxCount',
                        v,
                        'Corridor Sample Count',
                    );
                }}
            />
        </div>

        <div
            class="var-row indent"
            class:disabled={!cxOn}
            title={!cxOn ? 'Turn Corridor Virtual Sites on to edit these values.' : ''}
        >
            <div class="row-top">
                <span class="var-name">Corridor Weight</span>
                <span class="val">
                    {(
                        panel.cxWeight ??
                        GAME_CONFIG.TERRITORY_CX_WEIGHT ??
                        0.5
                    ).toFixed(2)}
                </span>
            </div>
            <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                disabled={!cxOn}
                value={panel.cxWeight ?? GAME_CONFIG.TERRITORY_CX_WEIGHT ?? 0.5}
                oninput={(e) => {
                    const v = +(e.target as HTMLInputElement).value;
                    queueTopologySliderUpdate(
                        'TERRITORY_CX_WEIGHT',
                        'cxWeight',
                        v,
                        'Corridor Weight',
                    );
                }}
            />
        </div>

        <div
            class="var-row indent"
            class:disabled={!cxOn}
            title={!cxOn ? 'Turn Corridor Virtual Sites on to edit these values.' : ''}
        >
            <div class="row-top">
                <span class="var-name">Corridor Spacing</span>
                <span class="val">
                    {panel.corridorSpacing ??
                        GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING ??
                        60}px
                </span>
            </div>
            <input
                type="range"
                min="10"
                max="200"
                step="5"
                disabled={!cxOn}
                value={panel.corridorSpacing ??
                    GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING ??
                    60}
                oninput={(e) => {
                    const v = +(e.target as HTMLInputElement).value;
                    queueTopologySliderUpdate(
                        'MODIFIED_VORONOI_CORRIDOR_SPACING',
                        'corridorSpacing',
                        v,
                        'Corridor Spacing',
                    );
                }}
            />
        </div>

        <h5 class="territory-inline-heading">Disconnects</h5>

        <div class="var-row">
            <div class="row-top">
                <span class="var-name">Disconnect Gaps (DX)</span>
                <label class="lock-toggle">
                    <input
                        type="checkbox"
                        checked={panel.disconnectEnabled ??
                            GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED ??
                            false}
                        onchange={(e) => {
                            const v = (e.target as HTMLInputElement).checked;
                            queueTopologyToggleUpdate(
                                'MODIFIED_VORONOI_DISCONNECT_ENABLED',
                                'disconnectEnabled',
                                v,
                                'Disconnect Gaps (DX)',
                            );
                        }}
                    />
                    {(panel.disconnectEnabled ??
                    GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED ??
                    false)
                        ? 'On'
                        : 'Off'}
                </label>
            </div>
        </div>

        <div
            class="var-row indent"
            class:disabled={!dxOn}
            title={!dxOn ? 'Turn Disconnect Gaps on to edit these values.' : ''}
        >
            <div class="row-top">
                <span class="var-name">Disconnect Weight</span>
                <span class="val">
                    {(
                        panel.dxWeight ??
                        GAME_CONFIG.TERRITORY_DX_WEIGHT ??
                        0.3
                    ).toFixed(2)}
                </span>
            </div>
            <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                disabled={!dxOn}
                value={panel.dxWeight ?? GAME_CONFIG.TERRITORY_DX_WEIGHT ?? 0.3}
                oninput={(e) => {
                    const v = +(e.target as HTMLInputElement).value;
                    queueTopologySliderUpdate(
                        'TERRITORY_DX_WEIGHT',
                        'dxWeight',
                        v,
                        'Disconnect Weight',
                    );
                }}
            />
        </div>

        <div
            class="var-row indent"
            class:disabled={!dxOn}
            title={!dxOn ? 'Turn Disconnect Gaps on to edit these values.' : ''}
        >
            <div class="row-top">
                <span class="var-name">Disconnect Distance</span>
                <span class="val">
                    {panel.disconnectDistance ??
                        GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE ??
                        400}px
                </span>
            </div>
            <input
                type="range"
                min="50"
                max="1000"
                step="25"
                disabled={!dxOn}
                value={panel.disconnectDistance ??
                    GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE ??
                    400}
                oninput={(e) => {
                    const v = +(e.target as HTMLInputElement).value;
                    queueTopologySliderUpdate(
                        'MODIFIED_VORONOI_DISCONNECT_DISTANCE',
                        'disconnectDistance',
                        v,
                        'Disconnect Distance',
                    );
                }}
            />
        </div>
    </div>
</div>

<style>
    @import "./panel-shared.css";

    .topology-shell {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin: 0 0 16px;
    }

    .topology-card {
        margin: 0;
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

    .topology-card__header {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .topology-card__intro {
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

    .territory-inline-heading {
        margin: 2px 0 0;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: rgba(168, 208, 239, 0.78);
    }

    .lock-toggle {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        font-weight: 600;
        color: rgba(149, 211, 177, 0.9);
    }

    .lock-toggle input {
        margin: 0;
    }

    .axis-note {
        font-size: 10px;
        line-height: 1.4;
        color: rgba(188, 207, 224, 0.72);
    }
</style>
