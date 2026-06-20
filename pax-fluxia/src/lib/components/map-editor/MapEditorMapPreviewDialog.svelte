<script lang="ts">
  import { modalDismiss } from "$lib/actions/modalDismiss";

  interface Props {
    title: string;
    description?: string;
    author?: string;
    mapId?: string;
    familyName?: string;
    editorHexRadius?: number;
    categoryLabel: string;
    sourceLabel: string;
    starsCount: number;
    lanesCount: number;
    createdAt?: string;
    updatedAt?: string;
    thumbUrl?: string;
    tags?: string[];
    canLoad?: boolean;
    onClose: () => void;
    onLoad: () => void;
  }

  let {
    title,
    description,
    author,
    mapId,
    familyName,
    editorHexRadius,
    categoryLabel,
    sourceLabel,
    starsCount,
    lanesCount,
    createdAt,
    updatedAt,
    thumbUrl = "",
    tags = [],
    canLoad = true,
    onClose,
    onLoad,
  }: Props = $props();

  function formatDateTime(value?: string): string {
    if (!value) return "Unknown";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleString();
  }

  function formatDensity(value?: number): string {
    return Number.isFinite(value) ? `${Math.round(value!)} px` : "Unknown";
  }
</script>

<div class="preview-shell" role="presentation" use:modalDismiss={onClose}>
  <button type="button" class="preview-backdrop" aria-label="Close map preview" onclick={onClose}></button>

  <div class="preview-dialog" role="dialog" aria-modal="true" aria-label={`Preview ${title}`}>
    <header class="preview-dialog__header">
      <div class="preview-dialog__title-block">
        <strong>{title}</strong>
        <span>{categoryLabel} · {sourceLabel}</span>
      </div>

      <button type="button" class="preview-dialog__close" aria-label="Close map preview" onclick={onClose}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z" fill="currentColor" /></svg>
      </button>
    </header>

    <div class="preview-dialog__body">
      <div class="preview-dialog__visual">
        {#if thumbUrl}
          <img src={thumbUrl} alt={title} class="preview-dialog__thumb" />
        {:else}
          <div class="preview-dialog__thumb-empty">Preview unavailable</div>
        {/if}
      </div>

      <div class="preview-dialog__meta">
        <div class="preview-dialog__description">
          <span>Description</span>
          <p>{description?.trim() || "No description."}</p>
        </div>

        <dl class="meta-grid">
          <div class="meta-item">
            <dt>Stars</dt>
            <dd>{starsCount}</dd>
          </div>
          <div class="meta-item">
            <dt>Lanes</dt>
            <dd>{lanesCount}</dd>
          </div>
          <div class="meta-item">
            <dt>First Edited</dt>
            <dd>{formatDateTime(createdAt)}</dd>
          </div>
          <div class="meta-item">
            <dt>Last Edited</dt>
            <dd>{formatDateTime(updatedAt)}</dd>
          </div>
          <div class="meta-item">
            <dt>Family</dt>
            <dd>{familyName?.trim() || "None"}</dd>
          </div>
          <div class="meta-item">
            <dt>Default Density</dt>
            <dd>{formatDensity(editorHexRadius)}</dd>
          </div>
          <div class="meta-item">
            <dt>Author</dt>
            <dd>{author?.trim() || "Unknown"}</dd>
          </div>
          <div class="meta-item">
            <dt>Map ID</dt>
            <dd>{mapId?.trim() || "Unknown"}</dd>
          </div>
        </dl>

        {#if tags.length > 0}
          <div class="preview-dialog__tags">
            <span>Tags</span>
            <div class="tag-row">
              {#each tags as tag}
                <span class="tag-chip">{tag}</span>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>

    <footer class="preview-dialog__footer">
      <button type="button" class="preview-dialog__load" onclick={onLoad} disabled={!canLoad}>
        Load Map
      </button>
    </footer>
  </div>
</div>

<style>
  .preview-shell {
    position: absolute;
    inset: 0;
    z-index: 40;
  }

  .preview-backdrop {
    position: absolute;
    inset: 0;
    border: 0;
    background: color-mix(in srgb, var(--pax-color-void) 72%, transparent);
    backdrop-filter: blur(8px);
    cursor: default;
  }

  .preview-dialog {
    position: absolute;
    inset: 24px;
    margin: auto;
    width: min(1120px, calc(100% - 32px));
    max-height: calc(100% - 48px);
    padding: var(--pax-space-5);
    border-radius: 28px;
    border: 1px solid var(--editor-border, color-mix(in srgb, var(--pax-ui-text-soft) 16%, transparent));
    background: color-mix(in srgb, var(--pax-color-void) 98%, transparent);
    box-shadow: 0 24px 70px color-mix(in srgb, var(--pax-color-void) 40%, transparent);
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: var(--pax-space-4);
    overflow: auto;
  }

  .preview-dialog__header,
  .preview-dialog__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--pax-space-3);
  }

  .preview-dialog__title-block {
    display: grid;
    gap: var(--pax-space-1);
    min-width: 0;
  }

  .preview-dialog__title-block strong {
    font-family: var(--pax-ui-font-ui);
    font-size: var(--pax-type-lg);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--pax-ui-text-strong);
  }

  .preview-dialog__title-block span,
  .preview-dialog__description span,
  .preview-dialog__tags > span,
  .meta-item dt {
    font-size: var(--pax-type-xs);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--pax-ui-text-soft) 88%, transparent);
  }

  .preview-dialog__close,
  .preview-dialog__load {
    min-height: 42px;
    padding: 0 var(--pax-gap-md);
    border-radius: 14px;
    border: 1px solid color-mix(in srgb, var(--pax-ui-text-soft) 16%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 90%, transparent);
    color: color-mix(in srgb, var(--pax-ui-text) 92%, transparent);
    font: inherit;
    cursor: pointer;
    transition:
      border-color 140ms ease,
      background 140ms ease,
      color 140ms ease;
  }

  .preview-dialog__close {
    display: inline-grid;
    place-items: center;
    width: 42px;
    min-width: 42px;
    padding: 0;
  }

  .preview-dialog__close svg {
    width: 18px;
    height: 18px;
  }

  .preview-dialog__load {
    min-width: 148px;
    margin-left: auto;
    border-color: color-mix(in srgb, var(--pax-ui-accent) 42%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 88%, transparent);
    color: var(--pax-ui-text-strong);
    font-family: var(--pax-ui-font-ui);
    font-size: var(--pax-type-base);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .preview-dialog__close:hover,
  .preview-dialog__load:hover {
    border-color: color-mix(in srgb, var(--pax-ui-accent) 58%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 92%, transparent);
  }

  .preview-dialog__load:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .preview-dialog__body {
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.9fr);
    gap: var(--pax-gap-lg);
  }

  .preview-dialog__visual,
  .preview-dialog__meta {
    min-height: 0;
    border-radius: 22px;
    border: 1px solid color-mix(in srgb, var(--pax-ui-text-soft) 12%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 78%, transparent);
  }

  .preview-dialog__visual {
    overflow: hidden;
  }

  .preview-dialog__thumb,
  .preview-dialog__thumb-empty {
    display: block;
    width: 100%;
    height: 100%;
  }

  .preview-dialog__thumb {
    object-fit: contain;
    background: color-mix(in srgb, var(--pax-color-void) 92%, transparent);
  }

  .preview-dialog__thumb-empty {
    display: grid;
    place-items: center;
    min-height: 320px;
    color: color-mix(in srgb, var(--pax-ui-text-soft) 90%, transparent);
  }

  .preview-dialog__meta {
    display: grid;
    align-content: start;
    gap: var(--pax-space-4);
    padding: var(--pax-gap-lg);
    overflow: auto;
  }

  .preview-dialog__description {
    display: grid;
    gap: var(--pax-space-2);
  }

  .preview-dialog__description p {
    margin: 0;
    color: color-mix(in srgb, var(--pax-ui-text) 92%, transparent);
    line-height: 1.55;
  }

  .meta-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--pax-space-3);
    margin: 0;
  }

  .meta-item {
    display: grid;
    gap: var(--pax-space-1);
    margin: 0;
    padding: var(--pax-space-3);
    border-radius: 16px;
    border: 1px solid color-mix(in srgb, var(--pax-ui-text-soft) 10%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 34%, transparent);
  }

  .meta-item dd {
    margin: 0;
    color: var(--pax-ui-text-strong);
    line-height: 1.4;
    word-break: break-word;
  }

  .preview-dialog__tags {
    display: grid;
    gap: var(--pax-space-2);
  }

  .tag-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--pax-space-2);
  }

  .tag-chip {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 0 var(--pax-gap-sm);
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--pax-ui-accent) 22%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 56%, transparent);
    color: var(--pax-ui-text);
    font-size: var(--pax-type-xs-plus);
  }

  @media (max-width: 980px) {
    .preview-dialog__body {
      grid-template-columns: 1fr;
    }
  }
</style>
