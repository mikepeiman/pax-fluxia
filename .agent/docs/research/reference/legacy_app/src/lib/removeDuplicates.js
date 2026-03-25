const removeDuplicates = (objArray) => {
    const flag = {};
    const unique = [];
    objArray.forEach((obj) => {
        if (!flag[obj.x + ':' + obj.y]) {
            flag[obj.x + ':' + obj.y] = true;
            unique.push(obj);
        }
    });
    return unique;
};

export default removeDuplicates;

// This is a JavaScript function called removeDuplicates that takes an array of objects as its argument(objArray).The purpose of the function is to remove any duplicate objects from the array based on the values of their x and y properties.

// Here's a step-by-step breakdown of how the function works:

// The function declares a new empty object called flag.This object will be used to keep track of which objects have already been added to the unique array.
// The function declares a new empty array called unique.This array will be used to store the unique objects in the objArray argument.
// The function loops through each object in objArray using the forEach method.
// For each object, the function checks if there is already a property in the flag object with the same value as the object's x and y properties. This is done using the ! (not) operator to check if the property does not exist. If the property does not exist, the function creates a new property in the flag object with the value true.
// The function then pushes the current object into the unique array, since it is the first time it has been encountered.
// If the property already exists in the flag object, this means that the object is a duplicate, so it is not added to the unique array.
// After all objects have been checked, the function returns the unique array, which now contains only the unique objects from the original objArray argument.