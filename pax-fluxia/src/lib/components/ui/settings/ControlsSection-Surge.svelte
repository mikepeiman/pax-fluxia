<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";

    // ControlsSection-SURGE â€” In-Game Settings Controls: Surge & Orbs
    // Extracted from GameSettingsPanel.svelte

    let {
    panel: Record<string, any>,
    updatePanel: (key: string, value: any) => void,

    } = $props();
</script>

<h4 class="sub-heading">Attack Surge</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Attack Surge ×</span><span
            class="val"
            >{(panel.attackSurgeMult as number).toFixed(
                2,
            )}×</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="1.5"
        step="0.05"
        value={panel.attackSurgeMult}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.ATTACK_SURGE_MULT = v;
            updatePanel("attackSurgeMult", v);
        }}
    />
</div>
<label class="toggle-row" style="margin-top:2px;">
    <input
        type="checkbox"
        checked={panel.attackSurgeProportional}
        onchange={(e) => {
            const v = (e.target as HTMLInputElement)
                .checked;
            GAME_CONFIG.ATTACK_SURGE_PROPORTIONAL = v;
            updatePanel("attackSurgeProportional", v);
        }}
    />
    <span class="log-label" style="font-size:9px;"
        >Proportional to force</span
    >
</label>
{#if panel.attackSurgeProportional}
    <div class="var-row compact" style="margin-top:2px;">
        <div class="row-top">
            <span class="var-name">Force Cofactor</span
            ><span class="val"
                >{(
                    panel.attackSurgeForceCofactor as number
                ).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={panel.attackSurgeForceCofactor}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement)
                    .value;
                GAME_CONFIG.ATTACK_SURGE_FORCE_COFACTOR = v;
                updatePanel("attackSurgeForceCofactor", v);
            }}
        />
    </div>
{/if}
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Surge Ramp</span><span
            class="val">{panel.attackSurgeRampMs}ms</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="1000"
        step="50"
        value={panel.attackSurgeRampMs}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.ATTACK_SURGE_RAMP_MS = v;
            updatePanel("attackSurgeRampMs", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Surge Shape</span><span
            class="val"
            >{(panel.attackSurgeShape as number).toFixed(
                1,
            )}</span
        >
    </div>
    <input
        type="range"
        min="0.1"
        max="4"
        step="0.1"
        value={panel.attackSurgeShape}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.ATTACK_SURGE_SHAPE = v;
            updatePanel("attackSurgeShape", v);
        }}
    />
</div>

<h4 class="sub-heading">Orb Travel</h4>
<div class="var-row">
    <div class="row-top">
        <label class="toggle-label"
            ><input
                type="checkbox"
                checked={panel.orbTravel}
                onchange={() => {
                    GAME_CONFIG.ORB_TRAVEL =
                        !GAME_CONFIG.ORB_TRAVEL;
                    updatePanel(
                        "orbTravel",
                        GAME_CONFIG.ORB_TRAVEL,
                    );
                }}
            />
            <span class="var-name">Orb Travel</span></label
        >
        <span class="val" style="font-size:9px;opacity:0.6"
            >merge into orb</span
        >
    </div>
</div>
{#if panel.orbTravel}
    <div class="var-row indent compact">
        <div class="row-top">
            <span class="var-name">Base R</span><span
                class="val"
                >{(panel.orbBaseRadius as number).toFixed(
                    0,
                )}px</span
            >
        </div>
        <input
            type="range"
            min="2"
            max="30"
            step="1"
            value={panel.orbBaseRadius}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement)
                    .value;
                GAME_CONFIG.ORB_BASE_RADIUS = v;
                updatePanel("orbBaseRadius", v);
            }}
        />
    </div>
    <div class="var-row compact">
        <div class="row-top">
            <span class="var-name">R Scale</span><span
                class="val"
                >{(panel.orbRadiusScale as number).toFixed(
                    2,
                )}</span
            >
        </div>
        <input
            type="range"
            min="0.2"
            max="5"
            step="0.1"
            value={panel.orbRadiusScale}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement)
                    .value;
                GAME_CONFIG.ORB_RADIUS_SCALE = v;
                updatePanel("orbRadiusScale", v);
            }}
        />
    </div>
    <!-- Glow -->
    <div class="var-row indent compact">
        <div class="row-top">
            <span class="var-name">Glow Mult</span><span
                class="val"
                >{(panel.orbGlowMult as number).toFixed(
                    2,
                )}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="4"
            step="0.1"
            value={panel.orbGlowMult}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement)
                    .value;
                GAME_CONFIG.ORB_GLOW_MULT = v;
                updatePanel("orbGlowMult", v);
            }}
        />
    </div>
    <div class="orb-pair indent">
        <div class="var-row compact">
            <div class="row-top">
                <span class="var-name">Outer α</span><span
                    class="val"
                    >{(
                        panel.orbOuterAlpha as number
                    ).toFixed(2)}</span
                >
            </div>
            <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={panel.orbOuterAlpha}
                oninput={(e) => {
                    const v = +(
                        e.target as HTMLInputElement
                    ).value;
                    GAME_CONFIG.ORB_OUTER_ALPHA = v;
                    updatePanel("orbOuterAlpha", v);
                }}
            />
        </div>
        <div class="var-row compact">
            <div class="row-top">
                <span class="var-name">Outer ×</span><span
                    class="val"
                    >{(
                        panel.orbOuterScale as number
                    ).toFixed(1)}</span
                >
            </div>
            <input
                type="range"
                min="1"
                max="5"
                step="0.1"
                value={panel.orbOuterScale}
                oninput={(e) => {
                    const v = +(
                        e.target as HTMLInputElement
                    ).value;
                    GAME_CONFIG.ORB_OUTER_SCALE = v;
                    updatePanel("orbOuterScale", v);
                }}
            />
        </div>
    </div>
    <div class="orb-pair indent">
        <div class="var-row compact">
            <div class="row-top">
                <span class="var-name">Mid α</span><span
                    class="val"
                    >{(panel.orbMidAlpha as number).toFixed(
                        2,
                    )}</span
                >
            </div>
            <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={panel.orbMidAlpha}
                oninput={(e) => {
                    const v = +(
                        e.target as HTMLInputElement
                    ).value;
                    GAME_CONFIG.ORB_MID_ALPHA = v;
                    updatePanel("orbMidAlpha", v);
                }}
            />
        </div>
        <div class="var-row compact">
            <div class="row-top">
                <span class="var-name">Mid ×</span><span
                    class="val"
                    >{(panel.orbMidScale as number).toFixed(
                        1,
                    )}</span
                >
            </div>
            <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={panel.orbMidScale}
                oninput={(e) => {
                    const v = +(
                        e.target as HTMLInputElement
                    ).value;
                    GAME_CONFIG.ORB_MID_SCALE = v;
                    updatePanel("orbMidScale", v);
                }}
            />
        </div>
    </div>
    <div class="orb-pair indent">
        <div class="var-row compact">
            <div class="row-top">
                <span class="var-name">Core α</span><span
                    class="val"
                    >{(
                        panel.orbCoreAlpha as number
                    ).toFixed(2)}</span
                >
            </div>
            <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={panel.orbCoreAlpha}
                oninput={(e) => {
                    const v = +(
                        e.target as HTMLInputElement
                    ).value;
                    GAME_CONFIG.ORB_CORE_ALPHA = v;
                    updatePanel("orbCoreAlpha", v);
                }}
            />
        </div>
        <div class="var-row compact">
            <div class="row-top">
                <span class="var-name">Core ×</span><span
                    class="val"
                    >{(
                        panel.orbCoreScale as number
                    ).toFixed(1)}</span
                >
            </div>
            <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={panel.orbCoreScale}
                oninput={(e) => {
                    const v = +(
                        e.target as HTMLInputElement
                    ).value;
                    GAME_CONFIG.ORB_CORE_SCALE = v;
                    updatePanel("orbCoreScale", v);
                }}
            />
        </div>
    </div>
    <!-- Center dot -->
    <div class="var-row indent compact">
        <div class="row-top">
            <span class="var-name">Center α</span><span
                class="val"
                >{(panel.orbCenterAlpha as number).toFixed(
                    2,
                )}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={panel.orbCenterAlpha}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement)
                    .value;
                GAME_CONFIG.ORB_CENTER_ALPHA = v;
                updatePanel("orbCenterAlpha", v);
            }}
        />
    </div>
{/if}

<!-- 🏰 CONQUEST -->
