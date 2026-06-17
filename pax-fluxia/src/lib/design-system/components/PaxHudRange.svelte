<script lang="ts">
  import { hudRange } from "$lib/design-system/variants/hud";

  interface Props {
    label: string;
    note?: string;
    value: number;
    min: number;
    max: number;
    step: number;
    output: string;
    ariaLabel?: string;
    disabled?: boolean;
    class?: string;
    onInput: (value: number) => void;
  }

  let {
    label,
    note,
    value,
    min,
    max,
    step,
    output,
    ariaLabel,
    disabled = false,
    class: className = "",
    onInput,
  }: Props = $props();

  const styles = hudRange();
</script>

<label class={styles.root({ class: className })}>
  <span class={styles.meta()}>
    <strong class={styles.label()}>{label}</strong>
    {#if note}
      <small class={styles.note()}>{note}</small>
    {/if}
  </span>
  <span class={styles.control()}>
    <input
      class={styles.input()}
      type="range"
      {min}
      {max}
      {step}
      {value}
      {disabled}
      aria-label={ariaLabel ?? `${label} size`}
      oninput={(event) => onInput(event.currentTarget.valueAsNumber)}
    />
    <output class={styles.output()}>{output}</output>
  </span>
</label>
