import getStarById from "$lib/getStarById.js";
import { get } from "svelte/store";
import { store_stars, store_ctx } from "$stores/stores.js";
import { drawHex } from "$lib/hexGridFunctions";
import { canvasArrow } from "$lib/canvasArrow.js";
import { hitTest } from "$lib/hitTest.js";
import { data } from "$lib/data.js";
import { canvasRedraw } from "./canvasRedraw";

let stars = get(store_stars);
let ctx = get(store_ctx);
let originStarId,
    previousOriginStarId,
    destinationStarId,
    mousedownStarId,
    mouseupStarId;
function onClick(e) {
    console.log("click", e.x, ":", e.y);
    // let hit = false,
    stars = get(store_stars);
    ctx = get(store_ctx);
    let activeStar = null;
    stars.forEach((star) => {
        let hit = hitTest(e.x, e.y, star);
        if (hit) {
            star.active = true;
            star.activeStarHexBorderHighlight(ctx, drawHex)
        } else {
            star.active = false;
            star.unhighlight(ctx)
        }
        // this may need to be inside of positive hittest
        if (e.type === "contextmenu" || e.button === 2) {
            e.preventDefault();
            star.destinationStarId = null;
        }
        e.type === "mousedown" ? (mousedownStarId = star.id) : null;
        e.type === "mouseup" ? (mouseupStarId = star.id) : null;

        if (hit && e.type === "mouseup" && e.button !== 2) {
            activeStar ? (activeStar.active = false) : null;
            activeStar = star;
            star.active = true;
            if (star.highlighted) {
                star.unhighlight(ctx);
            } else {
                star.highlight(ctx);
            }
            star.draw(ctx, data, drawHex, getStarById, canvasArrow);
        }

        if (hit && e.type === "mouseup" && e.button !== 2) {
            originStarId = mousedownStarId;
            if (mousedownStarId !== mouseupStarId) {
                destinationStarId = previousOriginStarId = mouseupStarId;
                let origin = getStarById(stars, originStarId);
                origin.destinationStarId = destinationStarId;
            }

            if (mousedownStarId === mouseupStarId) {
                if (previousOriginStarId !== originStarId && previousOriginStarId) {
                    destinationStarId = originStarId;
                    let origin = getStarById(stars, previousOriginStarId);
                    origin.destinationStarId = mouseupStarId;
                }
                previousOriginStarId = originStarId;
            }
        }
    });

    if (e.type === "mouseup" && e.type !== "contextmenu") {
        canvasRedraw(ctx)
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
        if (activeStar) {
            activeStar.active = false;
            activestar.draw(ctx, data, drawHex, getStarById, canvasArrow);
        }
        // setTimeout(() => {
        //     activeStar = null;
        // }, 500);
        activeStar = null;
        // clearStarActiveStates();
        originStarId = null;
        destinationStarId = null;
        previousOriginStarId = null;
        return false;
    }

}

export default onClick;