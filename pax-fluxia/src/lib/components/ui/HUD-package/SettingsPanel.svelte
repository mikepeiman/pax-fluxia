<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import PanelSection from './PanelSection.svelte';

  const dispatch = createEventDispatcher();

  export let visualSettings = [
    { id: 'glow', label: 'Glow', value: 75, suffix: '%' },
    { id: 'particles', label: 'Particles', value: 60, suffix: '%' },
    { id: 'streamers', label: 'Streamers', value: 80, suffix: '%' }
  ];

  export let interfaceSettings = [
    { id: 'zoomSensitivity', label: 'Zoom Sensitivity', value: 100, suffix: '%' },
    { id: 'uiScale', label: 'UI Scale', value: 100, suffix: '%' }
  ];

  export let audioSettings = [
    { id: 'music', label: 'Music', value: 70, suffix: '%' },
    { id: 'sfx', label: 'SFX', value: 80, suffix: '%' }
  ];

  export let switches = [
    { id: 'screenShake', label: 'Screen Shake', enabled: false },
    { id: 'reducedMotion', label: 'Reduced Motion', enabled: false },
    { id: 'highContrast', label: 'High Contrast HUD', enabled: false }
  ];

  function dispatchSlider(id: string, event: Event) {
    const value = Number((event.currentTarget as HTMLInputElement).value);
    dispatch('setting-change', { id, value });
  }

  function toggleSwitch(id: string) {
    switches = switches.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item));
    dispatch('setting-change', { id, value: switches.find((item) => item.id === id)?.enabled });
  }
</script>

<div class="space-y-3">
  <PanelSection title="Appearance" subtitle="Theme-side visual intensity" defaultOpen={true}>
    <div class="space-y-3">
      {#each visualSettings as setting}
        <label class="grid gap-1 text-xs text-slate-300">
          <span class="flex items-center justify-between">
            <span>{setting.label}</span>
            <span class="text-cyan-100">{setting.value}{setting.suffix}</span>
          </span>
          <input class="w-full accent-cyan-300" type="range" min="0" max="100" bind:value={setting.value} on:input={(event) => dispatchSlider(setting.id, event)} />
        </label>
      {/each}
    </div>
  </PanelSection>

  <PanelSection title="Interface" defaultOpen={true}>
    <div class="space-y-3">
      {#each interfaceSettings as setting}
        <label class="grid gap-1 text-xs text-slate-300">
          <span class="flex items-center justify-between">
            <span>{setting.label}</span>
            <span class="text-cyan-100">{setting.value}{setting.suffix}</span>
          </span>
          <input class="w-full accent-cyan-300" type="range" min="50" max="150" bind:value={setting.value} on:input={(event) => dispatchSlider(setting.id, event)} />
        </label>
      {/each}

      <div class="space-y-2 pt-1">
        {#each switches as item}
          <button
            type="button"
            class="flex w-full items-center justify-between rounded-lg border border-amber-300/14 bg-black/20 px-3 py-2 text-xs text-slate-300 hover:border-cyan-200/35"
            aria-pressed={item.enabled}
            on:click={() => toggleSwitch(item.id)}
          >
            <span>{item.label}</span>
            <span class={`h-5 w-9 rounded-full border p-0.5 transition ${item.enabled ? 'border-cyan-200/60 bg-cyan-300/25' : 'border-slate-500/40 bg-slate-900/80'}`}>
              <span class={`block h-3.5 w-3.5 rounded-full bg-current transition ${item.enabled ? 'translate-x-4 text-cyan-100' : 'text-slate-500'}`}></span>
            </span>
          </button>
        {/each}
      </div>
    </div>
  </PanelSection>

  <PanelSection title="Audio" defaultOpen={true}>
    <div class="space-y-3">
      {#each audioSettings as setting}
        <label class="grid gap-1 text-xs text-slate-300">
          <span class="flex items-center justify-between">
            <span>{setting.label}</span>
            <span class="text-cyan-100">{setting.value}{setting.suffix}</span>
          </span>
          <input class="w-full accent-amber-300" type="range" min="0" max="100" bind:value={setting.value} on:input={(event) => dispatchSlider(setting.id, event)} />
        </label>
      {/each}
    </div>
  </PanelSection>
</div>
