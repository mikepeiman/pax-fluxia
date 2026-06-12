<script lang="ts">
  /** Procedural faction crests. Filled marks, inherit currentColor. */
  interface Props {
    variant: 'luminara' | 'vaelari' | 'neutral';
    size?: number;
    class?: string;
  }
  let { variant, size = 18, class: cls = '' }: Props = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" class={cls} aria-hidden="true">
  {#if variant === 'luminara'}
    <!-- Accord compass-star: four blades + core diamond -->
    <path
      fill="currentColor"
      d="M12 1.5 14.2 9 12 11 9.8 9 12 1.5Zm0 21L9.8 15l2.2-2 2.2 2L12 22.5ZM1.5 12 9 9.8l2 2.2-2 2.2L1.5 12Zm21 0L15 14.2l-2-2.2 2-2.2 7.5 2.2Z"
    />
    <rect x="10.6" y="10.6" width="2.8" height="2.8" fill="currentColor" transform="rotate(45 12 12)" />
  {:else if variant === 'vaelari'}
    <!-- Combine crest: rising tri-flame -->
    <path
      fill="currentColor"
      d="M12 2.5c1.6 3.2 2.4 5.8 2.4 8.2 0 3-1 5.4-2.4 7.4-1.4-2-2.4-4.4-2.4-7.4 0-2.4.8-5 2.4-8.2Z"
    />
    <path
      fill="currentColor"
      d="M5.2 7.5c2 1.6 3.4 3.3 4 5.2.7 2.1.4 4.2-.5 6.3-1.7-1.4-3-3.2-3.6-5.3-.5-1.9-.5-4-.1-6.2Zm13.6 0c.4 2.2.4 4.3-.1 6.2-.6 2.1-1.9 3.9-3.6 5.3-.9-2.1-1.2-4.2-.5-6.3.6-1.9 2-3.6 4.2-5.2Z"
    />
    <path fill="currentColor" d="M12 17.2l1.8 2.3L12 21.8l-1.8-2.3 1.8-2.3Z" />
  {:else}
    <circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" stroke-width="1.6" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" />
  {/if}
</svg>
