import getStarById from "$lib/getStarById.js";
import { get } from "svelte/store";
import { store_stars, store_ctx, store_activeStars, store_activeKey } from "$stores/stores.js";
import { drawHex } from "$lib/hexGridFunctions";
import { canvasArrow } from "$lib/canvasArrow.js";
import { hitTest } from "$lib/hitTest.js";
import { data } from "$stores/Data.js";
import { clearStarActiveStates } from "$lib/clearStarActiveStates";
import { logStar } from "$lib/logStarDetails";
import { canvasRedraw } from "$lib/canvasRedraw";
import { drawStars } from "$lib/StarsAndShips.js";
let activeStars = get(store_activeStars);
let stars = get(store_stars);
let ctx = get(store_ctx);
let canvas;
let activeStar = stars[0] || null,
    activeStarId,
    lastActiveStar = stars[1] || null,
    lastActiveStarId,
    attackMoveTargetId,
    mousedownStarId,
    mouseupStarId;

let activeKey = null;
$: activeKey = get(store_activeKey);
// $: console.log(`🚀 ~ file: onClick.js:25 ~ activeKey:`, activeKey)
store_activeStars.subscribe((val) => {
    stars = get(store_stars);
    ctx = get(store_ctx);
    activeStars = val;
    // console.log(`🚀 ~ file: onClick.js:26 ~ activeStars.subscribe ~ activeStars:`, activeStars)
    activeStarId = val.activeStarId;
    lastActiveStarId = val.lastActiveStarId;
    activeStar = getStarById(stars, val.activeStarId);
    lastActiveStar = getStarById(stars, val.lastActiveStarId);
    if (lastActiveStar) {
        lastActiveStar.active = false;
        lastActiveStar.draw(ctx, data, drawHex, getStarById, canvasArrow);
        console.log(`🚀 ~ file: onClick.js:34 ~ store_activeStars.subscribe ~ lastActiveStar ${lastActiveStar.id} activeStar ${activeStar.id}:`,)
        setAttackMoveTarget(lastActiveStar, activeStar)
        executeAttackMoveOperations(lastActiveStar, ctx);
    }
    stars.forEach((star) => {
        star.draw(ctx, data, drawHex, getStarById, canvasArrow);
    });
    // drawStars(stars, ctx, data);
});
// I will need to refactor this entire function to be a mousedown event handler, so I can act on any stars the player drags the cursor over, whether left or right click
// When there is a mousedown, activate a mousemove event handler that will check for mouseover events on stars
// When there is a mouseup, deactivate the mousemove event handler
// When there is a mouseup, if the mouseup is a left click, then activate the star
// When there is a mouseup, if the mouseup is a right click, then deactivate the star
// if mouseUp is not on a star, do we need to do anything special?
// we may need to check if BOTH mouse buttons were pressed - one button held while the other was clicked


function checkStarsForHit(e, stars) {
    console.log(`🚀 ~ file: onClick.js:58 ~ checkStarsForHit ~ ${e.type} ${e.button}:`, e)
    let hitStar
    stars.forEach((star) => {
        // if we get a pixel hit
        let hit = hitTest(e.x, e.y, star);
        if (hit) {
            if (e.type === 'contextmenu' || e.button === 2) {
                star.attackMoveTargetId = null;
            } 
            if ((e.type !== 'contextmenu' || e.button !== 2) && activeStar !== star) {
                console.log(`🚀 ~ file: onClick.js:67 ~ stars.forEach ~ !(e.type === 'contextmenu' || e.button === 2) && activeStar !== star:`, !(e.type === 'contextmenu' || e.button === 2) && activeStar !== star)
                setActiveStar(star)
                hitStar = star.id
                if (lastActiveStar) {
                    setAttackMoveTarget(lastActiveStar, activeStar)
                    executeAttackMoveOperations(lastActiveStar, ctx);
                }
            }
        }
    });
    console.log(`🚀 ~ file: onClick.js:95 ~ checkStarsForHit ~ hitStar:`, hitStar)
    return hitStar
}

function setActiveStar(star) {
    let ctx = get(store_ctx);
    star.activeStarHexBorderHighlight(ctx, drawHex)
    lastActiveStar = activeStar;
    lastActiveStarId = activeStarId;
    activeStar = star;
    star.active = true;
    if (lastActiveStar) {
        lastActiveStar.active = false;
    }
    activeStarId = star.id;
    activeStars["activeStarId"] = activeStarId;
    activeStars["activeStar"] = activeStar;
    activeStars["lastActiveStarId"] = lastActiveStarId;
    activeStars["lastActiveStar"] = lastActiveStar;
    store_activeStars.set(activeStars);
    store_stars.set(stars);
}


function onMouseDown(e) {
    // activate a mousemove event handler that will check for mouseover events on stars
    canvas = document.getElementById("canvas");
    // stars = get(store_stars);
    // let hit = checkStarsForHit(e, stars)
    // console.log(`🚀 ~ file: onClick.js:122 ~ onMouseDown ~ hit:`, hit)
    // if (hit) {
    //     setAttackMoveTarget(lastActiveStar, activeStar)
    //     executeAttackMoveOperations(activeStar, ctx);
    // }
    canvas.addEventListener('mousemove', onMouseMove);

}

function onMouseUp(e) {
    e.preventDefault();
    console.log(`🚀 ~ file: onClick.js:130 ~ onMouseUp ~ e:`, e)
    // deactivate the mousemove event handler
    canvas = document.getElementById("canvas");
    canvas.removeEventListener('mousemove', onMouseMove);
    stars = get(store_stars);
    let hit = checkStarsForHit(e, stars)
    console.log(`🚀 ~ file: onClick.js:138 ~ onMouseUp ~ hit:`, hit)
    // if (hit) {
    //     console.log(`🚀 ~ file: onClick.js:136 ~ onMouseUp ~ hit:`, hit)
    //     if (e.type === 'contextmenu' || e.button === 2) {

    //     }
    //     e.type
    //     console.log(`🚀 ~ file: onClick.js:146 ~ stars.forEach ~ e.type:`, e.type)

    // } else {

    // }
}

async function onMouseMove(e) {
    stars = get(store_stars);
    ctx = get(store_ctx);
    let hit = await checkStarsForHit(e, stars)
    if (e.type === 'contextmenu' || e.button === 2) {
        console.log(`🚀 ~ file: onClick.js:61 ~ onMouseMove ~ e.type === 'contextmenu' || e.button === 2:`, e.type === 'contextmenu' || e.button === 2)
        star.attackMoveTargetId = null;
    } else if (hit) {
        console.log(`🚀 ~ file: onClick.js:45 ~ onMouseMove ~ hit:`, hit)
        console.log(`🚀 ~ file: onClick.js:65 ~ onMouseMove ~ lastActiveStar, activeStar:`, lastActiveStar, activeStar)
        // if (lastActiveStar) {
        //     setAttackMoveTarget(lastActiveStar, activeStar)
        //     executeAttackMoveOperations(lastActiveStar, ctx);
        // }
    }
}

function setAttackMoveTarget(star, target) {
    if (target) {

        console.log(`🚀 ~ file: onClick.js:175 ~ setAttackMoveTarget ~ ${star.id}, target ${target.id}:`)
        star.attackMoveTargetId = target.id;
        target.starsThatTargetThisStar.push(star.id);
    }
}

// This function is used to execute the attack move when a star is clicked on.
// It will check if the star is currently in attack move mode. If it is, it will
// draw the canvas arrow to the active star, and set the attack move target id
// and attack move target to the active star.

function executeAttackMoveOperations(star, ctx) {
    let target = "none"
    if (star.attackMoveTargetId) {
        console.log(`🚀 ~ file: onClick.js:287 ~ executeAttackMoveOperations ~ ${star.id}.attackMoveTargetId:`, star.attackMoveTargetId)
        target = getStarById(stars, star.attackMoveTargetId);
        if (target.attackMoveTargetId === star.id) {
            target.attackMoveTargetId = null;
            target.attackMoveTarget = null;
        }
        target.draw(ctx, data, drawHex, getStarById, canvasArrow);
    } else {
        console.log(`🚀 ~ file: onClick.js:197 ~ executeAttackMoveOperations ~ "no attackMove target":`, "no attackMove target")
    }
    console.log(`🚀 ~ file: onClick.js:188 ~ executeAttackMoveOperations ~ ${star.id} target ${target.id}:`)
    star.active = false;
    target ? target.active = true : null;
    star.attackMoveTarget = activeStar;
    star.attackMoveTargetId = activeStar.id;
    star.draw(ctx, data, drawHex, getStarById, canvasArrow);
}

function combinedInputFunction(e) {
    if (e.key) {
        if (e.type === "keydown") {
            onKeyDown(e)
        } else {
            onKeyUp(e)
        }
    } else {
        if (e.type === "mousedown") {
            onMouseDown(e)
        } else {
            onMouseUp(e)
        }
    }
    canvasRedraw();
}

function onKeyDown(e) {
    stars = get(store_stars);
    ctx = get(store_ctx);
    console.log(`🚀 ~ file: onClick.js:16 ~ onKeyDown ~ e`, e.key, e.keyCode)
    activeKey = e;
    store_activeKey.set(activeKey);
    if (e.key === "Escape") {
        stars.forEach((star) => {
            clearStarActiveStates(star, ctx, data, drawHex, getStarById, canvasArrow);
        });
    }
    if (e.key === 'l' || e.keyCode === 76 || e.key === 'L' || e.keyCode === 108) {
        stars.forEach((star) => {
            logStar(star)
        });
    }
    // create a ctrl-click combo to deactive all attackMove operations
    if (e.key === 'Control' || e.keyCode === 17) {
        stars.forEach((star) => {
            clearStarActiveStates(star, ctx, data, drawHex, getStarById, canvasArrow);
            // clearStarDirectives(star, ctx);
        });
    }
}

function onKeyUp(e) {
    console.log(`🚀 ~ file: onClick.js:275 ~ onKeyUp ~ e:`, e.key, e.keyCode)
    activeKey = null;
    store_activeKey.set("none");
}

export { combinedInputFunction };