<script lang="ts">
  import Icon from './Icon.svelte';

  interface Props {
    icon: string;
    label: string;
    badge?: number;
    active?: boolean;
    size?: number;
    onclick?: (e: MouseEvent) => void;
    class?: string;
  }
  let { icon, label, badge = 0, active = false, size = 15, onclick, class: cls = '' }: Props = $props();
</script>

<button
  type="button"
  class="hud-frame bevel-sym relative transition-shadow hover:shadow-glow-gold {cls}"
  style="--bv: 6px"
  aria-label={label}
  title={label}
  {onclick}
>
  <span
    class="bevel-sym grid size-9 place-items-center transition-colors
      {active ? 'bg-amber-0/70 text-gold-3' : 'bg-hull-2/70 text-text-dim hover:text-gold-3'}"
    style="--bv: 5px"
  >
    <Icon name={icon} {size} />
  </span>
  {#if badge > 0}
    <span
      class="hud-num absolute -top-1.5 -right-1.5 grid size-4 place-items-center bg-danger text-[9px] font-bold text-void"
      style="clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%)"
    >
      {badge}
    </span>
  {/if}
</button>
