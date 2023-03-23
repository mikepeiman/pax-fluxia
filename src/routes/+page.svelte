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
    import {onClick, onKeyDown} from "$lib/onClick";
    import { drawStars, drawShips, generateShips } from "$lib/StarsAndShips";
    import { data } from "$lib/Data";
    import { get } from "svelte/store";

    $: console.log(
        `🚀 ~ file: index.svelte ~ line 15 ~ $storedSettingsChange`,
        $storedSettingsChange
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

    // $: console.log(
    //     `🚀 ~ file: index.svelte ~ line 30 ~ \n\nmousedownStarId`,
    //     mousedownStarId,
    //     `\nmouseupStarId`,
    //     mouseupStarId
    // );

    // $: console.log(
    //     `🚀 ~ file: index.svelte ~ line 28 ~ \n\noriginStarId`,
    //     originStarId,
    //     `\ndestinationStarId`,
    //     destinationStarId,
    //     `\npreviousOriginStarId`,
    //     previousOriginStarId
    // );

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
        previousData
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

    onMount(async () => {
        mounted = true;
        timestamp = performance.now();
        let canvasInitialized = new Promise((resolve, reject) => {
            resolve(canvasInit());
        });
        // let dataFound = readData(data);
        // console.log(
        //     `🚀 ~ file: index.svelte ~ line 114 ~ onMount ~ dataFound`,
        //     dataFound
        // );
        // console.log(
        //     `🚀 ~ file: index.svelte ~ line 114 ~ onMount ~ readData(data)		`,
        //     readData(data)
        // );
        canvasInitialized.then(() => {
            mapInit(data);
        });
    });

    function canvasInit() {
        canvas = document.getElementById("canvas");
        w = canvas.width = window.innerWidth * 0.8;
        h = canvas.height = window.innerHeight - 16;
        canvas.style.backgroundColor = "#222";
        canvas.style.cursor = "pointer";
        ctx = canvas.getContext("2d");
        ctx.fillStyle = "#222";
        ctx.fillRect(0, 0, w, h);
        store_ctx.set(ctx);
        canvas.addEventListener("mousedown", onClick);
        canvas.addEventListener("mouseup", onClick);
        canvas.addEventListener("contextmenu", onClick);
        window.addEventListener("keydown", onKeyDown);
    }

    function canvasRedraw() {
        ctx.fillStyle = "#222";
        ctx.fillRect(0, 0, w, h);
        stars = get(store_stars);
        drawStarsOnHexCoords(stars, data, hexCenterCoords);
    }

    async function mapInit(data) {
        window.localStorage.removeItem(`${data.TITLE}`);
        stars = get(store_stars);
        console.log(`🚀 ~ file: +page.svelte:182 ~ stars:`, stars);
        hexCenterCoords = await generateHexGrid(
            w,
            h,
            data.gridRadius,
            data.gridOffset
        );
        if (data.buildVertices) {
            hexVertexCoords = await getVertexCoords(hexCenterCoords);
            uniqueVertexCoords = removeDuplicates(hexVertexCoords);
            store_uniqueVertexCoords.set(uniqueVertexCoords);
        }
        drawStarsOnHexCoords(stars, data, hexCenterCoords);
        drawStars(stars, ctx, data);
    }

    function clearAllStarsActiveStates() {
        stars.forEach((star) => {
            clearStarActiveStates(star);
        });
    }



    function toggleAnimate() {
        animating ? (animating = false) : (animating = true);
        animating ? animate() : null;
    }

    function clearLS() {
        window.localStorage.removeItem(`${data.TITLE}`);
        window.location.reload();
    }

    function onChange(e) {
        console.log("change");
        console.log(
            `🚀 ~ file: index.svelte ~ line 194 ~ onChange ~ e`,
            e.detail
        );
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
            drawShips(star, ctx);
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
            ships.pop();
        }
        star.ships = ships;
        return ships;
    }

    function transferShips(star) {
        if (star.destinationStarId) {
            let dest = getStarById(stars, star.destinationStarId);
            let j = 0;
            star.shipsToTransfer.forEach((ship, i) => {
                // ship.distance++;
                // console.log(`🚀 ~ file: index.svelte ~ line 559 ~ shipsToTransfer.forEach ~ ship`, ship)
                ship.distance += j;
                j++;
                let pos = getPositionAlongTheLine(
                    ship.pos.x,
                    ship.pos.y,
                    dest.x,
                    dest.y,
                    ship.distance / 100
                );
                // ctx.save()
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, ship.radius, 0, 2 * Math.PI);
                // ctx.fillStyle = ship.color;
                ctx.strokeStyle = ship.color;
                ctx.stroke();
                // ctx.fill();
                // ctx.restore()
                if (ship.distance >= 95) {
                    ship.distance = 0;
                    dest.ships.push(ship);
                    star.shipsToTransfer.splice(i, 1);
                    dest.numShips++;
                    star.numShips--;
                }
            });
            // transfer shipsPerTick to destination star
        }
    }

    function calculateNumberOfShips(star) {
        let shipsPerTick = Math.ceil(
            star.numShips * star.shipsPerTickPercentage
        );
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

    function animate() {
        counter++;
        if (frame % data.fps === 0) {
            tick++;
            tickUpdateShips();
        }
        tick;
        if (animating) {
            setTimeout(function () {
                requestAnimationFrame(animate);
                ctx.fillStyle = "#222";
                ctx.fillRect(0, 0, w, h);
                ctx.save();
                stars.forEach((star) => {
                    data.drawStars
                        ? star.draw(
                              ctx,
                              data,
                              drawHex,
                              getStarById,
                              canvasArrow
                          )
                        : null;
                    data.drawShips ? drawShips(star) : null;
                    star.destinationStarId ? transferShips(star) : null;
                });
                // stars.forEach((star) => {
                // });
                ctx.restore();
                ctx.save();
                stars = get(store_stars);
                drawStarsOnHexCoords(stars, data, hexCenterCoords);
                ctx.restore();
                ++frame;
            }, 1000 / data.fps);
        } else {
            return;
        }
    }

    function tickUpdateShips() {
        // console.log(
        // 	`🚀 ~ file: index.svelte:637 ~ stars.forEach ~ star[0]:`,
        // 	stars[0],
        // 	stars[0].ships.length
        // );
        stars.forEach((star) => {
            star.update(tick);
            calculateNumberOfShips(star);
            adjustShipNumber(star);
        });
    }

    function clearVectors() {
        stars.forEach((star) => {
            star.destinationStarId = null;
        });
        canvasRedraw();
    }

    class Handler extends Star {
        constructor(currentTarget) {
            super();
            currentTarget.addEventListener("click", this);
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
            <button
                label="Start"
                class="p-3 m-2 bg-sky-600 hover:bg-sky-500 rounded"
                on:click={toggleAnimate}>Animate</button>
            <button
                label="Start"
                class="p-3 m-2 bg-sky-600 hover:bg-sky-500 rounded"
                on:click={clearVectors}>Remove directions</button>
            <button
                label="Start"
                class="p-3 m-2 bg-sky-600 hover:bg-sky-500 rounded"
                on:click={canvasRedraw}>Redraw grid</button>
            <button
                label="Start"
                class="p-3 m-2 bg-sky-600 hover:bg-sky-500 rounded"
                on:click={mapInit}>Re-initialize map</button>
            <button
                label="Start"
                class="p-3 m-2 bg-sky-600 hover:bg-sky-500 rounded"
                on:click={clearLS}>Clear localStorage</button>
            <Checkbox
                duration="200"
                label="Draw stars"
                on:change={onChange}
                bind:checked={data.drawStars} />
            <Checkbox
                duration="200"
                label="Draw ships"
                on:change={onChange}
                bind:checked={data.drawShips} />
            <Checkbox
                duration="200"
                label="Draw Centers"
                on:change={onChange}
                bind:checked={data.drawCenters} />
            <Checkbox
                duration="200"
                label="Draw Hexes"
                on:change={onChange}
                bind:checked={data.drawHexes} />
            <Checkbox
                duration="200"
                label="Draw Vertices"
                on:change={(e) => onChange(e)}
                bind:checked={data.drawVertices} />
            <Checkbox
                duration="200"
                label="Draw Labels"
                on:change={(e) => onChange(e)}
                bind:checked={data.drawLabels} />
            <OptionSelect
                items={data.colorFunctions}
                bind:selected={data.colorFunctionsIndex} />
        </CanvasManager>
    </div>
</div>

<style lang="scss">
    .sketch-wrapper {
        display: grid;
        grid-template-areas: "canvas controls";
        grid-template-columns: 4fr 1fr;
    }

    #canvas {
        grid-area: canvas;
    }
    .controls {
        grid-area: controls;
    }

    button {
        color: white;
    }
</style>
