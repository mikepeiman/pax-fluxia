<script lang="ts">
  import { hudField, type HudFieldVariants } from "$lib/design-system/variants/hud";

  interface Props {
    value: string;
    label?: string;
    placeholder?: string;
    size?: HudFieldVariants["size"];
    class?: string;
    onInput: (value: string) => void;
    onKeydown?: (event: KeyboardEvent) => void;
  }

  let {
    value,
    label,
    placeholder,
    size = "md",
    class: className = "",
    onInput,
    onKeydown,
  }: Props = $props();

  const styles = $derived(hudField({ size }));
</script>

<label class={styles.label({ class: className })}>
  {#if label}
    <span class={styles.labelText()}>{label}</span>
  {/if}
  <input
    class={styles.input()}
    type="text"
    {value}
    {placeholder}
    oninput={(event) => onInput(event.currentTarget.value)}
    onkeydown={(event) => onKeydown?.(event)}
  />
</label>
