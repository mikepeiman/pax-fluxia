<script lang="ts">
  import { mapEditorStore } from "$lib/editor/mapEditorStore.svelte";
  import { mapEditorUiStore } from "$lib/editor/mapEditorUiStore.svelte";

  interface Props {
    previewUrl: string;
    onNewMap: () => void;
    onDuplicateMap: () => void;
    onUpdateMetadata: (patch: {
      name?: string;
      author?: string;
      description?: string;
      mapId?: string;
    }) => void;
    onClose: () => void;
  }

  let {
    previewUrl,
    onNewMap,
    onDuplicateMap,
    onUpdateMetadata,
    onClose,
  }: Props = $props();

  const density = $derived(mapEditorUiStore.density);

  function slugify(value: string) {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
</script>

<section class="sheet" data-density={density}>
  <header class="sheet__header">
    <div>
      <strong>Map Actions</strong>
      <span>Metadata, duplication, and lower-frequency editor actions.</span>
    </div>
    <button type="button" class="ghost" onclick={onClose}>Close</button>
  </header>

  <div class="action-grid">
    <button type="button" onclick={onNewMap}>New Map</button>
    <button type="button" onclick={onDuplicateMap}>Duplicate Map</button>
  </div>

  <section class="panel-block">
    <strong class="subheading">Metadata</strong>
    <label class="stack">
      <span>Name</span>
      <input
        type="text"
        value={mapEditorStore.document.metadata.name}
        oninput={(event) => {
          const value = (event.currentTarget as HTMLInputElement).value;
          onUpdateMetadata({ name: value, mapId: slugify(value) });
        }}
      />
    </label>
    <label class="stack">
      <span>Author</span>
      <input
        type="text"
        value={mapEditorStore.document.metadata.author ?? ""}
        oninput={(event) => onUpdateMetadata({ author: (event.currentTarget as HTMLInputElement).value })}
      />
    </label>
    <label class="stack">
      <span>Description</span>
      <textarea
        rows="4"
        oninput={(event) => onUpdateMetadata({ description: (event.currentTarget as HTMLTextAreaElement).value })}
      >{mapEditorStore.document.metadata.description ?? ""}</textarea>
    </label>
  </section>

  {#if previewUrl}
    <section class="preview-card">
      <img src={previewUrl} alt="Current map preview" />
      <div class="preview-card__meta">
        <span>{mapEditorStore.document.stars.length} stars</span>
        <span>{mapEditorStore.document.connections.length} lanes</span>
        <span>{mapEditorStore.document.measurements?.length ?? 0} measures</span>
      </div>
    </section>
  {/if}
</section>

<style>
  .sheet {
    position: absolute;
    top: 76px;
    right: 16px;
    width: min(380px, 34vw);
    max-height: calc(100% - 180px);
    overflow: auto;
    padding: 16px;
    border-radius: 24px;
    border: 1px solid var(--editor-border, rgba(148, 163, 184, 0.16));
    background: rgba(3, 10, 24, 0.96);
    backdrop-filter: blur(20px);
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.4);
    display: grid;
    gap: 14px;
    z-index: 12;
  }

  .sheet__header,
  .action-grid,
  .preview-card__meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .sheet__header div,
  .stack,
  .panel-block {
    display: grid;
    gap: 10px;
  }

  .sheet__header strong,
  .subheading {
    font-family: "Rajdhani", sans-serif;
    font-size: 1rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #f8fafc;
  }

  .sheet__header span,
  .stack span,
  .preview-card__meta span {
    font-size: 0.76rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(148, 163, 184, 0.88);
  }

  .action-grid {
    justify-content: stretch;
  }

  .action-grid button,
  .ghost,
  input,
  textarea {
    width: 100%;
    min-height: 40px;
    padding: 0 12px;
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    background: rgba(9, 16, 31, 0.9);
    color: rgba(226, 232, 240, 0.92);
    font: inherit;
  }

  .action-grid button,
  .ghost {
    cursor: pointer;
  }

  textarea {
    min-height: 110px;
    padding: 12px;
    resize: vertical;
  }

  .preview-card {
    border-radius: 18px;
    overflow: hidden;
    border: 1px solid rgba(148, 163, 184, 0.14);
    background: rgba(9, 16, 31, 0.72);
  }

  .preview-card img {
    display: block;
    width: 100%;
    height: auto;
  }

  .preview-card__meta {
    padding: 10px 12px;
    flex-wrap: wrap;
  }

  @media (max-width: 980px) {
    .sheet {
      top: 68px;
      right: 12px;
      left: 12px;
      width: auto;
    }
  }
</style>
