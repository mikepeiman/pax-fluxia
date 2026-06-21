<script lang="ts">
  import { DEVLOG_POSTS } from "./content";

  const posts = DEVLOG_POSTS.slice(0, 3);

  function fmt(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
</script>

<section class="devlog site-section">
  <div class="site-shell">
    <header class="head">
      <div>
        <p class="site-eyebrow">From the command deck</p>
        <h2 class="site-h2">Built in the open</h2>
      </div>
      <a class="site-textlink" href="/devlog">All updates →</a>
    </header>

    <div class="grid">
      {#each posts as post}
        <a class="post" href="/devlog#{post.slug}">
          <div class="meta">
            <span class="tag">{post.tag}</span>
            <span class="date">{fmt(post.date)}</span>
          </div>
          <h3 class="title">{post.title}</h3>
          <p class="excerpt">{post.excerpt}</p>
          <span class="more">Read →</span>
        </a>
      {/each}
    </div>
  </div>
</section>

<style>
  .devlog {
    background: linear-gradient(180deg, var(--site-void), var(--site-void-2));
  }
  .head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1.5rem;
    flex-wrap: wrap;
    margin-bottom: clamp(2rem, 4vw, 3rem);
  }
  .head > div {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.4rem;
  }
  .post {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    padding: 1.8rem;
    text-decoration: none;
    background: var(--site-panel);
    border: 1px solid var(--site-hairline);
    border-radius: var(--site-radius);
    transition:
      transform 0.22s ease,
      border-color 0.22s ease,
      box-shadow 0.22s ease;
  }
  .post:hover {
    transform: translateY(-5px);
    border-color: var(--site-hairline-strong);
    box-shadow: 0 16px 44px rgba(2, 6, 20, 0.55);
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 0.7rem;
  }
  .tag {
    font-family: var(--site-font-mono);
    font-size: 0.66rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #05070f;
    padding: 0.22rem 0.55rem;
    background: var(--site-flow);
    border-radius: 5px;
  }
  .date {
    font-family: var(--site-font-mono);
    font-size: 0.74rem;
    color: var(--site-ink-dim);
  }
  .title {
    margin: 0;
    font-family: var(--site-font-display);
    font-size: 1.3rem;
    font-weight: 700;
    line-height: 1.2;
    color: var(--site-ink);
  }
  .excerpt {
    margin: 0;
    flex: 1;
    font-size: 0.95rem;
    line-height: 1.6;
    color: var(--site-ink-soft);
  }
  .more {
    font-family: var(--site-font-display);
    font-weight: 600;
    font-size: 0.9rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--site-cyan-bright);
  }

  @media (max-width: 900px) {
    .grid {
      grid-template-columns: 1fr;
      max-width: 560px;
    }
  }
</style>
