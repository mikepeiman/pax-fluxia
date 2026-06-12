<script lang="ts">
  interface Props {
    /** 0–1 */
    value: number;
    tone?: 'teal' | 'amber' | 'pressure';
    shimmer?: boolean;
    class?: string;
  }
  let { value, tone = 'teal', shimmer = false, class: cls = '' }: Props = $props();

  const fills: Record<string, string> = {
    teal: 'from-teal-1 to-teal-2',
    amber: 'from-amber-1 to-amber-2',
    pressure: 'from-teal-1 via-teal-2 to-amber-2',
  };
</script>

<span
  class="relative block h-1.5 w-full overflow-hidden bg-hull-3/80 ring-1 ring-line ring-inset {cls}"
  style="clip-path: polygon(2px 0, 100% 0, calc(100% - 2px) 100%, 0 100%)"
  role="progressbar"
  aria-valuenow={Math.round(value * 100)}
  aria-valuemin={0}
  aria-valuemax={100}
>
  <span
    class="absolute inset-y-0 left-0 bg-gradient-to-r {fills[tone]} transition-[width] duration-500"
    style="width: {Math.max(0, Math.min(1, value)) * 100}%"
  ></span>
  {#if shimmer}
    <span
      class="animate-hud-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent bg-[length:200%_100%]"
    ></span>
  {/if}
</span>
