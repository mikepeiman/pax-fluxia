<script lang="ts">
  import Header from '$lib/components/Header.svelte';
  import GameSetup from '$lib/components/GameSetup.svelte';
  import OpponentsPanel from '$lib/components/OpponentsPanel.svelte';
  import Tabs from '$lib/components/Tabs.svelte';

  let activeTab = 'setup';
  const mobileTabs = [
    { id: 'setup', label: 'Single Player' }, // Or Game Setup
    { id: 'opponents', label: 'Multiplayer' } // Or Opponents
  ];

  function handleTabChange(id: string) {
    activeTab = id;
  }
</script>

<div class="app-container">
  <Header />

  <main class="main-content">
    <!-- Desktop Layout -->
    <div class="desktop-layout">
      <div class="panel-wrapper setup-panel">
        <GameSetup />
      </div>
      <div class="panel-wrapper opponents-panel">
        <OpponentsPanel />
      </div>
    </div>

    <!-- Mobile Layout -->
    <div class="mobile-layout">
      <Tabs tabs={mobileTabs} bind:activeTabId={activeTab} />
      
      <div class="mobile-content">
        {#if activeTab === 'setup'}
          <GameSetup />
        {:else}
          <OpponentsPanel isMobile={true} />
        {/if}
      </div>
    </div>
  </main>
</div>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  .main-content {
    flex: 1;
    padding: 20px;
    overflow: hidden;
    position: relative;
    max-width: 1600px;
    margin: 0 auto;
    width: 100%;
  }

  /* Desktop Styles */
  .desktop-layout {
    display: none;
    grid-template-columns: 2fr 1fr;
    gap: 20px;
    height: 100%;
  }

  .panel-wrapper {
    height: 100%;
    overflow: hidden;
  }

  @media (min-width: 769px) {
    .desktop-layout {
      display: grid;
    }
    
    .mobile-layout {
      display: none;
    }
  }

  /* Mobile Styles */
  .mobile-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .mobile-content {
    flex: 1;
    overflow-y: auto;
    padding-bottom: 20px;
  }

  @media (max-width: 768px) {
    .main-content {
      padding: 10px;
    }
  }
</style>
