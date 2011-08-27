/**
 * Render.js contains abstract rendering interface along with utility
 * classes to handle rendering data.
 * 
 * Depends on Common.js, glMatrix.js
 */

/*
 * RenderException class
 */

RenderException.prototype = new Exception();
RenderException.prototype.constructor = RenderException;

/**
 * RenderException stands for a graphics support failure
 * 
 * @param message is an optional message
 * @returns {RenderException}
 */
function RenderException(message) {
    this.assign(message);
}

/*
 * Pixel32 class
 */

Pixel32.prototype = {};
Pixel32.prototype.constructor = Pixel32;

/**
 * creates a pixel
 * 
 * @param r 0..255
 * @param g 0..255
 * @param b 0..255
 * @param [a] 0..255
 * @returns {Pixel32}
 */
function Pixel32(r, g, b, a) {
    assert(0 <= r && r <= 255);
    assert(0 <= g && g <= 255);
    assert(0 <= b && b <= 255);
    assert(a !== null);
    this.r = r;
    this.g = g;
    this.b = b;
    if (a === undefined) {
        this.a = 255;
    } else {
        assert(0 <= a && a <= 255);
        this.a = a;
    }
    this.normalized = [r / 255.0, g / 255.0, b / 255.0, this.a / 255.0];
}

/**
 * tests colors for equality
 * 
 * @param other is another object
 * @returns boolean
 */
Pixel32.prototype.equals = function(other) {
    if (other instanceof Pixel32) {
        return this.r == other.r && this.g == other.g && this.b == other.b && this.a == other.a;
    } else {
        return false;
    }
};

Pixel32.prototype.toString = function() {
    return "rgba(" + this.r + "," + this.g + "," + this.b + "," + this.normalized[3] + ")";
};

Pixel32.prototype.rgbString = function() {
    return "rgb(" + this.r + "," + this.g + "," + this.b + ")";
};

/**
 * compares the two pixels
 * 
 * @param other is another Pixel32 instance
 */
Pixel32.prototype.equal = function(other) {
    assert(other !== undefined);
    if (other == null) {
        return false;
    } else {
        return this.r == other.r && this.g == other.g && this.b == other.b && this.a == other.a;
    }
};

/*
 * EMBImage class
 */

/**
 * Wrapper around native image, stores additional parameters that define a part of the original image
 * and a padding space around that part.
 * 
 * @param image The image.
 * @param x is the position coordinate in the image, in pixels
 * @param y is the position coordinate in the image, in pixels
 * @param width is image region space in pixels
 * @param height is image region space in pixels
 * @param xOffset is padding offset in pixels, defaults to 0
 * @param yOffset is padding offset in pixels, defaults to 0
 * @param textureWidth is target texture width in pixels, defaults to width
 * @param textureHeight is target texture height in pixels, defaults to height
 * @returns {EMBImage}
 */
function EMBImage(image, x, y, width, height, xOffset, yOffset, textureWidth, textureHeight) {
    assert(image != null && x >=0 && y >= 0 && width >=0 && height >= 0, "illegal image description");
    assert(image instanceof HTMLImageElement || image instanceof HTMLCanvasElement, "invalid image");
    this.image = image;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.xOffset = xOffset == null? 0 : xOffset;
    this.yOffset = yOffset == null? 0 : yOffset;
    this.textureWidth = textureWidth == null? width : textureWidth;
    this.textureHeight = textureHeight == null? height : textureHeight;
    assert(this.xOffset >= 0 && this.yOffset >= 0, "offset in pixels is expected");
    assert(this.xOffset + this.width <= this.textureWidth && this.yOffset + this.height <= this.textureHeight, "illegal padding");
    this.hasPaddingSpace = (xOffset > 0) || (yOffset > 0) || (textureWidth > width) || (textureHeight > height);
}

/**
 * gets image width
 *
 * @returns image width
 */
EMBImage.prototype.imageWidth = function() {
    return this.image.width;
};

/**
 * gets image height
 * 
 * @returns image height
 */
EMBImage.prototype.imageHeight = function() {
    return this.image.height;
};

/*
 * Rectf class
 */

Rectf.prototype = {};
Rectf.prototype.constructor = Rectf;

/**
 * creates a rectangle
 * 
 * @param x0 is value in pixels
 * @param y0 is value in pixels
 * @param x1 is value in pixels
 * @param y1 is value in pixels
 * @returns {Rectf}
 */
function Rectf(x0, y0, x1, y1) {
    this.x0 = x0;
    this.y0 = y0;
    this.x1 = x1;
    this.y1 = y1;
    this.width = x1 - x0 + 1;
    this.height = y1 - y0 + 1;
}

/**
 * gives the center of rectangle
 * 
 * @returns Vec2 instance
 */
Rectf.prototype.center = function() {
    return new Vec2((this.x1 + this.x0 + 1) / 2.0, (this.y1 + this.y0 + 1) / 2.0);
};

/**
 * inverts the rectangle along one of the axes
 * 
 * @param axe true means over x, false - y
 */
Rectf.prototype.invert = function(axe) {
    assert(axe != null);
    if (axe) {
        return new Rectf(-this.x1, this.y0, -this.x0, this.y1);
    } else {
        return new Rectf(this.x0, -this.y1, this.x1, -this.y0);
    }
};

/**
 * moves rectangle by a vector
 * 
 * @param ox is a number of Vec2
 * @param oy is a number or undefined if ox is a Vec2
 * @returns Rectf instance
 */
Rectf.prototype.offset = function(ox, oy) {
    if (ox instanceof Vec2 || ox instanceof Point2) {
        assert(oy === undefined);
        oy = ox.y;
        ox = ox.x;
    }
    assert(ox != null && oy != null);
    return new Rectf(this.x0 + ox, this.y0 + oy, this.x1 + ox, this.y1 + oy);
};

/**
 * expands rectangle
 * 
 * @param w is a number or Vec2
 * @param h is a number or undefined is w is a Vec2
 */
Rectf.prototype.expand = function(w, h) {
    if (w instanceof Vec2 || w instanceof Point2) {
        assert(h === undefined);
        h = w.y;
        w = w.x;
    }
    assert(w != null && h != null);
    return new Rectf(this.x0 - w, this.y0 - h, this.x1 + w, this.y1 + h);
};

/**
 * checks for containment (including border)
 * 
 * @param x is either a number, Vec2 or Rectf
 * @param y is a number in case if x is, and must be undefined otherwise
 */
Rectf.prototype.contains = function(x, y) {
    var o = x;
    if (x instanceof Vec2 || x instanceof Point2) {
        assert(y === undefined);
        return this.x0 <= o.x && this.y0 <= o.y && o.x <= this.x1 && o.y <= this.y1;
    } else if (x instanceof Rectf) {
        assert(y === undefined);
        return this.x0 <= o.x0 && this.y0 <= o.y0 && o.x1 <= this.x1 && o.y1 <= this.y1;
    } else {
        assert(x != null && y != null);
        return this.x0 <= x && this.y0 <= y && x <= this.x1 && y <= this.y1;
    }
};

/**
 * checks containment of circle or rectangle inside this rectangle
 * 
 * @param shape is either Rectf or Circle
 * @param ox is a number, Vec2 or undefined
 * @param oy is a number if ox is a number, or undefined otherwise
 * @returns boolean
 */
Rectf.prototype.overlaps = function(shape, ox, oy) {
    var r, x, y;
    if (ox === undefined) {
        assert(oy === undefined);
        ox = 0;
        oy = 0;
    } else if (ox instanceof Vec2 || ox instanceof Point2) {
        assert(oy === undefined);
        oy = ox.y;
        ox = ox.x;
    }
    assert(ox != null && oy != null);
    if (shape instanceof Circle) {
        r = shape.r;
        x = shape.c.x + ox;
        y = shape.c.y + oy;
        return this.x0 - r <= x && this.y0 - r <= y && x <= this.x1 + r && y <= this.y1 + r;
    } else if (shape instanceof Rectf) {
        return !(this.x0 > shape.x1 + ox || this.x1 < shape.x0 + ox ||
                 this.y0 > shape.y1 + oy || this.y1 < shape.y0 + oy);
    } else {
        assert(false);
    }
};

/**
 * Clips a vector to the rect
 *
 * @param {Vec2} v
 * @returns {Vec2}
 */
Rectf.prototype.clip = function (v) {
	return new Vec2(Math.max(this.x0, Math.min(this.x1, v.x)), Math.max(this.y0, Math.min(this.y1, v.y)));
};

/**
 * Copy the rect, instantiating a new one
 *
 * @returns {Rectf}
 */
Rectf.prototype.copy = function () {
	return new Rectf(this.x0, this.y0, this.x1, this.y1);
};

Rectf.prototype.include = function (x, y) {
    this.x0 = Math.min(this.x0, x);
    this.y0 = Math.min(this.y0, y);
    this.x1 = Math.max(this.x1, x);
    this.y1 = Math.max(this.y1, y);
	this.width = this.x1 - this.x0 + 1;
	this.height = this.y1 - this.y0 + 1;
};

/*
 * RenderLayer class
 */

RenderLayer.prototype = {};
RenderLayer.prototype.constructor = RenderLayer;

/**
 * base class for layers
 * 
 * @param tiles is array of tuples (EMBImage, x, y, centered, flipped)
 * @returns {RenderLayer}
 */
function RenderLayer(tiles) {
    if (tiles !== undefined) {
        this.tiles = tiles;
        this.image = tiles[0].image;
        assert(this.count() > 0);
    }
}

/**
 * @returns number of images, that are actually on the layer
 */
RenderLayer.prototype.count = function () {
    return this.tiles.length / 5;
};

/**
 * gets offset to the i'th tuple
 * 
 * @param i is the tuple index
 * @returns {Number} is the offset
 */
RenderLayer.prototype.offset = function (i) {
    return i * 5;
};

/*
 * RenderTileLayer class
 */

RenderTileLayer.prototype = new RenderLayer();
RenderTileLayer.prototype.constructor = RenderTileLayer;

/**
 * Layer description, layer drawing could be optimized by renderers, 
 * since layers are drawn multiple times. All EMB images on the layer
 * must have the same source Image.
 * 
 * @param tiles is array of tuples (EMBImage, x, y, centered, flipped)
 * @param indices is an array of image offsets in a rectangular layer
 * @param sx is number of horizontal tiles
 * @param sy is number of vertical tiles
 * 
 * @returns {RenderLayer}
 */
function RenderTileLayer(tiles, indices, sx, sy) {
    RenderLayer.apply(this, [tiles]);
    assert(indices.length == sx * sy);
    this.indices = indices;
    this.sx = sx;
    this.sy = sy;
}

/**
 * gets (i,j) tile image index
 * 
 * @param i is tile coordinate
 * @param j is tile coordinate
 * 
 * @returns index in tile array or -1
 */
RenderTileLayer.prototype.index = function (i, j) {
    return this.indices[i + this.sx * j];
};

/**
 * gets offset to the specified tile info
 * 
 * @param i is tile coordinate or index
 * @param j is tile coordinate, optional
 * 
 * @returns offset number
 */
RenderTileLayer.prototype.tile = function (i, j) {
    var index = j == null ? i : this.index(i, j);
    return index == -1 ? -1 : index * 5;
};

/**
 * for a given tile returns index of the image before this one.
 * -1 is returned for no image.
 * 
 * @param i is an index
 * @param i is an index
 * @returns last image drawn before the (i, j) tile, -1 for no image
 */
RenderTileLayer.prototype.previous = function(i, j) {
    if (i == 0) {
        return j == 0 ? -1 : this.index(this.sx - 1, j - 1);
    } else {
        return this.index(i - 1, j);
    }
};

/*
 * RenderSpriteLayer class
 */

RenderSpriteLayer.prototype = new RenderLayer();
RenderSpriteLayer.prototype.constructor = RenderSpriteLayer;

/**
 * Holds a layer of sprites that can overlap
 * 
 * @param tiles is array of tuples (EMBImage, x, y, centered, flipped)
 * @param rectangles describes bounding rectangles
 * @param rect is a bounding rectangle
 * @returns {RenderSpriteLayer}
 */
function RenderSpriteLayer(tiles, rectangles, rect) {
    assert(rect instanceof Rectf);
    RenderLayer.apply(this, [tiles]);
    this.rectangles = rectangles;
    this.rect = rect;
}

/*
 * Render class
 */

Render.prototype = {};
Render.prototype.constructor = Render;

/**
 * Abstract base class for renders
 * 
 * @returns {Render}
 */
function Render() {
    this.scaleFactor = 1.0;
    this.width = 0;
    this.height = 0;
    this.clips = [];
    this.defaultClip = null;

    this.frontToBack = false;

	this.calls = 0;
	this.maxCalls = 10000;
    
    // colors
    this.red = new Pixel32(255, 0, 0);
    this.green = new Pixel32(0, 255, 0);
    this.blue = new Pixel32(0, 0, 255);
    this.black = new Pixel32(0, 0, 0);
    this.white = new Pixel32(255, 255, 255);
    this.transparent = new Pixel32(0, 0, 0, 0);
}

Render.prototype.isFrontToBack = function() {
    return this.frontToBack;
};

/**
 * clears the drawing area
 * 
 * @param color is an optional Pixel32 instance, default color is transparent
 */
Render.prototype.clear = function(color) {
    assert(false);
};

/**
 * @returns width in pixels
 */
Render.prototype.getWidth = function() {
    return this.width;
};

/**
 * @returns height in pixels
 */
Render.prototype.getHeight = function() {
    return this.height;
};

/**
 * creates a new rectangle that reflects drawing area
 * 
 * @returns Rectf(0, 0, width, height)
 */
Render.prototype.getSafeRect = function() {
    return new Rectf(0, 0, this.getWidth(), this.getHeight());
};

/**
 * This is called from the display if it changes it's internal resolution.
 * 
 * @param w is new width in pixels
 * @param h is new height in pixels
 */
Render.prototype.reset = function(w, h) {
    assert(0 < w && 0 < h);
    this.width = w;
    this.height = h;
    this.defaultClip = new Rectf(0, 0, w / this.scaleFactor, h / this.scaleFactor);
};

/**
 * changes scaling
 * 
 * @param factor is a positive float
 */
Render.prototype.setScaleFactor = function(factor) {
    assert(0.0 < factor, "scale factor must be a positive float");
    this.scaleFactor = factor;
    this.defaultClip = new Rectf(0, 0, this.getWidth() / this.scaleFactor, this.getHeight() / this.scaleFactor);
};

/*
 * Drawing methods
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
Render.prototype.drawLine = function(x0, y0, x1, y1, color) {
    assert(false);
};

/**
 * draws a circle
 * 
 * @param xCenter is integer, >= 0
 * @param yCenter is integer, >= 0
 * @param radius is integer, >= 0
 * @param color is a Pixel32 instance
 */
Render.prototype.drawCircle = function(xCenter, yCenter, radius, color) {
    assert(false);
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
Render.prototype.drawRect = function(x0, y0, x1, y1, color) {
    assert(false);
};

/**
 * draws a quadruple
 * 
 * @param vertices is array of four (x,y) coordinates
 * @param color is a Pixel32 instance
 */
Render.prototype.drawQuad = function(verts, cols) {
    assert(false);
};

/**
 * draws n triangles
 * 
 * @param vertices is array of 3*n (x,y) coordinates
 * @param color is a Pixel32 instance
 */
Render.prototype.drawTris = function(vertices, color) {
    assert(false);
};

/**
 * Draws a filled rectangle. If 2 colors are specified then it will make a gradient from the top to the bottom.
 * 
 * @param x0 is the x coordinate for the upper left corner
 * @param y0 is the y coordinate for the upper left corner
 * @param x1 is the x coordinate for the lower right corner
 * @param y1 is the y coordinate for the lower right corner
 * @param color is a Pixel32 instance
 * @param color2 optional Pixel32 instance
 */
Render.prototype.drawFilledRect = function(x0, y0, x1, y1, color, color2) {
    assert(false);
};

/**
 * draws n triangles. todo: Draw a single triangle only?
 * 
 * @param vertices is array of 3*n (x,y) coordinates
 * @param color is a Pixel32 instance
 */
Render.prototype.drawFilledTris = function(vertices, color) {
    assert(false);
};

/**
 * draws an image
 * 
 * @param img is an EMBImage instance
 * @param x is coordinate, 0..width
 * @param y is coordinate, 0..height
 * @param angle is a float in radians, optional
 * @param centered is boolean, image center is put in (x,y), optional
 * @param alpha is in 0..255, default is 255, ignored if tint is in place, optional
 * @param tint is a Pixel32, used for mixing, optional
 * @param flipped is boolean, image is inverted relative to y axe, optional
 */
Render.prototype.drawImage = function(img, x, y, angle, centered, alpha, tint, flipped) {
    assert(false);
};

/**
 * draws image on a polygon
 * 
 * @param img is an EMBImage instance
 * @param xy is a polygon of pixel coordinates (2x3)
 * @param uv is a polygon of texture coordinates (0.0..1.0) (2x3)
 * @param tint is a Pixel32, used for mixing, optional
 */
Render.prototype.drawTriangleImage = function(img, xy, uv, tint) {
    assert(false);
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
 * @param alpha is in 0..255, default is 255
 * @param color is a Pixel32 instance
 * @param additive is boolean, defines alpha blending mode
 */
Render.prototype.drawParticle = function(img, x, y, angle, scaleX, scaleY, alpha, color, additive) {
    assert(false);
};

/**
 * draws a series of images
 * 
 * @param img is an EMBImage instance
 * @param x is coordinate, 0..width
 * @param y is coordinate, 0..height
 * @param htiles is number of horizontal tiles: > 0
 * @param vtiles is number of vertical tiles: > 0
 * @param alpha is in 0..255
 */
Render.prototype.drawTilingImage = function(img, x, y, htiles, vtiles, alpha) {
    assert(htiles > 0 && vtiles > 0, "invalid number of tiles: htiles = " + htiles + ", vtiles = " +vtiles);
    var i, j, w = img.textureWidth, h = img.textureHeight;
    for (i = 0; i < htiles; i++) {
        for (j = 0; j < vtiles; j++) {
            this.drawImage(img, x + i * w, y + j * h, 0, true, alpha);
        }
    }
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
Render.prototype.drawLayer = function(layer, ox, oy, x, y, nx, ny) {
    var i, j, img, ix, iy, centered, flipped, offset;
    if (layer instanceof RenderTileLayer) {
        // run through all the rows
        for (j = y; j < y + ny; j++) {
            var previous = layer.previous(x, j), last = layer.index(x + nx - 1, j);
            // run through all the columns and draw the images
            var img, ix, iy, centered, flipped, offset;
            for (i = previous + 1, offset = i * 5; i <= last; i++) {
                // get tile info
                img = layer.tiles[offset++];
                ix = layer.tiles[offset++];
                iy = layer.tiles[offset++];
                centered = layer.tiles[offset++];
                flipped = layer.tiles[offset++];
                // draw the tile image
                this.drawImage(img, ox + ix, oy + iy, 0.0, centered, 1.0, null, flipped);
            }
        }
    } else if (layer instanceof RenderSpriteLayer) { 
        // choose sprites to draw
        var frontToBack = this.isFrontToBack();
        for (i = 0; i < layer.count(); i++) {
            offset = 4 * (frontToBack ? this.count() - 1 - i : i);
            var minX = layer.rectangles[offset++], minY = layer.rectangles[offset++];
            var maxX = layer.rectangles[offset++]; maxY = layer.rectangles[offset++];
            if(maxX >= x && minX <= x + nx && maxY >= y && minY <= y + ny){
                offset = 5 * (frontToBack ? layer.count() - 1 - i : i); 
                // get tile info
                img = layer.tiles[offset++];
                ix = layer.tiles[offset++];
                iy = layer.tiles[offset++];
                centered = layer.tiles[offset++];
                flipped = layer.tiles[offset++];
                // draw the tile image
                this.drawImage(img, ox + ix, oy + iy, 0.0, centered, 1.0, null, flipped);
            }
        }
    } else {
        assert(false);
    }
};

/**
 * Draws a text image on the screen.
 */
Render.prototype.drawText = function(image, x, y, alpha) {
    assert(false);
};

/**
 * Draws a canvas on the screen.
 */
Render.prototype.drawCanvas = function(canvas, x, y){
	assert(false);
};

/**
 * Draws text on the canvas.
 * 
 * @param x the x position of the upper left corner.
 * @param y the y position of the upper left corner.
 * @param txt the text.
 */
Render.prototype.drawSystemText = function(txt, x, y, color) {
    assert(false);
};

/**
 * Draws a color on the entire screen.
 * @param {Pixel32} color the color to draw. 
 */
Render.prototype.drawFillScreen = function(color) {
	assert(false);
};

/*
 * Clipping methods
 */

/**
 * pushes a clip rectangle into the stack
 * 
 * @param r is instance of Rectf
 */
Render.prototype.pushClipRect = function(r) {
    assert(r instanceof Rectf && r != null, "Rectf instance expected");
    this.clips.push(r);
};

/**
 * pops top-most Rectf (must exist)
 * 
 * @returns popped Rectf 
 */
Render.prototype.popClipRect = function() {
    assert(this.clips.length > 0, "there is no clip rectange to pop");
    return this.clips.pop();
};

/**
 * @returns effective clip rectangle (either last pushed or the default one)
 */
Render.prototype.getClipRect = function() {
    var length = this.clips.length; 
    if (length == 0) {
        return this.defaultClip;
    } else {
        return this.clips[length - 1];
    }
};

/**
 * frees cached resources
 */
Render.prototype.evict = function() {
    // do nothing
};

/**
 * notifies the renderer that the frame has been drawn
 */
Render.prototype.flush = function() {
    this.calls = 0;
};

