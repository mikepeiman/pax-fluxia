import getStarById from "$lib/getStarById.js";
import { get } from "svelte/store";
import { store_stars, store_ctx } from "$stores/stores.js";
import { drawHex } from "$lib/hexGridFunctions";
import { canvasArrow } from "$lib/canvasArrow.js";
import { hitTest } from "$lib/hitTest.js";
import { data } from "$lib/data.js";
import { clearStarActiveStates } from "$lib/clearStarActiveStates";
import { logStar } from "$lib/logStarDetails";


let stars = get(store_stars);
let ctx = get(store_ctx);
let originStarId,
    previousOriginStarId,
    destinationStarId,
    mousedownStarId,
    mouseupStarId;

function onClick(e) {
    console.log("click", e.x, ":", e.y);
    stars = get(store_stars);
    ctx = get(store_ctx);
    let activeStar = null;
    stars.forEach((star) => {
        e.type === "mousedown" ? (mousedownStarId = star.id) : null;
        e.type === "mouseup" ? (mouseupStarId = star.id) : null;
        let hit = hitTest(e.x, e.y, star);
        console.log(`🚀 ~ file: onClick.js:16 ~ stars.forEach ~ hit:`, hit)
        if (hit) {
            star.active = true;
            star.activeStarHexBorderHighlight(ctx, drawHex)

        } else {
            star.active = false;
            star.unhighlight(ctx)
        }

        if (e.type === "contextmenu" || e.button === 2) {
            e.preventDefault();
            star.destinationStarId = null;
        }

        // e.type === "mousedown"
        //     ? console.log(`getStarById: `, getStarById(stars, star.id))
        //     : null;

        if (e.type === "mouseup" && e.button !== 2) {
            // console.log(
            //     `🚀 ~ file: index.svelte ~ line 422 ~ stars.forEach ~ star`,
            //     star
            // );
            activeStar ? (activeStar.active = false) : null;
            activeStar = star;
            // star.active = true;
            if (star.highlighted) {
                star.unhighlight(ctx);
            } else {
                star.highlight(ctx);
            }
            star.draw(ctx, data, drawHex, getStarById, canvasArrow);
        }

        if (hit && e.type === "mouseup" && e.button !== 2) {
            if (mousedownStarId !== mouseupStarId) {
                originStarId = mousedownStarId;
                destinationStarId = previousOriginStarId = mouseupStarId;
                // activeStar = getStarById(stars, mouseupStarId)
                let origin = getStarById(stars, originStarId);
                origin.destinationStarId = destinationStarId;
            }

            if (mousedownStarId === mouseupStarId) {
                originStarId = mousedownStarId;
                if (
                    previousOriginStarId !== originStarId &&
                    previousOriginStarId
                ) {
                    console.log(
                        `🚀 ~ file: index.svelte ~ line 442 ~ stars.forEach ~ previousOriginStarId !== originStarId && previousOriginStarId`,
                        previousOriginStarId !== originStarId &&
                        previousOriginStarId
                    );
                    destinationStarId = originStarId;
                    let origin = getStarById(stars, previousOriginStarId);
                    origin.destinationStarId = mouseupStarId;
                }
                previousOriginStarId = originStarId;
            }
        }
    });

    if (e.type === "mouseup" && e.type !== "contextmenu") {
        stars.forEach((star) => {
            if (
                star.id &&
                star.destinationStarId &&
                star.destinationStarId !== star.id
            ) {
                let origin = getStarById(stars, star.id);
                let destination = getStarById(
                    stars,
                    star.destinationStarId
                );
                canvasArrow(ctx, destination, origin);
            }
        });
    }

    if (e.type === "contextmenu" || e.button === 2) {
        e.preventDefault();
        // console.log(
        //     `🚀 ~ file: +page.svelte:368 ~ onClick ~ activeStar:`,
        //     activeStar
        // );
        // if (activeStar) {
        //     console.log(
        //         `🚀 ~ file: +page.svelte:369 ~ onClick ~ activeStar:`,
        //         activeStar
        //     );
        //     activeStar.active = false;
        //     activestar.draw(ctx, data, drawHex, getStarById, canvasArrow);
        //     console.log(
        //         `🚀 ~ file: +page.svelte:372 ~ onClick ~ activeStar:`,
        //         activeStar
        //     );
        // }
        // setTimeout(() => {
        //     activeStar = null;
        // }, 500);
        // activeStar = null;
        // clearStarActiveStates();
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