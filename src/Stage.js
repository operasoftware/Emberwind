/**
 * A stage of the game. Handles updating and drawings of the stage.
 *
 * @param stageName the name of the stage.
 * @param preloadCallback a callback that will be called during the preloading
 *			face.
 */
function Stage(stageName, preloadCallback) {
	this.name = stageName;
	this.res = ResourceDepot.getInstance();
	this.backgrounds = [];
	this.foregrounds = [];

	this.tileLayers = [];
	this.spriteLayers = [];
	this.layers = [];
	this.backWaterLayer = null;
	this.foreWaterLayer = null;
	this.gameObjects = null; // @type [GameObjects]
	this.objectLayers = [];
	this.objects = [];
	this.shapes = []; // @type [[ConvexShape]]
	this.triggers = []; // @type [[TriggerVolume]]

	this.particleSystem = null;

	this.timeSinceStart = 0;

	this.gameplayExtent = null;
	this.gamePlayLayerExtent = null;

	//this.initStage(preloadCallback);

	this.startTime = new Date();

	this.drawList = [this.drawBackgrounds, this.drawOther, this.drawForegrounds];
	// create trigger controller
	this.triggerSystem = new TriggerSystem();
}

Stage.prototype = {};
Stage.prototype.constructor = Stage;

/**
 * Initiates the stage.
 *
 * @param preloadCallback a callback that will be called during the preloading
 *			phase.
 */
Stage.prototype.initStage = function(preloadCallback) {
	this.loadResources(this.name, preloadCallback);
	this.particleSystem = new ParticleSystem();
	this.createObjects();
	this.gameObjects = new GameObjects(0);
	this.gameObjects.children = this.objects;

	this.gamePlayLayerExtent = this.getGamePlayLayerExtent();
	this.gameplayExtent = {w : this.gamePlayLayerExtent.width, h : this.gamePlayLayerExtent.height};

	this.loadShapes();

	var sr = this.res.stages[this.name];

	this.type = sr.type;

	this.layers = this.tileLayers.concat(this.spriteLayers);
	this.layers.push(this.gameObjects);
	if(this.backWaterLayer !== null)
		this.layers.push(this.backWaterLayer);
	if(this.foreWaterLayer !== null)
		this.layers.push(this.foreWaterLayer);
	this.sortLayers();

	this.gameObjects.init();

	// put trigger volumes into the system
	for (var i = 0; i < this.triggers.length; i++) {
		this.triggerSystem.addVolume(this.triggers[i]);
	}

	app.game.focus.spawnOnWick();

	if(this.foreWaterLayer){
		var y = this.foreWaterLayer.y + 72;
		this.gameObjects.children.forEach(function(o){o.setWaterLevel(y);});
		app.game.focus.setWaterLevel(y);
	}
};

/**
 * Sorts the layers in descending depth.
 */
Stage.prototype.sortLayers = function() {
	this.layers.sort(function(a, b) {
		if (a.depth > b.depth) return -1;
		else if (a.depth < b.depth) return 1;
		return 0;
	});
};

/**
 * Loads all resources from the resource file and starts the preloading of the
 * images.
 *
 * @param {String} stageName the name of the stage to load.
 * @param {Function} preloadCallback callback that will run when the progress updates.
 * @param {Object} [preloads] object with the filenames as keys.
 */
Stage.prototype.loadResources = function(stageName, preloadCallback, preloads) {
	var sr = this.res.stages[stageName];
	preloads = preloads === undefined ? {} : preloads;

	sr.preload.forEach(function(v) {preloads[v] = true;});

	if (sr.referencestage !== undefined) {
		this.loadResources(sr.referencestage, preloadCallback, preloads);
	}else{
		var preArr = [];
		for (i in preloads) preArr.push(i);
		ResourceLoader.getInstance().preloadImages(preArr, preloadCallback);
	}

	this.backgrounds = this.backgrounds.concat(sr.backgrounds.map(function(v) {
		return new MatteItem(v);
	}));

	this.foregrounds = this.foregrounds.concat(sr.foregrounds.map(function(v) {
		return new MatteItem(v);
	}));

	this.tileLayers = this.tileLayers.concat(sr.tilelayers.map(function(v) {
		return new TileLayer(v);
	}));

	this.spriteLayers = this.spriteLayers.concat(sr.spritelayers.map(function(v) {
		return new SpriteLayer(v);
	}));

	if(sr.backwater != undefined){
		this.backWaterLayer = new BackWaterLayer(sr.backwater);
	}

	if(sr.forewater != undefined){
		this.foreWaterLayer = new ForeWaterLayer(sr.forewater);
	}

	// Triggers get collected from different layers
	for (var i = 0; i < sr.layers.length; i++) {
		this.triggers = this.triggers.concat(sr.layers[i].triggers);
	}

	this.objectLayers = this.objectLayers.concat(sr.objectlayers);
};

Stage.prototype.createObjects = function(){
	for (var i = 0; i < this.objectLayers.length; i++) {
		var kindle = null;
		var objects = this.objectLayers[i].objects;
		for (var j = 0; j < objects.length; j++) {
			var o = objects[j];
			var object = null;
			switch (o.type) {
				case "player":
					kindle = new PlayerCharacter(true, true);
					kindle.create(this.triggerSystem);
					kindle.setStartPos(o.x, o.y);
					kindle.onCreate(o);
					continue;
				case "gremlin":
					object = new Gremlin();
					break;
				case "caveentrance":
					object = new CaveEntrance();
					break;
				case "caveexit":
					object = new CaveExit();
					break;
				case "houseentrance":
					object = new HouseEntrance();
					break;
				case "house":
					object = new House();
					break;
				case "wick":
					object = new Wick();
					break;
				case "fireplace":
					object = new Fireplace();
					break;
				case "pickup":
					object = new Pickup();
					break;
				default:
					continue;
			}

			object.setStartPos(o.x, o.y);
			object.onCreate(o);

			this.objects.push(object);
		}
		if (kindle !== null) this.objects.push(kindle);
	}
};

/**
 * Load shapes from the tile layers
 */
Stage.prototype.loadShapes = function () {
	for (var i = 0; i < this.tileLayers.length; i++) {
		if (this.tileLayers[i].name.toLowerCase() == "gameplay") {
			var layer = this.tileLayers[i];

			for (var tileY = 0; tileY < layer.height; tileY++) {
				for (var tileX = 0; tileX < layer.width; tileX++) {
					var tileId = layer.data[tileX + layer.width * tileY];
					if (tileId < 0) {
						continue;
					} // Skip animations


					var xPos = tileX * layer.tileWidth;
					var yPos = tileY * layer.tileHeight;

					var hFlip = false;
					if (tileId > 65535) {
						tileId -= 65535;
						hFlip = true;
					}

					var tile = ResourceDepot.getInstance().getTile(tileId);

					if (tile.shapes) {
						for (var s = 0; s < tile.shapes.length; s++) {
							var shape = tile.shapes[s].DeepCopy();
							shape = hFlip ? shape.HFlip(layer.tileWidth / 2) : shape;
							shape.Offset(new Vec2(xPos, yPos));

							if (!this.shapes[tileX]) {
								this.shapes[tileX] = [];
							}

							if (!this.shapes[tileX][tileY]) {
								this.shapes[tileX][tileY] = [];
							}

							this.shapes[tileX][tileY].push(shape);
						}
					}
				}
			}
		}
	}
};

/**
 * Updates values on the objects that depend on time.
 *
 * @param timeDifference delta value of the time.
 */
Stage.prototype.update = function(timeDifference) {
	this.timeSinceStart += timeDifference;

	for (var i = 0; i < this.backgrounds.length; i++) {
		this.backgrounds[i].update(timeDifference);
	}

	for (var j = 0; j < this.foregrounds.length; j++) {
		this.foregrounds[j].update(timeDifference);
	}

	// Updating objects done in the game class
	//this.objects.map(function(v) {
	//	v.update(timeDifference);
	//});

	// update triggers
	this.triggerSystem.update(this.gamePlayLayerExtent);

	this.particleSystem.update(timeDifference);
};

/**
 * Draws backgrounds, tiles, sprites and foregrounds on the screen.
 *
 * @param render the render to use.
 * @param x the x position of the upper left corner.
 * @param y the y position of the upper left corner.
 */

Stage.prototype.draw = function(render, x, y) {
	var screenW = render.getWidth();
	var screenH = render.getHeight();

	var frontToBack = render.isFrontToBack();
	for (var i = 0; i < this.drawList.length; i++) {
		var draw = this.drawList[frontToBack ? this.drawList.length - 1 - i : i];
		draw.call(this, frontToBack, render, x, y, this.timeSinceStart, screenW, screenH);
	}

	if (app.debugMovementTrigger) {
		this.triggerSystem.draw(render, x, y);
	}
};

Stage.prototype.drawOther = function(frontToBack, render, x, y, timeSinceStart, screenW, screenH) {
	for (var i = 0; i < this.layers.length; i++) {
		var l = this.layers[frontToBack ? this.layers.length - 1 - i : i];

		if (l instanceof TileLayer || l instanceof ForeWaterLayer) {
			l.draw(render, x, y, timeSinceStart, screenW, screenH);
		} else if (l instanceof SpriteLayer || l instanceof BackWaterLayer) {
			l.draw(render, x, y, screenW, screenH);
		} else {
			l.draw(render, x, y);
		}
	}
};

Stage.prototype.drawBackgrounds = function(frontToBack, render, x, y) {
	if(frontToBack) this.particleSystem.draw(render, x, y, false);
	for (var i = 0; i < this.backgrounds.length; i++) {
		var l = this.backgrounds[frontToBack ? this.backgrounds.length - 1 - i : i];
		l.draw(render, x, y, this.gameplayExtent);
	}
	if(!frontToBack) this.particleSystem.draw(render, x, y, false);
};

Stage.prototype.drawForegrounds = function(frontToBack, render, x, y) {
	if(frontToBack) this.particleSystem.draw(render, x, y, true);
	for (var i = 0; i < this.foregrounds.length; i++) {
		var l = this.foregrounds[frontToBack ? this.foregrounds.length - 1 - i : i];
		l.draw(render, x, y, this.gameplayExtent);
	}
	if(!frontToBack) this.particleSystem.draw(render, x, y, true);
};

/**
 * Checks how large the stage is by looking at the gameplay layer.
 *
 * @returns Rectf
 */
Stage.prototype.getGamePlayLayerExtent = function() {
	var i, w = 0, h = 0, found = false;
	for (i = 0; !found && i < this.tileLayers.length; i++) {
		var layer = this.tileLayers[i];
		if (layer.depth == 0) {
			this.tileW = layer.tileWidth;
			this.tileH = layer.tileHeight;
			w = layer.width * layer.tileWidth;
			h = layer.height * layer.tileHeight;
			found = true;
		}
	}
	return new Rectf(0, 0, w, h);
};

