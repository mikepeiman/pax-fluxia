import getStarById from "$lib/getStarById.js";
import { get } from "svelte/store";
import { store_stars, store_ctx } from "$stores/stores.js";
import { drawHex } from "$lib/hexGridFunctions";
import { canvasArrow } from "$lib/canvasArrow.js";
import { hitTest } from "$lib/hitTest.js";
import { data } from "$lib/data.js";
import { clearStarActiveStates } from "$lib/clearStarActiveStates";
import { logStar } from "$lib/logStarDetails";
import { canvasRedraw } from "$lib/canvasRedraw";

let stars = get(store_stars);
let ctx = get(store_ctx);
let activeStar = null,
    originStarId,
    previousOriginStarId,
    destinationStarId,
    mousedownStarId,
    mouseupStarId;

function onClick(e) {
    console.log(`🚀 ~ file: index.svelte ~ line 305 ~ onClick ~ e ✅✅✅🔥🔥🔥  `, e.type),
        `  ✅✅✅🔥🔥🔥`;
    console.log('click', e.x, ':', e.y);
    stars = get(store_stars);
    ctx = get(store_ctx);
    let hit = false;
    stars.forEach((star) => {
        // if we get a pixel hit
        if (e.x >= star.xMin && e.x <= star.xMax && e.y >= star.yMin && e.y <= star.yMax) {
            hit = true;
            if (e.type === 'contextmenu' || e.button === 2) {
                e.preventDefault();
                star.destinationStarId = null;
            }
            e.type === 'mousedown' ? (mousedownStarId = star.id) : null;
            e.type === 'mouseup' ? (mouseupStarId = star.id) : null;

            if (e.type === 'mouseup' && e.button !== 2) {
                console.log(`🚀 ~ file: index.svelte ~ line 422 ~ stars.forEach ~ star`, star);
                activeStar ? (activeStar.active = false) : null;
                activeStar = star;
                star.active = true;
                if (star.highlighted) {
                    star.unhighlight(ctx);
                } else {
                    star.activeStarHexBorderHighlight(ctx, drawHex);
                }
                star.draw(ctx, data, drawHex, getStarById, canvasArrow);
            }
        }
        if (hit && e.type === 'mouseup' && e.button !== 2) {
            if (mousedownStarId !== mouseupStarId) {
                originStarId = mousedownStarId;
                destinationStarId = previousOriginStarId = mouseupStarId;
                activeStar = getStarById(stars, mouseupStarId)
                let origin = getStarById(stars, originStarId);
                origin.destinationStarId = destinationStarId;
            }

            if (mousedownStarId === mouseupStarId) {
                originStarId = mousedownStarId;
                if (previousOriginStarId !== originStarId && previousOriginStarId) {
                    console.log(
                        `🚀 ~ file: index.svelte ~ line 442 ~ stars.forEach ~ previousOriginStarId !== originStarId && previousOriginStarId`,
                        previousOriginStarId !== originStarId && previousOriginStarId
                    );
                    destinationStarId = originStarId;
                    let origin = getStarById(stars, previousOriginStarId);
                    origin.destinationStarId = mouseupStarId;
                }
                previousOriginStarId = originStarId;
            }
        }
    });

    if (e.type === 'mouseup' && e.type !== 'contextmenu') {
        // canvasRedraw(ctx);
        stars.forEach((star) => {
            if (star.id && star.destinationStarId && star.destinationStarId !== star.id) {
                let origin = getStarById(stars, star.id);
                let destination = getStarById(stars, star.destinationStarId);
                canvasArrow(ctx, destination, origin);
            }
        });
    }
    if (e.type === 'contextmenu' || e.button === 2) {
        e.preventDefault();
        if (activeStar) {
            activeStar.active = false;
            activeStar.draw(ctx, data, drawHex, getStarById, canvasArrow);
        }
        activeStar = null;
        originStarId = null;
        destinationStarId = null;
        previousOriginStarId = null;
        return false;
    }
}

function onKeyDown(e) {
    stars = get(store_stars);
    ctx = get(store_ctx);
    console.log(`🚀 ~ file: onClick.js:16 ~ onKeyDown ~ e`, e.key, e.keyCode)
    if (e.key === "Escape") {
        stars.forEach((star) => {
            clearStarActiveStates(star, ctx);
        });
    }
    if (e.key === 'l' || e.keyCode === 76 || e.key === 'L' || e.keyCode === 108) {
        stars.forEach((star) => {
            logStar(star)
        });
    }
}

export { onClick, onKeyDown };