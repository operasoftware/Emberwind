/**
 * Manages all resources.
 * @param path the path to the resource file.
 * @returns {ResourceDepot}
 */
function ResourceDepot(path) {
	if (!path) {
		path = "resources/";
	}

	this.language = this.detectLanguage();
	ResourceLoader.getInstance().language = this.language;

	this.path = path;
	this.callback = null;

	this.animations = [];
	this.imageSets = [];
	this.tileSets = [];
	this.atlases = {};
	this.sfx = {};

	this.fonts = {};

	this.stages = null;

	this.initialized = false;

	this.dialogueLoaded = false;

	/**
	 * Loaded tiles from TileSets.
	 */
	this.loadedTiles = [];
	/**
	 * Loaded animations from Animations.
	 */
	this.loadedAnimations = [];
	/**
	 * Loaded images from ImageSets.
	 */
	this.loadedImages = {};
}

ResourceDepot.instance = null;

ResourceDepot.getInstance = function() {
	if (ResourceDepot.instance === null) {
		ResourceDepot.instance = new ResourceDepot();
		ResourceDepot.instance.init();
	}

	return ResourceDepot.instance;
};

ResourceDepot.prototype = {};
ResourceDepot.prototype.constructor = ResourceDepot;

ResourceDepot.prototype.init = function () {
	loadJSON(this.path + "emberwind.json", createCallback(this.readResources, this));

	loadJSON(this.path + 'localized/' + this.language + '/stringtable.json', createCallback(this.callbackStringTable, this));
	loadJSON(this.path + 'localized/' + this.language + '/dialogue.json', createCallback(this.callbackDialogue, this));
};

ResourceDepot.prototype.detectLanguage = function() {
	var lang = navigator.language ? navigator.language : navigator.userLanguage;
	var ctr = lang.indexOf("-");
	if (ctr != -1) lang = lang.substring(0, ctr - 1);

	switch (lang) {
		case "nl":
			return "dutch";
		case "fr":
			return "french";
		case "de":
			return "german";
		case "it":
			return "italian";
		case "ja":
			return "japanese";
		case "pl":
			return "polish";
		case "pt":
			return "portuguese";
		case "ru":
			return "russian";
		case "es":
			return "spanish";
		case "sv":
			return "swedish";
		default:
			return "english";
	}
};

ResourceDepot.prototype.readResources = function(data) {
	var obj = JSON.parse(data, function(key, val) {
		if (val && typeof val == 'object' && val.type) {
			if (val.type == 'atlas') {
				return new Atlas(val);
			}
		} else if (key == 'tiles') {
			// Revives tile to a list of ConvexShape objects
			return val.map(function(tile) {
				tile.shapes = tile.shapes.map(function(sh) {
					var shape = new ConvexShape(sh.type, sh.material);
					if (sh.triangulation) {
						// Shape is defined by triangulation
						for (var pt = 0; pt < sh.triangulation.length; pt++) {
							var tri = sh.triangulation;
							shape.PushPoint(new Vec2(sh.data[tri[pt] * 2], sh.data[tri[pt] * 2 + 1]));
						}
					}
					else {
						for (var pts = 0; pts < sh.data.length; pts += 2) {
							shape.PushPoint(new Vec2(sh.data[pts], sh.data[pts + 1]));
						}
					}
					return shape;
				});

				return tile;
			});
		} else if (key == "layers") {
			// create trigger volumes
			return val.map(function(layer) {
				if (layer.type == "trigger") {
					if (layer.children == null) {
						layer.triggers = [];
					} else {
						layer.triggers = layer.children.map(function(child) {
							if (child.tag == "trigger") {
								var rect = new Rectf(child.xmin, child.ymin, child.xmax, child.ymax);
								var onenter = child.onenter == null ? "" : child.onenter;
								var onexit = child.onexit == null ? "" : child.onexit;
								return new TriggerVolume(child.name, rect, null, null, onenter, onexit);
							} else {
								assert(false, "unexpected resource tag");
							}
						});
					}
					return layer;
				} else {
					assert(false, "unexpected resource type");
				}
			});
		} else if (key == "objects") {
			return val.map(function(obj) {
				if (obj.x === undefined) obj.x = 0;
				if (obj.y === undefined) obj.y = 0;
				if (obj.count === undefined) obj.count = 0;
				if (obj.childcount === undefined) obj.childcount = 0;
				if (obj.grade === undefined) obj.grade = 0;
				if (obj.subhandles === undefined) obj.subhandles = [];
				return obj;
			});
		}
		return val;
	});

	this.atlases = obj.resources.atlases;
	this.tileSets = obj.resources.tilesets;
	this.imageSets = obj.resources.imagesets;
	this.animations = obj.resources.animations;
	this.stages = obj.game.stages;
	this.droptables = obj.droptables;

	this.sfx = obj.sfx;
	this.music = obj.music;

	var overrideFonts = obj.resources.overrideFonts;
	for (var i = 0; i < obj.resources.fonts.length; i++) {
		var f = obj.resources.fonts[i];
		if (this.language in overrideFonts) {
			if (f.font in overrideFonts[this.language]) {
				f.font = overrideFonts[this.language][f.font];
			}
		}
		this.fonts[f.id] = new Font(f);
	}

	this.initialized = true;
	this.callCallback();
};

ResourceDepot.prototype.callCallback = function() {
	if (this.callback !== null && this.initialized && this.stringTable != null && this.dialogueLoaded) {
		this.callback();
	}
};

ResourceDepot.prototype.setCallback = function(callback) {
	this.callback = callback;
};

ResourceDepot.prototype.callbackStringTable = function(data) {
	this.stringTable = JSON.parse(data);
	this.callCallback();
};

ResourceDepot.prototype.callbackDialogue = function(data) {
	app.game.dialogueSystem.read(JSON.parse(data));
	this.dialogueLoaded = true;
	this.callCallback();
};

ResourceDepot.prototype.getString = function(str) {
	return this.stringTable[str];
};

ResourceDepot.prototype.getImage = function(setName, imgName, localized) {
	localized = localized === undefined ? false : localized;
	var set = this.loadedImages[setName];
	if (set !== undefined) {
		var image = set[imgName];
		if (image !== undefined) {
			return image;
		}
	}

	var imageset = this.loadImageset(setName, localized);
	this.loadedImages[setName] = imageset;
	return imageset[imgName];
};

ResourceDepot.prototype.loadImageset = function(setName, localized) {
	localized = localized === undefined ? false : localized;
	var is = null;
	for (var i in this.imageSets) {
		if (this.imageSets.hasOwnProperty(i)) {
			var isl = this.imageSets[i];
			if (isl.name == setName) {
				is = isl;
				break;
			}
		}
	}

	var atlas = this.atlases[is.atlas];
	var sources = atlas.sources[is.name];

	var filename = atlas.filename;
	if (localized) filename = filename.replace(/english/, this.language);

	var set = {};
	for (var f in is.frames) {
		if (is.frames.hasOwnProperty(f)) {
			var name = is.frames[f];
			var source = sources[f];
			set[name] = this.getEMBImage(source, filename);
		}
	}

	return set;
};

ResourceDepot.prototype.getEMBImage = function(source, filename) {
	var width = source[2] - source[0] + 1;
	var height = source[3] - source[1] + 1;

	var xOffset = source[0] - source[4];
	var yOffset = source[1] - source[5];

	var textureWidth = xOffset + width + source[6] - source[2];
	var textureHeight = yOffset + height + source[7] - source[3];

	var image = ResourceLoader.getInstance().loadImage(filename);
	return new EMBImage(image, source[0], source[1], width, height, xOffset, yOffset, textureWidth, textureHeight);
};

ResourceDepot.prototype.getTileIndex = function(name) {
	for (var k in this.loadedTiles) {
		if (this.loadedTiles.hasOwnProperty(k)) {
			var t = this.loadedTiles[k];
			if (t.name == name) {
				return t.tile;
			}
		}
	}

	return -1;
};

ResourceDepot.prototype.getTile = function(index) {
	if (index == -1) return null;
	var t = this.loadedTiles[index];
	if (t !== undefined) return t;

	t = this.loadTile(index);
	this.loadedTiles[index] = t;
	return t;
};

ResourceDepot.prototype.loadTile = function(index) {
	var ts = null;
	for (var i in this.tileSets) {
		if (this.tileSets.hasOwnProperty(i)) {
			var tsl = this.tileSets[i];
			if (tsl.startid <= index && index < tsl.startid + tsl.numTiles) {
				ts = tsl;
				break;
			}
		}
	}

	var t = ts.tiles[index - ts.startid];
	var atlas = this.atlases[ts.atlas];
	var source = atlas.sources[ts.name][index - ts.startid];

	var width = source[2] - source[0] + 1;
	var height = source[3] - source[1] + 1;

	var xOffset = source[0] - source[4];
	var yOffset = source[1] - source[5];

	var textureWidth = xOffset + width + source[6] - source[2];
	var textureHeight = yOffset + height + source[7] - source[3];

	var image = ResourceLoader.getInstance().loadImage(atlas.filename);

	return new Tile(new EMBImage(image, source[0], source[1], width, height, xOffset, yOffset, textureWidth,
			textureHeight), t.shapes, index - ts.startid, t.name);
};


ResourceDepot.prototype.getTileIndex = function(name) {
	for (var i in this.tileSets) {
		if (this.tileSets.hasOwnProperty(i)) {
			var tsl = this.tileSets[i];
			for (var t = 0; t < tsl.tiles.length; t++) {
				var tile = tsl.tiles[t];
				if (tile.name == name) {
					return i * 100 + t;
				}
			}
		}
	}
	return -1;
};

ResourceDepot.prototype.getAnimation = function(index, callback, mirrored) {
	var a = this.loadedAnimations[index];
	if (a == undefined) {
		a = this.loadAnimation(index);
		this.loadedAnimations[index] = a;
	}

	if (a === null) {
		return null;
	}

	return new AnimationHandle(a, callback, mirrored);
};

ResourceDepot.prototype.loadAnimation = function(index) {
	var anim = null;
	if (typeof index == "number") {
		anim = this.animations[index];
	} else {
		for (var i = 0; i < this.animations.length; i++) {
			var at = this.animations[i];
			if (at.name == index) {
				anim = at;
				break;
			}
		}
	}

	if (anim === null) {
		return null;
	}

	var atlas = this.atlases[anim.atlas];
	var sources = atlas.sources[anim.name];

	var image = ResourceLoader.getInstance().loadImage(atlas.filename);

	var frames = [];
	for (var j = 0; j < sources.length; j++) {
		var source = sources[j];

		var width = source[2] - source[0] + 1;
		var height = source[3] - source[1] + 1;

		var xOffset = source[0] - source[4];
		var yOffset = source[1] - source[5];

		var textureWidth = xOffset + width + source[6] - source[2];
		var textureHeight = yOffset + height + source[7] - source[3];

		frames.push(new EMBImage(image, source[0], source[1], width, height, xOffset, yOffset, textureWidth,
				textureHeight));
	}
	return new Animation(anim, frames);
};

ResourceDepot.prototype.getFont = function(font) {
	return this.fonts[font];
};

/**
 * @param {String} name is the name of the SFX.
 */
ResourceDepot.prototype.getSFX = function(name) {
	return this.sfx[name];
};

ResourceDepot.prototype.getMusic = function(id) {
	return this.music[id];
};

ResourceDepot.prototype.getDropTable = function(id) {
	return this.droptables[id];
};

ResourceDepot.prototype.getDropType = function(id) {
	var t;
	if (t = this.droptables[id]) {
		var r = Math.floor(randomRange(0, t.totalRate + 1));
		for (var loot in t.loot) {
			if (Object.prototype.hasOwnProperty.call(t.loot, loot)) {
				r -= t.loot[loot];
				if (r <= 0) {
					return Pickup.litTypeToEnum[loot];
				}
			}
		}
	}
	return Pickup.Type.kPickupMaxType;
};

ResourceDepot.prototype.getDropCount = function(id) {
	var drops = 0;
	var t;
	if (t = this.droptables[id]) {
		var rolls = Math.floor(randomRange(t.min, t.max + 1));
		for (var i = 0; i < rolls; i++) {
			if (Math.floor(randomRange(0, t.noDropRate + t.totalRate + 1)) >= t.noDropRate) {
				drops++;
			}
		}
	}

	return drops;
};

/**
 * Loads a JSON file and sends the text back thrugh callback.
 *
 * @param file the file to get.
 * @param callback the callback that should be called when the file have been
 *			successfully downloaded.
 */
function loadJSON(file, callback) {
	var request = new XMLHttpRequest();
	request.open("GET", file, true);
	if (request.overrideMimeType) {
		request.overrideMimeType('application/json');
	}
	request.onreadystatechange = function() {
		if (request.readyState == 4) {
			if (request.status == 404)
				console.log("ERROR: file '" + file + "' does not exist!");
			else {
				var len = parseInt(request.getResponseHeader("Content-Length"));
				if (request.responseText.length !== len) {
					console.log(len, request.responseText.length);
					// TODO
					alert("An error occured while downloading Emberwind, please clear your cache and try again.");
				}
				else {
					callback(request.responseText);
				}
			}
		}
	};
	request.send();
}
