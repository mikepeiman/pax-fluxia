<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let title = 'Confirm Action';
  export let body = 'Are you sure?';
  export let confirmLabel = 'Confirm';
  export let cancelLabel = 'Cancel';

  const dispatch = createEventDispatcher();
</script>

<div class="rounded-2xl border border-amber-300/35 bg-slate-950/86 p-5 shadow-2xl shadow-black/55 backdrop-blur-2xl">
  <div class="mb-4 flex items-start gap-4">
    <div class="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-amber-300/40 bg-amber-300/12 text-2xl text-amber-100">⚠</div>
    <div class="min-w-0 flex-1">
      <div class="text-sm font-black uppercase tracking-[0.18em] text-amber-100">{title}</div>
      <p class="mt-2 text-sm leading-relaxed text-slate-200/82">{body}</p>
    </div>
    <button type="button" class="grid h-8 w-8 place-items-center rounded-full border border-amber-300/20 bg-black/20 text-amber-100 hover:border-amber-200/60" aria-label="Close modal" on:click={() => dispatch('close')}>×</button>
  </div>

  <div class="grid grid-cols-2 gap-3">
    <button type="button" class="rounded-xl border border-cyan-200/30 bg-cyan-300/10 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-cyan-50 hover:bg-cyan-300/18" on:click={() => dispatch('cancel')}>{cancelLabel}</button>
    <button type="button" class="rounded-xl border border-amber-200/35 bg-amber-300/16 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-amber-50 hover:bg-amber-300/25" on:click={() => dispatch('confirm')}>{confirmLabel}</button>
  </div>
</div>
