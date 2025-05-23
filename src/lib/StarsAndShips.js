import { data } from "$stores/Data";
import { store_hexCenterCoords, store_ctx, store_stars } from "$stores/stores";
import Star from "./Star";
import Ship from "./Ship";
import getStarById from "./getStarById";
import { drawHex } from "./hexGridFunctions";
import { canvasArrow } from "./canvasArrow";
import { get } from "svelte/store";
let hexCenterCoords = [];
store_hexCenterCoords.subscribe((val) => {
    hexCenterCoords = val;
});
let ctx = null;
let stars = get(store_stars);
store_ctx.subscribe((val) => {
    ctx = val;
});
store_stars.subscribe((val) => {
    stars = val;
});
// write a function that generates stars using random coordinates from hexCenterCoords
function generateStars(data, num) {
    const flag = {};
    for (let i = 0; i < num; i++) {
        hexCenterCoords = get(store_hexCenterCoords);
        let coords =
            hexCenterCoords[
            Math.floor(Math.random() * hexCenterCoords.length)
            ];
        if (!flag[coords.x + ":" + coords.y]) {
            flag[coords.x + ":" + coords.y] = true;
            let starType = Math.floor(Math.random() * data.numTypes);
            let star = new Star(
                `star-${i}`,
                coords.x,
                coords.y,
                starType + data.starRadius,
                starType + 1,
                Math.floor(Math.random() * data.numTypes) *
                (360 / data.numTypes),
                Math.floor(Math.random() * data.shipsMax)
            );
            star.ships = generateShips(star);
            stars = [...stars, star];
        } else {
            i--;
        }
    }
    store_stars.set(stars);
    return stars;
}

function drawStars(stars, ctx, data, animationEngine = null) {
    stars = get(store_stars)
    let starsToggle = data.drawStars;
    let shipsToggle = data.drawShips;
    // if(!stars.length){
    //     stars = generateStars(data, data.numStars);
    // }

    stars.length < data.numStars
        ? (stars = generateStars(data, data.numStars - stars.length))
        : null;
    stars.length > data.numStars
        ? stars.splice(data.numStars, stars.length)
        : null;
    stars.forEach((star) => {
        starsToggle
            ? star.draw(ctx, data, drawHex, getStarById, canvasArrow, animationEngine)
            : null;
        shipsToggle ? drawShips(star) : null;
    });
}

function generateShips(star) {
    let ships = (star.ships = []);
    let numShips = star.numShips;
    for (let i = 0; i < numShips; i++) {
        let ship = addShipToStar(star, i);
        ships.push(ship);
    }
    // setShipOrbits(star)
    drawShips(star);
    return ships;
}

function drawShips(star) {
    let x, y;
    star["ships"].forEach((ship, i) => {
        ship.angle += data.speed;
        x = star.x + Math.cos(ship.angle) * ship.orbit * data.orbitXmod;
        y = star.y + Math.sin(ship.angle) * ship.orbit * data.orbitYmod;
        ship.pos = { x, y };
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = ship.color;
        ctx.lineWidth = 3;
        ctx.strokeStyle = ship.color;
        ctx.stroke();
        ctx.fill();
    });
}

function addShipToStar(star, i) {
    // Enhanced ship creation with type variety
    let shipType = Math.floor(Math.random() * 4) + 1; // Random ship type 1-4
    let radius = data.shipRadius;
    let orbit = star.radius + data.shipRadius * 3 + (i * 2); // Vary orbit by index
    let angle = (2 * Math.PI * i) / star.numShips;

    // Create ship with enhanced properties
    let ship = new Ship(radius, null, orbit, angle, shipType);
    return ship;
}

export { drawStars, drawShips, generateShips, generateStars };
