<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'teal' | 'gold' | 'ghost' | 'danger';
    size?: 'sm' | 'md';
    disabled?: boolean;
    onclick?: (e: MouseEvent) => void;
    class?: string;
    children?: Snippet;
  }
  let { variant = 'ghost', size = 'md', disabled = false, onclick, class: cls = '', children }: Props = $props();

  const variants: Record<string, string> = {
    teal: 'hud-frame-teal text-teal-3 [&>span]:bg-teal-0/55 hover:[&>span]:bg-teal-0/80 hover:shadow-glow-teal',
    gold: 'hud-frame-lit text-gold-3 [&>span]:bg-amber-0/65 hover:[&>span]:bg-amber-0/90 hover:shadow-glow-gold',
    ghost: 'text-text-dim [&>span]:bg-hull-2/60 hover:text-text hover:[&>span]:bg-hull-3',
    danger: 'text-danger [&>span]:bg-danger/12 hover:[&>span]:bg-danger/20 hover:shadow-glow-danger',
  };
</script>

<button
  type="button"
  {disabled}
  {onclick}
  class="hud-frame bevel-sym group transition-shadow disabled:opacity-40 {variants[variant]} {cls}"
  style="--bv: 7px"
>
  <span
    class="bevel-sym hud-label flex items-center justify-center gap-1.5 transition-colors
      {size === 'sm' ? 'px-3 py-1.5 text-[10px]' : 'px-4 py-2'}"
    style="--bv: 6px"
  >
    {#if children}{@render children()}{/if}
  </span>
</button>
