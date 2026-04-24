import { mount } from "svelte";
import "../../app.css";
import { installBenchmarkBridge } from "$lib/perf/benchmarkBridge";

const target = document.getElementById("app");
if (!target) {
    throw new Error("Missing #app container for browser benchmark entry.");
}

let mountedGameShell = false;
let mountPromise: Promise<void> | null = null;

async function ensureGameShellLoaded(): Promise<void> {
    if (mountedGameShell) return;
    if (!mountPromise) {
        mountPromise = import("$lib/components/game/GameContainer.svelte").then(
            ({ default: GameContainer }) => {
                target.innerHTML = "";
                mount(GameContainer, { target });
                mountedGameShell = true;
            },
        );
    }
    await mountPromise;
}

target.innerHTML =
    '<div style="display:grid;place-items:center;min-height:100vh;background:#030712;color:#d1d5db;font:14px Inter,sans-serif">Benchmark shell ready</div>';

installBenchmarkBridge({
    openGameShell: ensureGameShellLoaded,
    ensureGameShellLoaded,
});
