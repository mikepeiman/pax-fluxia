/**
 * Floating-menu action for a dropdown/menu element that has been rendered in a
 * Portal (e.g. ark-ui <Portal>, i.e. at <body>). It:
 *   - positions the menu with `position: fixed` under (or above) an anchor,
 *     using getBoundingClientRect — so it escapes ALL ancestor clipping
 *     (overflow, clip-path, transform). This is the standard approach used by
 *     Floating UI / Radix / Ark.
 *   - flips above the anchor when there isn't room below.
 *   - repositions on scroll/resize and when its own size changes.
 *   - closes on a pointerdown outside the menu and anchor (`onDismiss`).
 *
 *   <Portal>
 *     <div class="menu" use:floatingMenu={{ anchor: triggerEl, onDismiss: close }}>…</div>
 *   </Portal>
 */
interface FloatingMenuParams {
  anchor?: HTMLElement;
  onDismiss?: () => void;
  gap?: number;
}

export function floatingMenu(node: HTMLElement, params: FloatingMenuParams) {
  let { anchor, onDismiss, gap = 4 } = params;
  node.style.position = "fixed";
  node.style.margin = "0";

  function place() {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    node.style.minWidth = `${Math.round(r.width)}px`;
    node.style.left = `${Math.round(r.left)}px`;
    const menuHeight = node.offsetHeight;
    const spaceBelow = window.innerHeight - r.bottom;
    if (spaceBelow < menuHeight + gap + 8 && r.top > menuHeight + gap + 8) {
      node.style.top = `${Math.round(r.top - menuHeight - gap)}px`;
    } else {
      node.style.top = `${Math.round(r.bottom + gap)}px`;
    }
  }

  function onPointerDown(event: PointerEvent) {
    const target = event.target as Node;
    if (node.contains(target)) return;
    if (anchor && anchor.contains(target)) return;
    onDismiss?.();
  }

  place();
  requestAnimationFrame(place); // re-place once content height settles

  const resizeObserver = new ResizeObserver(place);
  resizeObserver.observe(node);
  window.addEventListener("scroll", place, true);
  window.addEventListener("resize", place);
  // Defer so the click that opened the menu doesn't immediately dismiss it.
  const dismissTimer = window.setTimeout(
    () => document.addEventListener("pointerdown", onPointerDown, true),
    0,
  );

  return {
    update(next: FloatingMenuParams) {
      anchor = next.anchor;
      onDismiss = next.onDismiss;
      gap = next.gap ?? 4;
      place();
    },
    destroy() {
      window.clearTimeout(dismissTimer);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      document.removeEventListener("pointerdown", onPointerDown, true);
      resizeObserver.disconnect();
    },
  };
}
