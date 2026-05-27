<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let icon = '?';
  export let label = 'Button';
  export let title = label;
  export let active = false;
  export let disabled = false;
  export let size: 'sm' | 'md' | 'lg' = 'md';

  const dispatch = createEventDispatcher();

  $: sizeClass =
    size === 'sm'
      ? 'h-8 w-8 text-xs'
      : size === 'lg'
        ? 'h-11 w-11 text-base'
        : 'h-10 w-10 text-sm';

  function handleClick() {
    if (!disabled) dispatch('click');
  }
</script>

<button
  type="button"
  {title}
  aria-label={label}
  {disabled}
  class={`grid ${sizeClass} place-items-center rounded-full border font-semibold shadow-lg backdrop-blur-md transition
    ${active
      ? 'border-cyan-200/80 bg-cyan-300/18 text-cyan-50 shadow-cyan-500/25'
      : 'border-amber-300/25 bg-slate-950/55 text-amber-100/85 hover:border-cyan-200/60 hover:bg-cyan-300/12 hover:text-cyan-50'}
    ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
  on:click={handleClick}
>
  <span aria-hidden="true">{icon}</span>
  <span class="sr-only">{label}</span>
</button>
