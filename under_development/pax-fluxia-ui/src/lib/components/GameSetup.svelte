<script lang="ts">
  import MapSelector from './MapSelector.svelte';
  import Slider from './Slider.svelte';
  import Button from './Button.svelte';

  // Dummy maps
  const maps = [
    { id: 'galaxy', name: 'Galaxy', image: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80' },
    { id: 'nebula', name: 'Nebula', image: 'https://images.unsplash.com/photo-1543722530-d2c3201371e7?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80' },
    { id: 'cluster', name: 'Cluster', image: 'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80' },
    { id: 'void', name: 'Void', image: 'https://images.unsplash.com/photo-1506318137071-a8bcbf6755dd?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80' },
    { id: 'spiral', name: 'Spiral', image: 'https://images.unsplash.com/photo-1465101162946-4377e57745c3?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80' },
  ];

  let selectedMap = maps[0].id;
  let links = 3;
  let spacing = 1.0;
  let stars = 10;
  let ships = 25;
  let tick = 1.25;
  let skips = 2; // For desktop specific or common

  function handleStart() {
    console.log('Start Game', { selectedMap, links, spacing, stars, ships, tick });
    alert('Game Started!');
  }
</script>

<div class="panel game-setup">
  <h2>Game Setup</h2>
  
  <div class="section map-section">
    <h3>Map</h3>
    <MapSelector {maps} bind:selectedMapId={selectedMap} />
  </div>

  <div class="section sliders-grid">
    <Slider label="Links" min={1} max={10} step={1} bind:value={links} unit="" />
    <Slider label="Spacing" min={0.5} max={3.0} step={0.1} bind:value={spacing} unit="x" />
    <Slider label="Stars" min={5} max={50} step={1} bind:value={stars} unit="" />
    <Slider label="Ships" min={10} max={100} step={5} bind:value={ships} unit="" />
    <Slider label="Skips" min={0} max={5} step={1} bind:value={skips} unit="" />
    <Slider label="Tick Duration" min={0.5} max={5.0} step={0.25} bind:value={tick} unit="s" />
  </div>

  <div class="actions">
    <Button label="Start Game" onClick={handleStart} fullWidth size="large" />
  </div>
</div>

<style>
  .panel {
    background: var(--panel-bg);
    border: 2px solid var(--border-color);
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(10px);
    display: flex;
    flex-direction: column;
    gap: 20px;
    height: 100%;
  }

  h2 {
    margin-bottom: 10px;
    border-bottom: 1px solid rgba(0, 255, 255, 0.2);
    padding-bottom: 10px;
    font-size: 1.5rem;
    text-align: center;
  }

  h3 {
    font-size: 1rem;
    color: #aaa;
    margin-bottom: 10px;
  }

  .sliders-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 15px;
  }

  @media (min-width: 768px) {
    .sliders-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  .actions {
    margin-top: auto;
    padding-top: 20px;
  }
</style>
