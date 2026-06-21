<script lang="ts">
  // Reusable cinematic backdrop: drifting starfield + two slow nebula glows
  // (cyan + magenta). Sits behind page content as an absolute layer. Pass an
  // optional `image` to blend a piece of key art underneath the glows.
  let {
    image = null,
    nebula = true,
    vignette = true,
    imageOpacity = 0.5,
  }: {
    image?: string | null;
    nebula?: boolean;
    vignette?: boolean;
    imageOpacity?: number;
  } = $props();
</script>

<div class="starfield" aria-hidden="true">
  {#if image}
    <div
      class="art"
      style="background-image:url('{image}'); opacity:{imageOpacity};">
    </div>
  {/if}
  {#if nebula}
    <div class="neb neb--cyan"></div>
    <div class="neb neb--magenta"></div>
  {/if}
  <div class="stars stars--far"></div>
  <div class="stars stars--near"></div>
  {#if vignette}
    <div class="vignette"></div>
  {/if}
</div>

<style>
  .starfield {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: var(--site-void);
    z-index: 0;
  }

  .art {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    filter: saturate(1.05);
  }

  .neb {
    position: absolute;
    border-radius: 50%;
    filter: blur(90px);
    will-change: transform, opacity;
  }
  .neb--cyan {
    top: -10%;
    left: -8%;
    width: 55%;
    height: 60%;
    background: radial-gradient(
      circle,
      rgba(47, 227, 255, 0.28),
      transparent 65%
    );
    animation: drift-a 16s ease-in-out infinite alternate;
  }
  .neb--magenta {
    bottom: -12%;
    right: -8%;
    width: 60%;
    height: 65%;
    background: radial-gradient(
      circle,
      rgba(199, 104, 255, 0.26),
      transparent 65%
    );
    animation: drift-b 20s ease-in-out infinite alternate;
  }

  .stars {
    position: absolute;
    inset: -200px 0 0 0;
    background-repeat: repeat;
  }
  .stars--far {
    background-image:
      radial-gradient(1px 1px at 12% 18%, rgba(255, 255, 255, 0.7), transparent),
      radial-gradient(1px 1px at 28% 62%, rgba(255, 255, 255, 0.5), transparent),
      radial-gradient(1px 1px at 47% 33%, rgba(255, 255, 255, 0.6), transparent),
      radial-gradient(1px 1px at 66% 78%, rgba(255, 255, 255, 0.5), transparent),
      radial-gradient(1px 1px at 81% 22%, rgba(255, 255, 255, 0.6), transparent),
      radial-gradient(1px 1px at 92% 55%, rgba(255, 255, 255, 0.45), transparent);
    background-size: 480px 480px;
    opacity: 0.55;
    animation: rise 140s linear infinite;
  }
  .stars--near {
    background-image:
      radial-gradient(2px 2px at 18% 44%, rgba(159, 244, 255, 0.85), transparent),
      radial-gradient(2px 2px at 55% 12%, rgba(255, 255, 255, 0.8), transparent),
      radial-gradient(2px 2px at 73% 67%, rgba(231, 173, 255, 0.8), transparent),
      radial-gradient(2px 2px at 38% 88%, rgba(255, 255, 255, 0.75), transparent);
    background-size: 620px 620px;
    opacity: 0.7;
    animation: rise 90s linear infinite;
  }

  .vignette {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(120% 80% at 50% 0%, transparent 40%, rgba(4, 6, 15, 0.6) 100%),
      linear-gradient(180deg, transparent 55%, var(--site-void) 100%);
  }

  @keyframes rise {
    from {
      transform: translateY(0);
    }
    to {
      transform: translateY(-480px);
    }
  }
  @keyframes drift-a {
    from {
      transform: translate(0, 0) scale(1);
      opacity: 0.7;
    }
    to {
      transform: translate(6%, 4%) scale(1.12);
      opacity: 1;
    }
  }
  @keyframes drift-b {
    from {
      transform: translate(0, 0) scale(1.05);
      opacity: 0.65;
    }
    to {
      transform: translate(-5%, -4%) scale(1);
      opacity: 0.95;
    }
  }
</style>
