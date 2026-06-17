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

  // The value display doubles as a click-to-type input: it reads as clean
  // formatted text, and on focus exposes the raw number so it can be typed.
  let editing = $state(false);
  let draft = $state("");

  function beginEdit(event: FocusEvent) {
    if (disabled) return;
    editing = true;
    draft = `${value}`;
    const target = event.currentTarget as HTMLInputElement;
    queueMicrotask(() => target.select());
  }

  function commit() {
    editing = false;
    const parsed = Number(draft.trim());
    if (Number.isFinite(parsed)) {
      onInput(Math.min(max, Math.max(min, parsed)));
    }
  }

  function onKey(event: KeyboardEvent) {
    if (event.key === "Enter") {
      (event.currentTarget as HTMLInputElement).blur();
    } else if (event.key === "Escape") {
      editing = false;
      (event.currentTarget as HTMLInputElement).blur();
    }
  }
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
    <input
      class={`pax-hud-range__value ${styles.output()}`}
      type="text"
      inputmode="decimal"
      value={editing ? draft : output}
      {disabled}
      aria-label={`${label} value`}
      title="Click to type a value"
      onfocus={beginEdit}
      oninput={(event) => (draft = event.currentTarget.value)}
      onblur={commit}
      onkeydown={onKey}
    />
  </span>
</label>

<style>
  /* Value reads as plain text; only on hover/focus does it look editable. */
  .pax-hud-range__value {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    text-align: right;
    background: transparent;
    border: 0;
    border-radius: 5px;
    padding: 2px 4px;
    appearance: none;
    cursor: text;
    transition: background 120ms ease, box-shadow 120ms ease;
  }
  .pax-hud-range__value:hover:not(:disabled) {
    background: rgba(246, 196, 105, 0.07);
  }
  .pax-hud-range__value:focus {
    outline: none;
    text-align: right;
    background: rgba(246, 196, 105, 0.12);
    box-shadow: inset 0 0 0 1px rgba(246, 196, 105, 0.5);
  }
  .pax-hud-range__value:disabled {
    cursor: default;
    opacity: 0.5;
  }
</style>
