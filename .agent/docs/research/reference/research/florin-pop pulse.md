The HTML
The HTML markup is simple, just a div:

<div class="blob"></div>
A single div with a .blob class, as we use this to target it in the CSS.

The CSS
Let’s start with some basic CSS first:

.blob {
    background: black;
    border-radius: 50%;
    margin: 10px;
    height: 20px;
    width: 20px;
}
This will create a little black blob (or circle if you wish). And now for the fun part, let’s create the animation:

.blob {
    background: black;
    border-radius: 50%;
    margin: 10px;
    height: 20px;
    width: 20px;

    box-shadow: 0 0 0 0 rgba(0, 0, 0, 1);
    transform: scale(1);
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.7);
    }

    70% {
        transform: scale(1);
        box-shadow: 0 0 0 10px rgba(0, 0, 0, 0);
    }

    100% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
    }
}
As you can see, we declared a @keyframes named pulse which has 3 selectors: 0%, 70%, 100%.

Initially we have the box-shadow be full opacity of 1 (the 4th attribute on the rgba), but already at the 70% mark we make it invisible - 0. At the same time the spread property on the box-shadow becomes 10px and then it will get back to 0 at the 100% mark. Read more about the box-shadow property.

Also, we play with the scale property as this will make the blob shrink and grow back gently, adding a little effect.

At the end we add this animation to the .blob class and we set it to run every 2 seconds an infinite amount of times.

Conclusion
Simple yet powerful effect as it will get your visitors attention to the element on the page that you want to be highlighted.

I hope you like it! Let me know where you’ll use this effect!

Happy coding! 😇