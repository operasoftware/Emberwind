RenderCanvas.prototype = new Render();
RenderCanvas.prototype.constructor = RenderCanvas;

/**
 * Render that uses the "2d" canvas.
 *
 * @param canvasElement The canvas element.
 * @param [scale] The scale factor.
 */
function RenderCanvas(canvasElement, scale, frontToBack) {
	this.canvas = canvasElement;
	this.context = this.canvas.getContext('2d');

	this.scaleFactor = scale === undefined ? 1.0 : scale;
	this.context.scale(this.scaleFactor, this.scaleFactor);

	this.frontToBack = frontToBack === undefined ? false : frontToBack;

	if (this.frontToBack) {
		this.context.globalCompositeOperation = "destination-over";
	}

	this.secondCanvas = document.createElement('canvas');
	this.secondContext = this.secondCanvas.getContext('2d');
}

/**
 * Gets the width of the canvas in pixels.
 *
 * @returns width of the canvas.
 */
RenderCanvas.prototype.getWidth = function() {
	return 800;
	//return this.canvas.width;
};

/**
 * Gets the height of the canvas in pixels.
 *
 * @returns height of the canvas.
 */
RenderCanvas.prototype.getHeight = function() {
	return 600;
	//return this.canvas.height;
};

/**
 * Draws a rectangle.
 *
 * @param x1 The x position for upper left.
 * @param y1 The y position for upper left.
 * @param x2 The x position for lower right.
 * @param y2 The y position for lower right.
 * @param color The color of the rectangle.
 */
RenderCanvas.prototype.drawRect = function(x1, y1, x2, y2, color) {
	this.context.lineWidth = 2;
	x1 = Math.floor(x1);
	x2 = Math.floor(x2);
	y1 = Math.floor(y1);
	y2 = Math.floor(y2);
	this.context.strokeStyle = color.toString();
	this.context.strokeRect(x1, y1, x2 - x1, y2 - y1);
};

/**
 * Draws a 1 pixel line between 2 coordinates.
 *
 * @param x1 First coordinates x.
 * @param y1 First coordinates y.
 * @param x2 Second coordinates x.
 * @param y2 Second coordinates y.
 * @param color The color of the line.
 */
RenderCanvas.prototype.drawLine = function(x1, y1, x2, y2, color) {
	this.context.lineWidth = 2;
	x1 = Math.floor(x1);
	x2 = Math.floor(x2);
	y1 = Math.floor(y1);
	y2 = Math.floor(y2);
	this.context.strokeStyle = color.toString();
	this.context.beginPath();
	this.context.moveTo(x1, y1);
	this.context.lineTo(x2, y2);
	this.context.stroke();
};

/**
 * Draws a circle.
 *
 * @param xCenter The x position for the center of the circle.
 * @param yCenter The y position for the center of the circle.
 * @param radius The radius of the circle.
 * @param color The color of the circle.
 */
RenderCanvas.prototype.drawCircle = function(xCenter, yCenter, radius, color) {
	this.context.lineWidth = 2;
	this.context.strokeStyle = color.toString();
	this.context.beginPath();
	this.context.arc(xCenter, yCenter, radius, 0, 2 * Math.PI, true);
	this.context.stroke();
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
RenderCanvas.prototype.drawFilledRect = function(x0, y0, x1, y1, color, color2) {
	if(this.calls++ > this.maxCalls) return;
	this.context.save();
	if (color2 !== undefined) {
		var gradient = this.context.createLinearGradient(0, y0, 0, y1);
		gradient.addColorStop(0, color.toString());
		gradient.addColorStop(1, color2.toString());
		this.context.fillStyle = gradient;
	} else {
		this.context.fillStyle = color.toString();
	}

	this.context.fillRect(x0, y0, x1 - x0, y1 - y0);
	this.context.restore();
};

/**
 * Draws an {@link EMBImage}.
 *
 * @param image The {@link EMBImage}.
 * @param x The x position.
 * @param y The y position.
 * @param angle The angle of the rotation in radians.
 * @param centered If the image should be centered at the coordinates
 *			specified.
 * @param alpha The opacity level of the image.
 * @param tint The tint that should be applied on the image as a {@link Pixel32}.
 *			<b>Set it to null for no tint.</b>
 * @param hFlipped If the image should be horizontally flipped.
 */
RenderCanvas.prototype.drawImage = function(image, x, y, angle, centered, alpha, tint, hFlipped) {
	if(this.calls++ > this.maxCalls) return;
	this.context.save();
	if (alpha !== 1) this.context.globalAlpha = alpha;

	this.context.translate(x, y);

	var halfWidth = Math.floor(image.textureWidth / 2);
	var halfHeight = Math.floor(image.textureHeight / 2);

	if (angle !== 0) {
		if (!centered) this.context.translate(halfWidth, halfHeight);
		this.context.rotate(angle);
		this.context.translate(-halfWidth, -halfHeight);
	} else if (centered) {
		this.context.translate(-halfWidth, -halfHeight);
		x -= halfWidth;
		y -= halfHeight;
	}

	if (hFlipped) {
		x = -x;
		this.context.scale(-1, 1);
		this.context.translate(-image.textureWidth, 0);
		x -= image.textureWidth;
	}

	// Move the offset of the image.
	this.context.translate(image.xOffset, image.yOffset);
	x += image.xOffset;
	y += image.yOffset;

	if (!this.frontToBack) this.drawEMBImage(image, x, y, angle !== 0, this.context);

	if (tint != null && tint.a != 0) {
		// On the second canvas draw the image and use its alpha channel and
		// draw a rectangle over it with the tint color.
		this.secondContext.clearRect(0, 0, this.secondCanvas.width, this.secondCanvas.height);
		if (this.secondCanvas.width != image.width) this.secondCanvas.width = image.width;
		if (this.secondCanvas.height != image.height) this.secondCanvas.height = image.height;
		this.secondContext.save();

		this.drawEMBImage(image, 0, 0, false, this.secondContext);

		this.secondContext.globalCompositeOperation = "source-in";
		this.secondContext.globalAlpha = tint.a / 255.0;
		this.secondContext.fillStyle = tint.rgbString();
		this.secondContext.fillRect(0, 0, this.secondCanvas.width, this.secondCanvas.height);
		this.secondContext.restore();

		this.context.drawImage(this.secondCanvas, 0, 0);
	}

	if (this.frontToBack) this.drawEMBImage(image, x, y, angle !== 0, this.context);

	this.context.restore();
};

RenderCanvas.prototype.scale = function(v) {
	return Math.ceil(v * this.scaleFactor) / this.scaleFactor;
};

/**
 * Draws the tile on a canvas.
 *
 * @param context The canvas context.
 * @param x The x position.
 * @param y The y position.
 * @param angled If the image should be angled.
 * @param context The context to draw to.
 */
RenderCanvas.prototype.drawEMBImage = function(img, x, y, angled, context) {
	if (!img.image.complete) return;
	if (this.scaleFactor !== 1 && !angled) {
		var xs = this.scale(x);
		var ys = this.scale(y);
		context.drawImage(img.image, img.x, img.y, img.width, img.height, xs - x, ys - y,
				this.scale(x + img.width - xs), this.scale(y + img.height - ys));
	} else {
		context.drawImage(img.image, img.x, img.y, img.width, img.height, 0, 0, img.width, img.height);
	}
};

RenderCanvas.prototype.drawText = function(image, x, y, alpha, forced) {
	if(this.calls++ > this.maxCalls && (forced == undefined || !forced)) return;
	this.context.save();
	this.context.globalAlpha = alpha;
	this.context.drawImage(image, x, y);
	this.context.restore();
};

/**
 * Clears the canvas and sets a background color.
 *
 * @param {Pixel32} [color] If specified the background will be set to the specified color.
 */
RenderCanvas.prototype.clear = function(color) {
	this.calls = 0;
	this.context.clearRect(0, 0, this.canvas.width / this.scaleFactor, this.canvas.height / this.scaleFactor);
	if (color !== undefined) {
		this.drawFilledRect(0, 0, this.canvas.width / this.scaleFactor, this.canvas.height / this.scaleFactor, color.rgbString());
	}
};

/**
 * Draws a tiling image.
 *
 * @param image The {@link EMBImage}.
 * @param x The x coordinate of the first tile.
 * @param y The y coordinate of the first tile.
 * @param htiles Number of horizontal tiles.
 * @param vtiles Number of vertical tiles.
 * @param alpha The opacity level of the image.
 */
RenderCanvas.prototype.drawTilingImage = function(image, x, y, htiles, vtiles, alpha) {
	alpha = alpha === undefined ? 1 : alpha;
	this.context.save();
	if (alpha !== 1) this.context.globalAlpha = alpha;
	for (var i = 0; i < htiles; i++) {
		for (var j = 0; j < vtiles; j++) {
			this.context.save();
			var xPos = x + image.textureWidth * i - image.textureWidth / 2;
			var yPos = y + image.textureHeight * j - image.textureHeight / 2;
			this.context.translate(xPos, yPos);
			this.drawEMBImage(image, xPos, yPos, false, this.context);
			this.context.restore();
		}
	}
	this.context.restore();
};

/**
 * Draws lines between 4 points where each line have its own color.
 *
 * @param verts array with 8 integer values for x and y coordinates.
 * @param color is a Pixel32 instance
 */
RenderCanvas.prototype.drawQuad = function(verts, color) {
	var i2 = verts.length - 2;
	for (var i = 0; i < verts.length; i += 2) {
		this.drawLine(verts[i], verts[i + 1], verts[i2], verts[i2 + 1], color);
		i2 = i;
	}
};

RenderCanvas.prototype.drawTris = function(verts, numVerts, color) {
	var i2;
	for (var v = 0; v < numVerts; v += 6) {
		i2 = v + 4;
		for (var i = v; i < v + 6; i += 2) {
			this.drawLine(verts[i], verts[i + 1], verts[i2], verts[i2 + 1], color);
			i2 = i;
		}
	}
};

RenderCanvas.prototype.drawFillScreen = function(color) {
	if(this.calls++ > this.maxCalls) return;
	this.context.fillStyle = color.toString();
	this.context.fillRect(0, 0, this.canvas.width / this.scaleFactor, this.canvas.height / this.scaleFactor);
};

/**
 * Draws text on the canvas.
 *
 * @param x the x position of the upper left corner.
 * @param y the y position of the upper left corner.
 * @param txt the text.
 */
RenderCanvas.prototype.drawSystemText = function(txt, x, y, color) {
	this.context.textAlign = "left";
	this.context.fillStyle = color.toString();
	this.context.fillText(txt, x, y);
};

/**
 * Sets the scale factor on the canvas.
 *
 * @param {Number} factor The factor that the scale should be changed with.
 * @param {Boolean} [reset] if the scale should be reset from the old value.
 */
RenderCanvas.prototype.setScaleFactor = function(factor, reset) {
	if (reset !== undefined && reset) this.context.scale(1 / this.scaleFactor, 1 / this.scaleFactor);
	this.scaleFactor = factor;
	this.context.scale(this.scaleFactor, this.scaleFactor);
	if (this.frontToBack) {
		this.context.globalCompositeOperation = "destination-over";
	}
};

/**
 * Gets the context.
 *
 * @returns The context.
 */
RenderCanvas.prototype.getContext = function() {
	return this.context;
};

/**
 * Based on http://tulrich.com/geekstuff/canvas/jsgl.js
 *
 * @param image
 * @param xy
 * @param uv
 * @param tint
 * TODO: Add the texture offset?
 */
RenderCanvas.prototype.drawTriangleImage = function(image, xy, uv, tint) {
	var x0 = xy[0];
	var y0 = xy[1];
	var x1 = xy[2];
	var y1 = xy[3];
	var x2 = xy[4];
	var y2 = xy[5];

	var sx0 = uv[0];
	var sy0 = uv[1];
	var sx1 = uv[2];
	var sy1 = uv[3];
	var sx2 = uv[4];
	var sy2 = uv[5];

	this.context.save();
	this.context.beginPath();
	this.context.moveTo(x0, y0);
	this.context.lineTo(x1, y1);
	this.context.lineTo(x2, y2);
	this.context.closePath();
	this.context.clip();

	var denom = sx0 * (sy2 - sy1) - sx1 * sy2 + sx2 * sy1 + (sx1 - sx2) * sy0;
	if (denom === 0) return;

	var m11 = -(sy0 * (x2 - x1) - sy1 * x2 + sy2 * x1 + (sy1 - sy2) * x0) / denom;
	var m12 = (sy1 * y2 + sy0 * (y1 - y2) - sy2 * y1 + (sy2 - sy1) * y0) / denom;
	var m21 = (sx0 * (x2 - x1) - sx1 * x2 + sx2 * x1 + (sx1 - sx2) * x0) / denom;
	var m22 = -(sx1 * y2 + sx0 * (y1 - y2) - sx2 * y1 + (sx2 - sx1) * y0) / denom;
	var dx = (sx0 * (sy2 * x1 - sy1 * x2) + sy0 * (sx1 * x2 - sx2 * x1) + (sx2 * sy1 - sx1 * sy2) * x0) / denom;
	var dy = (sx0 * (sy2 * y1 - sy1 * y2) + sy0 * (sx1 * y2 - sx2 * y1) + (sx2 * sy1 - sx1 * sy2) * y0) / denom;

	/*
	 * Using the matrix instead: this.context.save(); this.context.beginPath();
	 * this.context.moveTo(xy[0], xy[1]); this.context.lineTo(xy[2], xy[3]);
	 * this.context.lineTo(xy[4], xy[5]); this.context.closePath();
	 * this.context.clip();
	 * 
	 * var denom = uv[0] * (uv[5] - uv[3]) - uv[2] * uv[5] + uv[4] * uv[3] +
	 * (uv[2] - uv[4]) * uv[1]; if (denom == 0) return;
	 * 
	 * var m11 = -(uv[1] * (xy[4] - xy[2]) - uv[3] * xy[4] + uv[5] * xy[2] +
	 * (uv[3] - uv[5]) * xy[0]) / denom; var m12 = (uv[3] * xy[5] + uv[1] *
	 * (xy[3] - xy[5]) - uv[5] * xy[3] + (uv[5] - uv[3]) * xy[1]) / denom; var
	 * m21 = (uv[0] * (xy[4] - xy[2]) - uv[2] * xy[4] + uv[4] * xy[2] + (uv[2] -
	 * uv[4]) * xy[0]) / denom; var m22 = -(uv[2] * xy[5] + uv[0] * (xy[3] -
	 * xy[5]) - uv[4] * xy[3] + (uv[4] - uv[2]) * xy[1]) / denom; var dx =
	 * (uv[0] * (uv[5] * xy[2] - uv[3] * xy[4]) + uv[1] * (uv[2] * xy[4] - uv[4] *
	 * xy[2]) + (uv[4] * uv[3] - uv[2] * uv[5]) * xy[0]) / denom; var dy =
	 * (uv[0] * (uv[5] * xy[3] - uv[3] * xy[5]) + uv[1] * (uv[2] * xy[5] - uv[4] *
	 * xy[3]) + (uv[4] * uv[3] - uv[2] * uv[5]) * xy[1]) / denom;
	 */

	this.context.transform(m11, m12, m21, m22, dx, dy);
	this.drawEMBImage(image, 0, 0, false, this.context);
	this.context.restore();
};

RenderCanvas.prototype.drawParticle = function(image, x, y, angle, scaleX, scaleY, alpha, color, additive) {
	if (this.calls++ > this.maxCalls) return;
	if (color != null) assert(color.r == 255 && color.b == 255 && color.g == 255, "Special draw particle");
	this.context.save();
	this.context.translate(x, y);
	if (scaleX != 1 || scaleY != 1) this.context.scale(scaleX, scaleY);
	if (additive) this.context.globalCompositeOperation = "lighter";
	this.drawImage(image, 0, 0, angle, true, alpha, null, false);
	this.context.restore();
};

RenderCanvas.prototype.drawCanvas = function(canvas, x, y) {
	if(this.calls++ > this.maxCalls) return;
	this.context.drawImage(canvas, x, y);
};

RenderCanvas.prototype.drawLayer = function(layer, ox, oy, x, y, nx, ny) {
	var i, j, offset;
	if (layer instanceof RenderTileLayer) {
		for (j = y; j < y + ny; j++) {
			var previous = layer.previous(x, j), last = layer.index(x + nx - 1, j);
			// run through all the columns and draw the images
			var img, ix, iy, centered, flipped;
			for (i = previous + 1,offset = i * 5; i <= last; i++) {
				if(this.calls++ > this.maxCalls) continue;
				// get tile info
				img = layer.tiles[offset++];
				ix = layer.tiles[offset++];
				iy = layer.tiles[offset++];
				offset++;
				flipped = layer.tiles[offset++];
				// draw the tile image

				var px = ox + ix + img.xOffset;
				var py = oy + iy + img.yOffset;
				var height = img.height;
				var width = img.width;

				if(this.scaleFactor !== 1){
					var pxs = this.scale(px);
					var pys = this.scale(py);
					height = this.scale(height + py - pys);
					width = this.scale(width + px - pxs);
					px = pxs;
					py = pys;
				}

				if (!flipped) {
					this.context.drawImage(img.image, img.x, img.y, img.width, img.height, px, py, width, height);
				} else {
					this.context.scale(-1, 1);
					this.context.drawImage(img.image, img.x, img.y, img.width, img.height, -(px + width), py, width, height);
					this.context.scale(-1, 1);
				}
			}
		}
	} else if (layer instanceof RenderSpriteLayer) {
		var count = layer.count();
		for (i = 0; i < count; i++) {
			offset = 4 * i;
			var minX = layer.rectangles[offset++];
			var minY = layer.rectangles[offset++];
			var maxX = layer.rectangles[offset++];
			var maxY = layer.rectangles[offset++];

			if (maxX >= x && minX <= x + nx && maxY >= y && minY <= y + ny) {
				if(this.calls++ > this.maxCalls) continue;
				offset = 5 * i;

				img = layer.tiles[offset++];
				ix = layer.tiles[offset++];
				iy = layer.tiles[offset++];
				centered = layer.tiles[offset++];
				flipped = layer.tiles[offset++];

				this.drawImage(img, ox + ix, oy + iy, 0, centered, 1, null, flipped);
			}
		}
	} else {
		assert(false);
	}
};

RenderCanvas.prototype.pushClipRect = function(r) {
    this.context.save();
	this.context.beginPath();
	this.context.moveTo(r.x0, r.y0);
	this.context.lineTo(r.x0, r.y1);
	this.context.lineTo(r.x1, r.y1);
	this.context.lineTo(r.x1, r.y0);
	this.context.lineTo(r.x0, r.y0);
	this.context.clip();
};

RenderCanvas.prototype.popClipRect = function() {
    this.context.restore();
};