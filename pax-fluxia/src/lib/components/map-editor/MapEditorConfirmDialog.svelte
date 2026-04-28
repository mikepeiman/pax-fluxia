<script lang="ts">
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

<div class="dialog" role="dialog" aria-modal="true" aria-label={title} tabindex="-1" onkeydown={handleKeydown}>
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
    padding: 18px;
    border-radius: 24px;
    border: 1px solid var(--editor-border, rgba(148, 163, 184, 0.16));
    background: rgba(3, 10, 24, 0.97);
    backdrop-filter: blur(20px);
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.4);
    display: grid;
    gap: 16px;
    transform: translate(-50%, -50%);
  }

  .dialog__header,
  .dialog__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .dialog__header strong {
    font-family: "Rajdhani", sans-serif;
    font-size: 1rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #f8fafc;
  }

  .dialog__body p {
    margin: 0;
    color: rgba(226, 232, 240, 0.92);
    line-height: 1.55;
  }

  .dialog__close,
  .dialog__action {
    min-height: 40px;
    padding: 0 12px;
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    background: rgba(9, 16, 31, 0.9);
    color: rgba(226, 232, 240, 0.92);
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
    border-color: rgba(125, 211, 252, 0.58);
    background: rgba(17, 39, 63, 0.88);
    color: #f8fafc;
  }

  .dialog__action--danger {
    border-color: rgba(248, 113, 113, 0.28);
    background: rgba(60, 16, 16, 0.9);
  }

  .dialog__action--danger:hover {
    border-color: rgba(248, 113, 113, 0.62);
    background: rgba(127, 29, 29, 0.82);
  }
</style>
