/**
 * Svelte action for modal/dialog overlays: closes the modal on Escape (always)
 * and on a click on the backdrop (outside the modal content).
 *
 * Apply to the overlay element (the full-screen backdrop). The modal content
 * must be a CHILD of that element so a backdrop click is `event.target === node`.
 *
 *   <div class="modal-overlay" use:modalDismiss={() => (open = false)}>
 *     <div class="modal">…</div>
 *   </div>
 */
export function modalDismiss(node: HTMLElement, onDismiss: () => void) {
  let dismiss = onDismiss;

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.stopPropagation();
      dismiss();
    }
  }

  function onClick(event: MouseEvent) {
    // Only the backdrop itself — not anything inside the modal content.
    if (event.target === node) dismiss();
  }

  // Capture phase so Escape fires even when focus is inside an input/select.
  document.addEventListener("keydown", onKeydown, true);
  node.addEventListener("click", onClick);

  return {
    update(next: () => void) {
      dismiss = next;
    },
    destroy() {
      document.removeEventListener("keydown", onKeydown, true);
      node.removeEventListener("click", onClick);
    },
  };
}
