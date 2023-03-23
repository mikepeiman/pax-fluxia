import getStarById from "$lib/getStarById.js";
import { get } from "svelte/store";
import { store_stars, store_ctx } from "$stores/stores.js";
import { drawHex } from "$lib/hexGridFunctions";
import { canvasArrow } from "$lib/canvasArrow.js";
import { hitTest } from "$lib/hitTest.js";
import { data } from "$lib/data.js";

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
        console.log(`🚀 ~ file: onClick.js:16 ~ stars.forEach ~ hit:`, hit)
        if (hit) {
            star.active = true;
            star.activeStarHexBorderHighlight(ctx, drawHex)
        } else {
            star.active = false;
            star.unhighlight(ctx)
        }

        // if we get a pixel hit
        if (hit) {
            console.log(
                `🚀 ~ file: +page.svelte:199 ~ stars.forEach ${star.id} ~ %chit: %c${hit}`,
                "color: #00aa00; font-size: 1rem;",
                "color: #ff0055; font-size: 1rem;",
                star
            );
        }
        if (star.active) {
            console.log(
                `🚀 ~ file: +page.svelte:201 ~ stars.forEach ~ star.active:%c ${star.id} ${star.active}`,
                "color: #00aa00; font-size: 1rem;"
            );
        }
        if (star.highlighted) {
            console.log(
                `🚀 ~ file: +page.svelte:201 ~ stars.forEach ~ star.highlighted:%c ${star.id} ${star.highlighted}`,
                "color: #aa0000; font-size: 1rem;"
            );
        }
        if (star.destinationStarId) {
            console.log(
                `🚀 ~ file: +page.svelte:201 ~ stars.forEach ~ star:%c ${star.id} destination %c${star.destinationStarId}`,
                'color: #0000aa; font-size: 1rem;',
                'color: #00bbaa; font-size: 1rem;'
            );
        }


        // hit === true ? ((activeStar = star), star.highlight(ctx)) : null;
        if (e.type === "contextmenu" || e.button === 2) {
            e.preventDefault();
            star.destinationStarId = null;
        }
        e.type === "mousedown" ? (mousedownStarId = star.id) : null;
        e.type === "mouseup" ? (mouseupStarId = star.id) : null;
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
            star.active = true;
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

export default onClick;