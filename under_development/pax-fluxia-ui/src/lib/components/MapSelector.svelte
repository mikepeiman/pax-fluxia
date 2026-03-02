<script lang="ts">
  export let maps: Array<{ id: string, name: string, image: string }>;
  export let selectedMapId: string;

  function selectMap(id: string) {
    selectedMapId = id;
  }
</script>

<div class="map-grid">
  {#each maps as map}
    <button
      type="button"
      class="map-option {selectedMapId === map.id ? 'selected' : ''}"
      on:click={() => selectMap(map.id)}
      aria-label="Select {map.name}"
    >
      <img src={map.image} alt={map.name} />
      <div class="map-name">{map.name}</div>
    </button>
  {/each}
</div>

<style>
  .map-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 10px;
    padding: 10px;
  }

  .map-option {
    background: transparent;
    border: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    overflow: hidden;
    position: relative;
    transition: all 0.2s;
    padding: 2px;
  }

  .map-option.selected {
    border-color: var(--primary-color);
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.4);
    transform: scale(1.05);
  }
  
  .map-option img {
    width: 100%;
    height: 60px;
    object-fit: cover;
    border-radius: 4px;
    display: block;
  }

  .map-name {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    font-size: 0.6rem;
    padding: 2px;
    text-align: center;
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  .map-option:hover .map-name {
    opacity: 1;
  }
</style>
