<script lang="ts">
  import "./panel-shared.css";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import {
        IN_APP_CONQUEST_BENCHMARK_MODES,
        resolveConquestTransitionTargets,
        runInAppConquestAnimationScenario,
        runInAppConquestDiagnosticScenario,
        type InAppConquestBenchmarkMode,
        type InAppConquestBenchmarkSummary,
    } from "$lib/perf/inAppConquestBench";
    import { PaxHudButton, PaxHudSelect } from "$lib/design-system";

    let selectedMode = $state<InAppConquestBenchmarkMode>("cell_grid");
    let runningScenario = $state<"conquest_animation" | "conquest_diagnostic" | null>(
        null,
    );
    let lastResult = $state<InAppConquestBenchmarkSummary | null>(null);
    let lastError = $state<string>("");
    let refreshToken = $state(0);

    const transitionTargets = $derived.by(() => {
        refreshToken;
        return resolveConquestTransitionTargets();
    });
    const benchReady = $derived(
        typeof window !== "undefined" && Boolean(window.__PAX_BENCH__),
    );
    const modeOptions = $derived(
        IN_APP_CONQUEST_BENCHMARK_MODES.map((option) => ({
            value: option.id,
            label: option.label,
        })),
    );

    function refreshTargets(): void {
        refreshToken += 1;
    }

    function formatMs(value: unknown): string {
        const numeric = Number(value ?? 0);
        return Number.isFinite(numeric) ? `${numeric.toFixed(1)}ms` : "n/a";
    }

    function summarizeBundle(bundle: Record<string, unknown> | null | undefined): string {
        if (!bundle) return "No bundle captured";
        const steps = Array.isArray(bundle.steps) ? bundle.steps.length : 0;
        const failing = Array.isArray(bundle.steps)
            ? bundle.steps.flatMap((step) =>
                  Array.isArray((step as Record<string, unknown>).failIf)
                      ? ((step as Record<string, unknown>).failIf as Array<Record<string, unknown>>)
                            .filter((entry) => entry.triggered === true)
                      : [],
              ).length
            : 0;
        return `${String(bundle.version ?? "unknown")} - steps=${steps} - failing=${failing}`;
    }

    async function runScenario(
        scenarioId: "conquest_animation" | "conquest_diagnostic",
    ): Promise<void> {
        runningScenario = scenarioId;
        lastError = "";
        lastResult = null;
        refreshTargets();
        try {
            lastResult =
                scenarioId === "conquest_animation"
                    ? await runInAppConquestAnimationScenario(selectedMode)
                    : await runInAppConquestDiagnosticScenario(selectedMode);
        } catch (error) {
            lastError = error instanceof Error ? error.message : String(error);
        } finally {
            runningScenario = null;
            refreshTargets();
        }
    }
</script>

<h4 class="sub-heading">Perf Scenarios</h4>

<div class="readout">
    Runs the real conquest fixture through the in-app perf bridge. Animation uses the shipping path.
    Diagnostic keeps the recorder on for bundle validation.
</div>

<div class="row-hint">
    Current conquest timing: {transitionTargets.effectiveTransitionMs}ms - target {transitionTargets.targetFrames60fps}
    frames at 60fps - minimum {transitionTargets.minimumFrames30fps} frames at 30fps
</div>

<div class="row-hint">
    Tick bind: {GAME_CONFIG.TERRITORY_TRANSITION_BIND_TO_TICK ? "on" : "off"} - configured transition:
    {GAME_CONFIG.TERRITORY_TRANSITION_MS}ms
</div>

<PaxHudSelect
    label="Scenario Mode"
    value={selectedMode}
    options={modeOptions}
    disabled={runningScenario !== null}
    onValueChange={(value) => {
        selectedMode = value as InAppConquestBenchmarkMode;
    }}
/>

<div class="snapshot-actions">
    <PaxHudButton
        label={runningScenario === "conquest_animation"
            ? "Running Animation..."
            : "Run Conquest Animation"}
        disabled={!benchReady || runningScenario !== null}
        onclick={() => void runScenario("conquest_animation")}
    />
    <PaxHudButton
        label={runningScenario === "conquest_diagnostic"
            ? "Running Diagnostic..."
            : "Run Conquest Diagnostic"}
        disabled={!benchReady || runningScenario !== null}
        onclick={() => void runScenario("conquest_diagnostic")}
    />
</div>

{#if !benchReady}
    <div class="row-hint warning">
        Perf bridge unavailable. In dev, it now installs automatically on the home route before you open the game shell.
    </div>
{/if}

{#if lastError}
    <div class="readout error">{lastError}</div>
{/if}

{#if lastResult}
    <div class="readout">
        {lastResult.scenarioId === "conquest_animation"
            ? "Animation"
            : "Diagnostic"} result - avg {formatMs(lastResult.frameStats.avgFrameMs)} - p95 {formatMs(lastResult.frameStats.p95FrameMs)}
        - max {formatMs(lastResult.frameStats.maxFrameMs)} - frames {String(lastResult.frameStats.frameCount ?? "n/a")}
    </div>
    <div class="row-hint">
        Capture window: {lastResult.captureDurationMs}ms - target {lastResult.targetFrames60fps} @ 60fps - minimum
        {lastResult.minimumFrames30fps} @ 30fps
    </div>
    {#if lastResult.bundleSummary}
        <div class="row-hint">
            Bundle: {summarizeBundle(lastResult.bundleSummary)}
        </div>
    {/if}
{/if}

<style>

    .snapshot-actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--pax-space-2);
    }

    .warning {
        color: var(--pax-ui-accent-warm-strong);
    }

    .error {
        color: var(--pax-ui-danger);
    }
</style>
