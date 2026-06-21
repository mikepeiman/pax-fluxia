<script lang="ts">
  import PageHero from "$lib/components/landing-site/PageHero.svelte";
  import Newsletter from "$lib/components/landing-site/Newsletter.svelte";
  import { DEVLOG_POSTS } from "$lib/components/landing-site/content";

  function fmt(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
</script>

<svelte:head>
  <title>Devlog — Pax Fluxia</title>
  <meta
    name="description"
    content="Development updates from Fatherlion Studios — design notes, tech deep-dives, and release announcements as Pax Fluxia is built in the open." />
</svelte:head>

<PageHero
  eyebrow="Devlog"
  title="Built in the open"
  lead="Design notes, tech deep-dives, and release news — straight from the command deck. Subscribe and you'll never miss a build drop."
  image="/assets/pax-fluxia-bg-4.jpg" />

<section class="subscribe-band site-section">
  <div class="site-shell band-inner">
    <div>
      <h2 class="band-title">Get every update</h2>
      <p class="band-note">New posts and milestone builds, delivered. No spam.</p>
    </div>
    <Newsletter cta="Subscribe" compact />
  </div>
</section>

<section class="posts site-section">
  <div class="site-shell posts-shell">
    {#each DEVLOG_POSTS as post}
      <article id={post.slug} class="post">
        <div class="meta">
          <span class="tag">{post.tag}</span>
          <span class="date">{fmt(post.date)}</span>
        </div>
        <h2 class="title">{post.title}</h2>
        <div class="body site-prose">
          {#each post.body as para}
            <p>{para}</p>
          {/each}
        </div>
      </article>
    {/each}
  </div>
</section>

<style>
  .subscribe-band {
    padding-block: clamp(2rem, 4vw, 3rem);
    background: var(--site-void-2);
    border-block: 1px solid var(--site-hairline);
  }
  .band-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
    flex-wrap: wrap;
  }
  .band-title {
    margin: 0;
    font-family: var(--site-font-display);
    font-size: 1.5rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--site-ink);
  }
  .band-note {
    margin: 0.3rem 0 0;
    color: var(--site-ink-soft);
    font-size: 0.95rem;
  }

  .posts-shell {
    max-width: var(--site-maxw-prose);
  }
  .post {
    padding-block: clamp(2rem, 5vw, 3rem);
    border-bottom: 1px solid var(--site-hairline);
    scroll-margin-top: calc(var(--site-header-h) + 1.5rem);
  }
  .post:last-child {
    border-bottom: none;
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    margin-bottom: 1rem;
  }
  .tag {
    font-family: var(--site-font-mono);
    font-size: 0.68rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #05070f;
    padding: 0.24rem 0.6rem;
    background: var(--site-flow);
    border-radius: 5px;
  }
  .date {
    font-family: var(--site-font-mono);
    font-size: 0.8rem;
    color: var(--site-ink-dim);
  }
  .title {
    margin: 0 0 1.2rem;
    font-family: var(--site-font-display);
    font-size: clamp(1.7rem, 3.5vw, 2.4rem);
    font-weight: 700;
    line-height: 1.12;
    color: var(--site-ink);
  }
</style>
