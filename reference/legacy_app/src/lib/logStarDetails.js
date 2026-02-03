function logStar(star) {
    logStarId(`star ID:`, `${star.id}`, star);
    logStarDetails(star);
    star.active ? logTrue(`star.active`, `${star.active }`) : logFalse(`star.active`, `${star.active }`)
    star.highlighted ? logTrue(`star.highlighted`, `${star.highlighted }`) : logFalse(`star.highlighted`, `${star.highlighted }`)

}

function logStarId(msg, highlight, obj) {
    console.log(`%c${msg} %c${highlight}`, "color: #33bb00; font-size: 1rem;", "color: #00cc00; font-size: 1rem; font-weight:bold", obj );
}
function logStarDetails(obj) {
    obj.attackMoveTargetId ? console.log(`star.attackMoveTargetId`, `${obj.attackMoveTargetId}`, obj) : null;
}
function logstar2(msg, highlight) {
    console.log(`---   %c${msg} %c${highlight}`, "color: #aa0000; font-size: 1rem;", "color: #aa3300; font-size: 1rem; font-weight:bold" );
}
function logstar3(msg, highlight) {
    console.log(`---   %c${msg} %c${highlight}`, "color: #0000aa; font-size: 1rem;", "color: #0033aa; font-size: 1rem; font-weight:bold" );
}

function logFalse(msg, highlight, obj) {
    console.log(`---   %c${msg} %c${highlight}`, "", "color: #ff00aa; font-size: 1rem; font-weight:bold", obj );
}
function logTrue(msg, highlight, obj) {
    console.log(`---   %c${msg} %c${highlight}`, "", "color: #00ffaa; font-size: 1rem; font-weight:bold" );
}


export { logStar };
