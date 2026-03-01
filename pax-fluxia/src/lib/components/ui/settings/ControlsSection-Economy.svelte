<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";

    // ControlsSection-Global — In-Game Settings Controls: Core / Global
    // Extracted from GameSettingsPanel.svelte

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
    import CategoryThemeBar from "./CategoryThemeBar.svelte";
</script>

<CategoryThemeBar category="economy" onApply={() => syncFromConfig?.()} />

<div class="var-row">
    <div class="row-top">
        <span class="var-name">⚙️ Production</span><span class="val"
            >{((panel.production ?? 0) as number).toFixed(2)}</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="5"
        step="0.1"
        value={panel.production}
        oninput={(e) => {
            const v = parseFloat((e.target as HTMLInputElement).value);
            GAME_CONFIG.BASE_PRODUCTION = v;
            updatePanel("production", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">🚀 Transfer Rate</span><span class="val"
            >{transferRate}%</span
        >
    </div>
    <input
        type="range"
        min="1"
        max="100"
        step="1"
        value={transferRate}
        oninput={(e) =>
            updateTransferRate(parseInt((e.target as HTMLInputElement).value))}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">🔧 Repair</span><span class="val"
            >{panel.repair as number}%</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="100"
        step="1"
        value={panel.repair}
        oninput={(e) => {
            const v = parseFloat((e.target as HTMLInputElement).value);
            GAME_CONFIG.REPAIR_RATE = v;
            updatePanel("repair", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">🗡️ Repair Suppress (Attacking)</span><span
            class="val"
            >{((GAME_CONFIG.REPAIR_SUPPRESS_ATTACKER ?? 0.5) as number).toFixed(
                2,
            )}</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={GAME_CONFIG.REPAIR_SUPPRESS_ATTACKER ?? 0.5}
        oninput={(e) => {
            const v = parseFloat((e.target as HTMLInputElement).value);
            GAME_CONFIG.REPAIR_SUPPRESS_ATTACKER = v;
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">🛡️ Repair Suppress (Defending)</span><span
            class="val"
            >{((GAME_CONFIG.REPAIR_SUPPRESS_DEFENDER ?? 0.1) as number).toFixed(
                2,
            )}</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={GAME_CONFIG.REPAIR_SUPPRESS_DEFENDER ?? 0.1}
        oninput={(e) => {
            const v = parseFloat((e.target as HTMLInputElement).value);
            GAME_CONFIG.REPAIR_SUPPRESS_DEFENDER = v;
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">🛡️ Defense</span><span class="val"
            >{((panel.defense ?? 0) as number).toFixed(2)}×</span
        >
    </div>
    <input
        type="range"
        min="0.2"
        max="5"
        step="0.1"
        value={panel.defense}
        oninput={(e) => {
            const v = parseFloat((e.target as HTMLInputElement).value);
            GAME_CONFIG.AGGRESSOR_ADVANTAGE = 1 / v;
            updatePanel("defense", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">⚔️ Attack</span><span class="val"
            >{((panel.attack ?? 0) as number).toFixed(3)}</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="0.5"
        step="0.005"
        value={panel.attack}
        oninput={(e) => {
            const v = parseFloat((e.target as HTMLInputElement).value);
            GAME_CONFIG.DAMAGE_PER_SHIP = v;
            updatePanel("attack", v);
        }}
    />
</div>

<style>
    @import "./panel-shared.css";
</style>
