/**
 * A background or foreground item.
 * 
 * @param layer the layer object from the resource file.
 * @returns {MatteItem}
 */
function MatteItem(layer) {
	// this.depth = layer.depth;
	// this.type = layer.type;

	copy(layer, this);

	if (this.x === undefined) this.x = 0;
	if (this.y === undefined) this.y = 0;
	if (this.xvel === undefined) this.xvel = 0;
	if (this.yvel === undefined) this.yvel = 0;
	if (this.minh === undefined) this.minh = 0;
	if (this.minw === undefined) this.minw = 0;

	this.init();
}

MatteItem.prototype = {};
MatteItem.prototype.constructor = MatteItem;

/**
 * Initiates the object. Assigns the correct update and drawing methods.
 */
MatteItem.prototype.init = function() {
	if (this.type.indexOf("image") != -1) {
		var name = this.image.split('@');
		this.image = ResourceDepot.getInstance().getImage(name[0], name[1]);
	}

	this.update = this.updateStandard;

	switch (this.type) {
		case "colour":
			this.draw = this.drawColor;
			break;
		case "image":
			this.draw = this.drawImage;
			break;
		case "rimage":
			this.draw = this.drawRotatingImage;
			this.currentAngle = this.a;
			this.update = this.updateRotatingImage;
			break;
		case "timage":
			var tileDirection = this.tiledir.toUpperCase();
			if (tileDirection == "H") {
				this.draw = this.drawTilingImageHor;
			} else if (tileDirection == "V") {
				this.draw = this.drawTilingImageVert;
			} else {
				this.draw = this.drawTilingImage;
			}
			break;
		default:
			console.log("Unkown MatteItem type: " + this.type);
	}

	this.currPos = {
		x : this.x,
		y : this.y
	};
};

/**
 * Standard method for updating values.
 * 
 * @param timeDifference delta time.
 */
MatteItem.prototype.updateStandard = function(timeDifference) {
	this.currPos.x += this.xvel * timeDifference;
	this.currPos.y += this.yvel * timeDifference;
};

/**
 * Updates the angle on a rotating image.
 * 
 * @param timeDifference delta time.
 */
MatteItem.prototype.updateRotatingImage = function(timeDifference) {
	this.currentAngle += this.avel * timeDifference;
	this.updateStandard(timeDifference);
};

/**
 * Draws a color on the screen.
 */
MatteItem.prototype.drawColor = function(render, x, y, ext) {
	render.clear(new Pixel32(this.r, this.g, this.b));
};

/**
 * Draws an image.
 * 
 * @param render the render to use.
 * @param x the screens x position.
 * @param y the screens y position.
 * @param ext gameplayer extent.
 */
MatteItem.prototype.drawImage = function(render, x, y, ext) {
	var p = this.getPositioningValues(render, x, y, ext);
	var xSize = this.w !== undefined ? this.w : this.image.textureWidth;
	var ySize = this.h !== undefined ? this.h : this.image.textureHeight;

	xSize = Math.max(xSize, p.screenW);
	ySize = Math.max(ySize, p.screenH);

	var xScale = xSize / this.image.textureWidth;
	var yScale = ySize / this.image.textureHeight;

	xScale = Math.max(xScale, this.scale);
	yScale = Math.max(yScale, this.scale);

	render.drawParticle(this.image, p.wPos * (xSize - p.screenW) + xSize / 2, p.hPos * (ySize - p.screenH) + ySize / 2,
			0, xScale, yScale, 1, null, false);
};

/**
 * Draws a rotating image.
 * 
 * @param render the render to use.
 * @param x the screens x position.
 * @param y the screens y position.
 * @param ext gameplayer extent.
 */
MatteItem.prototype.drawRotatingImage = function(render, x, y, ext) {
	var p = this.getPositioningValues(render, x, y, ext);
	var xPos = p.wPos * (this.w - p.screenW) + this.currPos.x;
	var yPos = p.hPos * (this.h - p.screenH) + this.currPos.y;

	render.drawParticle(this.image, xPos, yPos, this.currentAngle, this.scale, this.scale, 1, null, false);

	// render.drawParticle(image, layer.x, layer.y);
	/*
	 * Vec2 pos((int)(wPos * (itemTemplate->itemSize.x - screenW)), (int)(hPos *
	 * (itemTemplate->itemSize.y - screenH))); pos += currPos;
	 * ri.DrawParticle(imgPtr, pos.x, pos.y, currAngle, itemTemplate->scale,
	 * itemTemplate->scale, 1.0f, Pixel32(0xffffffff), false);
	 */
};

/**
 * Draws a tiling image.
 * 
 * @param render the render to use.
 * @param x the screens x position.
 * @param y the screens y position.
 * @param ext gameplayer extent.
 */
MatteItem.prototype.drawTilingImage = function(render, x, y, ext) {
	var p = this.getPositioningValues(render, x, y, ext);
	var xPos = p.wPos * (this.w - p.screenW) + this.currPos.x;
	var yPos = p.hPos * (this.h - p.screenH) + this.currPos.y;

	var imgH = this.image.textureHeight * this.scale;

	var modPosH = yPos - Math.floor(yPos / imgH) * imgH;

	if (modPosH > imgH / 2) modPosH -= imgH;
	do {
		var imgW = this.image.textureWidth * this.scale;
		var modPosW = xPos - Math.floor(xPos / imgW) * imgW;

		if (modPosW > imgW / 2) modPosW -= imgW;
		do {
			render.drawParticle(this.image, modPosW, modPosH, 0, this.scale, this.scale, 1, null, false);
			modPosW += imgW;
		} while (modPosW - imgW / 2 < p.screenW);

		modPosH += imgH;
	} while (modPosH - imgH / 2 < p.screenH);
};

/**
 * Draws a horizontal tiling image.
 * 
 * @param render the render to use.
 * @param x the screens x position.
 * @param y the screens y position.
 * @param ext gameplayer extent.
 */
MatteItem.prototype.drawTilingImageHor = function(render, x, y, ext) {
	var p = this.getPositioningValues(render, x, y, ext);
	var xPos = p.wPos * (this.w - p.screenW) + this.currPos.x;
	var yPos = p.hPos * (this.h - p.screenH) + this.currPos.y;

	var imgW = this.image.textureWidth * this.scale;
	var modPosW = xPos - Math.floor(xPos / imgW) * imgW;

	if (modPosW > imgW / 2) modPosW -= imgW;
	do {
		render.drawParticle(this.image, modPosW, yPos, 0, this.scale, this.scale, 1, null, false);
		modPosW += imgW;
	} while (modPosW - imgW / 2 < p.screenW);
};

/**
 * Draws a vertical tiling image.
 * 
 * @param render the render to use.
 * @param x the screens x position.
 * @param y the screens y position.
 * @param ext gameplayer extent.
 */
MatteItem.prototype.drawTilingImageVert = function(render, x, y, ext) {
	var p = this.getPositioningValues(render, x, y, ext);
	var xPos = p.wPos * (this.w - p.screenW) + this.currPos.x;
	var yPos = p.hPos * (this.h - p.screenH) + this.currPos.y;

	var imgH = this.image.textureHeight * this.scale;

	var modPosH = yPos - Math.floor(yPos / imgH) * imgH;

	if (modPosH > imgH / 2) modPosH -= imgH;
	do {
		render.drawParticle(this.image, xPos, modPosH, 0, this.scale, this.scale, 1, null, false);
		modPosH += imgH;
	} while (modPosH - imgH / 2 < p.screenH);
};

/**
 * Gets positioning values that are used when drawing.
 * 
 * @param render the render to use.
 * @param x the screens x position.
 * @param y the screens y position.
 * @param ext gameplayer extent.
 * @returns {___anonymous7055_7134} An object with the following keys: hPos,
 *          wPos, screenH, screenW.
 */
MatteItem.prototype.getPositioningValues = function(render, x, y, ext) {
	var screenW = render.getWidth();
	var screenH = render.getHeight();
	var stgW = Math.max(ext.w, this.minw);
	var stgH = Math.max(ext.h, this.minh);
	var stgDiffW = Math.max(0, this.minw - ext.w);
	var stgDiffH = Math.max(0, this.minh - ext.h);
	var wPos = (x - stgDiffW / 2) / (stgW - screenW);
	var hPos = (y - stgDiffH / 2) / (stgH - screenH);
	return {
		hPos : hPos,
		wPos : wPos,
		screenH : screenH,
		screenW : screenW
	};
};

/**
 * Tile layer object.
 * 
 * @param layer tile layer object from the resource file.
 * @returns {TileLayer}
 */
function TileLayer(layer) {
	copy(layer, this);
	this.createLayers();
}

TileLayer.prototype = {};
TileLayer.prototype.constructor = TileLayer;

/**
 * creates layers data to draw
 */
TileLayer.prototype.createLayers = function() {
    var tileHeight = this.tileHeight;
    var tileWidth = this.tileWidth;
    var depot = ResourceDepot.getInstance();
    var layers = [], i, j, k, count, layer, tile, flipped, src, found;
    for (j = 0, count = 0; j < this.height; j++) {
        for (i = 0; i < this.width; i++, count++) {
            var tileId = this.data[i + j * this.width];
            if (tileId >= 0) {
                // we have a tile - either find a corresponding layer or create the new one
                flipped = false;
                if (tileId >= 65535) {
                    tileId -= 65535;
                    flipped = true;
                }
                tile = depot.getTile(tileId);
                // find the layer
                found = false;
                src = tile.image.image.src;
                for (k = 0; k < layers.length; k++)  {
                    layer = layers[k];
                    if (src == layer.src) {
                        found = true;
                        // the image goes in here
                        with (layer.tiles) {
                            push(tile.image);
                            push(i * tileWidth);
                            push(j * tileHeight);
                            push(false);
                            push(flipped);
                        }
                        layer.last++;
                    }
                    // put last image
                    layer.indices.push(layer.last);
                }
                // create layer if necessary
                if (!found) {
                    layer = {src : src, last : 0, tiles : [], indices : []};
                    layers.push(layer);
                    // fill tiles
                    with (layer.tiles) {
                        push(tile.image);
                        push(i * tileWidth);
                        push(j * tileHeight);
                        push(false);
                        push(flipped);
                    }
                    // fill indices
                    for (k = 0; k < count; k++) {
                        layer.indices.push(-1);
                    }
                    layer.indices.push(0);
                }
            } else {
                // repeat last image for all the layers
                for (k = 0; k < layers.length; k++) {
                    layer = layers[k];
                    layer.indices.push(layer.last);
                }
            }
        }
    }
    // create the actual render layers
    this.layers = [];
    for (k = 0; k < layers.length; k++) {
        layer = layers[k];
        this.layers.push(new RenderTileLayer(layer.tiles, layer.indices, this.width, this.height));
    }
};

/**
 * Draws the tile layer on the screen.
 * 
 * @param render the render to use.
 * @param cameraX the cameras x position.
 * @param cameraY the cameras y position.
 * @param timeSinceStart delta time.
 * @param screenW the width of the screen.
 * @param screenH the height of the screen.
 */
TileLayer.prototype.draw = function(render, cameraX, cameraY, timeSinceStart, screenW, screenH) {
	var tileHeight = this.tileHeight;
	var tileWidth = this.tileWidth;

	var startX = Math.max(0, Math.floor(-cameraX / tileWidth - 1));
	var endX = Math.min(this.width, Math.ceil((screenW - cameraX) / tileWidth));

	var startY = Math.max(0, Math.floor(-cameraY / tileHeight - 1));
	var endY = Math.min(this.height, Math.ceil((screenH - cameraY) / tileHeight));

	// draw static tile layers 
	var k;
	for (k = 0; k < this.layers.length; k++) {
	    render.drawLayer(this.layers[k], cameraX, cameraY, startX, startY, endX - startX, endY - startY);
	}
	// draw animations
	for ( var x = startX; x < endX; x++) {
		for ( var y = startY; y < endY; y++) {
			var tileId = this.data[x + y * this.width];
			if (tileId < -1) {
			    var xPos = x * tileWidth + cameraX;
	            var yPos = y * tileHeight + cameraY;
	            
			    var animation = ResourceDepot.getInstance().getAnimation(-(tileId + 2)).animation;
                var time = timeSinceStart - Math.floor(timeSinceStart / animation.animationLength) * animation.animationLength;

                var frameIndex = Math.floor(time * animation.framerate);
                var image = animation.frames[frameIndex];
                render.drawImage(image, xPos, yPos, 0, false, 1, null, false);
			}
		}
	}
};

TileLayer.prototype.replaceTiles = function(from, to, rect){
	var tileStartW = Clamp(0, Math.floor(rect.x0 / this.tileWidth), this.width * this.tileWidth - 1);
	var tileEndW = Clamp(0, Math.floor(rect.x1 / this.tileWidth), this.width * this.tileWidth - 1);
	var tileStartH = Clamp(0, Math.floor(rect.y0 / this.tileHeight), this.height * this.tileHeight - 1);
	var tileEndH = Clamp(0, Math.floor(rect.y1 / this.tileHeight), this.height * this.tileHeight - 1);

	var dep = ResourceDepot.getInstance();

	var changed = false;

	for ( var x = tileStartW; x < tileEndW; x++) {
		for ( var y = tileStartH; y < tileEndH; y++) {
			var tileId = this.data[x + y * this.width];
			if (tileId >= 0) {
				var tile = dep.getTile(tileId);
				if (tile.name != null && tile.name.indexOf(from) == 0) {
					this.data[x + y * this.width] = dep.getTileIndex(to + from.substring(from.length));
					changed = true;
				}
			}
		}
	}

	if(changed) this.createLayers();
};

/*
 * SpriteLayer class
 */

SpriteLayer.prototype = {};
SpriteLayer.prototype.constructor = SpriteLayer;

/**
 * A sprite layer. Sprite layer uses a single image.
 * 
 * @param spritelayer a sprite layer object from the resource file.
 * @returns {SpriteLayer}
 */
function SpriteLayer(spritelayer) {
	this.depth = spritelayer.depth;
	this.sprites = spritelayer.sprites;
	this.createLayers();
}

/**
 * create sprite layers for renderer
 */
SpriteLayer.prototype.createLayers = function() {
    // each layer works on a single image
    this.layers = [];
    var i, sprite, flipped, image, tiles = null, rectangles = null, x0, y0, x1, y1, currentSetName = null;
    for (i = 0; i < this.sprites.length; i++) {
        sprite = this.sprites[i];
        // if we've encountered a new image - flush current state to render layer
        if (sprite.set == currentSetName) {
            with (Math) {
                x0 = min(x0, sprite.minX); y0 = min(y0, sprite.minY);
                x1 = max(x1, sprite.maxX); y1 = max(y1, sprite.maxY);
            }
        } else {
            if (tiles != null) {
                this.layers.push(new RenderSpriteLayer(tiles, rectangles, new Rectf(x0, y0, x1, y1)));
            }
            tiles = [];
            rectangles = [];
            currentSetName = sprite.set;
            x0 = sprite.minX; y0 = sprite.minY;
            x1 = sprite.maxX; y1 = sprite.maxY;
        }
        // add the sprite to current sprite layer
        image = ResourceDepot.getInstance().getImage(sprite.set, sprite.img);
        flipped = sprite.flipped !== undefined;
        // fill in data
        with (tiles) {
            push(image);
            push(sprite.x);
            push(sprite.y);
            push(true);
            push(flipped);
        }
        // fill in bounding rectangles
        with (rectangles) {
            push(sprite.minX);
            push(sprite.minY);
            push(sprite.maxX);
            push(sprite.maxY);
        }
    }
    // push the last layer
    if (tiles != null) {
        this.layers.push(new RenderSpriteLayer(tiles, rectangles, new Rectf(x0, y0, x1, y1)));
    }
};

/**
 * Draws the sprite layer on the screen.
 * 
 * @param render the render to use.
 * @param x the screens current x position.
 * @param y the screens current y position.
 */
SpriteLayer.prototype.draw = function(render, x, y, screenW, screenH) {
	var minX = -x;
	var maxX = -x + screenW;

	var minY = -y;
	var maxY = -y + screenH;

	var frontToBack = render.isFrontToBack(), i;
	for (i = 0; i < this.layers.length; i++) {
	    var inx = frontToBack ? this.layers.length - 1 - i: i;
	    var layer = this.layers[inx];
	    with (layer.rect) {
	        if (x1 >= minX && x0 <= maxX && y1 >= minY && y0 <= maxY) {
	            render.drawLayer(layer, x, y, minX, minY, maxX - minX + 1, maxY - minY + 1);
	        }
	    }
	}
};

/**
 * Back water layer.
 *
 * @param layer the object from the resource file.
 */
function BackWaterLayer(layer) {
    this.topHeight = 17;
    this.y = layer.y + 96 - this.topHeight;
    this.depth = layer.depth;

    this.waterColor = new Pixel32(74, 138, 184);
    this.waterColorTransparent = new Pixel32(74, 138, 184, 0);
}

BackWaterLayer.prototype = {};
BackWaterLayer.prototype.constructor = BackWaterLayer;

BackWaterLayer.prototype.draw = function(render, x, y, screenW, screenH) {
    var y0 = this.y + y;
    if (-y + screenH <= this.y) {
        return;
    } else if (y0 <= -this.topHeight) {
        render.drawFilledRect(0, 0, screenW, screenH, this.waterColor);
    } else {
        render.drawFilledRect(0, y0, screenW, y0 + this.topHeight, this.waterColorTransparent, this.waterColor);
        render.drawFilledRect(0, y0 + this.topHeight, screenW, screenH, this.waterColor);
    }
};

/**
 * Fore water layer.
 *
 * @param layer the object from the resource file.
 */
function ForeWaterLayer(layer) {
    this.y = layer.y;
    this.depth = layer.depth;

    var dep = ResourceDepot.getInstance();
    this.animations = [
                       dep.getAnimation(0).animation,
                       dep.getAnimation(1).animation,
                       dep.getAnimation(2).animation
                       ];

    this.waterColor = new Pixel32(74, 138, 184, 191);
}

ForeWaterLayer.prototype = {};
ForeWaterLayer.prototype.constructor = ForeWaterLayer;

ForeWaterLayer.prototype.draw = function(render, x, y, timeSinceStart, screenW, screenH) {
    var y0 = this.y + y;
    if (-y + screenH <= this.y) {
        return;
    } else if (y0 <= -96) {
        render.drawFilledRect(0, 0, screenW, screenH, this.waterColor);
    } else {
        var s = Math.floor(-x / 96) % 3;
        var xp = -((-x) % 96);
        while (xp < screenW) {
            var animation = this.animations[s];
            var time = timeSinceStart - Math.floor(timeSinceStart / animation.animationLength) * animation.animationLength;
            var frameIndex = Math.floor(time * animation.framerate);
            var image = animation.frames[frameIndex];
            render.drawImage(image, xp, y0, 0, false, 1, null, false);
            xp += 96;
            s = (s + 1) % 3;
        }
        render.drawFilledRect(0, y0+96, screenW, screenH, this.waterColor);
    }
};
