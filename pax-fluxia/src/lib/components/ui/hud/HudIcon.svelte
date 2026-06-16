<script lang="ts">
  // App-wide icon. Renders the active icon set (Lucide / Phosphor / Tabler)
  // from one semantic name. Switch sets live in Appearance settings.
  import type { Component } from "svelte";
  import { resolveIcon } from "$lib/icons/iconMap";
  import { iconSetState } from "$lib/icons/iconSetStore.svelte";

  interface Props {
    name: string;
    size?: number | string;
    title?: string;
    class?: string;
    strokeWidth?: number;
  }

  let { name, size = 18, title, class: className = "" }: Props = $props();

  const SvgIcon = $derived(
    resolveIcon(name, iconSetState.current) as unknown as Component<{
      size?: number | string;
    }>,
  );
  const px = $derived(
    typeof size === "number" ? size : parseFloat(String(size)) || 18,
  );
</script>

<span
  class={`hud-icon ${className}`.trim()}
  role={title ? "img" : undefined}
  aria-label={title}
  aria-hidden={title ? undefined : "true"}
>
  <SvgIcon size={px} />
</span>

<style>
  .hud-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: currentColor;
    flex: 0 0 auto;
    line-height: 0;
    transform: scale(var(--pax-ui-icon-scale, 1));
  }

  .hud-icon :global(svg) {
    display: block;
  }
</style>
