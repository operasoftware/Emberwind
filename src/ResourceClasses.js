/**
 * Atlas for a set of images.
 *
 * @param obj object from the JSON resource file.
 * @returns {Atlas}
 */
function Atlas(obj) {
	this.name = obj.name;
	this.filename = obj.filename;
	this.sources = {};

	for (var k in obj.sources) {
		if (obj.sources.hasOwnProperty(k)) {
			var s = obj.sources[k];
			this.sources[s.name] = s.data;
		}
	}
}

Atlas.prototype = {};
Atlas.prototype.constructor = Atlas;

/**
 * Tile container
 *
 * @param {EMBImage} image Tile image
 * @param {CPoly} poly Tile polygon
 * @param {Number} index Tile index
 * @param {String} [name] Tile name
 */
function Tile(image, shapes, index, name) {
	name = name == undefined ? null : name;
	this.image = image;
	this.shapes = shapes;
	this.index = index;
	this.name = name;
}

function ResourceLoader() {
	this.language = null;

	/**
	 * Loaded images.
	 */
	this.loadedImages = {};

	this.imagePath = "resources/";
}

ResourceLoader.instance = null;

ResourceLoader.getInstance = function() {
	if (ResourceLoader.instance === null) {
		ResourceLoader.instance = new ResourceLoader();
	}

	return ResourceLoader.instance;
};

ResourceLoader.prototype = {};
ResourceLoader.prototype.constructor = ResourceLoader;

ResourceLoader.prototype.loadImage = function(filename) {
	var image = this.loadedImages[filename];
	if (image !== undefined) return image;

	image = new Image();
	image.src = this.imagePath + filename;
	this.loadedImages[filename] = image;
	return image;
};

/**
 * Preloads images and calls a callback function for every finshed image.
 *
 * @param filenames array with filenames of images that should be downloaded.
 * @param callback the callback that will be called after an image have been
 *			downloaded.
 */
ResourceLoader.prototype.preloadImages = function(filenames, callback) {
	var imagesLoaded = 0;
	var length = filenames.length;

	var callCallback = function(arg) {
		if (callback !== undefined) {
			callback(arg);
		}
	};

	var imageLoaded = function() {
		imagesLoaded++;
		callCallback(imagesLoaded / length);
	};

	var imageError = function() {
		alert("An image could not be loaded! Please reload the page to try again.");
	};

	for (var i = 0; i < length; i++) {
		var filename = filenames[i];
		var image = this.loadedImages[filename];
		if (image !== undefined) {
			imagesLoaded++;
			continue;
		}

		image = new Image();
		image.onload = imageLoaded;
		image.onerror = imageError;
		image.src = this.imagePath + filename.replace(/english/, this.language);
		this.loadedImages[filename] = image;
	}

	callCallback(imagesLoaded / length);
};

/**
 * A font defined by the games resource file.
 * @param f
 * @returns {Font}
 */
function Font(f) {
	this.baseColor = new Pixel32(f.base_r, f.base_g, f.base_b);
	this.outlineColor = new Pixel32(f.outline_r, f.outline_g, f.outline_b);
	this.size = f.size;
	this.font = f.font;
	this.outline = f.outline;
}

Font.prototype.getFont = function() {
	return "normal " + this.size + "px " + this.font;
};

/**
 * Generate a canvas with a specified text on it using this font.
 * @param {String} text some text that should be drawn.
 * @param {Number} wrapWidth the width that the text should wrap to a new line. Optional.
 * @returns {Canvas}
 */
Font.prototype.generateCanvas = function(text, wrapWidth) {
	var canvas = document.createElement('canvas');
	var c = canvas.getContext('2d');

	c.font = this.getFont();

	var outline = this.outline * 2;

	if (wrapWidth != undefined) {
		text = this.wrapText(c, text, wrapWidth);
		canvas.width = c.measureText(text).width + 8 + outline * 2; // Margin
		canvas.height = (this.size + outline * 4) * text.split("\n").length;
	} else {
		canvas.width = c.measureText(text).width + 8 + outline * 2; // Margin
		canvas.height = this.size + outline * 4;
	}

	c.fillStyle = this.baseColor.rgbString();
	c.textBaseline = "middle";
	c.textAlign = "left";
	c.font = this.getFont();

	if (outline != 0) {
		c.strokeStyle = this.outlineColor.rgbString();
		c.lineWidth = outline;
		c.strokeText(text, outline, this.size / 2 + outline * 2);
	}

	c.fillText(text, outline, this.size / 2 + outline * 2);

	return canvas;
};

Font.prototype.wrapText = function(c, text, width) {
	var result = "";
	var parts = text.split(" ");
	var i = 0;
	while (i < parts.length) {
		if (c.measureText(result + parts[i]).width >= width) {
			result += "\n" + parts[i];
		} else if (i != 0) {
			result += " " + parts[i];
		} else {
			result += parts[i];
		}
		i++;
	}
	return result;
};
