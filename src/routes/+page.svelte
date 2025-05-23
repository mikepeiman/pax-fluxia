<script>
  // import components
  import CanvasManager from "$components/CanvasManager.svelte";
  import Slider from "$components/Slider.svelte";
  import Checkbox from "$components/Checkbox-import.svelte";
  import OptionSelect from "$components/OptionSelect.svelte";
  import { onMount } from "svelte";
  import {
    storedSettingsChange,
    store_ctx,
    store_stars,
    store_uniqueVertexCoords,
    store_activeStars,
    store_activeKey,
  } from "$stores/stores.js";
  import {
    canvasArrow,
    getPositionAlongTheLine,
    getPointOnVectorByDistance,
  } from "$lib/canvasArrow";
  import Star from "$lib/Star";
  import Ship from "$lib/Ship";
  import getStarById from "$lib/getStarById";
  import { clearStarActiveStates } from "$lib/clearStarActiveStates";
  import removeDuplicates from "$lib/removeDuplicates";
  import {
    generateHexGrid,
    drawStarsOnHexCoords,
    drawHex,
    getVertexCoords,
  } from "$lib/hexGridFunctions";
  import { combinedInputFunction } from "$lib/onClick";
  import { drawStars, drawShips, generateShips } from "$lib/StarsAndShips";
  import { data } from "$stores/Data";
  import { get } from "svelte/store";
  import TextParam from "$components/TextParam.svelte";
  import { AnimationEngine } from "$lib/AnimationEngine";

  $: console.log(
    `🚀 ~ file: index.svelte ~ line 15 ~ $storedSettingsChange`,
    $storedSettingsChange,
  );
  let settings = {};
  let w,
    h,
    canvas,
    ctx,
    cx,
    cy,
    stars = get(store_stars),
    theta = 0,
    alpha = 0,
    modAlpha = 1,
    timestamp = 0,
    lastRender = 0;

  // Animation Engine - The heart of our amazing visual effects!
  let animationEngine = null;

  $: console.log(w, h);
  $: w, h;
  $: cx = w / 2;
  $: cy = h / 2;
  // $: stars = [];
  let mounted = false,
    animating = false;
  let counter = 0,
    frame = 0,
    tick = 0;
  let radius = Math.min(w, h) / 4;

  let hexCenterCoords = [];
  let hexVertexCoords = [];
  let uniqueVertexCoords = [];
  let previousData = false;
  $: console.log(
    `🚀 ~ file: index.svelte ~ line 67 ~ previousData`,
    previousData,
  );

  let localStorageSupported = (() => {
    try {
      return typeof window.localStorage !== "undefined";
    } catch (err) {
      return false;
    }
  })();

  $: data.stars = stars;

  function readData(data) {
    if (localStorageSupported) {
      try {
        const prev = window.localStorage.getItem(`${data.TITLE}`);
        if (!prev) return;
        data = prev;
        data["stars"]?.length > 1
          ? ((previousData = true), (stars = data.stars))
          : (previousData = false);
        return true;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
  }

  onMount(() => {
    mounted = true;
    timestamp = performance.now();

    // Initialize the animation engine
    animationEngine = new AnimationEngine();

    canvasInit();
    mapInit(data);
  });

  function canvasInit() {
    canvas = document.getElementById("canvas");
    w = canvas.width = window.innerWidth * 0.78;
    h = canvas.height = window.innerHeight - 17;
    canvas.style.backgroundColor = "#111"; // Darker background for better contrast
    canvas.style.cursor = "pointer";
    ctx = canvas.getContext("2d");
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, w, h);
    store_ctx.set(ctx);
    canvas.addEventListener("mousedown", combinedInputFunction);
    canvas.addEventListener("mouseup", combinedInputFunction);
    canvas.addEventListener("contextmenu", combinedInputFunction);
    window.addEventListener("keydown", combinedInputFunction);
    window.addEventListener("keyup", combinedInputFunction);
  }

  function canvasRedraw() {
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, w, h);
    stars = get(store_stars);
    drawStarsOnHexCoords(stars, data, hexCenterCoords, animationEngine);
  }

  async function mapInit(data) {
    window.localStorage.removeItem(`${data.TITLE}`);
    stars = get(store_stars);
    console.log(`🚀 ~ file: +page.svelte:182 ~ stars:`, stars);
    hexCenterCoords = await generateHexGrid(
      w,
      h,
      data.gridRadius,
      data.gridOffset,
    );
    if (data.buildVertices) {
      hexVertexCoords = await getVertexCoords(hexCenterCoords);
      uniqueVertexCoords = removeDuplicates(hexVertexCoords);
      store_uniqueVertexCoords.set(uniqueVertexCoords);
    }
    drawStarsOnHexCoords(stars, data, hexCenterCoords, animationEngine);
    drawStars(stars, ctx, data, animationEngine);
  }

  function clearAllStarsActiveStates() {
    stars.forEach((star) => {
      clearStarActiveStates(star, ctx, data, drawHex, getStarById, canvasArrow);
    });
  }

  function toggleAnimate() {
    animating = !animating;
    if (animating) {
      if (animationEngine) {
        animationEngine.start();
      }
      animate();
    } else {
      if (animationEngine) {
        animationEngine.stop();
      }
    }
  }

  function clearLS() {
    window.localStorage.removeItem(`${data.TITLE}`);
    window.location.reload();
  }

  function onChange(e) {
    console.log("change");
    console.log(`🚀 ~ file: index.svelte ~ line 194 ~ onChange ~ e`, e.detail);
    canvasRedraw();
  }

  function shuffle(o) {
    //try this shuffle function
    for (
      var j, g, t = o.length;
      t;
      j = Math.floor(Math.random() * t), g = o[--t], o[t] = o[j], o[j] = g
    );
    return o;
  }

  function adjustShipNumber(star) {
    let currentNumberOfShips = star.ships.length;
    star.numShips;
    if (currentNumberOfShips > star.numShips) {
      destroyShips(star, star.ships.length - star.numShips);
      drawEnhancedShips(star);
    }
    if (currentNumberOfShips < star.numShips) {
      generateShips(star);
    } else {
      return;
    }
  }

  function setShipOrbits(star) {
    star.ships.forEach((ship, i) => {
      ship.orbit = 2 * (data.shipRadius + Math.sqrt(i));
    });
  }

  function destroyShips(star, num) {
    let ships = star.ships;
    for (let i = 0; i < num; i++) {
      const ship = ships.pop();
      // Create destruction effect
      if (animationEngine && ship && ship.pos) {
        animationEngine.createExplosion(ship.pos.x, ship.pos.y, 0.3);
      }
    }
    star.ships = ships;
    return ships;
  }

  function transferShips(star, animationEngine) {
    if (star.attackMoveTargetId) {
      let dest = getStarById(stars, star.attackMoveTargetId);
      let j = 0;
      star.shipsToTransfer.forEach((ship, i) => {
        ship.distance += j;
        j++;
        let pos = getPositionAlongTheLine(
          ship.pos.x,
          ship.pos.y,
          dest.x,
          dest.y,
          ship.distance / 100,
        );

        // Enhanced ship transfer visualization
        if (ship.distance === 0 && animationEngine) {
          ship.createWarpOut(animationEngine);
        }

        // Draw enhanced transfer ship
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = ship.color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, ship.radius * 1.5, 0, 2 * Math.PI);
        ctx.strokeStyle = ship.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Add engine trail
        const trailLength = 20;
        const dx = dest.x - ship.pos.x;
        const dy = dest.y - ship.pos.y;
        const angle = Math.atan2(dy, dx);

        ctx.strokeStyle = ship.color + "88";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(
          pos.x - Math.cos(angle) * trailLength,
          pos.y - Math.sin(angle) * trailLength,
        );
        ctx.stroke();
        ctx.restore();

        if (ship.distance >= 95) {
          if (animationEngine) {
            ship.createWarpIn(animationEngine);
          }
          ship.distance = 0;
          dest.ships.push(ship);
          star.shipsToTransfer.splice(i, 1);
          dest.numShips++;
          star.numShips--;
        }
      });
    }
  }

  function calculateNumberOfShips(star) {
    let shipsPerTick = Math.ceil(star.numShips * star.shipsPerTickPercentage);
    star.shipsPerTick = shipsPerTick;
    star.shipsToTransfer = [...star["ships"].slice(0, shipsPerTick)];
  }

  function bounceAlpha() {
    alpha >= 1 ? (modAlpha = -1) : null;
    alpha <= 0 ? (modAlpha = 1) : null;
    let inc = 0.007 * modAlpha;
    alpha += inc;
    return alpha.toFixed(3);
  }

  function drawEnhancedShips(star) {
    if (!data.drawShips) return;

    star["ships"].forEach((ship, i) => {
      // Update ship position with enhanced movement
      ship.update(
        star.x,
        star.y,
        data.speed,
        animationEngine,
        animationEngine?.tickProgress || 0,
      );

      // Draw enhanced ship
      ship.draw(ctx, animationEngine, animationEngine?.tickProgress || 0);
    });
  }

  function animate() {
    counter++;
    if (frame % data.fps === 0) {
      tick++;
      tickUpdateShips();
    }

    if (animating) {
      requestAnimationFrame(animate);

      // Clear canvas with subtle starfield effect
      const gradient = ctx.createRadialGradient(
        w / 2,
        h / 2,
        0,
        w / 2,
        h / 2,
        Math.max(w, h) / 2,
      );
      gradient.addColorStop(0, "#1a1a2e");
      gradient.addColorStop(0.5, "#16213e");
      gradient.addColorStop(1, "#0f0f23");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      // Add subtle starfield
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const brightness = Math.random();
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.3})`;
        ctx.fillRect(x, y, 1, 1);
      }

      ctx.save();

      // Draw stars with enhanced visuals
      stars.forEach((star) => {
        if (data.drawStars) {
          star.draw(
            ctx,
            data,
            drawHex,
            getStarById,
            canvasArrow,
            animationEngine,
            animationEngine?.tickProgress || 0,
          );
        }
        if (data.drawShips) {
          drawEnhancedShips(star);
        }
        if (star.attackMoveTargetId) {
          transferShips(star, animationEngine);
        }
      });

      ctx.restore();
      ctx.save();

      // Draw hex grid and other elements
      stars = get(store_stars);
      drawStarsOnHexCoords(stars, data, hexCenterCoords, animationEngine);

      // Draw particle systems
      if (animationEngine) {
        animationEngine.draw(ctx);
      }

      ctx.restore();
      ++frame;
    }
  }

  function tickUpdateShips() {
    stars.forEach((star) => {
      star.update(tick);
      calculateNumberOfShips(star);
      adjustShipNumber(star);
    });
  }

  function clearVectors() {
    stars.forEach((star) => {
      star.attackMoveTargetId = null;
    });
    canvasRedraw();
  }

  // Add some amazing visual effects when stars are clicked
  function createStarClickEffect(star) {
    if (animationEngine) {
      animationEngine.createStarPulse(
        star.x,
        star.y,
        star.getTypeColor().primary,
      );
      animationEngine.createWarpEffect(star.x, star.y);
    }
  }
</script>

<svelte:head>
  <!-- <script src="https://zimjs.org/cdn/nft/01/zim.js"></script> -->
  <script src="https://code.createjs.com/1.0.0/createjs.min.js"></script>
</svelte:head>

<svelte:window bind:innerWidth={w} bind:innerHeight={h} />
<!-- <Grid /> -->
<div class="sketch-wrapper">
  <canvas id="canvas" bind:this={canvas} />
  <div class="controls flex flex-col p-5">
    <CanvasManager {data} on:change={onChange}>
      <div class="indie-game-title">
        <h2
          class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600 mb-4">
          ⚡ PAX FLUXIA ⚡
        </h2>
        <p class="text-sm text-gray-400 mb-6">
          Epic Space Strategy with Surge Animation
        </p>
      </div>

      <Slider
        label="Number of stars"
        on:message={(e) => onChange(e)}
        bind:value={data.numStars}
        min="1"
        max="50"
        step="1" />
      <Slider
        label="Ships min"
        on:message={onChange}
        bind:value={data.shipsMin}
        min="1"
        max="50"
        step="1" />
      <Slider
        label="Ships max"
        on:message={onChange}
        bind:value={data.shipsMax}
        min="5"
        max="250"
        step="5" />
      <Slider
        label="Speed"
        on:message={onChange}
        bind:value={data.speed}
        min=".005"
        max=".05"
        step=".005" />
      <Slider
        label="FPS"
        on:message={onChange}
        bind:value={data.fps}
        min="1"
        max="60"
        step="1" />
      <Slider
        label="Orbit X mod"
        on:message={onChange}
        bind:value={data.orbitXmod}
        min=".1"
        max="5"
        step=".1" />
      <Slider
        label="Orbit Y mod"
        on:message={onChange}
        bind:value={data.orbitYmod}
        min=".1"
        max="5"
        step=".1" />

      <div class="action-buttons">
        <button
          label="Start"
          class="p-3 m-2 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 rounded-lg shadow-lg transform transition-all hover:scale-105"
          on:click={toggleAnimate}>
          {animating ? "⏸️ Pause" : "▶️ ANIMATE!"}
        </button>
        <button
          label="Clear Vectors"
          class="p-3 m-2 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 rounded-lg shadow-lg transform transition-all hover:scale-105"
          on:click={clearVectors}>🚀 Clear Routes</button>
        <button
          label="Redraw"
          class="p-3 m-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 rounded-lg shadow-lg transform transition-all hover:scale-105"
          on:click={canvasRedraw}>🎨 Redraw</button>
        <button
          label="Re-init"
          class="p-3 m-2 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 rounded-lg shadow-lg transform transition-all hover:scale-105"
          on:click={() => mapInit(data)}>🌟 Reset Galaxy</button>
        <button
          label="Clear LS"
          class="p-3 m-2 bg-gradient-to-r from-gray-500 to-gray-700 hover:from-gray-600 hover:to-gray-800 rounded-lg shadow-lg transform transition-all hover:scale-105"
          on:click={clearLS}>🗑️ Clear Data</button>
      </div>

      <div class="visual-toggles">
        <Checkbox
          duration="200"
          label="✨ Draw stars"
          on:change={onChange}
          bind:checked={data.drawStars} />
        <Checkbox
          duration="200"
          label="🚀 Draw ships"
          on:change={onChange}
          bind:checked={data.drawShips} />
        <Checkbox
          duration="200"
          label="⭐ Draw Centers"
          on:change={onChange}
          bind:checked={data.drawCenters} />
        <Checkbox
          duration="200"
          label="🔷 Draw Hexes"
          on:change={onChange}
          bind:checked={data.drawHexes} />
        <Checkbox
          duration="200"
          label="📍 Draw Vertices"
          on:change={(e) => onChange(e)}
          bind:checked={data.drawVertices} />
        <Checkbox
          duration="200"
          label="🏷️ Draw Labels"
          on:change={(e) => onChange(e)}
          bind:checked={data.drawLabels} />
      </div>

      <OptionSelect
        items={data.colorFunctions}
        bind:selected={data.colorFunctionsIndex} />
      <TextParam
        label="Active Star ID"
        bind:value={$store_activeStars.activeStarId} />
      <TextParam
        label="Last Star ID"
        bind:value={$store_activeStars.lastActiveStarId} />
      <TextParam label="Active Key" bind:value={$store_activeKey.key} />
    </CanvasManager>
  </div>
</div>

<style lang="scss">
  .sketch-wrapper {
    display: grid;
    grid-template-areas: "canvas controls";
    grid-template-columns: 4fr 1fr;
    background: linear-gradient(135deg, #1e3c72, #2a5298);
    min-height: 100vh;
  }

  #canvas {
    grid-area: canvas;
    border-right: 2px solid rgba(255, 255, 255, 0.1);
  }

  .controls {
    grid-area: controls;
    background: linear-gradient(180deg, #1a1a2e, #16213e);
    border-left: 1px solid rgba(255, 255, 255, 0.1);
  }

  .indie-game-title {
    text-align: center;
    margin-bottom: 1.5rem;

    h2 {
      text-shadow: 0 0 20px rgba(147, 51, 234, 0.5);
      animation: glow 2s ease-in-out infinite alternate;
    }

    @keyframes glow {
      from {
        text-shadow: 0 0 20px rgba(147, 51, 234, 0.5);
      }
      to {
        text-shadow:
          0 0 30px rgba(147, 51, 234, 0.8),
          0 0 40px rgba(59, 130, 246, 0.5);
      }
    }
  }

  .action-buttons {
    margin: 1rem 0;

    button {
      color: white;
      font-weight: bold;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
      border: none;
      cursor: pointer;
      width: 100%;
      margin: 0.25rem 0;

      &:hover {
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
      }
    }
  }

  .visual-toggles {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 0.5rem;
    padding: 1rem;
    margin: 1rem 0;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  button {
    color: white;
  }
</style>
