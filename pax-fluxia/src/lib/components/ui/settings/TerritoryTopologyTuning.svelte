<script lang="ts">
  import "./panel-shared.css";
  import { GAME_CONFIG } from "$lib/config/game.config";
  import { bumpTerritoryVisualConfig } from "$lib/territory/bumpTerritoryVisualConfig";
  import {
    beginTerritoryTuningCompile,
    territoryTuningStatus,
  } from "$lib/stores/territoryTuningStatusStore";
  import {
    PaxSettingsRangeRow,
    PaxSettingsToggleRow,
  } from "$lib/design-system";

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
      typeof cancelAnimationFrame === "function"
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

    if (typeof requestAnimationFrame === "function") {
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

  function numVal(panelKey: string, configKey: string, fallback: number): number {
    const panelValue = panel[panelKey];
    if (typeof panelValue === "number" && Number.isFinite(panelValue)) {
      return panelValue;
    }
    const configValue = (GAME_CONFIG as unknown as Record<string, unknown>)[configKey];
    if (typeof configValue === "number" && Number.isFinite(configValue)) {
      return configValue;
    }
    return fallback;
  }

  function boolVal(panelKey: string, configKey: string, fallback: boolean): boolean {
    const panelValue = panel[panelKey];
    if (typeof panelValue === "boolean") return panelValue;
    const configValue = (GAME_CONFIG as unknown as Record<string, unknown>)[configKey];
    if (typeof configValue === "boolean") return configValue;
    return fallback;
  }
</script>

<div class="territory-section-shell territory-section-shell--topology">
  <div class="territory-section-head">
    <h4 class="sub-heading territory-section-title">Territory Topology</h4>
  </div>
  <div class="territory-module-grid">
    <div class="territory-module-card territory-module-stack">
      <h5 class="territory-inline-heading">Topology Controls</h5>
      <div class="engine-control-group">
        <div class="territory-card__header">
          <h4 class="axis-card-title">Topology Rules</h4>
        </div>
        <div class="axis-note">
          {#if $territoryTuningStatus.pending}
            <strong>Compiling...</strong>
            {$territoryTuningStatus.label}
          {:else if $territoryTuningStatus.lastDurationMs !== null}
            <strong>Last compile:</strong>
            {$territoryTuningStatus.lastDurationMs} ms
            {#if $territoryTuningStatus.lastCompletedLabel}
              | {$territoryTuningStatus.lastCompletedLabel}
            {/if}
          {/if}
        </div>

        <h5 class="territory-inline-heading">Minimum Footprint</h5>
        <PaxSettingsRangeRow
          label="Minimum Star Margin"
          note="Metaball assigns cells inside this radius to a real star cluster; engine paths use it for geometric margins."
          value={numVal("starMargin", "MODIFIED_VORONOI_STAR_MARGIN", 45)}
          min={0}
          max={500}
          step={5}
          suffix="px"
          settingConfigKey="MODIFIED_VORONOI_STAR_MARGIN"
          settingDescription="Minimum owned footprint around each real star."
          onInput={(v) =>
            queueTopologySliderUpdate(
              "MODIFIED_VORONOI_STAR_MARGIN",
              "starMargin",
              v,
              "Minimum Star Margin",
            )}
        />
        <PaxSettingsRangeRow
          label="Frontier Resolution"
          note="Lower values produce denser frontier samples and sharper ownership contours."
          value={numVal("frontierResolution", "FRONTIER_RESOLUTION", 5)}
          min={1}
          max={20}
          step={1}
          suffix="px"
          settingConfigKey="FRONTIER_RESOLUTION"
          settingDescription="Frontier vertex spacing used by live geometry compilers."
          onInput={(v) =>
            queueTopologySliderUpdate(
              "FRONTIER_RESOLUTION",
              "frontierResolution",
              v,
              "Frontier Resolution",
            )}
        />

        <h5 class="territory-inline-heading">Corridors</h5>
        <PaxSettingsToggleRow
          label="Corridor Virtual Sites (CX)"
          checked={boolVal("corridorEnabled", "MODIFIED_VORONOI_CORRIDOR_ENABLED", true)}
          meta={boolVal("corridorEnabled", "MODIFIED_VORONOI_CORRIDOR_ENABLED", true) ? "On" : "Off"}
          settingConfigKey="MODIFIED_VORONOI_CORRIDOR_ENABLED"
          onChange={(v) =>
            queueTopologyToggleUpdate(
              "MODIFIED_VORONOI_CORRIDOR_ENABLED",
              "corridorEnabled",
              v,
              "Corridor Virtual Sites (CX)",
            )}
        />
        <PaxSettingsToggleRow
          class="topology-indent"
          label="Lane Midpoint Pairs"
          checked={boolVal("cxContestMidpointVstars", "TERRITORY_CX_CONTEST_MIDPOINT_VSTARS", true)}
          meta={boolVal("cxContestMidpointVstars", "TERRITORY_CX_CONTEST_MIDPOINT_VSTARS", true) ? "On" : "Off"}
          settingConfigKey="TERRITORY_CX_CONTEST_MIDPOINT_VSTARS"
          onChange={(v) =>
            queueTopologyToggleUpdate(
              "TERRITORY_CX_CONTEST_MIDPOINT_VSTARS",
              "cxContestMidpointVstars",
              v,
              "Lane Midpoint Pairs",
            )}
        />
        <PaxSettingsRangeRow
          class="topology-indent"
          label="Lane Midpoint Pair Count"
          value={numVal("cxContestPairCount", "TERRITORY_CX_CONTEST_PAIR_COUNT", 1)}
          min={1}
          max={10}
          step={1}
          disabled={!cxOn}
          settingConfigKey="TERRITORY_CX_CONTEST_PAIR_COUNT"
          settingDescription="Turn Corridor Virtual Sites on to edit this value."
          onInput={(v) =>
            queueTopologySliderUpdate(
              "TERRITORY_CX_CONTEST_PAIR_COUNT",
              "cxContestPairCount",
              v,
              "Lane Midpoint Pair Count",
            )}
        />
        <PaxSettingsRangeRow
          class="topology-indent"
          label="Lane Midpoint Pair Weight"
          value={numVal("cxContestPairWeight", "TERRITORY_CX_CONTEST_PAIR_WEIGHT", 0.5)}
          min={0}
          max={1}
          step={0.05}
          format="fixed2"
          disabled={!cxOn}
          settingConfigKey="TERRITORY_CX_CONTEST_PAIR_WEIGHT"
          settingDescription="Turn Corridor Virtual Sites on to edit this value."
          onInput={(v) =>
            queueTopologySliderUpdate(
              "TERRITORY_CX_CONTEST_PAIR_WEIGHT",
              "cxContestPairWeight",
              v,
              "Lane Midpoint Pair Weight",
            )}
        />
        <PaxSettingsRangeRow
          class="topology-indent"
          label="Corridor Sample Count"
          value={numVal("cxCount", "TERRITORY_CX_COUNT", 0)}
          min={0}
          max={20}
          step={1}
          output={numVal("cxCount", "TERRITORY_CX_COUNT", 0) === 0
            ? "Auto"
            : `${numVal("cxCount", "TERRITORY_CX_COUNT", 0)}`}
          disabled={!cxOn}
          settingConfigKey="TERRITORY_CX_COUNT"
          settingDescription="Turn Corridor Virtual Sites on to edit this value."
          onInput={(v) =>
            queueTopologySliderUpdate(
              "TERRITORY_CX_COUNT",
              "cxCount",
              v,
              "Corridor Sample Count",
            )}
        />
        <PaxSettingsRangeRow
          class="topology-indent"
          label="Corridor Weight"
          value={numVal("cxWeight", "TERRITORY_CX_WEIGHT", 0.5)}
          min={0}
          max={2}
          step={0.05}
          format="fixed2"
          disabled={!cxOn}
          settingConfigKey="TERRITORY_CX_WEIGHT"
          settingDescription="Turn Corridor Virtual Sites on to edit this value."
          onInput={(v) =>
            queueTopologySliderUpdate(
              "TERRITORY_CX_WEIGHT",
              "cxWeight",
              v,
              "Corridor Weight",
            )}
        />
        <PaxSettingsRangeRow
          class="topology-indent"
          label="Corridor Spacing"
          value={numVal("corridorSpacing", "MODIFIED_VORONOI_CORRIDOR_SPACING", 60)}
          min={10}
          max={200}
          step={5}
          suffix="px"
          disabled={!cxOn}
          settingConfigKey="MODIFIED_VORONOI_CORRIDOR_SPACING"
          settingDescription="Turn Corridor Virtual Sites on to edit this value."
          onInput={(v) =>
            queueTopologySliderUpdate(
              "MODIFIED_VORONOI_CORRIDOR_SPACING",
              "corridorSpacing",
              v,
              "Corridor Spacing",
            )}
        />

        <h5 class="territory-inline-heading">Disconnects</h5>
        <PaxSettingsToggleRow
          label="Disconnect Gaps (DX)"
          checked={boolVal("disconnectEnabled", "MODIFIED_VORONOI_DISCONNECT_ENABLED", false)}
          meta={boolVal("disconnectEnabled", "MODIFIED_VORONOI_DISCONNECT_ENABLED", false) ? "On" : "Off"}
          settingConfigKey="MODIFIED_VORONOI_DISCONNECT_ENABLED"
          onChange={(v) =>
            queueTopologyToggleUpdate(
              "MODIFIED_VORONOI_DISCONNECT_ENABLED",
              "disconnectEnabled",
              v,
              "Disconnect Gaps (DX)",
            )}
        />
        <PaxSettingsRangeRow
          class="topology-indent"
          label="Disconnect Weight"
          value={numVal("dxWeight", "TERRITORY_DX_WEIGHT", 0.3)}
          min={0}
          max={2}
          step={0.05}
          format="fixed2"
          disabled={!dxOn}
          settingConfigKey="TERRITORY_DX_WEIGHT"
          settingDescription="Turn Disconnect Gaps on to edit this value."
          onInput={(v) =>
            queueTopologySliderUpdate(
              "TERRITORY_DX_WEIGHT",
              "dxWeight",
              v,
              "Disconnect Weight",
            )}
        />
        <PaxSettingsRangeRow
          class="topology-indent"
          label="Disconnect Distance"
          value={numVal("disconnectDistance", "MODIFIED_VORONOI_DISCONNECT_DISTANCE", 400)}
          min={50}
          max={1000}
          step={25}
          suffix="px"
          disabled={!dxOn}
          settingConfigKey="MODIFIED_VORONOI_DISCONNECT_DISTANCE"
          settingDescription="Turn Disconnect Gaps on to edit this value."
          onInput={(v) =>
            queueTopologySliderUpdate(
              "MODIFIED_VORONOI_DISCONNECT_DISTANCE",
              "disconnectDistance",
              v,
              "Disconnect Distance",
            )}
        />
      </div>
    </div>
  </div>
</div>

<style>

  .territory-section-shell {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 0 0 16px;
  }

  .territory-section-head {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .territory-section-title {
    flex: 1;
    margin: 0;
  }

  .territory-module-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .territory-module-card {
    height: auto;
  }

  .territory-module-stack {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .territory-card__header {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .territory-inline-heading {
    margin: 2px 0 0;
    font-size: var(--pax-type-3xs);
    font-weight: var(--pax-weight-bold);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(168, 208, 239, 0.78);
  }

  .engine-control-group {
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

  :global(.topology-indent) {
    margin-left: 12px;
  }
</style>
