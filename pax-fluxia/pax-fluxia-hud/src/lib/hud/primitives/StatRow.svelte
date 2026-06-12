<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    class?: string;
    children?: Snippet;
  }
  let { label, class: cls = '', children }: Props = $props();
</script>

<div class="flex h-7 items-center justify-between gap-3 {cls}">
  <span class="hud-label text-[10px] text-text-faint">{label}</span>
  <span class="hud-num flex items-center gap-1.5 text-[13px] font-semibold text-text">
    {#if children}{@render children()}{/if}
  </span>
</div>
