<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { PaxSettingsRangeRow } from "$lib/design-system";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        transferRate: number;
        updateTransferRate: (v: number) => void;
        syncFromConfig?: () => void;
    }

    let {
        panel,
        updatePanel,
        transferRate,
        updateTransferRate,
        syncFromConfig,
    }: Props = $props();
</script>

<CategoryThemeBar category="economy" onApply={() => syncFromConfig?.()} />

<h4 class="sub-heading">Production & Flow</h4>
<PaxSettingsRangeRow
    label="Production"
    value={panel.production}
    min={0}
    max={5}
    step={0.1}
    format="fixed2"
    settingConfigKey="BASE_PRODUCTION"
    onInput={(value) => {
        GAME_CONFIG.BASE_PRODUCTION = value;
        updatePanel("production", value);
    }}
/>

<PaxSettingsRangeRow
    label="Transfer Rate"
    value={transferRate}
    min={1}
    max={100}
    step={1}
    format="percent"
    onInput={updateTransferRate}
/>

<div class="orb-pair">
    <PaxSettingsRangeRow
        label="Min Transfer"
        value={panel.minShipsPerTransfer ?? GAME_CONFIG.MIN_SHIPS_PER_TRANSFER}
        min={0}
        max={100}
        step={1}
        settingConfigKey="MIN_SHIPS_PER_TRANSFER"
        onInput={(value) => {
            GAME_CONFIG.MIN_SHIPS_PER_TRANSFER = value;
            updatePanel("minShipsPerTransfer", value);
        }}
    />
    <PaxSettingsRangeRow
        label="Max Transfer"
        value={panel.maxShipsPerTransfer ?? GAME_CONFIG.MAX_SHIPS_PER_TRANSFER}
        min={0}
        max={200}
        step={1}
        output={(panel.maxShipsPerTransfer ?? GAME_CONFIG.MAX_SHIPS_PER_TRANSFER)
            ? `${panel.maxShipsPerTransfer ?? GAME_CONFIG.MAX_SHIPS_PER_TRANSFER}`
            : "unlimited"}
        settingConfigKey="MAX_SHIPS_PER_TRANSFER"
        onInput={(value) => {
            GAME_CONFIG.MAX_SHIPS_PER_TRANSFER = value;
            updatePanel("maxShipsPerTransfer", value);
        }}
    />
</div>

<h4 class="sub-heading">Repair Discipline</h4>
<PaxSettingsRangeRow
    label="Repair Rate"
    value={panel.repair}
    min={0}
    max={100}
    step={1}
    format="percent"
    settingConfigKey="REPAIR_RATE"
    onInput={(value) => {
        GAME_CONFIG.REPAIR_RATE = value;
        updatePanel("repair", value);
    }}
/>

<PaxSettingsRangeRow
    label="Repair Suppress (Attacking)"
    value={Math.round(((panel.repairSuppressAttacker ?? 0.5) as number) * 100)}
    min={0}
    max={100}
    step={5}
    format="percent"
    settingConfigKey="REPAIR_SUPPRESS_ATTACKER"
    onInput={(value) => {
        const next = value / 100;
        GAME_CONFIG.REPAIR_SUPPRESS_ATTACKER = next;
        updatePanel("repairSuppressAttacker", next);
    }}
/>

<PaxSettingsRangeRow
    label="Repair Suppress (Defending)"
    value={Math.round(((panel.repairSuppressDefender ?? 0.1) as number) * 100)}
    min={0}
    max={100}
    step={5}
    format="percent"
    settingConfigKey="REPAIR_SUPPRESS_DEFENDER"
    onInput={(value) => {
        const next = value / 100;
        GAME_CONFIG.REPAIR_SUPPRESS_DEFENDER = next;
        updatePanel("repairSuppressDefender", next);
    }}
/>

<h4 class="sub-heading">Starting Pressure</h4>
<PaxSettingsRangeRow
    label="Starting Ships"
    value={panel.startingShips ?? GAME_CONFIG.STARTING_SHIPS}
    min={0}
    max={200}
    step={5}
    settingConfigKey="STARTING_SHIPS"
    onInput={(value) => {
        GAME_CONFIG.STARTING_SHIPS = value;
        updatePanel("startingShips", value);
    }}
/>

<PaxSettingsRangeRow
    label="Defense Multiplier"
    value={panel.defense}
    min={0.2}
    max={5}
    step={0.1}
    format="multiplier"
    settingConfigKey="AGGRESSOR_ADVANTAGE"
    onInput={(value) => {
        GAME_CONFIG.AGGRESSOR_ADVANTAGE = 1 / value;
        updatePanel("defense", value);
    }}
/>

<style>
    @import "./panel-shared.css";
</style>
