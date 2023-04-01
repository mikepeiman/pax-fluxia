import {get} from 'svelte/store';
import {store_stars, store_ctx, store_hexCenterCoords} from '$stores/stores';
import {drawStarsOnHexCoords} from '$lib/hexGridFunctions';
import {data} from '$stores/Data';

let ctx = get(store_ctx);

function canvasRedraw() {
    let canvas = document.getElementById("canvas");
    let w = canvas.width = window.innerWidth * .78;
    let h = canvas.height = window.innerHeight - 17;
    let hexCenterCoords = get(store_hexCenterCoords);
    ctx = get(store_ctx);
    let stars = get(store_stars);
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, w, h);
    drawStarsOnHexCoords(stars, data, hexCenterCoords);
}

export {canvasRedraw};