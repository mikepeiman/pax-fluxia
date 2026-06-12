<script lang="ts">
  interface Props {
    value: number;
    max: number;
    tone?: 'teal' | 'amber' | 'ice' | 'nova';
    class?: string;
  }
  let { value, max, tone = 'teal', class: cls = '' }: Props = $props();

  const tones: Record<string, string> = {
    teal: 'bg-teal-2 shadow-glow-teal',
    amber: 'bg-amber-2 shadow-glow-gold',
    ice: 'bg-ice',
    nova: 'bg-nova',
  };
</script>

<span class="flex items-center gap-1 {cls}" role="img" aria-label={`${value} of ${max}`}>
  {#each Array(max) as _, i (i)}
    <span
      class="size-1.5 rotate-45 {i < value ? tones[tone] : 'bg-hull-3 ring-1 ring-line ring-inset'}"
    ></span>
  {/each}
</span>
