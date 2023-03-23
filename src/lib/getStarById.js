function getStarById(stars, id) {
    if(stars.length){
        return stars.filter((star) => star.id === id)[0];
    }
}

export default getStarById;