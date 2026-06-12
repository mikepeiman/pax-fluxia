<script lang="ts">
  import { Checkbox } from '@ark-ui/svelte/checkbox';
  import { hud } from './state/hud-state.svelte';
  import HudPanel from './primitives/HudPanel.svelte';
  import Icon from './primitives/Icon.svelte';
</script>

<HudPanel title="Overlay Legend" class="w-60" onClose={() => (hud.panels.legend = false)}>
  <ul class="px-3 py-2">
    {#each hud.overlays as ov (ov.key)}
      <li>
        <Checkbox.Root
          checked={ov.on}
          onCheckedChange={(d) => hud.setOverlay(ov.key, d.checked === true)}
          class="group flex h-8 w-full cursor-pointer items-center gap-2.5 px-1 transition-colors hover:bg-hull-2/50"
        >
          <Checkbox.Control
            class="grid size-4 flex-none place-items-center ring-1 ring-gold-1/70 transition-colors
              ring-inset group-hover:ring-gold-2
              data-[state=checked]:bg-teal-0/60 data-[state=checked]:ring-teal-1"
            style="clip-path: polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)"
          >
            <Checkbox.Indicator class="text-teal-2">
              <span class="block size-1.5 rotate-45 bg-current shadow-glow-teal"></span>
            </Checkbox.Indicator>
          </Checkbox.Control>
          <Checkbox.Label class="hud-label flex-1 cursor-pointer text-[10px] text-text-dim">
            {ov.label}
          </Checkbox.Label>

          <!-- legend glyph -->
          <span class="flex w-12 flex-none items-center justify-end text-gold-1" aria-hidden="true">
            {#if ov.glyph === 'swatch'}
              <span class="h-2.5 w-7 bg-gradient-to-r from-teal-0 to-teal-1/60 ring-1 ring-teal-1/50"></span>
            {:else if ov.glyph === 'dash'}
              <svg width="34" height="6" viewBox="0 0 34 6"><line x1="0" y1="3" x2="34" y2="3" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 3" /></svg>
            {:else if ov.glyph === 'gradient'}
              <span class="h-2.5 w-7 bg-gradient-to-r from-teal-1 to-amber-2"></span>
            {:else if ov.glyph === 'dots'}
              <svg width="34" height="6" viewBox="0 0 34 6"><line x1="0" y1="3" x2="34" y2="3" stroke="currentColor" stroke-width="1.6" stroke-dasharray="1 4" stroke-linecap="round" /></svg>
            {:else if ov.glyph === 'lane'}
              <svg width="34" height="8" viewBox="0 0 34 8"><line x1="0" y1="4" x2="26" y2="4" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3" /><path d="m26 1 5 3-5 3Z" fill="currentColor" /></svg>
            {:else if ov.glyph === 'link'}
              <svg width="34" height="8" viewBox="0 0 34 8"><circle cx="4" cy="4" r="2" fill="currentColor" /><line x1="7" y1="4" x2="27" y2="4" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 3" /><circle cx="30" cy="4" r="2" fill="none" stroke="currentColor" /></svg>
            {:else if ov.glyph === 'reticle'}
              <Icon name="order" size={12} />
            {:else if ov.glyph === 'startype'}
              <Icon name="sun" size={12} />
            {:else}
              <Icon name="bookmark" size={11} />
            {/if}
          </span>
          <Checkbox.HiddenInput />
        </Checkbox.Root>
      </li>
    {/each}
  </ul>
</HudPanel>
