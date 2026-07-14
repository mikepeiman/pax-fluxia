<script lang="ts">
  export let events: Array<{ time: string; icon: string; text: string; tone?: string }> = [];

  const toneClass: Record<string, string> = {
    cyan: 'text-cyan-200',
    amber: 'text-amber-200',
    fuchsia: 'text-fuchsia-200',
    slate: 'text-slate-300',
    emerald: 'text-emerald-200'
  };
</script>

<div class="space-y-2">
  {#each events as event}
    <button type="button" class="grid w-full grid-cols-[3rem_1.25rem_1fr] gap-2 rounded-lg border border-amber-300/10 bg-black/18 px-2 py-2 text-left text-[11px] text-slate-300/80 transition hover:border-cyan-200/30 hover:text-cyan-50">
      <span class="text-slate-400">{event.time}</span>
      <span class={toneClass[event.tone ?? 'slate']}>{event.icon}</span>
      <span>{event.text}</span>
    </button>
  {/each}
</div>
