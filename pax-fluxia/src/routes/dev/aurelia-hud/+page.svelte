<script lang="ts">
  import "../../../app.css";
  import { PaxHud, hud } from "$lib/aurelia-hud";
  import { log } from "$lib/utils/logger";

  hud.bridge = {
    onSetSpeed: (speed) => log.state("AureliaHudLab", "speed intent", { speed }),
    onSetMode: (mode) => log.state("AureliaHudLab", "mode intent", { mode }),
    onSelectStar: (starId) => log.state("AureliaHudLab", "select star intent", { starId }),
    onIssueOrder: (kind, starId) => log.state("AureliaHudLab", "issue order intent", { kind, starId }),
    onCancelOrder: (orderId) => log.state("AureliaHudLab", "cancel order intent", { orderId }),
    onOverlayChange: (key, on) => log.state("AureliaHudLab", "overlay intent", { key, on }),
    onZoom: (zoom) => log.state("AureliaHudLab", "zoom intent", { zoom }),
    onRecenter: () => log.state("AureliaHudLab", "recenter intent"),
    onSearch: () => log.state("AureliaHudLab", "search intent"),
    onRailAction: (action) => log.state("AureliaHudLab", "rail action intent", { action }),
    onTopbarAction: (action) => log.state("AureliaHudLab", "topbar action intent", { action }),
  };
</script>

<svelte:head>
  <title>Pax Fluxia Aurelia HUD</title>
</svelte:head>

<div class="fixed inset-0 bg-void" aria-hidden="true">
  <div class="aurelia-starfield absolute inset-0"></div>
  <div
    class="absolute top-1/4 left-1/4 h-[60vh] w-[55vw] -translate-x-1/3 rounded-full
      bg-[radial-gradient(closest-side,rgb(24_150_141/0.16),transparent)] blur-2xl"
  ></div>
  <div
    class="absolute top-1/3 right-0 h-[70vh] w-[50vw] translate-x-1/4 rounded-full
      bg-[radial-gradient(closest-side,rgb(156_124_52/0.15),transparent)] blur-2xl"
  ></div>
  <p
    class="hud-label absolute inset-0 grid place-items-center text-[10px] tracking-[0.4em] text-text-faint/40"
  >
    PixiJS map renders here
  </p>
</div>

<PaxHud demoTicker />

<style>
  .aurelia-starfield {
    background-image:
      radial-gradient(1px 1px at 12% 22%, rgb(216 228 228 / 0.7) 50%, transparent 50%),
      radial-gradient(1px 1px at 31% 67%, rgb(216 228 228 / 0.45) 50%, transparent 50%),
      radial-gradient(1.5px 1.5px at 48% 14%, rgb(154 242 234 / 0.6) 50%, transparent 50%),
      radial-gradient(1px 1px at 63% 49%, rgb(216 228 228 / 0.5) 50%, transparent 50%),
      radial-gradient(1.5px 1.5px at 76% 81%, rgb(245 217 143 / 0.5) 50%, transparent 50%),
      radial-gradient(1px 1px at 88% 31%, rgb(216 228 228 / 0.6) 50%, transparent 50%),
      radial-gradient(1px 1px at 22% 88%, rgb(216 228 228 / 0.4) 50%, transparent 50%),
      radial-gradient(1.5px 1.5px at 55% 92%, rgb(154 242 234 / 0.4) 50%, transparent 50%),
      radial-gradient(1px 1px at 92% 64%, rgb(216 228 228 / 0.5) 50%, transparent 50%),
      radial-gradient(1px 1px at 5% 45%, rgb(245 217 143 / 0.45) 50%, transparent 50%);
    background-size: 100% 100%;
  }
</style>
