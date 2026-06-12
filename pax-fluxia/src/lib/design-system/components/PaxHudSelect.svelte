<script lang="ts">
  import { hudField, type HudFieldVariants } from "$lib/design-system/variants/hud";

  interface SelectOption {
    value: string;
    label: string;
  }

  interface Props {
    value: string;
    options: SelectOption[];
    label?: string;
    ariaLabel?: string;
    placeholder?: string;
    size?: HudFieldVariants["size"];
    class?: string;
    onValueChange: (value: string) => void;
  }

  let {
    value,
    options,
    label,
    ariaLabel,
    placeholder,
    size = "md",
    class: className = "",
    onValueChange,
  }: Props = $props();

  const styles = $derived(hudField({ size }));
</script>

<label class={styles.label({ class: className })}>
  {#if label}
    <span class={styles.labelText()}>{label}</span>
  {/if}
  <select
    class={styles.input()}
    {value}
    aria-label={ariaLabel ?? label}
    onchange={(event) => onValueChange(event.currentTarget.value)}
  >
    {#if placeholder}
      <option value="">{placeholder}</option>
    {/if}
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</label>
