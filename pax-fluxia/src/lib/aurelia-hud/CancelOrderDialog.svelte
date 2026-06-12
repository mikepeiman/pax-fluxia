<script lang="ts">
  import { Dialog } from '@ark-ui/svelte/dialog';
  import { Portal } from '@ark-ui/svelte/portal';
  import { hud } from './state/hud-state.svelte';
  import Icon from './primitives/Icon.svelte';
  import HudButton from './primitives/HudButton.svelte';

  const open = $derived(hud.pendingCancel !== null);
  const starName = $derived(hud.pendingCancel?.starName ?? '');
</script>

<Dialog.Root {open} onOpenChange={(d) => !d.open && hud.dismissCancel()} role="alertdialog">
  <Portal>
    <Dialog.Backdrop class="fixed inset-0 z-40 bg-void/70 backdrop-blur-[2px]" />
    <Dialog.Positioner class="fixed inset-0 z-50 grid place-items-center p-4">
      <Dialog.Content class="relative w-full max-w-sm outline-none">
        <div class="hud-frame hud-frame-lit bevel" style="--bv: 14px; --panel-bv: 14px">
          <div class="hud-plate bevel">
            <header class="flex h-10 items-center gap-2 pr-1.5 pl-4">
              <span class="hud-stud" aria-hidden="true"></span>
              <Dialog.Title class="hud-label flex-1 text-gold-2">Cancel Order</Dialog.Title>
              <Dialog.CloseTrigger
                class="grid size-7 place-items-center text-text-faint transition-colors hover:text-gold-3"
                aria-label="Close"
              >
                <Icon name="x" size={14} />
              </Dialog.CloseTrigger>
            </header>
            <div class="mx-4 h-px bg-gradient-to-r from-gold-1/70 via-gold-0/40 to-transparent" aria-hidden="true"></div>

            <div class="flex gap-3.5 px-4 pt-4 pb-2">
              <span
                class="grid size-10 flex-none place-items-center text-amber-2 ring-1 ring-amber-1/60"
                style="clip-path: polygon(50% 0, 100% 100%, 0 100%)"
                aria-hidden="true"
              >
                <Icon name="alert" size={18} class="mt-1.5" />
              </span>
              <Dialog.Description class="text-[13px] leading-relaxed text-text-dim">
                <span class="font-semibold text-text">Cancel the current order at {starName}?</span>
                <br />
                This removes the order from the queue. Assets already underway hold position.
              </Dialog.Description>
            </div>

            <footer class="flex justify-end gap-2.5 px-4 pt-2 pb-4">
              <HudButton variant="teal" size="sm" onclick={() => hud.dismissCancel()}>Keep order</HudButton>
              <HudButton variant="gold" size="sm" onclick={() => hud.confirmCancel()}>Cancel order</HudButton>
            </footer>
          </div>
        </div>
        <span class="hud-bracket hud-bracket-tr" aria-hidden="true"></span>
        <span class="hud-bracket hud-bracket-bl" aria-hidden="true"></span>
      </Dialog.Content>
    </Dialog.Positioner>
  </Portal>
</Dialog.Root>
