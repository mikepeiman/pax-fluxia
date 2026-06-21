<script lang="ts">
  import SiteMark from "./SiteMark.svelte";
  import Newsletter from "./Newsletter.svelte";
  import { SITE, NAV_LINKS } from "./content";

  const columns = [
    {
      title: "Game",
      links: [
        { label: "How it plays", href: "/game" },
        { label: "Devlog", href: "/devlog" },
        { label: "Press kit", href: "/press" },
      ],
    },
    {
      title: "Community",
      links: [
        { label: "Discord", href: SITE.discord },
        { label: "Get involved", href: "/community" },
        { label: "Report a bug", href: SITE.discord },
      ],
    },
    {
      title: "Studio",
      links: [
        { label: "About", href: "/about" },
        { label: "Contact", href: `mailto:${SITE.contactEmail}` },
        { label: "Press", href: `mailto:${SITE.pressEmail}` },
      ],
    },
  ];
</script>

<footer class="footer">
  <div class="footer-top site-shell--wide">
    <div class="brand-col">
      <a class="brand" href="/" aria-label="Pax Fluxia — home">
        <SiteMark size={34} />
        <span class="brand-text">Pax Fluxia</span>
      </a>
      <p class="tagline">
        A tick-based real-time strategy game of rivers, stars, and position.
        Made solo by {SITE.studio}.
      </p>
      <div class="social">
        <a
          class="social-btn"
          href={SITE.discord}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Join the Discord">
          <svg viewBox="0 0 127.14 96.36" width="20" height="20" fill="currentColor">
            <path
              d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83A97.68 97.68 0 0 0 49 6.83 72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21h0A105.73 105.73 0 0 0 32.71 96.36a77.7 77.7 0 0 0 6.89-11.1 88.05 88.05 0 0 1-11.19-5.3 65.59 65.59 0 0 0 2.22-1.63c22.19 10.3 46.16 10.3 68.18 0a61.1 61.1 0 0 0 2.22 1.63 87.05 87.05 0 0 1-11.23 5.3 75.92 75.92 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.15c2.61-26.47-3.95-49.88-21.18-72.14zM42.56 65.3c-5.36 0-9.8-4.9-9.8-10.96s4.35-10.96 9.8-10.96 9.89 4.9 9.8 10.96c0 6.06-4.35 10.96-9.8 10.96zm42.06 0c-5.36 0-9.8-4.9-9.8-10.96s4.35-10.96 9.8-10.96 9.89 4.9 9.8 10.96c0 6.06-4.35 10.96-9.8 10.96z" />
          </svg>
        </a>
        <a
          class="social-btn"
          href={`mailto:${SITE.contactEmail}`}
          aria-label="Email the studio">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
        </a>
      </div>
    </div>

    <div class="nav-cols">
      {#each columns as col}
        <div class="nav-col">
          <h4 class="col-title">{col.title}</h4>
          {#each col.links as link}
            <a
              class="col-link"
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}>
              {link.label}
            </a>
          {/each}
        </div>
      {/each}

      <div class="nav-col nav-col--wide">
        <h4 class="col-title">Get build drops</h4>
        <p class="col-note">
          Design notes and milestone releases. No spam — just the war room.
        </p>
        <Newsletter cta="Subscribe" compact />
      </div>
    </div>
  </div>

  <hr class="site-rule" />

  <div class="footer-bottom site-shell--wide">
    <p class="copy">
      © {SITE.copyrightYear} {SITE.studio}. All rights reserved.
    </p>
    <p class="made">
      Built with intent by
      <a href="https://x.com/mikepeiman" target="_blank" rel="noopener noreferrer"
        >{SITE.devHandle}</a
      >. An homage to {SITE.homageTitle} ({SITE.homageYear}).
    </p>
  </div>
</footer>

<style>
  .footer {
    position: relative;
    z-index: 1;
    background: linear-gradient(180deg, var(--site-void), #02040a);
    border-top: 1px solid var(--site-hairline);
    padding-top: clamp(3rem, 6vw, 5rem);
  }
  .footer-top {
    display: grid;
    grid-template-columns: minmax(280px, 1fr) 1.4fr;
    gap: clamp(2rem, 5vw, 4.5rem);
    padding-bottom: 3rem;
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
    font-size: 1.4rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--site-ink);
  }
  .tagline {
    margin: 1.1rem 0 1.4rem;
    max-width: 36ch;
    color: var(--site-ink-soft);
    font-size: 0.95rem;
    line-height: 1.6;
  }
  .social {
    display: flex;
    gap: 0.7rem;
  }
  .social-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    color: var(--site-ink-soft);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--site-hairline);
    border-radius: 10px;
    transition:
      color 0.2s ease,
      border-color 0.2s ease,
      transform 0.2s ease;
  }
  .social-btn:hover {
    color: var(--site-cyan-bright);
    border-color: var(--site-cyan);
    transform: translateY(-2px);
  }

  .nav-cols {
    display: grid;
    grid-template-columns: repeat(3, auto) minmax(220px, 1fr);
    gap: clamp(1.5rem, 4vw, 3rem);
  }
  .nav-col {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }
  .col-title {
    margin: 0 0 0.35rem;
    font-family: var(--site-font-display);
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--site-ink-dim);
  }
  .col-link {
    color: var(--site-ink-soft);
    text-decoration: none;
    font-size: 0.95rem;
    transition: color 0.2s ease;
    width: fit-content;
  }
  .col-link:hover {
    color: var(--site-cyan-bright);
  }
  .col-note {
    margin: 0 0 0.9rem;
    font-size: 0.88rem;
    line-height: 1.55;
    color: var(--site-ink-soft);
  }

  .footer-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    padding-block: 1.5rem 2rem;
  }
  .copy,
  .made {
    margin: 0;
    font-size: 0.82rem;
    color: var(--site-ink-dim);
  }
  .made a {
    color: var(--site-ink-soft);
    text-decoration: none;
  }
  .made a:hover {
    color: var(--site-cyan-bright);
  }

  @media (max-width: 860px) {
    .footer-top {
      grid-template-columns: 1fr;
    }
    .nav-cols {
      grid-template-columns: 1fr 1fr;
    }
    .nav-col--wide {
      grid-column: 1 / -1;
    }
  }
  @media (max-width: 480px) {
    .nav-cols {
      grid-template-columns: 1fr;
    }
  }
</style>
