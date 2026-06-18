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
    /** Show the −/+ step buttons (default on). */
    nudge?: boolean;
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
    nudge = true,
    class: className = "",
    onInput,
  }: Props = $props();

  const styles = hudRange();

  function stepBy(direction: -1 | 1) {
    if (disabled) return;
    onInput(Math.min(max, Math.max(min, value + step * direction)));
  }

  // The value display doubles as a click-to-type input: clean formatted text
  // that exposes the raw number on focus.
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

<div class={styles.root({ class: className })}>
  <span class={styles.label()} title={note ?? undefined}>{label}</span>

  {#if nudge}
    <button
      type="button"
      class={styles.nudge()}
      {disabled}
      aria-label={`Decrease ${label}`}
      onclick={() => stepBy(-1)}
    >−</button>
  {/if}

  <input
    class={styles.input()}
    type="range"
    {min}
    {max}
    {step}
    {value}
    {disabled}
    aria-label={ariaLabel ?? label}
    oninput={(event) => onInput(event.currentTarget.valueAsNumber)}
  />

  {#if nudge}
    <button
      type="button"
      class={styles.nudge()}
      {disabled}
      aria-label={`Increase ${label}`}
      onclick={() => stepBy(1)}
    >+</button>
  {/if}

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
</div>

<style>
  /* Value reads as plain text; only on hover/focus does it look editable. */
  .pax-hud-range__value {
    box-sizing: border-box;
    background: transparent;
    border: 0;
    border-radius: 5px;
    padding: 2px 4px;
    appearance: none;
    cursor: text;
    transition:
      background 120ms ease,
      box-shadow 120ms ease;
  }
  .pax-hud-range__value:hover:not(:disabled) {
    background: rgba(246, 196, 105, 0.07);
  }
  .pax-hud-range__value:focus {
    outline: none;
    background: rgba(246, 196, 105, 0.12);
    box-shadow: inset 0 0 0 1px rgba(246, 196, 105, 0.5);
  }
  .pax-hud-range__value:disabled {
    cursor: default;
    opacity: 0.5;
  }
</style>
