Introduction#
This is the second part of an introduction to WebGL shaders. If you've not read Part 1 or my introduction to using Three.js you may be lost so it's worth stopping here and going back if you've not read those.

When we left the last article we had a pink sphere which is a pretty fine start to the world of shaders. Now what I'd like to do is jump in to creating something a bit more entertaining.

We are going to spend a bit of time adding in an animation loop, vertex attributes and a uniform. We'll also add in a varying variable so that the vertex shader can send some data to the fragment shader. The end result is that our sphere that was pink is going to appear to be lit from above and to the side and is going to pulsate. It's kind of trippy, but hopefully it will lead you to a good understanding of the three variable types as well as how they relate to each other and the underlying geometry. Of course we'll be setting stuff up in Three.js, so that will be our framework of choice for this article.

A Fake Light#
Let's update the colouring so it's not a flat shaded object. We could take a look at how Three.js handles lighting, but as I'm sure you can appreciate it's more complex than we need right now, so we're going to fake it. You should totally look through the fantastic shaders that are a part of Three.js, and also the ones from the recent amazing WebGL project by Chris Milk and Google, Rome.

Back to our shaders. We'll update our Vertex Shader to provide each vertex normal to the Fragment Shader. We do this with a varying:

// create a shared variable for the
// VS and FS containing the normal
varying vec3 vNormal;

void main() {

  // set the vNormal value with
  // the attribute value passed
  // in by Three.js
  vNormal = normal;

  gl_Position = projectionMatrix *
                modelViewMatrix *
                vec4(position, 1.0);
}
In the Fragment Shader we're going to set up the same variable name and then use the dot product of the vertex normal with a vector that represents a light shining from above and to the right of the sphere. The net result of this gives us an effect similar to a directional light in a 3D package.

// same name and type as VS
varying vec3 vNormal;

void main() {

  // calc the dot product and clamp
  // 0 -> 1 rather than -1 -> 1
  vec3 light = vec3(0.5, 0.2, 1.0);

  // ensure it's normalized
  light = normalize(light);

  // calculate the dot product of
  // the light to the vertex normal
  float dProd = max(0.0,
                    dot(vNormal, light));

  // feed into our frag colour
  gl_FragColor = vec4(dProd, // R
                      dProd, // G
                      dProd, // B
                      1.0);  // A

}
See it running

So the reason the dot product works is that given two vectors it comes out with a number that tells you how "similar" the two vectors are. With normalised vectors, if they point in exactly the same direction, you get a value of 1. If they point in opposite directions you get a -1. What we do is take that number and apply it to our lighting. So a vertex in the top right will have a value near or equal to 1, i.e. fully lit, whereas a vertex on the side would have a value near 0 and round the back would be -1. We clamp the value to 0 for anything negative, but when you plug the numbers in you end up with the basic lighting we're seeing.

What's next? Well it would be nice to maybe try messing with some vertex positions.

Attributes#
What I'd like us to do now is attach a random number to each vertex via an attribute. We'll use this number to push the vertex out along its normal. The net result will be some kind of weird spike ball that will change every time you refresh the page. It won't be animated just yet (that happens next) but a few refreshes will show you it's randomised.

Let's start by adding in the attribute to the vertex shader:

attribute float displacement;
varying vec3 vNormal;

void main() {

  vNormal = normal;

  // push the displacement into the
  // three slots of a 3D vector so
  // it can be used in operations
  // with other 3D vectors like
  // positions and normals
  vec3 newPosition = position +
    normal * vec3(displacement);

  gl_Position = projectionMatrix *
                modelViewMatrix *
                vec4(newPosition, 1.0);
}
See it running

You'll see that not a lot has changed. This is because the attribute hasn't been set up in the MeshShaderMaterial so effectively the shader uses a zero value instead. It's kind of like a placeholder right now. In a second we'll add the attribute to the MeshShaderMaterial in the JavaScript and Three.js will tie the two together for us automatically.

Also of note is the fact that I had to assign the updated position to a new vec3 variable because the original attribute, like all attributes, is read only.

Updating the Material#
Let's hop straight into updating our MeshShaderMaterial with the attribute needed to power our displacement. A reminder: attributes are per-vertex values so we need one value per vertex in our sphere. Like this:

var attributes = {
  displacement: {
    type: 'f', // a float
    value: [] // an empty array
  }
};

var vShader = $('#vertexshader');
var fShader = $('#fragmentshader');

// create the material and now
// include the attributes property
var shaderMaterial =
  new THREE.MeshShaderMaterial({
    attributes:     attributes,
    vertexShader:   vShader.text(),
    fragmentShader: fShader.text()
  });

// now populate the array of attributes
var verts =
  sphere.geometry.vertices;

var values =
  attributes.displacement.value;

for (var v = 0; v < verts.length; v++) {
  values.push(Math.random() * 30);
}
See it running

With that in place you should be seeing a mangled sphere, but the cool thing is that all the displacement is happening on the GPU.

Animating That Sucker#
We should totally make this animate. How do we do it? Well there are two
things we need to get in place:

A uniform to animate how much displacement should be applied in each frame. We can use sine or cosine for that since they run from -1 to 1
An animation loop in the JS
We're going to add the uniform to both the MeshShaderMaterial and the Vertex Shader. First the Vertex Shader:

uniform float amplitude;
attribute float displacement;
varying vec3 vNormal;

void main() {

  vNormal = normal;

  // multiply our displacement by
  // the amplitude. The amp will
  // get animated so we'll have
  // animated displacement
  vec3 newPosition =
    position + normal *
    vec3(displacement * amplitude);

  gl_Position = projectionMatrix *
                modelViewMatrix *
                vec4(newPosition, 1.0);
}
Next we update the MeshShaderMaterial:

// add a uniform for the amplitude
var uniforms = {
  amplitude: {
    type: 'f', // a float
    value: 0
  }
};

var vShader = $('#vertexshader');
var fShader = $('#fragmentshader');

// create the final material
var shaderMaterial =
    new THREE.MeshShaderMaterial({
      uniforms:       uniforms,
      attributes:     attributes,
      vertexShader:   vShader.text(),
      fragmentShader: fShader.text()
    });
See it running

Our shaders are done for now. But we would appear to have taken a step backwards. This is largely because our amplitude value is at 0 and since wemultiply that with the displacement we're seeing nothing change. We also haven't set up the animation loop so we never see that 0 change to anything else.

In our JavaScript we now need to wrap up the render call into a function and then use requestAnimationFrame to call it. In there we also need to update the uniform's value.

var frame = 0;
function update() {

  // update the amplitude based on
  // the frame value.
  uniforms.amplitude.value =
    Math.sin(frame);

  // update the frame counter
  frame += 0.1;

  renderer.render(scene, camera);

  // set up the next call
  requestAnimFrame(update);
}

requestAnimFrame(update);