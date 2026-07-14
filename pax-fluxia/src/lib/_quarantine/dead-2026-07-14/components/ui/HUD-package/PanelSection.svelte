<script lang="ts">
  export let title = 'Section';
  export let subtitle = '';
  export let badge: string | number | undefined = undefined;
  export let defaultOpen = true;
  export let collapsible = true;
  export let flush = false;

  let open = defaultOpen;
</script>

<section class="overflow-hidden rounded-xl border border-amber-300/20 bg-slate-950/42 shadow-lg shadow-black/20">
  <button
    type="button"
    class="flex w-full items-center justify-between gap-3 border-b border-amber-300/12 px-3 py-2 text-left transition hover:bg-amber-300/6"
    aria-expanded={open}
    on:click={() => (open = collapsible ? !open : open)}
  >
    <span class="min-w-0">
      <span class="block truncate text-[11px] font-bold uppercase tracking-[0.18em] text-amber-200">{title}</span>
      {#if subtitle}
        <span class="block truncate text-[10px] text-slate-300/70">{subtitle}</span>
      {/if}
    </span>

    <span class="flex shrink-0 items-center gap-2 text-[11px] text-cyan-100/75">
      {#if badge !== undefined}
        <span class="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-2 py-0.5">{badge}</span>
      {/if}
      {#if collapsible}
        <span aria-hidden="true" class="text-amber-200/75">{open ? '⌃' : '⌄'}</span>
      {/if}
    </span>
  </button>

  {#if open}
    <div class={flush ? '' : 'p-3'}>
      <slot />
    </div>
  {/if}
</section>
