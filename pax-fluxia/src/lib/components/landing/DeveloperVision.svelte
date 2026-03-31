<section class="dev-vision">
  <div class="content">
    <div class="left-col">
      <div class="dev-img">
        <img src="/assets/generated_image_5.jpg" alt="Fatherlion Studios" />
      </div>
      <h3 class="studio-name font-display">Fatherlion Studios</h3>
    </div>

    <div class="right-col">
      <h2 class="title font-display">
        Visible Strategy: A Solo Developer’s Labor of Love
      </h2>
      <p class="desc font-body">
        Pax Fluxia is the result of my passion to make an homage to the indie
        gem from 2007, Pax Galaxia. I am proud to say that I have recreated
        something very close to the original, but with modern features and
        graphics. And after the classic mode is polished, a huge number of
        features and mechanics are planned that will provide endless variety of
        game modes to create and share! I hope you enjoy playing Pax Fluxia as
        much as I enjoyed making it.
      </p>

      <div class="tech-stack">
        <span class="tech-item font-data">Built with</span>
        <div class="tech-icon" title="Svelte">
          <svg viewBox="0 0 128 128" width="24" height="24"
            ><path
              fill="#FF3E00"
              d="M120.5 45L64 7.6 7.5 45l8.6 44.8 47.9 30.6 47.9-30.6 8.6-44.8zM64 122.3L15.3 91.2 9.5 52.8 55.4 22.4 104 54.6 73.6 74.7 51.9 60.3 42.4 54l-5.3 3.5 12.3 8.2 27.6 18.3 45.4-30.1 6.1 38.4-48.7 31.1z"
            /></svg
          >
        </div>
        <div class="tech-icon" title="TypeScript">
          <svg viewBox="0 0 128 128" width="24" height="24"
            ><path fill="#007ACC" d="M2 2h124v124H2V2z" /><path
              fill="#FFF"
              d="M71.4 75.6c0 10.7-5.9 14.3-15.6 14.3-5.2 0-9.7-1.4-12.8-3.4l2.4-10.7c2.3 1.3 5.4 2.5 8.7 2.5 3.5 0 5.4-1.3 5.4-4.5 0-3.1-2-4.5-8-6.6-8.9-3.2-13.6-7.8-13.6-14.7 0-9 7.6-14.2 16.9-14.2 4.6 0 8.7 1.1 11.2 2.7l-2.4 10.4c-2.3-1.1-4.7-2.1-8.1-2.1-3.6 0-5.2 1.5-5.2 4 0 2.8 2.2 4.1 7.7 6.1 9.4 3.4 14.4 7.8 14.4 16.2zM98.8 90H86.2V41.7h-9.9v-11h32.2v11h-9.8V90z"
            /></svg
          >
        </div>
        <div class="tech-icon" title="WebGPU">
          <svg viewBox="0 0 24 24" width="24" height="24"
            ><path fill="#FFF" d="M12 2L2 22h20L12 2z" /></svg
          >
          <!-- Placeholder Triangle -->
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  .dev-vision {
    padding: var(--space-12) var(--space-8);
    background-color: #0a0a12;
    display: flex;
    justify-content: center;
  }

  .content {
    display: flex;
    gap: var(--space-12);
    align-items: center;
    max-width: 1000px;
  }

  .left-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
  }

  .dev-img {
    width: 200px;
    height: 200px;
    border-radius: 50%;
    background: #1e293b;
    border: 2px solid var(--color-text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .dev-img img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .studio-name {
    font-size: 1.2rem;
    color: var(--color-text-primary);
    font-weight: 700;
  }

  .right-col {
    flex: 1;
  }

  .title {
    font-size: 2rem;
    color: var(--color-text-primary);
    margin-bottom: var(--space-4);
    line-height: 1.2;
  }

  .desc {
    font-size: 1rem;
    color: var(--color-text-muted);
    line-height: 1.6;
    margin-bottom: var(--space-6);
  }

  .tech-stack {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    opacity: 0.7;
  }

  .tech-item {
    font-size: 0.9rem;
    color: var(--color-text-muted);
  }

  .tech-icon svg {
    display: block;
    width: 24px;
    height: 24px;
    filter: grayscale(1);
    transition: filter 0.2s;
  }

  .tech-icon:hover svg {
    filter: grayscale(0);
  }

  @media (max-width: 768px) {
    .content {
      flex-direction: column;
      text-align: center;
      gap: var(--space-8);
    }
  }
</style>
