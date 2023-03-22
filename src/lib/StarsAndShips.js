import data from "$lib/Settings";
// import hexCenterCoords from stores
import { store_hexCenterCoords, store_ctx } from "$stores/stores";
let hexCenterCoords = [];
store_hexCenterCoords.subscribe((val) => {
    hexCenterCoords = val;
});
let ctx = null;
let stars = [];
store_ctx.subscribe((val) => {
    ctx = val;
});
import Star from "./Star";
import Ship from "./Ship";
import getStarById from "./getStarById";
import { drawHex } from "./HexGridFunctions";
import { canvas_arrow } from "./canvas-arrow";
import { store_stars } from "$stores/stores";
store_stars.subscribe((val) => {
    stars = val;
});
// write a function that generates stars using random coordinates from hexCenterCoords
function generateStars(data, num) {
    const flag = {};
    for (let i = 0; i < num; i++) {
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

function drawStars(stars, ctx, data) {
    let starsToggle = data.drawShips;
    let shipsToggle = data.drawStars;
    if(!stars.length){
        stars = generateStars(data, data.numStars);
    }

    stars.length < data.numStars
        ? (stars = generateStars(data, data.numStars - stars.length))
        : null;
    stars.length > data.numStars
        ? stars.splice(data.numStars, stars.length)
        : null;
    stars.forEach((star) => {
        starsToggle
            ? star.draw(ctx, data, drawHex, getStarById, canvas_arrow)
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
        x = star.x + Math.cos(ship.angle) * ship.orbit * data.orbitYmod;
        y = star.y + Math.sin(ship.angle) * ship.orbit * data.orbitYmod;
        ship.pos = { x, y };
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        // ctx.fillStyle = ship.color;
        ctx.lineWidth = 1;
        ctx.strokeStyle = ship.color;
        ctx.stroke();
        // ctx.fill();
    });
}

function addShipToStar(star, i) {
    // let color = `hsla(${star.hue + Math.random() * i}, ${
    // 	Math.random > 0.5 ? 50 + Math.random() * i * 5 : 50 - Math.random() * i
    // }%, ${Math.random > 0.5 ? 75 + Math.random() * i * 5 : 50 - Math.random() * i}%, ${
    // 	Math.random > 0.5 ? Math.random() + 0.25 : Math.random() - 0.25
    // })`;
    let color = `hsla(${star.hue}, 50%, 80%, 0.25)`;
    let radius = data.shipRadius;
    let orbit = star.radius + data.shipRadius * 3;
    let angle = (2 * Math.PI * i) / star.numShips;
    // let orbit = star.radius + data.shipRadius + 3;
    // let orbit = star.radius + i ;
    // let orbit = star.radius + i % 2
    // let orbit = star.radius + i % (data.shipRadius + 3);
    // let orbit = star.radius + i % 2 * (data.shipRadius + 3);
    let ship = new Ship(radius, color, orbit, angle);
    return ship;
}

export { drawStars, drawShips, generateShips, generateStars };