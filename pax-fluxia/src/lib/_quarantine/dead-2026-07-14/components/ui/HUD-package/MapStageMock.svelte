<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  type Tone = 'cyan' | 'amber' | 'fuchsia' | 'slate' | 'emerald';

  export let nodes: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    owner: string;
    icon: string;
    tone: Tone;
    pips?: number;
  }> = [];

  export let lanes: Array<{
    id: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    kind: 'friendly' | 'enemy' | 'active' | 'contested' | 'neutral';
  }> = [];

  export let selectedStarId = '';
  export let showLabels = true;
  export let showLanes = true;

  const dispatch = createEventDispatcher();

  const nodeClass: Record<Tone, string> = {
    cyan: 'border-cyan-300/80 bg-cyan-400/12 text-cyan-50 shadow-cyan-400/35',
    amber: 'border-amber-300/80 bg-amber-400/12 text-amber-50 shadow-amber-400/35',
    fuchsia: 'border-fuchsia-300/75 bg-fuchsia-400/12 text-fuchsia-50 shadow-fuchsia-400/35',
    slate: 'border-slate-300/60 bg-slate-400/10 text-slate-50 shadow-slate-400/20',
    emerald: 'border-emerald-300/75 bg-emerald-400/12 text-emerald-50 shadow-emerald-400/30'
  };

  const pipClass: Record<Tone, string> = {
    cyan: 'bg-cyan-200/80',
    amber: 'bg-amber-200/80',
    fuchsia: 'bg-fuchsia-200/80',
    slate: 'bg-slate-200/70',
    emerald: 'bg-emerald-200/80'
  };

  function laneClass(kind: string) {
    if (kind === 'active') return 'stroke-cyan-200/90';
    if (kind === 'enemy') return 'stroke-amber-300/55';
    if (kind === 'contested') return 'stroke-fuchsia-300/65';
    if (kind === 'neutral') return 'stroke-slate-300/35';
    return 'stroke-cyan-300/38';
  }

  function dashFor(kind: string) {
    if (kind === 'active') return '1.25 0.85';
    if (kind === 'contested') return '0.8 0.8';
    return '0';
  }
</script>

<div class="map-root h-full w-full overflow-hidden bg-[radial-gradient(circle_at_22%_52%,rgba(20,184,166,0.34),transparent_34%),radial-gradient(circle_at_73%_44%,rgba(245,158,11,0.30),transparent_35%),radial-gradient(circle_at_70%_76%,rgba(168,85,247,0.22),transparent_30%),linear-gradient(120deg,#020617,#071217_52%,#090611)]">
  <div class="absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.9)_0_1px,transparent_1.5px)] [background-size:42px_42px]"></div>
  <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(2,6,23,0.2)_54%,rgba(2,6,23,0.92)_100%)]"></div>

  <div class="territory-blob left-[-5%] top-[4%] h-[82%] w-[60%] border-cyan-300/35 bg-cyan-400/8"></div>
  <div class="territory-blob right-[-4%] top-[10%] h-[72%] w-[50%] border-amber-300/35 bg-amber-400/9"></div>
  <div class="territory-blob right-[8%] bottom-[-16%] h-[42%] w-[42%] border-fuchsia-300/30 bg-fuchsia-400/8"></div>

  {#if showLanes}
    <svg class="map-lanes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {#each lanes as lane}
        <line
          x1={lane.x1}
          y1={lane.y1}
          x2={lane.x2}
          y2={lane.y2}
          class={laneClass(lane.kind)}
          stroke-width={lane.kind === 'active' ? '0.52' : '0.32'}
          stroke-linecap="round"
          stroke-dasharray={dashFor(lane.kind)}
        />
      {/each}
    </svg>
  {/if}

  <div class="region-label left-[8%] top-[52%] text-cyan-300/35">LUMINARA<br />ACCORD</div>
  <div class="region-label right-[8%] top-[57%] text-amber-300/35">VAELARI<br />COMBINE</div>

  {#each nodes as node}
    <button
      type="button"
      class={`map-node group ${node.id === selectedStarId ? 'z-30' : 'z-20'}`}
      style={`left:${node.x}%;top:${node.y}%;`}
      aria-label={`Select ${node.name}`}
      on:click={() => dispatch('select-star', { id: node.id })}
    >
      <span
        class={`grid h-12 w-12 place-items-center rounded-full border bg-slate-950/72 text-xl shadow-xl backdrop-blur-md transition group-hover:scale-110 ${nodeClass[node.tone]} ${node.id === selectedStarId ? 'ring-4 ring-cyan-300/25' : ''}`}
      >
        {node.icon}
      </span>
      {#if showLabels}
        <span class="mt-1 block text-center text-[11px] font-semibold uppercase tracking-wide text-slate-100 drop-shadow">
          {node.name}
        </span>
      {/if}
      <span class="mt-0.5 flex justify-center gap-1">
        {#each Array(node.pips ?? 0) as _}
          <span class={`h-1.5 w-1.5 rounded-full ${pipClass[node.tone]}`}></span>
        {/each}
      </span>
    </button>
  {/each}
</div>

<style>
  .map-root {
    position: relative;
  }

  .map-lanes {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 0 0.6rem rgb(34 211 238 / 0.25));
  }

  .map-node {
    position: absolute;
    transform: translate(-50%, -50%);
  }

  .region-label {
    position: absolute;
    font-size: clamp(1.2rem, 2.1vw, 2.2rem);
    font-weight: var(--pax-weight-extrabold);
    letter-spacing: 0.08em;
    line-height: 1.05;
    text-shadow: 0 0 2rem currentColor;
    user-select: none;
  }

  .territory-blob {
    position: absolute;
    border-width: 1px;
    border-style: solid;
    border-radius: 42% 58% 50% 50% / 44% 35% 65% 56%;
    filter: blur(0.1px) drop-shadow(0 0 2rem currentColor);
  }
</style>
