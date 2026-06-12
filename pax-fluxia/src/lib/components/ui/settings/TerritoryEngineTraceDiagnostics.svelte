<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";
    import {
        TERRITORY_PIPELINE_STAGE_ORDER,
        type TerritoryPipelineArtifacts,
        type TerritoryPipelineStageId,
    } from "$lib/territory/orchestrator";
    import { territoryTraceRun } from "$lib/territory/orchestrator/traceStore";
    import { PaxHudButton, PaxSettingsToggleRow } from "$lib/design-system";

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
    }

    let { panel, updatePanel }: Props = $props();

    function formatTraceValue(value: unknown): string {
        if (Array.isArray(value)) return `[${value.length}]`;
        if (typeof value === "number") {
            return Number.isInteger(value) ? `${value}` : value.toFixed(2);
        }
        if (typeof value === "boolean") return value ? "true" : "false";
        if (typeof value === "string") return value;
        if (value && typeof value === "object") {
            return `{${Object.keys(value as Record<string, unknown>).length}}`;
        }
        return String(value ?? "null");
    }

    function summarizeTraceRecord(
        record: Record<string, unknown> | undefined,
        limit = 6,
    ): string[] {
        if (!record) return [];
        return Object.entries(record)
            .filter(([, value]) => value !== undefined)
            .slice(0, limit)
            .map(([key, value]) => `${key}=${formatTraceValue(value)}`);
    }

    function getTraceArtifactEntries(
        artifacts: TerritoryPipelineArtifacts | undefined,
    ): Array<{
        stageId: TerritoryPipelineStageId;
        artifact: Record<string, unknown>;
    }> {
        if (!artifacts) return [];
        return TERRITORY_PIPELINE_STAGE_ORDER.flatMap((stageId) => {
            const artifact = artifacts[stageId];
            if (!artifact) return [];
            return [{ stageId, artifact: artifact as Record<string, unknown> }];
        });
    }

    function getNextTraceStageLabel(stepCount: number): string {
        return TERRITORY_PIPELINE_STAGE_ORDER[stepCount] ?? "complete";
    }

    function getOwnerRegionLoopPreviewEntries(
        artifacts: TerritoryPipelineArtifacts | undefined,
    ): Array<{ id: string; summary: string }> {
        const ownerRegionLoops = ((
            artifacts?.loop as
                | { ownerRegionLoops?: Array<Record<string, unknown>> }
                | undefined
        )?.ownerRegionLoops ?? []) as Array<Record<string, unknown>>;
        return ownerRegionLoops.slice(0, 4).map((loop, index) => {
            const ownerId = typeof loop.ownerId === "string" ? loop.ownerId : "?";
            const opposingOwnerId =
                typeof loop.opposingOwnerId === "string"
                    ? loop.opposingOwnerId
                    : "?";
            return {
                id:
                    typeof loop.regionLoopId === "string"
                        ? loop.regionLoopId
                        : `owner-region-${index}`,
                summary:
                    `${ownerId} vs ${opposingOwnerId} | `
                    + `area=${formatTraceValue(loop.absArea)} | `
                    + `conf=${formatTraceValue(loop.confidence)}`,
            };
        });
    }

    function getOwnerShellPreviewEntries(
        artifacts: TerritoryPipelineArtifacts | undefined,
    ): Array<{ id: string; summary: string }> {
        const ownerShells = ((
            artifacts?.loop as
                | { ownerShells?: Array<Record<string, unknown>> }
                | undefined
        )?.ownerShells ?? []) as Array<Record<string, unknown>>;
        return ownerShells.slice(0, 4).map((shell, index) => {
            const ownerId = typeof shell.ownerId === "string" ? shell.ownerId : "?";
            const holeCount = Array.isArray(shell.holeLoopIds)
                ? shell.holeLoopIds.length
                : 0;
            return {
                id:
                    typeof shell.shellId === "string"
                        ? shell.shellId
                        : `owner-shell-${index}`,
                summary:
                    `${ownerId} | `
                    + `area=${formatTraceValue(shell.absArea)} | `
                    + `holes=${formatTraceValue(holeCount)} | `
                    + `conf=${formatTraceValue(shell.confidence)}`,
            };
        });
    }

    function getOwnerHoldingTransitionSummary(
        artifacts: TerritoryPipelineArtifacts | undefined,
    ): string[] {
        const animation = (artifacts?.animation ?? undefined) as
            | Record<string, unknown>
            | undefined;
        if (!animation) return [];

        return [
            `transitions=${formatTraceValue(animation.ownerShellTransitionCount)}`,
            `matched=${formatTraceValue(animation.matchedOwnerShellCount)}`,
            `spawn=${formatTraceValue(animation.spawnedOwnerShellCount)}`,
            `vanish=${formatTraceValue(animation.vanishedOwnerShellCount)}`,
            `grow=${formatTraceValue(animation.grewOwnerShellCount)}`,
            `shrink=${formatTraceValue(animation.shrankOwnerShellCount)}`,
            `split=${formatTraceValue(animation.splitAnchoredSpawnCount)}`,
            `merge=${formatTraceValue(animation.mergeAnchoredVanishCount)}`,
            `fallback=${formatTraceValue(animation.ownerShellGeometryFallbackCount)}`,
            `holeTransitions=${formatTraceValue(animation.ownerShellHoleTransitionCount)}`,
        ];
    }

    function getOwnerHoldingTransitionPreviewEntries(
        artifacts: TerritoryPipelineArtifacts | undefined,
    ): Array<{ id: string; summary: string }> {
        const transitions = ((
            artifacts?.animation as
                | { ownerShellTransitions?: Array<Record<string, unknown>> }
                | undefined
        )?.ownerShellTransitions ?? []) as Array<Record<string, unknown>>;
        return transitions.slice(0, 6).map((transition, index) => {
            const ownerId =
                typeof transition.ownerId === "string" ? transition.ownerId : "?";
            const kind =
                typeof transition.kind === "string" ? transition.kind : "?";
            const anchorRelation =
                typeof transition.anchorRelation === "string"
                    ? transition.anchorRelation
                    : "none";
            const relationLabel =
                anchorRelation !== "none" ? `/${anchorRelation}` : "";
            return {
                id:
                    typeof transition.transitionId === "string"
                        ? transition.transitionId
                        : `owner-shell-transition-${index}`,
                summary:
                    `${ownerId} | ${kind}${relationLabel} | `
                    + `conf=${formatTraceValue(transition.confidence)} | `
                    + `contour=${formatTraceValue(transition.meanContourDistance)}/${formatTraceValue(transition.maxContourDistance)} | `
                    + `holes=${formatTraceValue(transition.previousHoleCount)}->${formatTraceValue(transition.currentHoleCount)}`,
            };
        });
    }
</script>

<div class="trace-diagnostics">
    <h5 class="trace-heading">Trace Inspector</h5>

    <PaxSettingsToggleRow
        label="Trace Mode"
        checked={panel.territoryEngineTraceMode
            ?? GAME_CONFIG.TERRITORY_ENGINE_TRACE_MODE}
        meta={(panel.territoryEngineTraceMode
            ?? GAME_CONFIG.TERRITORY_ENGINE_TRACE_MODE) ? "On" : "Off"}
        settingConfigKey="TERRITORY_ENGINE_TRACE_MODE"
        onChange={(value) => updatePanel("territoryEngineTraceMode", value)}
    />

    <PaxSettingsToggleRow
        label="Step Mode"
        checked={panel.territoryEngineStepMode
            ?? GAME_CONFIG.TERRITORY_ENGINE_STEP_MODE}
        meta={(panel.territoryEngineStepMode
            ?? GAME_CONFIG.TERRITORY_ENGINE_STEP_MODE) ? "On" : "Off"}
        settingConfigKey="TERRITORY_ENGINE_STEP_MODE"
        onChange={(value) => updatePanel("territoryEngineStepMode", value)}
    />

    {#if panel.territoryEngineStepMode ?? GAME_CONFIG.TERRITORY_ENGINE_STEP_MODE}
        <div class="trace-stage-card">
            <div class="trace-stage-card__header">
                <span class="trace-stage-card__label">Advance Stage</span>
                <span class="trace-stage-card__value"
                    >{panel.territoryEngineStepAdvanceToken
                        ?? GAME_CONFIG.TERRITORY_ENGINE_STEP_ADVANCE_TOKEN}</span
                >
            </div>
            <div class="trace-actions">
                <PaxHudButton
                    label="Advance"
                    size="sm"
                    onclick={() => {
                        const nextToken =
                            (panel.territoryEngineStepAdvanceToken
                                ?? GAME_CONFIG.TERRITORY_ENGINE_STEP_ADVANCE_TOKEN) + 1;
                        updatePanel("territoryEngineStepAdvanceToken", nextToken);
                    }}
                />
                <PaxHudButton
                    label="Reset"
                    size="sm"
                    onclick={() => {
                        updatePanel("territoryEngineStepAdvanceToken", 0);
                    }}
                />
            </div>
        </div>
    {/if}

    <div class="trace-panel">
        <div class="trace-panel__header">
            <span class="trace-stage-card__label">Latest Trace</span>
            {#if $territoryTraceRun}
                <span class="trace-stage-card__value">run {$territoryTraceRun.runId}</span>
            {:else}
                <span class="trace-stage-card__value">no trace</span>
            {/if}
        </div>

        {#if $territoryTraceRun}
            <div class="trace-chip-row">
                <span class="trace-chip"
                    >steps {$territoryTraceRun.steps.length}/{TERRITORY_PIPELINE_STAGE_ORDER.length}</span
                >
                <span class="trace-chip"
                    >next {getNextTraceStageLabel($territoryTraceRun.steps.length)}</span
                >
                <span class="trace-chip">mode {$territoryTraceRun.selection.mode}</span>
                <span class="trace-chip"
                    >static {$territoryTraceRun.selection.staticMethodId}</span
                >
                <span class="trace-chip">{$territoryTraceRun.totalDurationMs}ms</span>
            </div>

            <div class="trace-section">
                <div class="trace-section-title">Meta</div>
                <div class="trace-summary">
                    {summarizeTraceRecord($territoryTraceRun.meta, 8).join(" | ")}
                </div>
            </div>

            <div class="trace-section">
                <div class="trace-section-title">Owner Region Loops</div>
                {#each getOwnerRegionLoopPreviewEntries($territoryTraceRun.artifacts) as entry}
                    <div class="trace-detail-line">{entry.summary}</div>
                {/each}
            </div>

            <div class="trace-section">
                <div class="trace-section-title">Owner Shells</div>
                {#each getOwnerShellPreviewEntries($territoryTraceRun.artifacts) as entry}
                    <div class="trace-detail-line">{entry.summary}</div>
                {/each}
            </div>

            <div class="trace-section">
                <div class="trace-section-title">Holding Transitions</div>
                <div class="trace-summary">
                    {getOwnerHoldingTransitionSummary($territoryTraceRun.artifacts).join(" | ")}
                </div>
                {#each getOwnerHoldingTransitionPreviewEntries($territoryTraceRun.artifacts) as entry}
                    <div class="trace-detail-line">{entry.summary}</div>
                {/each}
            </div>

            <div class="trace-section">
                <div class="trace-section-title">Artifacts</div>
                {#each getTraceArtifactEntries($territoryTraceRun.artifacts) as entry}
                    <div class="trace-entry">
                        <div class="trace-entry-head">
                            <span class="trace-badge">{entry.stageId}</span>
                            <span class="val">{Object.keys(entry.artifact).length} keys</span>
                        </div>
                        <div class="trace-summary">
                            {summarizeTraceRecord(entry.artifact, 8).join(" | ")}
                        </div>
                    </div>
                {/each}
            </div>

            <div class="trace-section">
                <div class="trace-section-title">Steps</div>
                {#each $territoryTraceRun.steps as step}
                    <div class="trace-entry">
                        <div class="trace-entry-head">
                            <span class="trace-badge">{step.stageId}</span>
                            <span class="val">{step.durationMs}ms</span>
                        </div>
                        <div class="trace-summary">
                            {summarizeTraceRecord(step.summary, 8).join(" | ")}
                        </div>
                    </div>
                {/each}
            </div>
        {:else}
            <div class="trace-empty">
                Enable Trace Mode or Step Mode, then trigger a territory-engine render to capture a run here.
            </div>
        {/if}
    </div>
</div>

<style>
    @import "./panel-shared.css";

    .trace-diagnostics {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 8px;
    }

    .trace-heading {
        margin: 0;
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(191, 219, 254, 0.88);
    }

    .trace-actions {
        display: flex;
        gap: 6px;
    }

    .trace-stage-card {
        display: grid;
        gap: 8px;
        padding: 9px 10px;
        border: 1px solid transparent;
        border-radius: var(--hud-radius-sm);
        clip-path: var(--hud-rounded-corner-sm);
        background:
            linear-gradient(180deg, rgba(0, 18, 21, 0.78), rgba(0, 10, 13, 0.9)) padding-box,
            var(--hud-control-border-gradient) border-box;
    }

    .trace-stage-card__header,
    .trace-panel__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
    }

    .trace-stage-card__label {
        color: var(--hud-text);
        font-family: var(--hud-font-ui);
        font-size: calc(0.74rem * var(--hud-type-scale, 1));
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
    }

    .trace-stage-card__value {
        color: var(--hud-accent-warm-strong);
        font-family: var(--hud-font-data);
        font-size: calc(0.68rem * var(--hud-data-scale, 1));
        font-weight: 800;
    }

    .trace-panel {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 8px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.03);
    }

    .trace-chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
    }

    .trace-chip {
        padding: 2px 6px;
        border-radius: 999px;
        background: rgba(74, 222, 128, 0.12);
        border: 1px solid rgba(74, 222, 128, 0.2);
        color: #9ae6b4;
        font-size: 10px;
        font-family: monospace;
    }

    .trace-section {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .trace-section-title {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #8fb7ff;
    }

    .trace-entry {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 6px;
        border-radius: 5px;
        background: rgba(255, 255, 255, 0.04);
    }

    .trace-entry-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
    }

    .trace-badge {
        display: inline-flex;
        align-items: center;
        padding: 2px 6px;
        border-radius: 4px;
        background: rgba(147, 197, 253, 0.12);
        color: #bfdbfe;
        font-size: 10px;
        font-family: monospace;
    }

    .trace-summary {
        font-size: 10px;
        line-height: 1.4;
        color: rgba(255, 255, 255, 0.72);
        font-family: monospace;
        word-break: break-word;
    }

    .trace-detail-line {
        font-size: 10px;
        line-height: 1.35;
        color: rgba(255, 255, 255, 0.68);
        font-family: monospace;
    }

    .trace-empty {
        font-size: 10px;
        line-height: 1.4;
        color: rgba(255, 255, 255, 0.58);
    }
</style>
