/**
 * RenderWebGL.js
 *
 * Depends on Common.js, Render.js, glMatrix.js, webgl-utils.js
 */

RenderWebGL.prototype = new Render();
RenderWebGL.prototype.constructor = RenderWebGL;

/**
 * creates WebGL render and defines its fields
 *
 * @returns {RenderWebGL}
 */
function RenderWebGL() {
    // WebGL context
    this.gl = null;

    // shader state
    this.currentClearColor = null;
    this.currentAlphaAdditive = null;

    // textures cache
    this.textures = null;
    this.temporaryTextures = null;

    // array buffers (both dynamic and static)
    this.arrays = null;
    this.lineVerticesArray = new Float32Array(2 * 2);
    this.rectVerticesArray = new Float32Array(2 * 4);
    this.trisVerticesArray = new Float32Array(2 * 3);
    this.imageVerticesArray = new Float32Array(2 * 4);
    this.imageCoordinatesArray = new Float32Array(2 * 4);
    this.polyVerticesArray = new Float32Array(2 * 3);
    this.polyCoordinatesArray = new Float32Array(2 * 3);
    this.clipArray = new Float32Array(2 * 2);
    this.tileVerticesArray = new Float32Array(2 * 6);
    this.tileCoordinatesArray = new Float32Array(2 * 6);
    this.filledTrisArray = new Float32Array(2 * 6);
    this.filledRectColorsArray = new Float32Array(4 * 4);

    // WebGL buffers
    this.verticesBuffer = null;
    this.coordinatesBuffer = null;
    this.colorsBuffer = null;

    // image cache
    this.imageCache = null;

    // render layers
    this.layers = null;
    this.isDrawFullLayer = false;

    // model-view matrix
    this.modelView = null;

    // shaders
    this.currentShader = null;
    this.noTextureShader = null;
    this.gradientShader = null;
    this.alphaShader = null;
    this.tintShader = null;
    this.cachingShader = null;
    this.alphaPaddingShader = null;
    this.tintPaddingShader = null;
    this.layerShader = null;

    // system canvas
    this.systemCanvas = null;
    this.systemContext = null;
}

/**
 * creates WebGL and resets state
 *
 * @param canvas is an HTMLCanvasElement
 */
RenderWebGL.prototype.initGL = function(canvas) {
    assert(canvas instanceof HTMLCanvasElement, "HTML canvas expected");
    this.gl = WebGLUtils.create3DContext(canvas, { alpha: true, antialias: false });
    if (this.gl == null) {
        throw new RenderException("WebGL: failed to create context");
    }
    // reset state
	this.canvas = this.gl;
    this.clips = [];
    this.currentClearColor = null;
    this.currentAlphaAdditive = null;
    this.textures = {};
    this.temporaryTextures = [];
    this.arrays = {};
    this.verticesBuffer = null;
    this.textureBuffer = null;
    this.imageCache = null;
    this.layers = [];
    // create model-view matrix
    this.modelView = mat4.create();
};

/**
 * compiles a shader code
 *
 * @param isVertex distinguishes between vertex and fragment shaders
 * @param code is shader code
 * @returns created shader
 */
RenderWebGL.prototype.createShader = function(isVertex, code) {
    var shader;
    if (isVertex) {
        shader = this.gl.createShader(this.gl.VERTEX_SHADER);
    } else {
        shader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    }

    this.gl.shaderSource(shader, code);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
        throw new RenderException("WebGL: failed to compiler shader = " +
                                    this.gl.getShaderInfoLog(shader));
    }
    return shader;
};

/**
 * compiles shader programs and binds their attributes and uniforms
 *
 * @param vertex is a shader
 * @param fragment is a shader
 * @param attributes is list of shader attribute names
 * @param uniforms is list of shader uniform names
 * @returns compiled shader program
 */
RenderWebGL.prototype.initShader = function(vertex, fragment, attributes, uniforms) {
    var vertexShader = this.createShader(true, vertex);
    var fragmentShader = this.createShader(false, fragment);

    var shaderProgram = this.gl.createProgram();
    this.gl.attachShader(shaderProgram, vertexShader);
    this.gl.attachShader(shaderProgram, fragmentShader);
    this.gl.linkProgram(shaderProgram);

    if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
        throw new RenderException("WebGL: failed to link shaders");
    }

    this.gl.useProgram(shaderProgram);

    // set attributes
    var i;
    shaderProgram.vertexAttributes = [];
    for (i = 0; i < attributes.length; i++) {
        var attribute = attributes[i] + "Attribute";
        shaderProgram[attribute] = this.gl.getAttribLocation(shaderProgram, attributes[i]);
        shaderProgram.vertexAttributes.push(attribute);
    }

    // set uniforms
    for (i = 0; i < uniforms.length; i++) {
        var uniform = uniforms[i] + "Uniform";
        shaderProgram[uniform] = this.gl.getUniformLocation(shaderProgram, uniforms[i]);
    }

    return shaderProgram;
};

/**
 * defines WebGL buffers that are reused by multiple calls to draw methods
 */
RenderWebGL.prototype.initBuffers = function() {
    this.verticesBuffer = this.gl.createBuffer();
    this.verticesBuffer.itemSize = 2;
    this.coordinatesBuffer = this.gl.createBuffer();
    this.coordinatesBuffer.itemSize = 2;
    this.colorsBuffer = this.gl.createBuffer();
    this.colorsBuffer.itemSize = 4;
};

/**
 * initializes the render, the black screen is drawn
 *
 * @param canvas is an HTML canvas element
 * @param vertex is a list of vertex shader programs (strings)
 * @param fragment is a list of fragment shader programs (strings)
 */
RenderWebGL.prototype.initialize = function(canvas, vertex, fragment) {
    assert(vertex.length == 8 && fragment.length == 8, "invalid number of shaders");
    // initialize graphics data
    this.initGL(canvas);
    this.noTextureShader = this.initShader(vertex[0], fragment[0], ["aPosition"], ["uMVMatrix", "uColor", "uPremultiplied"]);
    this.gradientShader = this.initShader(vertex[1], fragment[1], ["aPosition", "aColor"], ["uMVMatrix", "uPremultiplied"]);
    this.alphaShader =
        this.initShader(vertex[2], fragment[2],
                ["aPosition", "aTextureCoordinates"], ["uMVMatrix", "uColor", "uTexture", "uPremultiplied"]);
    this.tintShader =
        this.initShader(vertex[3], fragment[3],
                ["aPosition", "aTextureCoordinates"], ["uMVMatrix", "uColor", "uTexture", "uPremultiplied"]);
    this.cachingShader =
      this.initShader(vertex[4], fragment[4],
              ["aPosition", "aTextureCoordinates"], ["uMVMatrix", "uTexture"]);
    this.alphaPaddingShader =
        this.initShader(vertex[5], fragment[5],
                ["aPosition", "aTextureCoordinates"], ["uMVMatrix", "uColor", "uTexture", "uClip", "uPremultiplied"]);
    this.tintPaddingShader =
        this.initShader(vertex[6], fragment[6],
                ["aPosition", "aTextureCoordinates"], ["uMVMatrix", "uColor", "uTexture", "uClip", "uPremultiplied"]);
    this.layerShader =
        this.initShader(vertex[7], fragment[7],
                ["aPosition", "aTextureCoordinates"], ["uMVMatrix", "uTexture", "uOffset"]);
    // initialize buffers and create image cache
    this.initBuffers();
    this.imageCache = new RenderWebGLImageCache(this);
    // enable blending
    this.gl.enable(this.gl.BLEND);
    // disable scissor testing
    this.updateScissor();
    // prepare screen
    this.reset(canvas.width, canvas.height);
};

/**
 * switch to another shader (keeps in minds redundant switches)
 *
 * @param shader is program to switch to
 * @param additive is blending mode, defaults to false
 */
RenderWebGL.prototype.activateShader = function(shader, additive) {
    assert(shader !== undefined && shader !== null);
    // shader
    if (this.currentShader != shader) {
        // flush image cache when we step off the caching shader
        if (this.currentShader == this.cachingShader) {
            this.imageCache.flush();
        }
        // reset attributes counter
        var i, attributes;
        // disable attributes of the previous shader
        if (this.currentShader != null) {
            attributes = this.currentShader.vertexAttributes;
            for (i = 0; i < attributes.length; i++) {
                this.gl.disableVertexAttribArray(this.currentShader[attributes[i]]);
            }
        }
        this.currentShader = null;
        // activate new shader
        this.gl.useProgram(shader);
        // set model-view matrix
        this.gl.uniformMatrix4fv(shader.uMVMatrixUniform, false, this.modelView);
        // set premultiplied alpha mode
        if (shader.uPremultipliedUniform != null) {
            this.gl.uniform1i(shader.uPremultipliedUniform, !this.frontToBack);
        }
        // enable attributes of the new shader
        attributes = shader.vertexAttributes;
        for (i = 0; i < attributes.length; i++) {
            this.gl.enableVertexAttribArray(shader[attributes[i]]);
        }
        // prevent from redundant re-initializations
        this.currentShader = shader;
    }
    // blending
    additive = additive === true;
    if (this.currentAlphaAdditive != additive) {
        var src = this.frontToBack ? this.gl.SRC_ALPHA_SATURATE : this.gl.ONE;
        var dst = this.frontToBack ? this.gl.ONE : this.gl.ONE_MINUS_SRC_ALPHA;
        this.gl.blendFunc(src, dst);
        this.currentAlphaAdditive = additive;
    }
};

/**
 * binds a texture
 *
 * @param shader is a WebGLProgram
 * @param texture is a WebGLTexture
 */
RenderWebGL.prototype.bindTexture = function(shader, texture) {
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.uniform1i(shader.uTextureUniform, 0);
};

/**
 * binds attribute to shader for drawing
 *
 * @param attribute is a WebGL shader attribute object
 * @param buffer is WebGL buffer
 * @param array is a Float32Array filled with data, optional
 * @param isStatic determines between static and stream draw methods for a buffer
 */
RenderWebGL.prototype.bindAttribute = function(attribute, buffer, array, isStatic) {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    if (array != null) {
        this.gl.bufferData(this.gl.ARRAY_BUFFER, array, isStatic ? this.gl.STATIC_DRAW : this.gl.STREAM_DRAW);
    }
    this.gl.vertexAttribPointer(attribute, buffer.itemSize, this.gl.FLOAT, false, 0, 0);
};

/**
 * gives number of vertices in an array
 *
 * @param array is a Float32Array
 * @returns number
 */
RenderWebGL.prototype.vertexCount = function (array) {
    return array.length / 2;
};

/**
 * sets color uniform value
 *
 * @param shader is an OpenGL shader program
 * @param color is a Pixel32 instance
 */
RenderWebGL.prototype.setColor = function(shader, color) {
    assert(color instanceof Pixel32, "Pixel32 instance expected");
    this.gl.uniform4fv(shader.uColorUniform, color.normalized);
};

/**
 * resolves a texture from texture cache or unpacks a new one
 *
 * @param image is a HTMLImageElement or HTMLCanvasElement instance
 * @returns texture
 */
RenderWebGL.prototype.resolveTexture = function(image) {
    var isImage = image instanceof HTMLImageElement;
    var texture = isImage ? this.textures[image.src] : null;
    if (texture == null) {
        texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
        if (!this.frontToBack) {
            this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        }
        // load the texture
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        // map texture
        if (isImage) {
            this.textures[image.src] = texture;
        } else {
            this.temporaryTextures.push(texture);
        }
    }
    return texture;
};

/**
 * creates or fetches from cache the RenderWebGLTileLayer which corresponds to RenderLayer
 *
 * @param layer is a RenderLayer
 */
RenderWebGL.prototype.resolveLayer = function(layer) {
    // try to find the layer in cache
    var i, found = null;
    for (i = 0; i < this.layers.length && (found == null); i++) {
        if (this.layers[i].layer == layer) {
            found = this.layers[i];
        }
    }
    // create a new layer if necessary
    if (found == null) {
        if (layer instanceof RenderTileLayer) {
            found = new RenderWebGLTileLayer(this, layer);
        } else if (layer instanceof RenderSpriteLayer) {
            found = new RenderWebGLSpriteLayer(this, layer);
        } else {
            assert(false);
        }
        // populate vertices and texture coordinates
        found.populate();
        // push the layer
        this.layers.push(found);
    }
    return found;
};

/* 
 * Public methods
 */

/**
 * frees cached textures
 */
RenderWebGL.prototype.evict = function() {
    assert(this.textures != null);
    // remove all bound textures
    for (var src in this.textures) {
        var texture = this.textures[src];
        if (texture instanceof WebGLTexture) {
            this.gl.deleteTexture(texture);
        }
    }
    this.textures = {};
    // remove all layer buffers along with layers
    while (this.layers.length > 0) {
        this.layers.pop().remove();
    }
};

/**
 * notifies the renderer that the frame has been drawn
 */
RenderWebGL.prototype.flush = function() {
	this.calls = 0;
    // flush the image cache
    this.imageCache.flush();
    // flush the frame
    this.gl.flush();
    // remove temporary textures (these are used to render text)
    while (this.temporaryTextures.length > 0) {
        this.gl.deleteTexture(this.temporaryTextures.pop());
    }
};

/**
 * clears the drawing area
 *
 * @param color is an optional Pixel32 instance, default color is transparent
 */
RenderWebGL.prototype.clear = function(color) {
    assert(color !== null);
    if (color === undefined ) {
        color = this.transparent;
    }
    if (!color.equal(this.currentClearColor)) {
        var c = color.normalized;
        this.gl.clearColor(c[0], c[1], c[2], c[3]);
        this.currentClearColor = color;
    }
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
};

/**
 * This is called from the display if it changes it's internal resolution.
 * virtual void Reset(int w, int h)  { }
 */
RenderWebGL.prototype.reset = function(w, h) {
    Render.prototype.reset.call(this, w, h);
    // initialize model-view matrix and clear drawing area
    mat4.ortho(0, w, h, 0, -1, 1, this.modelView);
    // clear view port
    this.gl.viewport(0, 0, w, h);
    this.clear();
};

/*
 * Drawing methods
 */

/*
 * 1D primitives
 */

/**
 * draws a line
 *
 * @param x0 is integer, >= 0
 * @param y0 is integer, >= 0
 * @param x1 is integer, >= 0
 * @param y1 is integer, >= 0
 * @param color is a Pixel32 instance
 */
RenderWebGL.prototype.drawLine = function(x0, y0, x1, y1, color) {
    assert(color instanceof Pixel32);
    // define the line
    this.lineVerticesArray[0] = x0;
    this.lineVerticesArray[1] = y0;
    this.lineVerticesArray[2] = x1;
    this.lineVerticesArray[3] = y1;
    this.scale(this.lineVerticesArray);

    // draw the rectangle
    this.activateShader(this.noTextureShader);

    this.setColor(this.noTextureShader, color);
    this.bindAttribute(this.noTextureShader.aPositionAttribute, this.verticesBuffer, this.lineVerticesArray);

    this.gl.drawArrays(this.gl.LINE_STRIP, 0, this.vertexCount(this.lineVerticesArray));
};

/**
 * draws a circle
 *
 * @param xCenter is integer, >= 0
 * @param yCenter is integer, >= 0
 * @param radius is integer, >= 0
 * @param color is a Pixel32 instance
 */
RenderWebGL.prototype.drawCircle = function(xCenter, yCenter, radius, color) {
    // create circle approximation vertices and colors
    with (Math) {
		var piX2 = 2 * PI;
		var slices = radius * PI;
        var da = 2 * PI / slices, size = ceil(slices) * 2;
        if (size > 2 * 2) {
            var vertices = this.array("circleVerticesArray", size);
            var a, i;
            for (a = 0.0, i = 0; a < piX2; a += da) {
                var x = xCenter + radius * cos(a);
                var y = yCenter + radius * sin(a);
                vertices[i++] = x;
                vertices[i++] = y;
            }
            this.scale(vertices);

            // draw the circle
            this.activateShader(this.noTextureShader);

            this.setColor(this.noTextureShader, color);
            this.bindAttribute(this.noTextureShader.aPositionAttribute, this.verticesBuffer, vertices);

            this.gl.drawArrays(this.gl.LINE_LOOP, 0, this.vertexCount(vertices));
        }
    }
};

/**
 * draws a rectangle
 *
 * @param x0 is integer, >= 0
 * @param y0 is integer, >= 0
 * @param x1 is integer, >= 0
 * @param y1 is integer, >= 0
 * @param color is a Pixel32 instance
 */
RenderWebGL.prototype.drawRect = function(x0, y0, x1, y1, color) {
    // define lines
    this.rectVerticesArray[0] = x0; this.rectVerticesArray[1] = y0;
    this.rectVerticesArray[2] = x1; this.rectVerticesArray[3] = y0;
    this.rectVerticesArray[4] = x1; this.rectVerticesArray[5] = y1;
    this.rectVerticesArray[6] = x0; this.rectVerticesArray[7] = y1;
    this.scale(this.rectVerticesArray);

    // draw the rectangle
    this.activateShader(this.noTextureShader);

    this.setColor(this.noTextureShader, color);
    this.bindAttribute(this.noTextureShader.aPositionAttribute, this.verticesBuffer, this.rectVerticesArray);

    this.gl.drawArrays(this.gl.LINE_LOOP, 0, this.vertexCount(this.rectVerticesArray));
};

/**
 * Draws a filled rectangle. If 2 colors are specified then it will make a gradient from the top to the bottom.
 *
 * @param x0 is the x coordinate for the upper left corner
 * @param y0 is the y coordinate for the upper left corner
 * @param x1 is the x coordinate for the lower right corner
 * @param y1 is the y coordinate for the lower right corner
 * @param colorA is a Pixel32 instance
 * @param colorB optional Pixel32 instance
 */
RenderWebGL.prototype.drawFilledRect = function(x0, y0, x1, y1, colorA, colorB) {
    assert(colorA instanceof Pixel32);
	if(this.calls++ > this.maxCalls) return;
    // define lines
    this.rectVerticesArray[0] = x0; this.rectVerticesArray[1] = y0;
    this.rectVerticesArray[2] = x1; this.rectVerticesArray[3] = y0;
    this.rectVerticesArray[4] = x0; this.rectVerticesArray[5] = y1;
    this.rectVerticesArray[6] = x1; this.rectVerticesArray[7] = y1;
    this.scale(this.rectVerticesArray);

    // minimize shader switches
    if (colorB === undefined) {
        this.activateShader(this.noTextureShader);
        this.setColor(this.noTextureShader, colorA);
        this.bindAttribute(this.noTextureShader.aPositionAttribute, this.verticesBuffer, this.rectVerticesArray);
    } else {
        // fill colors
        this.filledRectColorsArray.set(colorA.normalized, 0);
        this.filledRectColorsArray.set(colorA.normalized, 4);
        this.filledRectColorsArray.set(colorB.normalized, 8);
        this.filledRectColorsArray.set(colorB.normalized, 12);

        this.activateShader(this.gradientShader);
        this.bindAttribute(this.gradientShader.aPositionAttribute, this.verticesBuffer, this.rectVerticesArray);
        this.bindAttribute(this.gradientShader.aColorAttribute, this.colorsBuffer, this.filledRectColorsArray);
    }

    // draw filled rectangle
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.vertexCount(this.rectVerticesArray));
};

/**
 * draws a quadruple
 *
 * @param vertices is array of four (x,y) coordinates
 * @param color is a Pixel32 instance
 */
RenderWebGL.prototype.drawQuad = function(vertices, color) {
    assert(vertices.length == 2 * 4, "invalid number of vertices");
    // define lines
    this.rectVerticesArray.set(vertices);
    this.scale(this.rectVerticesArray);

    // draw the rectangle
    this.activateShader(this.noTextureShader);

    this.setColor(this.noTextureShader, color);
    this.bindAttribute(this.noTextureShader.aPositionAttribute, this.verticesBuffer, this.rectVerticesArray);

    this.gl.drawArrays(this.gl.LINE_LOOP, 0, this.vertexCount(this.rectVerticesArray));
};

/**
 * draws n triangle shapes
 *
 * @param vertices is array of 3*n (x,y) coordinates
 * @param color is a Pixel32 instance
 */
RenderWebGL.prototype.drawTris = function(vertices, color) {
    assert(vertices.length % 6 == 0, "invalid number of vertices - they do not define a series of triangles");

    // draw a bunch of triangles
    this.activateShader(this.noTextureShader);

    var i, j;
    for (i = 0; i < vertices.length; i += 6) {
        // copy single triangle
        for (j = 0; j < 6; j++) {
            this.trisVerticesArray[j] = vertices[i + j];
        }
        this.scale(this.trisVerticesArray);

        this.setColor(this.noTextureShader, color);
        this.bindAttribute(this.noTextureShader.aPositionAttribute, this.verticesBuffer, this.trisVerticesArray);

        this.gl.drawArrays(this.gl.LINE_LOOP, 0, this.vertexCount(this.trisVerticesArray));
    }
};

/**
 * draws n filled triangles
 *
 * @param vertices is array of 3*n (x,y) coordinates
 * @param color is a Pixel32 instance
 */
RenderWebGL.prototype.drawFilledTris = function(vertices, color) {
    assert(vertices.length % 6 == 0, "invalid number of vertices - they do not define a series of triangles");
    // scale vertices
    var vertices = this.array("trisVerticesArray", vertices);
    this.scale(vertices);

    // draw a bunch of triangles
    this.activateShader(this.noTextureShader);

    this.setColor(this.noTextureShader, color);
    this.bindAttribute(this.noTextureShader.aPositionAttribute, this.verticesBuffer, vertices);

    this.gl.drawArrays(this.gl.TRIANGLES, 0, this.vertexCount(vertices));
};

/*
 * Image drawing
 */

/**
 * draws an image
 *
 * @param img is an EMBImage instance
 * @param x is coordinate, 0..width
 * @param y is coordinate, 0..height
 * @param angle is a float in radians, optional
 * @param centered is boolean, image center is put in (x,y), optional
 * @param alpha is in 0..1, default is 1, ignored if tint is in place, optional
 * @param tint is a Pixel32, used for mixing, optional
 * @param flipped is boolean, image is inverted relative to y axe, optional
 */
RenderWebGL.prototype.drawImage = function(img, x, y, angle, centered, alpha, tint, flipped) {
	if(this.calls++ > this.maxCalls) return;
    // alpha and tint
    var color;
    var shader = null;
    var isCacheable = false;
    if (tint != null) {
        color = tint;
        shader = this.tintShader;
    } else if (alpha != null && alpha != 1.0) {
        color = new Pixel32(255, 255, 255, alpha * 255);
        shader = this.alphaShader;
    } else {
        color = this.white;
        shader = this.alphaShader;
        isCacheable = this.isCacheable(img);
    }

    // vertices coordinates
    this.move(this.imageVerticesArray, img, x, y, centered, flipped);
	if (angle != null && angle != 0) this.rotate(this.imageVerticesArray, img, angle, flipped);
    this.scale(this.imageVerticesArray);

    if (this.isVisible(this.imageVerticesArray, angle)) {
        // texture coordinates
        var u0 = this.textureX(img, 0), v0 = this.textureY(img, 0);
        var u1 = this.textureX(img, img.width), v1 = this.textureY(img, img.height);
        this.expand(this.imageCoordinatesArray, u0, v0, u1, v1, flipped);

        // try to cache the draw call
        if (isCacheable) {
            this.activateShader(this.cachingShader);
            this.imageCache.append(img.image, this.imageVerticesArray, this.imageCoordinatesArray);
        } else {
            // draw the image
            this.activateShader(shader);

            this.setColor(shader, color);
            var texture = this.resolveTexture(img.image);
            this.bindTexture(shader, texture);
            this.bindAttribute(shader.aPositionAttribute, this.verticesBuffer, this.imageVerticesArray);
            this.bindAttribute(shader.aTextureCoordinatesAttribute, this.coordinatesBuffer, this.imageCoordinatesArray);

            this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.vertexCount(this.imageVerticesArray));
        }
    }
};

/**
 * draws image on a polygon
 *
 * @param img is an EMBImage instance
 * @param xy is a polygon of pixel coordinates (2x3)
 * @param uv is a polygon of in-picture coordinates (0.0..1.0) (2x3)
 * @param tint is a Pixel32, used for mixing, optional
 */
RenderWebGL.prototype.drawTriangleImage = function(img, xy, uv, tint) {
    assert(xy.length == 6 && uv.length == 6, "polygon expected");

    // alpha and tint
    var color;
    var shader = null;
    if (tint == null) {
        color = this.white;
        shader = this.alphaPaddingShader;
    } else {
        color = tint;
        shader = this.tintPaddingShader;
    }

    // vertices
    this.polyVerticesArray.set(xy);
    this.scale(this.polyVerticesArray);

    // texture coordinates [u0, v0, u1, v0, u0, v1]
    for (var i = 0; i < uv.length; i++) {
        if (i % 2 == 0) {
            this.polyCoordinatesArray[i] = this.textureX(img, uv[i], true);
        } else {
            this.polyCoordinatesArray[i] = this.textureY(img, uv[i], true);
        }
    }

    // texture clip
    this.clipArray[0] = this.textureX(img, 0, false);
    this.clipArray[1] = this.textureY(img, 0, false);
    this.clipArray[2] = this.textureX(img, img.width, false);
    this.clipArray[3] = this.textureY(img, img.height, false);

    // draw the image
    this.activateShader(shader);

    this.setColor(shader, color);
    var texture = this.resolveTexture(img.image);
    this.bindTexture(shader, texture);
    this.gl.uniform4fv(shader.uClipUniform, this.clipArray);
    this.bindAttribute(shader.aPositionAttribute, this.verticesBuffer, this.polyVerticesArray);
    this.bindAttribute(shader.aTextureCoordinatesAttribute, this.coordinatesBuffer, this.polyCoordinatesArray);

    this.gl.drawArrays(this.gl.TRIANGLES, 0, this.vertexCount(this.polyVerticesArray));
};

/**
 * draws a particle
 *
 * @param img is an EMBImage instance
 * @param x is coordinate, 0..width
 * @param y is coordinate, 0..height
 * @param angle is a float in radians
 * @param scaleX is a float that defines image scaling
 * @param scaleY is a float that defines image scaling
 * @param alpha is in 0..1, default is 1
 * @param color is a Pixel32 instance
 * @param additive is boolean, defines alpha blending mode
 */
RenderWebGL.prototype.drawParticle = function(img, x, y, angle, scaleX, scaleY, alpha, color, additive) {
    assert(img != null && angle != null && scaleX >= 0.0 && scaleY >= 0.0);
    assert(alpha != null && additive != null);
	if(this.calls++ > this.maxCalls) return;

    // apply alpha
    color = color == null ? this.white : color;
    color = new Pixel32(color.r, color.g, color.b, alpha * 255);
    var shader = this.alphaShader;
    var isCacheable = this.white.equals(color) && this.isCacheable(img);

    // vertices coordinates
    this.move(this.imageVerticesArray, img, x, y, true, false, scaleX, scaleY);
    if (angle != 0) this.rotate(this.imageVerticesArray, img, angle, false);
    this.scale(this.imageVerticesArray);

    if (this.isVisible(this.imageVerticesArray, angle)) {
        // texture coordinates
        var u0 = this.textureX(img, 0), v0 = this.textureY(img, 0);
        var u1 = this.textureX(img, img.width), v1 = this.textureY(img, img.height);
        this.expand(this.imageCoordinatesArray, u0, v0, u1, v1);

        // try to cache the draw call
        if (isCacheable) {
            this.activateShader(this.cachingShader);
            this.imageCache.append(img.image, this.imageVerticesArray, this.imageCoordinatesArray);
        } else {
            // draw the image
            this.activateShader(shader, additive);

            this.setColor(shader, color);
            var texture = this.resolveTexture(img.image);
            this.bindTexture(shader, texture);
            this.bindAttribute(shader.aPositionAttribute, this.verticesBuffer, this.imageVerticesArray);
            this.bindAttribute(shader.aTextureCoordinatesAttribute, this.coordinatesBuffer, this.imageCoordinatesArray);

            this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.vertexCount(this.imageVerticesArray));
        }
    }
};

/**
 * draws a series of images
 *
 * @param img is an EMBImage instance
 * @param x is coordinate, 0..width
 * @param y is coordinate, 0..height
 * @param htiles is number of horizontal tiles: > 0
 * @param vtiles is number of vertical tiles: > 0
 * @param alpha is in 0..1
 */
RenderWebGL.prototype.drawTilingImage = function(img, x, y, htiles, vtiles, alpha) {
    assert(htiles > 0 && vtiles > 0, "invalid number of tiles: htiles = " + htiles + ", vtiles = " +vtiles);

    // alpha and tint
    var color;
    var shader = this.alphaShader;
    if (alpha != null && alpha != 1) {
        color = new Pixel32(255, 255, 255, alpha * 255);
    } else {
        color = this.white;
    }

    // vertices coordinates
    this.move(this.tileVerticesArray, img, x, y, true, false, 1, 1, 0);

    // texture coordinates
    var u0 = this.textureX(img, 0), v0 = this.textureY(img, 0);
    var u1 = this.textureX(img, img.width), v1 = this.textureY(img, img.height);
    this.expand(this.tileCoordinatesArray, u0, v0, u1, v1, false, 0);

    // tile the coordinates
    var size = htiles * vtiles * 6 * 2;
    var verticesArray = this.array("tileVerticesArray", size), coordinatesArray = this.array("tileCoordinatesArray", size);
    var i, j, w = img.textureWidth, h = img.textureHeight, inx;
    for (i = 0; i < htiles; i++) {
        for (j = 0; j < vtiles; j++) {
            inx = (i + htiles * j) * 6 * 2;
            this.inc(this.tileVerticesArray, verticesArray, inx, i * w, j * h);
            coordinatesArray.set(this.tileCoordinatesArray, inx);
        }
    }
    this.scale(verticesArray);

    // draw the image
    this.activateShader(shader);

    this.setColor(shader, color);
    var texture = this.resolveTexture(img.image);
    this.bindTexture(shader, texture);
    this.bindAttribute(shader.aPositionAttribute, this.verticesBuffer, verticesArray);
    this.bindAttribute(shader.aTextureCoordinatesAttribute, this.coordinatesBuffer, coordinatesArray);

    this.gl.drawArrays(this.gl.TRIANGLES, 0, this.vertexCount(verticesArray));
};

/**
 * draws a layer
 *
 * @param layer is a RenderLayer instance
 * @param ox is an offset in pixels
 * @param oy is an offset in pixels
 * @param x is the first tile
 * @param y is the first tile
 * @param nx is number of tiles
 * @param ny is number of tiles
 */
RenderWebGL.prototype.drawLayer = function(layer, ox, oy, x, y, nx, ny) {
	if(this.calls++ > this.maxCalls) return;
    var webGLLayer = this.resolveLayer(layer);
    if (layer instanceof RenderTileLayer) {
        var isDrawFullLayer = this.isDrawFullLayer;
        if (isDrawFullLayer) {
            webGLLayer.draw(true, ox, oy);
        } else {
            webGLLayer.select(x, y, nx, ny);
            webGLLayer.draw(false, ox, oy);
        }
    } else if (layer instanceof RenderSpriteLayer) {
        webGLLayer.draw(this.isFrontToBack(), ox, oy);
    } else {
        assert(false);
    }
};

/**
 * Draws a text image on the screen.
 *
 * @param image is a HTMLCanvasElement
 * @param x is coordinate, 0..width
 * @param y is coordinate, 0..height
 * @param alpha is in 0..1
 * @param [forced]
 */
RenderWebGL.prototype.drawText = function(image, x, y, alpha, forced) {
    assert(image instanceof HTMLCanvasElement);
	if(this.calls++ > this.maxCalls && (forced == undefined || !forced)) return;
    image = new EMBImage(image, 0, 0, image.width, image.height);
    this.drawImage(image, x, y, 0, false, alpha);
};

RenderWebGL.prototype.drawCanvas = function(canvas, x, y) {
	assert(canvas instanceof HTMLCanvasElement);
	if(this.calls++ > this.maxCalls) return;
    canvas = new EMBImage(canvas, 0, 0, canvas.width, canvas.height);
    this.drawImage(canvas, x, y, 0, false, 1);
};

/**
 * Draws debug text on the canvas.
 *
 * @param txt the text.
 * @param x the x position of the upper left corner.
 * @param y the y position of the upper left corner.
 */
RenderWebGL.prototype.drawSystemText = function(txt, x, y, color) {
    if (this.systemCanvas == null) {
        this.systemCanvas = document.createElement('canvas');
        this.systemContext = this.systemCanvas.getContext('2d');
        this.systemContext.textAlign = "left";
        this.systemContext.font = "10px sans-serif";
    }
    this.systemCanvas.width = this.systemContext.measureText(txt).width;
    this.systemCanvas.height = 10;
    this.systemContext.fillStyle = color.toString();
    this.systemContext.fillText(txt, 0, 10);
    this.drawText(this.systemCanvas, x, y - 10, 1.0);
};

/**
 * Draws a color on the entire screen.
 * @param {Pixel32} color the color to draw.
 */
RenderWebGL.prototype.drawFillScreen = function(color) {
	if(this.calls++ > this.maxCalls) return;
    var w = this.getWidth(), h = this.getHeight();
    this.filledTrisArray[0] = 0; this.filledTrisArray[1] = 0;
    this.filledTrisArray[2] = w; this.filledTrisArray[3] = 0;
    this.filledTrisArray[4] = 0; this.filledTrisArray[5] = h;
    this.filledTrisArray[6] = w; this.filledTrisArray[7] = 0;
    this.filledTrisArray[8] = 0; this.filledTrisArray[9] = h;
    this.filledTrisArray[10] = w; this.filledTrisArray[11] = h;
    this.drawFilledTris(this.filledTrisArray, color);
};

/*
 * Clipping and scissor testing
 */

/**
 * pushes a clip rectangle into the stack and sets new scissor test
 *
 * @param r is instance of Rectf
 */
RenderWebGL.prototype.pushClipRect = function(r) {
    Render.prototype.pushClipRect.call(this, r);
    this.updateScissor();
};

/**
 * pops top-most Rectf (must exist) and if there are any other rectangles,
 * scissor test is updated, otherwise switched off
 *
 * @returns popped Rectf
 */
RenderWebGL.prototype.popClipRect = function() {
    var result = Render.prototype.popClipRect.call(this);
    this.updateScissor();
    return result;
};

/**
 * either sets new scissor or disables the test
 */
RenderWebGL.prototype.updateScissor = function() {
    if (this.clips.length == 0) {
        this.gl.disable(this.gl.SCISSOR_TEST);
    } else {
        // get canvas to native scaling
        var scale = this.scaleFactor, r = this.clips[this.clips.length - 1];
        var x = r.x0 * scale, y = this.getHeight() - r.y1 * scale;
        var w = r.width * scale, h = r.height * scale;
        this.gl.scissor(x, y, w, h);
        this.gl.enable(this.gl.SCISSOR_TEST);
    }
};

/*
 * utility methods
 */

/**
 * fills a rectangle coordinates out of two points
 *
 * @param buffer is an array of 8 coordinates
 * @param x0 is a pixel coordinate
 * @param y0 is a pixel coordinate
 * @param x1 is a pixel coordinate
 * @param y1 is a pixel coordinate
 * @param flipped is a boolean that determines flipping along x axe
 * @param offset is the position to start with, optional, if present,
 *          rectangle is expanded into to triangles coordinates
 */
RenderWebGL.prototype.expand = function(buffer, x0, y0, x1, y1, flipped, offset) {
    if (offset == null) {
        if (flipped) {
            buffer[0] = x1; buffer[1] = y0; buffer[2] = x0; buffer[3] = y0;
            buffer[4] = x1; buffer[5] = y1; buffer[6] = x0; buffer[7] = y1;
        } else {
            buffer[0] = x0; buffer[1] = y0; buffer[2] = x1; buffer[3] = y0;
            buffer[4] = x0; buffer[5] = y1; buffer[6] = x1; buffer[7] = y1;
        }
    } else {
        var o = offset;
        if (flipped) {
            buffer[o + 0] = x1; buffer[o + 1] = y0; buffer[o + 2] = x0;  buffer[o + 3] = y0;
            buffer[o + 4] = x1; buffer[o + 5] = y1; buffer[o + 6] = x0;  buffer[o + 7] = y0;
            buffer[o + 8] = x1; buffer[o + 9] = y1; buffer[o + 10] = x0; buffer[o + 11] = y1;
        } else {
            buffer[o + 0] = x0; buffer[o + 1] = y0; buffer[o + 2] = x1;  buffer[o + 3] = y0;
            buffer[o + 4] = x0; buffer[o + 5] = y1; buffer[o + 6] = x1;  buffer[o + 7] = y0;
            buffer[o + 8] = x0; buffer[o + 9] = y1; buffer[o + 10] = x1; buffer[o + 11] = y1;
        }
    }
};

/**
 * converts coordinates of image and its position into a rectangle coordinates,
 * applying parameters.
 *
 * @param buffer is an array that will contain rectangle coordinates
 * @param img is an EMBImage instance
 * @param x is coordinate, 0..width
 * @param y is coordinate, 0..height
 * @param centered is boolean, image center is put in (x,y), defaults to false
 * @param scaleX is a float, optional, defaults to 1.0
 * @param scaleY is a float, optional, defaults to 1.0
 * @param offset is the position to start with, optional, if present,
 *          rectangle is expanded into to triangles coordinates
 */
RenderWebGL.prototype.move = function(buffer, img, x, y, centered, flipped, scaleX, scaleY, offset) {
	scaleX = scaleX == null ? 1 : scaleX;
	scaleY = scaleY == null ? 1 : scaleY;
	var ox = flipped ? img.textureWidth - (img.xOffset + img.width) : img.xOffset;
	var oy = img.yOffset;
	var dx = centered ? -img.textureWidth / 2 : 0;
	var dy = centered ? -img.textureHeight / 2 : 0;

	var x0 = x + scaleX * (ox + dx);
	var y0 = y + scaleY * (oy + dy);
	var x1 = x0 + scaleX * img.width;
	var y1 = y0 + scaleY * img.height;
	this.expand(buffer, x0, y0, x1, y1, false, offset);
};

/**
 * rotates (0, 0, w, h) rectangle relative to its center and adds up new coordinates to matrix
 *
 * @param matrix is an array of that defines a rectangle: [x0, y0, x1, y0, x0, y1, x1, y1]
 * @param {EMBImage} img the image.
 * @param angle is in radians
 */
RenderWebGL.prototype.rotate = function(matrix, img, angle, flipped) {
	var sina = Math.sin(angle);
	var cosa = Math.cos(angle);

	var xCenter = matrix[0] - (flipped ? img.textureWidth - (img.xOffset + img.width) : img.xOffset) + img.textureWidth / 2;
	var yCenter = matrix[1] - img.yOffset + img.textureHeight / 2;

	var dx, dy, i;
	for (i = 0; i < 8; i += 2) {
		dx = matrix[i] - xCenter;
		dy = matrix[i + 1] - yCenter;
		matrix[i] = xCenter + dx * cosa - dy * sina;
		matrix[i + 1] = yCenter + dx * sina + dy * cosa;
	}
};

/**
 * scales vertices using scale factor and additional scaling along x and y axes
 *
 * @param vertices is an array that holds (a,b) pairs
 */
RenderWebGL.prototype.scale = function(vertices) {
    assert(vertices.length % 2 == 0, "vertices array must have even number of values");
    if (this.scaleFactor != 1.0) {
        var i, h = this.getHeight();
        for (i = 0; i < vertices.length; i++) {
            if (i % 2 == 0) {
                vertices[i] = Math.ceil(this.scaleFactor * vertices[i]) / this.scaleFactor;
            } else {
                vertices[i] = h - Math.ceil(this.scaleFactor * (h - vertices[i])) / this.scaleFactor;
            }
        }
    }
};

/**
 * checks whether a rectangle is culled away and there is no need to draw it
 *
 * @param array is an array that holds (a,b) pairs and discribes a rectangle
 * @param angle is optional rotation angle
 */
RenderWebGL.prototype.isVisible = function(array, angle) {
    // x1 < sx0 || x0 > sx1 || y1 < sy0 || y0 > sy1 => culled away
    if (angle == null || angle == 0.0) {
        var sx1 = this.getWidth(), sy1 = this.getHeight();
        return !(array[2] < 0 || array[0] > sx1 || array[5] < 0 || array[1] > sy1);
    } else {
        // we do not perform testing for rotated rectangles
        return true;
    }
};


/**
 * converts in-texture coordinte to in-image coordinate
 *
 * @param img is an EMBImage instance
 * @param tx is in pixels,
 * @param padding is boolean, when turned on, white space is assumed to be around image
 * @returns float
 */
RenderWebGL.prototype.textureX = function(img, tx, padding) {
    var x = img.x, tw = img.textureWidth, xo = img.xOffset, iw = img.imageWidth(), result;
    if (padding) {
        result = (tx - xo) / tw  + x / iw;
    } else {
        result = (tx + x) / iw;
    }
    // scale for in-texture padding
    return result;
};

/**
 * converts in-texture coordinte to in-image coordinate
 *
 * @param img is an EMBImage instance
 * @param ty is in pixels
 * @param padding is boolean, when turned on, white space is assumed to be around image
 * @returns float
 */
RenderWebGL.prototype.textureY = function(img, ty, padding) {
    var y = img.y, th = img.textureHeight, yo = img.yOffset, ih = img.imageHeight(), result;
    if (padding) {
        result = 1.0 - ((ty - yo) / th + y / ih);
    } else {
        result = 1.0 - (ty + y) / ih;
    }
    // scale for in-texture padding
    return result;
};

/**
 * checks image for cacheability
 *
 * @param image is an EMBImageInstance
 */
RenderWebGL.prototype.isCacheable = function(image) {
    return image.image instanceof HTMLImageElement;
};

/**
 * assigns elements of dest to the elements of src by adding
 * dx to even elements and dy to odd
 *
 * @param src contains list of numbers
 * @param dest is a list to be overwritten
 * @param offset is an index in dest
 * @param dx is a number
 * @param dy is a number
 */
RenderWebGL.prototype.inc = function(src, dest, offset, dx, dy) {
    var i;
    for (i = 0; i < src.length; i++) {
        dest[offset + i] = src[i] + (i % 2 == 0 ? dx : dy);
    }
};

/**
 * allocates array of floats
 *
 * @param name is array property name
 * @param buffer is either an array of an array size
 * @returns Float32Array instance
 */
RenderWebGL.prototype.array = function(name, buffer) {
    var size;
    if (buffer instanceof Array) {
        size = buffer.length;
    } else {
        size = buffer;
        buffer = null;
    }
    var array = this.arrays[name];
    if (array == null) {
        array = new Float32Array(size);
        this.arrays[name] = array;
    } else {
        if (array.length < size) {
            array = new Float32Array(size);
            this.arrays[name] = array;
        } else if (array.length > size){
            array = array.subarray(0, size);
        }
    }
    if (buffer != null) {
        array.set(buffer, 0);
    }
    return array;
};

/*
 * RenderWebGLImageCache class
 */

RenderWebGLImageCache.prototype = {};
RenderWebGLImageCache.prototype.constructor = RenderWebGLImageCache;

/**
 * WebGL image rendering cache
 *
 * @param render is a RenderWebGL instance
 * @returns {RenderWebGLImageCache}
 */
function RenderWebGLImageCache(render) {
    assert(render instanceof RenderWebGL);
    this.render = render;
    // image cache
    this.imageCacheCapacity = 1;
    this.imageCache = {};
    this.imageCacheSize = 0;
    // arrays
    var initialCapacity = 10;
    this.verticesArray = new Float32Array(2 * 6 * initialCapacity);
    this.coordinatesArray = new Float32Array(2 * 6 * initialCapacity);
    this.capacity = initialCapacity;
    this.size = 0;
}

/**
 * resize arrays retaining current data
 * @param minCapacity is minimal number of elements desired
 */
RenderWebGLImageCache.prototype.grow = function(minCapacity) {
    var oldCapacity = this.capacity;
    if (minCapacity > oldCapacity) {
        var newCapacity = Math.ceil((oldCapacity * 3)/2 + 1);
        if (minCapacity > newCapacity) {
            newCapacity = minCapacity;
        }
        // vertices
        var oldElements = this.verticesArray;
        this.verticesArray = new Float32Array(2 * 6 * newCapacity);
        this.verticesArray.set(oldElements);
        // coordinates
        oldElements = this.coordinatesArray;
        this.coordinatesArray = new Float32Array(2 * 6 * newCapacity);
        this.coordinatesArray.set(oldElements);
        // set the capacity
        this.capacity = newCapacity;
    }
};

/**
 * picks up the visible part of array
 *
 * @param array is a typed array
 * @param size is a unit size of elements in the array
 * @returns array view
 */
RenderWebGLImageCache.prototype.trim = function(array, size) {
    return array.subarray(0, size * this.size);
};

/**
 * expand triangles strip into triangles
 *
 * @param src is the source array that contains a strip of 2 triangles
 * @param dest is an array of triangles
 */
RenderWebGLImageCache.prototype.expand = function(src, dest) {
    var inx = this.size * 6 * 2, i;
    for (i = 0; i < 6; i++) {
        dest[inx++] = src[i];
    }
    for (i = 2; i < 6; i++) {
        dest[inx++] = src[i];
    }
    for (i = 6; i < 8; i++) {
        dest[inx++] = src[i];
    }
};

/**
 * appends data about a new image and flushes the cache if necessary
 *
 * @param image is a drawable image
 * @param verticesArray is an array of vertices
 * @param coordinatesArray is an array of coordinates
 */
RenderWebGLImageCache.prototype.append = function(image, verticesArray, coordinatesArray) {
    // resolve texture
    var isReusable = image.src != null;
    var textureIndex = isReusable ? this.imageCache[image.src] : null;
    if (textureIndex == null) {
        // flush that cache if it is full
        if (this.imageCacheSize == this.imageCacheCapacity) {
            this.flush();
        }
        // this is a new image and we need to put it into the cache
        textureIndex = this.imageCacheSize;
        // resolve texture and bind it
        var texture = this.render.resolveTexture(image);
        this.render.bindTexture(this.render.cachingShader.uTextureUniform, texture);
        // cache the new image
        if (isReusable) {
            this.imageCache[image.src] = textureIndex;
        }
        this.imageCacheSize++;
    }
    // image is cached - now we need to put the data into arrays
    this.grow(this.size + 1);
    this.expand(verticesArray, this.verticesArray);
    this.expand(coordinatesArray, this.coordinatesArray);
    this.size++;
};

/**
 * performs drawing of the cached images and clears the cache afterwards
 */
RenderWebGLImageCache.prototype.flush = function() {
    if (this.size > 0) {
        // resolve arrays
        var verticesArray = this.trim(this.verticesArray, 2 * 6);
        var coordinatesArray = this.trim(this.coordinatesArray, 2 * 6);

        with (this.render) {
            // bind attributes (textures has already been bound)
            bindAttribute(cachingShader.aPositionAttribute, verticesBuffer, verticesArray);
            bindAttribute(cachingShader.aTextureCoordinatesAttribute, coordinatesBuffer, coordinatesArray);
            // draw images
            gl.drawArrays(gl.TRIANGLES, 0, vertexCount(verticesArray));
        }

        // reset the state
        this.imageCache = {};
        this.imageCacheSize = 0;
        this.size = 0;
    }
};

/*
 * RenderWebGLLayer class
 */

RenderWebGLLayer.prototype = {};
RenderWebGLLayer.prototype.constructor = RenderWebGLLayer;

/**
 * base WebGL layer cache class
 *
 * @param render is a RenderWebGL instance
 * @param layer is a RenderLayer instance
 * @returns {RenderWebGLLayer}
 */
function RenderWebGLLayer(render, layer) {
    if (render !== undefined) {
        assert(render instanceof RenderWebGL && layer instanceof RenderLayer);
        this.render = render;
        this.layer = layer;
        this.image = layer.image;
        // create buffers
        this.verticesBuffer = render.gl.createBuffer();
        this.verticesBuffer.itemSize = 2;
        this.coordinatesBuffer = render.gl.createBuffer();
        this.coordinatesBuffer.itemSize = 2;
    }
}

/**
 * fills vertices and texture coordinates arrays with data
 */
RenderWebGLLayer.prototype.populate = function() {
    // create arrays
    var size = 2 * 6 * this.layer.count();
    var verticesArray = new Float32Array(size);
    var coordinatesArray = new Float32Array(size);
    // fill arrays with data
    with (this.layer) {
        var i, img, x, y, centered, flipped, offset, u0, v0, u1, v1, cursor;
        for (i = 0, offset = 0; i < count(); i++) {
            // get tile info
            img = tiles[offset++];
            x = tiles[offset++];
            y = tiles[offset++];
            centered = tiles[offset++];
            flipped = tiles[offset++];
            cursor = i * 12;
            // vertices
            this.render.move(verticesArray, img, x, y, centered, flipped, 1.0, 1.0, cursor);
            // texture coordinates
            u0 = this.render.textureX(img, 0); v0 = this.render.textureY(img, 0);
            u1 = this.render.textureX(img, img.width); v1 = this.render.textureY(img, img.height);
            this.render.expand(coordinatesArray, u0, v0, u1, v1, flipped, cursor);
        }
        this.render.scale(verticesArray);
    }
    // send data to the graphics card
    with (this.render) {
        bindAttribute(layerShader.aPositionAttribute, this.verticesBuffer, verticesArray, true);
        bindAttribute(layerShader.aTextureCoordinatesAttribute, this.coordinatesBuffer, coordinatesArray, true);
    }
};

/**
 * activates shader and binds vertices and coordinates
 *
 * @param x is the offset
 * @param y is the offset
 */
RenderWebGLLayer.prototype.bind = function(x, y) {
    with (this.render) {
        // activate shader
        activateShader(layerShader);
        // bind offset uniform
        gl.uniform2f(layerShader.uOffsetUniform, x, y);
        // bind texture
        var texture = resolveTexture(this.image);
        bindTexture(layerShader, texture);
        // bind vertices and texture coordinates
        bindAttribute(layerShader.aPositionAttribute, this.verticesBuffer);
        bindAttribute(layerShader.aTextureCoordinatesAttribute, this.coordinatesBuffer);
    }
};

/**
 * frees WebGL resources, occupied by the layer.
 * Object becomes unusable.
 */
RenderWebGLLayer.prototype.remove = function() {
    with (this.render) {
        gl.deleteBuffer(this.verticesBuffer);
        gl.deleteBuffer(this.coordinatesBuffer);
    }
    this.render = null;
    this.verticesBuffer = null;
    this.coordinatesBuffer = null;
};

/*
 * RenderWebGLTileLayer class
 */

RenderWebGLTileLayer.prototype = new RenderWebGLLayer();
RenderWebGLTileLayer.prototype.constructor = RenderWebGLTileLayer;

/**
 * creates WebGL render layer cache object
 *
 * @returns {RenderWebGL}
 */
function RenderWebGLTileLayer(render, layer) {
    RenderWebGLLayer.apply(this, arguments);
    // create buffers
    this.elementsBuffer = render.gl.createBuffer();
    // create arrays
    this.elementsArray = new Uint16Array(16);
    this.elementsCount = 0;
}

/**
 * ensures that there is enough space in the elements array
 *
 * @param minCapacity is number
 */
RenderWebGLTileLayer.prototype.grow = function(minCapacity) {
    var oldCapacity = this.elementsArray.length;
    if (minCapacity > oldCapacity) {
        var newCapacity = Math.ceil((oldCapacity * 3)/2 + 1);
        if (minCapacity > newCapacity) {
            newCapacity = minCapacity;
        }
        var oldElements = this.elementsArray;
        this.elementsArray = new Uint16Array(newCapacity);
        this.elementsArray.set(oldElements);
    }
};

/**
 * pushes index into elements array
 *
 * @param index is an 16 bit unsigned integer
 */
RenderWebGLTileLayer.prototype.push = function(first, size) {
    // scale for 6 vertices
    size *= 6;
    first *= 6;
    // put vertices indices
    this.grow(this.elementsCount + size);
    var i, offset = this.elementsCount;
    for (i = 0; i < size; i++) {
        this.elementsArray[offset + i] = first + i;
    }
    this.elementsCount += size;
};

/**
 * resets elements counter
 */
RenderWebGLTileLayer.prototype.clear = function() {
    this.elementsCount = 0;
};

/**
 * @returns Uint16Array which holds indexes of the elements to draw
 */
RenderWebGLTileLayer.prototype.elements = function() {
    if (this.elementsArray.length == this.elementsCount) {
        return this.elementsArray;
    } else {
        return this.elementsArray.subarray(0, this.elementsCount);
    }
};

/**
 * puts indexes of all tile images in the range into the elements array
 *
 * @param x is the first tile horizontal index
 * @param y is the first tile vertical index
 * @param nx is number of horizontal tiles
 * @param ny is number of vertical tiles
 */
RenderWebGLTileLayer.prototype.select = function(x, y, nx, ny) {
    this.clear();
    var j;
    for (j = y; j < y + ny; j++) {
        var previous = this.layer.previous(x, j), last = this.layer.index(x + nx - 1, j);
        this.push(previous + 1, last - previous);
    }
};

/**
 * draws a layer with given offset
 *
 * @param x is the offset
 * @param y is the offset
 */
RenderWebGLTileLayer.prototype.draw = function(isDrawFullLayer, x, y) {
    if (isDrawFullLayer || this.elementsCount > 0) {
        with (this.render) {
            // bind verticies and coordinates
            this.bind(x, y);
            // bind indices buffer
            if (isDrawFullLayer) {
                gl.drawArrays(gl.TRIANGLES, 0, this.layer.count() * 6);
            } else {
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.elementsBuffer);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.elements(), gl.STREAM_DRAW);
                gl.drawElements(gl.TRIANGLES, this.elementsCount, gl.UNSIGNED_SHORT, 0);
            }
        }
    }
};

/**
 * frees WebGL resources, occupied by the layer.
 * Object becomes unusable.
 */
RenderWebGLTileLayer.prototype.remove = function() {
    this.render.gl.deleteBuffer(this.elementsBuffer);
    this.elementsBuffer = null;
    RenderWebGLLayer.prototype.remove.apply(this, arguments);
};

/*
 * RenderWebGLSpriteLayer class
 */

RenderWebGLSpriteLayer.prototype = new RenderWebGLLayer();
RenderWebGLSpriteLayer.prototype.constructor = RenderWebGLSpriteLayer;

/**
 * creates WebGL render layer cache object
 *
 * @returns {RenderWebGL}
 */
function RenderWebGLSpriteLayer(render, layer) {
    RenderWebGLLayer.apply(this, arguments);
    // create buffers
    this.frontToBackBuffer = render.gl.createBuffer();
    this.backToFrontBuffer = render.gl.createBuffer();
    this.elementsCount = this.layer.count() * 6;
}

/**
 * additionally populate back-to-front and front-to-back index buffers
 */
RenderWebGLSpriteLayer.prototype.populate = function() {
    RenderWebGLLayer.prototype.populate.apply(this, arguments);
    with (this.render) {
        var elementsArray = new Uint16Array(this.elementsCount), i, j;
        // back to back
        for (i = this.elementsCount - 1, j = 0; 0 <= i; i--, j++) {
            elementsArray[j] = i;
        }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.backToFrontBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, elementsArray, gl.STATIC_DRAW);
        // front to front
        for (i = 0; i < this.elementsCount; i++) {
            elementsArray[i] = i;
        }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.frontToBackBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, elementsArray, gl.STATIC_DRAW);
    }
};

/**
 * draws a layer with given offset
 *
 * @param x is the offset
 * @param y is the offset
 */
RenderWebGLSpriteLayer.prototype.draw = function(isFrontToBack, x, y) {
    with (this.render) {
        // bind verticies and coordinates
        this.bind(x, y);
        // bind indices buffer
        if (isFrontToBack) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.frontToBackBuffer);
        } else {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.backToFrontBuffer);
        }
        gl.drawElements(gl.TRIANGLES, this.elementsCount, gl.UNSIGNED_SHORT, 0);
    }
};

/**
 * frees WebGL resources, occupied by the layer.
 * Object becomes unusable.
 */
RenderWebGLSpriteLayer.prototype.remove = function() {
    this.render.gl.deleteBuffer(this.frontToBackBuffer);
    this.render.gl.deleteBuffer(this.backToFrontBuffer);
    this.frontToBackBuffer = null;
    this.backToFrontBuffer = null;
    RenderWebGLLayer.prototype.remove.apply(this, arguments);
};


