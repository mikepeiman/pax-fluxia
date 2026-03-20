<script lang="ts">
  import { fade, fly } from 'svelte/transition';

  type FeatureTabId = 'visible' | 'attrition' | 'pinning' | 'overwhelm';
  type FeatureTab = { id: FeatureTabId; label: string; color: string };
  type FeatureContent = { title: string; desc: string; color: string };

  let activeTab = $state<FeatureTabId>('visible');

  const tabs: FeatureTab[] = [
    { id: 'visible', label: 'VISIBLE STRATEGY', color: 'var(--color-accent-cyan)' },
    { id: 'attrition', label: 'ATTRITION', color: 'var(--color-accent-red)' },
    { id: 'pinning', label: 'PINNING', color: 'var(--color-accent-yellow)' },
    { id: 'overwhelm', label: 'OVERWHELM', color: 'var(--color-player-purple)' }
  ];

  const content: Record<FeatureTabId, FeatureContent> = {
    visible: {
      title: 'Visible Strategy, Critical Decisions',
      desc: "Every ship is a visible dot. Every flow is a river of force. You don't need a spreadsheet to understand the battle-just look at the screen. The thickness of the flow tells you everything.",
      color: 'var(--color-accent-cyan)'
    },
    attrition: {
      title: 'Symmetric Attrition',
      desc: 'Both attacker and defender take simultaneous damage each tick. Every assault has a cost. There are no free wins; you spend your fleet to destroy theirs.',
      color: 'var(--color-accent-red)'
    },
    pinning: {
      title: 'Pinning Mechanic',
      desc: "Suppress a defender's repair rate by 90% with even a single attacking ship. This enables complex multi-front sieges where a small force can pin a star while the main fleet strikes elsewhere.",
      color: 'var(--color-accent-yellow)'
    },
    overwhelm: {
      title: 'Overwhelm Surrender',
      desc: 'Achieve massive force advantage to trigger immediate conquest without combat rolls. If you outnumber them 10 to 1, they surrender instantly. Speed matters.',
      color: 'var(--color-player-purple)'
    }
  };
</script>

<section class="feature-deep-dive">
  <div class="container">
    <div class="tabs">
      {#each tabs as tab}
        <button 
          class="tab-btn" 
          class:active={activeTab === tab.id}
          style="--accent-color: {tab.color}"
          onclick={() => activeTab = tab.id}
        >
          {tab.label}
        </button>
      {/each}
    </div>

    <div class="content-panel glass-panel">
      <div class="visual">
        <div class="visual-placeholder" style="border-color: {content[activeTab].color}">
          <div class="scanline"></div>
          <div class="overlay-text font-display">
            {activeTab.toUpperCase()} PROTOCOL ACTIVE
          </div>
        </div>
      </div>

      <div class="text-content">
        {#key activeTab}
          <div in:fly={{ y: 20, duration: 300 }} out:fade>
            <h2 class="section-title font-display" style="color: {content[activeTab].color}">
              {content[activeTab].title}
            </h2>
            <p class="section-desc font-body">
              {content[activeTab].desc}
            </p>
          </div>
        {/key}
      </div>
    </div>
  </div>
</section>

<style>
  .feature-deep-dive {
    padding: var(--space-12) var(--space-8);
    background-color: var(--color-void-deep);
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .tabs {
    display: flex;
    gap: var(--space-4);
    margin-bottom: var(--space-8);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .tab-btn {
    background: transparent;
    border: none;
    padding: var(--space-4) var(--space-6);
    color: var(--color-text-muted);
    font-family: var(--font-display);
    font-weight: 700;
    cursor: pointer;
    position: relative;
    transition: color 0.2s;
  }

  .tab-btn:hover {
    color: var(--color-text-primary);
  }

  .tab-btn.active {
    color: var(--accent-color, var(--color-accent-cyan));
  }

  .tab-btn.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 100%;
    height: 3px;
    background: var(--accent-color, var(--color-accent-cyan));
    box-shadow: 0 -5px 15px var(--accent-color, var(--color-accent-cyan));
  }

  .content-panel {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-8);
    padding: var(--space-8);
    align-items: center;
  }

  .visual {
    width: 100%;
    aspect-ratio: 16/9;
    background: #000;
    border-radius: var(--radius-md);
    overflow: hidden;
    position: relative;
  }

  .visual-placeholder {
    width: 100%;
    height: 100%;
    border: 1px solid;
    display: flex;
    align-items: center;
    justify-content: center;
    background: 
      linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)),
      url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm1 1h38v38H1V1z' fill='%23222' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E");
    position: relative;
  }

  .scanline {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 5px;
    background: rgba(255, 255, 255, 0.1);
    opacity: 0.5;
    animation: scan 3s linear infinite;
  }

  .overlay-text {
    font-size: 1.5rem;
    letter-spacing: 0.1em;
    color: rgba(255, 255, 255, 0.7);
    text-shadow: 0 0 10px currentColor;
  }

  .section-title {
    font-size: 2.5rem;
    margin-bottom: var(--space-4);
  }

  .section-desc {
    font-size: 1.1rem;
    line-height: 1.6;
    color: var(--color-text-muted);
  }

  @keyframes scan {
    0% { top: 0%; }
    100% { top: 100%; }
  }

  @media (max-width: 768px) {
    .content-panel {
      grid-template-columns: 1fr;
    }
    .tabs {
      overflow-x: auto;
      padding-bottom: var(--space-2);
    }
  }
</style>
