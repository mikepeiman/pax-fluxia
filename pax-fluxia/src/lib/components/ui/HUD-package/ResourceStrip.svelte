<script lang="ts">
  export let resources: Array<{ icon: string; label: string; value: string | number }> = [];
  export let compact = false;
</script>

<div class={`flex items-center gap-2 rounded-2xl border border-amber-300/16 bg-black/24 ${compact ? 'px-2 py-1.5' : 'px-3 py-2'}`}>
  {#each resources as item}
    <div class="flex items-center gap-2 rounded-lg px-2 py-1 text-xs text-slate-300">
      <span class="text-amber-200">{item.icon}</span>
      {#if !compact}<span>{item.label}</span>{/if}
      <strong class="text-amber-50">{item.value}</strong>
    </div>
  {/each}
</div>
