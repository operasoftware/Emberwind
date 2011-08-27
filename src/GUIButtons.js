/**
 * Simple layout for GUI buttons.
 */
function GUIBox(){
	this.buttons = [];
	this.maxWidth = 0;
	this.xCenter = 400;
	this.y = 200;
	this.spacing = 6;

	this.keyboardPosition = null;
}

GUIBox.prototype = {};
GUIBox.prototype.constructor = GUIBox;

GUIBox.prototype.draw = function(render) {
	for (var i = 0; i < this.buttons.length; i++) {
		var button = this.buttons[i];

		button.draw(render, button.position.x, button.position.y, null);
	}
};


GUIBox.prototype.addButton = function(newButton) {
	//var width = button.size.width;
	//var height = button.size.height;
	//if(this.maxWidth < width){
	//	for (var i = 0; i < this.buttons.length; i++) {
	//		this.buttons[i].setButtonInternalSize(width, this.buttons[i].size.height);
	//	}
	//	this.maxWidth = width;
	//}
	//else button.setButtonInternalSize(this.maxWidth, height);

	this.buttons.push(newButton);

	var y = this.y;
	for (var i = 0; i < this.buttons.length; i++) {
		var button = this.buttons[i];

		button.position = new Point2(Math.floor(this.xCenter - button.size.width / 2), y);
		y = y + button.size.height + this.spacing;
	}

};

GUIBox.prototype.update = function(dt) {
	var keyboard = GameInput.instance;
	var keyboardDown = false;

	if(keyboard.pressed(Buttons.up)){
		if(this.keyboardPosition == null) this.keyboardPosition = this.buttons.length - 1;
		else this.keyboardPosition = (this.keyboardPosition - 1 + this.buttons.length) % this.buttons.length;
	}else if(keyboard.pressed(Buttons.down)){
		if(this.keyboardPosition == null) this.keyboardPosition = 0;
		else this.keyboardPosition = (this.keyboardPosition + 1) % this.buttons.length;
	}else if(keyboard.pressed(Buttons.attack)){
		if(this.keyboardPosition != null){
			keyboardDown = true;
		}
	}

	for (var i = 0; i < this.buttons.length; i++) {
		var button = this.buttons[i];

		GUIButton.prototype.update.call(button, i==this.keyboardPosition, keyboardDown);
	}
};


// ----------------------------------------------------------------------------

function GUIComponent(){
	this.position = new Point2();
}

GUIComponent.prototype = {};
GUIComponent.prototype.constructor = GUIComponent;

GUIComponent.prototype.isMouseOver = function(x, y){
  var pos = this.getPosition();
  return (new Rectf(pos.x, pos.y, pos.x + this.getSize().x, pos.y + this.getSize().y)).contains(x, y);
};

GUIComponent.prototype.setPosition = function(pos) {
	this.position = pos;
};

GUIComponent.prototype.getPosition = function() {
	return this.position;
};

// ----------------------------------------------------------------------------

function GUITextButton(par, id, label, font, interiorRect, normalImg, highlightedImg, pressedImg, disabledImg, pressedTextoffset, callback){
	if(pressedTextoffset == null) pressedTextoffset = new Point2(1,1);
	if(callback === undefined) callback = null;
	
	this.state = this.states.normal;
	this.txtPOffset = pressedTextoffset;

	this.text = null;
	this.size = null;
	this.position = null;

	this.state = this.states.normal;
	this.callback = callback;


	GUIScalingButton.call(this, par, id, interiorRect, normalImg, highlightedImg, pressedImg, disabledImg);

	this.setText(label, font);
}

GUIButton.eventTypes = {onMouseOff:0, onMouseOver:1, onButtonPressed:2, onButtonReleased:3, onDisabledPressed:4};

GUITextButton.getStandardButton = function(par, id, label, font, callback) {
	return new GUITextButton(par, id, label, font, new Rectf(10, 8, 53, 37), "ButtonNormal", "ButtonHighlighted", "ButtonPressed", "ButtonDisabled", null, callback);
};

GUITextButton.prototype = new GUIScalingButton();
GUITextButton.prototype.constructor = GUITextButton;

GUITextButton.prototype.states = {normal:0, highlighted: 1, pressed: 2, disabled: 3};

GUITextButton.prototype.setState = function(state) {
	this.state = state;
};

GUITextButton.prototype.getPosition = function() {
	return this.position;
};

GUITextButton.prototype.getSize = function() {
	return new Point2(this.size.width, this.size.height);
};

GUITextButton.prototype.sendEvent = function(event) {
	if(this.callback != null){
		this.callback(event);
	}
};

GUITextButton.prototype.getTextXOffset = function() {
	var r = this.getInteriorArea();
	return Math.floor(r.x0 + (r.width - this.text.width) / 2);
};

GUITextButton.prototype.getTextYOffset = function() {
	var r = this.getInteriorArea();
	return Math.floor(r.y0 + (r.height - this.text.height) / 2);
};

GUITextButton.prototype.setText = function(text, font){
	font = ResourceDepot.getInstance().getFont(font);
	this.text = font.generateCanvas(text);

	this.setButtonInternalSize(this.text.width, this.text.height);
};

// Todo: set the outer size instead of inner
GUITextButton.prototype.setButtonInternalSize = function(w, h) {
	GUIScalingButton.prototype.setInteriorSize.call(this, w, h);
	
	this.size = this.normal.getSize();
};

GUITextButton.prototype.draw = function(render, x, y, tint) {
	switch (this.state){
		case this.states.normal:
			this.drawEnabled(render, x, y, tint);
			break;
		case this.states.highlighted:
			this.drawHighlighted(render, x, y, tint);
			break;
		case this.states.pressed:
			this.drawPressed(render, x, y, tint);
			break;
		case this.states.disabled:
		default:
			this.drawDisabled(render, x, y, tint);
			break;
	}
};

GUITextButton.prototype.drawEnabled = function(render, x, y, tint){
	GUIScalingButton.prototype.drawEnabled.call(this, render, x, y, tint);
	render.drawText(this.text, x + this.getTextXOffset(), y + this.getTextYOffset());
};

GUITextButton.prototype.drawHighlighted = function(render, x, y, tint){ 
	GUIScalingButton.prototype.drawHighlighted.call(this, render, x, y, tint);
	render.drawText(this.text, x + this.getTextXOffset(), y + this.getTextYOffset());
};

GUITextButton.prototype.drawPressed = function(render, x, y, tint){ 
	GUIScalingButton.prototype.drawPressed.call(this, render, x, y, tint);
	render.drawText(this.text, x + this.getTextXOffset() + this.txtPOffset.x, y + this.getTextYOffset() + this.txtPOffset.y);
};

GUITextButton.prototype.drawDisabled = function(render, x, y, tint){ 
	GUIScalingButton.prototype.drawDisabled.call(this, render, x, y, tint);
	render.drawText(this.text, x + this.getTextXOffset(), y + this.getTextYOffset());
};

GUITextButton.prototype.getInteriorArea = function() {
	var r = GUIScalingButton.prototype.getInteriorArea.apply(this);
	if (r.width == 0) {
		var w = Math.floor(this.text.width);
		var h = Math.floor(this.text.height);
		r = new Rectf(r.x0, r.y0, r.x0 + w, r.y0 + h);
	}
	return r;
};

// ----------------------------------------------------------------------------

function GUIButton(){
	this.state = this.states.normal;

	GUIComponent.apply(this, arguments);
}

GUIButton.prototype = new GUIComponent();
GUIButton.prototype.constructor = GUIButton;

GUIButton.prototype.states = {normal:0, highlighted: 1, pressed: 2, disabled: 3};

GUIButton.prototype.onDraw = function(render, base, tint){
	if(base === undefined) base = new Point2(0, 0);
	if(tint === undefined) tint = null;

	var pos = this.position.addNew(base);

	switch (this.state){
		case this.states.normal:
			this.drawEnabled(render, pos.x, pos.y, tint);
			break;
		case this.states.highlighted:
			this.drawHighlighted(render, pos.x, pos.y, tint);
			break;
		case this.states.pressed:
			this.drawPressed(render, pos.x, pos.y, tint);
			break;
		case this.states.disabled:
		default:
			this.drawDisabled(render, pos.x, pos.y, tint);
			break;
	}
};

GUIButton.prototype.update = function(selected, keyDown) {
	var mouse = InputHandler.instance.mouse;
	var active = selected;
	var pressed = keyDown;

	var touches = InputHandler.instance.touches;
	if(!active && touches != null){
		for(var k in touches){
			active = GUIComponent.prototype.isMouseOver.call(this, touches[k].x, touches[k].y);
			if(active){
				pressed = true;
				break;
			}
		}
	}

	if(mouse != null && !pressed){
		var mouseActive = GUIComponent.prototype.isMouseOver.call(this, mouse.x, mouse.y);
		if(mouseActive){
			active = true;
			pressed = mouse.left.down;
		}
	}

	GUIButton.prototype.tryChangeState.call(this, active, pressed);
	return true;
};

GUIButton.prototype.tryChangeState = function(active, pressed){
	switch (this.state){
		case this.states.normal:
			if (active){
				this.sendEvent(GUIButton.eventTypes.onMouseOver);
				if (pressed){
					this.state = this.states.pressed;
					this.sendEvent(GUIButton.eventTypes.onButtonPressed);
				}else{
					this.state = this.states.highlighted;
				}
			}
			break;
		case this.states.highlighted:
			if (!active){
				this.state = this.states.normal;
				this.sendEvent(GUIButton.eventTypes.onMouseOff);
			}else if (pressed){
				this.state = this.states.pressed;
				this.sendEvent(GUIButton.eventTypes.onButtonPressed);
			}
			break;
		case this.states.pressed:
			if (!active){
				this.state = this.states.normal;
				this.sendEvent(GUIButton.eventTypes.onMouseOff);
			}else if (!pressed){
				state = active ? this.states.highlighted : this.states.normal;
				this.sendEvent(GUIButton.eventTypes.onButtonReleased);
			}
			break;
		case this.states.disabled:
			if (active && pressed)
				this.sendEvent(GUIButton.eventTypes.onDisabledPressed);
			break;
	}
};

GUIButton.prototype.hasMouseAnchor = function(x, y) {
	
};

GUIButton.prototype.onEnable = function(enable) {
	if (enable) this.state = this.states.normal;
	else this.state = this.states.disabled;
};

// ----------------------------------------------------------------------------

function GUIScalingButton(par, id, interiorRect, normalImg, highlightedImg, pressedImg, disabledImg) {
	if(par === undefined) return;
	this.par = par;
	this.id = id;
	this.interiorRect = interiorRect;
	this.normal = new ResizableFrame(normalImg, this.interiorRect);
	this.highlighted = new ResizableFrame(highlightedImg, this.interiorRect);
	this.pressed = new ResizableFrame(pressedImg, this.interiorRect);
	this.disabled = new ResizableFrame(disabledImg, this.interiorRect);
}

GUIScalingButton.prototype.setSize = function(w, h) {
	this.normal.setSize(w, h);
	this.highlighted.setSize(w, h);
	this.pressed.setSize(w, h);
	this.disabled.setSize(w, h);
};


GUIScalingButton.prototype.setInteriorSize = function(w, h) {
	this.normal.setInteriorSize(w, h);
	this.highlighted.setInteriorSize(w, h);
	this.pressed.setInteriorSize(w, h);
	this.disabled.setInteriorSize(w, h);

	this.setSize(this.normal.getWidth(), this.normal.getHeight());
};

GUIScalingButton.prototype.getTypeMinSize = function() {
	return new Size2(this.normal.getWidth(), this.normal.getHeight());
};

GUIScalingButton.prototype.drawEnabled = function(render, x, y, tint) {
	this.normal.draw(render, x, y, tint);
};

GUIScalingButton.prototype.drawHighlighted = function(render, x, y, tint) {
	this.highlighted.draw(render, x, y, tint);
};

GUIScalingButton.prototype.drawPressed = function(render, x, y, tint) {
	this.pressed.draw(render, x, y, tint);
};

GUIScalingButton.prototype.drawDisabled = function(render, x, y, tint) {
	this.disabled.draw(render, x, y, tint);
};

GUIScalingButton.prototype.getInteriorArea = function(){
  return this.normal.getInteriorArea();
};

// ----------------------------------------------------------------------------

function ResizableFrame (src, interiorArea) {
	var resDepot = ResourceDepot.getInstance();
	this.topleft = resDepot.getImage(src, "topleft");
	this.top = resDepot.getImage(src, "top");
	this.topright = resDepot.getImage(src, "topright");
	this.right = resDepot.getImage(src, "right");
	this.bottomright = resDepot.getImage(src, "bottomright");
	this.bottom = resDepot.getImage(src, "bottom");
	this.bottomleft = resDepot.getImage(src, "bottomleft");
	this.left = resDepot.getImage(src, "left");
	this.centre = resDepot.getImage(src, "centre");

	this.centreRect = new Rectf(this.topleft.textureWidth, this.topleft.textureHeight, this.topleft.textureWidth + this.centre.textureWidth - 1, this.topleft.textureHeight + this.centre.textureHeight - 1);

	this.numHCentre = 0;
	this.numVCentre = 0;
	
	this.minWidth = this.left.textureWidth + this.right.textureWidth;
	this.minHeight = this.top.textureHeight + this.bottom.textureHeight;

	this.interiorRect = new Rectf(interiorArea.x0, interiorArea.y0, interiorArea.x1 - this.centreRect.width, interiorArea.y1 - this.centreRect.height);

	this.cacheRender = new RenderCanvas(document.createElement("canvas"), 1);
	this.updateCanvasSize();
}

ResizableFrame.prototype = {};
ResizableFrame.prototype.constructor = ResizableFrame;

ResizableFrame.prototype.updateCanvasSize = function() {
	this.cacheRender.canvas.height = this.getHeight();
	this.cacheRender.canvas.width = this.getWidth();
	this.cacheNeedsUpdate = true;
};

ResizableFrame.prototype.setInteriorSize = function(width, height) {
	this.numHCentre = Math.max(0, Math.floor((width - this.interiorRect.width + this.centreRect.width - 1) / this.centreRect.width));
	this.numVCentre = Math.max(0, Math.floor((height - this.interiorRect.height + this.centreRect.height - 1) / this.centreRect.height));

	this.updateCanvasSize();
};

ResizableFrame.prototype.setSize = function(w, h) {
	this.setInteriorSize(w - this.minWidth + this.interiorRect.width, h - this.minHeight + this.interiorRect.height);
};

ResizableFrame.prototype.getWidth = function() {
	return this.minWidth + this.numHCentre * this.centreRect.width;
};

ResizableFrame.prototype.getHeight = function() {
	return this.minHeight + this.numVCentre * this.centreRect.height;
};

ResizableFrame.prototype.getCentreWidth = function() {
	return this.centreRect.width;
};

ResizableFrame.prototype.getCentreHeight = function() {
	return this.centreRect.height;
};

ResizableFrame.prototype.getInteriorArea = function() {
	var r = this.interiorRect;
	var x1 = r.x0 + r.x1 + this.numHCentre * this.centreRect.width;
	var y1 = r.y0 + r.y1 + this.numVCentre * this.centreRect.height;
	return new Rectf(r.x0, r.y0, x1, y1);
};

ResizableFrame.prototype.draw = function(render, x, y, tint) {
	if (tint === undefined) { tint = null; }
	if (this.cacheNeedsUpdate) {
		this.cacheRender.clear();
		var r = this.centreRect.x0 + this.numHCentre * this.centreRect.width;
		var b = this.centreRect.y0 + this.numVCentre * this.centreRect.height;
		this.cacheRender.drawImage(this.topleft, 0, 0, 0, false, 1, tint, false);
		this.cacheRender.drawImage(this.topright, r, 0, 0, false, 1, tint, false);
		this.cacheRender.drawImage(this.bottomright, r, b, 0, false, 1, tint, false);
		this.cacheRender.drawImage(this.bottomleft, 0, b, 0, false, 1, tint, false);

		var i,j;
		for (i = 0; i < this.numHCentre; i++) {
			this.cacheRender.drawImage(this.top, this.centreRect.x0 + i * this.centreRect.width, 0, 0, false, 1, tint);
			this.cacheRender.drawImage(this.bottom, this.centreRect.x0 + i * this.centreRect.width, b, 0, false, 1, tint);
		}

		for (i = 0; i < this.numVCentre; i++) {
			this.drawLeftPiece(this.cacheRender, 0, this.centreRect.y0 + i * this.centreRect.height, tint);
			for (j = 0; j < this.numHCentre; j++) {
				this.drawCenterPiece(this.cacheRender, this.centreRect.x0 + j * this.centreRect.width, this.centreRect.y0 + i * this.centreRect.height, j, tint);
			}
			this.drawRightPiece(this.cacheRender, r, this.centreRect.y0 + i * this.centreRect.height, tint);
		}

		this.cacheNeedsUpdate = false;
	}
	render.drawCanvas(this.cacheRender.canvas, x, y);
};

ResizableFrame.prototype.drawUsingInteriorRefPoint = function(render, x, y, tint){
	this.draw(render, x - this.interiorRect.x0, y - this.interiorRect.y0, tint);
};

ResizableFrame.prototype.drawCenterPiece = function(render, x, y, column, tint){
	render.drawImage(this.centre, x, y, 0, false, 1, tint, false);
};

ResizableFrame.prototype.drawLeftPiece = function(render, x, y, tint){
	render.drawImage(this.left, x, y, 0, false, 1, tint, false);
};

ResizableFrame.prototype.drawRightPiece = function(render, x, y, tint){
	render.drawImage(this.right, x, y, 0, false, 1, tint, false);
};

ResizableFrame.prototype.getSize = function() {
	var r = this.centreRect.x0 + this.numHCentre * this.centreRect.width + this.bottomright.textureWidth;
	var b = this.centreRect.y0 + this.numVCentre * this.centreRect.height + this.bottomright.textureHeight;
	return new Rectf(0, 0, r, b);
};

// ----------------------------------------------------------------------------

