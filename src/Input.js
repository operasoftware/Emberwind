function InputHandler(canvas, useTouch) {
	this.offset = new Vec2(0, 0);
	this.scale = 1;

	var Button = function () {
		this.down = false;

		this.press = function () {
			this.down = true;
		};

		this.release = function () {
			this.down = false;
		};
	};

	if (useTouch) {
		this.bufferedTouches = [];
		this.touches = {};
	}
	else {
		var Mouse = function () {
			this.x = 0;
			this.y = 0;
			this.left = new Button();

			var _this = this;
			this.press = function () {
				_this.left.press();
			};

			this.release = function () {
				_this.left.release();
			};
		};

		var Keyboard = function () {
			this.keys = [];
			for (var k = 0; k < 255; k++) {
				this.keys[k] = new Button();
			}

			this.press = function (key) {
				this.keys[key].press();
			};

			this.release = function (key) {
				this.keys[key].release();
			};
		};

		this.mouse = new Mouse();
		this.keyboard = new Keyboard();

		this.bufferedInput = [];
	}

	this.useTouch = useTouch;
	InputHandler.instance = this;

	this.updateCanvas(canvas);
	this.updateSize(canvas);

	// TODO
	var gInp = new GameInput();
}

InputHandler.instance = null;

InputHandler.prototype.updateCanvas = function (canvas) {
	this.setInput(canvas);
};

InputHandler.prototype.updateSize = function (canvas) {
	var windowDimen = new Point2(window.innerWidth, window.innerHeight);

	var canvasWidth = canvas.parentNode.style.width;
	var canvasHeight = canvas.parentNode.style.height;

	// Drop 'px' suffix and cast to number
	canvasWidth = Number(canvasWidth.slice(0, canvasWidth.length - 2));
	canvasHeight = Number(canvasHeight.slice(0, canvasHeight.length - 2));

	var canvasDimen = new Point2(canvasWidth, canvasHeight);

	this.offset = windowDimen.subNew(canvasDimen).div(2);

	var maxWidth = 800;
	this.scale = canvasWidth / maxWidth;
};

InputHandler.prototype.setSize = function (scale, offset) {
	this.scale = scale;
	this.offset = offset;
};

InputHandler.prototype.setInput = function (canvas) {
	var _this = this;
	if (this.useTouch) {
		// Set up input listeners to register events synchronously
		// Touchscreen
		canvas.ontouchstart = function (evt) {
			evt.preventDefault();
			for (var t = 0; t < evt.changedTouches.length; ++t) {
				var e = evt.changedTouches.item(t);
				_this.bufferedTouches.push({dir:  1, x: e.clientX, y: e.clientY, id : e.identifier});
			}
		};

		canvas.ontouchend = function (evt) {
			evt.preventDefault();
			for (var t = 0; t < evt.changedTouches.length; ++t) {
				var e = evt.changedTouches.item(t);
				_this.bufferedTouches.push({dir: -1, x: e.clientX, y: e.clientY, id : e.identifier});
			}
		};
		canvas.ontouchmove = function (evt) {
			evt.preventDefault();
			for (var t = 0; t < evt.changedTouches.length; ++t) {
				var e = evt.changedTouches.item(t);
				_this.bufferedTouches.push({dir: 0, x: e.clientX, y: e.clientY, id : e.identifier});
			}
		};
	}
	else {
		// Set up input listeners to register events synchronously
		// Mouse
		canvas.onmousedown = function (e) {
			if (e.button === 0) {
				_this.bufferedInput.push(_this.mouse.press);
			}
		};

		canvas.onmousemove = function (e) {
			_this.bufferedInput.push(function () {
				_this.mouse.x = Math.floor((e.clientX - _this.offset.x) / _this.scale);
				_this.mouse.y = Math.floor((e.clientY - _this.offset.y) / _this.scale);
			});
		};

		canvas.onmouseup = function (e) {
			if (e.button === 0) {
				_this.bufferedInput.push(_this.mouse.release);
			}
		};

		// Keyboard 
		var blockList = [27,32,37,38,39,40]; // Esc, Space and Arrow keys
		window.onkeydown = function (e) {
			for (var i = 0; i < blockList.length; i++) {
				if (blockList[i] === e.keyCode) {
					e.preventDefault();
					break;
				}
			}

			_this.bufferedInput.push(function () {_this.keyboard.press(e.keyCode);});
		};

		window.onkeyup = function (e) {
			for (var i = 0; i < blockList.length; i++) {
				if (blockList[i] === e.keyCode) {
					e.preventDefault();
					break;
				}
			}

			_this.bufferedInput.push(function () {_this.keyboard.release(e.keyCode);});
		};
	}
};

InputHandler.prototype.addTouch = function (id, x, y) {
	assert(!this.touches[id], "New touch event, but already present.");

	// Other than the assertion, add and move are identical
	this.moveTouch(id, x, y);
};

InputHandler.prototype.delTouch = function (id, x, y) {
	delete this.touches[id];
};

InputHandler.prototype.moveTouch = function (id, x, y) {
	this.touches[id] = {move : false,
	                    x : Math.floor((x - this.offset.x) / this.scale),
						y : Math.floor((y - this.offset.y) / this.scale)};
};

InputHandler.prototype.update = function () {
	if (this.useTouch) {
		for (var t = 0; t < this.bufferedTouches.length; t++) {
			var e = this.bufferedTouches[t];

			switch (e.dir) {
				case  1: this.addTouch(e.id, e.x, e.y); break;
				case -1: this.delTouch(e.id, e.x, e.y); break;
				case  0: this.moveTouch(e.id, e.x, e.y); break;
			}
		}

		this.bufferedTouches = [];
	}
	else {
		for (var i = 0; i < this.bufferedInput.length; i++) {
			this.bufferedInput[i]();
		}

		this.bufferedInput = [];
	}

};

InputHandler.prototype.clickInCircle = function(x, y, r){
	if (this.useTouch) {
		for (var k in this.touches){
			var touch = this.touches[k];
			if(Math.pow(touch.x - x, 2) + Math.pow(touch.y - y, 2) < Math.pow(r, 2))
				return true;
		}
	}else{
		if((Math.pow(this.mouse.x - x, 2) + Math.pow(this.mouse.y - y, 2) < Math.pow(r, 2)) && this.mouse.left.down)
			return true;
	}
	return false;
};


var Buttons = {
	up : 0,
	down : 1,
	left : 2,
	right : 3,
	jump  : 4,
	attack : 5,
	enter  : 6,
	esc : 7,
	render : 8
};

function GameInputProto() {
	var kMaxPressedLength = 0.25;
	var kMaxReleasedLength = 0.25;

	var GameButton = function (name) {
		this.name = name;
		this.down = false;
		this.downLast = false;
		this.doubleTap = false;
		this.validFirst = false;

		this.timePressed = 0;
		this.timeSinceReleased = 0;

		this.pressed = function () {
			return (this.down && !this.downLast);
		};

		this.released = function () {
			return (!this.down && this.downLast);
		};

		this.doubleTapped = function () {
			return doubleTap;
		};

		this.press = function () {
			this.down = true;
			this.timePressed = 0;
			if (this.validFirst) {
				if (this.timeSinceReleased < kMaxReleasedLength) {
					this.doubleTap = true;
				}
				else {
					this.validFirst = false;
				}
			}
		};

		this.release = function () {
			this.down = false;
			this.timeSinceReleased = 0;
			if (this.doubleTap) {
				this.validFirst = false;
			}
			else if (!this.validFirst) {
				if (this.timePressed < kMaxPressedLength) {
					this.validFirst = true;
				}
			}
			this.doubleTap = false;

		};

		this.update = function (dt) {
			if (this.down) {
				this.timePressed += dt;
			}
			else {
				this.timeSinceReleased += dt;
			}
			this.downLast = this.down;
		};
	};

	this.buttons = [];

	for (var name in Buttons) {
		if (Buttons.hasOwnProperty(name)) {
			var btn = new GameButton(name);
			this.buttons[Buttons[name]] = btn;
		}
	}
}

GameInputProto.prototype.update = function (dt) {
	for (var name in Buttons) {
		if (Buttons.hasOwnProperty(name)) {
			this.buttons[Buttons[name]].update(dt);
		}
	}
};

GameInputProto.prototype.held = function (btn) {
	return this.buttons[btn].down;
};

GameInputProto.prototype.pressed = function (btn) {
	return this.buttons[btn].down && !this.buttons[btn].downLast;
};

GameInputProto.prototype.doubleTapped = function (btn) {
	return this.buttons[btn].doubleTap;
};

// ----------------------------------------------------------------------------

function GameInputKeyboard() {
	assert(!InputHandler.instance.useTouch);

	GameInputProto.apply(this, arguments);

	this.keyTrans = {
		// Key is keycode, value is Button identifier
		16 : Buttons.attack,
		17 : Buttons.enter,
		27 : Buttons.esc,
		32 : Buttons.attack,
		37 : Buttons.left,
		38 : Buttons.up,
		39 : Buttons.right,
		40 : Buttons.down,
		82 : Buttons.render
	};

	Buttons.jump = Buttons.up;

	for (var key in this.keyTrans) {
		if (this.keyTrans.hasOwnProperty(key)) {
			this.buttons[this.keyTrans[key]].keyCode = Number(key);
		}
	}
}

GameInputKeyboard.prototype = new GameInputProto();

GameInputKeyboard.prototype.update = function (dt) {
	GameInputProto.prototype.update.call(this, dt);

	var input = InputHandler.instance;

	for (var k in this.keyTrans) {
		if (this.keyTrans.hasOwnProperty(k)) {
			var key = input.keyboard.keys[Number(k)];
			var btn = this.buttons[this.keyTrans[k]];

			if (key.down && !btn.down) {
				btn.press();
			}
			else if (!key.down && btn.down) {
				btn.release();
			}
		}
	}
};

// ----------------------------------------------------------------------------

function GameInputTouch() {
	assert(InputHandler.instance.useTouch);

	GameInputProto.apply(this, arguments);

	this.guiButtons = [];
}

GameInputTouch.prototype = new GameInputProto();


GameInputTouch.prototype.update = function (dt) {
	GameInputProto.prototype.update.call(this, dt);

	var touches = InputHandler.instance.touches;

	for(var b in this.guiButtons){
		if (this.guiButtons.hasOwnProperty(b)) {
			var guiButton = this.guiButtons[Number(b)];
			var button = this.buttons[guiButton.type];
			var pressed = false;

			for(var k in touches){
				if (touches.hasOwnProperty(k)) {
					var touch = touches[Number(k)];
					if(guiButton.inside(touch.x, touch.y)){
						pressed = true;
						break;
					}
				}
			}

			if(pressed && !button.down){
				button.press();
			}else if(!pressed && button.down){
				button.release();
			}
		}
	}
};

GameInputTouch.prototype.addGUICircle = function (x, y, r, type) {
	this.guiButtons.push(new GUICircle(x, y, r, type));
};

GameInputTouch.prototype.addGUIRect = function (x0, y0, x1, y1, type) {
	this.guiButtons.push(new GUIRect(x0, y0, x1, y1, type));
};

GameInputTouch.prototype.addGUIIsoscelesTriangle = function(x0, y0, minDistance, distance, angle, directionAngle, type){
	this.guiButtons.push(new GUIIsoscelesTriangle(x0, y0, minDistance, distance, angle, directionAngle, type));
};



function GameInput() {
	GameInput.instance = InputHandler.instance.useTouch ? new GameInputTouch() : new GameInputKeyboard();

	return null;
}


GameInput.instance = null;



// ----------------------------------------------------------------------------

/**
 * @param type is a value  from the Button object.
 */
function GUICircle(x, y, r, type){
	this.x = x;
	this.y = y;
	this.r = r;
	this.type = type;
}

GUICircle.prototype.inside = function(x, y) {
	return Math.pow(x - this.x,2) + Math.pow(y - this.y, 2) <= Math.pow(this.r, 2);
};

function GUIRect(xMin, yMin, xMax, yMax, type){
	this.xMin = xMin;
	this.yMin = yMin;
	this.xMax = xMax;
	this.yMax = yMax;
	this.type = type;
}

GUIRect.prototype.inside = function(x, y) {
	return this.xMin <= x && this.yMin <= y && x <= this.xMax && y <= this.yMax;
};

/**
 * A isosceles triangle described as a point in the angle between the isosceles sides and base direction is facing to positive y.
 *
 * @param x0 x position of the point.
 * @param y0 y position of the point.
 * @param minDistance minimum distance from the point that the touch must be.
 * @param distance maximum distance from the point that the touch can be.
 * @param angle the angle in degrees between the isosceles sides.
 * @param directionAngle the angle in degrees of the whole triangle in steps of 90.
 * @param type button type.
 */
function GUIIsoscelesTriangle(x0, y0, minDistance, distance, angle, directionAngle, type) {
	assert(directionAngle % 90 == 0);
	assert(angle < 180 && angle > 0);
	assert(minDistance >= 0 && minDistance < distance);
	this.x0 = x0;
	this.y0 = y0;
	this.minD = minDistance;
	this.d = distance;
	this.yMultiplier = Math.tan(angle / 2 * Math.PI / 180);
	this.directionAngle = directionAngle;
	this.type = type;
}

GUIIsoscelesTriangle.prototype.inside = function(x, y) {
	if (this.directionAngle != 0) {
		x -= this.x0;
		y -= this.y0;
		var tmp;
		for (var i = 0; i < this.directionAngle; i += 90) {
			tmp = x;
			x = y;
			y = -tmp;
		}
		x += this.x0;
		y += this.y0;
	}

	var xAbs = Math.abs(x - this.x0);
	return xAbs <= this.d && this.y0 + this.minD <= y && y <= this.y0 + this.d && xAbs <= (y - this.y0) * this.yMultiplier;
};
