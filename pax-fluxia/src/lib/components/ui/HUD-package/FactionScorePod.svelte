<script lang="ts">
  type Tone = 'cyan' | 'amber' | 'fuchsia' | 'slate' | 'emerald';

  export let faction = {
    name: 'Luminara Accord',
    subtitle: '+2.6 / s',
    score: 42 as string | number,
    icon: '❖',
    metric: '62%',
    progress: 62,
    tone: 'cyan' as Tone
  };
  export let side: 'left' | 'right' = 'left';

  const toneClass: Record<Tone, string> = {
    cyan: 'border-cyan-300/35 bg-cyan-400/10 text-cyan-100 shadow-cyan-500/20',
    amber: 'border-amber-300/35 bg-amber-400/10 text-amber-100 shadow-amber-500/20',
    fuchsia: 'border-fuchsia-300/35 bg-fuchsia-400/10 text-fuchsia-100 shadow-fuchsia-500/20',
    slate: 'border-slate-300/30 bg-slate-300/10 text-slate-100 shadow-slate-500/10',
    emerald: 'border-emerald-300/35 bg-emerald-400/10 text-emerald-100 shadow-emerald-500/20'
  };

  const barClass: Record<Tone, string> = {
    cyan: 'bg-cyan-300/75',
    amber: 'bg-amber-300/75',
    fuchsia: 'bg-fuchsia-300/75',
    slate: 'bg-slate-300/65',
    emerald: 'bg-emerald-300/75'
  };

  $: tone = faction.tone ?? 'cyan';
</script>

<div class={`min-w-0 rounded-2xl border px-3 py-2 shadow-lg backdrop-blur-md ${toneClass[tone]}`}>
  <div class={`flex items-center gap-3 ${side === 'right' ? 'justify-end text-right' : ''}`}>
    {#if side === 'left'}
      <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-current/25 bg-black/20 text-xl">{faction.icon}</span>
    {/if}

    <div class="min-w-0 flex-1">
      <div class="truncate text-sm font-bold tracking-wide">{faction.name}</div>
      <div class="mt-0.5 flex items-center gap-2 text-[11px] opacity-75 {side === 'right' ? 'justify-end' : ''}">
        {#if faction.metric}<span>{faction.metric}</span>{/if}
        {#if faction.subtitle}<span>{faction.subtitle}</span>{/if}
      </div>
    </div>

    <strong class="shrink-0 text-3xl leading-none text-amber-50">{faction.score}</strong>

    {#if side === 'right'}
      <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-current/25 bg-black/20 text-xl">{faction.icon}</span>
    {/if}
  </div>

  {#if faction.progress !== undefined}
    <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-black/30">
      <div class={`h-full rounded-full ${barClass[tone]}`} style={`width:${Math.max(0, Math.min(100, faction.progress))}%`}></div>
    </div>
  {/if}
</div>
