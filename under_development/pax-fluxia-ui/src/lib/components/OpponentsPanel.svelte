<script lang="ts">
  import Tabs from './Tabs.svelte';
  import Button from './Button.svelte';

  export let isMobile: boolean = false;

  const tabs = [
    { id: 'ai', label: 'AI' },
    { id: 'human', label: 'Human' }
  ];
  let activeTab = 'ai';

  const players = [
    { id: 1, name: 'Mike', type: 'human', color: '#00ffff' },
    { id: 2, name: 'AI Alpha', type: 'ai', color: '#ff00ff' },
    { id: 3, name: 'AI Beta', type: 'ai', color: '#ffff00' },
    { id: 4, name: 'AI Gamma', type: 'ai', color: '#00ff00' },
  ];

  function handleCreateRoom() {
    alert('Create Room');
  }

  function handleJoinRoom() {
    alert('Join Room');
  }
</script>

<div class="panel opponents-panel {isMobile ? 'mobile' : ''}">
  <h2>Opponents & Multiplayer</h2>
  
  <div class="tabs-wrapper">
    <Tabs {tabs} bind:activeTabId={activeTab} />
  </div>

  <div class="player-list">
    {#each players as player}
      <div class="player-item">
        <div class="avatar" style="background-color: {player.color}">
          <span>{player.name[0]}</span>
        </div>
        <div class="info">
          <span class="name">{player.name}</span>
          <span class="type">{player.type}</span>
        </div>
        <button class="options-btn" aria-label="Options">⋮</button>
      </div>
    {/each}
  </div>

  <div class="multiplayer-actions">
    <h3>Multiplayer</h3>
    <div class="buttons">
      <Button label="Create Room" onClick={handleCreateRoom} variant="secondary" fullWidth />
      <Button label="Join Room" onClick={handleJoinRoom} variant="secondary" fullWidth />
    </div>
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
    height: 100%;
    color: white;
  }

  h2 {
    margin-bottom: 20px;
    border-bottom: 1px solid rgba(0, 255, 255, 0.2);
    padding-bottom: 10px;
    font-size: 1.5rem;
    text-align: center;
  }

  .tabs-wrapper {
    margin-bottom: 15px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .player-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 20px;
    padding-right: 5px; /* for scrollbar */
  }
  
  /* Custom scrollbar */
  .player-list::-webkit-scrollbar {
    width: 6px;
  }
  
  .player-list::-webkit-scrollbar-track {
    background: rgba(0,0,0,0.3);
  }
  
  .player-list::-webkit-scrollbar-thumb {
    background: var(--primary-color);
    border-radius: 3px;
  }

  .player-item {
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.05);
    padding: 10px;
    border-radius: 8px;
    transition: background 0.2s;
  }

  .player-item:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: #000;
    margin-right: 15px;
    box-shadow: 0 0 5px currentColor;
  }

  .info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .name {
    font-weight: bold;
    font-size: 1rem;
  }

  .type {
    font-size: 0.8rem;
    color: #aaa;
    text-transform: uppercase;
  }

  .options-btn {
    background: none;
    border: none;
    color: white;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0 10px;
  }

  .multiplayer-actions {
    margin-top: auto;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 15px;
  }

  .multiplayer-actions h3 {
    font-size: 1rem;
    margin-bottom: 10px;
    color: var(--primary-color);
  }

  .buttons {
    display: flex;
    gap: 10px;
    flex-direction: column;
  }
</style>
