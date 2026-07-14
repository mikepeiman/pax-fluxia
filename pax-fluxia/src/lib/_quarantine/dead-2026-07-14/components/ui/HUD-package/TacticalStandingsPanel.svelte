<script lang="ts">
  export let standings: Array<{ rank: number; faction: string; score: number | string; icon: string; tone?: string }> = [];

  const toneClass: Record<string, string> = {
    cyan: 'border-cyan-300/28 bg-cyan-300/10 text-cyan-100',
    amber: 'border-amber-300/28 bg-amber-300/10 text-amber-100',
    fuchsia: 'border-fuchsia-300/28 bg-fuchsia-300/10 text-fuchsia-100',
    slate: 'border-slate-300/20 bg-slate-300/8 text-slate-100',
    emerald: 'border-emerald-300/28 bg-emerald-300/10 text-emerald-100'
  };
</script>

<div class="space-y-2">
  {#each standings as row}
    <button
      type="button"
      class={`grid w-full grid-cols-[2rem_2rem_1fr_auto] items-center gap-2 rounded-lg border px-2 py-2 text-left text-xs transition hover:border-cyan-200/50 ${toneClass[row.tone ?? 'slate']}`}
    >
      <span class="text-slate-300/80">{row.rank}</span>
      <span class="grid h-6 w-6 place-items-center rounded-full border border-current/25 bg-black/20">{row.icon}</span>
      <span class="truncate font-semibold">{row.faction}</span>
      <strong class="text-amber-50">{row.score}</strong>
    </button>
  {/each}
</div>
