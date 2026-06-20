<script lang="ts">
  import { modalDismiss } from "$lib/actions/modalDismiss";

  interface Props {
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
    onClose: () => void;
  }

  let {
    title,
    message,
    confirmLabel,
    onConfirm,
    onClose,
  }: Props = $props();

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      onConfirm();
    }
  }
</script>

<div class="dialog" role="dialog" aria-modal="true" aria-label={title} tabindex="-1" onkeydown={handleKeydown} use:modalDismiss={onClose}>
  <header class="dialog__header">
    <strong>{title}</strong>
    <button type="button" class="dialog__close" aria-label="Close dialog" onclick={onClose}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z" fill="currentColor" /></svg>
    </button>
  </header>

  <div class="dialog__body">
    <p>{message}</p>
  </div>

  <footer class="dialog__footer">
    <button type="button" class="dialog__action" onclick={onClose}>Cancel</button>
    <button type="button" class="dialog__action dialog__action--danger" onclick={onConfirm}>
      {confirmLabel}
    </button>
  </footer>
</div>

<style>
  .dialog {
    position: absolute;
    top: 50%;
    left: 50%;
    z-index: 14;
    width: min(420px, calc(100vw - 32px));
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
  .dialog__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--pax-space-3);
  }

  .dialog__header strong {
    font-family: var(--pax-ui-font-ui);
    font-size: var(--pax-type-base);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--pax-ui-text-strong);
  }

  .dialog__body p {
    margin: 0;
    color: color-mix(in srgb, var(--pax-ui-text) 92%, transparent);
    line-height: 1.55;
  }

  .dialog__close,
  .dialog__action {
    min-height: 40px;
    padding: 0 var(--pax-space-3);
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--pax-ui-text-soft) 16%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 90%, transparent);
    color: color-mix(in srgb, var(--pax-ui-text) 92%, transparent);
    font: inherit;
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

  .dialog__close:hover,
  .dialog__action:hover {
    border-color: color-mix(in srgb, var(--pax-ui-accent) 58%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 88%, transparent);
    color: var(--pax-ui-text-strong);
  }

  .dialog__action--danger {
    border-color: color-mix(in srgb, var(--pax-ui-danger) 28%, transparent);
    background: color-mix(in srgb, var(--pax-ui-danger) 22%, var(--pax-color-void));
  }

  .dialog__action--danger:hover {
    border-color: color-mix(in srgb, var(--pax-ui-danger) 62%, transparent);
    background: color-mix(in srgb, var(--pax-ui-danger) 34%, var(--pax-color-void));
  }
</style>
