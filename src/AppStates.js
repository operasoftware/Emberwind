/**
 * Fades the screen from one color to another.
 *
 * @param {Number} maxT the maximum time that the transition should take.
 * @param {Pixel32} from starting color.
 * @param {Pixel32} to ending color.
 * @returns {ScreenTransitionFade}
 */
function ScreenTransitionFade(maxT, from, to) {
	this.maxT = maxT;
	this.from = from;
	this.to = to;

	this.time = 0;
	this.isDone = false;
}

ScreenTransitionFade.prototype = {};
ScreenTransitionFade.constructor = ScreenTransitionFade;

ScreenTransitionFade.prototype.update = function(dt) {
	this.t = Math.min(this.t + dt, this.maxT);
};

ScreenTransitionFade.prototype.draw = function(render) {
	this.isDone = this.t == this.maxT;

	var color = new Pixel32(lerp(this.from.r, this.to.r, this.t / this.maxT),
							lerp(this.from.g, this.to.g, this.t / this.maxT),
							lerp(this.from.b, this.to.b, this.t / this.maxT),
							lerp(this.from.a, this.to.a, this.t / this.maxT));
	if (color.a > 0) {
		render.drawFillScreen(color);
	}
};

ScreenTransitionFade.prototype.reset = function() {
	this.t = 0;
	this.isDone = false;
};

// ---------------------------------------------------------------------------

/**
 * Fades the music from 0 to 100% user set volume.
 */
function AudioTransition(length){
	this.length = length;
	this.t = 0;
}

AudioTransition.prototype.reset = function() {
	this.t = 0;
};

AudioTransition.prototype.end = function() {
	app.audio.setMusicVolume(1);
};

AudioTransition.prototype.update = function(dt, out) {
	this.t += dt;
	var value = out ? Math.max(0, (this.length - this.t) / this.length) : Math.min(1, this.t / this.length);
	app.audio.setMusicVolume(value);
};

// ---------------------------------------------------------------------------

/**
 * State that shows the developer splash screen.
 *
 * @returns {DeveloperSplashState}
 */
function DeveloperSplashState() {
	this.skip = false;

	BaseState.apply(this, arguments);
}

DeveloperSplashState.prototype = new BaseState();
DeveloperSplashState.constructor = DeveloperSplashState;

DeveloperSplashState.prototype.enter = function(msg, fromState) {
	this.host.canvas.onmousedown = createCallback(function(e){
		this.skip = true;
		this.host.input = new InputHandler(this.host.canvas, false);
	}, this);
	window.onkeydown = this.host.canvas.onmousedown;

	this.host.canvas.ontouchstart = createCallback(function(e){
		this.skip = true;
		this.host.input = new InputHandler(this.host.canvas, true);
		// Some units seem to send both touch and mousedown events, prevent
		// the input system to be overwritten..
		this.host.canvas.onmousedown = undefined;
	}, this);


	var res = ResourceDepot.getInstance();
	this.animation = res.getAnimation("TimeTrap");
	this.splashSound = res.getSFX("timetrap_sound");

	this.timeInState = 0;

	// this.host.preload();
};

DeveloperSplashState.prototype.update = function(dt) {
	dt = Math.min(dt, 1/15);
	this.animation.update(dt);
	if (this.timeInState < 0.5 && this.timeInState + dt > 0.5) {
		this.animation.play(false);
		this.soundID = this.host.audio.playFX(this.splashSound);
	}
	this.timeInState += dt;

};

DeveloperSplashState.prototype.leave = function () {
	this.host.audio.stopSound(this.soundID);
};

DeveloperSplashState.prototype.transition = function() {
	return this.host.tryChangeState(this.timeInState > 5 || this.skip, fsmStates.kNextState, "stage0");
};

DeveloperSplashState.prototype.draw = function(render) {
	render.clear(render.white);
	if (this.timeInState > 0.5) {
		this.animation.draw(render, render.getWidth() / 2, render.getHeight() / 2, 0, 1, null);
	}
};

// ---------------------------------------------------------------------------

/**
 * State when a stage is loading.
 */
function LoadingStageState() {
	this.t = 0;
	this.delayAfter = 1;
	this.delayBefore = 0.1;
	this.doneT = null;
	this.progress = 0;

	this.font = null;
	this.progressText = null;
	this.lastProgress = -1;

	BaseState.apply(this, arguments);
}

LoadingStageState.prototype = new BaseState();
LoadingStageState.constructor = LoadingStageState;

LoadingStageState.prototype.enter = function(msg, fromState) {
	this.doneT = null;
	this.t = 0;
	this.progress = 0;

	this.stage = msg;

	this.font = ResourceDepot.getInstance().getFont("BannerFont");

	this.host.game.loadStage(msg, createCallback(this.progressCallback, this));
};

LoadingStageState.prototype.progressCallback = function(status) {
	this.progress = status;

	if(status >= 1){
		if(this.t <= this.delayBefore){
			this.doneT = 0;
		}else{
			this.doneT = this.t + this.delayAfter;
		}
	}
};

LoadingStageState.prototype.update = function(dt) {
	this.t += dt;
};

LoadingStageState.prototype.transition = function() {
	return this.host.tryChangeState(this.doneT != null && this.t >= this.doneT, appStates.kStateInGame);
};

LoadingStageState.prototype.draw = function(render) {
	render.clear(render.black);

	if(this.lastProgress != this.progress){
		this.progressText = this.font.generateCanvas(Math.ceil(this.progress * 100) + " %");
		this.lastProgress = this.progress;
	}

	var alpha = Math.min(1, Math.max(0, this.t * 2 - this.delayBefore));

	render.drawText(this.progressText, (render.getWidth() - this.progressText.width) / 2,
			render.getHeight()/2 - this.progressText.height/2, alpha);
};

// ---------------------------------------------------------------------------

/**
 * In game state, when the player is playing a stage.
 *
 * @returns {InGameState}
 */
function InGameState() {
	this.restartDelay = 0;
	this.stageDisplayDelay = 0;

	this.stageNameDisplayAnim = null;
	this.stageDisplayBannerR = null;
	this.stageDisplayBannerC = null;
	this.bannerSound = null;

	this.stageNameDisplayXPos = 0;

	this.areaNameText = "";
	this.stageNameText = "";

	this.backReleased = false;
	this.playBannerSound = false;
	this.playInGameTrack = false;

	this.controlImage = null;
	this.canvasImage = null;
	this.canvasDisabledImage = null;
	this.webglImage = null;

	this.controlPressedTint = new Pixel32(0,0,0,128);
	this.dpadImage = null;
	this.dpadStickImage = null;
	this.deadZoneDpad = 20;
	this.dpadRect = null;
	this.dpadRectInner = null;
	this.dpadDistance = 128;
	this.dpadInnerDistance = 10;

	this.interactImage = null;

	BaseState.apply(this, arguments);
}

InGameState.prototype = new BaseState();
InGameState.constructor = InGameState;

InGameState.prototype.enter = function(msg, fromState) {
	this.timeSinceRenderSwap = 0;
	this.dimTimeLeft = 0;
	this.playBannerSound = false;
	this.playInGameTrack = false;

	this.gremlinFont = ResourceDepot.getInstance().getFont("StartTextFont");

	this.restartDelay = 0;
	this.stageDisplayDelay = 0;
	this.stageDisplayBannerR = null;
	this.stageDisplayBannerC = null;

	this.controlImage = ResourceDepot.getInstance().getImage("ControlsiPhoneEscape", "default");
	this.canvasImage = ResourceDepot.getInstance().getImage("btn_canvas", "btn_canvas");
	this.canvasDisabledImage = ResourceDepot.getInstance().getImage("btn_canvas_disabled", "btn_canvas_disabled");
	this.webglImage = ResourceDepot.getInstance().getImage("btn_webgl", "btn_webgl");

	// Todo: Add the extra states checks.

	if (fromState == appStates.kStateLoadingStage && this.host.skipToStage === null) {
		this.stageDisplayDelay = 4.25;
		this.stageNameDisplayXPos = -50.0;
		this.bannerSound = ResourceDepot.getInstance().getSFX("stage_banner");
		this.stageNameDisplayAnim = ResourceDepot.getInstance().getAnimation("WickFlyRight");
		this.stageNameDisplayAnim.play();

		this.stageDisplayBannerR = ResourceDepot.getInstance().getImage("StageBanner", "RightPiece");
		this.stageDisplayBannerC = ResourceDepot.getInstance().getImage("StageBanner", "CentrePiece");

		var font = ResourceDepot.getInstance().getFont("BannerFont");

		//Todo: temporary below
		var stagename = app.game.currentStage.name;

		this.areaNameText = font.generateCanvas( stagename != "stage0" ? "Outer Grendale" : "The Elderwood");
		var text = "Stage " + (parseInt(stagename[5])+1);
		if(stagename =="stage0") text = "Boulderhood Lake";
		else if(stagename =="stage1") text = "Emerald Shores";
		else if(stagename=="stage2") text = "Glenbrook";
		this.stageNameText = font.generateCanvas(text);

		this.playBannerSound = true;
	}

	this.playInGameTrack = true;

	if (this.host.useTouch) {
		this.dpadImage = ResourceDepot.getInstance().getImage("ControlsiPhoneDpad", "default");
		this.dpadStickImage = ResourceDepot.getInstance().getImage("ControlsiPhoneStick", "default");

		this.attackImage = ResourceDepot.getInstance().getImage("ControlsiPhoneButtonA", "default");
		this.jumpImage = ResourceDepot.getInstance().getImage("ControlsiPhoneButtonY", "default");
		this.interactImage = ResourceDepot.getInstance().getImage("ControlsiPhoneButtonX", "default");

		var screenW = this.host.render.getWidth();
		var screenH = this.host.render.getHeight();


		var x = 18 + 64;
		var y = screenH / 2;

		GameInput.instance.addGUIIsoscelesTriangle(x, y, this.dpadInnerDistance, this.dpadDistance, 100, 0, Buttons.down);
		GameInput.instance.addGUIIsoscelesTriangle(x, y, this.dpadInnerDistance, this.dpadDistance, 100, 180, Buttons.up);
		GameInput.instance.addGUIIsoscelesTriangle(x, y, this.dpadInnerDistance, this.dpadDistance, 100, 90, Buttons.left);
		GameInput.instance.addGUIIsoscelesTriangle(x, y, this.dpadInnerDistance, this.dpadDistance, 100, 270, Buttons.right);

		this.dpadRect = new Rectf(x - this.dpadDistance, y - this.dpadDistance, x + this.dpadDistance, y + this.dpadDistance);
		this.dpadRectInner = new Rectf(x - this.dpadInnerDistance, y - this.dpadInnerDistance, x + this.dpadInnerDistance, y + this.dpadInnerDistance);

		GameInput.instance.addGUICircle(screenW - 50, screenH / 2, 32, Buttons.attack);
		GameInput.instance.addGUICircle(screenW - 50, screenH / 2 + 74, 32, Buttons.jump);
		GameInput.instance.addGUICircle(screenW - 50, screenH / 2 - 74, 32, Buttons.enter);
	}

	this.host.game.updateCamera(0.01);
};

InGameState.prototype.leave = function() {
	this.areaNameText = null;
	this.stageNameText = null;
};

InGameState.prototype.update = function(dt) {
	if (this.playBannerSound) {
		this.playBannerSound = false;
		app.audio.playFX(this.bannerSound);
	}

	if (this.playInGameTrack) {
		this.playInGameTrack = false;
		this.startInGameTrack();
	}

	var game = this.host.game;

	if (this.stageDisplayDelay > 0) {
		this.stageDisplayDelay -= dt;
		this.stageNameDisplayAnim.update(dt);
		this.stageNameDisplayXPos += dt * 800;
		game.updateCamera(dt);
		//Todo: add update background?
	} else {
		game.update(dt);

		// Todo: Add focus object stuff
	}

	var inp = InputHandler.instance;
	if(GameInput.instance.held(Buttons.esc) || (inp.clickInCircle(50, 50, 32)) && app.useTouch) {
		this.host.setState(appStates.kStateMainMenu);
	}
	if(!this.host.webGLFailed && (GameInput.instance.pressed(Buttons.render) || inp.clickInCircle((this.host.useTouch ? 50 + 74 : 50), 50, 32)) && this.timeSinceRenderSwap > 1) {
		this.host.createRender(this.host.render instanceof RenderCanvas);
		this.timeSinceRenderSwap = 0;
	}
	this.timeSinceRenderSwap += dt;
};

InGameState.prototype.draw = function(render) {
	if(!render.frontToBack) this.host.game.draw(render);

	if (this.stageDisplayDelay > 0) {
		this.bannerAlpha = 1;
		this.textAlpha = 1;

		if (this.stageDisplayDelay < 1) {
			this.bannerAlpha = Math.max(0, this.stageDisplayDelay);
			this.textAlpha = Math.max(0, this.stageDisplayDelay);
		} else if (this.stageDisplayDelay < 3) {

		} else if (this.stageDisplayDelay < 3.5) {
			this.textAlpha = (3.5 - this.stageDisplayDelay) * 2;
		} else {
			this.textAlpha = 0;
		}

		var tmpPos = Math.min(render.getWidth(), Math.floor(this.stageNameDisplayXPos) - this.stageDisplayBannerR.textureWidth);
		render.drawImage(this.stageDisplayBannerR, tmpPos, 200, 0, false, this.bannerAlpha, null, false);

		while (tmpPos > 0) {
			tmpPos -= this.stageDisplayBannerC.textureWidth;
			render.drawImage(this.stageDisplayBannerC, tmpPos, 200, 0, false, this.bannerAlpha, null, false);
		}

		if (this.textAlpha) {
			render.drawText(this.areaNameText, (render.getWidth() - this.areaNameText.width) / 2, 220, this.textAlpha);
			render.drawText(this.stageNameText, (render.getWidth() - this.stageNameText.width) / 2, 270, this.textAlpha);
		}

		this.stageNameDisplayAnim.draw(render, this.stageNameDisplayXPos - 25, 255);
	}

	var controlsAlpha = 1;
	if (this.stageDisplayDelay > 0)
		controlsAlpha = Math.max(0, 1 - this.stageDisplayDelay);

	if (this.host.useTouch) {
		render.drawImage(this.controlImage, 50, 50, 0, true, controlsAlpha, null, false);

		var input = InputHandler.instance;

		var screenW = render.getWidth();
		var screenH = render.getHeight();
		var x = 18 + 64;
		var y = screenH / 2;
		render.drawImage(this.dpadImage, x, y, 0, true, controlsAlpha, null, false);
		var noTouch = true;
		for (var k in input.touches) {
			if (input.touches.hasOwnProperty(k)) {
				var touch = input.touches[k];
				if (this.dpadRect.contains(touch.x, touch.y) && !this.dpadRectInner.contains(touch.x, touch.y)) {
					if (Math.pow(x - touch.x, 2) + Math.pow(y - touch.y, 2) < Math.pow(64, 2)) {
						render.drawImage(this.dpadStickImage, touch.x, touch.y, 0, true, controlsAlpha, null, false);
					} else {
						var angle = Math.atan2(touch.y - y, touch.x - x);
						render.drawImage(this.dpadStickImage, Math.cos(angle) * 64 + x, Math.sin(angle) * 64 + y, 0, true, controlsAlpha, null, false);
					}
					noTouch = false;
					break;
				}
			}
		}
		if (noTouch) {
			render.drawImage(this.dpadStickImage, x, y, 0, true, controlsAlpha, null, false);
		}

		render.drawImage(this.attackImage, screenW - 50, screenH / 2, 0, true, controlsAlpha, null, false);
		render.drawImage(this.jumpImage, screenW - 50, screenH / 2 + 74, 0, true, controlsAlpha, null, false);
		if (this.host.game.focus.hasInteractTarget())
			render.drawImage(this.interactImage, screenW - 50, screenH / 2 - 74, 0, true, controlsAlpha, null, false);
	}

	var renderImage;
	if (this.host.webGLFailed) {
		renderImage = this.canvasDisabledImage;
	} else {
		renderImage = render instanceof RenderCanvas ? this.canvasImage : this.webglImage;
	}
	render.drawImage(renderImage, (this.host.useTouch ? 50 + 74 : 50), 50, 0, true, controlsAlpha, null, false);

	if(render.frontToBack) this.host.game.draw(render);
};

InGameState.prototype.startInGameTrack = function () {
	if (this.host.game.currentStage.type === "siege") {
		var sName = this.host.game.currentStage.name;
		if (sName == "stage0" || sName == "stage1" || sName == "stage2" || sName == "stage3") {
			this.host.audio.playMusic(ResourceDepot.getInstance().getMusic("outer_grendale"));
		}
		// Should be more stuff here I guess, but since we only include the
		// first stages, there's no point in going any further..
		else {
			this.host.audio.playMusic(ResourceDepot.getInstance().getMusic("outer_grendale"));
		}
	}
};

// ---------------------------------------------------------------------------

function MainMenuState() {
	this.timeInactive = null;
	this.titleImgs = [];
	this.titleLeftImgs = [];
	this.titleRightImgs = [];
	this.wickEyes = [];
	this.kindleEyes = [];
	this.copyright = null;

	// todo: buttons

	this.guiBox = null;

	this.buttonPressed = -1;
	this.cloudXPos = 0;
	this.fogXPos = 0;

	this.acceptSound = null; // todo
	this.declineSound = null; // todo
	this.refuseSound = null; // todo
	this.selectSound = null; // todo
	this.enterSound = null; // todo

	this.nextWickBlink = 0;
	this.wickBlinkLeft = 0;
	this.nextWickLook = 0;
	this.wickLookLeft = 0;
	this.wickLookType = 0;
	this.nextKindleBlink = 0;
	this.kindleBlinkLeft = 0;
	this.lastMusicPos = null;

	this.doStartScreen = true; // temp
	this.timeIntoStartScreen = 0;
	this.titleParam = 0;
	this.pressStartText = null;
	this.pressStartFlash = 0;
	this.timeInSinceStartScreen = 0;

	BaseState.apply(this, arguments);
}

MainMenuState.prototype = new BaseState();
MainMenuState.constructor = MainMenuState;

MainMenuState.prototype.enter = function(msg, fromState) {
	if(this.doStartScreen){
		this.host.canvas.onmousedown = createCallback(function(e){
			this.timeInactive = 0;
			this.doStartScreen = true;
			this.timeIntoStartScreen = 0.01;
			this.host.useTouch = false;
			this.host.input = new InputHandler(this.host.canvas, false);
			this.host.canvas.ontouchstart = undefined;
		}, this);
		window.onkeydown = this.host.canvas.onmousedown;

		this.host.canvas.ontouchstart = createCallback(function(e){
			this.timeInactive = 0;
			this.doStartScreen = true;
			this.timeIntoStartScreen = 0.01;
			this.host.useTouch = true;
			this.host.input = new InputHandler(this.host.canvas, true);
			// Some units seem to send both touch and mousedown events, prevent
			// the input system to be overwritten..
			this.host.canvas.onmousedown = undefined;
		}, this);
	}

	this.timeInSinceStartScreen = 999;
	this.timeInactive = 0;
	this.lastMusicPos = 0;

	this.buttonPressed = -1;
	this.titleImgs[0] = ResourceDepot.getInstance().getImage("Titlescreen0", "default");
	this.titleImgs[1] = ResourceDepot.getInstance().getImage("Titlescreen1", "default");
	this.titleImgs[2] = ResourceDepot.getInstance().getImage("Titlescreen2", "default");
	this.titleImgs[3] = ResourceDepot.getInstance().getImage("Titlescreen3", "default");
	this.titleImgs[4] = ResourceDepot.getInstance().getImage("Titlescreen4", "default");
	this.titleImgs[5] = ResourceDepot.getInstance().getImage("TitlescreenLogo", "default");

	this.wickEyes[0] = ResourceDepot.getInstance().getImage("TitlescreenWickEyes", "eyes0");
	this.wickEyes[1] = ResourceDepot.getInstance().getImage("TitlescreenWickEyes", "eyes1");
	this.wickEyes[2] = ResourceDepot.getInstance().getImage("TitlescreenWickEyes", "eyes2");
	this.wickEyes[3] = ResourceDepot.getInstance().getImage("TitlescreenWickEyes", "eyes3");

	this.kindleEyes = ResourceDepot.getInstance().getImage("TitlescreenKindleEyes", "default");

	this.copyright = ResourceDepot.getInstance().getImage("copyright", "copyright", true);

	this.wickBlinkLeft = 0;
	this.nextWickBlink = randomRange(4, 6);
	this.wickLookLeft = 0;
	this.nextWickLook = randomRange(4, 6);
	this.wickLookType = 1;

	this.nextKindleBlink = randomRange(4, 6);
	this.kindleBlinkLeft = 0;

	this.cloudXPos = 0;
	this.fogXPos = 0;

	var startStage = function(event, num) {
		if (GUIButton.eventTypes.onButtonPressed == event) {
			app.setState(appStates.kStateLoadingStage, "stage" + num);
		}
	};

	var stage1 = GUITextButton.getStandardButton(null, null, "Boulderhood Lake", "MenuButtonFont",function(a){startStage(a, 0);});
	var stage2 = GUITextButton.getStandardButton(null, null, "Emerald Shores", "MenuButtonFont",function(a){startStage(a, 1);});
	var stage3 = GUITextButton.getStandardButton(null, null, "Glenbrook", "MenuButtonFont",function(a){startStage(a, 2);});

	this.guiBox = new GUIBox();
	this.guiBox.addButton(stage1);
	this.guiBox.addButton(stage2);
	this.guiBox.addButton(stage3);

	// todo: init buttons and stuff

	this.font = ResourceDepot.getInstance().getFont("StartTextFont");
	this.pressStartText = this.font.generateCanvas("Click or touch the screen");

	this.backgroundMusic = ResourceDepot.getInstance().getMusic("main_theme");
	this.musicID = this.host.audio.playMusic(this.backgroundMusic, true);

};

MainMenuState.prototype.leave = function() {
	this.host.audio.stopSound(this.musicID);
};

MainMenuState.prototype.draw = function(render) {
	if (this.doStartScreen)
		this.drawStartScreenBackground(render);
	else
	{
		this.drawBackground(render);
		this.guiBox.draw(render);
	}
};

MainMenuState.prototype.drawStartScreenBackground = function(render) {
	var center = new Vec2(render.getWidth() / 2, render.getHeight() / 2);

	render.clear();
	render.drawImage(this.titleImgs[0], center.x, center.y, 0, true, 1, null, false);


	for (var i = 0; i < 3; i++)
		render.drawParticle(this.titleImgs[1], this.cloudXPos + this.titleImgs[1].textureWidth * 2 * i, this.titleImgs[1].textureHeight - 150, 0, 2, 2, 1, new Pixel32(255, 255, 255), false);


	var castleScale = 1.25;
	if (this.timeIntoStartScreen > 0.5)
		castleScale = 1.25 - 0.25 * Clamp(0, (this.timeIntoStartScreen - 0.5) / 2, 1);


	render.drawParticle(this.titleImgs[2], center.x, center.y, 0, castleScale, castleScale, 1, new Pixel32(0xff, 0xff, 0xff, 0x0), false);

	var fgScale = 5;
	if (this.timeIntoStartScreen > 0.5)
		fgScale = 5 - 4 * Clamp(0, (this.timeIntoStartScreen - 0.5) / 2, 1);

	render.drawParticle(this.titleImgs[4], center.x, center.y, 0, fgScale, fgScale, 1, new Pixel32(0xff, 0xff, 0xff, 0x0), false);


	var titlePos = center.y;
	if (this.timeIntoStartScreen > 2.5)
		titlePos = -(this.titleImgs[5].textureHeight / 2) + this.titleImgs[5].textureHeight * Clamp(0, (this.timeIntoStartScreen - 2.5) * 2, 1);
	else{
		var tp = Clamp(0, this.timeIntoStartScreen * 4, 1) * Math.PI/2;
		titlePos = center.y - Math.sin(tp) * render.getHeight() * 2/3;
	}


	var offsetX = perlin.noise1(this.titleParam / 2) * 5;
	var offsetY = perlin.noise1(this.titleParam / 2 + 100) * 5;

	offsetY += 10; // Maybe

	render.drawParticle(this.titleImgs[5], center.x + offsetX, titlePos + offsetY, 0, 1, 1, 1, new Pixel32(0xff, 0xff, 0xff, 0xff), false);

	render.drawImage(this.copyright, center.x, render.getHeight() - this.copyright.textureHeight / 2 - 5, 0, true, 1, null, false);

	if (this.timeIntoStartScreen == 0){
		var alpha = 0.5 + (1 + Math.sin(this.pressStartFlash)) / 4;
		render.drawText(this.pressStartText, center.x - this.pressStartText.width / 2, render.getHeight() * 2/3, alpha);
	}
};

MainMenuState.prototype.drawBackground = function(render) {
	var center = new Vec2(render.getWidth() / 2, render.getHeight() / 2);

	render.drawImage(this.titleImgs[0], center.x, center.y, 0, true, 1, null, false);

	for (var i = 0; i < 3; ++i)
		render.drawParticle(this.titleImgs[1], this.cloudXPos + this.titleImgs[1].textureWidth * 2 * i, this.titleImgs[1].textureHeight - 150, 0, 2, 2, 1, new Pixel32(255, 255, 255), false);

	render.drawImage(this.titleImgs[2], center.x, center.y, 0, true, 1, null, false);

	render.drawParticle(this.titleImgs[3], this.fogXPos + this.titleImgs[3].textureWidth * 5, 620, 0, 10, 10, Math.min(1, this.timeInSinceStartScreen), new Pixel32(255, 255, 255), false);


	if (this.titleImgs[3].textureWidth * 10 + this.fogXPos < render.getWidth())
		render.drawParticle(this.titleImgs[3], this.titleImgs[3].textureWidth * 15 + this.fogXPos, 620, 0, 10, 10, Math.min(1, this.timeInSinceStartScreen), new Pixel32(255, 255, 255), false);

	render.drawImage(this.titleImgs[4], center.x, center.y, 0, true, 1, null, false);

	var offsetX = perlin.noise1(this.titleParam / 2) * 5;
	var offsetY = perlin.noise1(this.titleParam / 2 + 100) * 5;


	offsetY += 10;

	render.drawParticle(this.titleImgs[5], center.x + offsetX, this.titleImgs[5].textureHeight / 2 + offsetY, 0, 1, 1, 1, new Pixel32(0xff, 0xff, 0xff, 0xff), false);

	render.drawImage(this.copyright, center.x, render.getHeight() - this.copyright.textureHeight / 2 - 5, 0, true, 1, null, false);

	var wx = center.x + 214;
	var wy = center.y - 49;
	if (this.wickBlinkLeft > 0)
		render.drawImage(this.wickEyes[0], wx, wy);
	else if (this.wickLookLeft > 0)
		render.drawImage(this.wickEyes[Math.floor(this.wickLookType)], wx, wy);

	var kx = center.x - 266;
	var ky = center.y + 108;
	if (this.kindleBlinkLeft > 0)
		render.drawImage(this.kindleEyes, kx, ky);
};

MainMenuState.prototype.update = function(dt) {
	this.titleParam += dt;
	this.pressStartFlash += dt;

	if(this.doStartScreen){
		this.timeInSinceStartScreen = 0;
		if (this.timeIntoStartScreen > 0)
			this.timeIntoStartScreen += dt;

		if (this.timeIntoStartScreen > 3){
			this.doStartScreen = false;
		}

		this.cloudXPos -= 24 * dt;
		if (this.cloudXPos < -this.titleImgs[1].textureWidth * 2)
			this.cloudXPos = -24 * dt;

		this.fogXPos -= 8 * dt;
		if (this.fogXPos < -this.titleImgs[3].textureWidth * 10)
			this.fogXPos = -8 * dt;
	}else{
		this.timeInSinceStartScreen += dt;
		this.timeInactive += dt;

		this.cloudXPos -= 24 * dt;
		if (this.cloudXPos < -this.titleImgs[1].textureWidth * 2)
			this.cloudXPos = -24 * dt;

		this.fogXPos -= 8 * dt;
		if (this.fogXPos < -this.titleImgs[3].textureWidth * 10)
			this.fogXPos = -8 * dt;

		this.updateWickEyes(dt);
		this.updateKindleEyes(dt);
		this.guiBox.update(dt);
	}
};

MainMenuState.prototype.updateWickEyes = function(dt) {
	if (this.wickBlinkLeft > 0)
		this.wickBlinkLeft -= dt;
	else if (this.nextWickBlink > 0){
		this.nextWickBlink -= dt;
		if (this.nextWickBlink <= 0) {
			this.wickBlinkLeft = 0.1;
			this.nextWickBlink = randomRange(4, 6);
		}
	}

	if (this.wickLookLeft > 0)
		this.wickLookLeft -= dt;
	else if (this.nextWickLook > 0){
		this.nextWickLook -= dt;
		if (this.nextWickLook <= 0){
			this.wickLookLeft = randomRange(1, 2);
			this.nextWickLook = randomRange(2, 3);
			this.wickLookType = randomRange(1, 3);
		}
	}
};

MainMenuState.prototype.updateKindleEyes = function(dt) {
	if (this.kindleBlinkLeft > 0)
		this.kindleBlinkLeft -= dt;
	else if (this.nextKindleBlink > 0){
		this.nextKindleBlink -= dt;
		if (this.nextKindleBlink <= 0){
			this.kindleBlinkLeft = 0.1;
			this.nextKindleBlink = randomRange(4, 6);
		}
	}
};

// ----------------------------------------------------------------------------

/**
 * State for displaying the Opera logo and preloading developer splash and main menu.
 */
function IntroState() {
	this.t = 0;
	this.delayAfter = 1;
	this.doneT = null;
	this.progress = 0;

	this.minLogoTime = 3;
	this.logoStartT = null;

	this.font = null;
	this.progressText = null;
	this.lastProgress = -1;

	this.operaLogo = null;

	BaseState.apply(this, arguments);
}

IntroState.prototype = new BaseState();
IntroState.constructor = IntroState;

IntroState.prototype.enter = function(msg, fromState) {
	ResourceLoader.getInstance().preloadImages(["atlas/gui/opera_logo.png"], createCallback(this.operaProgressCallback, this));

	var images = [
		"atlas/gui/titlescreen0.png",
		"atlas/no_c_red/titlescreen1.png",
		"atlas/gui/titlescreen2.png",
		"atlas/no_c_red/titlescreen3.png",
		"atlas/no_c_red/titlescreen4.png",
		"atlas/gui/titletext_html5.png",
		"atlas/gui/titlescreen_wick_eyes.png",
		"atlas/gui/titlescreen_kindle_eyes.png",
		"atlas/game/timetrap.png",
		"localized/english/Copyright.png",
		"atlas/gui/button.png"
	];
	ResourceLoader.getInstance().preloadImages(images, createCallback(this.progressCallback, this));

	this.font = ResourceDepot.getInstance().getFont("LoadingIntro");
	this.operaLogo = ResourceDepot.getInstance().getImage("opera_logo", "opera_logo");
};

IntroState.prototype.progressCallback = function(status) {
	this.progress = status;

	if(status >= 1){
		this.doneT = this.t + this.delayAfter;
	}
};

IntroState.prototype.operaProgressCallback = function(status) {
	if(status >= 1){
		this.logoStartT = this.t;
		this.minLogoTime += this.t;
	}
};

IntroState.prototype.update = function(dt) {
	this.t += dt;
};

IntroState.prototype.transition = function() {
	return this.host.tryChangeState(this.doneT != null && this.t >= this.doneT && this.logoStartT != null && this.t >= this.minLogoTime && app.audio.player.initialized, fsmStates.kNextState);
};

IntroState.prototype.draw = function(render) {
	render.clear(render.white);

	var centerW = render.getWidth()/2;
	var centerH = render.getHeight()/2;

	if(this.logoStartT != null){
		var logoAlpha = Math.min(1, this.t - this.logoStartT);
		render.drawImage(this.operaLogo, centerW, centerH, 0, true, logoAlpha, null, false);
	}


	if(this.lastProgress != this.progress){
		this.progressText = this.font.generateCanvas(Math.ceil(this.progress * 100) + " %");
		this.lastProgress = this.progress;
	}

	var alpha = 1;
	if(this.t < 1){
		alpha = this.t;
	}
	if(this.doneT != null){
		alpha = Math.max(0, this.doneT - this.t);
	}

	render.drawText(this.progressText, centerW - this.progressText.width / 2, 420, alpha);
};
