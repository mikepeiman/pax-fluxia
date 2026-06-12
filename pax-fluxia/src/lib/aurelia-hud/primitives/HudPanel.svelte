<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  interface Props {
    title?: string;
    /** corner-bracket ornaments on the square corners */
    brackets?: boolean;
    /** bevel depth in px */
    bevel?: number;
    /** lit = brighter gold frame (hero panels) */
    lit?: boolean;
    collapsible?: boolean;
    collapsed?: boolean;
    onToggle?: () => void;
    onClose?: () => void;
    class?: string;
    headerExtra?: Snippet;
    children?: Snippet;
  }

  let {
    title,
    brackets = true,
    bevel = 12,
    lit = false,
    collapsible = false,
    collapsed = false,
    onToggle,
    onClose,
    class: cls = '',
    headerExtra,
    children,
  }: Props = $props();
</script>

<section class="relative {cls}" style="--panel-bv: {bevel}px">
  <div class="hud-frame bevel {lit ? 'hud-frame-lit' : ''}" style="--bv: {bevel}px">
    <div class="hud-plate bevel flex flex-col">
      {#if title}
        <header class="flex h-9 flex-none items-center gap-2 pr-1.5 pl-3.5">
          <span class="hud-stud" aria-hidden="true"></span>
          <h2 class="hud-label flex-1 truncate text-gold-2">{title}</h2>
          {#if headerExtra}{@render headerExtra()}{/if}
          {#if collapsible}
            <button
              type="button"
              class="grid size-6 place-items-center text-text-faint transition-colors hover:text-gold-3"
              aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
              aria-expanded={!collapsed}
              onclick={onToggle}
            >
              <Icon name={collapsed ? 'chevron-down' : 'chevron-up'} size={13} />
            </button>
          {/if}
          {#if onClose}
            <button
              type="button"
              class="grid size-6 place-items-center text-text-faint transition-colors hover:text-gold-3"
              aria-label={`Close ${title}`}
              onclick={onClose}
            >
              <Icon name="x" size={13} />
            </button>
          {/if}
        </header>
        {#if !collapsed}
          <div
            class="mx-3 h-px flex-none bg-gradient-to-r from-gold-1/70 via-gold-0/40 to-transparent"
            aria-hidden="true"
          ></div>
        {/if}
      {/if}
      {#if !collapsed}
        <div class="min-h-0 flex-1">
          {#if children}{@render children()}{/if}
        </div>
      {/if}
    </div>
  </div>
  {#if brackets}
    <span class="hud-bracket hud-bracket-tr" aria-hidden="true"></span>
    <span class="hud-bracket hud-bracket-bl" aria-hidden="true"></span>
  {/if}
</section>
