<script lang="ts">
  export let tabs: Array<{ id: string, label: string }>;
  export let activeTabId: string;

  function setActive(id: string) {
    activeTabId = id;
  }
</script>

<div class="tabs-container">
  {#each tabs as tab}
    <button
      type="button"
      class="tab {activeTabId === tab.id ? 'active' : ''}"
      on:click={() => setActive(tab.id)}
      role="tab"
    >
      {tab.label}
    </button>
  {/each}
</div>

<style>
  .tabs-container {
    display: flex;
    justify-content: flex-start;
    gap: 10px;
    margin-bottom: 20px;
  }

  .tab {
    background: transparent;
    color: #888;
    border: none;
    padding: 10px 20px;
    font-size: 1rem;
    font-family: var(--font-main);
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
    border-bottom: 2px solid transparent;
  }

  .tab:hover {
    color: #fff;
    text-shadow: 0 0 5px rgba(255, 255, 255, 0.3);
  }

  .tab.active {
    color: var(--primary-color);
    border-bottom: 2px solid var(--primary-color);
    text-shadow: 0 0 10px var(--primary-color);
    transform: scale(1.05);
  }
</style>
