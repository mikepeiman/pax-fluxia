function getStarById(id) {
    return stars.filter((star) => star.id === id)[0];
}

export default getStarById;