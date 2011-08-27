/**
 * Class that manages the application. Changes between states.
 *
 * @param canvasId canvasId the id of the canvas element (or place holder).
 * @param shaders Shaders for WebGL
 * @param initCallback a callback that will be called once all resources are
 *			loaded.
 */
function App(canvasId, shaders, initCallback) {
	this.canvasId = canvasId;
	this.canvas = null;
	this.shaders = shaders;
	this.initCallback = initCallback;

	this.useGL = true;
	this.webGLFailed = false;
	this.skipToStage = null;
	this.useTouch = false;
	this.frontToBack = false;

	this.debug = false;
	this.debugKeyboardTimeout = 0;
	this.debugAudio = false;
	this.debugMovementTrigger = false;
	this.noTutorial = false;
	this.showFPS = false;
	this.freezeFrame = false;

	this.showSkipButton = false;
	this.skipText = new Text();

	this.resources = new ResourceDepot();
	this.resources.setCallback(createCallback(this.resourceCallback, this));
	ResourceDepot.instance = this.resources;

	var statesList = [ appStates.kStateIntro, IntroState,
		appStates.kStateDeveloperSplash, DeveloperSplashState,
		appStates.kStateMainMenu, MainMenuState,
		appStates.kStateLoadingStage, LoadingStageState,
		appStates.kStateInGame, InGameState,
		appStates.kStateStageComplete, StageCompleteState,
		appStates.kStateYesNoDialog, YesNoDialogState,
		appStates.kStateTutorialPage, TutorialPageState,
		appStates.kStateDialogue, DialogueState,
		appStates.kStoryBoardState, StoryboardState];
	this.fsm = new AppFSM(this, statesList);
	this.newState = -1;
	this.newMessage = null;
	this.stateModes = {
		kStateActive : 0,
		kTransitionOut : 1,
		kTransitionIn : 2
	};
	this.stateMode = this.stateModes.kStateActive;

	this.screenTransition = null;
	this.screenTransitions = [
		{
			from : appStates.kStateIntro,
			to : appStates.kStateDeveloperSplash,
			out : true,
			transition : new ScreenTransitionFade(0.25, new Pixel32(255, 255, 255, 0), new Pixel32(255, 255, 255, 255))
		},
		{
			from : appStates.kStateIntro,
			to : appStates.kStateDeveloperSplash,
			out : false,
			transition : new ScreenTransitionFade(0.25, new Pixel32(255, 255, 255, 255), new Pixel32(255, 255, 255, 0))
		},
		{
			from : appStates.kStateDeveloperSplash,
			to : appStates.kStateMainMenu,
			out : true,
			transition : new ScreenTransitionFade(0.25, new Pixel32(255, 255, 255, 0), new Pixel32(255, 255, 255, 255))
		},
		{
			from : appStates.kStateDeveloperSplash,
			to : appStates.kStateMainMenu,
			out : false,
			transition : new ScreenTransitionFade(0.5, new Pixel32(255, 255, 255, 255), new Pixel32(255, 255, 255, 0))
		}
	];
	this.screenTransitionsDefaultIn = new ScreenTransitionFade(0.25, new Pixel32(0, 0, 0, 255), new Pixel32(0, 0, 0, 0));
	this.screenTransitionsDefaultOut = new ScreenTransitionFade(0.25, new Pixel32(0, 0, 0, 0),
			new Pixel32(0, 0, 0, 255));

	this.audioTransition = new AudioTransition(0.25);

	this.game = new Game(this.resources);

	this.audio = new Audio();

	this.render = null;
	this.fillScreen = true;
	this.aspectRatio = 4 / 3;
	this.maxHeight = 600;
	this.maxWidth = 800;

	this.getURLOptions();

	this.createRender(this.useGL);

	this.initialized = false;

	this.appLoop = null;

	App.instance = this;

	window.addEventListener('resize', createCallback(this.resize, this), false);
	window.addEventListener('orientationchange', createCallback(this.resize, this), false);

	this.frameCount = 0;
	this.frameDate = null;
	this.frameText = null;
	this.frameFont = null;

	this.resources.init();
}

/**
 * The applications states.
 */
var appStates = {
	kStateIntro : 0,
	kStateDeveloperSplash : 1,
	kStateMainMenu : 2,
	kStateLoadingStage : 3,
	kStateInGame : 4,
	kStateStageComplete : 5,
	kStateYesNoDialog : 6,
	kStateTutorialPage : 7,
	kStateDialogue : 8,
	kStoryBoardState : 9
};

App.instance = null;

App.getInstance = function() {
	if (App.instance === null) {
		throw "App class has not been created";
	}

	return App.instance;
};

App.prototype = {};
App.constructor = App;

App.Messages = {
	kYesNoDialogMsg : 0
};

/**
 * This is called when all resources have been loaded.
 */
App.prototype.resourceCallback = function() {
	if (this.initialized) return;
	this.initialized = true;
	this.game.init();

	this.frameFont = ResourceDepot.getInstance().getFont("StartTextFont");

	if (this.initCallback != null) {
		this.initCallback();
	}

	if (this.skipToStage != null) {
		this.fsm.setState(appStates.kStateLoadingStage, this.skipToStage);
	} else {
		this.fsm.setState(appStates.kStateIntro);
	}

	this.appLoop = new AppLoop(this.looper, this);
};

App.prototype.looper = function(dt) {
	this.update(dt);
	this.draw();
};

App.prototype.tryChangeState = function(condition, toState, msg, reEnter, suspendedCurrent) {
	if (reEnter === undefined) reEnter = true;
	if (suspendedCurrent === undefined) suspendedCurrent = false;
	if (toState == fsmStates.kNextState) toState = this.fsm.currentState + 1;

	if (condition && (toState != this.fsm.currentState || reEnter)) {
		this.setState(toState, msg, suspendedCurrent);
		return true;
	}
	return false;
};

App.prototype.setState = function(state, msg, suspendCurrent) {
	this.newState = state;
	this.newMessage = msg;
	if (suspendCurrent || state == -1 || this.fsm.isSuspended(state)) {
		this.fsm.setState(state, msg, suspendCurrent);
	} else {
		var st = this.findScreenTransition(this.fsm.currentState, state, true);

		if (st == null) st = this.findScreenTransition(this.fsm.currentState, -1, true);
		if (st == null) st = this.screenTransitionsDefaultOut;

		st.reset();
		this.audioTransition.reset();

		this.stateMode = this.stateModes.kTransitionOut;
		this.screenTransition = st;
	}
};

/**
 * Finds a screen transition that for fills the conditions.
 *
 * @param from the state that it should go from.
 * @param to the state that it should go to.
 * @param out True if the transition should be in or out from the from state.
 * @returns A screen transition if found else null.
 */
App.prototype.findScreenTransition = function(from, to, out) {
	for (var i = 0; i < this.screenTransitions.length; i++) {
		var stt = this.screenTransitions[i];
		if (stt.from == from && stt.to == to && stt.out == out) {
			return stt.transition;
		}
	}
	return null;
};

App.prototype.update = function(dt) {
	if (InputHandler.instance !== null) {
		InputHandler.instance.update(dt);
		GameInput.instance.update(dt);
		if (this.debug) this.updateDebug(dt);
	}

	if (this.showSkipButton) {
		if (this.useTouch) {
			if (InputHandler.instance.touches.length != 0)
				this.fsm.message("skip");
		} else if (GameInput.instance.pressed(Buttons.attack) || GameInput.instance.pressed(Buttons.interact) || InputHandler.instance.mouse.left.down)
			this.fsm.message("skip");
	}

	if (this.freezeFrame) dt = 0;

	if (this.stateMode == this.stateModes.kStateActive) {
		this.fsm.update(dt);
		// TODO: add control conditions.
	} else {
		this.screenTransition.update(dt);
		this.audioTransition.update(dt, this.stateMode == this.stateModes.kTransitionOut);
		if (this.screenTransition.isDone) {
			if (this.stateMode == this.stateModes.kTransitionOut) {
				var st = this.findScreenTransition(this.fsm.currentState, this.newState, false);
				if (st == null) st = this.findScreenTransition(-1, this.newState, false);
				if (st == null) st = this.screenTransitionsDefaultIn;

				st.reset();
				this.audioTransition.reset();

				this.screenTransition = st;
				this.stateMode = this.stateModes.kTransitionIn;

				this.fsm.setState(this.newState, this.newMessage);
			} else {
				this.screenTransition = null;
				this.stateMode = this.stateModes.kStateActive;
				this.audioTransition.end();
			}
		}
	}
};

App.prototype.updateDebug = function(dt) {
	if (this.debugKeyboardTimeout > 0) {
		this.debugKeyboardTimeout -= dt;
		return;
	}

	var change = true;
	var keyboardKeys = InputHandler.instance.keyboard.keys;
	if (keyboardKeys[49].down) { // 1
		this.debugAudio = !this.debugAudio;
	} else if (keyboardKeys[50].down) { // 2
		this.debugMovementTrigger = !this.debugMovementTrigger;
	} else if (keyboardKeys[51].down) { // 3
		this.showFPS = !this.showFPS;
	} else if (keyboardKeys[52].down) { // 4
		this.freezeFrame = !this.freezeFrame;
		this.render.maxCalls = this.freezeFrame ? 0 : 1000;
	} else if (keyboardKeys[53].down) { // 5
		this.frontToBack = !this.frontToBack;
		this.createRender();
	} else if (keyboardKeys[74].down) {// J
		this.render.maxCalls++;
	} else if (keyboardKeys[75].down) { // K
		this.render.maxCalls--;
	} else {
		change = false;
	}

	if (change) this.debugKeyboardTimeout = 0.2;
};

App.prototype.draw = function() {
	if (this.render.frontToBack) {
		this.render.clear();
		if (this.screenTransition) this.screenTransition.draw(this.render);
		if (this.showFPS) this.drawFPS();
		if (this.debug && GameInput.instance) this.drawDebug();
		if (this.showSkipButton) this.drawSkipButton();
		this.fsm.draw(this.render);
	} else {
		this.render.clear();
		this.fsm.draw(this.render);
		if (this.showSkipButton) this.drawSkipButton();
		if (this.debug && GameInput.instance) this.drawDebug();
		if (this.showFPS) this.drawFPS();
		if (this.screenTransition) this.screenTransition.draw(this.render);
	}

	this.render.flush();
};

App.prototype.drawDebug = function() {
	var inp = GameInput.instance;
	var str = "";
	for (var b in inp.buttons) {
		if (inp.buttons[b].down) {
			str += " " + inp.buttons[b].name;
		}
	}

	inp = InputHandler.instance;
	if (!this.useTouch) str = "mouse: " + inp.mouse.x + " " + inp.mouse.y + " " + str;
	this.render.drawSystemText(str, 10, 10, this.render.white);

	if (this.frontToBack) this.render.drawSystemText("Front to back", 730, 10, this.render.white);

	if (this.debugAudio) this.audio.draw(this.render);
};

App.prototype.drawFPS = function() {
	this.frameCount++;
	if (this.frameCount == 10) {
		var date = new Date().getTime();
		if (this.frameDate != null) {
			var frameRate = Math.round(100000 / (date - this.frameDate)) / 10;
			this.frameText = this.frameFont.generateCanvas("FPS: " + frameRate + " : " +
					(this.freezeFrame ? this.render.maxCalls + " / " : "") + this.render.calls);
		}
		this.frameDate = date;
		this.frameCount = 0;
	}
	if (this.frameText != null) this.render.drawText(this.frameText, 630, 15, 1, true);
};

App.prototype.drawSkipButton = function() {
	this.skipText.draw(this.render, (this.useTouch ? 750 : 730) - this.skipText.canvas.width, 565 - this.skipText.canvas.height / 2);
	if (!this.useTouch) this.render.drawImage(this.getControlImage(Buttons.skip), 750, 565, 0, true);
};

/**
 * Creates a new render.
 *
 * @param {Boolean} useGL True if WebGL should be used, false for canvas.
 */
App.prototype.createRender = function(useGL) {
	if (this.render !== null) this.render.evict();
	var oldRender = this.render;
	var oldCanvas = document.getElementById(this.canvasId);
	var canvasParent = oldCanvas.parentNode;
	canvasParent.className = "active";

	var canvas = document.createElement("canvas");
	canvas.height = 600;
	canvas.width = 800;
	canvas.id = this.canvasId;
	// Prevent selection of text while interacting with the canvas.
	canvas.onselectstart = function () {
		return false;
	};

	if (useGL) {
		try {
			this.render = utils.createWebGLRender(canvas, this.shaders);
			this.render.frontToBack = this.frontToBack;
		} catch (e) {
			this.createRender(false);
			this.webGLFailed = true;
			return;
		}
	} else {
		this.render = new RenderCanvas(canvas, 1, this.frontToBack);
	}

	if (this.freezeFrame) this.render.maxCalls = oldRender.maxCalls;

	canvasParent.replaceChild(canvas, oldCanvas);

	this.game.render = this.render;
	this.canvas = canvas;

	// Temporary
	if (this.input !== undefined) {
		this.input.updateCanvas(canvas);
	}

	this.resize();
};

App.prototype.resize = function() {
	var canvas = document.getElementById(this.canvasId);
	var canvasParent = canvas.parentNode;

	var newWidth = window.innerWidth;
	var newHeight = window.innerHeight;
	var windowRatio = newWidth / newHeight;

	if (!this.fillScreen && (newHeight > this.maxHeight && newWidth > this.maxWidth)) {
		newHeight = this.maxHeight;
		newWidth = this.maxWidth;
	} else if (windowRatio > this.aspectRatio) {
		newWidth = newHeight * this.aspectRatio;
	} else {
		newHeight = newWidth / this.aspectRatio;
	}

	newHeight = Math.floor(newHeight);
	newWidth = Math.floor(newWidth);

	canvasParent.style.height = newHeight + 'px';
	canvasParent.style.width = newWidth + 'px';
	canvasParent.style.marginTop = (-Math.floor(newHeight / 2)) + 'px';
	canvasParent.style.marginLeft = (-Math.floor(newWidth / 2)) + 'px';

	var canvasHeight = Math.min(this.maxHeight, newHeight);
	var canvasWidth = Math.min(this.maxWidth, newWidth);
	canvas.height = canvasHeight;
	canvas.width = canvasWidth;

	var scale = newWidth / this.maxWidth;

	if (this.render != null) {
		this.render.setScaleFactor(Math.min(1, scale));
	}

	if (InputHandler.instance != null) {
		var offset = new Point2(window.innerWidth - newWidth, window.innerHeight - newHeight).div(2);
		InputHandler.instance.setSize(scale, offset);
		//InputHandler.instance.updateSize(canvas);
	}
};

/**
 * determines whether current render is the WebGL render
 *
 * @returns {Boolean}
 */
App.prototype.isWebGLRender = function() {
	return this.render instanceof RenderWebGL;
};

/**
 * Sets different application options from the url string
 */
App.prototype.getURLOptions = function () {
	var url;

	if (document.location) {
		url = document.location.href;
	} else if (document.URL) {
		// Firefox doesn't have the location field
		url = document.URL;
	}

	if (url.search("[\\?&]canvas") !== -1) {
		this.useGL = false;
	}

	if (url.search("[\\?&]fps") !== -1) {
		this.showFPS = true;
	}

	if (url.search("[\\?&]debug") !== -1) {
		this.debug = true;
	}

	if (url.search("[\\?&]nomusic") !== -1) {
		this.audio.musicVolume = 0;
	}

	if (url.search("[\\?&]nofillscreen") !== -1) {
		this.fillScreen = false;
	}

	if (url.search("[\\?&]notutorial") !== -1) {
		this.noTutorial = true;
	}

	if (url.search("[\\?&]stage=") !== -1) {
		var r = /[\\?&]stage=([^&]*)/;
		this.skipToStage = r.exec(url)[1];

		// Skips the splash screen and menu, which sets the input system,
		// defaults to keyboard
		this.createRender(this.useGL);
		this.input = new InputHandler(this.canvas, false);
	}

	if (url.search("[\\?&]touch") !== -1) {
		this.input = new InputHandler(this.canvas, true);
		this.useTouch = true;
	}
};

/**
 * Enables debugging.
 */
App.prototype.enableDebugging = function () {
	this.debug = true;
	if (this.game.currentStage != null) {
		this.game.currentStage.gameObjects.depth = -10;
		this.game.currentStage.sortLayers();
	}
};

App.prototype.getControlImage = function(c) {
	var dep = ResourceDepot.getInstance();
	if (this.useTouch) {
		switch (c) {
			case Buttons.jump:
				return dep.getImage("ControlsiPhoneButtonHalfrezY", "default", false);
			case Buttons.attack:
				return dep.getImage("ControlsiPhoneButtonHalfrezA", "default", false);
			case Buttons.interact:
				return dep.getImage("ControlsiPhoneButtonHalfrezB", "default", false);
			case Buttons.up:
				return dep.getImage("ControlsXboxLarge", "dpad_u", false);
			case Buttons.down:
				return dep.getImage("ControlsXboxLarge", "dpad_d", false);
			case Buttons.left:
				return dep.getImage("ControlsXboxLarge", "dpad_l", false);
			case Buttons.right:
				return dep.getImage("ControlsXboxLarge", "dpad_r", false);
			case Buttons.skip:
				return dep.getImage("ControlsiPhoneButtonHalfrezX", "default", false);
		}
	} else {
		switch (c) {
			case Buttons.jump:
				return dep.getImage("ControlsMacPC", "button_up", true);
			case Buttons.attack:
				return dep.getImage("ControlsMacPC", "button_space", true);
			case Buttons.interact:
				return dep.getImage("ControlsMacPC", "button_ctrl", true);
			case Buttons.up:
				return dep.getImage("ControlsMacPC", "button_up", true);
			case Buttons.down:
				return dep.getImage("ControlsMacPC", "button_down", true);
			case Buttons.left:
				return dep.getImage("ControlsMacPC", "button_left", true);
			case Buttons.right:
				return dep.getImage("ControlsMacPC", "button_right", true);
			case Buttons.skip:
				return dep.getImage("ControlsMacPC", "button_space", true);
		}
	}
	return null;
};

App.prototype.startDialogue = function() {
	this.fsm.setState(appStates.kStateDialogue, null, true);
};

App.prototype.setShowSkipButton = function(show) {
	show = show === undefined ? true : show;

	this.showSkipButton = show;

	if (this.useTouch)
		this.skipText.set(this.resources.getString("STR_TAP_SCREEN_TO_SKIP"), "BackButtonFont");
	else
		this.skipText.set(this.resources.getString("STR_SKIP"), "BackButtonFont");

};


/**
 * A application loop. When created the callback will be called until stop is
 * called.
 *
 * @param {Function} callback the function that should be called by the loop.
 * @param {Object} that changes "this" to the specified when callback is called.
 * @returns {AppLoop}
 */
function AppLoop(callback, that) {
	var keepUpdating = true;
	var lastLoopTime = new Date();

	function loop() {
		if (!keepUpdating) return;
		requestAnimFrame(loop);
		var time = new Date();
		var dt = (time - lastLoopTime) / 1000;
		if (dt >= 3) dt = 0.25;
		callback.call(that, dt);
		lastLoopTime = time;
	}

	this.stop = function() {
		keepUpdating = false;
	};

	this.resume = function() {
		keepUpdating = true;
		lastLoopTime = new Date();
		loop();
	};

	loop();
	return this;
}

AppLoop.prototype = {};
AppLoop.prototype.constructor = AppLoop;
