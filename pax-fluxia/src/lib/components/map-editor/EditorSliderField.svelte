<script lang="ts">
  interface Props {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    accent?: string;
    valueText?: string;
    unitLabel?: string;
    onChange: (value: number) => void;
  }

  let {
    label,
    value,
    min,
    max,
    step = 1,
    accent = "#7dd3fc",
    valueText = String(value),
    unitLabel = "",
    onChange,
  }: Props = $props();

  let draftValue = $state("");
  let draftFocused = $state(false);

  $effect(() => {
    if (!draftFocused) {
      draftValue = String(value);
    }
  });

  function clamp(next: number) {
    return Math.min(max, Math.max(min, next));
  }

  function commitDraft() {
    const parsed = Number(draftValue);
    if (!Number.isFinite(parsed)) {
      draftValue = String(value);
      return;
    }
    const clamped = clamp(parsed);
    onChange(clamped);
    draftValue = String(clamped);
  }

  function handleDraftKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      commitDraft();
      draftFocused = false;
      return;
    }
    if (event.key === "Escape") {
      draftValue = String(value);
      draftFocused = false;
    }
  }
</script>

<label class="slider-field" style={`--slider-accent:${accent};`}>
  <div class="slider-field__top">
    <span class="slider-field__label">{label}</span>
    <span class="slider-field__value">{valueText}</span>
  </div>

  <div class="slider-field__body">
    <input
      class="slider-field__range"
      type="range"
      {min}
      {max}
      {step}
      {value}
      oninput={(event) => onChange(Number((event.currentTarget as HTMLInputElement).value))}
    />

    <label class="slider-field__number-wrap">
      {#if unitLabel}
        <span class="slider-field__unit">{unitLabel}</span>
      {/if}
      <input
        class="slider-field__number"
        type="number"
        {min}
        {max}
        {step}
        value={draftValue}
        onfocus={() => {
          draftFocused = true;
        }}
        onblur={() => {
          commitDraft();
          draftFocused = false;
        }}
        oninput={(event) => {
          draftValue = (event.currentTarget as HTMLInputElement).value;
        }}
        onkeydown={handleDraftKeydown}
      />
    </label>
  </div>
</label>

<style>
  .slider-field {
    display: grid;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 16px;
    border: 1px solid color-mix(in srgb, var(--pax-ui-text-soft) 14%, transparent);
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--pax-color-void) 92%, transparent), color-mix(in srgb, var(--pax-color-void) 92%, transparent));
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, var(--pax-ui-text-strong) 3%, transparent),
      0 10px 24px color-mix(in srgb, var(--pax-color-void) 18%, transparent);
  }

  .slider-field__top,
  .slider-field__body {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .slider-field__top {
    justify-content: space-between;
  }

  .slider-field__label {
    font-size: var(--pax-type-2xs);
    font-weight: var(--pax-weight-bold);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(186, 204, 226, 0.82);
  }

  .slider-field__value {
    padding: 3px 8px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--slider-accent) 18%, rgba(255, 255, 255, 0.04));
    border: 1px solid color-mix(in srgb, var(--slider-accent) 34%, rgba(255, 255, 255, 0.08));
    color: color-mix(in srgb, var(--slider-accent) 72%, white 28%);
    font-family: var(--pax-ui-font-ui);
    font-size: var(--pax-type-sm);
    font-weight: var(--pax-weight-bold);
    letter-spacing: 0.08em;
    line-height: 1;
  }

  .slider-field__range {
    flex: 1;
    margin: 0;
    accent-color: var(--slider-accent);
  }

  .slider-field__number-wrap {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 74px;
    padding: 0 8px;
    min-height: 34px;
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--pax-ui-text-soft) 16%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 90%, transparent);
  }

  .slider-field__unit {
    font-size: var(--pax-type-label);
    font-weight: var(--pax-weight-bold);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--pax-ui-text-soft) 76%, transparent);
  }

  .slider-field__number {
    width: 100%;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    color: var(--pax-ui-text-strong);
    font: inherit;
    font-family: var(--pax-ui-font-data);
    font-size: var(--pax-type-xs-plus);
    font-weight: var(--pax-weight-bold);
  }

  .slider-field__number::-webkit-outer-spin-button,
  .slider-field__number::-webkit-inner-spin-button {
    margin: 0;
  }
</style>
