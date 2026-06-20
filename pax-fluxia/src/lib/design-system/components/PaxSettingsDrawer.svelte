<script lang="ts">
  import type { Snippet } from "svelte";
  import HudIcon from "$lib/components/ui/hud/HudIcon.svelte";
  import PaxHudButton from "./PaxHudButton.svelte";

  interface Props {
    title: string;
    icon: string;
    accent?: string;
    closeTitle?: string;
    bodyClass?: string;
    class?: string;
    style?: string;
    onClose?: () => void;
    subnav?: Snippet;
    children?: Snippet;
  }

  let {
    title,
    icon,
    accent = "var(--pax-ui-accent-warm)",
    closeTitle,
    bodyClass = "",
    class: className = "",
    style = "",
    onClose,
    subnav,
    children,
  }: Props = $props();

  const rootStyle = $derived(`--accent:${accent};${style}`);
</script>

<section class={`pax-settings-drawer ${className}`} style={rootStyle}>
  <header class="pax-settings-drawer__header">
    <PaxHudButton
      class="pax-settings-drawer__head"
      onclick={onClose}
      title={closeTitle ?? `Close ${title}`}
    >
      <span class="pax-settings-drawer__head-icon"><HudIcon name={icon} /></span>
      <span class="pax-settings-drawer__head-label">{title}</span>
      {#if onClose}
        <span class="pax-settings-drawer__head-close">
          <HudIcon name="close" size={14} />
        </span>
      {/if}
    </PaxHudButton>
    {#if subnav}
      <div class="pax-settings-drawer__subnav">
        {@render subnav()}
      </div>
    {/if}
  </header>
  <div class={`pax-settings-drawer__body ${bodyClass}`}>
    {#if children}
      {@render children()}
    {/if}
  </div>
</section>

<style>
  .pax-settings-drawer {
    min-width: 0;
    min-height: 0;
    height: 100%;
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid transparent;
    border-radius: var(--pax-ui-radius-md);
    clip-path: var(--pax-ui-rounded-corner-md);
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--pax-color-void) 97%, transparent), color-mix(in srgb, var(--pax-color-void) 99%, transparent)) padding-box,
      var(--pax-ui-border-gradient) border-box;
    box-shadow: var(--pax-ui-shadow-soft);
    color: var(--pax-ui-text);
    font-family: var(--pax-ui-font-ui);
    animation: pax-settings-drawer-enter 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .pax-settings-drawer__header {
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid var(--pax-ui-divider);
    background:
      linear-gradient(90deg, color-mix(in srgb, var(--accent) 10%, transparent), transparent),
      color-mix(in srgb, var(--pax-color-void) 72%, transparent);
  }

  :global(.pax-settings-drawer__head) {
    width: 100%;
    min-height: 48px;
    justify-content: flex-start;
    padding: 0 var(--pax-gap-md);
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--pax-ui-accent-warm-strong);
    box-shadow: none;
  }

  :global(.pax-settings-drawer__head:hover) {
    background: color-mix(in srgb, var(--accent) 14%, transparent);
  }

  .pax-settings-drawer__head-icon,
  .pax-settings-drawer__head-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
  }

  .pax-settings-drawer__head-icon {
    width: 20px;
    height: 20px;
    color: var(--pax-ui-accent-warm);
  }

  .pax-settings-drawer__head-label {
    min-width: 0;
    flex: 1 1 auto;
    overflow: hidden;
    color: var(--pax-ui-accent-warm-strong);
    font-family: var(--pax-ui-font-ui);
    font-size: calc(0.86rem * var(--pax-ui-title-scale, 1));
    font-weight: var(--pax-weight-extrabold);
    letter-spacing: 0.09em;
    line-height: 1.1;
    text-align: left;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .pax-settings-drawer__head-close {
    opacity: 0.58;
    transition: opacity var(--pax-motion-fast, 150ms ease);
  }

  :global(.pax-settings-drawer__head:hover) .pax-settings-drawer__head-close {
    opacity: 1;
  }

  .pax-settings-drawer__subnav {
    display: flex;
    flex-wrap: wrap;
    gap: var(--pax-space-2);
    padding: 0 var(--pax-space-3) var(--pax-space-3);
  }

  .pax-settings-drawer__body {
    min-height: 0;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    gap: var(--pax-space-3);
    overflow-y: auto;
    padding: var(--pax-gap-sm);
  }

  .pax-settings-drawer__body :global(p) {
    margin: 0;
    color: var(--pax-ui-text-soft);
    font-family: var(--pax-ui-font-copy);
    font-size: calc(0.76rem * var(--pax-ui-type-scale, 1));
    line-height: 1.45;
  }

  @keyframes pax-settings-drawer-enter {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
