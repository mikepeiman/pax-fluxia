<script lang="ts">
  import PanelSection from './PanelSection.svelte';

  export let selectedStar: any = undefined;

  export let starBreakdown = [
    { icon: '✦', label: 'Production', value: 7, tone: 'text-amber-200' },
    { icon: '☼', label: 'Capital', value: 5, tone: 'text-amber-100' },
    { icon: '◆', label: 'Relay', value: 3, tone: 'text-cyan-200' },
    { icon: '◉', label: 'Intel', value: 2, tone: 'text-sky-200' },
    { icon: '⬢', label: 'Veil', value: 1, tone: 'text-fuchsia-200' }
  ];

  export let fleets = [
    { icon: '▲', label: 'Active', value: 6, tone: 'text-cyan-200' },
    { icon: '⌁', label: 'Queued', value: 2, tone: 'text-amber-200' },
    { icon: '⊘', label: 'Blocked', value: 0, tone: 'text-red-300' }
  ];

  export let economy = [
    { icon: '⬢', label: 'Flux', delta: '+42 / turn', value: 312, tone: 'text-cyan-200' },
    { icon: '✹', label: 'Influence', delta: '+28 / turn', value: 186, tone: 'text-amber-200' },
    { icon: '◆', label: 'Intelligence', delta: '+16 / turn', value: 94, tone: 'text-fuchsia-200' }
  ];

  export let victory = [
    { icon: '❖', label: 'Luminara', value: 42, tone: 'bg-cyan-300/70 text-cyan-100' },
    { icon: '✹', label: 'Vaelari', value: 38, tone: 'bg-amber-300/70 text-amber-100' },
    { icon: '◆', label: 'Umbra', value: 15, tone: 'bg-fuchsia-300/70 text-fuchsia-100' }
  ];
</script>

<div class="space-y-3">
  <PanelSection title="Selected Star" subtitle="Current inspection target" defaultOpen={true}>
    <div class="rounded-xl border border-cyan-200/18 bg-cyan-300/8 p-3">
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="text-sm font-bold text-cyan-50">{selectedStar?.name ?? 'No Star Selected'}</div>
          <div class="mt-1 text-[11px] text-slate-300/75">{selectedStar?.owner ?? 'Select a star to inspect.'}</div>
        </div>
        <div class="grid h-10 w-10 place-items-center rounded-full border border-cyan-200/35 bg-black/30 text-cyan-100">{selectedStar?.icon ?? '✦'}</div>
      </div>
    </div>
  </PanelSection>

  <PanelSection title="Stars" defaultOpen={true}>
    <div class="grid grid-cols-2 gap-2">
      {#each starBreakdown as item}
        <div class="flex items-center justify-between rounded-lg border border-amber-300/12 bg-black/18 px-2 py-1.5 text-xs">
          <span class="flex items-center gap-2 text-slate-300"><span class={item.tone}>{item.icon}</span>{item.label}</span>
          <strong class="text-amber-50">{item.value}</strong>
        </div>
      {/each}
    </div>
  </PanelSection>

  <PanelSection title="Fleets" defaultOpen={true}>
    <div class="grid grid-cols-3 gap-2">
      {#each fleets as item}
        <div class="rounded-lg border border-amber-300/12 bg-black/18 px-2 py-2 text-center text-xs">
          <div class={`text-base ${item.tone}`}>{item.icon}</div>
          <div class="mt-1 text-lg font-bold text-amber-50">{item.value}</div>
          <div class="text-[10px] text-slate-300/65">{item.label}</div>
        </div>
      {/each}
    </div>
  </PanelSection>

  <PanelSection title="Economy" defaultOpen={true}>
    <div class="space-y-2">
      {#each economy as item}
        <div class="flex items-center justify-between gap-3 rounded-lg border border-amber-300/12 bg-black/18 px-2 py-2 text-xs">
          <span class="flex min-w-0 items-center gap-2 text-slate-300"><span class={item.tone}>{item.icon}</span>{item.label}</span>
          <span class="text-cyan-100/80">{item.delta}</span>
          <strong class="text-amber-100">{item.value}</strong>
        </div>
      {/each}
    </div>
  </PanelSection>

  <PanelSection title="Victory Progress" defaultOpen={true}>
    <div class="space-y-2">
      {#each victory as item}
        <div class="grid grid-cols-[1.5rem_1fr_3rem] items-center gap-2 text-xs">
          <span class={item.tone.replace('bg-', 'text-').split(' ')[1] ?? 'text-amber-100'}>{item.icon}</span>
          <div class="h-2 overflow-hidden rounded-full bg-black/40">
            <div class={`h-full rounded-full ${item.tone.split(' ')[0]}`} style={`width:${item.value}%`}></div>
          </div>
          <span class="text-right text-amber-100">{item.value} / 100</span>
        </div>
      {/each}
    </div>
  </PanelSection>
</div>
