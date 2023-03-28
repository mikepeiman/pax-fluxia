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
let canvas;
let activeStar = null,
    originStarId,
    previousOriginStarId,
    destinationStarId,
    mousedownStarId,
    mouseupStarId;

// I will need to refactor this entire function to be a mousedown event handler, so I can act on any stars the player drags the cursor over, whether left or right click
// When there is a mousedown, activate a mousemove event handler that will check for mouseover events on stars
// When there is a mouseup, deactivate the mousemove event handler
// When there is a mouseup, if the mouseup is a left click, then activate the star
// When there is a mouseup, if the mouseup is a right click, then deactivate the star


function onClick(e) {
    // console.log(`🚀 ~ file: index.svelte ~ line 305 ~ onClick ~ e ✅✅✅🔥🔥🔥  `, e.type),
    //     `  ✅✅✅🔥🔥🔥`;
    // console.log('click', e.x, ':', e.y);
    let hit = false;
    canvas = document.getElementById("canvas");

    if (e.type === 'mousedown') {
        // activate a mousemove event handler that will check for mouseover events on stars
        canvas.addEventListener('mousemove', onMouseMove);

    }
    if (e.type === 'mouseup') {
        // deactivate the mousemove event handler
        canvas.removeEventListener('mousemove', onMouseMove);
        stars.forEach((star) => {
            hit = hitTest(e.x, e.y, star);
            if (hit) {

            } else {
            }
        })
    }


    stars = get(store_stars);
    ctx = get(store_ctx);
    stars.forEach((star) => {
        // if we get a pixel hit
        let hit = hitTest(e.x, e.y, star);
        if (hit) {
            activeStar = star;
            // deal with left clicks that are action clicks
            if (e.type === 'mousedown' && e.button === 1) {

            }


            if (e.type === 'contextmenu' || e.button === 2) {
                e.preventDefault();
                star.destinationStarId = null;
            }
            e.type === 'mousedown' ? (mousedownStarId = star.id) : null;
            e.type === 'mouseup' ? (mouseupStarId = star.id) : null;

            if (e.type === 'mouseup' && e.button !== 2) {
                activeStar ? (activeStar.active = false) : null;
                activeStar = star;
                star.active = true;
                if (star.highlighted) {
                    star.unhighlight(ctx);
                } else {
                    star.activeStarHexBorderHighlight(ctx, drawHex);
                }
                if (star.destination) {
                    let destination = getStarById(stars, star.destination);
                    destination.destinationStarId === star.id ? (destination.destinationStarId = null) : null;
                }
                star.draw(ctx, data, drawHex, getStarById, canvasArrow);
            }
        } else {
            if (e.type === 'mouseup' && (e.type === 'contextmenu' || e.button === 2)) {
                activeStar ? (activeStar.active = false) : null;
                activeStar = null;
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
                // destination.destinationStarId === star.id ? (destination.destinationStarId = null) : null;
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

function onMouseMove(e) {
    stars = get(store_stars);
    ctx = get(store_ctx);
    stars.forEach((star) => {
        // if we get a pixel hit
        let hit = hitTest(e.x, e.y, star);
        if (hit && activeStar !== star) {
            activeStar = star;
        } else {

        }
    });
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