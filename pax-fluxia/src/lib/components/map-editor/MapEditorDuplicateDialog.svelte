<script lang="ts">
  import { modalDismiss } from "$lib/actions/modalDismiss";
  import type { AuthoredMapCategory } from "@pax/common/maps";
  import {
    MAP_EDITOR_DEFAULT_HEX_RADIUS,
    MAP_EDITOR_MAX_HEX_RADIUS,
    MAP_EDITOR_MIN_HEX_RADIUS,
    normalizeHexRadius,
  } from "$lib/editor/mapEditorPresentation";

  type MetadataDialogSubmitPayload = {
    name: string;
    description?: string;
    category: AuthoredMapCategory;
    familyName?: string;
    editorHexRadius: number;
    tags?: string[];
  };

  interface Props {
    title?: string;
    confirmLabel?: string;
    initialName?: string;
    initialDescription?: string;
    initialCategory?: AuthoredMapCategory;
    initialFamilyName?: string;
    initialHexRadius?: number;
    initialTags?: string[];
    currentName: string;
    currentDescription: string;
    currentDate: string;
    currentHexRadius?: number;
    onSubmit: (payload: MetadataDialogSubmitPayload) => void;
    onClose: () => void;
  }

  let {
    title = "Duplicate Map",
    confirmLabel = "Duplicate",
    initialName,
    initialDescription,
    initialCategory = "custom",
    initialFamilyName = "",
    initialHexRadius,
    initialTags = [],
    currentName,
    currentDescription,
    currentDate,
    currentHexRadius,
    onSubmit,
    onClose,
  }: Props = $props();

  let name = $state("");
  let description = $state("");
  let category = $state<AuthoredMapCategory>("custom");
  let familyName = $state("");
  let editorHexRadius = $state(MAP_EDITOR_DEFAULT_HEX_RADIUS);
  let customCategories = $state("");
  let didInit = $state(false);

  $effect(() => {
    if (didInit) return;
    name = initialName ?? `${currentName || "Untitled Map"} Copy`;
    description = initialDescription ?? currentDescription;
    category = initialCategory;
    familyName = initialFamilyName;
    editorHexRadius = normalizeHexRadius(
      initialHexRadius ?? currentHexRadius ?? MAP_EDITOR_DEFAULT_HEX_RADIUS,
    );
    customCategories = initialTags.join(", ");
    didInit = true;
  });

  function parseTags(value: string): string[] | undefined {
    const seen = new Set<string>();
    const tags: string[] = [];

    for (const chunk of value.split(",")) {
      const trimmed = chunk.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      tags.push(trimmed);
    }

    return tags.length > 0 ? tags : undefined;
  }

  function submit() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }
    onSubmit({
      name: trimmedName,
      description: description.trim() || undefined,
      category,
      familyName: familyName.trim() || undefined,
      editorHexRadius: normalizeHexRadius(editorHexRadius),
      tags: parseTags(customCategories),
    });
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      submit();
    }
  }
</script>

<div class="dialog" role="dialog" aria-modal="true" aria-label={title} tabindex="-1" onkeydown={handleKeydown} use:modalDismiss={onClose}>
  <header class="dialog__header">
    <strong>{title}</strong>
    <button type="button" class="dialog__close" aria-label="Close duplicate dialog" onclick={onClose}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z" fill="currentColor" /></svg>
    </button>
  </header>

  <div class="dialog__body">
    <label class="stack">
      <span>Name</span>
      <input type="text" bind:value={name} maxlength="80" />
    </label>

    <label class="stack">
      <span>Description</span>
      <textarea rows="5" bind:value={description}></textarea>
    </label>

    <label class="stack">
      <span>Map Type</span>
      <select bind:value={category}>
        <option value="classic">Classic</option>
        <option value="custom">Custom</option>
        <option value="test">Test</option>
      </select>
    </label>

    <label class="stack">
      <span>Family</span>
      <input type="text" bind:value={familyName} placeholder="Original Family or New Family" />
    </label>

    <label class="stack">
      <span>Default Density</span>
      <div class="density-input">
        <input
          type="number"
          min={MAP_EDITOR_MIN_HEX_RADIUS}
          max={MAP_EDITOR_MAX_HEX_RADIUS}
          step="1"
          bind:value={editorHexRadius}
        />
        <span>px</span>
      </div>
    </label>

    <label class="stack">
      <span>Categories</span>
      <input type="text" bind:value={customCategories} placeholder="favorites, campaign, prototype" />
    </label>

    <div class="meta-row">
      <span>Date</span>
      <strong>{new Date(currentDate).toLocaleString()}</strong>
    </div>
  </div>

  <footer class="dialog__footer">
    <button type="button" class="dialog__action" onclick={onClose}>Cancel</button>
    <button type="button" class="dialog__action dialog__action--primary" onclick={submit} disabled={!name.trim()}>
      {confirmLabel}
    </button>
  </footer>
</div>

<style>
  .dialog {
    position: absolute;
    top: 50%;
    left: 50%;
    z-index: 12;
    width: min(460px, calc(100vw - 32px));
    padding: var(--pax-gap-lg);
    border-radius: 24px;
    border: 1px solid var(--editor-border, color-mix(in srgb, var(--pax-ui-text-soft) 16%, transparent));
    background: color-mix(in srgb, var(--pax-color-void) 97%, transparent);
    backdrop-filter: blur(20px);
    box-shadow: 0 24px 70px color-mix(in srgb, var(--pax-color-void) 40%, transparent);
    display: grid;
    gap: var(--pax-space-4);
    transform: translate(-50%, -50%);
  }

  .dialog__header,
  .dialog__footer,
  .meta-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--pax-space-3);
  }

  .dialog__body,
  .stack {
    display: grid;
    gap: var(--pax-gap-sm);
  }

  .density-input {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--pax-gap-sm);
    align-items: center;
  }

  .density-input span {
    min-height: 40px;
    padding: 0 var(--pax-space-3);
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--pax-ui-text-soft) 16%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 90%, transparent);
    display: inline-flex;
    align-items: center;
    color: color-mix(in srgb, var(--pax-ui-text) 92%, transparent);
  }

  .dialog__header strong,
  .meta-row strong {
    font-family: var(--pax-ui-font-ui);
    font-size: var(--pax-type-base);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--pax-ui-text-strong);
  }

  .stack span,
  .meta-row span {
    font-size: var(--pax-type-xs);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--pax-ui-text-soft) 88%, transparent);
  }

  .dialog__close,
  .dialog__action,
  input,
  select,
  textarea {
    min-height: 40px;
    padding: 0 var(--pax-space-3);
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--pax-ui-text-soft) 16%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 90%, transparent);
    color: color-mix(in srgb, var(--pax-ui-text) 92%, transparent);
    font: inherit;
  }

  .dialog__close,
  .dialog__action {
    cursor: pointer;
  }

  .dialog__close {
    display: inline-grid;
    place-items: center;
    width: 40px;
    min-width: 40px;
    padding: 0;
  }

  .dialog__close svg {
    width: 18px;
    height: 18px;
  }

  textarea {
    min-height: 120px;
    padding: var(--pax-space-3);
    resize: vertical;
  }

  select {
    padding-right: 36px;
  }

  .dialog__action--primary {
    border-color: color-mix(in srgb, var(--pax-ui-accent) 42%, transparent);
  }

  .dialog__close:hover,
  .dialog__action:hover,
  .dialog__action--primary:hover {
    border-color: color-mix(in srgb, var(--pax-ui-accent) 58%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 88%, transparent);
    color: var(--pax-ui-text-strong);
  }

  .dialog__action:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
</style>
