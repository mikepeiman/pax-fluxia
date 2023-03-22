function getStarById(stars, id) {
    console.log(`🚀 ~ file: getStarById.js:2 ~ getStarById ~ stars:`, stars)
    if(stars.length){

        return stars.filter((star) => star.id === id)[0];
    }
}

export default getStarById;