<script lang="ts">
  import { hud } from './state/hud-state.svelte';
  import Icon from './primitives/Icon.svelte';
  import FactionSigil from './primitives/FactionSigil.svelte';
  import IconButton from './primitives/IconButton.svelte';

  const vaelari = $derived(hud.rivals[0]);

  const tray = [
    { icon: 'alert', label: 'Alerts', action: 'alerts', badge: () => hud.alerts },
    { icon: 'message', label: 'Messages', action: 'messages', badge: () => hud.unreadMessages },
    { icon: 'treaty', label: 'Diplomacy', action: 'diplomacy', badge: () => 0 },
    { icon: 'trophy', label: 'Victory conditions', action: 'victory', badge: () => 0 },
    { icon: 'help', label: 'Help', action: 'help', badge: () => 0 },
    { icon: 'menu', label: 'Menu', action: 'menu', badge: () => 0 },
  ];
</script>

<header class="pointer-events-auto relative flex h-14 items-stretch gap-4 px-3">
  <!-- backplate -->
  <div
    class="absolute inset-x-0 top-0 -z-10 h-full border-b border-gold-0/70 bg-gradient-to-b from-void/95 to-hull/80 backdrop-blur-md"
    aria-hidden="true"
  ></div>
  <div
    class="absolute inset-x-3 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-1/50 to-transparent"
    aria-hidden="true"
  ></div>

  <!-- identity -->
  <div class="flex min-w-0 items-center gap-3">
    <span class="text-gold-2"><FactionSigil variant="luminara" size={26} /></span>
    <h1 class="font-display text-[17px] font-semibold tracking-[0.3em] whitespace-nowrap text-gold-3">
      PAX&nbsp;FLUXIA
    </h1>
    <span class="hidden h-5 w-px bg-gold-0 lg:block" aria-hidden="true"></span>
    <span class="hud-label hidden items-center gap-1.5 text-[10px] text-text-dim lg:flex">
      <Icon name="star" size={11} class="text-gold-1" />
      Aurelia Drift
    </span>
  </div>

  <!-- center: faction plates + tick clock -->
  <div class="absolute left-1/2 flex h-full -translate-x-1/2 items-center">
    <!-- Luminara wing -->
    <div class="wing-l h-10 bg-gradient-to-r from-teal-1/80 to-teal-0/60 pt-px pl-px">
      <div class="wing-l flex h-full items-center gap-2.5 bg-gradient-to-r from-teal-0/70 to-hull/90 pr-4 pl-5">
        <span class="text-teal-2"><FactionSigil variant="luminara" size={18} /></span>
        <span class="hud-label hidden text-teal-3 xl:block">{hud.player.name}</span>
        <span class="hud-num text-xl font-bold text-teal-2">{hud.player.score}</span>
        <Icon name="star" size={11} class="text-teal-1" />
      </div>
    </div>

    <!-- clock plate -->
    <div class="hud-frame hud-frame-lit bevel-sym relative z-10 -mx-1.5 h-12" style="--bv: 9px">
      <div class="bevel-sym flex h-full flex-col items-center justify-center bg-hull px-6" style="--bv: 8px">
        <span class="hud-num text-[17px] leading-none font-bold text-text">{hud.matchTime}</span>
        <span class="hud-label mt-0.5 flex items-center gap-1 text-[9px] text-gold-2">
          Tick {hud.tick}
          {#if hud.speed === 0}
            <Icon name="pause" size={8} class="animate-hud-pulse text-danger" />
          {/if}
        </span>
      </div>
    </div>

    <!-- Vaelari wing -->
    {#if vaelari}
      <div class="wing-r h-10 bg-gradient-to-l from-amber-1/80 to-amber-0/60 pt-px pr-px">
        <div class="wing-r flex h-full items-center gap-2.5 bg-gradient-to-l from-amber-0/70 to-hull/90 pr-5 pl-4">
          <Icon name="star" size={11} class="text-amber-1" />
          <span class="hud-num text-xl font-bold text-amber-2">{vaelari.score}</span>
          <span class="hud-label hidden text-amber-3 xl:block">{vaelari.name}</span>
          <span class="text-amber-2"><FactionSigil variant="vaelari" size={18} /></span>
        </div>
      </div>
    {/if}
  </div>

  <!-- system tray -->
  <div class="ml-auto flex items-center gap-1.5">
    {#each tray as item (item.action)}
      <IconButton
        icon={item.icon}
        label={item.label}
        badge={item.badge()}
        onclick={() => hud.topbarAction(item.action)}
      />
    {/each}
  </div>
</header>
