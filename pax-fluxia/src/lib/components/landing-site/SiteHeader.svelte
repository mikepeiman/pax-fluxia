<script lang="ts">
  import { page } from "$app/stores";
  import SiteMark from "./SiteMark.svelte";
  import { NAV_LINKS } from "./content";
  import { goToGame } from "$lib/site/play";

  // Shared marketing nav. `onPlay` is supplied by the home route (which hosts
  // the game shell inline); other pages fall back to goToGame().
  let { onPlay }: { onPlay?: () => void } = $props();

  let scrolled = $state(false);
  let menuOpen = $state(false);

  function play() {
    (onPlay ?? goToGame)();
    menuOpen = false;
  }

  function handleScroll() {
    scrolled = window.scrollY > 24;
  }

  $effect(() => {
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  });

  const pathname = $derived($page.url.pathname);
</script>

<header class="hdr" class:scrolled class:menu-open={menuOpen}>
  <div class="hdr-inner site-shell--wide">
    <a class="brand" href="/" aria-label="Pax Fluxia — home" onclick={() => (menuOpen = false)}>
      <SiteMark size={30} />
      <span class="brand-text">Pax Fluxia</span>
    </a>

    <nav class="links" aria-label="Primary">
      {#each NAV_LINKS as link}
        <a
          href={link.href}
          class="link"
          class:active={pathname === link.href}>
          {link.label}
        </a>
      {/each}
    </nav>

    <div class="actions">
      <button class="site-btn site-btn--primary play-btn" onclick={play}>
        Play the Alpha
      </button>
      <button
        class="menu-toggle"
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
        onclick={() => (menuOpen = !menuOpen)}>
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>

  {#if menuOpen}
    <div class="mobile-menu">
      {#each NAV_LINKS as link}
        <a
          href={link.href}
          class="mobile-link"
          class:active={pathname === link.href}
          onclick={() => (menuOpen = false)}>
          {link.label}
        </a>
      {/each}
      <button class="site-btn site-btn--primary site-btn--lg" onclick={play}>
        Play the Alpha
      </button>
    </div>
  {/if}
</header>

<style>
  .hdr {
    position: fixed;
    inset: 0 0 auto 0;
    z-index: 1000;
    transition:
      background 0.3s ease,
      border-color 0.3s ease,
      backdrop-filter 0.3s ease;
    border-bottom: 1px solid transparent;
  }
  .hdr.scrolled {
    background: rgba(5, 8, 18, 0.82);
    backdrop-filter: blur(14px);
    border-bottom-color: var(--site-hairline);
  }
  .hdr.menu-open {
    background: rgba(5, 8, 18, 0.98);
    backdrop-filter: blur(18px);
    border-bottom-color: var(--site-hairline);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
  }

  .hdr-inner {
    height: var(--site-header-h);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 0.65rem;
    text-decoration: none;
  }
  .brand-text {
    font-family: var(--site-font-brand);
    font-weight: 700;
    font-size: 1.32rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--site-ink);
  }

  .links {
    display: flex;
    gap: 2rem;
    margin-left: auto;
    margin-right: 0.5rem;
  }
  .link {
    position: relative;
    font-family: var(--site-font-display);
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--site-ink-soft);
    text-decoration: none;
    transition: color 0.2s ease;
  }
  .link::after {
    content: "";
    position: absolute;
    left: 0;
    bottom: -6px;
    width: 100%;
    height: 2px;
    background: var(--site-flow);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.22s ease;
  }
  .link:hover {
    color: var(--site-ink);
  }
  .link:hover::after,
  .link.active::after {
    transform: scaleX(1);
  }
  .link.active {
    color: var(--site-cyan-bright);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .menu-toggle {
    display: none;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    width: 42px;
    height: 42px;
    padding: 0 9px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--site-hairline-strong);
    border-radius: 10px;
    cursor: pointer;
  }
  .menu-toggle span {
    display: block;
    height: 2px;
    background: var(--site-ink);
    border-radius: 2px;
  }

  .mobile-menu {
    display: none;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.6rem clamp(1.2rem, 4vw, 2.5rem) 1.4rem;
  }
  .mobile-link {
    padding: 0.85rem 0.4rem;
    font-family: var(--site-font-display);
    font-size: 1.05rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--site-ink-soft);
    text-decoration: none;
    border-bottom: 1px solid var(--site-hairline);
  }
  .mobile-link.active {
    color: var(--site-cyan-bright);
  }
  .mobile-menu .site-btn {
    margin-top: 0.8rem;
  }

  @media (max-width: 860px) {
    .links,
    .play-btn {
      display: none;
    }
    .menu-toggle {
      display: flex;
    }
    .menu-open .mobile-menu {
      display: flex;
    }
  }
</style>
