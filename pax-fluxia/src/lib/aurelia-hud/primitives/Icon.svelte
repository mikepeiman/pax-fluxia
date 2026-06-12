<script lang="ts">
  import { ICON_PATHS } from './icons';

  interface Props {
    name: string;
    size?: number;
    stroke?: number;
    class?: string;
  }
  let { name, size = 16, stroke = 1.6, class: cls = '' }: Props = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width={stroke}
  stroke-linecap="round"
  stroke-linejoin="round"
  class={cls}
  aria-hidden="true"
>
  <!-- eslint-disable-next-line svelte/no-at-html-tags — static, internal path registry -->
  {@html ICON_PATHS[name] ?? ''}
</svg>
